from collections import Counter
from datetime import UTC, date, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from mandatometro.api.app import app
from mandatometro.db.modelos import (
    Edicao,
    Fonte,
    ItemEdicao,
    Mandato,
    Parlamentar,
    Proposicao,
    Votacao,
    Voto,
)
from mandatometro.ia.selecao import selecionar


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


def test_votacao_lista_votos_por_nome_e_conta_cada_valor_e_partido(
    cliente, sessao, parlamentares, votacoes
):
    _, votacao, _ = votacoes
    agata, _, zafira, _ = parlamentares
    pessoas = []
    for i, (nome, partido, uf, valor) in enumerate(
        [
            ("Íria Brumazul", "PFN", "GO", "sim"),
            ("Élia Pedralume", "PFA", "AC", "nao"),
            ("Bela Lumivento", "PFA", None, "obstrucao"),
            ("Dália Cedrágua", None, "RJ", "nao_votou"),
            ("Mira Sombravila", "", "CE", "outro"),
            ("bela Lumivento", "PFN", "TO", "sim"),
        ]
    ):
        pessoa = Parlamentar(casa="camara", id_externo=901010 + i, nome=nome, fonte=votacao.fonte)
        sessao.add(
            Voto(
                parlamentar=pessoa,
                votacao=votacao,
                partido=partido,
                uf=uf,
                valor=valor,
                fonte=votacao.fonte,
            )
        )
        pessoas.append(pessoa)
    sessao.flush()

    resposta = cliente.get(f"/votacoes/{votacao.id}")

    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["id"] == votacao.id
    assert (dados["casa"], dados["data"], dados["descricao"], dados["resultado"]) == (
        "camara",
        "2026-11-20",
        votacao.descricao,
        "aprovada",
    )
    assert dados["url_oficial"] == votacao.fonte.url_publica
    assert dados["coletado_em"] == "2026-11-21T00:00:00Z"
    historico = cliente.get(f"/parlamentares/{agata.id}/votos").json()["votos"]
    na_lista = next(v for v in historico if v["votacao_id"] == votacao.id)
    assert len(dados["proposicoes"]) == 2
    assert dados["proposicoes"] == na_lista["proposicoes"]
    votos = dados["votos"]
    assert [v["parlamentar_id"] for v in votos] == [
        agata.id,
        pessoas[2].id,
        pessoas[5].id,
        pessoas[3].id,
        pessoas[1].id,
        pessoas[0].id,
        pessoas[4].id,
        zafira.id,
    ]
    assert votos[0] == {
        "parlamentar_id": agata.id,
        "nome": agata.nome,
        "partido": "PFN",
        "uf": "PR",
        "valor": "presidente",
    }
    assert votos[1]["uf"] is None
    assert [v["valor"] for v in votos if v["partido"] is None] == [
        "nao_votou",
        "outro",
        "abstencao",
    ]
    assert dados["placar"] == {
        "sim": 2,
        "nao": 1,
        "abstencao": 1,
        "obstrucao": 1,
        "presidente": 1,
        "nao_votou": 1,
        "outro": 1,
    }
    assert dados["placar"] == Counter(v["valor"] for v in votos)
    grupos = dados["placar_por_partido"]
    assert [g["partido"] for g in grupos] == ["PFA", "PFN", None]
    for grupo in grupos:
        contagem = Counter(v["valor"] for v in votos if v["partido"] == grupo["partido"])
        assert grupo["placar"] == {valor: contagem[valor] for valor in dados["placar"]}


def test_lista_nominal_inclui_mais_de_cem_votos(cliente, sessao, votacoes):
    _, votacao, _ = votacoes
    for i in range(100):
        pessoa = Parlamentar(
            casa="camara",
            id_externo=950000 + i,
            nome=f"Pessoa Fictícia {i:03}",
            fonte=votacao.fonte,
        )
        sessao.add(Voto(parlamentar=pessoa, votacao=votacao, valor="sim", fonte=votacao.fonte))
    sessao.flush()

    resposta = cliente.get(f"/votacoes/{votacao.id}")

    assert resposta.status_code == 200
    dados = resposta.json()
    assert len(dados["votos"]) == sum(dados["placar"].values()) == 102
    assert dados["placar"]["sim"] == 100


