"""Coleta sequencial do Senado, com uma transação por votação completa."""

import argparse
import logging
import time
from collections import defaultdict
from collections.abc import Callable, Iterator
from datetime import date, timedelta

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.coleta.cli import (
    adicionar_argumentos_de_preenchimento,
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
from mandatometro.coleta.temas import coletar_temas, preencher_temas
from mandatometro.coleta.tipos import DadosVoto, ResumoColeta
from mandatometro.coleta.videos import (
    URL_RECUSADA,
    VotacaoSemVideo,
    VotacoesPorSessao,
    coletar_videos,
    preencher_videos,
)
from mandatometro.db import sessao
from mandatometro.db.modelos import Fonte, normalizar_resultado, normalizar_voto

logger = logging.getLogger(__name__)
BASE = "https://legis.senado.leg.br/dadosabertos"
PAGINA_MATERIA = "https://www25.senado.leg.br/web/atividade/materias/-/materia"


class _RecursoIndisponivel(Exception):
    """404/410 de recurso apontado pela fonte; o chamador registra a identificação segura."""


def _objeto(dado: object) -> dict:
    if not isinstance(dado, dict):
        raise ErroColeta("Objeto obrigatório ausente ou inválido na fonte.")
    return dado


def _lista(dado: object, *, objeto_unico: bool = False) -> list[dict]:
    if objeto_unico and isinstance(dado, dict):
        dado = [dado]
    if not isinstance(dado, list):
        raise ErroColeta("Lista obrigatória ausente ou inválida na fonte.")
    return [_objeto(item) for item in dado]


def _inteiro(dado: object) -> int:
    if isinstance(dado, bool) or not isinstance(dado, (str, int)):
        raise ErroColeta("Identificador ou número inválido na fonte.")
    try:
        numero = int(dado)
    except ValueError:
        raise ErroColeta("Identificador ou número inválido na fonte.") from None
    if numero <= 0:
        raise ErroColeta("Identificador ou número inválido na fonte.")
    return numero


def _codigo_sessao_plenaria(item: dict) -> int | None:
    informe = item.get("informeLegislativo")
    if not isinstance(informe, dict) or informe.get("siglaColegiado") != "PLEN":
        return None
    try:
        return _inteiro(item.get("codigoSessao"))
    except ErroColeta:
        return None


def _video_encontro(http: ClienteHttp, codigo: int, prazo: float | None) -> tuple[Resposta, object]:
    resposta = http.obter_json(f"/plenario/encontro/{codigo}", prazo=prazo, prazo_integral=True)
    plenario = _objeto(_objeto(resposta.dados).get("ServicoPlenario"))
    encontros = _lista(_objeto(plenario.get("encontros")).get("encontro"), objeto_unico=True)
    if len(encontros) == 1:
        encontro = encontros[0]
        if _inteiro(encontro.get("codigo")) == codigo:
            if encontro.get("siglaCasa") != "SF":
                return resposta, URL_RECUSADA
            return resposta, encontro.get("linkVideo")
    raise ErroColeta("Detalhe da sessão inválido ou divergente.")


def _votacoes_por_periodo(
    http: ClienteHttp, inicio: date, fim: date
) -> Iterator[tuple[date, date, Resposta]]:
    primeiro = inicio
    while primeiro <= fim:
        ultimo = primeiro + timedelta(days=min(364, (fim - primeiro).days))
        yield (
            primeiro,
            ultimo,
            http.obter_json(
                "/votacao",
                params={"dataInicio": primeiro.isoformat(), "dataFim": ultimo.isoformat()},
            ),
        )
        if ultimo == fim:
            break
        primeiro = ultimo + timedelta(days=1)


def _sessoes_historicas(
    candidatas: list[VotacaoSemVideo], http: ClienteHttp, inicio: date, fim: date
) -> VotacoesPorSessao:
    pendentes = {externo: interno for interno, externo, _ in candidatas}
    codigos: dict[str, int | None] = {}
    for _, _, resposta in _votacoes_por_periodo(http, inicio, fim):
        for item in _lista(resposta.dados):
            if item.get("casaSessao") != "SF":
                continue
            try:
                externo = str(_inteiro(item.get("codigoSessaoVotacao")))
            except ErroColeta:
                continue
            if externo in pendentes:
                codigo = _codigo_sessao_plenaria(item)
                if codigos.setdefault(externo, codigo) != codigo:
                    codigos[externo] = None
    sessoes: VotacoesPorSessao = defaultdict(list)
    for externo, interno in pendentes.items():
        sessoes[codigos.get(externo)].append(interno)
    return sessoes


def _texto(dado: object, *, opcional: bool = False) -> str | None:
    if opcional and (dado is None or dado == ""):
        return None
    if not isinstance(dado, str) or not dado.strip():
        raise ErroColeta("Texto obrigatório ausente ou inválido na fonte.")
    return dado


def _uf(dado: object, *, opcional: bool = False) -> str | None:
    uf = _texto(dado, opcional=opcional)
    if uf is not None and (len(uf) != 2 or not uf.isalpha() or uf != uf.upper()):
        raise ErroColeta("UF inválida na fonte.")
    return uf


def _data(dado: object) -> date:
    try:
        texto = _texto(dado)
        dia = date.fromisoformat(texto)
        if dia.isoformat() == texto:
            return dia
    except ValueError:
        pass
    raise ErroColeta("Data inválida na fonte.")


def _mandato(dado: dict) -> dict:
    primeira = _objeto(dado.get("PrimeiraLegislaturaDoMandato"))
    return {
        "legislatura": _inteiro(primeira.get("NumeroLegislatura")),
        "uf": _uf(dado.get("UfParlamentar")),
        "condicao": _texto(dado.get("DescricaoParticipacao"), opcional=True),
    }


def _atuais(resposta: Resposta) -> dict[int, dict]:
    raiz = _objeto(_objeto(resposta.dados).get("ListaParlamentarEmExercicio"))
    itens = _lista(_objeto(raiz.get("Parlamentares")).get("Parlamentar"), objeto_unico=True)
    if not itens:
        raise ErroColeta("Lista atual vazia; exercício dos mandatos foi preservado.")
    atuais = {}
    for item in itens:
        identidade = _objeto(item.get("IdentificacaoParlamentar"))
        codigo = _inteiro(identidade.get("CodigoParlamentar"))
        if codigo in atuais:
            raise ErroColeta("Lista atual contém identificadores repetidos.")
        atuais[codigo] = {
            "nome": _texto(identidade.get("NomeParlamentar")),
            "mandato": _mandato(_objeto(item.get("Mandato"))),
        }
    return atuais


def _historico(resposta: Resposta, codigo: int, dia: date) -> dict | None:
    raiz = _objeto(_objeto(resposta.dados).get("MandatoParlamentar"))
    parlamentar = _objeto(raiz.get("Parlamentar"))
    if _inteiro(parlamentar.get("Codigo")) != codigo:
        raise ErroColeta("O histórico não corresponde ao parlamentar consultado.")
    mandatos = _lista(_objeto(parlamentar.get("Mandatos")).get("Mandato"), objeto_unico=True)
    candidatos = []
    for mandato in mandatos:
        primeira = _objeto(mandato.get("PrimeiraLegislaturaDoMandato"))
        segunda = _objeto(mandato.get("SegundaLegislaturaDoMandato"))
        if _data(primeira.get("DataInicio")) <= dia <= _data(segunda.get("DataFim")):
            candidatos.append(mandato)
    if len(candidatos) > 1:
        # Só as datas ajudam a desempatar. Motivos de afastamento nunca são extraídos.
        em_exercicio = []
        for mandato in candidatos:
            periodos = _lista(
                _objeto(mandato.get("Exercicios")).get("Exercicio"), objeto_unico=True
            )
            if any(
                _data(p.get("DataInicio")) <= dia
                and (not p.get("DataFim") or dia <= _data(p["DataFim"]))
                for p in periodos
            ):
                em_exercicio.append(mandato)
        candidatos = em_exercicio
    return _mandato(candidatos[0]) if len(candidatos) == 1 else None


def _proposicao(resposta: Resposta, codigo: int, codigo_materia: int) -> dict:
    p = _objeto(resposta.dados)
    if _inteiro(p.get("id")) != codigo or _inteiro(p.get("codigoMateria")) != codigo_materia:
        raise ErroColeta("O processo não corresponde à matéria votada.")
    return {
        "casa": "senado",
        "id_externo": codigo,
        "sigla": _texto(p.get("sigla")),
        "numero": _inteiro(p.get("numero")),
        "ano": _inteiro(p.get("ano")),
        "ementa": _texto(_objeto(p.get("conteudo") or {}).get("ementa"), opcional=True),
        "apelido": _texto(p.get("apelido"), opcional=True),
        "url_inteiro_teor": _texto(_objeto(p.get("documento") or {}).get("url"), opcional=True),
    }


def _votacao(item: dict, inicio: date, fim: date) -> dict:
    dia = _data(item.get("dataSessao"))
    if not inicio <= dia <= fim:
        raise ErroColeta("Votação fora do período consultado.")
    secreta = item.get("votacaoSecreta")
    if secreta not in ("N", "S"):
        raise ErroColeta("Modalidade da votação ausente ou inválida.")
    votos = []
    ids = set()
    desconhecidos = 0
    for voto in [] if secreta == "S" else _lista(item.get("votos")):
        codigo = _inteiro(voto.get("codigoParlamentar"))
        if codigo in ids:
            raise ErroColeta("Votação contém mais de um voto para o mesmo parlamentar.")
        ids.add(codigo)
        valor, bruto = normalizar_voto(_texto(voto.get("siglaVotoParlamentar")))
        desconhecidos += valor == "outro"
        votos.append(
            {
                "codigo": codigo,
                "nome": _texto(voto.get("nomeParlamentar")),
                "partido": _texto(voto.get("siglaPartidoParlamentar"), opcional=True),
                "uf": _uf(voto.get("siglaUFParlamentar"), opcional=True),
                "valor": valor,
                "valor_bruto": bruto,
            }
        )
    resultado_bruto = item.get("resultadoVotacao")
    if resultado_bruto is not None and not isinstance(resultado_bruto, (str, int)):
        raise ErroColeta("Resultado inválido na fonte.")
    resultado, bruto = normalizar_resultado(resultado_bruto)
    return {
        "data": dia,
        "descricao": _texto(item.get("descricaoVotacao")),
        "resultado": resultado,
        "resultado_bruto": bruto,
        "id_processo": _inteiro(item.get("idProcesso")),
        "codigo_materia": _inteiro(item.get("codigoMateria")),
        "votos": votos,
        "desconhecidos": desconhecidos,
    }


def _erro_seguro(erro: Exception) -> str:
    if isinstance(erro, ErroColeta):
        return str(erro)
    # O texto de SQLAlchemy inclui parâmetros e a linha rejeitada pelo PostgreSQL.
    return "Falha de gravação no banco; unidade desfeita."


class _Coleta:
    def __init__(
        self, resumo: ResumoColeta, http: ClienteHttp, abrir_sessao: Callable[[], Session]
    ):
        self.resumo = resumo
        self.http = http
        self.abrir_sessao = abrir_sessao
        self.atuais: set[int] = set()
        self.parlamentares: dict[int, int] = {}
        self.mandatos: set[tuple[int, int]] = set()
        self.proposicoes: set[int] = set()
        self.fontes: dict[tuple[str, int | str], int] = {}
        self.processos: dict[int, Resposta] = {}
        self.historicos: dict[int, Resposta | None] = {}
        self.falhas_parlamentares: set[int] = set()
        self.indisponiveis: set[str] = set()

    def obter_recurso(self, caminho: str) -> Resposta:
        if caminho in self.indisponiveis:
            raise _RecursoIndisponivel
        try:
            return self.http.obter_json(caminho)
        except ErroColeta as erro:
            if erro.status_http not in (404, 410):
                raise
            self.indisponiveis.add(caminho)
            raise _RecursoIndisponivel from None

    def cadastrar_atuais(self) -> None:
        resposta = self.http.obter_json("/senador/lista/atual.json")
        atuais = _atuais(resposta)
        parlamentares = {}
        mandatos = set()
        with self.abrir_sessao() as s, s.begin():
            fonte = registrar_fonte(s, resposta)
            fonte_id = fonte.id
            for codigo, dados in atuais.items():
                p = salvar_parlamentar(
                    s, casa="senado", id_externo=codigo, nome=dados["nome"], fonte=fonte
                )
                m = salvar_mandato(
                    s, parlamentar_id=p.id, **dados["mandato"], em_exercicio=True, fonte=fonte
                )
                parlamentares[codigo] = p.id
                mandatos.add((p.id, m.legislatura))
            reconciliar_exercicio(s, casa="senado", atuais=mandatos, fonte=fonte)
        self.atuais = set(atuais)
        self.parlamentares = parlamentares
        self.mandatos = mandatos
        self.fontes[("lista", 0)] = fonte_id
        self.atualizar_contagens()

    def atualizar_contagens(self) -> None:
        self.resumo.parlamentares = len(self.parlamentares)
        self.resumo.mandatos = len(self.mandatos)
        self.resumo.proposicoes = len(self.proposicoes)
        self.resumo.fontes = len(self.fontes)
        self.resumo.falhas_parlamentares = len(self.falhas_parlamentares)
        if self.falhas_parlamentares:
            self.resumo.completa = False

    def preparar_historicos(self, votos: list[dict], dia: date) -> dict[int, dict | None]:
        mandatos = {}
        for voto in votos:
            codigo = voto["codigo"]
            if codigo in self.atuais:
                continue
            if codigo not in self.historicos:
                try:
                    self.historicos[codigo] = self.obter_recurso(f"/senador/{codigo}/mandatos.json")
                except (ErroColeta, _RecursoIndisponivel):
                    self.historicos[codigo] = None
            resposta = self.historicos[codigo]
            try:
                mandatos[codigo] = _historico(resposta, codigo, dia) if resposta else None
            except ErroColeta:
                mandatos[codigo] = None
        return mandatos

    def gravar(
        self, id_votacao: str, item: dict, resposta: Resposta, inicio: date, fim: date
    ) -> int:
        dados = _votacao(item, inicio, fim)
        processo = dados["id_processo"]
        if processo not in self.processos:
            caminho = f"/processo/{processo}"
            try:
                self.processos[processo] = self.obter_recurso(caminho)
            except _RecursoIndisponivel:
                if caminho not in self.resumo.indisponiveis_na_fonte:
                    self.resumo.indisponiveis_na_fonte.append(caminho)
                raise
        resposta_processo = self.processos[processo]
        proposicao = _proposicao(resposta_processo, processo, dados["codigo_materia"])
        historicos = self.preparar_historicos(dados["votos"], dados["data"])
        pagina = f"{PAGINA_MATERIA}/{dados['codigo_materia']}"
        pagina_votacao = f"{pagina}/votacoes#votacao_{id_votacao}"
        # Caches de ids só avançam depois do commit: rollback não deixa fonte/parlamentar fantasma.
        fontes = dict(self.fontes)
        parlamentares = dict(self.parlamentares)
        mandatos = set(self.mandatos)
        falhas = set()
        indisponiveis = []
        with self.abrir_sessao() as s, s.begin():

            def fonte(chave, resposta, **campos):
                if chave not in fontes:
                    nova = registrar_fonte(s, resposta, **campos)
                    fontes[chave] = nova.id
                    return nova
                return s.get(Fonte, fontes[chave])

            fonte_p = fonte(
                ("processo", processo),
                resposta_processo,
                url_publica=pagina,
                trecho=proposicao["ementa"],
            )
            p = salvar_proposicao(s, **proposicao, fonte=fonte_p)
            fonte_v = fonte(
                ("votacao", id_votacao),
                resposta,
                url_publica=pagina_votacao,
                trecho=dados["descricao"],
            )
            fonte_votos = fonte(("votos", id_votacao), resposta, url_publica=pagina_votacao)
            votacao = salvar_votacao(
                s,
                casa="senado",
                id_externo=id_votacao,
                data=dados["data"],
                descricao=dados["descricao"],
                resultado=dados["resultado"],
                resultado_bruto=dados["resultado_bruto"],
                fonte=fonte_v,
                proposicoes=[p],
            )
            votos = []
            for voto in dados["votos"]:
                codigo = voto["codigo"]
                if codigo not in parlamentares:
                    parlamentar = salvar_parlamentar(
                        s, casa="senado", id_externo=codigo, nome=voto["nome"], fonte=fonte_votos
                    )
                    parlamentares[codigo] = parlamentar.id
                interno = parlamentares[codigo]
                if codigo in historicos:
                    mandato = historicos[codigo]
                    if mandato is None:
                        if f"/senador/{codigo}/mandatos.json" in self.indisponiveis:
                            indisponiveis.append(f"mandatos:parlamentar_id={interno}")
                        else:
                            falhas.add(codigo)
                    else:
                        fonte_h = fonte(("historico", codigo), self.historicos[codigo])
                        salvar_mandato(
                            s, parlamentar_id=interno, **mandato, em_exercicio=False, fonte=fonte_h
                        )
                        mandatos.add((interno, mandato["legislatura"]))
                votos.append(
                    DadosVoto(
                        parlamentar_id=interno,
                        valor=voto["valor"],
                        valor_bruto=voto["valor_bruto"],
                        partido=voto["partido"],
                        uf=voto["uf"],
                        fonte_id=fonte_votos.id,
                    )
                )
            sincronizar_votos(s, votacao, votos)
            votacao_id = votacao.id
        # Só expõe ids internos confirmados, nunca os de uma transação desfeita.
        for recurso in indisponiveis:
            if recurso not in self.resumo.indisponiveis_na_fonte:
                self.resumo.indisponiveis_na_fonte.append(recurso)
        self.fontes = fontes
        self.parlamentares = parlamentares
        self.mandatos = mandatos
        self.proposicoes.add(processo)
        self.falhas_parlamentares.update(falhas)
        self.resumo.votacoes += 1
        self.resumo.votos += len(votos)
        self.resumo.codigos_desconhecidos += dados["desconhecidos"]
        self.atualizar_contagens()
        if dados["desconhecidos"]:
            logger.warning(
                "%s código(s) desconhecido(s) na votação %s.", dados["desconhecidos"], id_votacao
            )
        return votacao_id


def coletar(
    inicio: date,
    fim: date,
    *,
    http: ClienteHttp,
    abrir_sessao: Callable[[], Session] = sessao,
) -> ResumoColeta:
    resumo = ResumoColeta(casa="senado", inicio=inicio, fim=fim)
    comeco = time.monotonic()
    coleta = _Coleta(resumo, http, abrir_sessao)
    vistas: dict[str, dict] = {}
    sessoes: VotacoesPorSessao = defaultdict(list)
    falhas_seguidas = 0
    try:
        coleta.cadastrar_atuais()
        for primeiro, ultimo, resposta in _votacoes_por_periodo(http, inicio, fim):
            itens = _lista(resposta.dados)
            por_id = {}
            contraditorias = set()
            for item in itens:
                if item.get("casaSessao") == "CN":
                    continue
                id_votacao = str(_inteiro(item.get("codigoSessaoVotacao")))
                if id_votacao in por_id and por_id[id_votacao] != item:
                    contraditorias.add(id_votacao)
                por_id.setdefault(id_votacao, item)
            for id_votacao, item in por_id.items():
                try:
                    if id_votacao in contraditorias:
                        raise ErroColeta("Votação repetida com dados contraditórios.")
                    if item.get("casaSessao") != "SF":
                        raise ErroColeta("Casa da sessão ausente ou inválida.")
                    if id_votacao in vistas:
                        if vistas[id_votacao] != item:
                            raise ErroColeta("Votação repetida com dados contraditórios.")
                        continue
                    vistas[id_votacao] = item
                    votacao_id = coleta.gravar(id_votacao, item, resposta, primeiro, ultimo)
                except _RecursoIndisponivel:
                    # Não incrementa falhas nem desfaz o cadastro; não há votação parcial.
                    continue
                except (ErroColeta, SQLAlchemyError) as erro:
                    resumo.completa = False
                    resumo.falhas_votacoes.append(id_votacao)
                    falhas_seguidas += 1
                    logger.warning("Votação %s: %s", id_votacao, _erro_seguro(erro))
                    if falhas_seguidas >= 3:
                        raise ErroColeta(
                            "Coleta interrompida após três votações consecutivas com falha."
                        ) from None
                else:
                    sessoes[_codigo_sessao_plenaria(item)].append(votacao_id)
                    falhas_seguidas = 0
    except (ErroColeta, SQLAlchemyError) as erro:
        resumo.completa = False
        resumo.erro = _erro_seguro(erro)
    coletar_videos(
        resumo,
        sessoes,
        http=http,
        abrir_sessao=abrir_sessao,
        consultar=_video_encontro,
        comeco_coleta=comeco,
    )
    coletar_temas(
        resumo,
        sorted(coleta.proposicoes),
        http=http,
        abrir_sessao=abrir_sessao,
        processos=coleta.processos,
    )
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
        if args.somente_temas:
            resumo = preencher_temas(inicio, fim, casa="senado", http=http, abrir_sessao=sessao)
        elif args.somente_videos:
            resumo = preencher_videos(
                inicio,
                fim,
                casa="senado",
                http=http,
                abrir_sessao=sessao,
                localizar=lambda candidatas: _sessoes_historicas(candidatas, http, inicio, fim),
                consultar=_video_encontro,
            )
        else:
            resumo = coletar(inicio, fim, http=http)
    mostrar_resumo(resumo)
    return 0 if resumo.completa else 1


def registrar(casas: argparse._SubParsersAction) -> None:
    parser = casas.add_parser("senado", help="coleta votações e senadores em exercício")
    adicionar_argumentos_periodo(parser)
    adicionar_argumentos_de_preenchimento(parser)
    parser.set_defaults(rodar=_executar)
