from argparse import ArgumentParser
from contextlib import nullcontext
from datetime import date

import pytest

from mandatometro.cli import main
from mandatometro.coleta.cli import adicionar_argumentos_periodo, resolver_periodo
from mandatometro.coleta.tipos import ResumoColeta


def test_grupo_coleta_tem_ajuda(capsys):
    with pytest.raises(SystemExit) as saida:
        main(["coleta", "--help"])
    assert saida.value.code == 0
    assert "coleta" in capsys.readouterr().out


def test_periodo_padrao_sao_sete_dias_completos():
    assert resolver_periodo(None, None, hoje=date(2026, 11, 16)) == (
        date(2026, 11, 9),
        date(2026, 11, 15),
    )


@pytest.mark.parametrize(
    "inicio,fim",
    [
        ("2026-02-30", "2026-03-01"),
        ("2026-11-02", None),
        (None, "2026-11-03"),
        ("2026-11-03", "2026-11-02"),
    ],
)
def test_periodo_invalido_e_recusado(inicio, fim):
    with pytest.raises(ValueError):
        resolver_periodo(inicio, fim)


def test_argumentos_de_periodo_sao_compartilhados():
    parser = ArgumentParser()
    adicionar_argumentos_periodo(parser)
    args = parser.parse_args(["--inicio", "2026-11-01", "--fim", "2026-11-07"])
    assert resolver_periodo(args.inicio, args.fim) == (date(2026, 11, 1), date(2026, 11, 7))


@pytest.mark.parametrize("completa,codigo", [(True, 0), (False, 1)])
def test_codigo_de_saida_da_camara(completa, codigo, monkeypatch, capsys):
    resumo = ResumoColeta("camara", date(2026, 11, 9), date(2026, 11, 15), completa=completa)
    monkeypatch.setattr("mandatometro.coleta.camara.ClienteHttp", lambda _: nullcontext(None))
    monkeypatch.setattr("mandatometro.coleta.camara.coletar", lambda *a, **k: resumo)
    assert main(["coleta", "camara", "--inicio", "2026-11-09", "--fim", "2026-11-15"]) == codigo
    assert '"completa": ' + str(completa).lower() in capsys.readouterr().out


def test_data_invalida_na_camara_nao_abre_http(monkeypatch):
    monkeypatch.setattr(
        "mandatometro.coleta.camara.ClienteHttp", lambda _: pytest.fail("abriu HTTP")
    )
    with pytest.raises(SystemExit) as erro:
        main(["coleta", "camara", "--inicio", "2026-02-30", "--fim", "2026-03-01"])
    assert erro.value.code == 2
