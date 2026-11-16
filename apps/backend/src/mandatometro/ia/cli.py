"""Comandos de edição: só o mostrar imprime conteúdo; os demais retornam resumos seguros."""

import argparse
import json
from pathlib import Path

from sqlalchemy.exc import SQLAlchemyError

from mandatometro.coleta.cli import adicionar_argumentos_periodo, resolver_periodo
from mandatometro.config import config
from mandatometro.db import sessao as sessao_do_banco
from mandatometro.ia.servico import ErroEdicao, exportar, gerar, mostrar, publicar, revisar

LIMITE_ARQUIVO = 2 * 1024 * 1024


def _json(resumo: dict) -> None:
    print(json.dumps(resumo, ensure_ascii=False, default=str))


def _ler(caminho: Path) -> dict:
    with caminho.open("rb") as arquivo:
        bruto = arquivo.read(LIMITE_ARQUIVO + 1)
    if len(bruto) > LIMITE_ARQUIVO:
        raise ErroEdicao("O arquivo de revisão excede o limite de dois megabytes.")
    try:
        dados = json.loads(bruto.decode("utf-8-sig"))
    except (UnicodeError, ValueError):
        raise ErroEdicao("Confira o formato JSON e salve o arquivo em UTF-8.") from None
    if not isinstance(dados, dict):
        raise ErroEdicao("Use o objeto JSON exportado pelo comando exportar.")
    return dados


def _rodar(args: argparse.Namespace) -> int:
    if args.acao == "rascunho":
        try:
            inicio, fim = resolver_periodo(args.inicio, args.fim)
            if args.teto < 1:
                raise ValueError("O teto precisa ser um número inteiro maior que zero.")
        except ValueError as erro:
            _json({"erro": str(erro)})
            return 2
    elif args.id < 1:
        _json({"erro": "O número da edição precisa ser maior que zero."})
        return 2
    try:
        if args.acao == "rascunho":
            # O adaptador depende da escolha do provedor. Sem ele, a redação fica manual.
            resumo = gerar(sessao_do_banco, inicio, fim, teto=args.teto, refazer=args.refazer)
        elif args.acao == "exportar":
            dados = exportar(sessao_do_banco, args.id)
            with args.arquivo.open("x", encoding="utf-8", newline="\n") as arquivo:
                json.dump(dados, arquivo, ensure_ascii=False, indent=2)
                arquivo.write("\n")
            resumo = {
                "situacao": "arquivo_exportado",
                "edicao_id": args.id,
                "itens": len(dados["itens"]),
            }
        elif args.acao == "revisar":
            dados = _ler(args.arquivo)
            resumo = revisar(sessao_do_banco, args.id, dados)
        elif args.acao == "publicar":
            resumo = publicar(sessao_do_banco, args.id)
        else:
            print(mostrar(sessao_do_banco, args.id, app_base_url=config().app_base_url))
            return 0
    except ErroEdicao as erro:
        _json({"erro": str(erro)})
        return 1
    except FileExistsError:
        _json({"erro": "O arquivo já existe. Escolha outro caminho para preservar a revisão."})
        return 1
    except (OSError, UnicodeError, SQLAlchemyError):
        # Nem o conteúdo do arquivo, nem parâmetros SQL ou endereços de conexão vão ao log.
        _json({"erro": "Não foi possível concluir. Confira o arquivo e a conexão com o banco."})
        return 1
    _json(resumo)
    return 0


def registrar_comando(comandos: argparse._SubParsersAction) -> None:
    edicao = comandos.add_parser("edicao", help="prepara, revisa e publica o jornal legislativo")
    acoes = edicao.add_subparsers(dest="acao", required=True)
    rascunho = acoes.add_parser("rascunho", help="prepara os fatos e a redação pendente")
    adicionar_argumentos_periodo(rascunho)
    rascunho.add_argument("--teto", type=int, default=8, help="máximo de itens (padrão: 8)")
    rascunho.add_argument(
        "--refazer", action="store_true", help="refaz o rascunho e descarta a revisão anterior"
    )
    rascunho.set_defaults(rodar=_rodar)
    for acao, ajuda in (
        ("exportar", "grava um arquivo JSON para revisão"),
        ("revisar", "valida e salva a revisão do arquivo"),
        ("publicar", "publica a revisão salva, se não houver pendência"),
        ("mostrar", "mostra a prévia da edição como o e-mail em texto"),
    ):
        comando = acoes.add_parser(acao, help=ajuda)
        comando.add_argument("id", type=int, help="número da edição")
        if acao in {"exportar", "revisar"}:
            comando.add_argument("--arquivo", type=Path, required=True, help="arquivo JSON UTF-8")
        comando.set_defaults(rodar=_rodar)
