"""Comandos administrativos: argumentos seguros e apenas saída agregada."""

import json

import pytest
from sqlalchemy.exc import OperationalError

from mandatometro.cli import main
from mandatometro.config import config
from mandatometro.piloto import VERSAO_QUIZ
from mandatometro.piloto import cli as piloto
from mandatometro.piloto.relatorio import Totais, resumir


@pytest.fixture(autouse=True)
def desligado(monkeypatch):
    monkeypatch.setenv("PILOTO_ATIVO", "false")
    config.cache_clear()
    yield
    config.cache_clear()


def test_resultado_imprime_json_agregado(monkeypatch, capsys):
    banco = object()
    esperado = resumir(VERSAO_QUIZ, Totais(5, 5, 5, 15, 25, 15, 25))
    monkeypatch.setattr(piloto, "engine", lambda: banco)

    def resultado(engine, versao):
        assert engine is banco and versao == VERSAO_QUIZ
        return esperado

    monkeypatch.setattr(piloto, "resultado", resultado)
    assert main(["piloto", "resultado", "--versao", VERSAO_QUIZ]) == 0
    saida = capsys.readouterr()
    assert json.loads(saida.out) == esperado
    assert saida.err == ""


@pytest.mark.parametrize(
    "args",
    [
        [],
        ["resultado"],
        ["apagar"],
        ["resultado", "--versao", "outra"],
        ["apagar", "--versao", "outra", "--confirmar"],
    ],
)
def test_argumentos_invalidos_nao_abrem_banco(monkeypatch, args):
    def proibido():
        pytest.fail("Argumentos inválidos não podem abrir banco.")

    monkeypatch.setattr(piloto, "engine", proibido)
    with pytest.raises(SystemExit) as erro:
        main(["piloto", *args])
    assert erro.value.code == 2


def test_apagar_sem_confirmar_recusa_antes_de_abrir_banco(monkeypatch, capsys):
    def proibido():
        pytest.fail("Apagar sem --confirmar não pode abrir banco.")

    monkeypatch.setattr(piloto, "engine", proibido)
    assert main(["piloto", "apagar", "--versao", VERSAO_QUIZ]) == 2
    saida = capsys.readouterr()
    assert saida.out == ""
    assert "--confirmar" in saida.err


def test_apagar_piloto_ativo_recusa_antes_de_abrir_banco(monkeypatch, capsys):
    monkeypatch.setenv("PILOTO_ATIVO", "true")
    config.cache_clear()

    def proibido():
        pytest.fail("Piloto ativo não pode abrir banco para apagar.")

    monkeypatch.setattr(piloto, "engine", proibido)
    assert main(["piloto", "apagar", "--versao", VERSAO_QUIZ, "--confirmar"]) == 1
    assert "Desligue o piloto" in capsys.readouterr().err


def test_apagar_confirmado_so_imprime_contagens(monkeypatch, capsys):
    banco = object()
    monkeypatch.setattr(piloto, "engine", lambda: banco)

    def apagar(engine, versao, *, ativo):
        assert engine is banco and versao == VERSAO_QUIZ and ativo is False
        return {"tentativas_apagadas": 10, "janelas_apagadas": 2}

    monkeypatch.setattr(piloto, "apagar_medicao", apagar)
    assert main(["piloto", "apagar", "--versao", VERSAO_QUIZ, "--confirmar"]) == 0
    assert json.loads(capsys.readouterr().out) == {"tentativas_apagadas": 10, "janelas_apagadas": 2}


@pytest.mark.parametrize("comando", ["resultado", "apagar"])
def test_erro_de_banco_nao_imprime_excecao(monkeypatch, capsys, comando):
    def falhar(*args, **kwargs):
        raise OperationalError("SQL com dado-ficticio", {}, Exception("segredo-ficticio"))

    monkeypatch.setattr(piloto, "engine", falhar)
    args = ["piloto", comando, "--versao", VERSAO_QUIZ]
    if comando == "apagar":
        args.append("--confirmar")
    assert main(args) == 1
    saida = capsys.readouterr()
    assert saida.out == ""
    assert "Banco indisponível" in saida.err
    assert "ficticio" not in saida.err
