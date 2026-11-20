"""Coleta os atos da página de destaques do DOU pela exceção do ADR 0006."""

import argparse
import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, date, datetime
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from itertools import pairwise
from typing import Self, cast
from urllib.parse import urlencode
from xml.etree import ElementTree
from zoneinfo import ZoneInfo

import httpx2
from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.coleta.cli import adicionar_argumentos_periodo, mostrar_resumo, resolver_periodo
from mandatometro.coleta.http import USER_AGENT, ErroColeta, Resposta
from mandatometro.coleta.persistencia import registrar_fonte, salvar_ato
from mandatometro.coleta.tipos import ResumoAtos
from mandatometro.config import config
from mandatometro.db import sessao

ORIGEM = "destaques_dou"
URL_DESTAQUES = (
    "https://www.in.gov.br/servicos/diario-oficial-da-uniao/destaques-do-diario-oficial-da-uniao"
)
MAX_PAGINAS = 6
_PORTLET = "com_liferay_asset_publisher_web_portlet_AssetPublisherPortlet_INSTANCE_mhF1RLPnJWPh"
_API_FIRECRAWL = "https://api.firecrawl.dev/v2/scrape"
_TENTATIVAS = 3
_MAX_ESPERA_S = 60
_SECOES = {"DO1", "DO1E", "DO1S"}
_TIPOS = {
    "decreto": "decreto",
    "decreto numerado": "decreto",
    "decreto não numerado": "decreto",
    "lei": "lei",
    "lei complementar": "lei",
    "medida provisória": "medida_provisoria",
    "medida provisoria": "medida_provisoria",
}
_CAMPOS = {
    "idMateria",
    "artType",
    "pubName",
    "pubDate",
    "artSection",
    "hierarchy",
    "titulo",
    "highlight",
    "data",
    "ementa",
}
_INICIO_XML = re.compile(r"<!--.*?-->|<!\[CDATA\[.*?\]\]>|(?P<raiz><root(?=[\s>]))", re.DOTALL)
_XML = re.compile(r"<root(?=[\s>]).*?</root>", re.DOTALL)
_CDATA_EM_COMENTARIO = re.compile(r"<!--\[CDATA\[(.*?)\]\]-->", re.DOTALL)
_LINK_ATO = re.compile(
    r"https://www\.in\.gov\.br/web/dou/-/((?:[a-z0-9][a-z0-9.-]*/)*[a-z0-9][a-z0-9.-]*)-[0-9]+"
)
_NUMERO = re.compile(r"\bn(?:\.?[º°o]|\.)?[-\s]+([0-9]+(?:\.[0-9]{3})*)(?=$|[-/\s,])", re.I)
_DATA_EXTENSO = re.compile(r"(?:^|-)([0-9]{1,2})º?-de-([a-zç]+)-de-([0-9]{4})(?=$|[-,.])")
_MESES = (
    "janeiro",
    "fevereiro",
    "marco",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
)


@dataclass
class ResumoDestaques(ResumoAtos):
    assinaturas_ignoradas: int = 0


def _url_paginada(numero: int) -> str:
    parametros = urlencode(
        {
            "p_p_id": _PORTLET,
            "p_p_lifecycle": "0",
            "p_p_state": "normal",
            "p_p_mode": "view",
            f"_{_PORTLET}_delta": "20",
            "p_r_p_resetCur": "false",
            f"_{_PORTLET}_cur": numero,
        }
    )
    return f"{URL_DESTAQUES}?{parametros}"


_PAGINAS = (URL_DESTAQUES, *(_url_paginada(n) for n in range(2, MAX_PAGINAS + 1)))


class _FalhaFirecrawl(ErroColeta):
    def __init__(self, motivo: str):
        super().__init__(f"Falha na coleta de destaques pelo Firecrawl ({motivo}).")


