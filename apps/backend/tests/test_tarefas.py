"""Os jobs pulam sem configuração inicial e nunca imprimem a falha bruta."""

import json
import logging
import runpy
from pathlib import Path
from types import SimpleNamespace

import pytest

from mandatometro.coleta.tipos import ResumoColeta

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "tarefas.py"


@pytest.fixture
def tarefa(monkeypatch, tmp_path):
    for nome in ("DATABASE_URL", "GITHUB_EVENT_NAME", "COLETA_INICIO", "COLETA_FIM"):
        monkeypatch.delenv(nome, raising=False)
    monkeypatch.setenv("GITHUB_OUTPUT", str(tmp_path / "saida"))
    return runpy.run_path(str(SCRIPT))["main"]


def test_migration_automatica_sem_segredo_pula(tarefa, monkeypatch, tmp_path, capsys):
    monkeypatch.setenv("GITHUB_EVENT_NAME", "push")
    assert tarefa(["preparar-migration"]) == 0
    assert (tmp_path / "saida").read_text() == "executar=false\n"
    assert "não executada" in capsys.readouterr().out


def test_migration_configurada_e_liberada_sem_expor_url(tarefa, monkeypatch, tmp_path, capsys):
    monkeypatch.setenv("GITHUB_EVENT_NAME", "push")
    monkeypatch.setenv("DATABASE_URL", "postgresql://ficticio:segredo@banco.invalid/db")
    assert tarefa(["preparar-migration"]) == 0
    assert (tmp_path / "saida").read_text() == "executar=true\n"
    assert "segredo" not in capsys.readouterr().out


def test_migration_manual_sem_segredo_falha(tarefa, monkeypatch):
    monkeypatch.setenv("GITHUB_EVENT_NAME", "workflow_dispatch")
    assert tarefa(["preparar-migration"]) == 2


@pytest.mark.parametrize("operacao", [["migrar"], ["coletar", "camara"]])
def test_execucao_sem_banco_nao_usa_padrao_local(tarefa, monkeypatch, operacao):
    monkeypatch.setattr("mandatometro.cli.main", lambda *_: pytest.fail("executou CLI"))
    monkeypatch.setattr("alembic.command.upgrade", lambda *_: pytest.fail("migrou"))
    assert tarefa(operacao) == 2


@pytest.mark.parametrize("casa", ["camara", "senado"])
@pytest.mark.parametrize("codigo", [0, 1, 2])
def test_coleta_preserva_codigo_e_datas(tarefa, monkeypatch, casa, codigo):
    monkeypatch.setenv("DATABASE_URL", "banco-ficticio")
    monkeypatch.setenv("COLETA_INICIO", "2026-11-09")
    monkeypatch.setenv("COLETA_FIM", "2026-11-15")
    recebidos = []

    def executar(argv):
        recebidos.extend(argv)
        return codigo

    monkeypatch.setattr("mandatometro.cli.main", executar)
    assert tarefa(["coletar", casa]) == codigo
    assert recebidos == ["coleta", casa, "--inicio", "2026-11-09", "--fim", "2026-11-15"]


def test_coleta_sem_datas_usa_a_janela_existente(tarefa, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "banco-ficticio")
    recebidos = []
    monkeypatch.setattr("mandatometro.cli.main", lambda args: recebidos.extend(args))
    assert tarefa(["coletar", "senado"]) == 0
    assert recebidos == ["coleta", "senado"]


@pytest.mark.parametrize("casa", ["camara", "senado"])
@pytest.mark.parametrize("completa", [True, False])
def test_coleta_no_actions_mostra_so_o_resumo(tarefa, monkeypatch, capsys, caplog, casa, completa):
    monkeypatch.setenv("DATABASE_URL", "banco-ficticio")

    def coletar(inicio, fim, **kwargs):
        logging.getLogger(f"mandatometro.coleta.{casa}").warning("Aviso da coleta.")
        logging.getLogger("httpx2").info("GET /senador/990001/mandatos.json")
        return ResumoColeta(casa, inicio, fim, completa=completa)

    monkeypatch.setattr(f"mandatometro.coleta.{casa}.coletar", coletar)
    anterior = logging.root.manager.disable
    with caplog.at_level(logging.INFO):
        assert tarefa(["coletar", casa]) == (0 if completa else 1)
    assert logging.root.manager.disable == anterior
    saida = capsys.readouterr()
    assert len(saida.out.splitlines()) == 1
    resumo = json.loads(saida.out)
    assert resumo["casa"] == casa
    assert resumo["completa"] == completa
    assert saida.err == ""
    assert caplog.records == []


