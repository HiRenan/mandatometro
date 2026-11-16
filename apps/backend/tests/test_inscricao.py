"""Contrato HTTP e transações reais; só o transporte do Resend é substituído."""

import json
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, event, func, select, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from mandatometro.api.app import app
from mandatometro.config import config
from mandatometro.db import engine
from mandatometro.db.modelos import Edicao, Fonte, Inscrito, ItemEdicao

ROTA = "/newsletter/inscricoes"
ORIGEM_DO_SITE = config().app_base_url


@pytest.fixture
def ambiente(engine_de_teste, monkeypatch):
    from os import environ

    def limpar():
        with engine_de_teste.begin() as conexao:
            for tabela in (ItemEdicao, Edicao, Inscrito, Fonte):
                conexao.execute(delete(tabela))
            conexao.execute(text("delete from limite_inscricao"))

    limpar()
    monkeypatch.setenv("DATABASE_URL", environ["TEST_DATABASE_URL"])
    monkeypatch.setenv("APP_BASE_URL", "https://site.example.com")
    monkeypatch.setenv("API_URL", "https://api.example.com")
    monkeypatch.setenv("RESEND_API_KEY", "chave-ficticia")
    monkeypatch.setenv("RESEND_FROM", "remetente@example.com")
    monkeypatch.setenv("NEWSLETTER_LIMITE_POR_MINUTO", "30")
    config.cache_clear()
    engine.cache_clear()
    dados = {"chamadas": [], "status": 200, "banco": engine_de_teste}
    cliente_real = httpx2.AsyncClient

    def handler(request):
        # Uma conexão independente enxerga a inscrição antes de qualquer envio.
        corpo = json.loads(request.content)
        with engine_de_teste.connect() as conexao:
            assert conexao.scalar(select(Inscrito.id).where(Inscrito.email == corpo["to"][0]))
        dados["chamadas"].append(request)
        return httpx2.Response(
            dados["status"],
            json={"id": "3cc98c59-839e-43bd-b5ce-e380c35bb5c0", "message": "pessoa@example.com"},
        )

    def simulado(**kwargs):
        kwargs["transport"] = httpx2.MockTransport(handler)
        return cliente_real(**kwargs)

    monkeypatch.setattr(httpx2, "AsyncClient", simulado)
    with TestClient(app) as cliente:
        dados["cliente"] = cliente
        yield dados
    engine().dispose()
    engine.cache_clear()
    config.cache_clear()
    limpar()


def publicar(ambiente, *, estado="publicada", dias=0):
    fonte = Fonte(
        url="https://www.camara.leg.br/noticias/exemplo",
        coletado_em=datetime(2026, 11, 14, tzinfo=UTC),
        trecho="Trecho fictício para teste.",
    )
    edicao = Edicao(
        titulo=f"Edição fictícia {dias} {estado}",
        inicio=date(2026, 11, 9),
        fim=date(2026, 11, 15),
        estado=estado,
        publicada_em=datetime(2026, 11, 15, tzinfo=UTC) + timedelta(days=dias)
        if estado == "publicada"
        else None,
        itens=[ItemEdicao(ordem=1, titulo="Item fictício", texto="Texto de teste.", fonte=fonte)],
    )
    with Session(ambiente["banco"], expire_on_commit=False) as sessao, sessao.begin():
        sessao.add(edicao)
    return edicao


def inscrito(ambiente):
    with Session(ambiente["banco"]) as sessao:
        return sessao.scalars(select(Inscrito)).one()


