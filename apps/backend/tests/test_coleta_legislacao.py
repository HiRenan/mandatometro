"""A coleta de atos usa amostras gravadas dos dados abertos do Senado."""

import json
from contextlib import contextmanager
from copy import deepcopy
from datetime import date
from functools import partial
from pathlib import Path

import httpx2
import pytest
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.cli import main
from mandatometro.coleta import http as base_http
from mandatometro.coleta import legislacao
from mandatometro.coleta.cli import mostrar_resumo
from mandatometro.coleta.http import USER_AGENT, ClienteHttp
from mandatometro.db.modelos import Ato, Fonte

FIXTURES = Path(__file__).parent / "fixtures/senado/legislacao"
INICIO, FIM, HOJE = date(2026, 11, 12), date(2026, 11, 18), date(2026, 11, 19)
DECRETO, LEI, MPV = "44427519", "44391098", "44363879"
TIPOS = ("DEC", "LEI", "MPV")


def ler(nome):
    return json.loads((FIXTURES / nome).read_text(encoding="utf-8"))


def documentos(resposta, envelope):
    return resposta[envelope]["documentos"]["documento"]


def publicacoes(detalhe):
    return documentos(detalhe, "DetalheDocumento")[0]["publicacoes"]["publicacao"]


@pytest.fixture
def respostas():
    dados = {(tipo, 2026): ler(f"lista-{tipo}-2026.json") for tipo in TIPOS}
    dados.update({id_norma: ler(f"detalhe-{id_norma}.json") for id_norma in (DECRETO, LEI, MPV)})
    for id_norma in ("44332135", "44331919"):
        detalhe = {
            "id": id_norma,
            "publicacoes": {"publicacao": {"siglaFonte": "DOU", "data": "05/11/2026"}},
        }
        dados[id_norma] = {"DetalheDocumento": {"documentos": {"documento": [detalhe]}}}
    return dados


@pytest.fixture
def preparar_cliente(respostas):
    @contextmanager
    def abrir(*, robots="User-agent: *\nDisallow:", tentativas=1):
        consultas = []

        def atender(requisicao):
            assert requisicao.headers["User-Agent"] == USER_AGENT
            caminho = requisicao.url.path
            consultas.append(requisicao)
            if caminho == "/robots.txt":
                return httpx2.Response(200, text=robots)
            if caminho == "/dadosabertos/legislacao/lista":
                params = dict(requisicao.url.params)
                assert set(params) == {"tipo", "ano"}
                chave = (params["tipo"], int(params["ano"]))
            else:
                chave = caminho.removeprefix("/dadosabertos/legislacao/")
            assert chave in respostas, f"Consulta inesperada: {chave}"
            resposta = respostas[chave]
            if isinstance(resposta, int):
                return httpx2.Response(resposta)
            if isinstance(resposta, bytes):
                return httpx2.Response(200, content=resposta)
            if isinstance(resposta, httpx2.TransportError):
                raise resposta
            return httpx2.Response(200, json=resposta)

        with (
            httpx2.Client(transport=httpx2.MockTransport(atender)) as transporte,
            ClienteHttp(
                legislacao.BASE, cliente=transporte, intervalo=0, tentativas=tentativas
            ) as http,
        ):
            yield http, consultas

    return abrir


@pytest.fixture
def abrir_sessao(sessao):
    return partial(Session, bind=sessao.connection(), join_transaction_mode="create_savepoint")


@pytest.fixture
def executar(sessao, preparar_cliente, abrir_sessao):
    def rodar(
        inicio=INICIO, fim=FIM, hoje=HOJE, *, robots="User-agent: *\nDisallow:", tentativas=1
    ):
        with preparar_cliente(robots=robots, tentativas=tentativas) as (http, consultas):
            resumo = legislacao.coletar(
                inicio, fim, http=http, hoje=hoje, abrir_sessao=abrir_sessao
            )
        sessao.expire_all()
        return resumo, consultas

    return rodar


def test_semana_real_consulta_so_candidatos_e_grava_fontes(sessao, respostas, executar):
    resumo, consultas = executar()

    assert resumo.completa
    assert (resumo.atos, resumo.chamadas, resumo.tentativas_extras) == (2, 9, 0)
    assert resumo.descartes == {"data_futura": 1}
    assert consultas[0].url.path == "/robots.txt"
    assert {r.url.params["tipo"] for r in consultas if r.url.path.endswith("/lista")} == set(TIPOS)
    registros = {ato.id_externo: ato for ato in sessao.scalars(select(Ato))}
    assert set(registros) == {DECRETO, LEI}
    ato = registros[DECRETO]
    assert (ato.origem, ato.tipo, ato.numero) == ("legislacao_senado", "decreto", "13168")
    assert ato.data_assinatura == date(2026, 11, 16)
    assert ato.data_publicacao == date(2026, 11, 17)
    assert ato.orgao is None
    assert ato.secao is None
    item = documentos(respostas["DEC", 2026], "ListaDocumento")[0]
    titulo_preservado = ato.titulo == item["normaNome"]
    ementa_preservada = ato.ementa == item["ementa"]
    assert titulo_preservado and ementa_preservada
    assert ato.fonte.url == f"{legislacao.BASE}/legislacao/{DECRETO}"
    assert (
        ato.fonte.url_publica
        == "https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2026-11-16;13168"
    )
    assert ato.fonte.trecho is None
    assert registros[LEI].tipo == "lei"
    assert len({ato.fonte_id for ato in registros.values()}) == 2


