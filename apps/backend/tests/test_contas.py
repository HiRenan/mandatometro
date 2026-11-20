from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from typing import Annotated
from uuid import uuid4

import pytest
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from mandatometro import contas, db
from mandatometro.api import contas as api
from mandatometro.api.app import app
from mandatometro.avisos.resend import EnvioIndisponivel
from mandatometro.cli import main
from mandatometro.config import config
from mandatometro.db.modelos import AvisoConta, Conta, CredencialConta


def test_ciclo_completo(engine_de_teste, monkeypatch):
    instante = contas.agora()
    monkeypatch.setattr(contas, "agora", lambda: instante)
    monkeypatch.setattr(api, "agora", lambda: instante)
    sessoes = sessionmaker(engine_de_teste)
    monkeypatch.setattr(api, "sessao", sessoes)
    monkeypatch.setattr(contas, "sessao", sessoes)
    monkeypatch.setattr(config(), "conta_chave", api_secret())
    monkeypatch.setattr(config(), "conta_termo_url", "https://example.org/termo")
    monkeypatch.setattr(config(), "conta_termo_versao", "teste")
    mensagens = []

    async def enviar(self, email, mensagem, idempotencia):
        mensagens.append((mensagem.texto, idempotencia))

    monkeypatch.setattr(contas.Resend, "enviar", enviar)
    cliente = TestClient(app)
    senha = "Uma senha fictícia longa"
    email = f"{uuid4().hex}@example.com"
    dados = dict(
        nome="Pessoa Fictícia",
        email=email,
        senha=senha,
        confirmar_senha=senha,
        aceite=True,
        termo="teste",
        papel="administradora",
    )
    resposta = cliente.post("/contas", json={**dados, "confirmar_senha": "inconsistente"})
    assert resposta.status_code == 422 and senha not in resposta.text
    with ThreadPoolExecutor(max_workers=2) as pool:
        respostas = pool.map(
            lambda endereco: cliente.post("/contas", json={**dados, "email": endereco}).status_code,
            (email, email.upper()),
        )
        assert list(respostas) == [204, 204]
    assert len(mensagens) == 1
    token = mensagens[0][0].split("#")[-1]
    with sessoes.begin() as db:
        db.get(CredencialConta, contas.resumo(token)).expira = contas.agora() - timedelta(seconds=1)
    assert cliente.post("/contas/confirmacao", json={"token": token}).status_code == 401
    assert cliente.post("/contas/reenvio", json={"email": email}).status_code == 204
    token = mensagens[-1][0].split("#")[-1]

    def confirmar(_):
        return cliente.post("/contas/confirmacao", json={"token": token}).status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(confirmar, range(2))) == [204, 401]
    quantidade = len(mensagens)
    desconhecido = {"email": "outro@example.com"}
    for _ in range(5):
        assert cliente.post("/contas/recuperacao", json=desconhecido).status_code == 204
    assert cliente.post("/contas/recuperacao", json=desconhecido).status_code == 429
    assert len(mensagens) == quantidade
    assert cliente.post("/contas/recuperacao", json={"email": email}).status_code == 204
    token = mensagens[-1][0].split("#")[-1]
    with sessoes.begin() as db:
        conta = db.scalar(select(Conta).where(Conta.email == email))
        conta_id = conta.id
        db.add(
            CredencialConta(
                resumo=contas.resumo("sessao-antiga"),
                conta_id=conta.id,
                finalidade="sessao",
                expira=contas.agora() + timedelta(hours=1),
            )
        )
    nova = "Outra senha fictícia longa"
    assert (
        cliente.post(
            "/contas/redefinicao", json=dict(token=token, senha=nova, confirmar_senha=nova)
        ).status_code
        == 204
    )
    with sessoes.begin() as db:
        assert not db.get(CredencialConta, contas.resumo("sessao-antiga"))
        assert contas.senhas.verify(db.get(Conta, conta_id).senha_hash, nova)
        db.add(
            CredencialConta(
                resumo=contas.resumo("sessao-nova"),
                conta_id=conta_id,
                finalidade="sessao",
                expira=contas.agora() + timedelta(hours=1),
            )
        )
    cliente.cookies.set("sessao_conta", "sessao-nova")
    perfil = cliente.get("/contas/me")
    assert perfil.status_code == 200
    assert perfil.headers["cache-control"] == "no-store"
    assert perfil.json() == {"nome": dados["nome"], "papel": "comum"}

    def excluir(senha_atual, origem):
        return cliente.request(
            "DELETE", "/contas/me", headers={"Origin": origem}, json={"senha": senha_atual}
        ).status_code

    assert excluir(nova, "https://example.org") == 403
    assert excluir(senha, config().app_base_url) == 401

    async def indisponivel(*args):
        raise EnvioIndisponivel

    monkeypatch.setattr(contas.Resend, "enviar", indisponivel)
    assert excluir(nova, config().app_base_url) == 204
    assert cliente.get("/contas/me").status_code == 401
    with sessoes.begin() as db:
        assert db.get(Conta, conta_id) is None
        aviso = db.scalars(select(AvisoConta)).one()
        assert email.encode() not in aviso.conteudo
        aviso.proxima = contas.agora()
    monkeypatch.setattr(contas.Resend, "enviar", enviar)
    contas.entregar_pendentes()
    assert "excluída" in mensagens[-1][0]


