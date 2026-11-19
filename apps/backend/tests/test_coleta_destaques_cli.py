"""Entrada do CLI dos destaques do DOU, isolada de rede e banco."""

from functools import partial

import httpx2
import pytest
from pydantic import SecretStr

from mandatometro import config as configuracao
from mandatometro import db
from mandatometro.cli import main


@pytest.fixture
def sem_rede_nem_banco(monkeypatch):
    def conexao_inesperada(*args, **kwargs):
        pytest.fail("O comando tentou abrir rede ou banco.")

    monkeypatch.setattr(httpx2, "Client", conexao_inesperada)
    monkeypatch.setattr(db, "engine", conexao_inesperada)
    monkeypatch.setattr(configuracao, "Config", partial(configuracao.Config, _env_file=None))
    configuracao.config.cache_clear()
    yield
    configuracao.config.cache_clear()


def test_ajuda_informa_periodo(capsys):
    with pytest.raises(SystemExit) as saida:
        main(["coleta", "destaques", "--help"])

    assert saida.value.code == 0
    assert "--inicio" in capsys.readouterr().out


def test_configuracao_mascara_a_chave(monkeypatch):
    monkeypatch.setenv("FIRECRAWL_API_KEY", "chave-ficticia")
    chave = configuracao.Config(_env_file=None).firecrawl_api_key

    assert isinstance(chave, SecretStr)
    assert "chave-ficticia" not in repr(chave)


@pytest.mark.parametrize("valor", [None, "", " "])
def test_sem_chave_sai_antes_de_abrir_rede_ou_banco(sem_rede_nem_banco, monkeypatch, capsys, valor):
    if valor is None:
        monkeypatch.delenv("FIRECRAWL_API_KEY", raising=False)
    else:
        monkeypatch.setenv("FIRECRAWL_API_KEY", valor)

    assert main(["coleta", "destaques"]) == 2
    assert capsys.readouterr().out == "Defina FIRECRAWL_API_KEY para coletar os destaques do DOU.\n"


@pytest.mark.parametrize(
    "argumentos",
    [
        ["--inicio", "2026-11-13"],
        ["--inicio", "2026-11-19", "--fim", "2026-11-13"],
        ["--inicio", "2026-11-31", "--fim", "2026-11-30"],
    ],
)
def test_periodo_invalido_sai_antes_de_abrir_rede_ou_banco(
    sem_rede_nem_banco, monkeypatch, capsys, argumentos
):
    monkeypatch.setenv("FIRECRAWL_API_KEY", "chave-ficticia")

    assert main(["coleta", "destaques", *argumentos]) == 2
    assert capsys.readouterr().out.startswith(("Informe --inicio", "O início", "As datas"))