def test_primeiro_dou_inclui_edicao_extra_e_independe_da_ordem(sessao, respostas, executar):
    publicacoes(respostas[LEI]).reverse()
    publicacoes(respostas[LEI]).insert(0, {"siglaFonte": "BS", "data": "11/11/2026"})

    executar()

    consulta = select(Ato.data_publicacao).where(Ato.id_externo == LEI)
    assert sessao.scalars(consulta).one() == date(2026, 11, 12)
    resumo, _ = executar(date(2026, 11, 13), date(2026, 11, 13))
    assert resumo.atos == 0


def test_medida_publicada_tres_dias_depois_da_assinatura(sessao, executar):
    resumo, _ = executar(date(2026, 11, 9), date(2026, 11, 9))

    assert resumo.atos == 1
    assert sessao.execute(select(Ato.id_externo, Ato.tipo)).one() == (MPV, "medida_provisoria")


def test_lei_publicada_quatro_dias_depois_da_assinatura_na_pascoa(sessao, respostas, executar):
    id_norma = "43009368"
    for tipo in TIPOS:
        documentos(respostas[tipo, 2026], "ListaDocumento").clear()
    documentos(respostas["LEI", 2026], "ListaDocumento").append(
        {
            "id": id_norma,
            "tipo": "LEI-n",
            "numero": "15377",
            "dataassinatura": "02/04/2026",
            "normaNome": "Lei fictícia",
            "ementa": "Ementa fictícia.",
        }
    )
    detalhe = {
        "id": id_norma,
        "identificacao": {
            "urlDocumento": "https://normas.leg.br/?urn=urn:lex:br:federal:lei:2026-04-02;15377"
        },
        "publicacoes": {"publicacao": [{"siglaFonte": "DOU-2026-04-06", "data": "06/04/2026"}]},
    }
    respostas[id_norma] = {"DetalheDocumento": {"documentos": {"documento": [detalhe]}}}
    inicio, fim = date(2026, 4, 6), date(2026, 4, 12)

    resumo, _ = executar(inicio, fim, date(2026, 4, 13))

    assert resumo.completa
    assert (resumo.atos, resumo.descartes) == (1, {})
    consulta = select(Ato.id_externo, Ato.data_assinatura, Ato.data_publicacao)
    assert sessao.execute(consulta).one() == (id_norma, date(2026, 4, 2), inicio)


def test_virada_consulta_ano_da_margem_e_ano_do_periodo(sessao, respostas, executar):
    lista = documentos(respostas["DEC", 2026], "ListaDocumento")
    lista[0]["dataassinatura"] = "22/12/2026"
    lista[-1]["dataassinatura"] = "21/12/2026"
    publicacoes(respostas[DECRETO])[0]["data"] = "01/01/2027"
    for tipo in TIPOS:
        respostas[tipo, 2027] = {"ListaDocumento": {"documentos": ""}}

    resumo, requisicoes = executar(date(2027, 1, 1), date(2027, 1, 2), date(2027, 1, 3))

    assert resumo.atos == 1
    assert sessao.execute(select(Ato.id_externo, Ato.data_assinatura)).one() == (
        DECRETO,
        date(2026, 12, 22),
    )
    listas = [r.url.params for r in requisicoes if r.url.path.endswith("/lista")]
    assert {(p["tipo"], p["ano"]) for p in listas} == {
        (tipo, ano) for tipo in TIPOS for ano in ("2026", "2027")
    }
    assert resumo.chamadas == 8


