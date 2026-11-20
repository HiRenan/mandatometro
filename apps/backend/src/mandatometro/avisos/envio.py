"""Envio sequencial e retomável; o único estado por pessoa é a última edição aceita."""

import asyncio
from collections.abc import Awaitable, Callable, Iterator
from dataclasses import dataclass, field
from datetime import datetime
from time import monotonic
from typing import Literal
from uuid import UUID

from sqlalchemy import Engine, func, or_, select, tuple_, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, aliased

from mandatometro.avisos.consulta import EdicaoCarregada, carregar_edicao
from mandatometro.avisos.email import (
    MensagemInvalida,
    formatar_edicao,
    montar_email,
    validar_enderecos_envio,
)
from mandatometro.avisos.resend import EnvioIndisponivel, Resend
from mandatometro.db.modelos import Edicao, Inscrito


@dataclass(frozen=True)
class Destinatario:
    email: str = field(repr=False)
    codigo_saida: UUID = field(repr=False)
    atualizado: bool = False


def _carregar(banco: Engine, edicao_id: int | None, publicada_desde: datetime | None):
    with Session(banco) as sessao:
        return carregar_edicao(sessao, edicao_id, publicada_desde=publicada_desde)


def _teto(banco: Engine) -> int:
    with Session(banco) as sessao:
        return sessao.scalar(select(func.max(Inscrito.id))) or 0


def _pendentes(edicao: Edicao, teto: int):
    ultima = aliased(Edicao)
    return (
        select(Inscrito.id)
        .outerjoin(ultima, ultima.id == Inscrito.ultima_edicao_enviada_id)
        .where(
            Inscrito.id <= teto,
            or_(
                Inscrito.ultima_edicao_enviada_id.is_(None),
                tuple_(ultima.publicada_em, ultima.id) < tuple_(edicao.publicada_em, edicao.id),
            ),
        )
    )


def _contar(banco: Engine, edicao: Edicao, teto: int) -> tuple[int, int]:
    with Session(banco) as sessao:
        total = sessao.scalar(select(func.count(Inscrito.id)).where(Inscrito.id <= teto))
        pendentes = sessao.scalar(
            select(func.count()).select_from(_pendentes(edicao, teto).subquery())
        )
        return total, pendentes


def _ids(banco: Engine, edicao: Edicao, teto: int) -> Iterator[int]:
    ultimo = 0
    while True:
        with Session(banco) as sessao:
            ids = list(
                sessao.scalars(
                    _pendentes(edicao, teto)
                    .where(Inscrito.id > ultimo)
                    .order_by(Inscrito.id)
                    .limit(100)
                )
            )
        if not ids:
            return
        ultimo = ids[-1]
        yield from ids


def _destinatario(banco: Engine, inscrito_id: int, edicao: Edicao) -> Destinatario | None:
    ultima = aliased(Edicao)
    with Session(banco) as sessao:
        linha = sessao.execute(
            select(Inscrito, ultima)
            .outerjoin(ultima, ultima.id == Inscrito.ultima_edicao_enviada_id)
            .where(Inscrito.id == inscrito_id)
        ).first()
        if linha is None:
            return None
        inscrito, anterior = linha
        atualizado = anterior is not None and (anterior.publicada_em, anterior.id) >= (
            edicao.publicada_em,
            edicao.id,
        )
        return Destinatario(inscrito.email, inscrito.codigo_saida, atualizado)


def _confirmar(banco: Engine, inscrito_id: int, edicao: Edicao) -> None:
    anteriores = select(Edicao.id).where(
        tuple_(Edicao.publicada_em, Edicao.id) < tuple_(edicao.publicada_em, edicao.id)
    )
    with banco.begin() as conexao:
        # O predicado é reavaliado pelo UPDATE: uma confirmação atrasada nunca regride o marco.
        # Se o POST de saída já apagou a linha, nada a recria.
        conexao.execute(
            update(Inscrito)
            .where(
                Inscrito.id == inscrito_id,
                or_(
                    Inscrito.ultima_edicao_enviada_id.is_(None),
                    Inscrito.ultima_edicao_enviada_id.in_(anteriores),
                ),
            )
            .values(ultima_edicao_enviada_id=edicao.id)
        )


