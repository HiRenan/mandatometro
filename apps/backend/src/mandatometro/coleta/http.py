"""HTTP compartilhado pelas Casas: UTF-8, tentativas limitadas e robots em memória."""

import asyncio
import json
import logging
import time
from collections.abc import Callable, Mapping
from contextlib import closing
from dataclasses import dataclass, field
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from functools import partial
from typing import Self
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser

import httpx2

logger = logging.getLogger(__name__)
USER_AGENT = "mandatometro (Hack Brasil 2026)"

type _Get = Callable[..., httpx2.Response]


class ErroColeta(Exception):
    """Falha comunicável sem corpo de resposta, dados pessoais ou parâmetros de SQL."""

    def __init__(self, mensagem: str, *, status_http: int | None = None):
        super().__init__(mensagem)
        self.status_http = status_http


class ErroJsonInvalido(ErroColeta):
    """A resposta HTTP foi bem-sucedida, mas o conteúdo não é JSON UTF-8 válido."""


class ErroColetaTemporario(ErroColeta):
    """A fonte segue indisponível após as tentativas ou pediu uma espera longa."""


class PrazoConsultaEsgotado(ErroColeta):
    """A consulta opcional não cabe no tempo que resta."""

    def __init__(self):
        super().__init__("Prazo da consulta opcional esgotado.")


def _dormir(segundos: float, prazo: float | None) -> None:
    if prazo is not None and time.monotonic() + segundos >= prazo:
        raise PrazoConsultaEsgotado()
    time.sleep(segundos)


@dataclass(frozen=True)
class Resposta:
    url: str
    coletado_em: datetime
    dados: object = field(repr=False)


