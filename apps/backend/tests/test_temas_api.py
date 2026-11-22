from contextlib import contextmanager
from copy import deepcopy
from datetime import UTC, date, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados
from test_temas_coleta import _cliente, _ler
from test_temas_coleta import abrir as abrir

from mandatometro.api import edicoes, parlamentares, votacoes
from mandatometro.api.app import app
from mandatometro.coleta.camara import BASE
from mandatometro.coleta.temas import preencher_temas
from mandatometro.db.modelos import Edicao, ItemEdicao, Parlamentar, ProposicaoTema, Voto
from mandatometro.ia.esquemas import Fatos, FatoVotacao
from mandatometro.ia.servico import exportar, gerar, publicar, revisar

SAUDE = {"id": "saude", "nome": "Saúde"}
EDUCACAO = {"id": "educacao", "nome": "Educação"}
CIENCIA = {"id": "ciencia_tecnologia", "nome": "Ciência, tecnologia e comunicação"}


@pytest.fixture
def cliente(abrir, monkeypatch):
    for modulo in (edicoes, parlamentares, votacoes):
        monkeypatch.setattr(modulo, "sessao_do_banco", abrir)
    return TestClient(app)


def _associar(sessao, proposicao, *ids):
    sessao.add_all(
        ProposicaoTema(proposicao_id=proposicao.id, tema=id_, fonte_id=proposicao.fonte_id)
        for id_ in ids
    )


def _pessoa(sessao, *votacoes_):
    fonte = votacoes_[0].fonte
    pessoa = Parlamentar(casa="camara", id_externo=100, nome="Pessoa Inventada", fonte=fonte)
    for votacao in votacoes_:
        sessao.add(Voto(votacao=votacao, parlamentar=pessoa, valor="sim", fonte=fonte))
    sessao.flush()
    return pessoa


def test_catalogo_publica_18_temas_na_ordem_sem_acento_nos_ids():
    resposta = TestClient(app).get("/temas")
    assert resposta.status_code == 200
    temas = resposta.json()
    ids = [tema["id"] for tema in temas]
    assert len(ids) == len(set(ids)) == 18
    assert all(id_.isascii() for id_ in ids)
    assert temas[:2] == [SAUDE, EDUCACAO]


def test_votacoes_respondem_a_uniao_e_filtram_antes_da_paginacao(sessao, dados, cliente):
    a = dados(10)
    b = dados(20)
    ambas = dados(30, proposicoes=[b.proposicoes[0], a.proposicoes[0]])
    sem = dados(40, proposicoes=[])
    _associar(sessao, a.proposicoes[0], "educacao", "saude")
    _associar(sessao, b.proposicoes[0], "saude")
    parlamentar = _pessoa(sessao, a, ambas, sem)
    rota = f"/parlamentares/{parlamentar.id}/votos"
    assert cliente.get(f"/votacoes/{ambas.id}").json()["temas"] == [SAUDE, EDUCACAO]
    assert cliente.get(f"/votacoes/{sem.id}").json()["temas"] == []

    pagina = cliente.get(rota, params={"tema": "saude", "limite": 1}).json()
    assert pagina["total"] == 2
    assert [v["votacao_id"] for v in pagina["votos"]] == [ambas.id]
    assert pagina["votos"][0]["temas"] == [SAUDE, EDUCACAO]
    segunda = cliente.get(rota, params={"tema": "saude", "deslocamento": 1}).json()
    assert segunda["total"] == 2
    assert [v["votacao_id"] for v in segunda["votos"]] == [a.id]
    todos = cliente.get(rota).json()
    assert todos["total"] == 3
    assert todos["votos"][0]["temas"] == []
    vazio = cliente.get(rota, params={"tema": "trabalho"}).json()
    assert vazio["total"] == 0 and vazio["votos"] == []
    invalido = cliente.get(rota, params={"tema": "tema_desconhecido"})
    assert invalido.status_code == 422
    assert invalido.json() == {"erro": "dados_invalidos"}


def _fotografia(edicao):
    return deepcopy(
        (
            edicao.titulo,
            edicao.publicada_em,
            [(i.ordem, i.titulo, i.texto, i.fonte_id, i.fatos) for i in edicao.itens],
        )
    )


