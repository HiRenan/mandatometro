"""Coleta, banco e API com recortes sanitizados das duas Casas e transporte offline."""

import json
from copy import deepcopy
from datetime import date, datetime
from pathlib import Path

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from mandatometro.api.app import app
from mandatometro.cli import main
from mandatometro.coleta import camara, senado
from mandatometro.coleta.http import ClienteHttp
from mandatometro.db.modelos import Fonte, Parlamentar, Partido, Votacao, Voto

FIXTURES = Path(__file__).parent / "fixtures"
DEPUTADO = f"{camara.BASE}/deputados/900031"
SENADOR = f"{senado.BASE}/senador/900041"
SENADOR_SEM_DADOS = f"{senado.BASE}/senador/900042"
PARTIDOS_CAMARA = f"{camara.BASE}/partidos?itens=100"
CONSULTA_PARTIDOS_SENADO = f"{senado.BASE}/senador/partidos.json"
PARTIDOS_SENADO = f"{senado.BASE}/dados/ListaPartidos.json"
ENVELOPE_SENADO = "HistoricoAcademicoParlamentar"


def ler(casa, nome):
    return json.loads((FIXTURES / casa / f"biografia-{nome}.json").read_text(encoding="utf-8"))


@pytest.fixture
def fontes_http(monkeypatch):
    respostas = {
        DEPUTADO: ler("camara", "deputado"),
        f"{DEPUTADO}/profissoes": ler("camara", "profissoes"),
        PARTIDOS_CAMARA: ler("camara", "partidos"),
        CONSULTA_PARTIDOS_SENADO: httpx2.Response(301, headers={"Location": PARTIDOS_SENADO}),
        PARTIDOS_SENADO: ler("senado", "partidos"),
        f"{SENADOR}/profissao.json": ler("senado", "profissao"),
        f"{SENADOR}/historicoAcademico.json": ler("senado", "historico"),
        f"{SENADOR_SEM_DADOS}/profissao.json": ler("senado", "profissao-vazio"),
        f"{SENADOR_SEM_DADOS}/historicoAcademico.json": ler("senado", "historicoAcademico-vazio"),
    }
    chamadas = []

    def atender(req):
        url = str(req.url)
        chamadas.append(url)
        if req.url.path == "/robots.txt":
            return httpx2.Response(404)
        dado = respostas[url]
        if isinstance(dado, httpx2.Response):
            return dado
        if isinstance(dado, int):
            return httpx2.Response(dado, json={"email": "erro@example.com"})
        return httpx2.Response(200, json=dado)

    iniciar = ClienteHttp.__init__
    with httpx2.Client(transport=httpx2.MockTransport(atender)) as transporte:

        def iniciar_mock(self, base_url):
            iniciar(self, base_url, cliente=transporte, intervalo=0)

        monkeypatch.setattr(ClienteHttp, "__init__", iniciar_mock)
        yield respostas, chamadas


@pytest.fixture
def pessoas(sessao, monkeypatch):
    fonte = Fonte(url="https://example.com/cadastro")
    pessoas = [
        Parlamentar(casa="camara", id_externo=900031, nome="Lina de Exemplo", fonte=fonte),
        Parlamentar(casa="senado", id_externo=900041, nome="Ari de Exemplo", fonte=fonte),
        Parlamentar(casa="senado", id_externo=900042, nome="Léo de Exemplo", fonte=fonte),
    ]
    sessao.add_all(pessoas)
    sessao.flush()
    ids = [pessoa.id for pessoa in pessoas]
    sessao.commit()
    conexao = sessao.connection()
    monkeypatch.setattr("mandatometro.db.engine", lambda: conexao)
    monkeypatch.setattr(
        "mandatometro.db.Session",
        lambda bind: Session(bind=bind, join_transaction_mode="create_savepoint"),
    )
    return ids


@pytest.fixture
def rodar(capsys, fontes_http, pessoas):
    def executar(codigo=0):
        assert main(["coleta", "biografias"]) == codigo
        return json.loads(capsys.readouterr().out)

    return executar


