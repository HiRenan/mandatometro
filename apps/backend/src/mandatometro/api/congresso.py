"""Campos e regras de leitura compartilhados entre parlamentares e votações."""

import logging
from collections import defaultdict
from collections.abc import Collection, Mapping
from typing import Annotated
from unicodedata import combining, normalize

from fastapi import Path, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.api.esquemas import ContagemVotosParlamentar, ProposicaoAfetada, TemaPublico
from mandatometro.db.modelos import (
    VALORES_DE_VOTO,
    ProposicaoTema,
    Votacao,
    Voto,
    votacao_proposicao,
)
from mandatometro.temas import TEMAS, TemaId

IdCongresso = Annotated[
    int,
    Path(gt=0, le=2_147_483_647, description="Id interno, inteiro positivo de 32 bits com sinal."),
]

logger = logging.getLogger(__name__)


class RotaCongresso(APIRoute):
    def get_route_handler(self):
        tratar = super().get_route_handler()

        async def sem_dados_no_erro(request: Request) -> Response:
            try:
                resposta = await tratar(request)
            except RequestValidationError:
                resposta = JSONResponse({"erro": "dados_invalidos"}, status_code=422)
            except SQLAlchemyError:
                logger.warning("Banco indisponível na consulta a parlamentares e votações.")
                resposta = JSONResponse({"erro": "servico_indisponivel"}, status_code=503)
            resposta.headers["Cache-Control"] = "no-store"
            resposta.headers["Referrer-Policy"] = "no-referrer"
            return resposta

        return sem_dados_no_erro


def ordem_alfabetica(nome: str, parlamentar_id: int) -> tuple[str, int]:
    letras = normalize("NFD", nome.casefold())
    return "".join(letra for letra in letras if not combining(letra)), parlamentar_id


def contagem_por_valor(totais: Mapping[str, int]) -> ContagemVotosParlamentar:
    return ContagemVotosParlamentar.model_validate(
        {valor: totais.get(valor, 0) for valor in VALORES_DE_VOTO}
    )


def temas_publicos(ids: Collection[str]) -> list[TemaPublico]:
    return [TemaPublico(id=id_, nome=nome) for id_, nome in TEMAS.items() if id_ in ids]


def _consulta_temas():
    return select(votacao_proposicao.c.votacao_id, ProposicaoTema.tema).join(
        ProposicaoTema, ProposicaoTema.proposicao_id == votacao_proposicao.c.proposicao_id
    )


def voto_tem_tema(tema: TemaId):
    return (
        _consulta_temas()
        .where(votacao_proposicao.c.votacao_id == Voto.votacao_id, ProposicaoTema.tema == tema)
        .exists()
    )


def temas_das_votacoes(sessao: Session, ids: Collection[int]) -> dict[int, list[TemaPublico]]:
    if not ids:
        return {}
    consulta = _consulta_temas().where(votacao_proposicao.c.votacao_id.in_(ids)).distinct()
    por_votacao: defaultdict[int, set[str]] = defaultdict(set)
    for votacao_id, tema in sessao.execute(consulta):
        por_votacao[votacao_id].add(tema)
    return {id_: temas_publicos(temas) for id_, temas in por_votacao.items()}


def dados_da_votacao(votacao: Votacao, temas: list[TemaPublico]) -> dict[str, object]:
    return {
        "data": votacao.data,
        "descricao": votacao.descricao,
        "resultado": votacao.resultado,
        "proposicoes": [
            ProposicaoAfetada.model_validate(proposicao, from_attributes=True)
            for proposicao in sorted(votacao.proposicoes, key=lambda proposicao: proposicao.id)
        ],
        "temas": temas,
        "url_oficial": votacao.fonte.url_publica or votacao.fonte.url or None,
        "coletado_em": votacao.fonte.coletado_em,
    }
