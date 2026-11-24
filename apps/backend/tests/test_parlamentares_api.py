import json
import re
from collections import Counter
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError

from mandatometro.api.app import app
from mandatometro.db.modelos import (
    BemDeclarado,
    CandidaturaPatrimonio,
    Edicao,
    Fonte,
    IpcaMensal,
    ItemEdicao,
    Mandato,
    Parlamentar,
    Proposicao,
    ProposicaoTema,
    Votacao,
    Voto,
)
from mandatometro.ia.selecao import selecionar

FIXTURES = Path(__file__).parent / "fixtures"


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


def test_lista_usa_a_uf_do_mandato_em_exercicio_de_maior_legislatura(
    cliente, sessao, parlamentares
):
    agata, bentina, _, _ = parlamentares
    sessao.add(
        Mandato(parlamentar=agata, legislatura=55, uf="PR", em_exercicio=True, fonte=agata.fonte)
    )
    sessao.flush()

    nacional = cliente.get("/parlamentares")
    assert nacional.status_code == 200
    assert [p["uf"] for p in nacional.json()["parlamentares"] if p["id"] == agata.id] == ["SC"]

    por_sc = cliente.get("/parlamentares", params={"uf": "SC"})
    assert por_sc.status_code == 200
    assert [p["id"] for p in por_sc.json()["parlamentares"]] == [agata.id, bentina.id]

    por_pr = cliente.get("/parlamentares", params={"uf": "PR"})
    assert por_pr.status_code == 200
    assert por_pr.json() == {"parlamentares": []}


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
        "foto": {
            "url": f"https://www.camara.leg.br/internet/deputado/bandep/{parlamentares[0].id_externo}.jpg",
            "credito": "Câmara dos Deputados",
        },
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
        "foto": {
            "url": f"https://www.camara.leg.br/internet/deputado/bandep/{agata.id_externo}.jpg",
            "credito": "Câmara dos Deputados",
        },
        "uf": "SC",
        "partido": "PFT",
        "partido_nome": None,
        "biografia": None,
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
        "com_o_partido": {"comparaveis": 0, "com_o_partido": 0, "contra": 0},
    }
    outra = cliente.get(f"/parlamentares/{zafira.id}")
    assert outra.status_code == 200
    assert outra.json()["contagem_votos"]["nao"] == 2


@pytest.mark.parametrize(
    ("indice", "credito"), [(0, "Câmara dos Deputados"), (1, "Senado Federal")]
)
def test_lista_e_detalhe_trazem_a_mesma_foto_oficial(cliente, parlamentares, indice, credito):
    pessoa = parlamentares[indice]
    if pessoa.casa == "camara":
        gravado = json.loads(
            (FIXTURES / "camara/deputados-atuais-pagina-curta.json").read_text(encoding="utf-8")
        )
        foto = gravado["dados"][0]["urlFoto"]
        esperado = re.sub(r"[0-9]+(?=\.jpg$)", str(pessoa.id_externo), foto)
    else:
        gravado = json.loads(
            (FIXTURES / "senado/senador-lista-atual.json").read_text(encoding="utf-8")
        )
        pessoas = gravado["ListaParlamentarEmExercicio"]["Parlamentares"]["Parlamentar"]
        foto = pessoas[0]["IdentificacaoParlamentar"]["UrlFotoParlamentar"]
        legado = "http://www.senado.leg.br/senadores/img/fotos-oficiais/senador"
        destino = "https://legis.senado.leg.br/senadores/fotos-oficiais/"
        url_ficticia = re.sub(r"[0-9]+(?=\.jpg$)", str(pessoa.id_externo), foto)
        assert url_ficticia.startswith(legado)
        esperado = url_ficticia.replace(legado, destino).removesuffix(".jpg")

    resposta = cliente.get(f"/parlamentares/{pessoa.id}")
    assert resposta.status_code == 200
    assert resposta.json()["foto"] == {"url": esperado, "credito": credito}
    lista = cliente.get("/parlamentares", params={"uf": "SC"})
    assert lista.status_code == 200
    item = next(p for p in lista.json()["parlamentares"] if p["id"] == pessoa.id)
    assert item["foto"] == resposta.json()["foto"]


def _cadastrar_eleicoes(sessao, parlamentar_id, totais, taxas):
    fonte = Fonte(url="https://dados.example/patrimonio")
    for ano, total in totais.items():
        eleicao = CandidaturaPatrimonio(
            ano=ano,
            cargo=6,
            codigo_eleicao=ano,
            id_externo=1,
            uf="SC",
            parlamentar_id=parlamentar_id,
            fonte_candidatura=fonte,
            fonte_bens=fonte,
        )
        sessao.add(eleicao)
        sessao.flush()
        if total is not None:
            sessao.add(BemDeclarado(candidatura_id=eleicao.id, tipo=11, valor_centavos=total))
    sessao.add_all(
        IpcaMensal(mes=mes, variacao_percentual=Decimal(taxa), fonte=fonte)
        for mes, taxa in taxas.items()
    )
    sessao.flush()


