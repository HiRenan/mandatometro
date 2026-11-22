"""Período e resumo comuns aos comandos de coleta."""

import argparse
import json
from dataclasses import asdict
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from mandatometro.coleta.tipos import ResumoAtos, ResumoColeta


def adicionar_argumentos_periodo(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--inicio", metavar="AAAA-MM-DD", help="primeiro dia, inclusive")
    parser.add_argument("--fim", metavar="AAAA-MM-DD", help="último dia, inclusive")


def adicionar_argumento_temas(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--somente-temas",
        action="store_true",
        help="preenche temas pelas proposições das votações já gravadas",
    )


def resolver_periodo(
    inicio: str | None,
    fim: str | None,
    *,
    hoje: date | None = None,
) -> tuple[date, date]:
    if inicio is None and fim is None:
        hoje = hoje or datetime.now(ZoneInfo("America/Sao_Paulo")).date()
        return hoje - timedelta(days=7), hoje - timedelta(days=1)
    if inicio is None or fim is None:
        raise ValueError("Informe --inicio e --fim juntos.")
    try:
        primeiro, ultimo = date.fromisoformat(inicio), date.fromisoformat(fim)
    except ValueError:
        raise ValueError("As datas precisam ser válidas, no formato AAAA-MM-DD.") from None
    if primeiro.isoformat() != inicio or ultimo.isoformat() != fim:
        raise ValueError("As datas precisam estar no formato AAAA-MM-DD.")
    if primeiro > ultimo:
        raise ValueError("O início não pode ser posterior ao fim.")
    return primeiro, ultimo


def mostrar_resumo(resumo: ResumoColeta | ResumoAtos) -> None:
    """Uma linha JSON para o agendamento, com contagens confirmadas e falhas sem payload."""
    print(json.dumps(asdict(resumo), ensure_ascii=False, default=str))