def detalhe(id):
    resposta = TestClient(app).get(f"/parlamentares/{id}")
    assert resposta.status_code == 200
    return resposta.json()


def test_nome_do_partido_corresponde_ao_ultimo_voto(sessao, pessoas, rodar, fontes_http):
    deputado, senador, sem_nome = pessoas
    fonte = Fonte(url="https://example.com/votacao")
    for pessoa, casa, externo, dia, sigla in (
        (deputado, "camara", "900001-1", 16, "PRV"),
        (deputado, "camara", "900001-2", 17, "pft"),
        (senador, "senado", "900001", 17, "PRV"),
        (sem_nome, "senado", "900002", 17, "PNX"),
    ):
        votacao = Votacao(
            casa=casa,
            id_externo=externo,
            data=date(2026, 11, dia),
            resultado="aprovada",
            descricao="Votação fictícia.",
            fonte=fonte,
        )
        sessao.add(
            Voto(
                parlamentar_id=pessoa,
                votacao=votacao,
                valor="sim",
                valor_bruto="Sim",
                partido=sigla,
                fonte=fonte,
            )
        )
    sessao.commit()

    assert rodar()["partidos"] == 2
    for pessoa, sigla, nome in (
        (deputado, "pft", "Partido Fictício de Teste"),
        (senador, "PRV", "Partido dos Rios e Vales"),
        (sem_nome, "PNX", None),
    ):
        dados = detalhe(pessoa)
        assert (dados["partido"], dados["partido_nome"]) == (sigla, nome)
    # Uma coleta completa também remove o nome que a fonte deixou de publicar.
    respostas, _ = fontes_http
    respostas[PARTIDOS_CAMARA]["dados"][0]["nome"] = None
    partidos_senado = respostas[PARTIDOS_SENADO]["ListaPartidos"]["Partidos"]["Partido"]
    partidos_senado[0]["Nome"] = None
    partidos_senado[1]["Nome"] = None
    assert rodar()["partidos"] == 0
    assert detalhe(deputado)["partido_nome"] is None
    assert detalhe(senador)["partido_nome"] is None


def test_biografia_da_camara_guarda_os_dois_enderecos(sessao, pessoas, rodar, fontes_http):
    respostas, chamadas = fontes_http
    profissoes = respostas[f"{DEPUTADO}/profissoes"]["dados"]
    profissoes.extend([deepcopy(profissoes[0]), {**profissoes[0], "titulo": "Ilustradora"}])

    resumo = rodar()
    assert resumo["parlamentares"] == 3
    assert resumo["biografias"] == 2
    assert resumo["completa"] is True
    total_chamadas = len(chamadas)
    dados = detalhe(pessoas[0])
    assert len(chamadas) == total_chamadas
    bio = dados["biografia"]
    assert dados["id"] == pessoas[0]
    assert bio["profissoes"] == ["Restauradora", "Ilustradora"]
    assert bio["escolaridade"] == "Superior"
    fontes = {
        fonte.url: fonte.coletado_em
        for fonte in sessao.scalars(select(Fonte).where(Fonte.url.startswith(DEPUTADO)))
    }
    assert set(fontes) == {DEPUTADO, f"{DEPUTADO}/profissoes"}
    assert bio["fonte"]["url"] == DEPUTADO
    assert datetime.fromisoformat(bio["fonte"]["coletado_em"]) == fontes[DEPUTADO]