async def enviar_para_inscrito(
    banco: Engine,
    inscrito_id: int,
    carregada: EdicaoCarregada,
    provedor: Resend,
    *,
    app_base_url: str,
    api_url: str,
) -> Literal["aceito", "ja_atualizado", "removido"]:
    edicao = carregada.edicao
    destinatario = await asyncio.to_thread(_destinatario, banco, inscrito_id, edicao)
    if destinatario is None:
        return "removido"
    if destinatario.atualizado:
        return "ja_atualizado"
    mensagem = montar_email(
        edicao,
        destinatario.codigo_saida,
        app_base_url=app_base_url,
        api_url=api_url,
        fontes=carregada.fontes,
    )
    await provedor.enviar(
        destinatario.email, mensagem, f"inscricao/{inscrito_id}/edicao/{edicao.id}"
    )
    await asyncio.to_thread(_confirmar, banco, inscrito_id, edicao)
    return "aceito"


async def enviar_edicao(
    banco: Engine,
    provedor: Resend,
    *,
    app_base_url: str,
    api_url: str,
    edicao_id: int | None = None,
    publicada_desde: datetime | None = None,
    simular: bool = False,
    limite: int | None = None,
    dormir: Callable[[float], Awaitable[None]] = asyncio.sleep,
) -> tuple[dict[str, int | None], int]:
    resumo = dict.fromkeys(
        (
            "inscritos",
            "ja_atualizados",
            "aceitos_nesta_execucao",
            "faltam",
            "recusados",
            "concorrentes",
            "falhas_transitorias",
            "falhas_gerais",
            "removidos",
            "cota_diaria",
            "cota_mensal",
            "configuracao_invalida",
            "edicao_indisponivel",
        ),
        0,
    )
    resumo.update(edicao_id=edicao_id, simulacao=int(simular))
    carregada = await asyncio.to_thread(_carregar, banco, edicao_id, publicada_desde)
    if carregada is None:
        resumo["edicao_indisponivel"] = int(edicao_id is not None)
        return resumo, int(edicao_id is not None)
    edicao = carregada.edicao
    resumo["edicao_id"] = edicao.id
    try:
        if not simular:
            if not provedor.configurado:
                resumo["configuracao_invalida"] = 1
                return resumo, 2
            validar_enderecos_envio(app_base_url, api_url)
    except MensagemInvalida:
        resumo["configuracao_invalida"] = 1
        return resumo, 2
    try:
        formatar_edicao(edicao, fontes=carregada.fontes, app_base_url=app_base_url, previa=simular)
    except MensagemInvalida:
        resumo["edicao_indisponivel"] = 1
        return resumo, 1
    teto = await asyncio.to_thread(_teto, banco)
    total, pendentes = await asyncio.to_thread(_contar, banco, edicao, teto)
    resumo.update(inscritos=total, ja_atualizados=total - pendentes, faltam=pendentes)
    if simular:
        return resumo, 0
    tentados, ultimo_inicio = 0, None
    recusas_seguidas = 0
    try:
        for inscrito_id in _ids(banco, edicao, teto):
            if limite is not None and tentados >= limite:
                break
            if ultimo_inicio is not None:
                await dormir(max(0, 1 - (monotonic() - ultimo_inicio)))
            ultimo_inicio = monotonic()
            try:
                resultado = await enviar_para_inscrito(
                    banco,
                    inscrito_id,
                    carregada,
                    provedor,
                    app_base_url=app_base_url,
                    api_url=api_url,
                )
                recusas_seguidas = 0
                if resultado == "aceito":
                    resumo["aceitos_nesta_execucao"] += 1
                    tentados += 1
                elif resultado == "removido":
                    resumo["removidos"] += 1
            except EnvioIndisponivel as erro:
                tentados += 1
                campo = {
                    "geral": "falhas_gerais",
                    "individual": "recusados",
                    "concorrente": "concorrentes",
                    "transitoria": "falhas_transitorias",
                }.get(erro.motivo, erro.motivo)
                resumo[campo] += 1
                recusas_seguidas = recusas_seguidas + 1 if erro.motivo == "individual" else 0
                if recusas_seguidas == 3:
                    resumo["falhas_gerais"] += 1
                    break
                if erro.motivo in {"geral", "cota_diaria", "cota_mensal"}:
                    break
    except (SQLAlchemyError, MensagemInvalida):
        resumo["falhas_gerais"] += 1
    try:
        _, resumo["faltam"] = await asyncio.to_thread(_contar, banco, edicao, teto)
    except SQLAlchemyError:
        resumo.pop("faltam")
        resumo["contagem_indisponivel"] = 1
        resumo["falhas_gerais"] += 1
    falhou = any(
        resumo.get(c, 0)
        for c in (
            "faltam",
            "falhas_gerais",
            "cota_diaria",
            "cota_mensal",
            "recusados",
            "concorrentes",
            "falhas_transitorias",
        )
    )
    return resumo, int(falhou)
