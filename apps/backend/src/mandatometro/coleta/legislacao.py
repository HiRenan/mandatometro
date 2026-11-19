"""Coleta decretos, leis e medidas provisórias pelos dados abertos do Senado."""

import argparse
import re
import time
from collections.abc import Callable, Iterator
from datetime import date, datetime, timedelta
from urllib.parse import parse_qs, urlsplit
from zoneinfo import ZoneInfo

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.coleta.cli import adicionar_argumentos_periodo, mostrar_resumo, resolver_periodo
from mandatometro.coleta.http import ClienteHttp, ErroColeta, ErroJsonInvalido
from mandatometro.coleta.persistencia import registrar_fonte, salvar_ato
from mandatometro.coleta.senado import BASE
from mandatometro.coleta.tipos import ResumoAtos
from mandatometro.db import sessao

ORIGEM = "legislacao_senado"
TIPOS = {"DEC": "decreto", "LEI": "lei", "MPV": "medida_provisoria"}
MARGEM_ASSINATURA_DIAS = 10
_URN_NORMA = re.compile(r"urn:lex:br:federal:[a-z.]+:[0-9]{4}(?:-[0-9]{2}-[0-9]{2})?(?:;[^:;\s]+)*")


class _DescartarAto(Exception):
    """Um problema de dado que só impede a gravação deste ato."""


def _objeto(valor: object) -> dict:
    return valor if isinstance(valor, dict) else {}


def _lista(valor: object) -> list[object] | None:
    if isinstance(valor, list):
        return valor
    if isinstance(valor, dict):
        return [valor]
    return [] if valor == "" else None


def _documentos(dados: object, envelope: str) -> list[object]:
    documentos = _objeto(_objeto(dados).get(envelope)).get("documentos")
    if documentos == "":
        return []
    itens = _lista(_objeto(documentos).get("documento"))
    if itens is None:
        raise ErroColeta("Formato inesperado na resposta de legislação.")
    return itens


def _listar(http: ClienteHttp, ano_inicio: int, ano_fim: int) -> Iterator[object]:
    for ano in range(ano_inicio, ano_fim + 1):
        for tipo in TIPOS:
            resposta = http.obter_json("/legislacao/lista", params={"tipo": tipo, "ano": ano})
            yield from _documentos(resposta.dados, "ListaDocumento")


def _detalhe(dados: object, id_externo: str) -> dict:
    try:
        documentos = _documentos(dados, "DetalheDocumento")
    except ErroColeta:
        raise _DescartarAto("detalhe_invalido") from None
    if len(documentos) == 1:
        detalhe = _objeto(documentos[0])
        if str(detalhe.get("id")) == id_externo:
            return detalhe
    raise _DescartarAto("detalhe_invalido")


def _data(valor: object) -> date | None:
    if isinstance(valor, str):
        try:
            return datetime.strptime(valor, "%d/%m/%Y").date()
        except ValueError:
            pass
    return None


def _primeira_publicacao(detalhe: dict) -> date | None:
    publicacoes = _objeto(detalhe.get("publicacoes")).get("publicacao")
    datas = []
    for entrada in _lista(publicacoes) or []:
        publicacao = _objeto(entrada)
        sigla = publicacao.get("siglaFonte")
        if (
            isinstance(sigla, str)
            and sigla.split("-", 1)[0] in {"DOU", "DOUE"}
            and (dia := _data(publicacao.get("data")))
        ):
            datas.append(dia)
    return min(datas, default=None)


def _texto(valor: object) -> str | None:
    return (valor.strip() or None) if isinstance(valor, str) else None


def _url_publica(detalhe: dict) -> str:
    url = _texto(_objeto(detalhe.get("identificacao")).get("urlDocumento"))
    if url:
        try:
            partes = urlsplit(url)
        except ValueError:
            pass
        else:
            if (
                partes.scheme == "https"
                and partes.netloc == "normas.leg.br"
                and partes.path in ("", "/")
            ):
                urns = parse_qs(partes.query, keep_blank_values=True).get("urn", [])
                if len(urns) == 1 and _URN_NORMA.fullmatch(urns[0]):
                    return url
    raise _DescartarAto("campo_obrigatorio")