def _retry_after(resposta: httpx2.Response) -> float:
    valor = resposta.headers.get("Retry-After", "").strip()
    if valor.isascii() and valor.isdecimal():
        return float(valor)
    try:
        quando = parsedate_to_datetime(valor)
    except (ValueError, TypeError, OverflowError):
        return 0
    if quando.tzinfo is None:
        quando = quando.replace(tzinfo=UTC)
    return (quando - datetime.now(UTC)).total_seconds()


def _interpretar_resposta(resposta: httpx2.Response, url: str) -> Resposta:
    status = resposta.status_code
    if status in (401, 403):
        raise _FalhaFirecrawl("chave_recusada")
    if status == 402:
        raise _FalhaFirecrawl("sem_credito")
    if status == 429:
        raise _FalhaFirecrawl("limite_pedidos")
    if 500 <= status < 600:
        raise _FalhaFirecrawl("servidor_firecrawl")
    if status != 200:
        raise _FalhaFirecrawl("http_inesperado")

    try:
        envelope = resposta.json()
    except (ValueError, RecursionError):
        raise _FalhaFirecrawl("json_invalido") from None
    if not isinstance(envelope, dict):
        raise _FalhaFirecrawl("formato_invalido")
    if envelope.get("success") is not True:
        raise _FalhaFirecrawl("recusa")
    dados = envelope.get("data")
    if not isinstance(dados, dict):
        raise _FalhaFirecrawl("formato_invalido")
    metadados = dados.get("metadata")
    html = dados.get("rawHtml")
    if not isinstance(metadados, dict) or not isinstance(html, str):
        raise _FalhaFirecrawl("formato_invalido")
    if metadados.get("statusCode") != 200:
        raise _FalhaFirecrawl("status_pagina")
    if metadados.get("url", url) != url:
        raise _FalhaFirecrawl("pagina_redirecionada")
    return Resposta(url, datetime.now(UTC), html)


class ClienteFirecrawl:
    """POST restrito às seis URLs da exceção. Os links da resposta nunca são consultados."""

    def __init__(self, chave: SecretStr, *, cliente: httpx2.Client | None = None):
        self._chave = chave
        self._proprio = cliente is None
        self._cliente = cliente if cliente is not None else httpx2.Client()
        self.chamadas = 0
        self.tentativas_extras = 0

    def __enter__(self) -> Self:
        return self

    def __exit__(self, *_) -> None:
        if self._proprio:
            self._cliente.close()

    def ler_pagina(self, url: str) -> Resposta:
        if url not in _PAGINAS:
            raise _FalhaFirecrawl("endereco_fora_da_excecao")

        for tentativa in range(_TENTATIVAS):
            self.chamadas += 1
            if tentativa:
                self.tentativas_extras += 1
            try:
                resposta = self._cliente.post(
                    _API_FIRECRAWL,
                    headers={
                        "Authorization": f"Bearer {self._chave.get_secret_value().strip()}",
                        "User-Agent": USER_AGENT,
                        "Accept": "application/json",
                    },
                    json={"url": url, "formats": ["rawHtml"], "maxAge": 0},
                    timeout=65,
                    follow_redirects=False,
                )
            except httpx2.TimeoutException:
                raise _FalhaFirecrawl("tempo_esgotado") from None
            except (httpx2.RequestError, UnicodeError):
                raise _FalhaFirecrawl("falha_rede") from None
            status = resposta.status_code
            if status != 429 and not 500 <= status < 600:
                return _interpretar_resposta(resposta, url)
            if tentativa + 1 == _TENTATIVAS:
                break
            espera = max(2**tentativa, _retry_after(resposta))
            if espera > _MAX_ESPERA_S:
                break
            time.sleep(espera)
        return _interpretar_resposta(resposta, url)


class _DescartarAto(Exception):
    """Dado inválido em um cartão, com motivo fixo para a contagem."""


class _LinkDoAto(HTMLParser):
    url: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "a" and self.url is None:
            atributos = dict(attrs)
            if "title" in (atributos.get("class") or "").split():
                self.url = atributos.get("href") or ""


