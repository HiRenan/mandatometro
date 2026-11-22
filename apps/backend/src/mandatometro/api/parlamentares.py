"""Leitura pública dos parlamentares e dos votos gravados pela coleta."""

import logging
from typing import Annotated
from unicodedata import combining, normalize

from fastapi import APIRouter, Path, Query, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import contains_eager

from mandatometro.api.esquemas import (
    UF,
    Casa,
    ContagemVotosParlamentar,
    DetalheParlamentar,
    ErroParlamentar,
    ListaParlamentares,
    ListaVotosParlamentar,
    MandatoPublico,
    ParlamentarPublico,
    ProposicaoAfetada,
    VotoParlamentar,
)
from mandatometro.db import sessao as sessao_do_banco
from mandatometro.db.modelos import VALORES_DE_VOTO, Mandato, Parlamentar, Votacao, Voto

logger = logging.getLogger(__name__)
ORDEM_DOS_VOTOS = (Votacao.data.desc(), Votacao.id.desc())


class RotaParlamentares(APIRoute):
    def get_route_handler(self):
        tratar = super().get_route_handler()

        async def sem_dados_no_erro(request: Request) -> Response:
            try:
                resposta = await tratar(request)
            except RequestValidationError:
                resposta = JSONResponse({"erro": "dados_invalidos"}, status_code=422)
            except SQLAlchemyError:
                logger.warning("Banco indisponível na leitura de parlamentares.")
                resposta = JSONResponse({"erro": "servico_indisponivel"}, status_code=503)
            resposta.headers["Cache-Control"] = "no-store"
            resposta.headers["Referrer-Policy"] = "no-referrer"
            return resposta

        return sem_dados_no_erro


router = APIRouter(
    prefix="/parlamentares",
    tags=["parlamentares"],
    route_class=RotaParlamentares,
    responses={
        422: {"model": ErroParlamentar, "description": "Dados inválidos."},
        503: {"model": ErroParlamentar, "description": "Banco indisponível."},
    },
)


def _partidos_recentes():
    return (
        select(Voto.parlamentar_id, Voto.partido)
        .join(Voto.votacao)
        .ext(distinct_on(Voto.parlamentar_id))
        .order_by(Voto.parlamentar_id, *ORDEM_DOS_VOTOS)
    )


def _ordem_alfabetica(parlamentar: ParlamentarPublico) -> tuple[str, int]:
    nome = normalize("NFD", parlamentar.nome.casefold())
    return "".join(letra for letra in nome if not combining(letra)), parlamentar.id


@router.get(
    "",
    summary="Listar os parlamentares em exercício",
    description="Lista completa em ordem alfabética, com filtros opcionais por UF e Casa.",
)
def listar_parlamentares(
    uf: Annotated[UF | None, Query(description="Sigla da UF do mandato em exercício.")] = None,
    casa: Casa | None = None,
) -> ListaParlamentares:
    mandatos = (
        select(Mandato.parlamentar_id, Mandato.uf)
        .where(Mandato.em_exercicio.is_(True))
        .ext(distinct_on(Mandato.parlamentar_id))
        .order_by(Mandato.parlamentar_id, Mandato.legislatura.desc())
        .subquery()
    )
    consulta = select(Parlamentar.id, Parlamentar.nome, Parlamentar.casa, mandatos.c.uf).join(
        mandatos, mandatos.c.parlamentar_id == Parlamentar.id
    )
    if uf is not None:
        consulta = consulta.where(mandatos.c.uf == uf)
    if casa is not None:
        consulta = consulta.where(Parlamentar.casa == casa)
    atuais = consulta.cte()
    partidos = _partidos_recentes().join(atuais, atuais.c.id == Voto.parlamentar_id).subquery()
    with sessao_do_banco() as sessao:
        linhas = sessao.execute(
            select(atuais, partidos.c.partido).outerjoin(
                partidos, atuais.c.id == partidos.c.parlamentar_id
            )
        ).mappings()
        return ListaParlamentares(
            parlamentares=sorted(
                (ParlamentarPublico.model_validate(linha) for linha in linhas),
                key=_ordem_alfabetica,
            )
        )