def test_fontes_usam_os_enderecos_das_consultas_inclusive_na_paginacao(
    sessao, pessoas, rodar, fontes_http
):
    respostas, chamadas = fontes_http
    pagina_dois = f"{PARTIDOS_CAMARA}&pagina=2"
    link_next = f"{pagina_dois}&email=paginacao@example.com"
    respostas[PARTIDOS_CAMARA]["links"].append({"rel": "next", "href": link_next})
    destino = f"{pagina_dois}&email=redirecionado@example.com"
    respostas[destino] = {
        "dados": [{"sigla": "PÁG", "nome": "Partido Águas de Garoa"}],
        "links": [],
    }
    for url in (pagina_dois, link_next):
        respostas[url] = httpx2.Response(302, headers={"Location": destino})
    for consulta, destino in (
        (DEPUTADO, DEPUTADO),
        (f"{DEPUTADO}/profissoes", f"{DEPUTADO}/profissoes"),
        (f"{SENADOR}/profissao.json", f"{SENADOR}/profissao.json"),
        (f"{SENADOR}/historicoAcademico.json", f"{SENADOR}/historicoAcademico.json"),
        (CONSULTA_PARTIDOS_SENADO, PARTIDOS_SENADO),
    ):
        redirecionado = f"{destino}?email=redirecionado@example.com"
        respostas[redirecionado] = respostas[destino]
        respostas[consulta] = httpx2.Response(302, headers={"Location": redirecionado})

    assert rodar()["partidos"] == 3
    assert set(sessao.scalars(select(Fonte.url))) == {
        "https://example.com/cadastro",
        DEPUTADO,
        f"{DEPUTADO}/profissoes",
        f"{SENADOR}/profissao.json",
        f"{SENADOR}/historicoAcademico.json",
        PARTIDOS_CAMARA,
        pagina_dois,
        CONSULTA_PARTIDOS_SENADO,
    }
    assert link_next not in chamadas
    assert detalhe(pessoas[0])["biografia"]["fonte"]["url"] == DEPUTADO
    assert detalhe(pessoas[1])["biografia"]["fonte"]["url"] == f"{SENADOR}/historicoAcademico.json"


def test_biografia_do_senado_preserva_graus_e_profissoes_na_ordem(pessoas, rodar, fontes_http):
    respostas, _ = fontes_http
    perfil = respostas[f"{SENADOR}/historicoAcademico.json"][ENVELOPE_SENADO]["Parlamentar"]
    cursos = perfil["HistoricoAcademico"]["Curso"]
    cursos.extend([deepcopy(cursos[0]), {**cursos[0], "GrauInstrucao": ""}])
    perfil = respostas[f"{SENADOR}/profissao.json"][ENVELOPE_SENADO]["Parlamentar"]
    trabalhos = perfil["Profissoes"]["Profissao"]
    trabalhos.append(deepcopy(trabalhos[0]))

    rodar()
    dados = detalhe(pessoas[1])
    assert dados["id"] == pessoas[1]
    bio = dados["biografia"]
    assert bio["profissoes"] == ["Cartógrafo", "Ilustrador"]
    assert bio["escolaridade"] == "Superior, Mestrado"
    assert bio["fonte"]["url"] == f"{SENADOR}/historicoAcademico.json"


@pytest.mark.parametrize("campo_ausente", ["profissao", "historicoAcademico"])
def test_biografia_com_um_so_campo_usa_a_fonte_disponivel(
    pessoas, rodar, fontes_http, campo_ausente
):
    respostas, _ = fontes_http
    vazio = deepcopy(respostas[f"{SENADOR_SEM_DADOS}/{campo_ausente}.json"])
    vazio[ENVELOPE_SENADO]["Parlamentar"]["Codigo"] = "900041"
    respostas[f"{SENADOR}/{campo_ausente}.json"] = vazio

    rodar()
    bio = detalhe(pessoas[1])["biografia"]
    if campo_ausente == "profissao":
        assert bio["profissoes"] == []
        assert bio["escolaridade"] == "Superior, Mestrado"
        assert bio["fonte"]["url"] == f"{SENADOR}/historicoAcademico.json"
    else:
        assert len(bio["profissoes"]) == 2
        assert bio["escolaridade"] is None
        assert bio["fonte"]["url"] == f"{SENADOR}/profissao.json"


