"""Leitura pública da fotografia editorial, sem expor o contrato interno de revisão."""

from datetime import UTC, date, datetime, timedelta
from os import environ

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.orm import Session

from mandatometro.api.app import app
from mandatometro.config import config
from mandatometro.db import engine
from mandatometro.db.modelos import Edicao, Fonte, ItemEdicao
from mandatometro.ia.artigos import CATALOGO
from mandatometro.ia.esquemas import Fatos, FatosAto, FatoVotacao, Placar


@pytest.fixture
def publicadas(engine_de_teste, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", environ["TEST_DATABASE_URL"])
    config.cache_clear()
    engine.cache_clear()
    criadas = []
    fontes = []

    def criar(*, estado="publicada", dias=0, fatos=False, com_ato=False):
        with Session(engine_de_teste, expire_on_commit=False) as sessao, sessao.begin():
            principal = Fonte(
                url="https://dadosabertos.camara.leg.br/api/v2/votacoes/ficticia",
                url_publica="https://www.camara.leg.br/evento-legislativo/ficticio",
                coletado_em=datetime(2026, 11, 14, tzinfo=UTC),
                trecho="Trecho fictício <b>sem HTML executável</b>.",
            )
            outra = Fonte(
                url="https://www.camara.leg.br/proposicoesWeb/ficha-ficticia",
                coletado_em=datetime(2026, 11, 13, tzinfo=UTC),
            )
            sessao.add_all([principal, outra])
            sessao.flush()
            fontes.extend([principal.id, outra.id])
            fotografia = Fatos(
                proposicoes=[999999],
                votacoes=[
                    FatoVotacao(
                        id=888888,
                        data=date(2026, 11, 12),
                        resultado="aprovada",
                        placar=Placar(sim=20, nao=10, presidente=1),
                        fontes=[principal.id, outra.id],
                    ),
                    FatoVotacao(
                        id=777777,
                        data=date(2026, 11, 13),
                        resultado="outro",
                        placar=None,
                        fontes=[outra.id],
                    ),
                ],
                fontes=[principal.id, outra.id],
                origem="revisao",
                pendencias=[],
            ).model_dump(mode="json")
            edicao = Edicao(
                titulo=f"Edição fictícia {dias}",
                inicio=date(2026, 11, 9),
                fim=date(2026, 11, 15),
                estado=estado,
                publicada_em=datetime(2026, 11, 15, tzinfo=UTC) + timedelta(days=dias)
                if estado == "publicada"
                else None,
                itens=[
                    ItemEdicao(
                        ordem=2,
                        titulo="Segundo item",
                        texto="Texto antigo.",
                        fonte=principal,
                    ),
                    ItemEdicao(
                        ordem=1,
                        titulo="Primeiro item",
                        texto="Um parágrafo.\n\nOutro parágrafo.",
                        fonte=principal,
                        fatos=fotografia if fatos else None,
                        artigo_caminho=next(iter(CATALOGO)) if fatos else None,
                    ),
                ],
            )
            if com_ato:
                edicao.itens[0].ordem = 3
                fonte_ato = Fonte(
                    url="https://www.senado.leg.br/dados/ato-ficticio",
                    url_publica="https://www.in.gov.br/ato-ficticio",
                    coletado_em=datetime(2026, 11, 16, tzinfo=UTC),
                    trecho="Trecho fictício reservado.",
                )
                sessao.add(fonte_ato)
                sessao.flush()
                fontes.append(fonte_ato.id)
                edicao.itens.append(
                    ItemEdicao(
                        ordem=2,
                        titulo="Ato fictício",
                        texto="Explicação editorial fictícia.",
                        fonte=fonte_ato,
                        fatos=FatosAto(
                            versao=2,
                            ato_id=989898,
                            data_publicacao=date(2026, 11, 12),
                            fontes=[fonte_ato.id],
                            hash_ato="b" * 64,
                            origem="revisao",
                            pendencias=[],
                        ).model_dump(mode="json"),
                    )
                )
            sessao.add(edicao)
            sessao.flush()
            criadas.append(edicao.id)
        return edicao

    yield criar
    with engine_de_teste.begin() as conexao:
        conexao.execute(delete(ItemEdicao).where(ItemEdicao.edicao_id.in_(criadas)))
        conexao.execute(delete(Edicao).where(Edicao.id.in_(criadas)))
        conexao.execute(delete(Fonte).where(Fonte.id.in_(fontes)))
    engine().dispose()
    engine.cache_clear()
    config.cache_clear()


def test_lista_publicadas_paginada_e_ordenada(publicadas):
    antiga = publicadas(dias=-7)
    primeira = publicadas()
    recente = publicadas()
    publicadas(estado="rascunho", dias=1)
    cliente = TestClient(app)
    resposta = cliente.get("/edicoes?limite=2")
    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["total"] == 3
    assert dados["limite"] == 2 and dados["deslocamento"] == 0
    assert [e["id"] for e in dados["edicoes"]] == [recente.id, primeira.id]
    assert set(dados["edicoes"][0]) == {"id", "titulo", "inicio", "fim", "publicada_em"}
    pagina = cliente.get("/edicoes?limite=2&deslocamento=2").json()
    assert [e["id"] for e in pagina["edicoes"]] == [antiga.id]


def test_detalhe_preserva_fotografia_fontes_artigo_e_legado(publicadas):
    edicao = publicadas(fatos=True)
    resposta = TestClient(app).get(f"/edicoes/{edicao.id}")
    assert resposta.status_code == 200
    dados = resposta.json()
    primeiro, antigo = dados["itens"]
    assert [i["ordem"] for i in dados["itens"]] == [1, 2]
    assert [i["tipo"] for i in dados["itens"]] == ["votacao", "votacao"]
    assert primeiro["texto"] == "Um parágrafo.\n\nOutro parágrafo."
    assert primeiro["artigo"] == {
        "caminho": next(iter(CATALOGO)),
        "titulo": next(iter(CATALOGO.values())),
    }
    nominal, sem_placar = primeiro["fatos"]["votacoes"]
    assert [nominal["id"], sem_placar["id"]] == [888888, 777777]
    assert nominal["placar"] == {
        "sim": 20,
        "nao": 10,
        "abstencao": 0,
        "obstrucao": 0,
        "presidente": 1,
    }
    assert nominal["data"] == "2026-11-12"
    assert sem_placar["placar"] is None and sem_placar["resultado"] == "outro"
    assert len(primeiro["fontes"]) == len(nominal["fontes"]) == 2
    assert primeiro["fontes"][0]["url"].startswith("https://www.camara.leg.br/")
    assert primeiro["fontes"][0]["coletado_em"] == "2026-11-14T00:00:00Z"
    assert primeiro["fontes"][0]["trecho"] == "Trecho fictício <b>sem HTML executável</b>."
    assert antigo["fatos"] is None and antigo["artigo"] is None
    assert set(primeiro) == {"ordem", "tipo", "titulo", "texto", "fatos", "fontes", "artigo"}
    assert set(nominal) == {"id", "data", "resultado", "placar", "fontes"}
    assert set(primeiro["fontes"][0]) == {"url", "coletado_em", "trecho"}
    for proibido in (
        '"pendencias":',
        '"origem":',
        '"proposicoes":',
        "999999",
        '"versao":',
    ):
        assert proibido not in resposta.text


def test_rascunho_e_inexistente_tem_mesmo_404(publicadas):
    rascunho = publicadas(estado="rascunho")
    cliente = TestClient(app)
    for edicao_id in (rascunho.id, 999999):
        resposta = cliente.get(f"/edicoes/{edicao_id}")
        assert resposta.status_code == 404
        assert resposta.json() == {"erro": "edicao_nao_encontrada"}
    assert cliente.get("/edicoes").json()["edicoes"] == []


def test_detalhe_publica_fotografia_do_ato_com_a_pagina_oficial(publicadas):
    edicao = publicadas(fatos=True, com_ato=True)

    resposta = TestClient(app).get(f"/edicoes/{edicao.id}")

    assert resposta.status_code == 200
    votacao, ato, antigo = resposta.json()["itens"]
    assert [(item["ordem"], item["tipo"]) for item in (votacao, ato, antigo)] == [
        (1, "votacao"),
        (2, "ato"),
        (3, "votacao"),
    ]
    assert set(votacao["fatos"]) == {"votacoes"}
    assert antigo["fatos"] is None
    assert ato == {
        "ordem": 2,
        "tipo": "ato",
        "titulo": "Ato fictício",
        "texto": "Explicação editorial fictícia.",
        "fatos": {"votacoes": [], "data_publicacao": "2026-11-12"},
        "fontes": [
            {
                "url": "https://www.in.gov.br/ato-ficticio",
                "coletado_em": "2026-11-16T00:00:00Z",
                "trecho": None,
            }
        ],
        "artigo": None,
    }


def test_ato_sem_pagina_oficial_nao_devolve_o_endereco_da_coleta(publicadas, engine_de_teste):
    edicao = publicadas(com_ato=True)
    with Session(engine_de_teste) as sessao, sessao.begin():
        sessao.get(Fonte, edicao.itens[-1].fonte_id).url_publica = None

    resposta = TestClient(app).get(f"/edicoes/{edicao.id}")

    assert resposta.status_code == 503
    assert resposta.json() == {"erro": "servico_indisponivel"}


@pytest.mark.parametrize(
    "url",
    [
        "/edicoes/0",
        "/edicoes/pessoa@example.com",
        "/edicoes?limite=101",
        "/edicoes?deslocamento=-1",
    ],
)
def test_parametros_invalidos_nao_refletem_entrada(url):
    resposta = TestClient(app).get(url)
    assert resposta.status_code == 422
    assert resposta.json() == {"erro": "dados_invalidos"}


def test_fonte_invalida_nao_devolve_conteudo_parcial(publicadas, engine_de_teste, caplog):
    edicao = publicadas(fatos=True)
    with Session(engine_de_teste) as sessao, sessao.begin():
        sessao.get(Fonte, edicao.itens[0].fonte_id).url_publica = "javascript:segredo-ficticio"
    resposta = TestClient(app).get(f"/edicoes/{edicao.id}")
    assert resposta.status_code == 503
    assert resposta.json() == {"erro": "servico_indisponivel"}
    assert "segredo-ficticio" not in resposta.text + caplog.text
