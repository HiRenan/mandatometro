import json
from datetime import date
from pathlib import Path

import pytest
from pydantic import ValidationError
from test_edicao_revisao import abrir as abrir
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.db.modelos import Edicao, ItemEdicao
from mandatometro.ia.esquemas import Fatos, FatoVotacao, Placar
from mandatometro.ia.servico import exportar, publicar, revisar

FATOS_ATO = {
    "versao": 2,
    "ato_id": 17,
    "data_publicacao": "2026-11-12",
    "fontes": [27],
    "hash_ato": "a" * 64,
    "origem": "codigo",
    "pendencias": ["revisao", "cobertura"],
}


@pytest.fixture
def gravado_na_v1():
    caminho = Path(__file__).parent / "fixtures" / "fatos-votacao-v1.json"
    return json.loads(caminho.read_text(encoding="utf-8"))


def test_le_fatos_gravados_na_v1_sem_conversao(sessao, abrir, dados, gravado_na_v1):
    nominal = dados(10, valores=("sim", "presidente"))
    sem_placar = dados(20, dia=11, proposicoes=nominal.proposicoes, resultado="outro")
    proposicao = nominal.proposicoes[0]
    # Ajusta os ids da fotografia antiga às chaves geradas pelo banco de teste.
    gravado_na_v1["proposicoes"] = [proposicao.id]
    gravado_na_v1["fontes"] = sorted([nominal.fonte_id, sem_placar.fonte_id, proposicao.fonte_id])
    for fato, votacao in zip(gravado_na_v1["votacoes"], (nominal, sem_placar), strict=True):
        fato["id"] = votacao.id
        fato["fontes"] = [votacao.fonte_id]
    item = ItemEdicao(
        ordem=1,
        titulo="Proposta fictícia",
        texto="Uma explicação para o teste.",
        fonte=sem_placar.fonte,
        fatos=gravado_na_v1,
    )
    edicao = Edicao(titulo="Edição fictícia", inicio=INICIO, fim=FIM, itens=[item])
    sessao.add(edicao)
    sessao.flush()
    sessao.expire(item, ["fatos"])

    lidos = Fatos.ler(item.fatos)
    assert lidos.votacoes[0].data == date(2026, 11, 10)
    assert lidos.votacoes[1].placar is None
    assert lidos.model_dump(mode="json") == item.fatos == gravado_na_v1

    sem_versao = {k: v for k, v in item.fatos.items() if k != "versao"}
    assert Fatos.ler(sem_versao) == lidos

    arquivo = exportar(abrir, edicao.id)
    assert arquivo["itens"][0]["fatos"] == gravado_na_v1
    assert revisar(abrir, edicao.id, pronto(arquivo))["pendencias"] == []
    assert publicar(abrir, edicao.id)["situacao"] == "publicada"


def test_dump_de_votacao_permanece_igual_ao_da_v1(gravado_na_v1):
    novos = Fatos(
        proposicoes=[101],
        votacoes=[
            FatoVotacao(
                id=201,
                data=date(2026, 11, 10),
                resultado="aprovada",
                placar=Placar(sim=1, presidente=1),
                fontes=[301],
            ),
            FatoVotacao(
                id=202,
                data=date(2026, 11, 11),
                resultado="outro",
                placar=None,
                fontes=[302],
            ),
        ],
        fontes=[301, 302, 303],
        origem="revisao",
        pendencias=["cobertura"],
    )
    assert novos.model_dump_json() == json.dumps(gravado_na_v1, separators=(",", ":"))


def test_le_fatos_de_ato_sem_proposicao_e_sem_votacao():
    fatos = Fatos.ler(FATOS_ATO)
    assert fatos.ato_id == 17
    assert fatos.data_publicacao == date(2026, 11, 12)
    assert fatos.model_dump(mode="json") == FATOS_ATO


@pytest.mark.parametrize(
    "mudanca",
    [
        {"votacoes": []},
        {"proposicoes": []},
        {"placar": {"sim": 1}},
        {"fontes": []},
        {"ato_id": 0},
        {"ato_id": "17"},
        {"data_publicacao": "12/11/2026"},
        {"hash_ato": "Não é um hash."},
        {"versao": 1},
    ],
)
def test_recusa_fatos_de_ato_misturados_ou_invalidos(mudanca):
    Fatos.ler(FATOS_ATO)
    with pytest.raises(ValidationError):
        Fatos.ler(FATOS_ATO | mudanca)


@pytest.mark.parametrize(
    "campo", ["titulo", "ementa", "trecho", "pessoa", "partido", "voto", "ausencia"]
)
def test_fatos_de_ato_recusam_texto_oficial_e_dados_de_pessoas(campo):
    Fatos.ler(FATOS_ATO)
    with pytest.raises(ValidationError):
        Fatos.ler(FATOS_ATO | {campo: "Dado inventado."})


@pytest.mark.parametrize("campo", ["versao", "ato_id", "data_publicacao", "fontes", "hash_ato"])
def test_fatos_de_ato_exigem_versao_identificacao_data_fontes_e_hash(campo):
    with pytest.raises(ValidationError):
        Fatos.ler({k: v for k, v in FATOS_ATO.items() if k != campo})


def test_recusa_v1_sem_votacao_e_versao_sem_origem_factual(gravado_na_v1):
    with pytest.raises(ValidationError):
        Fatos.ler(gravado_na_v1 | {"votacoes": []})
    with pytest.raises(ValidationError):
        Fatos.ler(gravado_na_v1 | {"ato_id": 17})
    with pytest.raises(ValidationError):
        Fatos.ler({"versao": 2, "fontes": [27]})
