"""Contrato do comando da legislação federal, sem rede nem banco."""

import json
from contextlib import nullcontext
from datetime import datetime

import pytest

from mandatometro.cli import main
from mandatometro.coleta import cli, legislacao
from mandatometro.coleta.tipos import ResumoAtos


def test_ajuda_da_legislacao(capsys):
    with pytest.raises(SystemExit) as saida:
        main(["coleta", "legislacao", "--help"])

    assert saida.value.code == 0
    assert "--inicio" in capsys.readouterr().out


def test_periodo_invalido_nao_abre_http(monkeypatch):
    def abrir_http(_):
        pytest.fail("Período inválido abriu a coleta HTTP.")

    monkeypatch.setattr(legislacao, "ClienteHttp", abrir_http)
    assert main(["coleta", "legislacao", "--inicio", "2026-11-12"]) == 2


@pytest.mark.parametrize("completa, codigo", [(True, 0), (False, 1)])
def test_resumo_e_periodo_padrao_da_legislacao(monkeypatch, capsys, completa, codigo):
    class Relogio:
        @staticmethod
        def now(fuso):
            assert fuso.key == "America/Sao_Paulo"
            return datetime(2026, 11, 19, tzinfo=fuso)

    def coletar(inicio, fim, **kwargs):
        return ResumoAtos("legislacao_senado", inicio, fim, atos=11, completa=completa)

    monkeypatch.setattr(cli, "datetime", Relogio)
    monkeypatch.setattr(legislacao, "ClienteHttp", lambda _: nullcontext(None))
    monkeypatch.setattr(legislacao, "coletar", coletar)

    assert main(["coleta", "legislacao"]) == codigo
    linhas = capsys.readouterr().out.splitlines()
    assert len(linhas) == 1
    resumo = json.loads(linhas[0])
    assert (resumo["inicio"], resumo["fim"], resumo["atos"]) == ("2026-11-12", "2026-11-18", 11)
    assert not {"casa", "parlamentares", "votos", "ementa", "titulo"}.intersection(resumo)
    assert "assinaturas_ignoradas" not in resumo
