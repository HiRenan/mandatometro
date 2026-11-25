"""Contrato público e limites de entrada; persistência é conferida no banco à parte."""

import asyncio
import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.exc import OperationalError

from mandatometro.api import piloto
from mandatometro.api.app import app
from mandatometro.config import Config, config
from mandatometro.piloto import VERSAO_QUIZ
from mandatometro.piloto.limite import LimiteAtingido

ROTA = "/piloto/tentativas"


def test_openapi_exige_situacao_e_documenta_todos_os_erros_sem_entrada():
    esquema = app.openapi()
    modelos = esquema["components"]["schemas"]
    assert modelos["ResultadoTentativaPiloto"]["required"] == ["situacao"]
    respostas = esquema["paths"][ROTA]["post"]["responses"]
    assert set(respostas) == {"200", "410", "413", "422", "429", "503"}
    for status in ("410", "413", "422", "429", "503"):
        assert respostas[status]["content"]["application/json"]["schema"] == {
            "$ref": "#/components/schemas/ErroPiloto"
        }


@pytest.fixture
def ambiente(monkeypatch):
    monkeypatch.setitem(Config.model_config, "env_file", None)
    monkeypatch.delenv("PILOTO_ATE", raising=False)
    monkeypatch.setenv("PILOTO_ATIVO", "true")
    monkeypatch.setenv("PILOTO_LIMITE_POR_MINUTO", "120")
    config.cache_clear()
    chamadas = []
    banco = object()
    monkeypatch.setattr(piloto, "engine", lambda: banco)

    def cota(engine, limite):
        assert engine is banco
        assert limite == 120
        chamadas.append("cota")

    def gravar(engine, participacao, versao_quiz, etapa, acertos):
        assert engine is banco
        chamadas.append((participacao, versao_quiz, etapa, acertos))

    monkeypatch.setattr(piloto, "consumir_cota", cota)
    monkeypatch.setattr(piloto, "registrar_tentativa", gravar)
    with TestClient(app) as cliente:
        yield cliente, chamadas
    config.cache_clear()


def pedido(**campos):
    return {
        "participacao": str(uuid4()),
        "versao_quiz": VERSAO_QUIZ,
        "etapa": "antes",
        "acertos": 7,
        **campos,
    }


def test_desligado_por_padrao_sem_abrir_banco(monkeypatch):
    monkeypatch.delenv("PILOTO_ATIVO", raising=False)
    assert Config(_env_file=None).piloto_ativo is False
    config.cache_clear()

    def proibido():
        pytest.fail("Piloto fechado não deve abrir banco.")

    monkeypatch.setattr(piloto, "engine", proibido)
    with TestClient(app) as cliente:
        resposta = cliente.post(ROTA, content=b"invalido")
    assert resposta.status_code == 410
    assert resposta.json() == {"erro": "piloto_encerrado"}
    assert resposta.headers["cache-control"] == "no-store"
    config.cache_clear()


@pytest.mark.parametrize("ativo, ate", [("true", "2000-01-01"), ("false", "9999-12-31")])
def test_encerrado_nao_le_corpo_nem_consume_cota(ambiente, monkeypatch, ativo, ate):
    cliente, chamadas = ambiente
    monkeypatch.setenv("PILOTO_ATIVO", ativo)
    monkeypatch.setenv("PILOTO_ATE", ate)

    def corpo():
        chamadas.append("leitura do corpo")
        yield b"{"

    resposta = cliente.post(ROTA, content=corpo(), headers={"Content-Type": "application/json"})
    assert resposta.status_code == 410
    assert resposta.json() == {"erro": "piloto_encerrado"}
    assert chamadas == []


@pytest.mark.parametrize("ate", [None, ""], ids=["ausente", "vazia"])
def test_piloto_ativo_sem_data_final(ambiente, monkeypatch, ate):
    cliente, _ = ambiente
    if ate is not None:
        monkeypatch.setenv("PILOTO_ATE", ate)
    assert cliente.post(ROTA, json=pedido()).status_code == 200


@pytest.mark.parametrize("valor", ["20261201", "2026-12-01T00:00:00Z", "2026-02-30"])
def test_data_final_exige_data_valida_no_formato_ano_mes_dia(monkeypatch, valor):
    monkeypatch.setenv("PILOTO_ATE", valor)
    with pytest.raises(ValidationError, match="piloto_ate"):
        Config(_env_file=None)


@pytest.mark.parametrize("etapa", ["antes", "depois"])
def test_resposta_igual_sem_devolver_acertos_ou_identificador(ambiente, etapa):
    cliente, chamadas = ambiente
    corpo = pedido(etapa=etapa)
    respostas = [cliente.post(ROTA, json=corpo) for _ in range(2)]
    assert all(r.status_code == 200 for r in respostas)
    assert all(r.json() == {"situacao": "recebida"} for r in respostas)
    assert all(r.headers["cache-control"] == "no-store" for r in respostas)
    assert chamadas[0] == chamadas[2] == "cota"
    assert str(chamadas[1][0]) == corpo["participacao"]
    assert chamadas[1][1:] == (VERSAO_QUIZ, etapa, 7)


