import logging
from uuid import UUID

from fastapi import APIRouter, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse, Response
from fastapi.routing import APIRoute
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool
from starlette.exceptions import HTTPException

from mandatometro.api.esquemas import ErroNewsletter, PedidoInscricao, ResultadoInscricao
from mandatometro.avisos.inscricao import enviar_ultima_edicao, preparar_inscricao, sair
from mandatometro.avisos.limite import LimiteAtingido, consumir_cota
from mandatometro.avisos.resend import Resend
from mandatometro.config import config
from mandatometro.db import engine

logger = logging.getLogger(__name__)


class RotaNewsletter(APIRoute):
    def get_route_handler(self):
        tratar = super().get_route_handler()

        async def com_cota_e_privacidade(request: Request) -> Response:
            try:
                # Antes de ler/validar o JSON: corpo inválido também gasta uma tentativa.
                if self.name == "inscrever_newsletter":
                    await run_in_threadpool(
                        consumir_cota, engine(), config().newsletter_limite_por_minuto
                    )
                resposta = await tratar(request)
            except RequestValidationError:
                # O erro padrão pode incluir input, contexto e mensagens com o e-mail recebido.
                resposta = JSONResponse({"erro": "dados_invalidos"}, status_code=422)
            except HTTPException as erro:
                # Um JSON que nem decodifica (por exemplo, UTF-8 inválido) falha antes do
                # Pydantic. Mantém o mesmo contrato, sem devolver a exceção de parsing.
                if erro.status_code != 400:
                    raise
                resposta = JSONResponse({"erro": "dados_invalidos"}, status_code=422)
            except LimiteAtingido as erro:
                resposta = JSONResponse(
                    {"erro": "limite_de_inscricoes"},
                    status_code=429,
                    headers={"Retry-After": str(erro.tentar_em)},
                )
            except SQLAlchemyError:
                logger.warning("Banco indisponível na operação da newsletter.")
                resposta = JSONResponse({"erro": "servico_indisponivel"}, status_code=503)
            resposta.headers["Cache-Control"] = "no-store"
            resposta.headers["Referrer-Policy"] = "no-referrer"
            return resposta

        return com_cota_e_privacidade


router = APIRouter(
    prefix="/newsletter",
    tags=["newsletter"],
    route_class=RotaNewsletter,
    responses={
        422: {"model": ErroNewsletter, "description": "Dados inválidos, sem repetir a entrada."},
        503: {"model": ErroNewsletter, "description": "Operação no banco não confirmada."},
    },
)


@router.post(
    "/inscricoes",
    responses={
        429: {
            "model": ErroNewsletter,
            "description": "Cota global por minuto atingida.",
            "headers": {
                "Retry-After": {
                    "schema": {"type": "integer"},
                    "description": "Segundos para tentar novamente.",
                }
            },
        }
    },
    summary="Receber a inscrição e enviar a última edição publicada",
    description="Novo e repetido têm a mesma resposta. edicao_enviada confirma a aceitação pelo "
    "Resend, não a entrega na caixa postal. Nas outras situações a inscrição também fica gravada.",
)
async def inscrever_newsletter(pedido: PedidoInscricao) -> ResultadoInscricao:
    preparada = await run_in_threadpool(preparar_inscricao, engine(), pedido.email)
    conf = config()
    envio = Resend(
        conf.resend_api_key.get_secret_value() if conf.resend_api_key else None,
        conf.resend_from,
    )
    situacao = await enviar_ultima_edicao(
        preparada, envio, app_base_url=conf.app_base_url, api_url=conf.api_url
    )
    return ResultadoInscricao(situacao=situacao)


@router.post(
    "/saida/{codigo_saida}",
    response_class=Response,
    summary="Apagar a inscrição pelo código de saída",
    description="POST idempotente, sem autenticação ou corpo obrigatório. Aceita RFC 8058 e "
    "a confirmação no site; o corpo é ignorado. Código desconhecido também recebe 200 vazio.",
)
def sair_da_newsletter(codigo_saida: UUID) -> Response:
    sair(engine(), codigo_saida)
    return Response(status_code=200)


@router.head("/saida/{codigo_saida}", include_in_schema=False)
@router.get(
    "/saida/{codigo_saida}",
    response_class=RedirectResponse,
    status_code=303,
    summary="Abrir a página de confirmação de saída, sem apagar a inscrição",
)
def abrir_saida(codigo_saida: UUID) -> RedirectResponse:
    return RedirectResponse(
        f"{config().app_base_url.rstrip('/')}/newsletter/sair?codigo={codigo_saida}",
        status_code=303,
    )