def _coletar_ato(
    item: dict,
    assinatura: date,
    *,
    resumo: ResumoAtos,
    hoje: date,
    http: ClienteHttp,
    abrir_sessao: Callable[[], Session],
    vistos: set[str],
) -> None:
    id_externo = str(item.get("id", "")).strip()
    titulo = _texto(item.get("normaNome"))
    sigla = _texto(item.get("tipo"))
    if not (id_externo.isascii() and id_externo.isdecimal() and titulo and sigla):
        raise _DescartarAto("campo_obrigatorio")
    tipo = TIPOS.get(sigla.split("-", 1)[0])
    if tipo is None:
        raise _DescartarAto("tipo_fora_do_conjunto")
    if id_externo in vistos:
        return
    vistos.add(id_externo)

    try:
        resposta = http.obter_json(f"/legislacao/{id_externo}")
    except ErroJsonInvalido:
        raise _DescartarAto("detalhe_invalido") from None
    except ErroColeta as erro:
        if erro.status_http in {404, 410}:
            raise _DescartarAto("detalhe_indisponivel") from None
        raise
    detalhe = _detalhe(resposta.dados, id_externo)
    publicacao = _primeira_publicacao(detalhe)
    if publicacao is None:
        raise _DescartarAto("sem_publicacao")
    if publicacao > hoje:
        raise _DescartarAto("data_futura")
    if not resumo.inicio <= publicacao <= resumo.fim:
        return
    url_publica = _url_publica(detalhe)
    ementa = item.get("ementa")
    with abrir_sessao() as s, s.begin():
        fonte = registrar_fonte(s, resposta, url_publica=url_publica)
        salvar_ato(
            s,
            origem=ORIGEM,
            id_externo=id_externo,
            tipo=tipo,
            titulo=titulo,
            ementa=ementa if isinstance(ementa, str) else None,
            data_assinatura=assinatura,
            data_publicacao=publicacao,
            numero=_texto(item.get("numero")),
            fonte=fonte,
        )
    resumo.atos += 1


def _contar_descarte(resumo: ResumoAtos, motivo: str) -> None:
    resumo.descartes[motivo] = resumo.descartes.get(motivo, 0) + 1


def coletar(
    inicio: date,
    fim: date,
    *,
    http: ClienteHttp,
    abrir_sessao: Callable[[], Session] = sessao,
    hoje: date | None = None,
) -> ResumoAtos:
    resumo = ResumoAtos(ORIGEM, inicio, fim)
    comeco = time.monotonic()
    hoje = hoje or datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    margem = min(MARGEM_ASSINATURA_DIAS, (inicio - date.min).days)
    primeira_assinatura = inicio - timedelta(days=margem)
    vistos: set[str] = set()
    try:
        for item in _listar(http, primeira_assinatura.year, fim.year):
            try:
                if not isinstance(item, dict):
                    raise _DescartarAto("campo_obrigatorio")
                assinatura = _data(item.get("dataassinatura"))
                if assinatura is None:
                    raise _DescartarAto("assinatura_invalida")
                if assinatura > hoje:
                    raise _DescartarAto("data_futura")
                if primeira_assinatura <= assinatura <= fim:
                    _coletar_ato(
                        item,
                        assinatura,
                        resumo=resumo,
                        hoje=hoje,
                        http=http,
                        abrir_sessao=abrir_sessao,
                        vistos=vistos,
                    )
            except _DescartarAto as erro:
                _contar_descarte(resumo, str(erro))
    except ErroColeta as erro:
        resumo.completa = False
        resumo.erro = str(erro)
    except SQLAlchemyError:
        resumo.completa = False
        _contar_descarte(resumo, "falha_gravacao")
        resumo.erro = "Falha de gravação no banco; ato desfeito."
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
    with ClienteHttp(BASE) as http:
        resumo = coletar(inicio, fim, http=http)
    mostrar_resumo(resumo)
    return 0 if resumo.completa else 1


def registrar(casas: argparse._SubParsersAction) -> None:
    parser = casas.add_parser("legislacao", help="coleta decretos, leis e medidas provisórias")
    adicionar_argumentos_periodo(parser)
    parser.set_defaults(rodar=_executar)
