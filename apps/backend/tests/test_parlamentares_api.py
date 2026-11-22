from datetime import UTC, date, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from mandatometro.api.app import app
from mandatometro.db.modelos import Fonte, Mandato, Parlamentar, Proposicao, Votacao, Voto


@pytest.fixture
def cliente(sessao, monkeypatch):
    conexao = sessao.connection()
    monkeypatch.setattr("mandatometro.db.engine", lambda: conexao)
    return TestClient(app)


@pytest.fixture
def parlamentares(sessao):
    fonte = Fonte(url="https://dadosabertos.camara.leg.br/api/v2/cadastro-ficticio")
    zafira = Parlamentar(casa="camara", id_externo=900003, nome="Zafira Nebluz", fonte=fonte)
    bentina = Parlamentar(casa="senado", id_externo=900002, nome="Bentina Salazul", fonte=fonte)
    agata = Parlamentar(casa="camara", id_externo=900001, nome="Ágata Cedrolume", fonte=fonte)
    zelmo = Parlamentar(casa="senado", id_externo=900004, nome="Zelmo Cardamiz", fonte=fonte)
    sessao.add_all(
        [
            Mandato(parlamentar=zafira, legislatura=57, uf="RJ", em_exercicio=True, fonte=fonte),
            Mandato(parlamentar=bentina, legislatura=56, uf="SC", em_exercicio=True, fonte=fonte),
            Mandato(
                parlamentar=agata,
                legislatura=57,
                uf="SC",
                condicao="Titular",
                em_exercicio=True,
                fonte=fonte,
            ),
            Mandato(parlamentar=agata, legislatura=56, uf="PR", em_exercicio=False, fonte=fonte),
            Mandato(parlamentar=zelmo, legislatura=55, uf="SC", em_exercicio=False, fonte=fonte),
        ]
    )
    sessao.flush()
    return agata, bentina, zafira, zelmo


@pytest.fixture
def votacoes(sessao, parlamentares):
    agata, _, zafira, _ = parlamentares
    fonte = Fonte(
        url="https://dadosabertos.camara.leg.br/api/v2/votacoes/ficticia",
        url_publica="https://www.camara.leg.br/evento-legislativo/ficticio",
        coletado_em=datetime(2026, 11, 21, tzinfo=UTC),
    )
    apenas_coleta = Fonte(url="https://dadosabertos.camara.leg.br/api/v2/votacoes/legada")
    sem_endereco = Fonte(url="")
    fonte_dos_votos = Fonte(url="https://dadosabertos.camara.leg.br/api/v2/votacoes/ficticia/votos")
    proposicoes = [
        Proposicao(casa="camara", id_externo=900101, sigla="PL", numero=812, ano=2026, fonte=fonte),
        Proposicao(
            casa="camara",
            id_externo=900102,
            sigla="PEC",
            numero=98,
            ano=2026,
            ementa="Disciplina o cadastro fictício.",
            fonte=fonte,
        ),
    ]
    presidencia = Votacao(
        casa="camara",
        id_externo="900001-1",
        data=date(2026, 11, 20),
        descricao="Discussão do texto fictício.",
        resultado="aprovada",
        fonte=fonte,
        proposicoes=proposicoes,
    )
    antiga = Votacao(
        casa="camara",
        id_externo="900001-2",
        data=date(2026, 11, 18),
        descricao="Votação da redação fictícia.",
        resultado="rejeitada",
        fonte=sem_endereco,
    )
    mesmo_dia = Votacao(
        casa="camara",
        id_externo="900001-3",
        data=date(2026, 11, 20),
        descricao="Votação do recurso fictício.",
        resultado="outro",
        fonte=apenas_coleta,
    )
    sem_votos = Votacao(
        casa="camara",
        id_externo="900001-4",
        data=date(2026, 11, 21),
        descricao="Votação fictícia sem votos gravados.",
        resultado="aprovada",
        fonte=fonte,
    )
    so_outra_pessoa = Votacao(
        casa="camara",
        id_externo="900001-5",
        data=date(2026, 11, 17),
        descricao="Votação fictícia com o voto de outra pessoa.",
        resultado="rejeitada",
        fonte=fonte,
    )
    sessao.add_all([presidencia, antiga, mesmo_dia, sem_votos, so_outra_pessoa])
    sessao.flush()
    sessao.add_all(
        [
            Voto(
                parlamentar=pessoa,
                votacao=votacao,
                valor=valor,
                valor_bruto=bruto,
                partido=partido,
                uf="PR",
                fonte=fonte_dos_votos,
            )
            for pessoa, votacao, valor, bruto, partido in [
                (agata, presidencia, "presidente", "Artigo 17", "PFN"),
                (agata, antiga, "sim", "Sim", "PFA"),
                (agata, mesmo_dia, "nao_votou", "P-NRV", "PFT"),
                (zafira, antiga, "nao", "Não", "PFA"),
                (zafira, presidencia, "abstencao", "Abstenção", None),
                (zafira, so_outra_pessoa, "nao", "Não", "PFA"),
            ]
        ]
    )
    sessao.flush()
    return mesmo_dia, presidencia, antiga