def test_biografia_nula_antes_da_coleta_ou_quando_a_fonte_esta_vazia(pessoas, rodar, fontes_http):
    assert detalhe(pessoas[1])["biografia"] is None
    assert rodar()["sem_biografia"] == 1
    assert detalhe(pessoas[1])["biografia"] is not None
    assert detalhe(pessoas[2])["biografia"] is None
    respostas, _ = fontes_http
    for rota in ("profissao", "historicoAcademico"):
        vazio = deepcopy(respostas[f"{SENADOR_SEM_DADOS}/{rota}.json"])
        vazio[ENVELOPE_SENADO]["Parlamentar"]["Codigo"] = "900041"
        respostas[f"{SENADOR}/{rota}.json"] = vazio

    resumo = rodar()
    assert resumo["falhas_parlamentares"] == 0
    assert resumo["sem_biografia"] == 2
    assert detalhe(pessoas[1])["biografia"] is None


def resposta_gzip_invalida():
    return httpx2.Response(
        200, headers={"Content-Encoding": "gzip"}, stream=httpx2.ByteStream(b"gzip invalido")
    )


@pytest.mark.parametrize("falha", ["http", "gzip"])
def test_falha_em_uma_pessoa_preserva_seus_dados_e_as_outras_seguem(
    pessoas, rodar, fontes_http, caplog, falha
):
    respostas, _ = fontes_http
    rodar()
    anterior = detalhe(pessoas[0])["biografia"]
    respostas[f"{DEPUTADO}/profissoes"] = 403 if falha == "http" else resposta_gzip_invalida()
    respostas[DEPUTADO]["dados"]["escolaridade"] = "Doutorado"
    perfil = respostas[f"{SENADOR}/historicoAcademico.json"][ENVELOPE_SENADO]["Parlamentar"]
    perfil["HistoricoAcademico"]["Curso"][0]["GrauInstrucao"] = "Especialização"

    resumo = rodar(1)
    assert resumo["completa"] is False
    assert resumo["falhas_parlamentares"] == 1
    assert resumo["parlamentares"] == 3
    assert resumo["biografias"] == resumo["sem_biografia"] == 1
    assert detalhe(pessoas[0])["biografia"] == anterior
    assert detalhe(pessoas[1])["biografia"]["escolaridade"] == "Especialização, Mestrado"
    assert "erro@example.com" not in caplog.text
    if falha == "gzip":
        assert "Resposta da fonte com compressão inválida." in caplog.messages


@pytest.mark.parametrize("falha", ["http", "gzip"])
def test_catalogo_parcial_preserva_partidos_e_coleta_biografias(
    pessoas, rodar, fontes_http, sessao, caplog, falha
):
    respostas, _ = fontes_http
    rodar()
    catalogo = select(Partido.sigla, Partido.nome, Partido.fonte_id).order_by(Partido.sigla)
    partidos_antes = sessao.execute(catalogo).all()
    respostas[PARTIDOS_SENADO] = 403 if falha == "http" else resposta_gzip_invalida()
    respostas[DEPUTADO]["dados"]["escolaridade"] = "Mestrado"

    resumo = rodar(1)
    assert resumo["completa"] is False
    assert resumo["falha_partidos"] is True
    assert resumo["partidos"] == 0
    assert resumo["falhas_parlamentares"] == 0
    assert sessao.execute(catalogo).all() == partidos_antes
    assert detalhe(pessoas[0])["biografia"]["escolaridade"] == "Mestrado"
    if falha == "gzip":
        assert "Resposta da fonte com compressão inválida." in caplog.messages


