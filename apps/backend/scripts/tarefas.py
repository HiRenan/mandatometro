"""Entrada dos workflows: configuração explícita e falhas sem traceback ou segredos.

O preparo da migration usa só a biblioteca padrão, antes de instalar dependências.
A regra de coleta continua no CLI; este arquivo só adapta a execução ao Actions.
"""

import json
import logging
import os
import sys
from datetime import datetime, timedelta
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
        if argumentos == ["enviar"]:
            return enviar()
        if argumentos == ["preparar-migration"]:
            return preparar_migration()
        if argumentos not in (["migrar"], ["coletar", "camara"], ["coletar", "senado"]):
            print("::error::Tarefa inválida. Use migrar, enviar ou coletar camara/senado.")
            return 2
        if not os.environ.get("DATABASE_URL", "").strip():
            print("::error::Defina DATABASE_URL; a tarefa não usa o banco local por padrão.")
            return 2
        return migrar() if argumentos == ["migrar"] else coletar(argumentos[1])
    except Exception:
        if argumentos == ["enviar"]:
            print(json.dumps({"falhas_gerais": 1}))
            return 1
        # Erros de configuração, driver ou Alembic podem carregar credenciais/SQL.
        print("::error::A tarefa falhou. Confira a configuração e o banco; detalhes omitidos.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
