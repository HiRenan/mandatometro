"""Coleta sequencial da Câmara, com cadastro completo e transação por votação."""

import argparse
import logging
import re
import time
from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, timedelta
from urllib.parse import parse_qs, urlsplit

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.coleta.cli import (
    adicionar_argumento_videos,
    adicionar_argumentos_periodo,
    mostrar_resumo,
    resolver_periodo,
)
from mandatometro.coleta.http import ClienteHttp, ErroColeta, Resposta
from mandatometro.coleta.persistencia import (
    reconciliar_exercicio,
    registrar_fonte,
    salvar_mandato,
    salvar_parlamentar,
    salvar_proposicao,
    salvar_votacao,
    sincronizar_votos,
)
from mandatometro.coleta.tipos import DadosVoto, ResumoColeta
from mandatometro.coleta.videos import (
    VotacaoSemVideo,
    VotacoesPorSessao,
    coletar_videos,
    preencher_videos,
)
from mandatometro.db import sessao as sessao_do_banco
from mandatometro.db.modelos import (
    Mandato,
    Parlamentar,
    Proposicao,
    normalizar_resultado,
    normalizar_voto,
)

BASE = "https://dadosabertos.camara.leg.br/api/v2"
PUBLICA = "https://www.camara.leg.br"
logger = logging.getLogger(__name__)
FALHAS = (ErroColeta, ValueError, KeyError, TypeError, SQLAlchemyError)


class _VotacaoIndisponivel(ErroColeta):
    """404/410 no detalhe ou nos votos de um id presente na lista oficial."""


def _objeto(valor) -> dict:
    if not isinstance(valor, dict):
        raise ValueError("Objeto ausente ou inválido na fonte.")
    return valor


def _lista(valor) -> list:
    if not isinstance(valor, list):
        raise ValueError("Lista ausente ou inválida na fonte.")
    return valor


def _inteiro(valor, minimo=1) -> int:
    if isinstance(valor, bool) or not isinstance(valor, (str, int)):
        raise ValueError("Número inválido na fonte.")
    numero = int(valor)
    if numero < minimo:
        raise ValueError("Número fora do intervalo esperado na fonte.")
    return numero


def _texto(valor) -> str:
    if not isinstance(valor, str) or not valor.strip():
        raise ValueError("Texto obrigatório ausente na fonte.")
    return valor


def _opcional(valor) -> str | None:
    if valor is not None and not isinstance(valor, str):
        raise ValueError("Texto inválido na fonte.")
    return valor or None


def _video_evento(http: ClienteHttp, id_evento: int) -> tuple[Resposta, object]:
    resposta = http.obter_json(f"/eventos/{id_evento}")
    try:
        dados = _objeto(_objeto(resposta.dados).get("dados"))
        if _inteiro(dados.get("id")) == id_evento:
            return resposta, dados.get("urlRegistro")
    except ValueError:
        pass
    raise ErroColeta("Detalhe do evento inválido ou divergente.")


def _eventos_historicos(candidatas: list[VotacaoSemVideo]) -> VotacoesPorSessao:
    eventos: VotacoesPorSessao = defaultdict(list)
    for votacao_id, _, url_publica in candidatas:
        evento = re.fullmatch(
            rf"{re.escape(PUBLICA)}/evento-legislativo/([1-9][0-9]*)", url_publica or ""
        )
        eventos[int(evento[1]) if evento else None].append(votacao_id)
    return eventos


def _metadados(resposta: Resposta) -> Resposta:
    # Depois da projeção dos campos permitidos não retemos o payload de cadastro.
    return Resposta(resposta.url, resposta.coletado_em, None)


def _numero_pagina(url: str) -> int:
    return _inteiro(parse_qs(urlsplit(url).query).get("pagina", ["1"])[0])