def test_novo_e_repetido_tem_mesma_resposta_e_envio_idempotente(ambiente):
    publicar(ambiente, dias=-7)
    ultima = publicar(ambiente)
    publicar(ambiente, estado="rascunho", dias=1)
    cliente = ambiente["cliente"]
    nova = cliente.post(ROTA, json={"email": " Pessoa@Example.COM "})
    assert nova.status_code == 200
    assert nova.json() == {"situacao": "edicao_enviada"}
    antes = inscrito(ambiente)
    repetida = cliente.post(ROTA, json={"email": "pessoa@example.com"})
    assert repetida.status_code == nova.status_code
    assert repetida.json() == nova.json()
    depois = inscrito(ambiente)
    assert (depois.id, depois.codigo_saida, depois.inscrito_em) == (
        antes.id,
        antes.codigo_saida,
        antes.inscrito_em,
    )
    assert depois.email == "pessoa@example.com"
    primeira, segunda = ambiente["chamadas"]
    assert primeira.content == segunda.content
    assert primeira.headers["Idempotency-Key"] == segunda.headers["Idempotency-Key"]
    assert json.loads(primeira.content)["subject"] == ultima.titulo
    assert str(antes.codigo_saida) not in nova.text
    assert nova.headers["cache-control"] == "no-store"


def test_sem_publicada_grava_e_nao_envia(ambiente):
    publicar(ambiente, estado="rascunho")
    for _ in range(2):
        resposta = ambiente["cliente"].post(ROTA, json={"email": "pessoa@example.com"})
        assert resposta.status_code == 200
        assert resposta.json() == {"situacao": "aguardando_edicao"}
    assert inscrito(ambiente).id
    assert ambiente["chamadas"] == []


def test_falha_no_resend_preserva_inscricao_e_permite_tentar_de_novo(ambiente, caplog):
    publicar(ambiente)
    ambiente["status"] = 401
    for _ in range(2):
        resposta = ambiente["cliente"].post(ROTA, json={"email": "pessoa@example.com"})
        assert resposta.status_code == 200
        assert resposta.json() == {"situacao": "envio_indisponivel"}
    antes = inscrito(ambiente)
    ambiente["status"] = 200
    resposta = ambiente["cliente"].post(ROTA, json={"email": "pessoa@example.com"})
    assert resposta.json() == {"situacao": "edicao_enviada"}
    assert inscrito(ambiente).codigo_saida == antes.codigo_saida
    assert "pessoa@example.com" not in caplog.text
    assert "chave-ficticia" not in caplog.text


def test_sem_chave_grava_sem_chamar_resend(ambiente, monkeypatch):
    publicar(ambiente)
    monkeypatch.setenv("RESEND_API_KEY", "")
    config.cache_clear()
    resposta = ambiente["cliente"].post(ROTA, json={"email": "pessoa@example.com"})
    assert resposta.status_code == 200
    assert resposta.json() == {"situacao": "envio_indisponivel"}
    assert inscrito(ambiente).id
    assert ambiente["chamadas"] == []


@pytest.mark.parametrize(
    "corpo",
    [
        {"email": "pessoa@example.com\r\nBcc: outra@example.com"},
        {"email": "Nome <pessoa@example.com>"},
        {"email": "email-invalido"},
        {"email": "pessoa@example.com", "nome": "Nome"},
        {"email": 10},
        {},
        ["pessoa@example.com"],
    ],
)
def test_validacao_nao_reflete_dados_nem_grava(ambiente, corpo, caplog):
    resposta = ambiente["cliente"].post(ROTA, json=corpo)
    assert resposta.status_code == 422
    assert resposta.json() == {"erro": "dados_invalidos"}
    assert "pessoa@example.com" not in resposta.text + caplog.text
    assert ambiente["chamadas"] == []
    with ambiente["banco"].connect() as conexao:
        assert conexao.scalar(select(func.count()).select_from(Inscrito)) == 0