@pytest.mark.parametrize("casa", ["camara", "senado"])
def test_votacao_sem_registros_sem_endereco_e_sem_proposicao(cliente, sessao, casa):
    fonte = Fonte(url="", coletado_em=datetime(2026, 11, 21, tzinfo=UTC))
    votacao = Votacao(
        casa=casa,
        id_externo="901020",
        data=date(2026, 11, 19),
        descricao="Votação fictícia sem registros.",
        resultado="outro",
        fonte=fonte,
    )
    sessao.add(votacao)
    sessao.flush()

    resposta = cliente.get(f"/votacoes/{votacao.id}")

    assert resposta.status_code == 200
    assert resposta.json() == {
        "id": votacao.id,
        "casa": casa,
        "data": "2026-11-19",
        "descricao": votacao.descricao,
        "resultado": "outro",
        "proposicoes": [],
        "url_oficial": None,
        "coletado_em": "2026-11-21T00:00:00Z",
        "placar": {
            "sim": 0,
            "nao": 0,
            "abstencao": 0,
            "obstrucao": 0,
            "presidente": 0,
            "nao_votou": 0,
            "outro": 0,
        },
        "placar_por_partido": [],
        "votos": [],
    }


def test_fonte_da_votacao_usa_o_endereco_coletado_como_reserva(cliente, votacoes):
    mesmo_dia, _, _ = votacoes
    resposta = cliente.get(f"/votacoes/{mesmo_dia.id}")

    assert resposta.status_code == 200
    assert resposta.json()["url_oficial"] == mesmo_dia.fonte.url


def test_edicao_preserva_o_id_dos_fatos_quando_votacao_e_removida(cliente, sessao, votacoes):
    _, votacao, _ = votacoes
    item = selecionar(sessao, votacao.data, votacao.data).itens[0]
    fatos = item.fatos.model_dump(mode="json")
    assert [v["id"] for v in fatos["votacoes"]] == [votacao.id]
    edicao = Edicao(
        titulo="Edição fictícia",
        inicio=votacao.data,
        fim=votacao.data,
        estado="publicada",
        publicada_em=datetime(2026, 11, 21, tzinfo=UTC),
        itens=[
            ItemEdicao(
                ordem=1,
                titulo="Item fictício",
                texto="Texto da edição.",
                fonte=item.principal,
                fatos=fatos,
            )
        ],
    )
    sessao.add(edicao)
    sessao.flush()

    publicada = cliente.get(f"/edicoes/{edicao.id}")
    assert publicada.status_code == 200
    id_publicado = publicada.json()["itens"][0]["fatos"]["votacoes"][0]["id"]
    assert id_publicado == votacao.id
    assert cliente.get(f"/votacoes/{id_publicado}").status_code == 200

    sessao.delete(votacao)
    sessao.flush()

    sem_votacao = cliente.get(f"/votacoes/{id_publicado}")
    assert sem_votacao.status_code == 404
    assert sem_votacao.json() == {"erro": "votacao_nao_encontrada"}
    depois = cliente.get(f"/edicoes/{edicao.id}")
    assert depois.status_code == 200
    assert depois.json() == publicada.json()


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
        "/votacoes/0",
        "/votacoes/id-ficticio",
    ],
)
def test_entrada_invalida_tem_422_fixo(url):
    resposta = TestClient(app).get(url)

    assert resposta.status_code == 422
    assert resposta.json() == {"erro": "dados_invalidos"}


@pytest.mark.parametrize(
    "url", ["/parlamentares", "/parlamentares/1", "/parlamentares/1/votos", "/votacoes/1"]
)
def test_falha_do_banco_tem_503_fixo(monkeypatch, caplog, url):
    def banco_indisponivel():
        raise OperationalError("SELECT dado_ficticio", {}, RuntimeError("banco.interno.example"))

    monkeypatch.setattr("mandatometro.db.engine", banco_indisponivel)

    resposta = TestClient(app).get(url)

    assert resposta.status_code == 503
    assert resposta.json() == {"erro": "servico_indisponivel"}
    assert "dado_ficticio" not in caplog.text
    assert "banco.interno.example" not in caplog.text
