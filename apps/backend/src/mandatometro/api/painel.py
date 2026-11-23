"""Acesso administrativo aos números do site e à revisão editorial."""

import logging
from typing import Annotated, cast

from fastapi import APIRouter, Body, Path, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from pydantic import SkipValidation
from sqlalchemy import select
from starlette._utils import get_route_path
from starlette.concurrency import run_in_threadpool
from starlette.datastructures import MutableHeaders
from starlette.exceptions import HTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from mandatometro import db
from mandatometro.api.contas import exigir_administradora, validar_origem
from mandatometro.api.esquemas import ErroPainel, ResultadoPublicacao, ResultadoRevisao
from mandatometro.api.esquemas_numeros import NumerosPainel
from mandatometro.api.numeros import numeros_do_painel
from mandatometro.db.modelos import Edicao
from mandatometro.ia import servico
from mandatometro.ia.servico import ArquivoRevisao

PREFIXO = "/painel"
LIMITE_DO_CORPO = 2 * 1024 * 1024
FORMATO_INVALIDO = "Confira o formato do pedido."
logger = logging.getLogger(__name__)


class AcessoPainel:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        caminho = get_route_path(scope) if scope["type"] == "http" else ""
        if caminho != PREFIXO and not caminho.startswith(f"{PREFIXO}/"):
            await self.app(scope, receive, send)
            return

        # A guarda antecede a resolução da rota, inclusive 405 e redireções do roteador.
        request = Request(scope)
        try:
            await run_in_threadpool(exigir_administradora, request.cookies.get("sessao_conta"))
        except Exception as erro:
            # Se não foi possível autenticar a sessão, devolva o mesmo 404 do roteador.
            if not isinstance(erro, HTTPException) or erro.status_code != 404:
                logger.warning("Falha ao verificar o acesso ao painel de revisão.")
            resposta = await http_exception_handler(request, HTTPException(404))
            await resposta(scope, receive, send)
            return

        async def sem_cache(mensagem: Message) -> None:
            if mensagem["type"] == "http.response.start":
                MutableHeaders(scope=mensagem)["Cache-Control"] = "no-store"
            await send(mensagem)

        if caminho.endswith("/"):
            resposta = _erro(404, "Rota do painel não encontrada.")
            await resposta(scope, receive, sem_cache)
            return

        await self.app(scope, receive, sem_cache)


def _limitar_corpo(request: Request) -> Request:
    try:
        declarado = int(request.headers.get("content-length", "0"))
    except ValueError:
        declarado = 0
    if declarado > LIMITE_DO_CORPO:
        raise HTTPException(413)

    recebido = 0

    async def receber() -> Message:
        nonlocal recebido
        mensagem = await request.receive()
        if mensagem["type"] == "http.request":
            recebido += len(mensagem.get("body", b""))
            if recebido > LIMITE_DO_CORPO:
                raise HTTPException(413)
        return mensagem

    return Request(request.scope, receber)


def _erro(codigo: int, detalhe: str) -> JSONResponse:
    return JSONResponse({"detail": detalhe}, status_code=codigo)


def _erro_inesperado() -> JSONResponse:
    logger.warning("Falha na operação do painel de revisão.")
    return _erro(500, "Não foi possível concluir a operação do painel.")


class RotaPainel(APIRoute):
    def get_route_handler(self):
        tratar = super().get_route_handler()

        async def executar(request: Request):
            try:
                if request.method == "POST":
                    try:
                        validar_origem(request)
                    except HTTPException as erro:
                        return _erro(erro.status_code, erro.detail)
                if self.body_field is not None:
                    request = _limitar_corpo(request)
                return await tratar(request)
            except RequestValidationError:
                return _erro(422, FORMATO_INVALIDO)
            except HTTPException as erro:
                if erro.status_code == 400:
                    # O FastAPI usa 400 para falhas de parsing como UTF-8 inválido.
                    return _erro(422, FORMATO_INVALIDO)
                if erro.status_code == 413:
                    return _erro(413, "O corpo da revisão excede o limite de 2 MiB.")
                return _erro_inesperado()
            except servico.EdicaoNaoEncontrada as erro:
                return _erro(404, str(erro))
            except servico.ConflitoEdicao as erro:
                return _erro(409, str(erro))
            except servico.EdicaoOcupada as erro:
                return _erro(503, str(erro))
            except servico.ErroEdicao as erro:
                return _erro(422, str(erro))
            except Exception:
                return _erro_inesperado()

        return executar


