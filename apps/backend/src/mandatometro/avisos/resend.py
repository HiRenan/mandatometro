"""Envio HTTP com idempotência e orçamento total, sem registrar dados do destinatário."""

import asyncio
from collections.abc import Awaitable, Callable
from contextlib import suppress
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from math import isfinite
from random import uniform
from time import monotonic
from uuid import UUID

import httpx2

from mandatometro.avisos.email import Mensagem

ORCAMENTO_ENVIO = 8.0
MAX_TENTATIVAS = 3


class EnvioIndisponivel(Exception):
    def __init__(self):
        super().__init__("Não foi possível confirmar o envio.")


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

    async def enviar(self, destinatario: str, mensagem: Mensagem, idempotencia: str) -> None:
        if not self._chave or not self._remetente:
            raise EnvioIndisponivel
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
                            transitorio = (
                                500 <= status < 600
                                or status == 409
                                and nome == "concurrent_idempotent_requests"
                                or status == 429
                                and nome not in ("daily_quota_exceeded", "monthly_quota_exceeded")
                            )
                            if not transitorio:
                                raise EnvioIndisponivel
                        if tentativa == MAX_TENTATIVAS - 1:
                            raise EnvioIndisponivel
                        espera = _espera(resposta, tentativa)
                        if espera >= prazo - monotonic():
                            raise EnvioIndisponivel
                        await self._dormir(espera)
        except TimeoutError:
            raise EnvioIndisponivel from None
