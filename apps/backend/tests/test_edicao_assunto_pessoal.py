import json

import pytest
from sqlalchemy import select
from test_edicao_redacao import Falso
from test_edicao_revisao import abrir as abrir
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.db.modelos import Edicao
from mandatometro.ia.servico import ErroEdicao, exportar, gerar, publicar, revisar


# Regressões B1/B2 do Argos, ampliadas até a exportação e a revisão.
@pytest.mark.parametrize(
    "descricao",
    [
        "Prorroga o periodo em que o parlamentar ficara afastado.",
        "Autoriza o parlamentar a se licenciar do mandato.",
    ],
    ids=["afastado", "licenciar"],
)
def test_ato_pessoal_flexionado_nao_vira_item_nem_material(abrir, dados, sessao, descricao):
    dados(100, descricao=descricao)
    falso = Falso()
    resultado = gerar(abrir, INICIO, FIM, redator=falso)
    assert resultado["situacao"] == "sem_itens_elegiveis"
    assert resultado["assunto_pessoal"] == 1
    assert falso.entradas == []
    assert not list(sessao.scalars(select(Edicao)))
    assert "100-1" not in json.dumps(resultado)


@pytest.mark.parametrize(
    "ementa",
    [
        "Regulamenta a concessao de licenca ambiental a empreendimentos.",
        "Amplia a licenca parental para trabalhadores.",
        "Define direitos no afastamento de trabalhadores vitimas de violencia.",
    ],
    ids=["ambiental", "parental", "trabalhadores"],
)
def test_politica_publica_nao_e_assunto_pessoal(abrir, dados, ementa):
    dados(100, ementa=ementa)
    falso = Falso()
    resultado = gerar(abrir, INICIO, FIM, redator=falso)
    assert resultado["assunto_pessoal"] == 0
    assert resultado["itens"] == 1
    assert len(falso.entradas) == 1
    assert ementa in json.dumps(falso.entradas, ensure_ascii=False)
    edicao_id = resultado["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    assert arquivo["itens"][0]["contexto"]["proposicoes"][0]["ementa"] == ementa
    arquivo["titulo"] = ementa
    arquivo["itens"][0]["titulo"] = ementa
    arquivo["itens"][0]["explicacao"] = [ementa]
    assert revisar(abrir, edicao_id, arquivo)["situacao"] == "revisao_salva"
    assert exportar(abrir, edicao_id)["itens"][0]["explicacao"] == [ementa]
    assert publicar(abrir, edicao_id)["situacao"] == "publicada"


@pytest.mark.parametrize("campo", ["descricao", "ementa"])
@pytest.mark.parametrize(
    "sigla,texto",
    [
        (
            "RQS",
            "Requer, nos termos do art. 43 do Regimento Interno, licença para tratamento de saúde.",
        ),
        ("RQS", "Licença para tratar de interesses particulares."),
        ("REQ", "Licença para tratar de interesses particulares."),
        ("PL", "Requer licença para tratar de interesses particulares."),
        ("PL", "Autoriza o parlamentar a se licenciar do mandato."),
        ("PL", "Prorroga o período em que o parlamentar ficará afastado."),
    ],
    ids=["senado", "sigla_rqs", "sigla_req", "requer", "licenciar", "afastado"],
)
def test_ato_pessoal_fora_do_redator_e_do_arquivo(abrir, dados, campo, sigla, texto):
    dados(100, sigla=sigla, **{campo: texto})
    publica = dados(200)
    falso = Falso()
    resultado = gerar(abrir, INICIO, FIM, redator=falso)
    assert resultado["assunto_pessoal"] == 1
    assert resultado["selecionadas"] == [f"camara:{publica.id_externo}"]
    assert resultado["itens"] == 1
    assert len(falso.entradas) == 1
    assert texto not in json.dumps(falso.entradas, ensure_ascii=False)
    arquivo = exportar(abrir, resultado["edicao_id"])
    assert len(arquivo["itens"]) == 1
    assert texto not in json.dumps(arquivo, ensure_ascii=False)
    assert "100-1" not in json.dumps(arquivo)
    assert "100-1" not in json.dumps(resultado)


@pytest.mark.parametrize("campo", ["titulo_edicao", "titulo_item", "explicacao"])
@pytest.mark.parametrize(
    "texto",
    [
        "O parlamentar ficará afastado.",
        "Autoriza o parlamentar a se licenciar do mandato.",
        "O parlamentar foi hospitalizado.",
        "Requer licença para interesses particulares.",
        "Licença de Pessoa Inventada 100 0.",
        "Licença de ABC-SC.",
    ],
    ids=["afastado", "licenciar", "saude", "requer", "nome_cadastro", "partido_uf"],
)
def test_revisao_recusa_assunto_pessoal_sem_gravar(abrir, dados, campo, texto):
    dados(100, valores=("sim",))
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    antes = exportar(abrir, edicao_id)
    arquivo = pronto(exportar(abrir, edicao_id))
    if campo == "titulo_edicao":
        arquivo["titulo"] = texto
    elif campo == "titulo_item":
        arquivo["itens"][0]["titulo"] = texto
    else:
        arquivo["itens"][0]["explicacao"].append(texto)
    with pytest.raises(ErroEdicao, match="assunto pessoal"):
        revisar(abrir, edicao_id, arquivo)
    assert exportar(abrir, edicao_id) == antes


def test_revisao_nao_empresta_sigla_nem_palavra_do_titulo_a_explicacao(abrir, dados):
    dados(100, sigla="REQ", descricao="Requer urgência para o PL 100/2026.")
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    arquivo["itens"][0]["titulo"] = "Emenda do parlamentar"
    arquivo["itens"][0]["explicacao"] = ["Amplia a licença ambiental."]
    assert revisar(abrir, edicao_id, arquivo)["situacao"] == "revisao_salva"


@pytest.mark.parametrize("sigla", ["REQ", "RQS"])
@pytest.mark.parametrize("campo", ["descricao", "ementa"])
@pytest.mark.parametrize(
    "texto",
    [
        "Requer a convocação do Ministro da Saúde para prestar informações.",
        "Requer a realização de sessão de debates sobre a saúde pública.",
        "Requer urgência para o Projeto de Lei nº 123, de 2026, que amplia a licença-paternidade.",
    ],
    ids=["convocacao", "debates", "proposicao_por_extenso"],
)
def test_requerimento_publico_chega_a_redacao_exportacao_e_revisao(
    abrir, dados, sigla, campo, texto
):
    dados(100, sigla=sigla, **{campo: texto})
    falso = Falso()
    resultado = gerar(abrir, INICIO, FIM, redator=falso)
    assert resultado["assunto_pessoal"] == 0
    assert resultado["itens"] == 1
    assert len(falso.entradas) == 1
    assert texto in json.dumps(falso.entradas, ensure_ascii=False)
    edicao_id = resultado["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    assert texto in json.dumps(arquivo, ensure_ascii=False)
    arquivo["titulo"] = texto
    arquivo["itens"][0]["titulo"] = texto
    arquivo["itens"][0]["explicacao"] = [texto]
    assert revisar(abrir, edicao_id, arquivo)["situacao"] == "revisao_salva"
    assert exportar(abrir, edicao_id)["itens"][0]["explicacao"] == [texto]