IdEdicao = Annotated[int, Path(gt=0, le=2**31 - 1)]
router = APIRouter(
    prefix=PREFIXO,
    tags=["painel"],
    route_class=RotaPainel,
    responses={
        404: {"model": ErroPainel, "description": "Rota ou edição não encontrada."},
        422: {"model": ErroPainel, "description": "Pedido ou edição inválidos."},
        500: {"model": ErroPainel, "description": "Falha inesperada na operação."},
    },
)
router_numeros = APIRouter(prefix=PREFIXO, tags=["painel"], route_class=RotaPainel)


@router_numeros.get(
    "/numeros",
    summary="Consultar os números do painel",
    description="Agregados do site e das coletas. O acesso é exclusivo da administradora.",
    responses={
        404: {"model": ErroPainel, "description": "Rota não encontrada."},
        500: {"model": ErroPainel, "description": "Falha inesperada na consulta."},
    },
)
def consultar_numeros_painel() -> NumerosPainel:
    return numeros_do_painel(db.engine())


@router.get(
    "/edicoes/rascunho",
    summary="Ler o rascunho da edição mais recente",
    description="Devolve o mesmo arquivo do CLI edicao exportar, ou null se não há rascunho.",
    response_model=ArquivoRevisao | None,
    responses={409: {"model": ErroPainel, "description": "Edição publicada durante a leitura."}},
)
def ler_rascunho() -> JSONResponse:
    with db.sessao() as sessao:
        id_ = sessao.scalar(
            select(Edicao.id)
            .where(Edicao.estado == "rascunho")
            .order_by(Edicao.fim.desc(), Edicao.id.desc())
            .limit(1)
        )
    arquivo = servico.exportar(db.sessao, id_) if id_ is not None else None
    # Preserva o arquivo exportado, inclusive a ausência de campos opcionais.
    return JSONResponse(arquivo)


@router.post(
    "/edicoes/{id}/revisao",
    summary="Salvar a revisão da edição",
    responses={
        403: {"model": ErroPainel, "description": "Origem do pedido inválida."},
        409: {"model": ErroPainel, "description": "Arquivo antigo ou edição já publicada."},
        413: {"model": ErroPainel, "description": "Corpo maior que 2 MiB."},
        503: {"model": ErroPainel, "description": "Outra gravação da edição está em andamento."},
    },
)
def salvar_revisao(
    id: IdEdicao, arquivo: Annotated[SkipValidation[ArquivoRevisao], Body()]
) -> ResultadoRevisao:
    # O esquema documenta o arquivo do CLI. A validação editorial ocorre em revisar,
    # que recebe o JSON tal como veio e informa o item e o campo em caso de erro.
    return ResultadoRevisao.model_validate(servico.revisar(db.sessao, id, cast(dict, arquivo)))


@router.post(
    "/edicoes/{id}/publicar",
    summary="Publicar a edição revisada",
    description="Publica a edição sem disparar o envio da newsletter.",
    responses={
        403: {"model": ErroPainel, "description": "Origem do pedido inválida."},
        503: {"model": ErroPainel, "description": "Outra gravação da edição está em andamento."},
    },
)
def publicar_edicao(id: IdEdicao) -> ResultadoPublicacao:
    return ResultadoPublicacao.model_validate(servico.publicar(db.sessao, id))
