"""Sete regressões do Argos: textos inventados, nas duas posições da fonte."""

import json

import pytest
from test_edicao_redacao import Falso
from test_edicao_revisao import abrir as abrir
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.ia.privacidade import assunto_pessoal
from mandatometro.ia.servico import ErroEdicao, exportar, gerar, revisar

CASOS = [
    pytest.param("Concede licença ao\nparlamentar.", True, "PL", id="lf"),
    pytest.param("O parlamentar\r\nficará afastado.", True, "PL", id="crlf"),
    pytest.param("Concede licença ao Sr. parlamentar.", True, "PL", id="abreviatura"),
    pytest.param("Comunica que o parlamentar se internou.", True, "PL", id="internou"),
    pytest.param(
        "Requer urgência para o Projeto de Lei do Senado nº 123, de 2026, "
        "que amplia a licença-paternidade.",
        False,
        "RQS",
        id="senado",
    ),
    pytest.param(
        "Requer urgência para o Projeto de Lei da Câmara nº 123, de 2026, "
        "que amplia a licença-paternidade.",
        False,
        "REQ",
        id="camara",
    ),
    pytest.param(
        "Requer urgência para os Projetos de Lei nº 100 e 123, de 2026, "
        "que ampliam a licença-paternidade.",
        False,
        "REQ",
        id="plural",
    ),
]


@pytest.mark.parametrize("texto,pessoal,sigla", CASOS)
def test_predicado(texto, pessoal, sigla):
    assert assunto_pessoal(texto, [], siglas=[sigla]) is pessoal


@pytest.mark.parametrize("texto,pessoal,sigla", CASOS)
@pytest.mark.parametrize("campo", ["descricao", "ementa"])
def test_fluxo_da_fonte_ate_revisao(abrir, dados, texto, pessoal, sigla, campo):
    dados(100, sigla=sigla, **{campo: texto})
    dados(200)
    falso = Falso()
    resultado = gerar(abrir, INICIO, FIM, redator=falso)
    arquivo = exportar(abrir, resultado["edicao_id"])
    presente = any(
        p["numero"] == 100 for item in arquivo["itens"] for p in item["contexto"]["proposicoes"]
    )
    assert presente is not pessoal
    assert (texto in json.dumps(falso.entradas, ensure_ascii=False)) is not pessoal
    assert resultado["assunto_pessoal"] == int(pessoal)
    if pessoal:
        assert "100-1" not in json.dumps(resultado)
        assert "100-1" not in json.dumps(arquivo)
        assert texto not in json.dumps(arquivo, ensure_ascii=False)
    # O texto humano é conferido mesmo se a fonte elegível for de outro item.
    arquivo = pronto(arquivo)
    arquivo["itens"][0]["explicacao"] = [texto]
    if pessoal:
        with pytest.raises(ErroEdicao, match="assunto pessoal|controles"):
            revisar(abrir, resultado["edicao_id"], arquivo)
    else:
        assert revisar(abrir, resultado["edicao_id"], arquivo)["situacao"] == "revisao_salva"
