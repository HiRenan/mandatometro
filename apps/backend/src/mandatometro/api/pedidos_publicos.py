"""Leitura limitada e cota global dos pedidos públicos sem identificação."""

import re
from datetime import datetime, timedelta
from math import ceil

from fastapi import HTTPException, Request
from pydantic import BaseModel, ValidationError
from sqlalchemy import Connection, Table, delete
from sqlalchemy.dialects.postgresql import insert
from starlette.requests import ClientDisconnect

_ROBOS = re.compile(
    r"bot\b|crawler|spider|slurp|headlesschrome|facebookexternalhit|bingpreview|"
    r"curl/|wget/|python-(?:requests|httpx)|go-http-client",
    re.IGNORECASE,
)


def agente_e_robo(request: Request) -> bool:
    return _ROBOS.search(request.headers.get("user-agent", "")) is not None


async def ler_json_limitado[Modelo: BaseModel](
    request: Request, modelo: type[Modelo], limite: int
) -> Modelo:
    tipo = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if tipo != "application/json":
        raise HTTPException(422)

    try:
        declarado = int(request.headers.get("content-length", "0"))
    except ValueError:
        declarado = 0
    if declarado > limite:
        raise HTTPException(413)

    corpo = bytearray()
    try:
        async for bloco in request.stream():
            if len(corpo) + len(bloco) > limite:
                raise HTTPException(413)
            corpo.extend(bloco)
        return modelo.model_validate_json(corpo)
    except (ValidationError, ClientDisconnect):
        # A resposta e o log ficam sem o corpo e sem o erro bruto do Pydantic.
        raise HTTPException(422) from None


def consumir_cota(
    conexao: Connection, tabela: Table, instante: datetime, limite: int
) -> int | None:
    minuto = instante.replace(second=0, microsecond=0)
    janela, quantidade = tabela.c.janela, tabela.c.quantidade
    conexao.execute(delete(tabela).where(janela < minuto - timedelta(minutes=1)))
    gravar = insert(tabela).values(janela=minuto)
    aceita = conexao.scalar(
        gravar.on_conflict_do_update(
            index_elements=[janela],
            set_={"quantidade": quantidade + 1},
            where=quantidade < limite,
        ).returning(quantidade)
    )
    if aceita is None:
        return ceil((minuto + timedelta(minutes=1) - instante).total_seconds())
    return None
