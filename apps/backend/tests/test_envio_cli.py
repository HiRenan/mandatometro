import json
from datetime import UTC, datetime

import pytest

from mandatometro.avisos import cli
from mandatometro.cli import main


@pytest.mark.parametrize(
    "args",
    [
        ["0"],
        ["--limite", "0"],
        ["--publicada-desde", "20261116"],
        ["--publicada-desde", "pessoa@example.com"],
    ],
)
def test_argumentos_invalidos_nao_abrem_banco(args, monkeypatch, capsys):
    monkeypatch.setattr(cli, "engine", lambda: pytest.fail("Não deve abrir banco."))
    assert main(["edicao", "enviar", *args]) == 2
    assert json.loads(capsys.readouterr().out) == {"argumentos_invalidos": 1}


@pytest.mark.parametrize(
    "args", [["pessoa@example.com"], ["--pessoa@example.com"], ["--limite", "pessoa@example.com"]]
)
def test_erros_do_parser_tambem_nao_refletem_entrada(args, capsys):
    with pytest.raises(SystemExit) as erro:
        main(["edicao", "enviar", *args])
    assert erro.value.code == 2
    saida = capsys.readouterr()
    assert json.loads(saida.out) == {"argumentos_invalidos": 1}
    assert "pessoa@example.com" not in saida.out + saida.err


@pytest.mark.parametrize("codigo", [0, 1, 2])
def test_cli_transmite_opcoes_e_codigo_sem_dados_pessoais(monkeypatch, capsys, codigo):
    recebidos = {}

    async def enviar(banco, provedor, **kwargs):
        recebidos.update(kwargs)
        return {"edicao_id": 9, "aceitos_nesta_execucao": 0, "faltam": 10}, codigo

    monkeypatch.setattr(cli, "enviar_edicao", enviar)
    monkeypatch.setattr(cli, "engine", lambda: None)
    assert (
        main(
            [
                "edicao",
                "enviar",
                "9",
                "--simular",
                "--limite",
                "5",
                "--publicada-desde",
                "2026-11-16",
            ]
        )
        == codigo
    )
    assert recebidos["edicao_id"] == 9 and recebidos["simular"] is True
    assert recebidos["limite"] == 5
    assert recebidos["publicada_desde"].astimezone(UTC) == datetime(2026, 11, 16, 3, tzinfo=UTC)
    assert json.loads(capsys.readouterr().out)["edicao_id"] == 9


def test_falha_inesperada_e_sanitizada(monkeypatch, capsys):
    async def enviar(*args, **kwargs):
        raise RuntimeError("pessoa@example.com segredo-ficticio")

    monkeypatch.setattr(cli, "enviar_edicao", enviar)
    monkeypatch.setattr(cli, "engine", lambda: None)
    assert main(["edicao", "enviar"]) == 1
    saida = capsys.readouterr()
    assert json.loads(saida.out) == {"falhas_gerais": 1}
    assert not saida.err and "segredo-ficticio" not in saida.out