def test_preenchimento_preserva_edicao_publicada_e_rascunho_revisado(sessao, dados, abrir, cliente):
    meio = date(2026, 11, 12)
    dados(101, dia=10)
    dados(102, dia=14)
    antiga = gerar(abrir, INICIO, meio)["edicao_id"]
    revisar(abrir, antiga, pronto(exportar(abrir, antiga)))
    publicar(abrir, antiga)
    rascunho = gerar(abrir, date(2026, 11, 13), FIM)["edicao_id"]
    revisar(abrir, rascunho, pronto(exportar(abrir, rascunho)))

    rota = f"/edicoes/{antiga}"
    antes = cliente.get(rota).json()
    assert antes["itens"][0]["fatos"]["votacoes"][0]["temas"] == []
    fotografia = _fotografia(sessao.get(Edicao, antiga))
    revisao = exportar(abrir, rascunho)

    resposta = _ler("respostas-camara.json")["multiplos"]
    com_temas = {f"/proposicoes/{codigo}/temas": resposta for codigo in (101, 102)}
    with _cliente(BASE, com_temas) as (http, _):
        resumo = preencher_temas(INICIO, FIM, casa="camara", http=http, abrir_sessao=abrir)
    assert resumo.completa and resumo.temas.proposicoes_com_tema == 2

    sessao.expire_all()
    assert _fotografia(sessao.get(Edicao, antiga)) == fotografia
    depois = cliente.get(rota).json()
    assert depois["itens"][0]["fatos"]["votacoes"][0].pop("temas") == [SAUDE, CIENCIA]
    antes["itens"][0]["fatos"]["votacoes"][0].pop("temas")
    assert depois == antes
    assert exportar(abrir, rascunho) == revisao
    assert publicar(abrir, rascunho)["situacao"] == "publicada"


@contextmanager
def _consultas(sessao):
    consultas = []
    conexao = sessao.connection()

    def registrar(conn, cursor, sql, parametros, contexto, muitos):
        if sql.startswith("SELECT"):
            consultas.append(sql)

    event.listen(conexao, "before_cursor_execute", registrar)
    try:
        yield consultas
    finally:
        event.remove(conexao, "before_cursor_execute", registrar)


def _edicao_publicada(sessao, votacoes_):
    fonte = votacoes_[0].fonte
    fatos = Fatos(
        proposicoes=[v.proposicoes[0].id for v in votacoes_],
        votacoes=[
            FatoVotacao(id=v.id, data=v.data, resultado=v.resultado, placar=None, fontes=[fonte.id])
            for v in votacoes_
        ],
        fontes=[fonte.id],
        origem="revisao",
        pendencias=[],
    )
    edicao = Edicao(
        titulo="Edição fictícia",
        inicio=INICIO,
        fim=FIM,
        estado="publicada",
        publicada_em=datetime(2026, 11, 16, tzinfo=UTC),
        itens=[
            ItemEdicao(
                ordem=1,
                titulo="Item fictício",
                texto="Texto fictício.",
                fonte=fonte,
                fatos=fatos.model_dump(mode="json"),
            )
        ],
    )
    sessao.add(edicao)
    sessao.flush()
    return edicao.id


def test_leitura_dos_temas_faz_uma_consulta_com_uma_ou_varias_votacoes(sessao, dados, cliente):
    votacoes_ = [dados(numero) for numero in range(1, 21)]
    for votacao in votacoes_:
        _associar(sessao, votacao.proposicoes[0], "saude")
    pessoa = _pessoa(sessao, *votacoes_)
    pequena = _edicao_publicada(sessao, votacoes_[:1])
    grande = _edicao_publicada(sessao, votacoes_[:13])

    def extrair_edicao(corpo):
        return corpo["itens"][0]["fatos"]["votacoes"]

    def extrair_votos(corpo):
        return corpo["votos"]

    for rota_curta, rota_longa, total_longa, extrair in (
        (f"/edicoes/{pequena}", f"/edicoes/{grande}", 13, extrair_edicao),
        (
            f"/parlamentares/{pessoa.id}/votos?limite=1",
            f"/parlamentares/{pessoa.id}/votos?limite=20",
            20,
            extrair_votos,
        ),
    ):
        with _consultas(sessao) as consultas_curta:
            uma = extrair(cliente.get(rota_curta).json())
        with _consultas(sessao) as consultas_longa:
            varias = extrair(cliente.get(rota_longa).json())
        assert len(uma) == 1 and len(varias) == total_longa
        assert all(v["temas"] == [SAUDE] for v in uma + varias)
        assert len(consultas_curta) == len(consultas_longa)
        for consultas in (consultas_curta, consultas_longa):
            assert sum("proposicao_tema" in sql for sql in consultas) == 1