@pytest.mark.parametrize("inicio,fim", [("invalido", "2026-11-15"), ("2026-11-09", "")])
def test_datas_invalidas_param_antes_da_coleta(tarefa, monkeypatch, inicio, fim, capsys):
    monkeypatch.setenv("DATABASE_URL", "banco-ficticio")
    monkeypatch.setenv("COLETA_INICIO", inicio)
    monkeypatch.setenv("COLETA_FIM", fim)
    monkeypatch.setattr("mandatometro.cli.main", lambda *_: pytest.fail("executou CLI"))
    assert tarefa(["coletar", "camara"]) == 2
    assert "invalido" not in capsys.readouterr().out


@pytest.mark.parametrize("operacao", [["migrar"], ["coletar", "senado"]])
def test_erro_inesperado_falha_sem_segredos(tarefa, monkeypatch, operacao, capsys):
    monkeypatch.setenv("DATABASE_URL", "banco-ficticio")

    def falhar(*args, **kwargs):
        raise RuntimeError("segredo-ficticio-nao-mostrar")

    monkeypatch.setattr("mandatometro.cli.main", falhar)
    monkeypatch.setattr("alembic.command.upgrade", falhar)
    anterior = logging.root.manager.disable
    assert tarefa(operacao) == 1
    assert logging.root.manager.disable == anterior
    saida = capsys.readouterr()
    assert "segredo-ficticio-nao-mostrar" not in saida.out + saida.err
    assert "Traceback" not in saida.out + saida.err


def test_migration_usa_head_e_configuracao_do_projeto(tarefa, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "banco-ficticio")
    chamadas = []
    monkeypatch.setattr("alembic.command.upgrade", lambda *args: chamadas.append(args))
    assert tarefa(["migrar"]) == 0
    configuracao, revisao = chamadas[0]
    assert revisao == "head"
    assert Path(configuracao.toml_file_name) == SCRIPT.parents[1] / "pyproject.toml"


def test_envio_agendado_filtra_semana_no_fuso_de_brasilia(tarefa, monkeypatch):
    from datetime import UTC, date, datetime

    class Relogio:
        @classmethod
        def now(cls, fuso):
            # Segunda em UTC ainda é domingo em Brasília.
            return datetime(2026, 11, 23, 1, tzinfo=UTC).astimezone(fuso)

    monkeypatch.setitem(tarefa.__globals__, "datetime", Relogio)

    for nome in ("DATABASE_URL", "RESEND_API_KEY", "RESEND_FROM", "APP_BASE_URL", "API_URL"):
        monkeypatch.setenv(nome, "ficticio")
    monkeypatch.setenv("GITHUB_EVENT_NAME", "schedule")
    recebidos = []
    monkeypatch.setattr("mandatometro.cli.main", lambda args: recebidos.extend(args))
    assert tarefa(["enviar"]) == 0
    assert recebidos[:2] == ["edicao", "enviar"]
    indice = recebidos.index("--publicada-desde")
    segunda = date.fromisoformat(recebidos[indice + 1])
    assert segunda == date(2026, 11, 16)
    assert "--simular" not in recebidos


def test_envio_manual_simulado_sem_chave_mantem_id_limite_e_saida(tarefa, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "ficticio")
    monkeypatch.setenv("GITHUB_EVENT_NAME", "workflow_dispatch")
    monkeypatch.setenv("ENVIO_EDICAO_ID", "7")
    monkeypatch.setenv("ENVIO_LIMITE", "30")
    monkeypatch.setenv("ENVIO_SIMULAR", "true")
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    recebidos = []

    def cli(args):
        recebidos.extend(args)
        return 1

    monkeypatch.setattr("mandatometro.cli.main", cli)
    assert tarefa(["enviar"]) == 1
    assert recebidos == ["edicao", "enviar", "7", "--limite", "30", "--simular"]


