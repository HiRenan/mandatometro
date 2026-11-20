"""Concede e revoga o papel de administradora pelo banco."""

import argparse
import sys

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from mandatometro.db import sessao
from mandatometro.db.modelos import Conta

_endereco = TypeAdapter(EmailStr)


class ParserConta(argparse.ArgumentParser):
    def error(self, message):
        # O argparse pode incluir o endereço na mensagem de erro.
        self.exit(2, "Argumentos inválidos.\n")


def _alterar_papel(args: argparse.Namespace) -> int:
    try:
        email = _endereco.validate_python(args.email).casefold()
    except ValidationError:
        print("E-mail inválido.", file=sys.stderr)
        return 2

    try:
        with sessao() as db, db.begin():
            conta = db.scalar(select(Conta).where(Conta.email == email).with_for_update())
            if conta is None:
                codigo, mensagem = 3, "Conta não encontrada."
            elif conta.confirmada_em is None:
                codigo, mensagem = 4, "Conta ainda não confirmada."
            elif conta.papel == args.papel:
                codigo, mensagem = 5, args.repetido
            else:
                conta.papel = args.papel
                codigo, mensagem = 0, args.sucesso
    except (SQLAlchemyError, ValueError):
        codigo, mensagem = 1, "Não foi possível alterar o papel da conta."

    print(mensagem, file=sys.stderr if codigo else sys.stdout)
    return codigo


def registrar_comando(comandos: argparse._SubParsersAction) -> None:
    conta = comandos.add_parser("conta", help="altera o papel de uma conta confirmada")
    operacoes = conta.add_subparsers(dest="operacao", required=True)

    promover = operacoes.add_parser("promover", help="concede o papel de administradora")
    promover.add_argument("--email", required=True, help="e-mail da conta confirmada")
    promover.set_defaults(
        rodar=_alterar_papel,
        papel="administradora",
        sucesso="Conta promovida a administradora.",
        repetido="A conta já é administradora.",
    )

    revogar = operacoes.add_parser("revogar", help="remove o papel de administradora")
    revogar.add_argument("--email", required=True, help="e-mail da conta confirmada")
    revogar.set_defaults(
        rodar=_alterar_papel,
        papel="comum",
        sucesso="Papel de administradora removido.",
        repetido="A conta já é comum.",
    )
