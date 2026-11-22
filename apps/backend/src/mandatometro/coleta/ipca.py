"""Coleta e atualiza a série mensal do IPCA publicada no SGS do Banco Central."""

import json
import re
from argparse import Namespace
from collections.abc import Callable
from datetime import date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.coleta.http import ClienteHttp, ErroColeta
from mandatometro.coleta.persistencia import registrar_fonte
from mandatometro.db import sessao
from mandatometro.db.modelos import Fonte, IpcaMensal

_BCB = "https://api.bcb.gov.br"
_SERIE = "dados/serie/bcdata.sgs.433/dados"
_PRIMEIRO_MES = date(2006, 1, 1)
_DATA = re.compile(r"[0-9]{2}/[0-9]{2}/[0-9]{4}")
_VARIACAO = re.compile(r"-?[0-9]{1,5}\.[0-9]{2}")


def _validar_serie(dados: object, hoje: date) -> tuple[dict[date, Decimal], date]:
    if not isinstance(dados, list) or not dados:
        raise ErroColeta("Resposta do IPCA sem série mensal.")
    serie: dict[date, Decimal] = {}
    mes_corrente = hoje.replace(day=1)
    for item in dados:
        if not isinstance(item, dict):
            raise ErroColeta("Registro inválido na série do IPCA.")
        data, valor = item.get("data"), item.get("valor")
        if not isinstance(data, str) or not _DATA.fullmatch(data):
            raise ErroColeta("Data inválida na série do IPCA.")
        try:
            mes = datetime.strptime(data, "%d/%m/%Y").date()
        except ValueError:
            raise ErroColeta("Data inválida na série do IPCA.") from None
        if mes.day != 1 or not _PRIMEIRO_MES <= mes <= mes_corrente or mes in serie:
            raise ErroColeta("Mês fora do intervalo, repetido ou inválido na série do IPCA.")
        if not isinstance(valor, str) or not _VARIACAO.fullmatch(valor):
            raise ErroColeta("Variação inválida na série do IPCA.")
        variacao = Decimal(valor)
        if variacao <= -100:
            raise ErroColeta("Variação inválida na série do IPCA.")
        serie[mes] = variacao

    ultimo_mes = max(serie)
    meses_esperados = (ultimo_mes.year - _PRIMEIRO_MES.year) * 12 + ultimo_mes.month
    # A publicação pode ficar para o mês seguinte ao mês de referência.
    mes_anterior = (mes_corrente - timedelta(days=1)).replace(day=1)
    penultimo_mes = (mes_anterior - timedelta(days=1)).replace(day=1)
    if len(serie) != meses_esperados or ultimo_mes < penultimo_mes:
        raise ErroColeta("Série mensal do IPCA incompleta.")
    return serie, ultimo_mes


def coletar(
    http: ClienteHttp, *, hoje: date, abrir_sessao: Callable[[], Session]
) -> tuple[int, date]:
    resposta = http.obter_json(
        _SERIE,
        params={
            "formato": "json",
            "dataInicial": _PRIMEIRO_MES.strftime("%d/%m/%Y"),
            "dataFinal": hoje.strftime("%d/%m/%Y"),
        },
    )
    serie, ultimo_mes = _validar_serie(resposta.dados, hoje)

    with abrir_sessao() as banco, banco.begin():
        banco.execute(select(func.pg_advisory_xact_lock(func.hashtext("mandatometro.coleta.ipca"))))
        atual = banco.execute(
            select(IpcaMensal.mes, Fonte.coletado_em)
            .join(IpcaMensal.fonte)
            .order_by(IpcaMensal.mes.desc())
            .limit(1)
        ).one_or_none()
        if atual is not None:
            if ultimo_mes < atual.mes:
                raise ErroColeta("A série do IPCA termina antes do último mês gravado.")
            if resposta.coletado_em < atual.coletado_em:
                raise ErroColeta("Há uma coleta do IPCA mais recente no banco.")

        fonte = registrar_fonte(banco, resposta)
        inserir = insert(IpcaMensal).values(
            [
                {"mes": mes, "variacao_percentual": variacao, "fonte_id": fonte.id}
                for mes, variacao in serie.items()
            ]
        )
        banco.execute(
            inserir.on_conflict_do_update(
                index_elements=[IpcaMensal.mes],
                set_={
                    "variacao_percentual": inserir.excluded.variacao_percentual,
                    "fonte_id": inserir.excluded.fonte_id,
                },
            )
        )
    return len(serie), ultimo_mes


def _executar(_: Namespace) -> int:
    hoje = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    meses, mes_fim, erro = 0, None, None
    with ClienteHttp(_BCB) as http:
        try:
            meses, ultimo_mes = coletar(http, hoje=hoje, abrir_sessao=sessao)
            mes_fim = ultimo_mes.strftime("%Y-%m")
        except ErroColeta as falha:
            erro = str(falha)
        except SQLAlchemyError:
            erro = "Falha ao gravar a série do IPCA."
    print(
        json.dumps(
            {
                "completa": erro is None,
                "meses": meses,
                "mes_fim": mes_fim,
                "chamadas": http.chamadas,
                "tentativas_extras": http.tentativas_extras,
                "erro": erro,
            },
            ensure_ascii=False,
        )
    )
    return int(erro is not None)


def registrar(casas) -> None:
    parser = casas.add_parser("ipca", help="atualiza a série mensal do IPCA do Banco Central")
    parser.set_defaults(rodar=_executar)
