"""Campos e regras de leitura compartilhados entre parlamentares e votações."""

import logging
from collections.abc import Mapping
from typing import Annotated
from unicodedata import combining, normalize

from fastapi import Path, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from sqlalchemy.exc import SQLAlchemyError

from mandatometro.api.esquemas import ContagemVotosParlamentar, ProposicaoAfetada
from mandatometro.db.modelos import VALORES_DE_VOTO, Votacao

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


def dados_da_votacao(votacao: Votacao) -> dict[str, object]:
    return {
        "data": votacao.data,
        "descricao": votacao.descricao,
        "resultado": votacao.resultado,
        "proposicoes": [
            ProposicaoAfetada.model_validate(proposicao, from_attributes=True)
            for proposicao in sorted(votacao.proposicoes, key=lambda proposicao: proposicao.id)
        ],
        "url_oficial": votacao.fonte.url_publica or votacao.fonte.url or None,
        "coletado_em": votacao.fonte.coletado_em,
    }