def _dividir_cartoes(html: str) -> list[str]:
    # O começo de cada bloco também delimita o cartão quando falta o fechamento do XML.
    inicios = [marca.start() for marca in _INICIO_XML.finditer(html) if marca["raiz"]]
    return [html[inicio:fim] for inicio, fim in pairwise([*inicios, len(html)])]


def _ler_campos(cartao: str) -> tuple[dict[str, str], str]:
    trecho = _XML.search(cartao)
    if trecho is None:
        raise _DescartarAto("xml_invalido")
    # Ao serializar o DOM, o Firecrawl devolve CDATA como comentário e pode incluir &nbsp;.
    bloco = _CDATA_EM_COMENTARIO.sub(r"<![CDATA[\1]]>", trecho[0]).replace("&nbsp;", "\u00a0")
    try:
        raiz = ElementTree.fromstring(bloco)
    except ElementTree.ParseError:
        raise _DescartarAto("xml_invalido") from None

    campos = {}
    for elemento in raiz.findall("dynamic-element"):
        nome = elemento.get("name")
        if nome in _CAMPOS:
            conteudo = elemento.find("dynamic-content")
            if conteudo is not None:
                campos[nome] = "".join(conteudo.itertext()).strip()
    return campos, cartao[trecho.end() :]


def _data_br(valor: str) -> date | None:
    try:
        return datetime.strptime(valor, "%d/%m/%Y").date()
    except ValueError:
        return None


def _assinatura(campo: str, slug: str) -> date | None:
    if campo:
        data = _data_br(campo)
        if data is not None:
            return data
        try:
            return date.fromisoformat(campo)
        except ValueError:
            pass
    origem = "-".join(campo.casefold().split()) if campo else slug
    if partes := _DATA_EXTENSO.search(origem):
        dia, nome_mes, ano = partes.groups()
        try:
            mes = _MESES.index(nome_mes.replace("ç", "c")) + 1
            return date(int(ano), mes, int(dia))
        except ValueError:
            raise _DescartarAto("data_invalida") from None
    if campo:
        raise _DescartarAto("data_invalida")
    return None


def _gravar_ato(
    campos: dict[str, str],
    html_link: str,
    publicacao: date | None,
    resposta: Resposta,
    *,
    resumo: ResumoDestaques,
    hoje: date,
    abrir_sessao: Callable[[], Session],
) -> None:
    if not campos.get("pubDate"):
        raise _DescartarAto("campo_obrigatorio")
    if publicacao is None:
        raise _DescartarAto("data_invalida")
    if publicacao > hoje:
        raise _DescartarAto("data_futura")
    if not resumo.inicio <= publicacao <= resumo.fim:
        raise _DescartarAto("fora_do_periodo")

    secao = campos.get("pubName", "")
    if not secao:
        raise _DescartarAto("campo_obrigatorio")
    if secao not in _SECOES:
        raise _DescartarAto("secao_fora_do_recorte")
    id_externo = campos.get("idMateria", "")
    titulo_oficial = campos.get("titulo", "")
    titulo = titulo_oficial or campos.get("highlight")
    tipo = campos.get("artType", "")
    if not (re.fullmatch(r"[0-9]+", id_externo) and titulo and tipo):
        raise _DescartarAto("campo_obrigatorio")

    link = _LinkDoAto()
    link.feed(html_link)
    url_publica = link.url or ""
    destino = _LINK_ATO.fullmatch(url_publica)
    if destino is None:
        raise _DescartarAto("link_invalido")
    slug = destino[1]
    assinatura = _assinatura(campos.get("data", ""), slug)
    assinatura_ignorada = assinatura is not None and assinatura > publicacao
    numero = _NUMERO.search(slug) or _NUMERO.search(titulo_oficial)

    with abrir_sessao() as s, s.begin():
        fonte = registrar_fonte(s, resposta, url_publica=url_publica)
        salvar_ato(
            s,
            origem=ORIGEM,
            id_externo=id_externo,
            tipo=_TIPOS.get(" ".join(tipo.casefold().split()), "outro"),
            titulo=titulo,
            ementa=campos.get("ementa") or None,
            data_publicacao=publicacao,
            data_assinatura=None if assinatura_ignorada else assinatura,
            secao=secao,
            orgao=campos.get("artSection") or campos.get("hierarchy") or None,
            numero=(numero[1].replace(".", "").lstrip("0") or "0") if numero else None,
            fonte=fonte,
        )
    resumo.atos += 1
    if assinatura_ignorada:
        resumo.assinaturas_ignoradas += 1


