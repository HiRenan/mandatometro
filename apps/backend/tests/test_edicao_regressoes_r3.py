"""Oito regressões do Argos: saúde pessoal e o adjetivo interna, em textos inventados."""

import json

import pytest
from test_edicao_redacao import Falso
from test_edicao_revisao import abrir as abrir
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.ia.privacidade import TERMO_PESSOAL, assunto_pessoal, normalizar
from mandatometro.ia.servico import ErroEdicao, exportar, gerar, revisar

CASOS = [
    pytest.param("O parlamentar está adoentado.", True, id="T01_adoentado"),
    pytest.param("A parlamentar está adoentada.", True, id="T02_adoentada"),
    pytest.param("O parlamentar se adoentou.", True, id="T03_adoentou"),
    pytest.param("O parlamentar está convalescente.", True, id="T04_convalescente"),
    pytest.param("O parlamentar está em convalescença.", True, id="T05_convalescenca"),
    pytest.param("O parlamentar recebe atendimento médico.", True, id="T06_atendimento"),
    pytest.param("O parlamentar propõe melhorar a segurança interna.", False, id="F06_seguranca"),
    pytest.param(
        "O parlamentar propõe regras de organização interna.", False, id="F07_organizacao"
    ),
]


@pytest.mark.parametrize("texto,pessoal", CASOS)
@pytest.mark.parametrize("forma", ["original", "maiusculas", "sem_acento", "ambas"])
def test_lista_e_predicado(texto, pessoal, forma):
    if forma in ("sem_acento", "ambas"):
        texto = normalizar(texto)
    if forma in ("maiusculas", "ambas"):
        texto = texto.upper()
    assert bool(TERMO_PESSOAL.search(normalizar(texto))) is pessoal
    assert assunto_pessoal(texto, [], siglas=["PL"]) is pessoal


@pytest.mark.parametrize("texto,pessoal", CASOS)
@pytest.mark.parametrize("campo", ["descricao", "ementa"])
def test_fluxo_da_fonte_ate_revisao(abrir, dados, texto, pessoal, campo, caplog):
    dados(100, **{campo: texto})
    dados(200)
    falso = Falso()
    resultado = gerar(abrir, INICIO, FIM, redator=falso)
    arquivo = exportar(abrir, resultado["edicao_id"])
    presente = any(
        p["numero"] == 100 for item in arquivo["itens"] for p in item["contexto"]["proposicoes"]
    )
    assert presente is not pessoal
    assert resultado["assunto_pessoal"] == int(pessoal)
    assert resultado["itens_com_termo_pessoal"] == 0
    assert resultado["itens"] == len(falso.entradas) == (1 if pessoal else 2)
    assert (texto in json.dumps(falso.entradas, ensure_ascii=False)) is not pessoal
    assert (texto in json.dumps(arquivo, ensure_ascii=False)) is not pessoal
    assert all(not item["contexto"].get("avisos") for item in arquivo["itens"])
    assert texto not in json.dumps(resultado, ensure_ascii=False)
    assert texto not in caplog.text
    if pessoal:
        assert "100-1" not in json.dumps(resultado)
        assert "100-1" not in json.dumps(arquivo)

    # A revisão confere o mesmo texto humano, sem depender das siglas da fonte.
    arquivo = pronto(arquivo)
    arquivo["itens"][0]["explicacao"] = [texto]
    if pessoal:
        with pytest.raises(ErroEdicao, match="assunto pessoal"):
            revisar(abrir, resultado["edicao_id"], arquivo)
    else:
        revisao = revisar(abrir, resultado["edicao_id"], arquivo)
        assert revisao["situacao"] == "revisao_salva"
        assert revisao["avisos"] == []
