"""Rota pública de medição: não devolve resultados nem repete entrada nos erros."""

import logging

from fastapi import APIRouter, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from fastapi.routing import APIRoute
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException

from mandatometro.api.esquemas import ErroPiloto, PedidoTentativaPiloto, ResultadoTentativaPiloto
from mandatometro.config import config
from mandatometro.db import engine
from mandatometro.piloto.limite import LimiteAtingido, consumir_cota
from mandatometro.piloto.medicao import registrar_tentativa

logger = logging.getLogger(__name__)
LIMITE_DO_CORPO = 2048


class RotaPiloto(APIRoute):
    def get_route_handler(self):
        tratar = super().get_route_handler()

        async def com_cota_e_privacidade(request: Request) -> Response:
            try:
                conf = config()
                if not conf.piloto_ativo:
                    resposta = JSONResponse({"erro": "piloto_encerrado"}, status_code=410)
                else:
                    # A cota se confirma antes do parsing, inclusive se o corpo for inválido.
                    await run_in_threadpool(consumir_cota, engine(), conf.piloto_limite_por_minuto)
                    if request.headers.get("content-type", "").split(";")[0].strip().lower() != (
                        "application/json"
                    ):
                        raise HTTPException(status_code=422)
                    tamanho = 0

                    async def receber():
                        nonlocal tamanho
                        mensagem = await request.receive()
                        if mensagem["type"] == "http.request":
                            tamanho += len(mensagem.get("body", b""))
                            if tamanho > LIMITE_DO_CORPO:
                                raise HTTPException(status_code=413)
                        return mensagem

                    resposta = await tratar(Request(request.scope, receber))
            except RequestValidationError:
                resposta = JSONResponse({"erro": "dados_invalidos"}, status_code=422)
            except HTTPException as erro:
                if erro.status_code == 413:
                    resposta = JSONResponse({"erro": "corpo_muito_grande"}, status_code=413)
                elif erro.status_code in (400, 415, 422):
                    resposta = JSONResponse({"erro": "dados_invalidos"}, status_code=422)
                else:
                    raise
            except LimiteAtingido as erro:
                resposta = JSONResponse(
                    {"erro": "limite_de_tentativas"},
                    status_code=429,
                    headers={"Retry-After": str(erro.tentar_em)},
                )
            except SQLAlchemyError:
                logger.warning("Banco indisponível na operação do piloto.")
                resposta = JSONResponse({"erro": "servico_indisponivel"}, status_code=503)
            resposta.headers["Cache-Control"] = "no-store"
            resposta.headers["Referrer-Policy"] = "no-referrer"
            return resposta

        return com_cota_e_privacidade


router = APIRouter(prefix="/piloto", tags=["piloto"], route_class=RotaPiloto)


@router.post(
    "/tentativas",
    summary="Receber a primeira conclusão de uma etapa do piloto",
    description="O mesmo código nas duas etapas permite parear resultados; códigos diferentes "
    "permitem apenas médias independentes. Reenvios não alteram a primeira conclusão. "
    "Novo e repetido recebem a mesma resposta, sem revelar acertos ou existência anterior.",
    responses={
        410: {"model": ErroPiloto, "description": "Piloto desabilitado, sem gravação."},
        413: {"model": ErroPiloto, "description": "Corpo maior que 2 KiB."},
        422: {"model": ErroPiloto, "description": "Dados inválidos, sem repetir a entrada."},
        429: {
            "model": ErroPiloto,
            "description": "Cota global por minuto atingida.",
            "headers": {
                "Retry-After": {
                    "schema": {"type": "integer"},
                    "description": "Segundos para tentar novamente.",
                }
            },
        },
        503: {"model": ErroPiloto, "description": "Operação no banco não confirmada."},
    },
)
def registrar_tentativa_piloto(pedido: PedidoTentativaPiloto) -> ResultadoTentativaPiloto:
    registrar_tentativa(
        engine(), pedido.participacao, pedido.versao_quiz, pedido.etapa, pedido.acertos
    )
    return ResultadoTentativaPiloto(situacao="recebida")
