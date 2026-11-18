from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from uuid import uuid4

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from mandatometro import contas
from mandatometro.api import contas as api
from mandatometro.api.app import app
from mandatometro.avisos.resend import EnvioIndisponivel
from mandatometro.config import config
from mandatometro.db.modelos import AvisoConta, Conta, CredencialConta


def test_ciclo_completo(engine_de_teste, monkeypatch):
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
    email = f"{uuid4().hex}@example.org"
    dados = dict(
        nome="Pessoa Fictícia",
        email=email,
        senha=senha,
        confirmar_senha=senha,
        aceite=True,
        termo="teste",
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
    desconhecido = {"email": "outro@example.org"}
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
    assert cliente.get("/contas/me").json() == {"nome": "Pessoa Fictícia"}

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