@pytest.mark.parametrize(
    "campos",
    [
        {"acertos": -1},
        {"acertos": 13},
        {"acertos": True},
        {"acertos": 1.0},
        {"acertos": "7"},
        {"etapa": "durante"},
        {"versao_quiz": "desconhecida"},
        {"participacao": "00000000-0000-0000-0000-000000000000"},
        {"participacao": "nao-e-uuid"},
        {"email": "inventado@example.com"},
        {"turma": "senai"},
        {"respondido_em": "2026-11-20"},
    ],
)
def test_validacao_estrita_sem_repetir_entrada_e_depois_da_cota(ambiente, campos, caplog):
    cliente, chamadas = ambiente
    corpo = pedido(**campos)
    resposta = cliente.post(ROTA, json=corpo)
    assert resposta.status_code == 422
    assert resposta.json() == {"erro": "dados_invalidos"}
    assert chamadas == ["cota"]
    assert corpo["participacao"] not in caplog.text


@pytest.mark.parametrize("corpo", [b"{", b"\xff", b"null", b"[]", b"{}"])
def test_json_invalido_e_utf8_invalido_gastam_cota(ambiente, corpo):
    cliente, chamadas = ambiente
    resposta = cliente.post(ROTA, content=corpo, headers={"Content-Type": "application/json"})
    assert resposta.status_code == 422
    assert resposta.json() == {"erro": "dados_invalidos"}
    assert chamadas == ["cota"]


def test_tipo_de_conteudo_invalido(ambiente):
    cliente, chamadas = ambiente
    resposta = cliente.post(
        ROTA, content=json.dumps(pedido()), headers={"Content-Type": "text/plain"}
    )
    assert resposta.status_code == 422
    assert chamadas == ["cota"]


def test_limite_mede_bytes_e_nao_confia_em_content_length(ambiente):
    cliente, chamadas = ambiente
    resposta = cliente.post(
        ROTA,
        content=b" " * 2049,
        headers={"Content-Type": "application/json", "Content-Length": "1"},
    )
    assert resposta.status_code == 413
    assert resposta.json() == {"erro": "corpo_muito_grande"}
    assert chamadas == ["cota"]


def test_soma_chunks_sem_content_length_e_para_no_limite(ambiente):
    _, chamadas = ambiente

    async def executar():
        recebidos = []
        mensagens = iter(
            [
                {"type": "http.request", "body": b" " * 1024, "more_body": True},
                {"type": "http.request", "body": b" " * 1025, "more_body": True},
            ]
        )

        async def receber():
            return next(mensagens)

        async def enviar(mensagem):
            recebidos.append(mensagem)

        await app(
            {
                "type": "http",
                "asgi": {"version": "3.0"},
                "http_version": "1.1",
                "method": "POST",
                "scheme": "http",
                "path": ROTA,
                "raw_path": ROTA.encode(),
                "query_string": b"",
                "headers": [(b"content-type", b"application/json")],
                "server": ("testserver", 80),
                "client": ("127.0.0.1", 1234),
                "root_path": "",
            },
            receber,
            enviar,
        )
        return recebidos

    recebidos = asyncio.run(executar())
    assert recebidos[0]["status"] == 413
    assert json.loads(recebidos[1]["body"]) == {"erro": "corpo_muito_grande"}
    assert chamadas == ["cota"]


def test_429_antes_de_ler_corpo_e_retry_after_exposto(ambiente, monkeypatch):
    cliente, _ = ambiente

    def negar(*args):
        raise LimiteAtingido(17)

    monkeypatch.setattr(piloto, "consumir_cota", negar)
    resposta = cliente.post(ROTA, content=b"{", headers={"Origin": config().app_base_url})
    assert resposta.status_code == 429
    assert resposta.json() == {"erro": "limite_de_tentativas"}
    assert resposta.headers["retry-after"] == "17"
    assert "retry-after" in resposta.headers["access-control-expose-headers"].lower()


@pytest.mark.parametrize("alvo", ["consumir_cota", "registrar_tentativa"])
def test_banco_falha_sem_vazar_corpo_ou_excecao(ambiente, monkeypatch, caplog, alvo):
    cliente, _ = ambiente
    corpo = pedido()

    def falhar(*args):
        raise OperationalError("SQL com " + corpo["participacao"], {}, Exception("dado-ficticio"))

    monkeypatch.setattr(piloto, alvo, falhar)
    resposta = cliente.post(ROTA, json=corpo)
    assert resposta.status_code == 503
    assert resposta.json() == {"erro": "servico_indisponivel"}
    assert corpo["participacao"] not in resposta.text + caplog.text
    assert "dado-ficticio" not in caplog.text


def test_get_nao_grava_e_origem_estranha_nao_recebe_cors(ambiente):
    cliente, chamadas = ambiente
    assert cliente.get(ROTA).status_code == 405
    assert chamadas == []
    resposta = cliente.post(ROTA, json=pedido(), headers={"Origin": "https://fora.example.com"})
    assert "access-control-allow-origin" not in resposta.headers