def test_limite_conta_json_invalido_e_repeticoes_sem_olhar_ip(ambiente, monkeypatch):
    monkeypatch.setenv("NEWSLETTER_LIMITE_POR_MINUTO", "2")
    config.cache_clear()
    cliente = ambiente["cliente"]
    assert cliente.post(ROTA, content=b'{"email":').status_code == 422
    assert cliente.post(ROTA, json={"email": "pessoa@example.com"}).status_code == 200
    resposta = cliente.post(
        ROTA,
        json={"email": "pessoa@example.com"},
        headers={"X-Forwarded-For": "192.0.2.1", "Origin": ORIGEM_DO_SITE},
    )
    assert resposta.status_code == 429
    assert resposta.json() == {"erro": "limite_de_inscricoes"}
    assert 1 <= int(resposta.headers["Retry-After"]) <= 60
    assert resposta.headers["cache-control"] == "no-store"
    assert resposta.headers["access-control-allow-origin"] == ORIGEM_DO_SITE
    assert resposta.headers["access-control-expose-headers"] == "Retry-After"


def test_inscricoes_concorrentes_nao_duplicam_cadastro(ambiente):
    def tentar(_):
        return ambiente["cliente"].post(ROTA, json={"email": "pessoa@example.com"})

    with ThreadPoolExecutor(max_workers=4) as executor:
        respostas = list(executor.map(tentar, range(8)))
    assert all(r.status_code == 200 for r in respostas)
    assert all(r.json() == {"situacao": "aguardando_edicao"} for r in respostas)
    assert inscrito(ambiente).email == "pessoa@example.com"


@pytest.mark.parametrize("metodo", ["get", "head"])
def test_abrir_saida_nao_apaga(ambiente, metodo):
    cliente = ambiente["cliente"]
    cliente.post(ROTA, json={"email": "pessoa@example.com"})
    codigo = inscrito(ambiente).codigo_saida
    resposta = getattr(cliente, metodo)(f"/newsletter/saida/{codigo}", follow_redirects=False)
    assert resposta.status_code == 303
    assert (
        resposta.headers["location"] == f"https://site.example.com/newsletter/sair?codigo={codigo}"
    )
    assert resposta.headers["referrer-policy"] == "no-referrer"
    assert inscrito(ambiente).codigo_saida == codigo


@pytest.mark.parametrize("formato", ["sem_corpo", "form", "multipart", "arbitrario"])
def test_qualquer_post_na_saida_apaga_sem_ler_corpo(ambiente, formato):
    cliente = ambiente["cliente"]
    cliente.post(ROTA, json={"email": "pessoa@example.com"})
    codigo = inscrito(ambiente).codigo_saida
    argumentos = {
        "sem_corpo": {},
        "form": {"data": {"List-Unsubscribe": "One-Click"}},
        "multipart": {"files": {"List-Unsubscribe": (None, "One-Click")}},
        "arbitrario": {"content": b"corpo que nao precisa ser interpretado"},
    }[formato]
    resposta = cliente.post(f"/newsletter/saida/{codigo}", **argumentos)
    assert resposta.status_code == 200
    assert resposta.content == b""
    with ambiente["banco"].connect() as conexao:
        assert conexao.scalar(select(func.count()).select_from(Inscrito)) == 0
    assert cliente.post(f"/newsletter/saida/{codigo}").content == b""
    assert cliente.post(f"/newsletter/saida/{uuid4()}").status_code == 200


def test_saida_nao_usa_limite_de_inscricoes_e_codigo_antigo_nao_apaga_nova(ambiente, monkeypatch):
    monkeypatch.setenv("NEWSLETTER_LIMITE_POR_MINUTO", "1")
    config.cache_clear()
    cliente = ambiente["cliente"]
    cliente.post(ROTA, json={"email": "pessoa@example.com"})
    antigo = inscrito(ambiente).codigo_saida
    assert cliente.post(f"/newsletter/saida/{antigo}").status_code == 200
    with ambiente["banco"].begin() as conexao:
        conexao.execute(text("delete from limite_inscricao"))
    cliente.post(ROTA, json={"email": "pessoa@example.com"})
    assert inscrito(ambiente).codigo_saida != antigo
    cliente.post(f"/newsletter/saida/{antigo}")
    assert inscrito(ambiente).id


def test_codigo_malformado_nao_expoe_valor(ambiente):
    resposta = ambiente["cliente"].post("/newsletter/saida/pessoa@example.com")
    assert resposta.status_code == 422
    assert resposta.json() == {"erro": "dados_invalidos"}