def _paginas(http: ClienteHttp, caminho: str, params=None) -> list[Resposta]:
    paginas, visitadas = [], set()
    ultima_anunciada = 1
    while caminho:
        resposta = http.obter_json(caminho, params=params)
        params = None
        if resposta.url in visitadas:
            raise ErroColeta("Ciclo na paginação da Câmara.")
        visitadas.add(resposta.url)
        envelope = _objeto(resposta.dados)
        _lista(envelope["dados"])
        links = [_objeto(x) for x in _lista(envelope["links"])]
        proximas = [_texto(_objeto(x)["href"]) for x in links if x.get("rel") == "next"]
        ultimas = [_texto(_objeto(x)["href"]) for x in links if x.get("rel") == "last"]
        atual = _numero_pagina(resposta.url)
        if (
            atual != len(paginas) + 1
            or len(proximas) > 1
            or any(_numero_pagina(x) != atual + 1 for x in proximas)
        ):
            raise ErroColeta("Paginação inconsistente na Câmara.")
        # Omitir last numa página seguinte não invalida o limite já informado.
        ultima_anunciada = max([ultima_anunciada, *(_numero_pagina(x) for x in ultimas)])
        if not proximas and atual < ultima_anunciada:
            raise ErroColeta("A lista da Câmara está incompleta.")
        paginas.append(resposta)
        caminho = proximas[0] if proximas else None
    return paginas


@dataclass
class _Deputado:
    id: int
    nome: str
    uf: str
    legislatura: int
    fonte: Resposta
    condicao: str | None = None
    detalhe: Resposta | None = None


def _deputado(item: dict, resposta: Resposta) -> _Deputado:
    uf = _texto(item["siglaUf"])
    if len(uf) != 2:
        raise ValueError("UF inválida na fonte.")
    return _Deputado(
        _inteiro(item["id"]),
        _texto(item["nome"]),
        uf,
        _inteiro(item["idLegislatura"]),
        _metadados(resposta),
    )


@dataclass
class _Voto:
    deputado: _Deputado
    valor: str
    valor_bruto: str | None
    partido: str | None