@pytest.mark.parametrize(
    ("filtros", "indices"),
    [
        ({}, [0, 1, 2]),
        ({"uf": "SC"}, [0, 1]),
        ({"uf": "PR"}, []),
        ({"casa": "camara"}, [0, 2]),
        ({"casa": "senado"}, [1]),
        ({"uf": "SC", "casa": "senado"}, [1]),
    ],
)
def test_lista_os_parlamentares_em_exercicio_por_nome(cliente, parlamentares, filtros, indices):
    resposta = cliente.get("/parlamentares", params=filtros)

    assert resposta.status_code == 200
    assert [p["id"] for p in resposta.json()["parlamentares"]] == [
        parlamentares[i].id for i in indices
    ]


def test_partido_e_o_do_ultimo_voto_e_a_uf_e_a_do_mandato(cliente, parlamentares, votacoes):
    resposta = cliente.get("/parlamentares")

    assert resposta.status_code == 200
    agata, bentina, zafira = resposta.json()["parlamentares"]
    assert agata == {
        "id": parlamentares[0].id,
        "nome": parlamentares[0].nome,
        "uf": "SC",
        "casa": "camara",
        "partido": "PFT",
    }
    assert bentina["partido"] is None
    assert zafira["partido"] is None


def test_detalhe_traz_mandatos_e_conta_apenas_os_votos_da_pessoa(cliente, parlamentares, votacoes):
    agata, _, zafira, _ = parlamentares

    resposta = cliente.get(f"/parlamentares/{agata.id}")

    assert resposta.status_code == 200
    assert resposta.json() == {
        "id": agata.id,
        "nome": agata.nome,
        "casa": "camara",
        "uf": "SC",
        "partido": "PFT",
        "mandatos": [
            {"legislatura": 57, "uf": "SC", "condicao": "Titular", "em_exercicio": True},
            {"legislatura": 56, "uf": "PR", "condicao": None, "em_exercicio": False},
        ],
        "contagem_votos": {
            "sim": 1,
            "nao": 0,
            "abstencao": 0,
            "obstrucao": 0,
            "presidente": 1,
            "nao_votou": 1,
            "outro": 0,
        },
    }
    outra = cliente.get(f"/parlamentares/{zafira.id}")
    assert outra.status_code == 200
    assert outra.json()["contagem_votos"]["nao"] == 2


def test_parlamentar_fora_de_exercicio_pode_ser_consultado(cliente, parlamentares):
    zelmo = parlamentares[3]
    url = f"/parlamentares/{zelmo.id}"

    resposta = cliente.get(url)

    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["id"] == zelmo.id
    assert dados["uf"] == "SC"
    assert [m["em_exercicio"] for m in dados["mandatos"]] == [False]
    assert len(dados["contagem_votos"]) == 7
    assert set(dados["contagem_votos"].values()) == {0}

    votos = cliente.get(f"{url}/votos")
    assert votos.status_code == 200
    assert votos.json() == {"votos": [], "total": 0, "limite": 20, "deslocamento": 0}