@pytest.mark.parametrize("status", [404, 410])
def test_descarta_por_motivo_e_continua_sem_payload(
    sessao, respostas, executar, caplog, capsys, status
):
    lista = documentos(respostas["DEC", 2026], "ListaDocumento")
    modelo = lista[0]
    casos = [
        {"id": "1", "tipo": "POR-n"},
        {"id": ""},
        {"id": "2", "normaNome": " "},
        {"id": "3", "dataassinatura": "31/11/2026"},
        {"id": "4"},
        {"id": "5"},
        {"id": "6"},
        {"id": "7"},
        {"id": "8"},
    ]
    lista[:0] = [modelo | alteracoes for alteracoes in casos]
    for id_norma in ("4", "5", "6", "7"):
        detalhe = respostas[id_norma] = deepcopy(respostas[DECRETO])
        documentos(detalhe, "DetalheDocumento")[0]["id"] = id_norma
    publicacoes(respostas["4"])[:] = [
        {"siglaFonte": "BS", "data": "17/11/2026"},
        {"siglaFonte": "DOU-2026-11-17", "data": "invalida"},
    ]
    publicacoes(respostas["5"])[0]["data"] = "20/11/2026"
    documentos(respostas["6"], "DetalheDocumento")[0]["identificacao"]["urlDocumento"] = ""
    documentos(respostas["7"], "DetalheDocumento")[0]["id"] = "77"
    respostas["8"] = status

    resumo, _ = executar()

    assert resumo.completa
    assert resumo.atos == 2
    assert resumo.descartes == {
        "tipo_fora_do_conjunto": 1,
        "campo_obrigatorio": 3,
        "assinatura_invalida": 1,
        "sem_publicacao": 1,
        "data_futura": 2,
        "detalhe_invalido": 1,
        "detalhe_indisponivel": 1,
    }
    assert set(sessao.scalars(select(Ato.id_externo))) == {DECRETO, LEI}
    assert sessao.scalar(select(func.count(Fonte.id))) == 2
    mostrar_resumo(resumo)
    saida = caplog.text + capsys.readouterr().out
    assert all(texto not in saida for texto in ("Pessoa Fictícia", "000.000.000-00", "normaNome"))


@pytest.mark.parametrize(
    "conteudo", [pytest.param(b'{"documentos":', id="json"), pytest.param(b"\xff", id="utf8")]
)
def test_detalhe_com_json_invalido_e_descartado(sessao, respostas, executar, conteudo):
    respostas[DECRETO] = conteudo

    resumo, _ = executar()

    assert resumo.completa
    assert resumo.erro is None
    assert resumo.descartes == {"detalhe_invalido": 1, "data_futura": 1}
    assert resumo.tentativas_extras == 0
    assert sessao.scalars(select(Ato.id_externo)).all() == [LEI]
    assert sessao.scalar(select(func.count(Fonte.id))) == 1


@pytest.mark.parametrize(
    "url",
    [
        pytest.param(
            "https://example.com/?urn=urn:lex:br:federal:decreto:2026-11-16;13168",
            id="outro_dominio",
        ),
        pytest.param("https://normas.leg.br/", id="pagina_inicial"),
        pytest.param("https://normas.leg.br/?urn=urn:lex:br:federal:decreto:", id="urn_incompleta"),
        pytest.param(
            "https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2026-11-16",
            id="data_sem_identificador",
        ),
        pytest.param(
            "https://normas.leg.br/?urn=urn:lex:br:federal:decreto:2026",
            id="ano_sem_identificador",
        ),
        pytest.param(
            "https://normas.leg.br/sobre?urn=urn:lex:br:federal:decreto:2026-11-16;13168",
            id="outra_pagina",
        ),
    ],
)
def test_descarta_link_oficial_invalido(sessao, respostas, executar, url):
    identificacao = documentos(respostas[DECRETO], "DetalheDocumento")[0]["identificacao"]
    identificacao["urlDocumento"] = url

    resumo, _ = executar()

    assert resumo.completa
    assert resumo.descartes.get("campo_obrigatorio") == 1
    assert sessao.scalars(select(Ato.id_externo)).all() == [LEI]
    assert sessao.scalar(select(func.count(Fonte.id))) == 1


def test_repetir_atualiza_a_mesma_linha_e_preserva_a_outra_origem(sessao, respostas, executar):
    executar()
    consulta = select(Ato).where(Ato.id_externo == DECRETO, Ato.origem == "legislacao_senado")
    ato = sessao.scalars(consulta).one()
    id_antes, fonte_antes = ato.id, ato.fonte_id
    outro = Ato(
        origem="outra_origem",
        id_externo=DECRETO,
        titulo="Ato de exemplo",
        tipo="decreto",
        data_publicacao=date(2026, 11, 16),
        fonte_id=fonte_antes,
    )
    sessao.add(outro)
    sessao.flush()
    publicacoes(respostas[DECRETO])[0]["data"] = "18/11/2026"

    resumo, _ = executar()

    assert resumo.atos == 2
    atual = sessao.scalars(consulta).one()
    assert atual.id == id_antes
    assert atual.fonte_id != fonte_antes
    assert atual.data_publicacao == date(2026, 11, 18)
    assert outro.data_publicacao == date(2026, 11, 16)
    assert sessao.scalar(select(func.count(Ato.id))) == 3
    assert sessao.scalar(select(func.count(Fonte.id))) == 4