class _Coleta:
    def __init__(self, inicio, fim, http, criar_sessao):
        self.http = http
        self.criar_sessao = criar_sessao
        self.resumo = ResumoColeta("camara", inicio, fim)
        self.atuais: set[tuple[int, int]] = set()
        self.proposicoes: dict[int, Resposta] = {}
        self.proposicoes_gravadas: set[int] = set()

    def deputados(self) -> None:
        paginas = _paginas(
            self.http,
            "/deputados",
            {
                "itens": 100,
                "ordem": "ASC",
                "ordenarPor": "id",
            },
        )
        if any(not pagina.dados["dados"] for pagina in paginas):
            raise ErroColeta("Página vazia na lista atual de deputados; cadastro preservado.")
        deputados = [
            _deputado(_objeto(item), pagina) for pagina in paginas for item in pagina.dados["dados"]
        ]
        if not deputados or len({d.id for d in deputados}) != len(deputados):
            raise ErroColeta("Lista atual de deputados vazia ou com registros repetidos.")
        consecutivas = 0
        for deputado in deputados:
            try:
                resposta = self.http.obter_json(f"/deputados/{deputado.id}")
                detalhe = _objeto(_objeto(resposta.dados)["dados"])
                status = _objeto(detalhe["ultimoStatus"])
                if (
                    _inteiro(detalhe["id"]) != deputado.id
                    or _inteiro(status["idLegislatura"]) != deputado.legislatura
                    or status["siglaUf"] != deputado.uf
                    or status["situacao"] != "Exercício"
                ):
                    raise ValueError("Detalhe diverge da lista atual.")
                deputado.condicao = _opcional(status["condicaoEleitoral"])
                deputado.detalhe = _metadados(resposta)
            except FALHAS:
                self.resumo.falhas_parlamentares += 1
                self.resumo.completa = False
                consecutivas += 1
                # Sem id, nome, código ou corpo do cadastro: a contagem basta para o diagnóstico.
                logger.warning(
                    "Falha no detalhe de parlamentar; condição anterior será preservada."
                )
                if consecutivas == 3:
                    raise ErroColeta(
                        "Três falhas consecutivas nos detalhes dos parlamentares."
                    ) from None
            else:
                consecutivas = 0

        fontes_criadas = len(paginas)
        with self.criar_sessao() as sessao, sessao.begin():
            fontes = {p.url: registrar_fonte(sessao, p) for p in paginas}
            for deputado in deputados:
                fonte = fontes[deputado.fonte.url]
                if deputado.detalhe:
                    fonte = registrar_fonte(sessao, deputado.detalhe)
                    fontes_criadas += 1
                pessoa = salvar_parlamentar(
                    sessao,
                    casa="camara",
                    id_externo=deputado.id,
                    nome=deputado.nome,
                    fonte=fonte,
                )
                condicao = deputado.condicao
                if deputado.detalhe is None:
                    condicao = sessao.scalar(
                        select(Mandato.condicao).where(
                            Mandato.parlamentar_id == pessoa.id,
                            Mandato.legislatura == deputado.legislatura,
                        )
                    )
                salvar_mandato(
                    sessao,
                    parlamentar_id=pessoa.id,
                    legislatura=deputado.legislatura,
                    uf=deputado.uf,
                    condicao=condicao,
                    em_exercicio=True,
                    fonte=fonte,
                )
                self.atuais.add((pessoa.id, deputado.legislatura))
            reconciliar_exercicio(
                sessao, casa="camara", atuais=self.atuais, fonte=fontes[paginas[0].url]
            )
        self.resumo.parlamentares = self.resumo.mandatos = len(deputados)
        self.resumo.fontes += fontes_criadas

    def listar_votacoes(self) -> list[str]:
        inicio, fim = self.resumo.inicio, self.resumo.fim
        ids: dict[str, None] = {}
        paginas = []
        while inicio <= fim:
            fim_do_ano = date(inicio.year, 12, 31)
            limite = min(fim, fim_do_ano)
            limite_consulta = limite
            params = {
                "idOrgao": 180,
                "dataInicio": inicio.isoformat(),
                "itens": 100,
                "ordem": "ASC",
                "ordenarPor": "dataHoraRegistro",
            }
            # dataFim corta à meia-noite: pedir o dia seguinte inclui o último dia inteiro.
            # Sem dataFim a API vai até o fim do mesmo ano, incluindo 31/12.
            if limite < fim_do_ano:
                limite_consulta = limite + timedelta(days=1)
                params["dataFim"] = limite_consulta.isoformat()
            trecho = _paginas(self.http, "/votacoes", params)
            for pagina in trecho:
                for item in pagina.dados["dados"]:
                    item = _objeto(item)
                    identificador = _texto(item["id"])
                    dia = date.fromisoformat(item["data"])
                    if (
                        not re.fullmatch(r"\d+-\d+", identificador)
                        or item["siglaOrgao"] != "PLEN"
                        or not inicio <= dia <= limite_consulta
                    ):
                        raise ErroColeta("Votação fora do período ou do plenário consultado.")
                    if dia <= limite:
                        ids[identificador] = None
            paginas.extend(trecho)
            if limite == fim:
                break
            inicio = limite + timedelta(days=1)
        with self.criar_sessao() as sessao, sessao.begin():
            for pagina in paginas:
                registrar_fonte(sessao, pagina)
        self.resumo.fontes += len(paginas)
        return list(ids)

    def ler_votacao(self, identificador):
        try:
            resposta = self.http.obter_json(f"/votacoes/{identificador}")
        except ErroColeta as erro:
            if erro.status_http in (404, 410):
                raise _VotacaoIndisponivel(
                    "Votação indisponível na fonte.", status_http=erro.status_http
                ) from None
            raise
        detalhe = _objeto(_objeto(resposta.dados)["dados"])
        data = date.fromisoformat(detalhe["data"])
        if (
            detalhe["id"] != identificador
            or detalhe["idOrgao"] != 180
            or not self.resumo.inicio <= data <= self.resumo.fim
        ):
            raise ErroColeta("Detalhe da votação diverge da consulta.")
        descricao = _texto(detalhe["descricao"])
        resultado, bruto = normalizar_resultado(detalhe["aprovacao"])
        afetadas = {_inteiro(_objeto(p)["id"]) for p in _lista(detalhe["proposicoesAfetadas"])}
        evento = detalhe.get("idEvento")
        id_evento = _inteiro(evento) if evento else None
        try:
            paginas = _paginas(self.http, f"/votacoes/{identificador}/votos")
        except ErroColeta as erro:
            if erro.status_http in (404, 410):
                raise _VotacaoIndisponivel(
                    "Votos indisponíveis na fonte.", status_http=erro.status_http
                ) from None
            raise
        votos = []
        for pagina in paginas:
            for item in pagina.dados["dados"]:
                item = _objeto(item)
                deputado = _objeto(item["deputado_"])
                valor, codigo = normalizar_voto(_texto(item["tipoVoto"]))
                votos.append(
                    _Voto(
                        _deputado(deputado, pagina),
                        valor,
                        codigo,
                        _opcional(deputado["siglaPartido"]),
                    )
                )
        if len({v.deputado.id for v in votos}) != len(votos):
            raise ErroColeta("Votos repetidos na lista da Câmara.")
        for id_proposicao in sorted(afetadas):
            if id_proposicao not in self.proposicoes:
                prop = self.http.obter_json(f"/proposicoes/{id_proposicao}")
                item = _objeto(_objeto(prop.dados)["dados"])
                if _inteiro(item["id"]) != id_proposicao:
                    raise ErroColeta("Detalhe da proposição diverge da consulta.")
                # Projeção explícita: nem metadados pessoais nem campos que o modelo não guarda.
                dados = {
                    "id_externo": id_proposicao,
                    "sigla": _texto(item["siglaTipo"]),
                    "numero": _inteiro(item["numero"], 0),
                    "ano": _inteiro(item["ano"], 0),
                    "ementa": _opcional(item["ementa"]),
                    "url_inteiro_teor": _opcional(item["urlInteiroTeor"]),
                }
                self.proposicoes[id_proposicao] = Resposta(prop.url, prop.coletado_em, dados)
        return resposta, data, descricao, resultado, bruto, afetadas, id_evento, paginas, votos

    def gravar_votacao(self, identificador) -> tuple[int, int | None]:
        resposta, data, descricao, resultado, bruto, afetadas, id_evento, paginas, votos = (
            self.ler_votacao(identificador)
        )
        publica = f"{PUBLICA}/evento-legislativo/{id_evento}" if id_evento is not None else None
        fontes_criadas, pessoas_criadas, mandatos_criados = 0, 0, 0
        novas_proposicoes = afetadas - self.proposicoes_gravadas
        with self.criar_sessao() as sessao, sessao.begin():
            fonte = registrar_fonte(sessao, resposta, url_publica=publica, trecho=descricao)
            fontes_criadas += 1
            proposicoes = []
            for id_proposicao in sorted(afetadas):
                if id_proposicao in novas_proposicoes:
                    prop = self.proposicoes[id_proposicao]
                    fonte_prop = registrar_fonte(
                        sessao,
                        prop,
                        url_publica=f"{PUBLICA}/proposicoesWeb/fichadetramitacao?idProposicao={id_proposicao}",
                        trecho=prop.dados["ementa"],
                    )
                    fontes_criadas += 1
                    proposicoes.append(
                        salvar_proposicao(
                            sessao,
                            casa="camara",
                            apelido=None,
                            fonte=fonte_prop,
                            **prop.dados,
                        )
                    )
                else:
                    proposicoes.append(
                        sessao.scalars(
                            select(Proposicao).where(
                                Proposicao.casa == "camara",
                                Proposicao.id_externo == id_proposicao,
                            )
                        ).one()
                    )
            votacao = salvar_votacao(
                sessao,
                casa="camara",
                id_externo=identificador,
                data=data,
                descricao=descricao,
                resultado=resultado,
                resultado_bruto=bruto,
                fonte=fonte,
                proposicoes=proposicoes,
            )
            fontes = {p.url: registrar_fonte(sessao, p, url_publica=publica) for p in paginas}
            fontes_criadas += len(paginas)
            ids = {v.deputado.id for v in votos}
            pessoas = {
                p.id_externo: p
                for p in sessao.scalars(
                    select(Parlamentar).where(
                        Parlamentar.casa == "camara",
                        Parlamentar.id_externo.in_(ids),
                    )
                )
            }
            mandatos = {
                (m.parlamentar_id, m.legislatura)
                for m in sessao.scalars(
                    select(Mandato).where(
                        Mandato.parlamentar_id.in_([p.id for p in pessoas.values()]),
                    )
                )
            }
            dados_votos = []
            for voto in votos:
                deputado = voto.deputado
                fonte_voto = fontes[deputado.fonte.url]
                pessoa = pessoas.get(deputado.id)
                if pessoa is None:
                    pessoa = salvar_parlamentar(
                        sessao,
                        casa="camara",
                        id_externo=deputado.id,
                        nome=deputado.nome,
                        fonte=fonte_voto,
                    )
                    pessoas[deputado.id] = pessoa
                    pessoas_criadas += 1
                chave = pessoa.id, deputado.legislatura
                if chave not in mandatos:
                    salvar_mandato(
                        sessao,
                        parlamentar_id=pessoa.id,
                        legislatura=deputado.legislatura,
                        uf=deputado.uf,
                        condicao=None,
                        em_exercicio=chave in self.atuais,
                        fonte=fonte_voto,
                    )
                    mandatos.add(chave)
                    mandatos_criados += 1
                dados_votos.append(
                    DadosVoto(
                        pessoa.id,
                        voto.valor,
                        voto.valor_bruto,
                        voto.partido,
                        deputado.uf,
                        fonte_voto.id,
                    )
                )
            sincronizar_votos(sessao, votacao, dados_votos)
            votacao_id = votacao.id
        # Só contam observações confirmadas; o cache de ids gravados também avança após o commit.
        self.proposicoes_gravadas.update(afetadas)
        self.resumo.proposicoes += len(novas_proposicoes)
        self.resumo.votacoes += 1
        self.resumo.votos += len(votos)
        self.resumo.fontes += fontes_criadas
        self.resumo.parlamentares += pessoas_criadas
        self.resumo.mandatos += mandatos_criados
        self.resumo.sem_proposicao += not afetadas
        desconhecidos = sum(v.valor == "outro" for v in votos)
        self.resumo.codigos_desconhecidos += desconhecidos
        if desconhecidos:
            logger.warning("%s códigos desconhecidos na votação %s.", desconhecidos, identificador)
        if not afetadas:
            logger.warning("Votação %s sem proposição afetada na fonte.", identificador)
        if publica is None:
            logger.warning("Votação %s sem evento para a página pública.", identificador)
        return votacao_id, id_evento