def test_json_com_bytes_invalidos_tambem_tem_erro_sanitizado(ambiente):
    resposta = ambiente["cliente"].post(
        ROTA, content=b"\xff", headers={"Content-Type": "application/json"}
    )
    assert resposta.status_code == 422
    assert resposta.json() == {"erro": "dados_invalidos"}


def test_falha_no_banco_desfaz_inscricao_mas_preserva_cota(ambiente, caplog):
    banco = engine()

    def falhar_ao_ler_edicao(conn, cursor, statement, parameters, context, executemany):
        if statement.startswith("SELECT edicao."):
            raise OperationalError(statement, parameters, Exception("Detalhe: pessoa@example.com"))

    event.listen(banco, "before_cursor_execute", falhar_ao_ler_edicao)
    try:
        resposta = ambiente["cliente"].post(ROTA, json={"email": "pessoa@example.com"})
    finally:
        event.remove(banco, "before_cursor_execute", falhar_ao_ler_edicao)
    assert resposta.status_code == 503
    assert resposta.json() == {"erro": "servico_indisponivel"}
    with ambiente["banco"].connect() as conexao:
        assert conexao.scalar(select(func.count()).select_from(Inscrito)) == 0
        assert conexao.scalar(text("select sum(quantidade) from limite_inscricao")) == 1
    assert "pessoa@example.com" not in resposta.text + caplog.text
    assert ambiente["chamadas"] == []


def test_fonte_invalida_nao_perde_inscricao_nem_envia(ambiente):
    publicar(ambiente)
    with Session(ambiente["banco"]) as sessao, sessao.begin():
        sessao.scalars(select(Fonte)).one().url_publica = "javascript:alert(1)"
    resposta = ambiente["cliente"].post(ROTA, json={"email": "pessoa@example.com"})
    assert resposta.status_code == 200
    assert resposta.json() == {"situacao": "envio_indisponivel"}
    assert inscrito(ambiente).id
    assert ambiente["chamadas"] == []


def test_validacao_nao_consulta_dns(ambiente, monkeypatch):
    import dns.resolver

    def resolver(*args, **kwargs):
        pytest.fail("A inscrição não pode consultar DNS para validar o e-mail.")

    monkeypatch.setattr(dns.resolver.Resolver, "resolve", resolver)
    resposta = ambiente["cliente"].post(ROTA, json={"email": "pessoa@example.com"})
    assert resposta.status_code == 200


@pytest.mark.parametrize(
    "origem, status", [(ORIGEM_DO_SITE, 200), ("https://outro.example.com", 400)]
)
def test_preflight_da_inscricao_so_aceita_origem_do_site(origem, status):
    resposta = TestClient(app).options(
        ROTA,
        headers={
            "Origin": origem,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert resposta.status_code == status
    if status == 200:
        assert resposta.headers["access-control-allow-origin"] == ORIGEM_DO_SITE
        assert set(resposta.headers["access-control-allow-methods"].split(", ")) == {"GET", "POST"}
        assert "Content-Type" in resposta.headers["access-control-allow-headers"].split(", ")
    else:
        assert "access-control-allow-origin" not in resposta.headers


def test_openapi_fecha_as_tres_situacoes_e_nao_exige_corpo_na_saida():
    esquema = app.openapi()
    respostas = esquema["paths"][ROTA]["post"]["responses"]
    assert {"200", "422", "429", "503"} <= respostas.keys()
    modelo = respostas["200"]["content"]["application/json"]["schema"]["$ref"].split("/")[-1]
    assert set(esquema["components"]["schemas"][modelo]["properties"]["situacao"]["enum"]) == {
        "edicao_enviada",
        "aguardando_edicao",
        "envio_indisponivel",
    }
    assert "requestBody" not in esquema["paths"]["/newsletter/saida/{codigo_saida}"]["post"]
