"""Envio público de opiniões e leitura exclusiva da administradora."""

import logging
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)
from sqlalchemy import func, insert, select
from sqlalchemy.exc import SQLAlchemyError
from starlette.concurrency import run_in_threadpool

from mandatometro import db
from mandatometro.api.pedidos_publicos import agente_e_robo, consumir_cota, ler_json_limitado
from mandatometro.db.modelos import (
    PARTES_DA_OPINIAO,
    TAMANHO_TEXTO_OPINIAO,
    LimiteOpiniao,
    Opiniao,
    ParteOpiniao,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["opinioes"])
LIMITE_POR_MINUTO = 30
# Até 12 bytes por caractere em JSON com escapes, mais os outros campos.
LIMITE_DO_CORPO = 24 * 1024
LIMITE_DA_LISTA = 500


class IscaPreenchida(Exception):
    pass


class PedidoOpiniao(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, hide_input_in_errors=True)

    nota: int | None = Field(default=None, ge=1, le=5)
    partes: list[ParteOpiniao] = Field(default_factory=list, max_length=len(PARTES_DA_OPINIAO))
    texto: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=TAMANHO_TEXTO_OPINIAO),
    ]
    site: str = ""

    @model_validator(mode="before")
    @classmethod
    def conferir_isca(cls, dados: object) -> object:
        if isinstance(dados, dict) and isinstance(dados.get("site"), str) and dados["site"]:
            raise IscaPreenchida
        return dados

    @field_validator("partes")
    @classmethod
    def partes_distintas(cls, partes: list[ParteOpiniao]) -> list[ParteOpiniao]:
        if len(set(partes)) != len(partes):
            raise ValueError("Escolha cada parte uma vez.")
        return partes

    @field_validator("texto")
    @classmethod
    def texto_gravavel(cls, texto: str) -> str:
        if "\x00" in texto:
            raise ValueError("O texto contém um caractere inválido.")
        return texto


class ErroOpiniao(BaseModel):
    erro: Literal["dados_invalidos", "corpo_grande", "limite_de_opinioes", "servico_indisponivel"]


class OpiniaoNoPainel(BaseModel):
    criada_em: datetime
    nota: int | None
    partes: list[ParteOpiniao]
    texto: str


class OpinioesPainel(BaseModel):
    total: int
    nota_media: float | None
    por_parte: dict[ParteOpiniao, int]
    opinioes: list[OpiniaoNoPainel]


def _gravar(pedido: PedidoOpiniao) -> int | None:
    with db.engine().begin() as conexao:
        instante = conexao.execute(select(func.clock_timestamp())).scalar_one().astimezone(UTC)
        tentar_em = consumir_cota(conexao, LimiteOpiniao.__table__, instante, LIMITE_POR_MINUTO)
        if tentar_em is None:
            conexao.execute(
                insert(Opiniao).values(nota=pedido.nota, partes=pedido.partes, texto=pedido.texto)
            )
        return tentar_em


def _erro(codigo: int, erro: str, *, tentar_em: int | None = None) -> JSONResponse:
    cabecalhos = {"Cache-Control": "no-store"}
    if tentar_em is not None:
        cabecalhos["Retry-After"] = str(tentar_em)
    return JSONResponse({"erro": erro}, status_code=codigo, headers=cabecalhos)


@router.post(
    "/opinioes",
    status_code=204,
    response_class=Response,
    summary="Receber uma opinião sobre o site",
    description="Recebe JSON de até 24 KiB. Robôs conhecidos e envios com o campo isca preenchido "
    "recebem a mesma resposta de um envio gravado.",
    openapi_extra={
        "requestBody": {
            "required": True,
            "content": {"application/json": {"schema": PedidoOpiniao.model_json_schema()}},
        }
    },
    responses={
        413: {"model": ErroOpiniao, "description": "Corpo maior que 24 KiB."},
        422: {"model": ErroOpiniao, "description": "Dados inválidos, sem repetir a entrada."},
        429: {
            "model": ErroOpiniao,
            "description": "Cota global por minuto atingida.",
            "headers": {
                "Retry-After": {
                    "schema": {"type": "integer"},
                    "description": "Segundos até o próximo minuto.",
                }
            },
        },
        503: {"model": ErroOpiniao, "description": "Operação no banco não confirmada."},
    },
)
async def registrar_opiniao(request: Request) -> Response:
    sucesso = Response(status_code=204, headers={"Cache-Control": "no-store"})
    if agente_e_robo(request):
        return sucesso
    try:
        pedido = await ler_json_limitado(request, PedidoOpiniao, LIMITE_DO_CORPO)
    except IscaPreenchida:
        return sucesso
    except HTTPException as erro:
        if erro.status_code == 413:
            return _erro(413, "corpo_grande")
        return _erro(422, "dados_invalidos")

    try:
        tentar_em = await run_in_threadpool(_gravar, pedido)
    except SQLAlchemyError:
        logger.warning("Banco indisponível no envio de opiniões.")
        return _erro(503, "servico_indisponivel")

    return sucesso if tentar_em is None else _erro(429, "limite_de_opinioes", tentar_em=tentar_em)


def opinioes_do_painel() -> OpinioesPainel:
    contagens = [
        func.count().filter(Opiniao.partes.contains([parte])).label(parte)
        for parte in PARTES_DA_OPINIAO
    ]
    with db.sessao_de_leitura_repetivel() as sessao:
        total, nota_media, *por_parte = sessao.execute(
            select(func.count(Opiniao.id), func.avg(Opiniao.nota), *contagens)
        ).one()
        recentes = sessao.scalars(
            select(Opiniao)
            .order_by(Opiniao.criada_em.desc(), Opiniao.id.desc())
            .limit(LIMITE_DA_LISTA)
        )
        return OpinioesPainel(
            total=total,
            nota_media=nota_media,
            por_parte=dict(zip(PARTES_DA_OPINIAO, por_parte, strict=True)),
            opinioes=[
                OpiniaoNoPainel.model_validate(item, from_attributes=True) for item in recentes
            ],
        )