def api_secret():
    from pydantic import SecretStr

    return SecretStr(Fernet.generate_key().decode())


@pytest.fixture
def sessoes_conta(engine_de_teste, monkeypatch):
    monkeypatch.setattr(db, "engine", lambda: engine_de_teste)
    return sessionmaker(engine_de_teste)


def _criar_sessao(sessoes_conta, senha_hash="hash-ficticio"):
    id_conta = uuid4()
    email = f"{id_conta.hex}@example.com"
    token = uuid4().hex
    instante = contas.agora()
    with sessoes_conta.begin() as sessao:
        sessao.add(
            Conta(
                id=id_conta,
                email=email,
                nome="Conta de teste",
                senha_hash=senha_hash,
                termo="teste",
                aceite_em=instante,
                criada_em=instante,
                confirmada_em=instante,
            )
        )
        sessao.add(
            CredencialConta(
                resumo=contas.resumo(token),
                conta_id=id_conta,
                finalidade="sessao",
                expira=instante + timedelta(days=7),
            )
        )
    return id_conta, email, token


def test_guarda_de_administradora_consulta_o_papel_a_cada_pedido(sessoes_conta):
    id_conta, email, token = _criar_sessao(sessoes_conta)
    token_vencido = uuid4().hex
    with sessoes_conta.begin() as sessao:
        sessao.add(
            CredencialConta(
                resumo=contas.resumo(token_vencido),
                conta_id=id_conta,
                finalidade="sessao",
                expira=contas.agora() - timedelta(seconds=1),
            )
        )

    app_teste = FastAPI()
    router = APIRouter(route_class=api.RotaConta)

    @router.get("/revisao-de-teste", status_code=204)
    def protegido(conta: Annotated[Conta, Depends(api.exigir_administradora)]) -> None:
        assert conta.id == id_conta
        assert conta.papel == "administradora"

    app_teste.include_router(router)
    app_teste.include_router(api.router)
    cliente = TestClient(app_teste)
    inexistente = cliente.get("/rota-inexistente")

    def negar():
        resposta = cliente.get("/revisao-de-teste")
        assert resposta.status_code == inexistente.status_code == 404
        assert resposta.json() == inexistente.json()
        assert resposta.headers["cache-control"] == "no-store"

    negar()
    cliente.cookies.set("sessao_conta", token)
    negar()
    assert main(["conta", "promover", "--email", email]) == 0

    cliente.cookies.set("sessao_conta", token_vencido)
    negar()
    cliente.cookies.set("sessao_conta", token)
    assert cliente.get("/revisao-de-teste").status_code == 204
    perfil = cliente.get("/contas/me")
    assert perfil.json()["papel"] == "administradora"
    assert perfil.headers["cache-control"] == "no-store"

    assert main(["conta", "revogar", "--email", email]) == 0
    negar()
    assert cliente.get("/contas/me").json()["papel"] == "comum"


