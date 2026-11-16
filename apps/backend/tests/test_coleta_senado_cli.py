"""Contrato do comando do Senado, sem rede nem banco."""

import json
from datetime import date

import pytest

from mandatometro.cli import main
from mandatometro.coleta import senado
from mandatometro.coleta.tipos import ResumoColeta


def test_ajuda_senado(capsys):
    with pytest.raises(SystemExit) as saida:
        main(["coleta", "senado", "--help"])
    assert saida.value.code == 0
    texto = capsys.readouterr().out
    assert "--inicio" in texto and "--fim" in texto


@pytest.mark.parametrize(
    "args",
    [
        ["--inicio", "2026-11-01"],
        ["--fim", "2026-11-01"],
        ["--inicio", "20261101", "--fim", "2026-11-07"],
        ["--inicio", "2026-02-30", "--fim", "2026-03-01"],
        ["--inicio", "2026-11-08", "--fim", "2026-11-07"],
    ],
)
def test_periodo_invalido_nao_abre_http_ou_banco(monkeypatch, args):
    def proibido(*args, **kwargs):
        pytest.fail("Data inválida não pode abrir HTTP/banco.")

    monkeypatch.setattr(senado, "ClienteHttp", proibido)
    assert main(["coleta", "senado", *args]) == 2


@pytest.mark.parametrize("completa,saida", [(True, 0), (False, 1)])
def test_comando_mostra_resumo_e_saida_da_coleta(monkeypatch, capsys, completa, saida):
    def coletar(inicio, fim, **kwargs):
        return ResumoColeta(
            "senado",
            inicio,
            fim,
            completa=completa,
            votacoes=4,
            votos=324,
            falhas_parlamentares=0 if completa else 1,
        )

    monkeypatch.setattr(senado, "coletar", coletar)
    assert (
        main(
            [
                "coleta",
                "senado",
                "--inicio",
                "2026-11-09",
                "--fim",
                "2026-11-15",
            ]
        )
        == saida
    )
    resumo = json.loads(capsys.readouterr().out)
    assert (resumo["inicio"], resumo["fim"], resumo["votos"]) == ("2026-11-09", "2026-11-15", 324)


def test_comando_sem_datas_reutiliza_periodo_padrao(monkeypatch):
    def periodo(inicio, fim):
        assert inicio is None and fim is None
        return date(2026, 11, 9), date(2026, 11, 15)

    def coletar(inicio, fim, **kwargs):
        assert (inicio, fim) == (date(2026, 11, 9), date(2026, 11, 15))
        return ResumoColeta("senado", inicio, fim)

    monkeypatch.setattr(senado, "resolver_periodo", periodo)
    monkeypatch.setattr(senado, "coletar", coletar)
    assert main(["coleta", "senado"]) == 0