class ClienteHttp:
    """GET sequencial; aceita JSON com qualquer envelope e caminhos com sufixo .json.

    Caminhos relativos são resolvidos dentro de base_url. URLs absolutas, como as de paginação,
    precisam ficar nessa base. O cliente injetado pertence ao chamador; o próprio é fechado aqui.
    O transporte de teste atende aos GETs síncronos e aos que têm prazo integral.
    """

    def __init__(
        self,
        base_url: str,
        *,
        cliente: httpx2.Client | None = None,
        transporte: httpx2.MockTransport | None = None,
        timeout: float = 30.0,
        tentativas: int = 3,
        intervalo: float = 0.2,
    ):
        if timeout <= 0 or tentativas < 1 or intervalo < 0:
            raise ValueError("Timeout, tentativas e intervalo inválidos.")
        self.base_url = base_url.rstrip("/")
        self._base = urlsplit(self.base_url)
        if self._base.scheme != "https" or not self._base.netloc:
            raise ValueError("A base precisa ser uma URL HTTPS.")
        self._proprio = cliente is None
        self._cliente = cliente if cliente is not None else httpx2.Client(transport=transporte)
        self._transporte = transporte
        self._cliente_no_prazo: tuple[asyncio.AbstractEventLoop, httpx2.AsyncClient] | None = None
        self._timeout = timeout
        self._tentativas = tentativas
        self._intervalo = intervalo
        self._ultimo_inicio: float | None = None
        self._adiado_ate = 0.0
        self._robots: RobotFileParser | None = None
        self._robots_em: float = 0
        self.chamadas = 0
        self.tentativas_extras = 0

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *_):
        self.fechar()

    def fechar(self) -> None:
        try:
            if self._cliente_no_prazo is not None:
                loop, cliente = self._cliente_no_prazo
                self._cliente_no_prazo = None
                # Fechar o loop dispensa esperar uma resolução de DNS já cancelada.
                with closing(loop):
                    loop.run_until_complete(cliente.aclose())
        finally:
            if self._proprio:
                self._cliente.close()

    def _url(self, caminho: str) -> str:
        url = urljoin(self.base_url + "/", caminho.lstrip("/"))
        destino = urlsplit(url)
        if (
            (destino.scheme, destino.netloc) != (self._base.scheme, self._base.netloc)
            or not destino.path.startswith(self._base.path + "/")
            or destino.fragment
        ):
            raise ErroColeta("Link fora da base oficial da coleta.")
        return url

    def _pausar(self, prazo: float | None) -> None:
        espera_da_fonte = self._adiado_ate - time.monotonic()
        if espera_da_fonte > 60:
            raise ErroColetaTemporario(
                "A fonte ainda exige espera superior a 60 segundos; tente mais tarde."
            )
        if espera_da_fonte > 0:
            _dormir(espera_da_fonte, prazo)
        self._adiado_ate = 0
        intervalo = self._intervalo
        if self._robots:
            intervalo = max(intervalo, self._robots.crawl_delay("mandatometro") or 0)
            taxa = self._robots.request_rate("mandatometro")
            if taxa and taxa.requests:
                intervalo = max(intervalo, taxa.seconds / taxa.requests)
        agora = time.monotonic()
        if self._ultimo_inicio is not None:
            espera = intervalo - (agora - self._ultimo_inicio)
            if espera > 0:
                _dormir(espera, prazo)
        self._ultimo_inicio = time.monotonic()

    def _espera(self, resposta: httpx2.Response | None, tentativa: int) -> float:
        espera = float(2**tentativa)
        valor = resposta.headers.get("retry-after") if resposta is not None else None
        if valor:
            try:
                adicional = float(valor)
            except ValueError:
                try:
                    data = parsedate_to_datetime(valor)
                    adicional = (data - datetime.now(UTC)).total_seconds()
                except (TypeError, ValueError, OverflowError):
                    adicional = 0
            espera = max(espera, adicional)
            self._adiado_ate = max(self._adiado_ate, time.monotonic() + max(0, adicional))
        if espera > 60:
            raise ErroColetaTemporario(
                "A fonte solicitou espera superior a 60 segundos; tente mais tarde."
            )
        return espera

    def _get_no_prazo(
        self,
        url: str,
        *,
        prazo: float,
        headers: dict[str, str],
        timeout: float,
        follow_redirects: bool,
    ) -> httpx2.Response:
        if self._cliente_no_prazo is None:
            cliente = httpx2.AsyncClient(
                cookies=self._cliente.cookies.jar, transport=self._transporte
            )
            self._cliente_no_prazo = asyncio.new_event_loop(), cliente
        loop, cliente = self._cliente_no_prazo

        async def requisitar() -> httpx2.Response:
            # O timeout do HTTPX limita cada operação de rede. Este prazo cobre o GET inteiro.
            async with asyncio.timeout_at(prazo):
                return await cliente.get(
                    url, headers=headers, timeout=timeout, follow_redirects=follow_redirects
                )

        try:
            return loop.run_until_complete(requisitar())
        except TimeoutError:
            raise PrazoConsultaEsgotado() from None

    def _enviar(self, url: str, *, robots: bool, prazo: float | None, get: _Get) -> httpx2.Response:
        for tentativa in range(self._tentativas):
            if tentativa:
                self.tentativas_extras += 1
            self._pausar(prazo)
            timeout = self._timeout
            if prazo is not None:
                timeout = min(timeout, prazo - time.monotonic())
                if timeout <= 0:
                    raise PrazoConsultaEsgotado()
            self.chamadas += 1
            resposta = None
            try:
                resposta = get(
                    url,
                    headers={
                        "User-Agent": USER_AGENT,
                        "Accept": "text/plain" if robots else "application/json",
                    },
                    timeout=timeout,
                    follow_redirects=False,
                )
            except httpx2.TransportError:
                pass
            else:
                if resposta.status_code not in (408, 429) and resposta.status_code < 500:
                    return resposta
            espera = self._espera(resposta, tentativa)
            if tentativa + 1 < self._tentativas:
                _dormir(espera, prazo)
        raise ErroColetaTemporario("Falha transitória na fonte após esgotar as tentativas.")

    def _obter(
        self, url: str, *, robots: bool = False, prazo: float | None, get: _Get
    ) -> httpx2.Response:
        for _ in range(6):
            if not robots:
                url = self._url(url)
                if not self._robots.can_fetch("mandatometro", url):
                    raise ErroColeta("Consulta proibida pelo robots.txt.")
            resposta = self._enviar(url, robots=robots, prazo=prazo, get=get)
            if resposta.status_code not in (301, 302, 303, 307, 308):
                return resposta
            destino = resposta.headers.get("location")
            if not destino:
                raise ErroColeta("Redirecionamento sem destino na fonte.")
            url = urljoin(str(resposta.url), destino)
            if urlsplit(url).scheme != "https":
                raise ErroColeta("Redirecionamento fora de HTTPS.")
        raise ErroColeta("Limite de redirecionamentos excedido na fonte.")

    def _ler_robots(self, prazo: float | None, get: _Get) -> None:
        if self._robots is not None and time.monotonic() - self._robots_em < 86400:
            return
        url = f"{self._base.scheme}://{self._base.netloc}/robots.txt"
        resposta = self._obter(url, robots=True, prazo=prazo, get=get)
        parser = RobotFileParser(url)
        if 400 <= resposta.status_code < 500:
            # RFC 9309 §2.3.1.3: indisponibilidade do arquivo, inclusive 403, não é uma regra REP.
            logger.warning("robots.txt indisponível (HTTP %s).", resposta.status_code)
            parser.parse([])
        elif resposta.is_success:
            parser.parse(resposta.content.decode("utf-8", errors="replace").splitlines())
        else:
            raise ErroColeta("Não foi possível consultar o robots.txt.")
        self._robots = parser
        self._robots_em = time.monotonic()

    def obter_json(
        self,
        caminho: str,
        *,
        params: Mapping[str, str | int] | None = None,
        prazo: float | None = None,
        prazo_integral: bool = False,
    ) -> Resposta:
        url = self._url(caminho)
        if params:
            url = str(httpx2.URL(url, params=params))
        get: _Get = self._cliente.get
        if prazo_integral and prazo is not None:
            if not self._proprio and self._transporte is None:
                raise ValueError("Informe transporte assíncrono para consultas com prazo integral.")
            get = partial(self._get_no_prazo, prazo=prazo)
        self._ler_robots(prazo, get)
        resposta = self._obter(url, prazo=prazo, get=get)
        if not resposta.is_success:
            raise ErroColeta(
                f"A fonte respondeu HTTP {resposta.status_code}.",
                status_http=resposta.status_code,
            )
        try:
            dados = json.loads(resposta.content.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ErroJsonInvalido("Resposta da fonte não é JSON UTF-8 válido.") from None
        return Resposta(str(resposta.url), datetime.now(UTC), dados)
