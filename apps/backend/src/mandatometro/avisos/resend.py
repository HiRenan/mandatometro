"""Envio HTTP com idempotência e orçamento total, sem registrar dados do destinatário."""

import asyncio
from collections.abc import Awaitable, Callable
from contextlib import suppress
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from math import isfinite
from random import uniform
from time import monotonic
from typing import Literal
from uuid import UUID

import httpx2

from mandatometro.avisos.email import Mensagem

ORCAMENTO_ENVIO = 8.0
MAX_TENTATIVAS = 3
MotivoFalha = Literal[
    "individual", "geral", "transitoria", "concorrente", "cota_diaria", "cota_mensal"
]


class EnvioIndisponivel(Exception):
    def __init__(self, motivo: MotivoFalha = "transitoria"):
        super().__init__("Não foi possível confirmar o envio.")
        self.motivo = motivo


def _json(resposta: httpx2.Response) -> dict:
    try:
        dados = resposta.json()
    except ValueError:
        return {}
    return dados if isinstance(dados, dict) else {}


def _espera(resposta: httpx2.Response | None, tentativa: int) -> float:
    backoff = 0.5 * 2**tentativa + uniform(0, 0.25)
    if resposta is None or not (valor := resposta.headers.get("Retry-After")):
        return backoff
    try:
        segundos = float(valor)
    except ValueError:
        try:
            segundos = (parsedate_to_datetime(valor) - datetime.now(UTC)).total_seconds()
        except (ValueError, TypeError, OverflowError):
            return backoff
    return max(backoff, segundos) if isfinite(segundos) else backoff


class Resend:
    def __init__(
        self,
        chave: str | None,
        remetente: str | None,
        *,
        transporte: httpx2.AsyncBaseTransport | None = None,
        dormir: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ):
        self._chave = chave
        self._remetente = remetente
        self._transporte = transporte
        self._dormir = dormir

    @property
    def configurado(self) -> bool:
        return bool(self._chave and self._remetente)

    async def enviar(self, destinatario: str, mensagem: Mensagem, idempotencia: str) -> None:
        if not self.configurado:
            raise EnvioIndisponivel("geral")
        prazo = monotonic() + ORCAMENTO_ENVIO
        try:
            async with asyncio.timeout(ORCAMENTO_ENVIO):
                async with httpx2.AsyncClient(
                    transport=self._transporte,
                    timeout=httpx2.Timeout(2.0, connect=1.0),
                    follow_redirects=False,
                ) as cliente:
                    for tentativa in range(MAX_TENTATIVAS):
                        resposta = None
                        with suppress(httpx2.RequestError):
                            resposta = await cliente.post(
                                "https://api.resend.com/emails",
                                headers={
                                    "Authorization": f"Bearer {self._chave}",
                                    "Idempotency-Key": idempotencia,
                                    "User-Agent": "mandatometro (Hack Brasil 2026)",
                                },
                                json={
                                    "from": self._remetente,
                                    "to": [destinatario],
                                    "subject": mensagem.assunto,
                                    "html": mensagem.html,
                                    "text": mensagem.texto,
                                    "headers": mensagem.cabecalhos,
                                },
                            )
                        if resposta is not None:
                            dados = _json(resposta)
                            if resposta.is_success:
                                try:
                                    UUID(dados["id"])
                                except (KeyError, ValueError, TypeError, AttributeError):
                                    raise EnvioIndisponivel from None
                                return
                            status, nome = resposta.status_code, dados.get("name")
                            if status in (401, 403):
                                raise EnvioIndisponivel("geral")
                            if status == 409 and nome == "concurrent_idempotent_requests":
                                raise EnvioIndisponivel("concorrente")
                            if status == 429 and nome == "daily_quota_exceeded":
                                raise EnvioIndisponivel("cota_diaria")
                            if status == 429 and nome == "monthly_quota_exceeded":
                                raise EnvioIndisponivel("cota_mensal")
                            transitorio = 500 <= status < 600 or status == 429
                            if not transitorio:
                                raise EnvioIndisponivel("individual")
                        if tentativa == MAX_TENTATIVAS - 1:
                            raise EnvioIndisponivel
                        espera = _espera(resposta, tentativa)
                        if espera >= prazo - monotonic():
                            raise EnvioIndisponivel
                        await self._dormir(espera)
        except TimeoutError:
            raise EnvioIndisponivel from None
