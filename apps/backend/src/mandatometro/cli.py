"""Linha de comando do Mandatômetro.

A regra de negócio fica fora do HTTP: os jobs de coleta e de IA entram aqui como subcomandos e
rodam à mão ou agendados, gravando no banco que a API lê.
"""

import argparse
import json
from pathlib import Path


def _openapi(args: argparse.Namespace) -> None:
    from mandatometro.api.app import app

    texto = json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n"
    # Fim de linha LF também no Windows, para o CI comparar com o arquivo do repositório.
    Path(args.caminho).write_text(texto, encoding="utf-8", newline="\n")
    print(f"OpenAPI gravado em {args.caminho}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="mandatometro", description="Mandatômetro: backend.")
    comandos = parser.add_subparsers(dest="comando", required=True)

    openapi = comandos.add_parser(
        "openapi", help="grava o esquema OpenAPI da API, de onde sai o cliente TypeScript"
    )
    openapi.add_argument("caminho", nargs="?", default="openapi.json")
    openapi.set_defaults(rodar=_openapi)

    args = parser.parse_args(argv)
    args.rodar(args)
    return 0