def _meses_com_taxa_zero(inicio, fim):
    return {
        mes: "0.00"
        for ano in range(inicio, fim + 1)
        for numero in range(1, 13)
        if date(inicio, 10, 1) <= (mes := date(ano, numero, 1)) <= date(fim, 10, 1)
    }


@pytest.mark.parametrize(
    ("taxas", "fator", "alta"),
    [
        (("0.50", "1.00"), "1.0151", "1.5"),
        (("-2.05",), "0.9795", "-2.1"),
        (("0.25", "-0.20"), "1.0005", "0.0"),
    ],
)
def test_patrimonio_arredonda_fator_e_alta_do_ipca(
    cliente, parlamentares, sessao, taxas, fator, alta
):
    pessoa = parlamentares[0]
    meses = {date(2026, mes, 1): taxa for mes, taxa in enumerate(taxas, start=10)}
    _cadastrar_eleicoes(sessao, pessoa.id, {2026: None}, meses)

    resposta = cliente.get(f"/parlamentares/{pessoa.id}/patrimonio")
    assert resposta.status_code == 200
    (eleicao,) = resposta.json()["eleicoes"]
    assert eleicao["fator_ipca"] == fator
    assert eleicao["alta_ipca_percentual"] == alta
    assert eleicao["total_corrigido_centavos"] is None
    assert eleicao["resultado"] is None


@pytest.mark.parametrize(
    ("anterior", "atual", "diferenca", "percentual"),
    [
        (5_000_000, 5_625_000, 625_000, None),
        (5_000_001, 5_625_001, 625_000, "12.5"),
        (8_000_000, 5_932_000, -2_068_000, "-25.9"),
        (8_000_000, 8_000_000, 0, "0.0"),
    ],
)
def test_variacao_respeita_piso_e_arredondamento(
    cliente, parlamentares, sessao, anterior, atual, diferenca, percentual
):
    pessoa = parlamentares[0]
    _cadastrar_eleicoes(
        sessao, pessoa.id, {2022: anterior, 2026: atual}, _meses_com_taxa_zero(2022, 2026)
    )

    resposta = cliente.get(f"/parlamentares/{pessoa.id}/patrimonio")
    assert resposta.status_code == 200
    primeira, segunda = resposta.json()["eleicoes"]
    assert primeira["variacao"] is None
    assert segunda["variacao"] == {
        "ano_anterior": 2022,
        "diferenca_centavos": diferenca,
        "percentual": percentual,
    }


def test_variacao_pula_eleicao_sem_total_corrigido(cliente, parlamentares, sessao):
    pessoa = parlamentares[0]
    taxas = _meses_com_taxa_zero(2018, 2026)
    taxas[date(2018, 10, 1)] = "2.50"
    _cadastrar_eleicoes(
        sessao,
        pessoa.id,
        {2014: 8_000_000, 2018: 8_000_000, 2022: None, 2026: 9_000_000},
        taxas,
    )

    resposta = cliente.get(f"/parlamentares/{pessoa.id}/patrimonio")
    assert resposta.status_code == 200
    sem_cobertura, primeira, sem_total, ultima = resposta.json()["eleicoes"]
    assert sem_cobertura["fator_ipca"] is None
    assert sem_cobertura["alta_ipca_percentual"] is None
    assert sem_cobertura["variacao"] is primeira["variacao"] is sem_total["variacao"] is None
    assert ultima["variacao"] == {
        "ano_anterior": 2018,
        "diferenca_centavos": 800_000,
        "percentual": "9.8",
    }


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
    assert dados["com_o_partido"] == {"comparaveis": 0, "com_o_partido": 0, "contra": 0}

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
        "partido": "PFN",
        "maioria_do_partido": None,
        "com_o_partido": None,
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
        "temas": [],
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


