"""Leitura pública dos parlamentares e dos votos gravados pela coleta."""

from typing import Annotated

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.orm import contains_eager

from mandatometro.api.congresso import (
    IdCongresso,
    RotaCongresso,
    contagem_por_valor,
    dados_da_votacao,
    ordem_alfabetica,
    temas_das_votacoes,
    voto_tem_tema,
)
from mandatometro.api.esquemas import (
    UF,
    Casa,
    DetalheParlamentar,
    ErroParlamentar,
    ListaParlamentares,
    ListaVotosParlamentar,
    MandatoPublico,
    ParlamentarPublico,
    TemaPublico,
    VotoParlamentar,
)
from mandatometro.db import sessao as sessao_do_banco
from mandatometro.db.modelos import Mandato, Parlamentar, Votacao, Voto
from mandatometro.temas import TemaId

ORDEM_DOS_VOTOS = (Votacao.data.desc(), Votacao.id.desc())


router = APIRouter(
    prefix="/parlamentares",
    tags=["parlamentares"],
    route_class=RotaCongresso,
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
                key=lambda p: ordem_alfabetica(p.nome, p.id),
            )
        )


@router.get(
    "/{id}",
    summary="Ler um parlamentar, seus mandatos e a contagem de votos gravados",
    response_model=DetalheParlamentar,
    responses={404: {"model": ErroParlamentar}},
)
def obter_parlamentar(id: IdCongresso):
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
        contagem = dict(
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
            contagem_votos=contagem_por_valor(contagem),
        )


def _voto_publico(voto: Voto, temas: list[TemaPublico]) -> VotoParlamentar:
    return VotoParlamentar(
        votacao_id=voto.votacao_id,
        valor=voto.valor,
        **dados_da_votacao(voto.votacao, temas),
    )


@router.get(
    "/{id}/votos",
    summary="Listar os votos gravados do parlamentar da votação mais recente para a mais antiga",
    description="O filtro por tema é aplicado antes da paginação por deslocamento. "
    "O desempate usa o id interno decrescente da votação.",
    response_model=ListaVotosParlamentar,
    responses={404: {"model": ErroParlamentar}},
)
def listar_votos_parlamentar(
    id: IdCongresso,
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
    deslocamento: Annotated[int, Query(ge=0)] = 0,
    tema: Annotated[TemaId | None, Query(description="Tema das proposições afetadas.")] = None,
):
    with sessao_do_banco() as sessao:
        if sessao.get(Parlamentar, id) is None:
            return JSONResponse({"erro": "parlamentar_nao_encontrado"}, status_code=404)

        filtros = [Voto.parlamentar_id == id]
        if tema is not None:
            filtros.append(voto_tem_tema(tema))
        total = sessao.scalar(select(func.count()).select_from(Voto).where(*filtros))
        votos = []
        if deslocamento < total:
            registros = sessao.scalars(
                select(Voto)
                .join(Voto.votacao)
                .where(*filtros)
                .options(
                    contains_eager(Voto.votacao).joinedload(Votacao.fonte),
                    contains_eager(Voto.votacao).selectinload(Votacao.proposicoes),
                )
                .order_by(*ORDEM_DOS_VOTOS)
                .limit(limite)
                .offset(deslocamento)
            ).all()
            temas = temas_das_votacoes(sessao, [voto.votacao_id for voto in registros])
            votos = [_voto_publico(voto, temas.get(voto.votacao_id, [])) for voto in registros]
        return ListaVotosParlamentar(
            votos=votos,
            total=total,
            limite=limite,
            deslocamento=deslocamento,
        )
