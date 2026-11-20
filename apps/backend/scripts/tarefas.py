"""Entrada dos workflows: configuração explícita e falhas sem traceback ou segredos.

O preparo da migration usa só a biblioteca padrão, antes de instalar dependências.
A regra de coleta continua no CLI; este arquivo só adapta a execução ao Actions.
"""

import json
import logging
import os
import sys
from collections.abc import Callable
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timedelta
from io import StringIO
from pathlib import Path
from zoneinfo import ZoneInfo

BACKEND = Path(__file__).resolve().parents[1]


def preparar_migration() -> int:
    configurado = bool(os.environ.get("DATABASE_URL", "").strip())
    with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf-8", newline="\n") as saida:
        saida.write(f"executar={str(configurado).lower()}\n")
    if configurado:
        return 0
    if os.environ.get("GITHUB_EVENT_NAME") == "workflow_dispatch":
        print("::error::Cadastre DATABASE_URL_UNPOOLED no ambiente selecionado.")
        return 2
    print("::notice::Migration não executada: falta DATABASE_URL_UNPOOLED neste ambiente.")
    return 0


def coletar(casa: str) -> int:
    from mandatometro.cli import main as cli
    from mandatometro.coleta.cli import resolver_periodo

    inicio = os.environ.get("COLETA_INICIO") or None
    fim = os.environ.get("COLETA_FIM") or None
    try:
        resolver_periodo(inicio, fim)
    except ValueError:
        print("::error::Informe início e fim juntos, em AAAA-MM-DD, na ordem cronológica.")
        return 2
    argumentos = ["coleta", casa]
    if inicio is not None and fim is not None:
        argumentos += ["--inicio", inicio, "--fim", fim]
    # O Actions publica só o resumo; bibliotecas também podem registrar URLs de pessoas.
    anterior = logging.root.manager.disable
    logging.disable(logging.CRITICAL)
    try:
        return cli(argumentos) or 0
    finally:
        logging.disable(anterior)


def _rodar_etapa(cli: Callable[[list[str]], int], argumentos: list[str]) -> int:
    etapa = argumentos[1]
    saida = StringIO()
    try:
        with redirect_stdout(saida), redirect_stderr(StringIO()):
            codigo = cli(argumentos) or 0
        if etapa == "destaques" and codigo == 2:
            # O período já foi validado. A falta da chave é a saída em texto do CLI.
            resumo = {"erro": "Falta FIRECRAWL_API_KEY.", "completa": False, "chamadas": 0}
        else:
            resumo = json.loads(saida.getvalue())
            if not isinstance(resumo, dict):
                raise ValueError("Resumo da etapa inválido.")
    except (Exception, SystemExit):
        codigo = 1
        resumo = {"falhas_gerais": 1}
    print(json.dumps({"etapa": etapa, "codigo": codigo, **resumo}, ensure_ascii=False))
    return codigo


def agenda() -> int:
    from mandatometro.coleta.cli import resolver_periodo

    agendada = os.environ.get("GITHUB_EVENT_NAME") == "schedule"
    # A comparação de strings do Actions ignora maiúsculas e minúsculas.
    if agendada and os.environ.get("AGENDA_SABADO_ATIVA") != "true":
        return 0
    if not os.environ.get("DATABASE_URL", "").strip():
        print(json.dumps({"erro": "Defina DATABASE_URL para executar a agenda."}))
        return 2
    hoje = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    if agendada:
        # A fila pode adiar a execução. O período continua relativo ao sábado.
        hoje -= timedelta(days=(hoje.weekday() - 5) % 7)
    try:
        inicio, fim = resolver_periodo(
            os.environ.get("COLETA_INICIO") or None,
            os.environ.get("COLETA_FIM") or None,
            hoje=hoje,
        )
    except ValueError as erro:
        print(json.dumps({"erro": str(erro)}, ensure_ascii=False))
        return 2

    periodo = ["--inicio", inicio.isoformat(), "--fim", fim.isoformat()]
    anterior = logging.root.manager.disable
    logging.disable(logging.CRITICAL)
    try:
        from mandatometro.cli import main as cli

        # Cada coleta confirma suas próprias gravações. O rascunho usa o que ficou no banco.
        legislacao = _rodar_etapa(cli, ["coleta", "legislacao", *periodo])
        destaques = _rodar_etapa(cli, ["coleta", "destaques", *periodo])
        rascunho = _rodar_etapa(cli, ["edicao", "rascunho", *periodo])
        return int(any((legislacao, destaques, rascunho)))
    finally:
        logging.disable(anterior)


def migrar() -> int:
    from alembic import command
    from alembic.config import Config

    command.upgrade(Config(toml_file=BACKEND / "pyproject.toml"), "head")
    print("Migration concluída até head.")
    return 0


def enviar() -> int:
    from mandatometro.cli import main as cli

    simular = os.environ.get("ENVIO_SIMULAR", "false")
    if simular not in {"true", "false"}:
        print(json.dumps({"argumentos_invalidos": 1}))
        return 2
    obrigatorias = ["DATABASE_URL"]
    if simular == "false":
        obrigatorias += ["RESEND_API_KEY", "RESEND_FROM", "APP_BASE_URL", "API_URL"]
    if any(not os.environ.get(nome, "").strip() for nome in obrigatorias):
        print(json.dumps({"configuracao_invalida": 1}))
        return 2
    argumentos = ["edicao", "enviar"]
    if edicao := os.environ.get("ENVIO_EDICAO_ID"):
        argumentos.append(edicao)
    if limite := os.environ.get("ENVIO_LIMITE"):
        argumentos += ["--limite", limite]
    if simular == "true":
        argumentos.append("--simular")
    if os.environ.get("GITHUB_EVENT_NAME") == "schedule":
        hoje = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
        segunda = hoje - timedelta(days=hoje.weekday())
        argumentos += ["--publicada-desde", segunda.isoformat()]
    # O Actions é público: nem logs de bibliotecas podem expor dados do inscrito ou exceções.
    anterior = logging.root.manager.disable
    logging.disable(logging.CRITICAL)
    try:
        return cli(argumentos) or 0
    finally:
        logging.disable(anterior)


def main(argv: list[str] | None = None) -> int:
    argumentos = sys.argv[1:] if argv is None else argv
    try:
        if argumentos == ["agenda"]:
            return agenda()
        if argumentos == ["enviar"]:
            return enviar()
        if argumentos == ["preparar-migration"]:
            return preparar_migration()
        if argumentos not in (["migrar"], ["coletar", "camara"], ["coletar", "senado"]):
            print("::error::Tarefa inválida. Use agenda, migrar, enviar ou coletar camara/senado.")
            return 2
        if not os.environ.get("DATABASE_URL", "").strip():
            print("::error::Defina DATABASE_URL; a tarefa não usa o banco local por padrão.")
            return 2
        return migrar() if argumentos == ["migrar"] else coletar(argumentos[1])
    except Exception:
        if argumentos in (["agenda"], ["enviar"]):
            print(json.dumps({"falhas_gerais": 1}))
            return 1
        # Erros de configuração, driver ou Alembic podem carregar credenciais/SQL.
        print("::error::A tarefa falhou. Confira a configuração e o banco; detalhes omitidos.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