def coletar(
    inicio: date,
    fim: date,
    *,
    http: ClienteHttp,
    criar_sessao: Callable[[], Session],
) -> ResumoColeta:
    """Reconsulta o período; falha isolada preserva a unidade anterior e não bloqueia as outras."""
    if inicio > fim:
        raise ValueError("O início não pode ser posterior ao fim.")
    coleta = _Coleta(inicio, fim, http, criar_sessao)
    resumo = coleta.resumo
    comeco = time.monotonic()
    sessoes: VotacoesPorSessao = defaultdict(list)
    try:
        coleta.deputados()
        ids = coleta.listar_votacoes()
        consecutivas = 0
        for identificador in ids:
            try:
                votacao_id, id_evento = coleta.gravar_votacao(identificador)
            except _VotacaoIndisponivel as erro:
                resumo.indisponiveis_na_fonte.append(identificador)
                logger.warning(
                    "Votação %s indisponível na fonte (HTTP %s).", identificador, erro.status_http
                )
                consecutivas = 0
            except FALHAS:
                resumo.completa = False
                resumo.falhas_votacoes.append(identificador)
                logger.error("Falha na votação %s; versão anterior preservada.", identificador)
                consecutivas += 1
                if consecutivas == 3:
                    raise ErroColeta("Três falhas consecutivas nas votações.") from None
            else:
                sessoes[id_evento].append(votacao_id)
                consecutivas = 0
    except FALHAS as erro:
        resumo.completa = False
        resumo.erro = (
            str(erro)
            if isinstance(erro, ErroColeta)
            else "Falha na estrutura da fonte ou na gravação."
        )
        logger.error("Coleta interrompida: %s", resumo.erro)
    coletar_videos(resumo, sessoes, http=http, abrir_sessao=criar_sessao, consultar=_video_evento)
    resumo.chamadas = http.chamadas
    resumo.tentativas_extras = http.tentativas_extras
    resumo.duracao_s = round(time.monotonic() - comeco, 2)
    return resumo


def registrar_comando(casas) -> None:
    parser = casas.add_parser("camara", help="coleta plenário e deputados em exercício da Câmara")
    adicionar_argumentos_periodo(parser)
    adicionar_argumento_videos(parser)

    def rodar(args: argparse.Namespace) -> int:
        try:
            inicio, fim = resolver_periodo(args.inicio, args.fim)
        except ValueError as erro:
            parser.error(str(erro))
        with ClienteHttp(BASE) as http:
            if args.somente_videos:
                resumo = preencher_videos(
                    inicio,
                    fim,
                    casa="camara",
                    http=http,
                    abrir_sessao=sessao_do_banco,
                    localizar=_eventos_historicos,
                    consultar=_video_evento,
                )
            else:
                resumo = coletar(inicio, fim, http=http, criar_sessao=sessao_do_banco)
        mostrar_resumo(resumo)
        return 0 if resumo.completa else 1

    parser.set_defaults(rodar=rodar)