def test_envio_real_sem_configuracao_falha_sem_abrir_banco(tarefa, monkeypatch, capsys):
    monkeypatch.setenv("DATABASE_URL", "ficticio")
    monkeypatch.setenv("ENVIO_SIMULAR", "false")
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.setattr("mandatometro.cli.main", lambda _: pytest.fail("abriu banco"))
    assert tarefa(["enviar"]) == 2
    assert json.loads(capsys.readouterr().out) == {"configuracao_invalida": 1}


@pytest.mark.parametrize("anterior", [logging.NOTSET, logging.ERROR])
@pytest.mark.parametrize("resultado", ["concluido", "parcial", "excecao"])
def test_envio_no_actions_mostra_so_json_e_restaura_logging(
    tarefa, monkeypatch, capsys, caplog, anterior, resultado
):
    from mandatometro.avisos import cli

    for nome in ("DATABASE_URL", "RESEND_API_KEY", "RESEND_FROM", "APP_BASE_URL", "API_URL"):
        monkeypatch.setenv(nome, "ficticio")
    monkeypatch.setenv("ENVIO_SIMULAR", "false")
    monkeypatch.setattr(cli, "engine", lambda: None)
    monkeypatch.setattr(
        cli,
        "config",
        lambda: SimpleNamespace(
            resend_api_key=None,
            resend_from=None,
            app_base_url="https://site.example.com",
            api_url="https://api.example.com",
        ),
    )
    resumo = {"edicao_id": 7, "aceitos_nesta_execucao": 1, "faltam": int(resultado == "parcial")}
    codigo = int(resultado != "concluido")
    privado = (
        "pessoa@example.com codigo=398e2288-0bda-4e47-a7e5-b8fc41f4e962 "
        "<p>Corpo ficticio da mensagem</p>"
    )

    async def enviar(*args, **kwargs):
        # Mesmo uma biblioteca registrando conteúdo ou exceção não pode publicá-los no Actions.
        logging.getLogger("httpx2").info('HTTP Request: POST https://api.resend.com/emails "200"')
        for nome in ("sqlalchemy.engine.Engine", "psycopg", "mandatometro.avisos.resend"):
            try:
                raise RuntimeError(privado)
            except RuntimeError:
                logging.getLogger(nome).critical("Falha: %s", privado, exc_info=True)
        if resultado == "excecao":
            raise RuntimeError(privado)
        return resumo, codigo

    monkeypatch.setattr(cli, "enviar_edicao", enviar)
    caplog.set_level(logging.INFO)
    original = logging.root.manager.disable
    logging.disable(anterior)
    try:
        assert tarefa(["enviar"]) == codigo
        assert logging.root.manager.disable == anterior
    finally:
        logging.disable(original)
    saida = capsys.readouterr()
    assert len(saida.out.splitlines()) == 1
    assert json.loads(saida.out) == ({"falhas_gerais": 1} if resultado == "excecao" else resumo)
    assert saida.err == ""
    assert caplog.records == []


@pytest.mark.parametrize("falha_no_parser", [False, True])
def test_envio_no_actions_restaura_logging_quando_cli_interrompe(
    tarefa, monkeypatch, capsys, caplog, falha_no_parser
):
    monkeypatch.setenv("DATABASE_URL", "ficticio")
    monkeypatch.setenv("ENVIO_SIMULAR", "true")
    if falha_no_parser:
        monkeypatch.setenv("ENVIO_EDICAO_ID", "pessoa@example.com")
    else:

        def falhar(_):
            logging.getLogger("psycopg").error("pessoa@example.com excecao-ficticia")
            raise RuntimeError("pessoa@example.com excecao-ficticia")

        monkeypatch.setattr("mandatometro.cli.main", falhar)
    anterior = logging.root.manager.disable
    if falha_no_parser:
        with pytest.raises(SystemExit) as erro:
            tarefa(["enviar"])
        assert erro.value.code == 2
    else:
        assert tarefa(["enviar"]) == 1
    assert logging.root.manager.disable == anterior
    saida = capsys.readouterr()
    assert json.loads(saida.out) == {
        "argumentos_invalidos" if falha_no_parser else "falhas_gerais": 1
    }
    assert saida.err == ""
    assert caplog.records == []