def test_administradora_pode_excluir_a_propria_conta(sessoes_conta, monkeypatch):
    monkeypatch.setattr(config(), "conta_chave", api_secret())
    mensagens = []

    async def enviar(self, email, mensagem, idempotencia):
        mensagens.append(mensagem.texto)

    monkeypatch.setattr(contas.Resend, "enviar", enviar)
    senha = uuid4().hex
    id_conta, email, token = _criar_sessao(sessoes_conta, contas.senhas.hash(senha))
    assert main(["conta", "promover", "--email", email]) == 0
    cliente = TestClient(app)
    cliente.cookies.set("sessao_conta", token)
    assert cliente.get("/contas/me").json()["papel"] == "administradora"
    resposta = cliente.request(
        "DELETE", "/contas/me", headers={"Origin": config().app_base_url}, json={"senha": senha}
    )
    assert resposta.status_code == 204
    assert cliente.get("/contas/me").status_code == 401
    with sessoes_conta() as sessao:
        assert sessao.get(Conta, id_conta) is None
        assert sessao.get(CredencialConta, contas.resumo(token)) is None
    assert len(mensagens) == 1 and "excluída" in mensagens[0]
    assert "administradora" not in mensagens[0] and "papel" not in mensagens[0]


def test_login_e_saida(engine_de_teste, monkeypatch):
    instante = contas.agora()
    monkeypatch.setattr(contas, "agora", lambda: instante)
    monkeypatch.setattr(api, "agora", lambda: instante)
    sessoes = sessionmaker(engine_de_teste)
    monkeypatch.setattr(api, "sessao", sessoes)
    monkeypatch.setattr(contas, "sessao", sessoes)
    monkeypatch.setattr(config(), "conta_chave", api_secret())
    monkeypatch.setattr(config(), "api_url", "https://api.example.org")
    origem = {"Origin": config().app_base_url}
    cliente = TestClient(app, base_url="https://api.example.org")
    email = f"{uuid4().hex}@example.org"
    senha = "Senha fictícia de teste"
    pedido = {"email": email.upper(), "senha": senha}
    id_conta = uuid4()
    with sessoes.begin() as db:
        db.add(
            Conta(
                id=id_conta,
                email=email,
                nome="Pessoa",
                senha_hash=contas.senhas.hash(senha),
                termo="teste",
                aceite_em=contas.agora(),
                criada_em=contas.agora(),
            )
        )
    assert cliente.post("/contas/login", json=pedido).status_code == 403

    def entrar(dados):
        return cliente.post("/contas/login", json=dados, headers=origem)

    pendente = entrar(pedido)
    desconhecida = entrar({**pedido, "email": "desconhecida@example.org"})
    with sessoes.begin() as db:
        db.get(Conta, id_conta).confirmada_em = contas.agora()
    incorreta = entrar({**pedido, "senha": "incorreta"})
    for erro in (pendente, desconhecida, incorreta):
        assert erro.status_code == 401 and erro.json() == pendente.json()
        assert erro.headers["cache-control"] == "no-store"
    resposta = entrar(pedido)
    assert resposta.status_code == 204
    cookie = resposta.headers["set-cookie"].lower()
    for atributo in ("httponly", "secure", "samesite=lax", "path=/", "max-age=604800"):
        assert atributo in cookie
    token = cliente.cookies["sessao_conta"]
    with sessoes.begin() as db:
        credencial = db.get(CredencialConta, contas.resumo(token))
        assert timedelta(days=6, hours=23) < credencial.expira - contas.agora() <= timedelta(days=7)
        assert db.get(CredencialConta, token) is None
    assert cliente.get("/contas/me").status_code == 200
    assert cliente.post("/contas/logout").status_code == 403
    for _ in range(2):
        assert cliente.post("/contas/logout", headers=origem).status_code == 204
    with sessoes.begin() as db:
        assert db.get(CredencialConta, contas.resumo(token)) is None
    assert cliente.get("/contas/me").status_code == 401
    assert entrar(pedido).status_code == 204
    with sessoes.begin() as db:
        credencial = db.get(CredencialConta, contas.resumo(cliente.cookies["sessao_conta"]))
        credencial.expira = contas.agora() - timedelta(seconds=1)
    assert cliente.get("/contas/me").status_code == 401
    assert entrar(pedido).status_code == 204
    assert entrar(pedido).status_code == 429


@pytest.mark.parametrize(
    "alteracao",
    [{"nascimento": "2999-01-01"}, {"aceite": False}, {"estado": "XX"}, {"nome": "   "}],
)
def test_rejeita_perfil_invalido(alteracao):
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        api.Cadastro.model_validate(
            dict(
                nome="Pessoa",
                email="pessoa@example.org",
                senha="uma senha comprida",
                confirmar_senha="uma senha comprida",
                aceite=True,
                termo="teste",
            )
            | alteracao
        )