def test_robots_que_proibe_legislacao_interrompe_sem_consultar_dados(executar):
    resumo, consultas = executar(robots="User-agent: *\nDisallow: /dadosabertos/legislacao")

    assert not resumo.completa
    assert resumo.erro == "Consulta proibida pelo robots.txt."
    assert (resumo.atos, resumo.chamadas) == (0, 1)
    assert [r.url.path for r in consultas] == ["/robots.txt"]


def test_detalhe_proibido_pelo_robots_interrompe(executar):
    robots = f"User-agent: *\nDisallow: /dadosabertos/legislacao/{DECRETO}"
    resumo, consultas = executar(robots=robots)

    assert not resumo.completa
    assert resumo.erro == "Consulta proibida pelo robots.txt."
    assert (resumo.atos, resumo.chamadas) == (0, 2)
    assert consultas[-1].url.path.endswith("/lista")


def test_falha_no_segundo_detalhe_preserva_primeiro_ato_e_fonte(
    sessao, respostas, executar, monkeypatch
):
    respostas[LEI] = 503
    monkeypatch.setattr(base_http.time, "sleep", lambda _: None)

    resumo, consultas = executar(tentativas=3)

    assert not resumo.completa
    assert resumo.erro == "Falha transitória na fonte após esgotar as tentativas."
    assert (resumo.atos, resumo.tentativas_extras) == (1, 2)
    assert sum(r.url.path.endswith(f"/{LEI}") for r in consultas) == 3
    consulta = select(Ato.id_externo, Fonte.url).join(Fonte)
    assert sessao.execute(consulta).all() == [(DECRETO, f"{legislacao.BASE}/legislacao/{DECRETO}")]
    assert sessao.scalar(select(func.count(Fonte.id))) == 1


def test_falha_de_transporte_no_detalhe_encerra_cli_apos_tentativas(
    respostas, preparar_cliente, abrir_sessao, monkeypatch, capsys
):
    respostas[DECRETO] = httpx2.ConnectError("Falha de conexão simulada.")
    esperas = []
    monkeypatch.setattr(base_http.time, "sleep", esperas.append)
    monkeypatch.setattr(
        legislacao, "coletar", partial(legislacao.coletar, hoje=HOJE, abrir_sessao=abrir_sessao)
    )

    with preparar_cliente(tentativas=3) as (http, consultas):
        monkeypatch.setattr(legislacao, "ClienteHttp", lambda _: http)
        codigo = main(
            ["coleta", "legislacao", "--inicio", INICIO.isoformat(), "--fim", FIM.isoformat()]
        )

    assert codigo == 1
    resumo = json.loads(capsys.readouterr().out)
    assert not resumo["completa"]
    assert resumo["erro"] == "Falha transitória na fonte após esgotar as tentativas."
    assert (resumo["atos"], resumo["tentativas_extras"]) == (0, 2)
    assert resumo["chamadas"] == len(consultas) == 5
    assert esperas == [1.0, 2.0]


def test_falha_de_gravacao_desfaz_fonte_e_omite_parametros(
    sessao, respostas, executar, monkeypatch, caplog, capsys
):
    titulo = "Norma fictícia para teste de sigilo"
    documentos(respostas["DEC", 2026], "ListaDocumento")[0]["normaNome"] = titulo

    def falhar(*args, **kwargs):
        raise SQLAlchemyError("Parâmetro com Pessoa Fictícia de Exemplo.")

    monkeypatch.setattr(legislacao, "salvar_ato", falhar, raising=False)

    resumo, _ = executar()

    assert not resumo.completa
    assert resumo.atos == 0
    assert resumo.descartes.get("falha_gravacao") == 1
    assert resumo.erro == "Falha de gravação no banco; ato desfeito."
    assert sessao.scalar(select(func.count(Fonte.id))) == 0
    mostrar_resumo(resumo)
    saida = capsys.readouterr()
    vazou = any(
        texto in caplog.text + saida.out + saida.err for texto in (titulo, "Pessoa Fictícia")
    )
    assert not vazou


@pytest.mark.online
def test_fonte_publica_mantem_envelopes_lista_e_detalhe():
    with ClienteHttp(legislacao.BASE) as http:
        lista = http.obter_json("/legislacao/lista", params={"tipo": "LEI", "ano": 2026})
        conector_le_lista = legislacao._documentos(lista.dados, "ListaDocumento")
        assert sum(item.get("id") == LEI for item in conector_le_lista) == 1
        resposta = http.obter_json(f"/legislacao/{LEI}")

    detalhe = legislacao._detalhe(resposta.dados, LEI)
    assert legislacao._primeira_publicacao(detalhe) == date(2026, 11, 12)
    assert bool(legislacao._url_publica(detalhe))
