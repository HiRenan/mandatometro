"""HTTP compartilhado pelas Casas: UTF-8, tentativas limitadas e robots em memória."""

import json
import logging
import time
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Self
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser

import httpx2

logger = logging.getLogger(__name__)
USER_AGENT = "mandatometro (Hack Brasil 2026)"


class ErroColeta(Exception):
    """Falha comunicável sem corpo de resposta, dados pessoais ou parâmetros de SQL."""


@dataclass(frozen=True)
class Resposta:
    url: str
    coletado_em: datetime
    dados: object = field(repr=False)


class ClienteHttp:
    """GET sequencial; aceita JSON com qualquer envelope e caminhos com sufixo .json.

    Caminhos relativos são resolvidos dentro de base_url. URLs absolutas, como as de paginação,
    precisam ficar nessa base. O cliente injetado pertence ao chamador; o próprio é fechado aqui.
    """

    def __init__(
        self,
        base_url: str,
        *,
        cliente: httpx2.Client | None = None,
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
        self._cliente = cliente if cliente is not None else httpx2.Client()
        self._timeout = timeout
        self._tentativas = tentativas
        self._intervalo = intervalo
        self._ultimo_inicio: float | None = None
        self._robots: RobotFileParser | None = None
        self._robots_em: float = 0
        self.chamadas = 0
        self.tentativas_extras = 0

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *_):
        self.fechar()

    def fechar(self) -> None:
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

    def _pausar(self) -> None:
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
                time.sleep(espera)
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
        if espera > 60:
            raise ErroColeta("A fonte solicitou espera superior a 60 segundos; tente mais tarde.")
        return espera

    def _enviar(self, url: str, *, robots: bool = False) -> httpx2.Response:
        for tentativa in range(self._tentativas):
            if tentativa:
                self.tentativas_extras += 1
            self._pausar()
            self.chamadas += 1
            resposta = None
            try:
                resposta = self._cliente.get(
                    url,
                    headers={
                        "User-Agent": USER_AGENT,
                        "Accept": "text/plain" if robots else "application/json",
                    },
                    timeout=self._timeout,
                    follow_redirects=False,
                )
            except httpx2.TransportError:
                pass
            else:
                if resposta.status_code not in (408, 429) and resposta.status_code < 500:
                    return resposta
            if tentativa + 1 < self._tentativas:
                time.sleep(self._espera(resposta, tentativa))
        raise ErroColeta("Falha transitória na fonte após esgotar as tentativas.")

    def _obter(self, url: str, *, robots: bool = False) -> httpx2.Response:
        for _ in range(6):
            if not robots:
                url = self._url(url)
                if not self._robots.can_fetch("mandatometro", url):
                    raise ErroColeta("Consulta proibida pelo robots.txt.")
            resposta = self._enviar(url, robots=robots)
            if resposta.status_code not in (301, 302, 303, 307, 308):
                return resposta
            destino = resposta.headers.get("location")
            if not destino:
                raise ErroColeta("Redirecionamento sem destino na fonte.")
            url = urljoin(str(resposta.url), destino)
            if urlsplit(url).scheme != "https":
                raise ErroColeta("Redirecionamento fora de HTTPS.")
        raise ErroColeta("Limite de redirecionamentos excedido na fonte.")

    def _ler_robots(self) -> None:
        if self._robots is not None and time.monotonic() - self._robots_em < 86400:
            return
        url = f"{self._base.scheme}://{self._base.netloc}/robots.txt"
        resposta = self._obter(url, robots=True)
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
    ) -> Resposta:
        url = self._url(caminho)
        if params:
            url = str(httpx2.URL(url, params=params))
        self._ler_robots()
        resposta = self._obter(url)
        if not resposta.is_success:
            raise ErroColeta(f"A fonte respondeu HTTP {resposta.status_code}.")
        try:
            dados = json.loads(resposta.content.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ErroColeta("Resposta da fonte não é JSON UTF-8 válido.") from None
        return Resposta(str(resposta.url), datetime.now(UTC), dados)