@pytest.mark.parametrize("casa", ["camara", "senado"])
def test_com_o_partido_no_detalhe_e_nas_paginas_de_votos(cliente, sessao, casa):
    fonte = Fonte(url="https://example.com/votacoes-ficticias")
    pessoas = [
        Parlamentar(casa=casa, id_externo=910000 + i, nome=f"Pessoa fictícia {i}", fonte=fonte)
        for i in range(11)
    ]
    sessao.add_all(pessoas)
    sessao.flush()

    # Sigla na época, voto da pessoa, votos dos colegas, maioria e comparação.
    casos = [
        ("PFA", "nao", ["sim"] * 4, "sim", False),
        ("PFA", "sim", ["sim", "nao"], None, None),
        ("PFA", "nao", ["nao", "nao_votou", "presidente", "outro"], None, None),
        ("PFA", "nao_votou", ["sim"] * 2, "sim", None),
        ("PFA", "presidente", ["nao"] * 2, "nao", None),
        ("PFA", "outro", ["nao"] * 2, "nao", None),
        (None, "sim", ["sim"] * 2, None, None),
        ("", "sim", ["sim"] * 2, None, None),
        ("   ", "sim", ["sim"] * 2, None, None),
        (
            " PFB ",
            "obstrucao",
            ["obstrucao", "obstrucao", "sim", "abstencao", "nao"],
            "obstrucao",
            True,
        ),
        ("PFB", "abstencao", ["abstencao"] * 2, "abstencao", True),
    ]
    esperado = {}
    for dia, (sigla, valor, colegas, maioria, com_o_partido) in enumerate(casos, start=1):
        votacao = Votacao(
            casa=casa,
            id_externo=f"9100{dia}",
            data=date(2026, 11, dia),
            descricao="Votação fictícia.",
            resultado="aprovada",
            fonte=fonte,
        )
        sessao.add(votacao)
        sessao.add(
            Voto(parlamentar=pessoas[0], votacao=votacao, valor=valor, partido=sigla, fonte=fonte)
        )
        for pessoa, voto in zip(pessoas[1:6], colegas, strict=False):
            sessao.add(
                Voto(
                    parlamentar=pessoa,
                    votacao=votacao,
                    valor=voto,
                    partido=sigla.strip() if sigla else sigla,
                    fonte=fonte,
                )
            )
        sessao.add_all(
            Voto(parlamentar=p, votacao=votacao, valor="nao", partido="PFC", fonte=fonte)
            for p in pessoas[6:]
        )
        sessao.flush()
        esperado[votacao.id] = ((sigla or "").strip() or None, maioria, com_o_partido)

    url = f"/parlamentares/{pessoas[0].id}"
    votos = []
    for deslocamento in range(0, len(casos), 3):
        resposta = cliente.get(f"{url}/votos", params={"limite": 3, "deslocamento": deslocamento})
        assert resposta.status_code == 200
        assert resposta.json()["total"] == len(casos)
        votos.extend(resposta.json()["votos"])

    assert len(votos) == len(casos)
    assert {
        voto["votacao_id"]: (voto["partido"], voto["maioria_do_partido"], voto["com_o_partido"])
        for voto in votos
    } == esperado

    detalhe = cliente.get(url)
    assert detalhe.status_code == 200
    assert detalhe.json()["partido"] == "PFB"
    totais = detalhe.json()["com_o_partido"]
    assert totais == {"comparaveis": 3, "com_o_partido": 2, "contra": 1}
    comparacoes = Counter(voto["com_o_partido"] for voto in votos)
    assert totais == {
        "comparaveis": comparacoes[True] + comparacoes[False],
        "com_o_partido": comparacoes[True],
        "contra": comparacoes[False],
    }


@pytest.fixture(params=["camara", "senado"])
def historico_com_o_partido(sessao, request):
    casa = request.param
    fonte = Fonte(url="https://example.com/votacoes-ficticias")
    pessoa, *colegas = [
        Parlamentar(casa=casa, id_externo=920000 + i, nome=f"Pessoa fictícia {i}", fonte=fonte)
        for i in range(3)
    ]
    proposicao = Proposicao(
        casa=casa, id_externo=920100, sigla="PL", numero=1, ano=2026, fonte=fonte
    )
    sessao.add(proposicao)
    sessao.flush()
    sessao.add(
        ProposicaoTema(proposicao_id=proposicao.id, tema="saude", fonte_id=proposicao.fonte_id)
    )

    # Sigla da pessoa, sigla dos colegas, voto da pessoa e vínculo com o tema saúde.
    casos = {
        "tabulacao": ("\t", "\t", "sim", True),
        "sigla_com_tabulacao": ("\tPFA", "PFA", "nao", True),
        "quebra_de_linha": ("\n\u00a0", "\n\u00a0", "sim", True),
        "sigla_dos_colegas": ("PFA", "\tPFA\n\u00a0", "nao", False),
        "sigla_com_espacos": ("\n\u00a0PFA\t", "PFA", "sim", True),
        "sigla_limpa": ("PFA", "PFA", "sim", False),
        "ausencia": ("PFA", "PFA", "nao_votou", True),
    }
    votacoes = {}
    for dia, (caso, (sigla, sigla_dos_colegas, valor, tem_saude)) in enumerate(casos.items(), 1):
        votacao = Votacao(
            casa=casa,
            id_externo=f"9200{dia}",
            data=date(2026, 11, dia),
            descricao="Votação fictícia.",
            resultado="aprovada",
            fonte=fonte,
            proposicoes=[proposicao] if tem_saude else [],
        )
        sessao.add(
            Voto(parlamentar=pessoa, votacao=votacao, valor=valor, partido=sigla, fonte=fonte)
        )
        sessao.add_all(
            Voto(
                parlamentar=colega,
                votacao=votacao,
                valor="sim",
                partido=sigla_dos_colegas,
                fonte=fonte,
            )
            for colega in colegas
        )
        votacoes[caso] = votacao
    sessao.flush()
    return f"/parlamentares/{pessoa.id}", {caso: votacao.id for caso, votacao in votacoes.items()}