def test_pagina_divergente_da_camara_preserva_catalogo_e_fontes(
    pessoas, rodar, fontes_http, sessao
):
    respostas, chamadas = fontes_http
    pagina_dois = f"{PARTIDOS_CAMARA}&pagina=2"
    pagina_tres = f"{PARTIDOS_CAMARA}&pagina=3"
    respostas[PARTIDOS_CAMARA]["links"] = [
        {"rel": "next", "href": pagina_dois},
        {"rel": "last", "href": pagina_dois},
    ]
    respostas[pagina_dois] = {
        "dados": [{"sigla": "PÁG", "nome": "Partido Águas de Garoa"}],
        "links": [{"rel": "self", "href": pagina_dois}],
    }
    assert rodar()["partidos"] == 3
    catalogo = select(Partido.sigla, Partido.nome, Partido.fonte_id).order_by(Partido.sigla)
    fontes = (
        select(Fonte.id, Fonte.url, Fonte.coletado_em)
        .where(Fonte.url.startswith(f"{camara.BASE}/partidos"))
        .order_by(Fonte.id)
    )
    partidos_antes = sessao.execute(catalogo).all()
    fontes_antes = sessao.execute(fontes).all()
    respostas[pagina_dois] = httpx2.Response(302, headers={"Location": pagina_tres})
    respostas[pagina_tres] = {
        "dados": [{"sigla": "EXQ", "nome": "Partido de Exemplo"}],
        "links": [{"rel": "self", "href": pagina_tres}],
    }
    respostas[DEPUTADO]["dados"]["escolaridade"] = "Mestrado"

    resumo = rodar(1)
    assert pagina_tres in chamadas
    assert resumo["completa"] is False
    assert resumo["falha_partidos"] is True
    assert resumo["partidos"] == resumo["falhas_parlamentares"] == 0
    assert resumo["biografias"] == 2
    assert sessao.execute(catalogo).all() == partidos_antes
    assert sessao.execute(fontes).all() == fontes_antes
    assert detalhe(pessoas[0])["biografia"]["escolaridade"] == "Mestrado"


@pytest.mark.parametrize("casa", ["camara", "senado"])
def test_catalogo_sem_siglas_preserva_partidos_e_coleta_biografias(
    pessoas, rodar, fontes_http, sessao, casa
):
    respostas, _ = fontes_http
    rodar()
    catalogo = select(Partido.sigla, Partido.nome, Partido.fonte_id).order_by(Partido.sigla)
    partidos_antes = sessao.execute(catalogo).all()
    if casa == "camara":
        for item in respostas[PARTIDOS_CAMARA]["dados"]:
            item.pop("sigla")
    else:
        for item in respostas[PARTIDOS_SENADO]["ListaPartidos"]["Partidos"]["Partido"]:
            item.pop("Sigla")
    respostas[DEPUTADO]["dados"]["escolaridade"] = "Mestrado"

    resumo = rodar(1)
    assert resumo["completa"] is False
    assert resumo["falha_partidos"] is True
    assert resumo["partidos"] == resumo["falhas_parlamentares"] == 0
    assert sessao.execute(catalogo).all() == partidos_antes
    assert detalhe(pessoas[0])["biografia"]["escolaridade"] == "Mestrado"


def test_api_e_fontes_guardam_apenas_a_projecao_publica(
    pessoas, rodar, sessao, caplog, fontes_http
):
    respostas, _ = fontes_http
    respostas[DEPUTADO]["dados"]["tituloEleitor"] = "000000000000"
    resumo = rodar()
    for id in pessoas[:2]:
        dados = detalhe(id)
        assert set(dados) == {
            "id",
            "nome",
            "casa",
            "uf",
            "partido",
            "foto",
            "partido_nome",
            "biografia",
            "mandatos",
            "contagem_votos",
            "com_o_partido",
        }
        assert set(dados["biografia"]) == {"profissoes", "escolaridade", "fonte"}
        assert set(dados["biografia"]["fonte"]) == {"url", "coletado_em"}
        texto = json.dumps(dados, ensure_ascii=False) + json.dumps(resumo) + caplog.text
        for marcador in (
            "00000000000",
            "1901-01-01",
            "Vila de Exemplo",
            "Edifício fictício",
            "lina@example.com",
            "Faculdade de Exemplo",
        ):
            assert marcador not in texto

    fontes = list(sessao.scalars(select(Fonte)))
    assert len(fontes) == 7
    assert all(f.trecho is None and f.url_publica is None for f in fontes)
