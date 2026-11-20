"""Linha de comando do Mandatômetro.

A regra de negócio fica fora do HTTP: os jobs de coleta e de IA entram aqui como subcomandos e
rodam à mão ou agendados, gravando no banco que a API lê.
"""

import argparse
import json
import sys
from pathlib import Path

from mandatometro import contas_cli
from mandatometro.avisos.cli import ParserEnvio
from mandatometro.coleta import camara, destaques, legislacao
from mandatometro.coleta.senado import registrar as registrar_senado
from mandatometro.ia import cli as edicao
from mandatometro.piloto.cli import registrar_comando as registrar_piloto


def _openapi(args: argparse.Namespace) -> None:
    from mandatometro.api.app import app

    texto = json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n"
    # Fim de linha LF também no Windows, para o CI comparar com o arquivo do repositório.
    Path(args.caminho).write_text(texto, encoding="utf-8", newline="\n")
    print(f"OpenAPI gravado em {args.caminho}")


def main(argv: list[str] | None = None) -> int:
    argumentos = sys.argv[1:] if argv is None else argv
    tipo_parser = argparse.ArgumentParser
    if argumentos[:1] == ["conta"]:
        tipo_parser = contas_cli.ParserConta
    elif argumentos[:2] == ["edicao", "enviar"]:
        tipo_parser = ParserEnvio
    parser = tipo_parser(prog="mandatometro", description="Mandatômetro: backend.")
    comandos = parser.add_subparsers(dest="comando", required=True)

    openapi = comandos.add_parser(
        "openapi", help="grava o esquema OpenAPI da API, de onde sai o cliente TypeScript"
    )
    openapi.add_argument("caminho", nargs="?", default="openapi.json")
    openapi.set_defaults(rodar=_openapi)

    coleta = comandos.add_parser("coleta", help="coleta dados do Congresso e do Diário Oficial")
    casas = coleta.add_subparsers(dest="casa")
    casas.required = True
    camara.registrar_comando(casas)
    registrar_senado(casas)
    legislacao.registrar(casas)
    destaques.registrar(casas)
    edicao.registrar_comando(comandos)
    registrar_piloto(comandos)
    contas_cli.registrar_comando(comandos)

    args = parser.parse_args(argumentos)
    return args.rodar(args) or 0
