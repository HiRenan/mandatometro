import json
from datetime import date, datetime
from decimal import Decimal
from functools import partial
from pathlib import Path

import httpx2
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from mandatometro.cli import main
from mandatometro.coleta import ipca
from mandatometro.coleta.http import USER_AGENT, ClienteHttp, ErroColeta
from mandatometro.db.modelos import Fonte, IpcaMensal

HOJE = date(2026, 11, 22)
ULTIMO_MES = date(2026, 10, 1)
FIXTURE = Path(__file__).parent / "fixtures" / "ipca" / "sgs-433.json"


@pytest.fixture
def dados_sgs():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def _cliente_sgs(dados):
    def responder(pedido):
        assert pedido.url.host == "api.bcb.gov.br"
        assert pedido.headers["user-agent"] == USER_AGENT
        if pedido.url.path == "/robots.txt":
            return httpx2.Response(404)
        assert pedido.url.path == "/dados/serie/bcdata.sgs.433/dados"
        assert dict(pedido.url.params) == {
            "formato": "json",
            "dataInicial": "01/01/2006",
            "dataFinal": HOJE.strftime("%d/%m/%Y"),
        }
        return httpx2.Response(200, json=dados)

    return httpx2.Client(transport=httpx2.MockTransport(responder))


def test_comando_carrega_repete_e_atualiza_mes_revisado(dados_sgs, sessao, monkeypatch, capsys):
    class Relogio(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime.combine(HOJE, datetime.min.time(), tzinfo=tz)

    abrir = partial(Session, bind=sessao.connection(), join_transaction_mode="create_savepoint")
    with _cliente_sgs(dados_sgs) as cliente:
        monkeypatch.setattr(ipca, "sessao", abrir)
        monkeypatch.setattr(ipca, "datetime", Relogio)
        monkeypatch.setattr(ipca, "ClienteHttp", partial(ClienteHttp, cliente=cliente, intervalo=0))

        assert main(["coleta", "ipca"]) == 0
        resumo = json.loads(capsys.readouterr().out)
        assert resumo["completa"] is True
        assert (resumo["meses"], resumo["mes_fim"], resumo["chamadas"]) == (250, "2026-10", 2)
        mes = sessao.get(IpcaMensal, ULTIMO_MES)
        assert mes.variacao_percentual == Decimal("0.14")
        assert sessao.get(IpcaMensal, date(2026, 8, 1)).variacao_percentual == Decimal("-0.32")
        fonte_id = mes.fonte_id
        data_coleta = mes.fonte.coletado_em
        assert "bcdata.sgs.433/dados?" in mes.fonte.url

        dados_sgs[-1]["valor"] = "0.19"
        assert main(["coleta", "ipca"]) == 0
        sessao.refresh(mes)
        assert sessao.scalar(select(func.count()).select_from(IpcaMensal)) == 250
        assert mes.variacao_percentual == Decimal("0.19")
        assert mes.fonte_id != fonte_id
        assert mes.fonte.coletado_em >= data_coleta
        assert sessao.scalar(select(func.count()).select_from(Fonte)) == 2

        # Setembro ainda passa a regra do segundo mês anterior, mas a carga já tem outubro.
        dados_sgs.pop()
        assert main(["coleta", "ipca"]) == 1
        sessao.refresh(mes)
        assert mes.variacao_percentual == Decimal("0.19")
        assert sessao.scalar(select(func.count()).select_from(IpcaMensal)) == 250
        assert sessao.scalar(select(func.count()).select_from(Fonte)) == 2


@pytest.mark.parametrize(
    ("indice", "item"),
    [
        (0, None),
        (100, None),
        (100, {"data": "01/01/2006", "valor": "0.59"}),
        (100, {"data": "02/05/2014", "valor": "0.46"}),
        (100, {"data": "01/13/2014", "valor": "0.46"}),
        (100, {"data": "01/12/2026", "valor": "0.46"}),
        (100, {"data": "01/05/2014", "valor": "0,46"}),
        (100, {"data": "01/05/2014", "valor": "-100.00"}),
        (100, {"data": "01/05/2014", "valor": 0.46}),
        (100, {"data": "01/05/2014"}),
    ],
    ids=[
        "inicio-deslocado",
        "lacuna",
        "duplicado",
        "dia",
        "data-invalida",
        "mes-futuro",
        "virgula",
        "taxa-que-zera-o-fator",
        "numero-em-vez-de-texto",
        "campo-ausente",
    ],
)
def test_ipca_recusa_dados_invalidos_antes_de_abrir_sessao(dados_sgs, indice, item):
    if item is None:
        dados_sgs.pop(indice)
    else:
        dados_sgs[indice] = item
    with (
        _cliente_sgs(dados_sgs) as cliente,
        ClienteHttp("https://api.bcb.gov.br", cliente=cliente, intervalo=0) as http,
        pytest.raises(ErroColeta),
    ):
        ipca.coletar(http, hoje=HOJE, abrir_sessao=lambda: pytest.fail("A carga abriu o banco."))


@pytest.mark.parametrize("corte", [0, 248])
def test_ipca_recusa_serie_vazia_ou_antiga_na_primeira_carga(dados_sgs, corte):
    with (
        _cliente_sgs(dados_sgs[:corte]) as cliente,
        ClienteHttp("https://api.bcb.gov.br", cliente=cliente, intervalo=0) as http,
        pytest.raises(ErroColeta),
    ):
        ipca.coletar(http, hoje=HOJE, abrir_sessao=lambda: pytest.fail("A carga abriu o banco."))