@router.get(
    "/{id}",
    summary="Ler um parlamentar, seus mandatos e a contagem de votos gravados",
    response_model=DetalheParlamentar,
    responses={404: {"model": ErroParlamentar}},
)
def obter_parlamentar(id: Annotated[int, Path(gt=0)]):
    with sessao_do_banco() as sessao:
        parlamentar = sessao.get(Parlamentar, id)
        if parlamentar is None:
            return JSONResponse({"erro": "parlamentar_nao_encontrado"}, status_code=404)

        mandatos = [
            MandatoPublico.model_validate(mandato, from_attributes=True)
            for mandato in sessao.scalars(
                select(Mandato)
                .where(Mandato.parlamentar_id == id)
                .order_by(Mandato.em_exercicio.desc(), Mandato.legislatura.desc())
            )
        ]
        recente = sessao.execute(
            _partidos_recentes().where(Voto.parlamentar_id == id)
        ).one_or_none()
        contagem = dict.fromkeys(VALORES_DE_VOTO, 0)
        contagem.update(
            sessao.execute(
                select(Voto.valor, func.count())
                .where(Voto.parlamentar_id == id)
                .group_by(Voto.valor)
            ).all()
        )
        return DetalheParlamentar(
            id=parlamentar.id,
            nome=parlamentar.nome,
            casa=parlamentar.casa,
            uf=mandatos[0].uf if mandatos else None,
            partido=recente.partido if recente else None,
            mandatos=mandatos,
            contagem_votos=ContagemVotosParlamentar.model_validate(contagem),
        )


def _voto_publico(voto: Voto) -> VotoParlamentar:
    votacao = voto.votacao
    return VotoParlamentar(
        votacao_id=votacao.id,
        data=votacao.data,
        descricao=votacao.descricao,
        resultado=votacao.resultado,
        proposicoes=[
            ProposicaoAfetada.model_validate(proposicao, from_attributes=True)
            for proposicao in sorted(votacao.proposicoes, key=lambda proposicao: proposicao.id)
        ],
        valor=voto.valor,
        url_oficial=votacao.fonte.url_publica or votacao.fonte.url or None,
        coletado_em=votacao.fonte.coletado_em,
    )


@router.get(
    "/{id}/votos",
    summary="Listar os votos gravados do parlamentar da votação mais recente para a mais antiga",
    description="Paginação por deslocamento, com desempate por id interno decrescente da votação.",
    response_model=ListaVotosParlamentar,
    responses={404: {"model": ErroParlamentar}},
)
def listar_votos_parlamentar(
    id: Annotated[int, Path(gt=0)],
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
    deslocamento: Annotated[int, Query(ge=0)] = 0,
):
    with sessao_do_banco() as sessao:
        if sessao.get(Parlamentar, id) is None:
            return JSONResponse({"erro": "parlamentar_nao_encontrado"}, status_code=404)

        por_parlamentar = Voto.parlamentar_id == id
        total = sessao.scalar(select(func.count()).select_from(Voto).where(por_parlamentar))
        votos = []
        if deslocamento < total:
            registros = sessao.scalars(
                select(Voto)
                .join(Voto.votacao)
                .where(por_parlamentar)
                .options(
                    contains_eager(Voto.votacao).joinedload(Votacao.fonte),
                    contains_eager(Voto.votacao).selectinload(Votacao.proposicoes),
                )
                .order_by(*ORDEM_DOS_VOTOS)
                .limit(limite)
                .offset(deslocamento)
            )
            votos = [_voto_publico(voto) for voto in registros]
        return ListaVotosParlamentar(
            votos=votos,
            total=total,
            limite=limite,
            deslocamento=deslocamento,
        )
