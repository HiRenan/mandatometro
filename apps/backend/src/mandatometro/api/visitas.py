"""Contador público de páginas vistas, com cota global e sem credenciais."""

import logging
import re
from datetime import UTC, datetime, timedelta
from math import ceil
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Request, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import Connection, delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool
from starlette.requests import ClientDisconnect

from mandatometro import db
from mandatometro.db.modelos import (
    TAMANHO_CAMINHO_VISITA,
    Edicao,
    LimiteVisita,
    Parlamentar,
    Visita,
    Votacao,
)
from mandatometro.paginas_publicas import CAMINHOS_PUBLICOS, normalizar_caminho

logger = logging.getLogger(__name__)
router = APIRouter(tags=["visitas"])
LIMITE_POR_MINUTO = 600
LIMITE_DO_CORPO = 2048
_FUSO = ZoneInfo("America/Sao_Paulo")
_ROBOS = re.compile(
    r"bot\b|crawler|spider|slurp|headlesschrome|facebookexternalhit|bingpreview|"
    r"curl/|wget/|python-(?:requests|httpx)|go-http-client",
    re.IGNORECASE,
)
_ITENS = {"edicoes": Edicao, "parlamentares": Parlamentar, "votacoes": Votacao}


class PedidoVisita(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    caminho: str = Field(max_length=TAMANHO_CAMINHO_VISITA)


async def _ler_caminho(request: Request) -> str | None:
    tipo = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if tipo != "application/json":
        return None

    corpo = bytearray()
    try:
        async for bloco in request.stream():
            if len(corpo) + len(bloco) > LIMITE_DO_CORPO:
                return None
            corpo.extend(bloco)
        return normalizar_caminho(PedidoVisita.model_validate_json(corpo).caminho)
    except (ValidationError, ClientDisconnect):
        return None


def _existe(conexao: Connection, caminho: str) -> bool:
    if caminho in CAMINHOS_PUBLICOS:
        return True

    _, tipo, id_ = caminho.split("/")
    modelo = _ITENS[tipo]
    consulta = select(modelo.id).where(modelo.id == int(id_))
    if modelo is Edicao:
        consulta = consulta.where(Edicao.estado == "publicada")
    return conexao.scalar(consulta) is not None


def _consumir_cota(conexao: Connection, instante: datetime) -> int | None:
    minuto = instante.replace(second=0, microsecond=0)
    conexao.execute(delete(LimiteVisita).where(LimiteVisita.janela < minuto - timedelta(minutes=1)))
    gravar = insert(LimiteVisita).values(janela=minuto)
    quantidade = conexao.scalar(
        gravar.on_conflict_do_update(
            index_elements=[LimiteVisita.janela],
            set_={"quantidade": LimiteVisita.quantidade + 1},
            where=LimiteVisita.quantidade < LIMITE_POR_MINUTO,
        ).returning(LimiteVisita.quantidade)
    )
    if quantidade is None:
        return ceil((minuto + timedelta(minutes=1) - instante).total_seconds())
    return None


def _contar(caminho: str) -> int | None:
    with db.engine().begin() as conexao:
        if not _existe(conexao, caminho):
            return None

        instante = conexao.execute(select(func.clock_timestamp())).scalar_one().astimezone(UTC)
        tentar_em = _consumir_cota(conexao, instante)
        if tentar_em is not None:
            return tentar_em
        visita = insert(Visita).values(dia=instante.astimezone(_FUSO).date(), caminho=caminho)
        conexao.execute(
            visita.on_conflict_do_update(
                index_elements=[Visita.dia, Visita.caminho],
                set_={"quantidade": Visita.quantidade + 1},
            )
        )
    return None


def _resposta(codigo: int, *, tentar_em: int | None = None) -> Response:
    cabecalhos = {"Cache-Control": "no-store"}
    if tentar_em is not None:
        cabecalhos["Retry-After"] = str(tentar_em)
    return Response(status_code=codigo, headers=cabecalhos)


@router.post(
    "/visitas",
    status_code=204,
    response_class=Response,
    summary="Contar uma página vista",
    description=(
        "Aceita o caminho de uma página pública do site, sem query ou fragmento. "
        "A contagem usa o dia em Brasília. Caminhos inválidos e robôs conhecidos são "
        "ignorados com a mesma resposta vazia de uma visita contada."
    ),
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"application/json": {"schema": PedidoVisita.model_json_schema()}},
        }
    },
    responses={
        429: {
            "description": "Cota global por minuto atingida.",
            "headers": {
                "Retry-After": {
                    "schema": {"type": "integer"},
                    "description": "Segundos até o próximo minuto.",
                }
            },
        },
        503: {"description": "Operação no banco não confirmada."},
    },
)
async def registrar_visita(request: Request) -> Response:
    if _ROBOS.search(request.headers.get("user-agent", "")):
        return _resposta(204)
    caminho = await _ler_caminho(request)
    if caminho is None:
        return _resposta(204)

    try:
        tentar_em = await run_in_threadpool(_contar, caminho)
    except SQLAlchemyError:
        logger.warning("Banco indisponível no contador de visitas.")
        return _resposta(503)

    return _resposta(204) if tentar_em is None else _resposta(429, tentar_em=tentar_em)
