"""Rodadas offline com o HTTP real do adaptador e persistência substituída até a migration."""

import asyncio
import json
from datetime import UTC, date, datetime
from uuid import UUID

import httpx2
import pytest

from mandatometro.avisos import envio
from mandatometro.avisos.consulta import EdicaoCarregada
from mandatometro.avisos.resend import Resend
from mandatometro.db.modelos import Edicao, Fonte, ItemEdicao


@pytest.fixture
def rodada(monkeypatch):
    fonte = Fonte(id=1, url="https://www.camara.leg.br/ficticia", coletado_em=datetime.now(UTC))
    edicao = Edicao(
        id=10,
        titulo="Edição fictícia",
        inicio=date(2026, 11, 9),
        fim=date(2026, 11, 15),
        publicada_em=datetime(2026, 11, 15, tzinfo=UTC),
        estado="publicada",
        itens=[ItemEdicao(ordem=1, titulo="Notícia", texto="Texto fictício.", fonte=fonte)],
    )
    carregada = EdicaoCarregada(edicao, {1: fonte})
    dados = {"inscritos": set(), "aceitos": set(), "chamadas": [], "esperas": [], "falha": None}

    def destinatario(banco, inscrito_id, edicao):
        if inscrito_id not in dados["inscritos"]:
            return None
        return envio.Destinatario(
            f"pessoa{inscrito_id}@example.com",
            UUID(int=inscrito_id),
            atualizado=inscrito_id in dados["aceitos"],
        )

    def contar(banco, edicao, teto):
        ids = {i for i in dados["inscritos"] if i <= teto}
        return len(ids), len(ids - dados["aceitos"])

    def ids(banco, edicao, teto):
        return iter(sorted(i for i in dados["inscritos"] - dados["aceitos"] if i <= teto))

    monkeypatch.setattr(envio, "_carregar", lambda *a, **kw: carregada)
    monkeypatch.setattr(envio, "_teto", lambda _: max(dados["inscritos"], default=0))
    monkeypatch.setattr(envio, "_contar", contar)
    monkeypatch.setattr(envio, "_ids", ids)
    monkeypatch.setattr(envio, "_destinatario", destinatario)
    monkeypatch.setattr(envio, "_confirmar", lambda banco, i, edicao: dados["aceitos"].add(i))

    def handler(request):
        dados["chamadas"].append(request)
        if dados["falha"]:
            resposta = dados["falha"](request)
            if resposta:
                return resposta
        return httpx2.Response(200, json={"id": str(UUID(int=1000))})

    async def dormir(segundos):
        dados["esperas"].append(segundos)

    provedor = Resend(
        "chave-ficticia",
        "remetente@example.com",
        transporte=httpx2.MockTransport(handler),
        dormir=dormir,
    )

    def executar(**kwargs):
        return asyncio.run(
            envio.enviar_edicao(
                None,
                provedor,
                app_base_url="https://site.example.com",
                api_url="https://api.example.com",
                dormir=dormir,
                **kwargs,
            )
        )

    dados.update(executar=executar, provedor=provedor, carregada=carregada)
    return dados


