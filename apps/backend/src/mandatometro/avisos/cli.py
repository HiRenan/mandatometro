"""Entrada do envio; a saída contém somente contagens e o número da edição."""

import argparse
import asyncio
import json
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from pydantic import ValidationError

from mandatometro.avisos.envio import enviar_edicao
from mandatometro.avisos.resend import Resend
from mandatometro.config import config
from mandatometro.db import engine


class ParserEnvio(argparse.ArgumentParser):
    def error(self, message):
        # O argparse padrão ecoa argumentos inválidos, que podem conter endereços ou códigos.
        print(json.dumps({"argumentos_invalidos": 1}))
        raise SystemExit(2)


def _rodar(args: argparse.Namespace) -> int:
    try:
        if args.id is not None and args.id < 1 or args.limite is not None and args.limite < 1:
            raise ValueError
        desde = None
        if args.publicada_desde is not None:
            dia = date.fromisoformat(args.publicada_desde)
            if dia.isoformat() != args.publicada_desde:
                raise ValueError
            desde = datetime.combine(dia, time.min, ZoneInfo("America/Sao_Paulo"))
    except ValueError:
        print(json.dumps({"argumentos_invalidos": 1}))
        return 2
    try:
        conf = config()
        provedor = Resend(
            conf.resend_api_key.get_secret_value() if conf.resend_api_key else None,
            conf.resend_from,
        )
        resumo, codigo = asyncio.run(
            enviar_edicao(
                engine(),
                provedor,
                app_base_url=conf.app_base_url,
                api_url=conf.api_url,
                edicao_id=args.id,
                publicada_desde=desde,
                simular=args.simular,
                limite=args.limite,
            )
        )
    except ValidationError:
        resumo, codigo = {"configuracao_invalida": 1}, 2
    except Exception:
        # Driver, configuração e provedor podem incluir dados pessoais ou segredos no erro.
        resumo, codigo = {"falhas_gerais": 1}, 1
    print(json.dumps(resumo, ensure_ascii=False))
    return codigo


def registrar_comando(acoes: argparse._SubParsersAction) -> None:
    comando = acoes.add_parser("enviar", help="envia uma edição publicada aos inscritos pendentes")
    comando.add_argument(
        "id", nargs="?", type=int, help="edição; sem número, usa a última publicada"
    )
    comando.add_argument(
        "--simular", action="store_true", help="confere e conta sem enviar ou gravar"
    )
    comando.add_argument("--limite", type=int, help="máximo de destinatários tentados nesta rodada")
    comando.add_argument(
        "--publicada-desde", help="publicada desde AAAA-MM-DD, no fuso de Brasília"
    )
    comando.set_defaults(rodar=_rodar)
