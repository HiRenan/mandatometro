"""Contador público de páginas vistas, com cota global e sem credenciais."""

import logging
from datetime import UTC
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import Connection, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool

from mandatometro import db
from mandatometro.api.pedidos_publicos import agente_e_robo, consumir_cota, ler_json_limitado
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
_ITENS = {"edicoes": Edicao, "parlamentares": Parlamentar, "votacoes": Votacao}


class PedidoVisita(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    caminho: str = Field(max_length=TAMANHO_CAMINHO_VISITA)


def _existe(conexao: Connection, caminho: str) -> bool:
    if caminho in CAMINHOS_PUBLICOS:
        return True

    _, tipo, id_ = caminho.split("/")
    modelo = _ITENS[tipo]
    consulta = select(modelo.id).where(modelo.id == int(id_))
    if modelo is Edicao:
        consulta = consulta.where(Edicao.estado == "publicada")
    return conexao.scalar(consulta) is not None


def _contar(caminho: str) -> int | None:
    with db.engine().begin() as conexao:
        if not _existe(conexao, caminho):
            return None

        instante = conexao.execute(select(func.clock_timestamp())).scalar_one().astimezone(UTC)
        tentar_em = consumir_cota(conexao, LimiteVisita.__table__, instante, LIMITE_POR_MINUTO)
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
    if agente_e_robo(request):
        return _resposta(204)
    try:
        pedido = await ler_json_limitado(request, PedidoVisita, LIMITE_DO_CORPO)
    except HTTPException:
        return _resposta(204)
    caminho = normalizar_caminho(pedido.caminho)
    if caminho is None:
        return _resposta(204)

    try:
        tentar_em = await run_in_threadpool(_contar, caminho)
    except SQLAlchemyError:
        logger.warning("Banco indisponível no contador de visitas.")
        return _resposta(503)

    return _resposta(204) if tentar_em is None else _resposta(429, tentar_em=tentar_em)
