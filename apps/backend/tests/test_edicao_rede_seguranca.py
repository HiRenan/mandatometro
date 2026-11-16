"""A política pública fica elegível, mas seus termos pedem conferência humana."""

import json
from dataclasses import asdict

import pytest
from test_edicao_redacao import Falso
from test_edicao_revisao import abrir as abrir
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.ia.redacao import PENDENTE, redigir
from mandatometro.ia.selecao import selecionar
from mandatometro.ia.servico import ErroEdicao, exportar, gerar, publicar, revisar

AVISO = (
    "O texto oficial fala de licença, afastamento ou saúde. Confira se é de uma pessoa; "
    "se for, exclua o item com excluir: true."
)


@pytest.mark.parametrize("campo", ["descricao", "ementa"])
@pytest.mark.parametrize(
    "texto",
    [
        "Dispõe sobre o licenciamento ambiental.",
        "Amplia a licença parental de trabalhadores.",
        "Garante o afastamento de trabalhadoras vítimas de violência.",
        "Institui a política nacional de saúde mental.",
        "Prevê apoio a quem se internou.",
        "Amplia o apoio a quem adoeceu.",
        "A Câmara dos Deputados aprova o programa de saúde pública.",
    ],
)
def test_termo_na_fonte_retem_item_inteiro_e_avisa_ate_a_confirmacao(
    abrir, dados, campo, texto, caplog
):
    dados(100, **{campo: texto})
    falso = Falso()
    resultado = gerar(abrir, INICIO, FIM, redator=falso)
    assert resultado["assunto_pessoal"] == 0
    assert resultado["itens"] == resultado["itens_com_termo_pessoal"] == 1
    assert resultado["motivos_texto_do_codigo"] == {"termo_pessoal": 1}
    assert falso.entradas == []
    edicao_id = resultado["edicao_id"]
    arquivo = exportar(abrir, edicao_id)
    item = arquivo["itens"][0]
    assert item["explicacao"] == [PENDENTE]
    assert item["titulo"] == "PL 100/2026"
    assert item["fatos"]["origem"] == "codigo"
    assert "redacao" in item["fatos"]["pendencias"]
    assert item["contexto"]["avisos"] == [AVISO]
    assert texto in json.dumps(arquivo, ensure_ascii=False)
    with pytest.raises(ErroEdicao, match="pendência"):
        publicar(abrir, edicao_id)

    arquivo = pronto(arquivo)
    item["revisado"] = False
    revisao = revisar(abrir, edicao_id, arquivo)
    assert revisao["avisos"] == [f"Confira o item 1: {AVISO}"]
    with pytest.raises(ErroEdicao, match="revisao"):
        publicar(abrir, edicao_id)
    atual = exportar(abrir, edicao_id)
    assert atual["itens"][0]["contexto"]["avisos"] == [AVISO]
    atual["itens"][0]["revisado"] = True
    assert revisar(abrir, edicao_id, atual)["avisos"] == revisao["avisos"]
    assert publicar(abrir, edicao_id)["situacao"] == "publicada"
    assert texto not in json.dumps(resultado, ensure_ascii=False)
    assert texto not in json.dumps(revisao, ensure_ascii=False)
    assert texto not in caplog.text


@pytest.mark.parametrize("provedor", [True, False])
def test_ementa_de_proposicao_ligada_fora_das_principais_tambem_retem(
    sessao, abrir, dados, provedor
):
    principal = dados(100)
    requerimento = dados(200, sigla="REQ", ementa="Requer debates sobre a saúde pública.")
    requerimento.proposicoes.extend(principal.proposicoes)
    sessao.flush()
    selecao = selecionar(sessao, INICIO, FIM)
    assert len(selecao.itens) == 1
    assert [p.numero for p in selecao.itens[0].proposicoes] == [100]
    falso = Falso() if provedor else None
    texto = redigir(selecao.itens[0], selecao.nomes, falso)
    assert texto.motivo == "termo_pessoal" and texto.origem == "codigo"
    assert falso is None or falso.entradas == []
    resultado = gerar(abrir, INICIO, FIM, redator=falso)
    assert resultado["itens_com_termo_pessoal"] == 1
    assert exportar(abrir, resultado["edicao_id"])["itens"][0]["contexto"]["avisos"] == [AVISO]


def test_rede_conta_grupos_sem_alterar_ordem_teto_fatos_ou_fontes(abrir, sessao, dados):
    dados(100, dia=9, descricao="Licença ambiental.", ementa="Política de saúde.", valores=("sim",))
    dados(200, dia=15)
    dados(300, dia=14, ementa="Política de saúde pública.")
    dados(400, dia=13, ementa="Concede licença ao parlamentar.")
    antes = selecionar(sessao, INICIO, FIM, teto=2)
    falso = Falso()
    resultado = gerar(abrir, INICIO, FIM, teto=2, redator=falso)
    for campo, esperado in asdict(antes.resumo).items():
        assert resultado[campo] == esperado
    assert resultado["itens_com_termo_pessoal"] == 1
    assert len(falso.entradas) == 1
    assert resultado["assunto_pessoal"] == 1
    arquivo = exportar(abrir, resultado["edicao_id"])
    for base, item in zip(antes.itens, arquivo["itens"], strict=True):
        fatos = base.fatos.model_dump(mode="json")
        for campo in ("proposicoes", "votacoes", "fontes"):
            assert fatos[campo] == item["fatos"][campo]
    assert "avisos" not in arquivo["itens"][1]["contexto"]


def test_aviso_e_de_consulta_e_pessoa_pode_excluir_item(abrir, dados):
    dados(100, descricao="Concede licença ao titular.")
    dados(200)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    arquivo["itens"][0]["contexto"]["avisos"] = []
    with pytest.raises(ErroEdicao, match="contexto"):
        revisar(abrir, edicao_id, arquivo)
    arquivo = pronto(exportar(abrir, edicao_id))
    arquivo["itens"][0]["excluir"] = True
    arquivo["itens"][0]["motivo_exclusao"] = "Assunto pessoal fora da edição."
    revisao = revisar(abrir, edicao_id, arquivo)
    assert revisao["itens"] == 1 and revisao["avisos"] == []
    assert "100-1" not in json.dumps(exportar(abrir, edicao_id))
    assert publicar(abrir, edicao_id)["situacao"] == "publicada"
