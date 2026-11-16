"""Leitura agregada e exclusão explícita, sem rota administrativa pública."""

import argparse
import json
import sys

from sqlalchemy.exc import SQLAlchemyError

from mandatometro.config import config
from mandatometro.db import engine
from mandatometro.piloto import VERSAO_QUIZ
from mandatometro.piloto.medicao import apagar_medicao
from mandatometro.piloto.relatorio import resultado


def _resultado(args: argparse.Namespace) -> int:
    try:
        resumo = resultado(engine(), args.versao)
    except SQLAlchemyError:
        print("Banco indisponível para ler a medição do piloto.", file=sys.stderr)
        return 1
    print(json.dumps(resumo, ensure_ascii=False))
    return 0


def _apagar(args: argparse.Namespace) -> int:
    if not args.confirmar:
        print("Informe --confirmar para apagar a medição dessa versão.", file=sys.stderr)
        return 2
    ativo = config().piloto_ativo
    if ativo:
        print("Desligue o piloto antes de apagar a medição.", file=sys.stderr)
        return 1
    try:
        resumo = apagar_medicao(engine(), args.versao, ativo=ativo)
    except SQLAlchemyError:
        print("Banco indisponível para apagar a medição do piloto.", file=sys.stderr)
        return 1
    print(json.dumps(resumo, ensure_ascii=False))
    return 0


def registrar_comando(comandos) -> None:
    piloto = comandos.add_parser("piloto", help="lê ou apaga a medição agregada do piloto")
    operacoes = piloto.add_subparsers(dest="operacao", required=True)
    ler = operacoes.add_parser("resultado", help="imprime contagens e médias com supressão")
    ler.add_argument("--versao", required=True, choices=[VERSAO_QUIZ])
    ler.set_defaults(rodar=_resultado)
    apagar = operacoes.add_parser("apagar", help="apaga a versão, somente com o piloto desligado")
    apagar.add_argument("--versao", required=True, choices=[VERSAO_QUIZ])
    apagar.add_argument("--confirmar", action="store_true", help="confirma a exclusão da medição")
    apagar.set_defaults(rodar=_apagar)