def _contar_descarte(resumo: ResumoAtos, motivo: str) -> None:
    resumo.descartes[motivo] = resumo.descartes.get(motivo, 0) + 1


def coletar(
    inicio: date,
    fim: date,
    *,
    http: ClienteFirecrawl,
    abrir_sessao: Callable[[], Session] = sessao,
    hoje: date | None = None,
) -> ResumoDestaques:
    resumo = ResumoDestaques(ORIGEM, inicio, fim)
    comeco = time.monotonic()
    hoje = hoje or datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    try:
        # Abrir a sessão é preguiçoso. Confirme a conexão antes de gastar crédito.
        try:
            with abrir_sessao() as s:
                s.execute(select(1))
        except SQLAlchemyError:
            raise ErroColeta("O banco não respondeu antes da coleta dos destaques.") from None

        for url in _PAGINAS:
            resposta = http.ler_pagina(url)
            html = cast(str, resposta.dados)
            cartoes = _dividir_cartoes(html)
            if not cartoes and url == URL_DESTAQUES:
                raise _FalhaFirecrawl("pagina_sem_destaques")
            seguir = False
            for cartao in cartoes:
                publicacao = None
                try:
                    campos, html_link = _ler_campos(cartao)
                    publicacao = _data_br(campos.get("pubDate", ""))
                    _gravar_ato(
                        campos,
                        html_link,
                        publicacao,
                        resposta,
                        resumo=resumo,
                        hoje=hoje,
                        abrir_sessao=abrir_sessao,
                    )
                except _DescartarAto as erro:
                    _contar_descarte(resumo, str(erro))
                # Uma data ilegível não demonstra que a página inteira é anterior ao período.
                seguir = seguir or publicacao is None or publicacao >= inicio
            if not seguir:
                break
        else:
            resumo.completa = False
            resumo.erro = "Limite de páginas dos destaques atingido."
    except ErroColeta as erro:
        resumo.completa = False
        resumo.erro = str(erro)
    except SQLAlchemyError:
        resumo.completa = False
        _contar_descarte(resumo, "falha_gravacao")
        resumo.erro = "Falha de gravação no banco. Ato desfeito."
    finally:
        resumo.chamadas = http.chamadas
        resumo.tentativas_extras = http.tentativas_extras
        resumo.duracao_s = round(time.monotonic() - comeco, 3)
    return resumo


def _executar(args: argparse.Namespace) -> int:
    try:
        inicio, fim = resolver_periodo(args.inicio, args.fim)
    except ValueError as erro:
        print(str(erro))
        return 2

    chave = config().firecrawl_api_key
    if chave is None or not chave.get_secret_value().strip():
        print("Defina FIRECRAWL_API_KEY para coletar os destaques do DOU.")
        return 2
    with ClienteFirecrawl(chave) as http:
        resumo = coletar(inicio, fim, http=http)
    mostrar_resumo(resumo)
    return 0 if resumo.completa else 1


def registrar(casas: argparse._SubParsersAction) -> None:
    parser = casas.add_parser("destaques", help="coleta os atos destacados no Diário Oficial")
    adicionar_argumentos_periodo(parser)
    parser.set_defaults(rodar=_executar)