def test_votos_paginados_por_data_e_id_com_proposicoes_e_fontes(cliente, parlamentares, votacoes):
    url = f"/parlamentares/{parlamentares[0].id}/votos"
    mesmo_dia, presidencia, antiga = votacoes

    resposta = cliente.get(url, params={"limite": 2})

    assert resposta.status_code == 200
    pagina = resposta.json()
    assert (pagina["total"], pagina["limite"], pagina["deslocamento"]) == (3, 2, 0)
    recente, presidente = pagina["votos"]
    assert (recente["votacao_id"], recente["valor"], recente["resultado"]) == (
        mesmo_dia.id,
        "nao_votou",
        "outro",
    )
    assert recente["url_oficial"] == mesmo_dia.fonte.url
    assert recente["proposicoes"] == []
    assert presidente == {
        "votacao_id": presidencia.id,
        "data": "2026-11-20",
        "descricao": "Discussão do texto fictício.",
        "resultado": "aprovada",
        "valor": "presidente",
        "proposicoes": [
            {"sigla": "PL", "numero": 812, "ano": 2026, "ementa": None},
            {
                "sigla": "PEC",
                "numero": 98,
                "ano": 2026,
                "ementa": "Disciplina o cadastro fictício.",
            },
        ],
        "url_oficial": presidencia.fonte.url_publica,
        "coletado_em": "2026-11-21T00:00:00Z",
    }
    assert "valor_bruto" not in recente
    assert "P-NRV" not in resposta.text

    segunda = cliente.get(url, params={"limite": 2, "deslocamento": 2})
    assert segunda.status_code == 200
    pagina = segunda.json()
    assert (pagina["total"], pagina["limite"], pagina["deslocamento"]) == (3, 2, 2)
    assert [v["votacao_id"] for v in pagina["votos"]] == [antiga.id]
    assert pagina["votos"][0]["url_oficial"] is None

    alem_do_fim = cliente.get(url, params={"deslocamento": 3})
    assert alem_do_fim.status_code == 200
    assert alem_do_fim.json() == {"votos": [], "total": 3, "limite": 20, "deslocamento": 3}


@pytest.mark.parametrize("url", ["/parlamentares/900000", "/parlamentares/900000/votos"])
def test_id_desconhecido_tem_404_fixo(cliente, url):
    resposta = cliente.get(url)

    assert resposta.status_code == 404
    assert resposta.json() == {"erro": "parlamentar_nao_encontrado"}


@pytest.mark.parametrize(
    "url",
    [
        "/parlamentares?uf=XX",
        "/parlamentares?uf=EX",
        "/parlamentares?casa=casa-ficticia",
        "/parlamentares/0",
        "/parlamentares/id-ficticio/votos",
        "/parlamentares/1/votos?limite=101",
        "/parlamentares/1/votos?deslocamento=-1",
    ],
)
def test_entrada_invalida_tem_422_fixo(url):
    resposta = TestClient(app).get(url)

    assert resposta.status_code == 422
    assert resposta.json() == {"erro": "dados_invalidos"}


@pytest.mark.parametrize("url", ["/parlamentares", "/parlamentares/1", "/parlamentares/1/votos"])
def test_falha_do_banco_tem_503_fixo(monkeypatch, caplog, url):
    def banco_indisponivel():
        raise OperationalError("SELECT dado_ficticio", {}, RuntimeError("banco.interno.example"))

    monkeypatch.setattr("mandatometro.db.engine", banco_indisponivel)

    resposta = TestClient(app).get(url)

    assert resposta.status_code == 503
    assert resposta.json() == {"erro": "servico_indisponivel"}
    assert "dado_ficticio" not in caplog.text
    assert "banco.interno.example" not in caplog.text