def test_com_o_partido_normaliza_espacos_em_branco_da_sigla(cliente, historico_com_o_partido):
    url, ids = historico_com_o_partido
    resposta = cliente.get(f"{url}/votos")
    assert resposta.status_code == 200
    assert {
        voto["votacao_id"]: (voto["partido"], voto["maioria_do_partido"], voto["com_o_partido"])
        for voto in resposta.json()["votos"]
    } == {
        ids["tabulacao"]: (None, None, None),
        ids["sigla_com_tabulacao"]: ("PFA", "sim", False),
        ids["quebra_de_linha"]: (None, None, None),
        ids["sigla_dos_colegas"]: ("PFA", "sim", False),
        ids["sigla_com_espacos"]: ("PFA", "sim", True),
        ids["sigla_limpa"]: ("PFA", "sim", True),
        ids["ausencia"]: ("PFA", "sim", None),
    }
    assert cliente.get(url).json()["com_o_partido"] == {
        "comparaveis": 4,
        "com_o_partido": 2,
        "contra": 2,
    }


@pytest.mark.parametrize(
    ("com_o_partido", "campo", "casos"),
    [
        (False, "contra", ["sigla_dos_colegas", "sigla_com_tabulacao"]),
        (True, "com_o_partido", ["sigla_limpa", "sigla_com_espacos"]),
    ],
)
def test_filtra_com_o_partido_antes_da_paginacao(
    cliente, historico_com_o_partido, com_o_partido, campo, casos
):
    url, ids = historico_com_o_partido
    esperados = [ids[caso] for caso in casos]
    totais = cliente.get(url).json()["com_o_partido"]
    for deslocamento in range(len(esperados) + 1):
        resposta = cliente.get(
            f"{url}/votos",
            params={"com_o_partido": com_o_partido, "limite": 1, "deslocamento": deslocamento},
        )
        assert resposta.status_code == 200
        pagina = resposta.json()
        assert pagina["total"] == totais[campo] == len(esperados)
        assert pagina["limite"] == 1
        assert pagina["deslocamento"] == deslocamento
        assert [voto["votacao_id"] for voto in pagina["votos"]] == esperados[
            deslocamento : deslocamento + 1
        ]
        assert all(voto["com_o_partido"] is com_o_partido for voto in pagina["votos"])


@pytest.mark.parametrize(
    ("com_o_partido", "caso"), [(False, "sigla_com_tabulacao"), (True, "sigla_com_espacos")]
)
def test_combina_com_o_partido_com_tema(cliente, historico_com_o_partido, com_o_partido, caso):
    url, ids = historico_com_o_partido
    resposta = cliente.get(
        f"{url}/votos",
        params={"com_o_partido": com_o_partido, "tema": "saude", "limite": 1},
    )
    assert resposta.status_code == 200
    pagina = resposta.json()
    assert pagina["total"] == 1
    assert [voto["votacao_id"] for voto in pagina["votos"]] == [ids[caso]]
    assert pagina["votos"][0]["temas"] == [{"id": "saude", "nome": "Saúde"}]


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
            ("Nélvi Ventoluz", "   ", "RN", "obstrucao"),
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
        pessoas[6].id,
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
        "obstrucao",
        "abstencao",
    ]
    assert dados["placar"] == {
        "sim": 2,
        "nao": 1,
        "abstencao": 1,
        "obstrucao": 2,
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
        "temas": [],
        "url_oficial": None,
        "url_video": None,
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
    "rota", ["/parlamentares/{id}", "/parlamentares/{id}/votos", "/votacoes/{id}"]
)
def test_id_acima_do_limite_do_banco_tem_422_fixo(cliente, caplog, rota):
    assert cliente.get(rota.format(id=2_147_483_647)).status_code == 404

    resposta = cliente.get(rota.format(id=2_147_483_648))

    assert resposta.status_code == 422
    assert resposta.json() == {"erro": "dados_invalidos"}
    assert "Banco indisponível" not in caplog.text


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