def test_trinta_inscritos_recebem_uma_vez_com_mesmo_email_da_inscricao(rodada):
    rodada["inscritos"].update(range(1, 31))
    resumo, codigo = rodada["executar"]()
    assert codigo == 0
    assert resumo["aceitos_nesta_execucao"] == 30 and resumo["faltam"] == 0
    assert len(rodada["chamadas"]) == 30
    assert len(rodada["esperas"]) == 29
    assert all(0 < s <= 1 for s in rodada["esperas"])
    for i, request in enumerate(rodada["chamadas"], 1):
        assert request.headers["Idempotency-Key"] == f"inscricao/{i}/edicao/10"
        corpo = json.loads(request.content)
        assert corpo["to"] == [f"pessoa{i}@example.com"]
        assert corpo["subject"] == "Edição fictícia"
        assert corpo["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    resumo, codigo = rodada["executar"]()
    assert codigo == 0 and resumo["aceitos_nesta_execucao"] == 0
    assert resumo["ja_atualizados"] == 30
    assert len(rodada["chamadas"]) == 30


def test_cento_e_cinquenta_retoma_depois_da_cota_sem_reenviar(rodada):
    rodada["inscritos"].update(range(1, 151))
    rodada["falha"] = lambda _: (
        httpx2.Response(429, json={"name": "daily_quota_exceeded"})
        if len(rodada["aceitos"]) == 100
        else None
    )
    resumo, codigo = rodada["executar"]()
    assert codigo == 1 and resumo["cota_diaria"] == 1
    assert resumo["aceitos_nesta_execucao"] == 100 and resumo["faltam"] == 50
    rodada["falha"] = None
    resumo, codigo = rodada["executar"](edicao_id=10)
    assert codigo == 0 and resumo["aceitos_nesta_execucao"] == 50 and resumo["faltam"] == 0
    assert len(rodada["aceitos"]) == 150
    assert all(i in rodada["aceitos"] for i in range(1, 151))


@pytest.mark.parametrize(
    "status,nome", [(400, "validation_error"), (409, "concurrent_idempotent_requests")]
)
def test_recusa_ou_concorrencia_individual_nao_para_outros(rodada, status, nome):
    rodada["inscritos"].update([1, 2, 3])
    rodada["falha"] = lambda req: (
        httpx2.Response(status, json={"name": nome, "message": "pessoa1@example.com"})
        if json.loads(req.content)["to"] == ["pessoa1@example.com"]
        else None
    )
    resumo, codigo = rodada["executar"]()
    assert codigo == 1 and resumo["faltam"] == 1
    assert rodada["aceitos"] == {2, 3}
    assert len(rodada["chamadas"]) == 3
    rodada["falha"] = None
    assert rodada["executar"]()[1] == 0
    assert rodada["aceitos"] == {1, 2, 3}


@pytest.mark.parametrize(
    "status,nome,campo",
    [(403, "validation_error", "falhas_gerais"), (429, "monthly_quota_exceeded", "cota_mensal")],
)
def test_falha_geral_ou_mensal_para_sem_marcar_sucesso(rodada, status, nome, campo):
    rodada["inscritos"].update([1, 2, 3])
    rodada["falha"] = lambda _: httpx2.Response(status, json={"name": nome})
    resumo, codigo = rodada["executar"]()
    assert codigo == 1 and resumo[campo] == 1 and resumo["faltam"] == 3
    assert not rodada["aceitos"] and len(rodada["chamadas"]) == 1


def test_simulacao_sem_chave_nao_chama_http_nem_confirma(rodada):
    rodada["inscritos"].update([1, 2, 3])
    rodada["provedor"]._chave = None
    resumo, codigo = rodada["executar"](simular=True)
    assert codigo == 0 and resumo["faltam"] == 3
    assert not rodada["aceitos"] and not rodada["chamadas"]
    assert rodada["executar"]()[1] == 2


def test_limite_e_saida_antes_do_http_novos_ficam_para_proxima(rodada):
    rodada["inscritos"].update([1, 2, 3])

    def depois_do_primeiro(_):
        rodada["inscritos"].discard(2)
        rodada["inscritos"].add(4)

    rodada["falha"] = depois_do_primeiro
    resumo, codigo = rodada["executar"](limite=1)
    assert codigo == 1 and resumo["aceitos_nesta_execucao"] == 1
    assert rodada["aceitos"] == {1}
    rodada["falha"] = None
    assert rodada["executar"]()[1] == 0
    assert rodada["aceitos"] == {1, 3, 4}


def test_ausencia_de_nova_edicao_nao_faz_http(rodada, monkeypatch):
    monkeypatch.setattr(envio, "_carregar", lambda *a, **kw: None)
    resumo, codigo = rodada["executar"](publicada_desde=datetime(2026, 11, 16, tzinfo=UTC))
    assert codigo == 0 and resumo["edicao_id"] is None
    assert not rodada["chamadas"]
    assert rodada["executar"](edicao_id=99)[1] == 1
