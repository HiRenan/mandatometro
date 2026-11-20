from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from secrets import token_urlsafe
from time import monotonic
from typing import Annotated
from unittest.mock import Mock
from uuid import uuid4

import pytest
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, FastAPI
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.exc import ArgumentError, IntegrityError
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
    artigo = "trilha/artigo-da-exclusao"
    assert cliente.post(
        "/contas/progresso", headers={"Origin": config().app_base_url}, json={"marcar": [artigo]}
    ).json() == {"lidos": [artigo]}

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
    assert cliente.get("/contas/progresso").status_code == 401
    with sessoes.begin() as db:
        assert db.get(Conta, conta_id) is None
        assert (
            db.scalar(
                text("select count(*) from artigo_lido where conta_id = :id"), {"id": conta_id}
            )
            == 0
        )
        aviso = db.scalars(select(AvisoConta)).one()
        assert email.encode() not in aviso.conteudo
        aviso.proxima = contas.agora()
    monkeypatch.setattr(contas.Resend, "enviar", enviar)
    contas.entregar_pendentes()
    assert "excluída" in mensagens[-1][0]
    assert artigo not in mensagens[-1][0]


def api_secret():
    from pydantic import SecretStr

    return SecretStr(Fernet.generate_key().decode())


def test_perfil_sem_cookie_responde_antes_de_abrir_o_banco(monkeypatch):
    engine = Mock(side_effect=ArgumentError("Falha simulada na criação do engine."))
    monkeypatch.setattr(db, "engine", engine)
    cliente = TestClient(app)

    resposta = cliente.get("/contas/me")
    assert resposta.status_code == 401
    assert resposta.json() == {"detail": "Entre na sua conta."}
    assert resposta.headers["cache-control"] == "no-store"
    engine.assert_not_called()

    resposta = cliente.get("/contas/me", headers={"Cookie": "sessao_conta=inventado"})
    assert resposta.status_code == 503
    engine.assert_called_once_with()


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


PROGRESSO = "/contas/progresso"


@pytest.fixture
def cliente_progresso(sessoes_conta, monkeypatch):
    monkeypatch.setattr(config(), "conta_chave", api_secret())

    def abrir(token=None):
        cliente = TestClient(app, client=(uuid4().hex, 50000))
        cliente.headers["Origin"] = config().app_base_url
        if token:
            cliente.cookies.set("sessao_conta", token)
        return cliente

    return abrir


def test_progresso_sem_sessao_e_falha_do_banco(monkeypatch):
    engine = Mock(side_effect=ArgumentError("dado-interno@example.com"))
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(config(), "conta_chave", api_secret())
    monkeypatch.setattr(api, "consumir_cota", lambda *_: True)
    cliente = TestClient(app, headers={"Origin": config().app_base_url})

    for resposta in (cliente.get(PROGRESSO), cliente.post(PROGRESSO, json={"marcar": ["a/b"]})):
        assert resposta.status_code == 401
        assert resposta.json() == {"detail": "Entre na sua conta."}
        assert resposta.headers["cache-control"] == "no-store"
    engine.assert_not_called()

    cliente.cookies.set("sessao_conta", "sessao-inventada")
    resposta = cliente.get(PROGRESSO)
    assert resposta.status_code == 503
    assert resposta.json() == {"detail": "Serviço indisponível."}
    assert resposta.headers["cache-control"] == "no-store"


def test_progresso_isolado_por_conta_e_mutacoes_idempotentes(
    sessoes_conta, cliente_progresso, caplog
):
    id_conta, email, token = _criar_sessao(sessoes_conta)
    _, _, outro_token = _criar_sessao(sessoes_conta)
    cliente = cliente_progresso(token)
    outro = cliente_progresso(outro_token)
    a, b = "trilha-a/lido-2", "trilha-b/artigo"
    assert cliente.get(PROGRESSO).json() == {"lidos": []}

    def marcacoes():
        with sessoes_conta() as sessao:
            return sessao.execute(
                text("select artigo_id, marcado_em from artigo_lido where conta_id = :id"),
                {"id": id_conta},
            ).all()

    resposta = cliente.post(PROGRESSO, json={"marcar": [b, a, a]})
    assert resposta.status_code == 200
    assert resposta.headers["cache-control"] == "no-store"
    assert resposta.json() == {"lidos": [a, b]}
    gravadas = dict(marcacoes())
    assert gravadas.keys() == {a, b}
    assert all(instante.tzinfo for instante in gravadas.values())

    assert cliente.post(PROGRESSO, json={"marcar": [a]}).json() == {"lidos": [a, b]}
    assert dict(marcacoes()) == gravadas
    assert outro.get(PROGRESSO).json() == {"lidos": []}
    assert outro.post(PROGRESSO, json={"marcar": [a]}).json() == {"lidos": [a]}

    for _ in range(2):
        assert cliente.post(PROGRESSO, json={"desmarcar": [a, b]}).json() == {"lidos": []}
    assert outro.get(PROGRESSO).json() == {"lidos": [a]}
    assert outro.get("/contas/me").json().keys() == {"nome", "papel"}
    assert cliente_progresso("sessao-inventada").get(PROGRESSO).status_code == 401
    assert all(dado not in caplog.text for dado in (email, str(id_conta), token, a, b))


def test_progresso_rejeita_origem_e_respeita_a_cota(sessoes_conta, cliente_progresso, monkeypatch):
    instante = contas.agora()
    monkeypatch.setattr(contas, "agora", lambda: instante)
    _, _, token = _criar_sessao(sessoes_conta)
    cliente = cliente_progresso(token)
    pedido = {"marcar": ["trilha/artigo"]}
    for origem in ("https://origem.example.com", ""):
        resposta = cliente.post(PROGRESSO, json=pedido, headers={"Origin": origem})
        assert resposta.status_code == 403
        assert resposta.json() == {"detail": "Origem inválida."}
        assert resposta.headers["cache-control"] == "no-store"
    cliente.headers.pop("Origin")
    assert cliente.post(PROGRESSO, json=pedido).status_code == 403
    assert cliente.get(PROGRESSO).json() == {"lidos": []}
    cliente.headers["Origin"] = config().app_base_url
    for _ in range(27):
        assert cliente.post(PROGRESSO, json=pedido).status_code == 200
    resposta = cliente.post(PROGRESSO, json=pedido)
    assert resposta.status_code == 429
    assert resposta.json() == {"detail": "Tente novamente em um minuto."}
    assert resposta.headers["cache-control"] == "no-store"


@pytest.mark.parametrize(
    "pedido",
    [
        {"marcar": ["ruim@example.com"]},
        {"desmarcar": ["Trilha/artigo"]},
        {"marcar": ["trilha/a/b"]},
        {"marcar": ["/artigo"]},
        {"marcar": ["trilha/"]},
        {"marcar": ["trilha/a\n"]},
        {"marcar": ["x/" + "a" * 127]},
        {"marcar": [123]},
        {"marcar": ["x/a"] * 257},
        {"marcar": ["x/a"] * 128, "desmarcar": ["x/b"] * 129},
        {"marcar": ["x/a"], "desmarcar": ["x/a"]},
        {"conta_id": "outro@example.com"},
    ],
)
def test_progresso_rejeita_pedido_invalido_sem_expor_entrada(
    sessoes_conta, cliente_progresso, pedido
):
    _, _, token = _criar_sessao(sessoes_conta)
    cliente = cliente_progresso(token)
    resposta = cliente.post(PROGRESSO, json=pedido)
    assert resposta.status_code == 422
    assert resposta.headers["cache-control"] == "no-store"
    assert resposta.json() == {"detail": "Confira os campos informados."}
    assert cliente.get(PROGRESSO).json() == {"lidos": []}


@pytest.mark.parametrize("metodo", ["GET", "POST"])
def test_progresso_tem_prazo_para_travar_a_conta(sessoes_conta, cliente_progresso, caplog, metodo):
    conta_id, email, token = _criar_sessao(sessoes_conta)
    cliente = cliente_progresso(token)
    artigo = "trilha/artigo-do-teste"
    pedido = {"json": {"marcar": [artigo]}} if metodo == "POST" else {}
    with ThreadPoolExecutor(max_workers=1) as pool, sessoes_conta.begin() as sessao:
        sessao.get(Conta, conta_id, with_for_update=True)
        inicio = monotonic()
        resposta = pool.submit(cliente.request, metodo, PROGRESSO, **pedido).result(timeout=6)
        assert 2.5 <= monotonic() - inicio < 6
        assert resposta.status_code == 503
        assert resposta.json() == {"detail": "O progresso está ocupado. Tente novamente."}
        assert resposta.headers["retry-after"] == "3"
        assert resposta.headers["cache-control"] == "no-store"
    assert cliente.get(PROGRESSO).json() == {"lidos": []}
    assert all(dado not in caplog.text for dado in (email, str(conta_id), token, artigo))


@pytest.mark.parametrize("declarado", [True, False], ids=["content-length", "stream"])
def test_progresso_limita_bytes_antes_de_interpretar_o_corpo(
    sessoes_conta, cliente_progresso, declarado
):
    _, _, token = _criar_sessao(sessoes_conta)
    cliente = cliente_progresso(token)
    json = b'{"marcar":["trilha/artigo"]}'
    no_limite = json.ljust(64 * 1024, b" ")
    alem_do_limite = no_limite + b" "
    resposta = cliente.post(
        PROGRESSO,
        headers={"Content-Type": "application/json"},
        content=alem_do_limite if declarado else iter((no_limite, b" ")),
    )
    assert resposta.status_code == 413
    assert resposta.json() == {"detail": "O pedido de progresso excede 64 KiB."}
    assert resposta.headers["cache-control"] == "no-store"
    assert cliente.get(PROGRESSO).json() == {"lidos": []}
    resposta = cliente.post(
        PROGRESSO, headers={"Content-Type": "application/json"}, content=no_limite
    )
    assert resposta.json() == {"lidos": ["trilha/artigo"]}


@pytest.mark.parametrize(
    "corpo",
    [b'\xff{"marcar":[]}', '{"marcar":["trilha/artigo"]}'.encode("utf-16-le"), b'{"marcar":['],
    ids=["utf8-invalido", "utf16", "json-invalido"],
)
def test_progresso_recusa_corpo_malformado_com_mensagem_fixa(
    sessoes_conta, cliente_progresso, corpo
):
    _, _, token = _criar_sessao(sessoes_conta)
    cliente = cliente_progresso(token)
    resposta = cliente.post(PROGRESSO, headers={"Content-Type": "application/json"}, content=corpo)
    assert resposta.status_code == 422
    assert resposta.json() == {"detail": "Confira os campos informados."}
    assert resposta.headers["cache-control"] == "no-store"
    assert cliente.get(PROGRESSO).json() == {"lidos": []}


def test_progresso_respeita_o_teto_ate_com_duas_gravacoes_simultaneas(
    sessoes_conta, cliente_progresso
):
    _, _, token = _criar_sessao(sessoes_conta)
    cliente = cliente_progresso(token)
    ids = [f"trilha/artigo-{i}" for i in range(254)] + ["x/" + "a" * 126]
    assert cliente.post(PROGRESSO, json={"marcar": ids}).status_code == 200

    def marcar(id_artigo):
        return cliente_progresso(token).post(PROGRESSO, json={"marcar": [id_artigo]})

    with ThreadPoolExecutor(max_workers=2) as pool:
        respostas = sorted(pool.map(marcar, ("x/a", "x/b")), key=lambda r: r.status_code)
    assert [r.status_code for r in respostas] == [200, 409]
    assert respostas[1].json() == {"detail": "Limite de artigos lidos atingido."}
    assert respostas[1].headers["cache-control"] == "no-store"
    lidos = respostas[0].json()["lidos"]
    assert len(lidos) == 256 and set(ids).issubset(lidos)

    resposta = cliente.post(PROGRESSO, json={"desmarcar": [ids[0]], "marcar": ["nova/a", "nova/b"]})
    assert resposta.status_code == 409
    assert cliente.get(PROGRESSO).json() == {"lidos": lidos}
    resposta = cliente.post(PROGRESSO, json={"desmarcar": [ids[0]], "marcar": ["nova/a"]})
    assert resposta.status_code == 200
    assert set(resposta.json()["lidos"]) == set(lidos) - {ids[0]} | {"nova/a"}


def test_banco_recusa_artigo_invalido_e_repetido(sessoes_conta):
    conta_id, _, _ = _criar_sessao(sessoes_conta)
    inserir = text("insert into artigo_lido (conta_id, artigo_id) values (:conta, :artigo)")
    with sessoes_conta.begin() as sessao:
        assert sessao.scalar(text("select to_regclass('artigo_lido')")) is not None
        sessao.execute(inserir, {"conta": conta_id, "artigo": "x/a"})
        for artigo in ("x/a", "x/INVÁLIDO", "x/a\n"):
            with pytest.raises(IntegrityError), sessao.begin_nested():
                sessao.execute(inserir, {"conta": conta_id, "artigo": artigo})


@pytest.mark.parametrize("classe_rota", [APIRoute, api.RotaConta], ids=["padrao", "rota-conta"])
def test_guarda_de_administradora_consulta_o_papel_a_cada_pedido(sessoes_conta, classe_rota):
    id_conta, email, token = _criar_sessao(sessoes_conta)
    token_vencido = token_urlsafe(32)
    codigo_confirmacao = token_urlsafe(32)
    codigo_recuperacao = token_urlsafe(32)
    instante = contas.agora()
    with sessoes_conta.begin() as sessao:
        for segredo, finalidade, validade in (
            (token_vencido, "sessao", -timedelta(seconds=1)),
            (codigo_confirmacao, "confirmacao", timedelta(hours=1)),
            (codigo_recuperacao, "recuperacao", timedelta(hours=1)),
        ):
            sessao.add(
                CredencialConta(
                    resumo=contas.resumo(segredo),
                    conta_id=id_conta,
                    finalidade=finalidade,
                    expira=instante + validade,
                )
            )

    app_teste = FastAPI()
    router = APIRouter(route_class=classe_rota)

    @router.get("/revisao-de-teste", status_code=204)
    def protegido(conta: Annotated[Conta, Depends(api.exigir_administradora)]) -> None:
        assert conta.id == id_conta
        assert conta.papel == "administradora"

    app_teste.include_router(router)
    app_teste.include_router(api.router)
    cliente = TestClient(app_teste)

    def negar(cookie=None):
        cabecalhos = {} if cookie is None else {"Cookie": f"sessao_conta={cookie}"}
        inexistente = cliente.get("/rota-inexistente", headers=cabecalhos)
        resposta = cliente.get("/revisao-de-teste", headers=cabecalhos)
        assert resposta.status_code == inexistente.status_code == 404
        assert resposta.content == inexistente.content
        assert sorted(resposta.headers.multi_items()) == sorted(inexistente.headers.multi_items())

    negar()
    negar("")
    negar(token_urlsafe(32))
    negar(token)
    assert main(["conta", "promover", "--email", email]) == 0

    negar(token_vencido)
    negar(codigo_confirmacao)
    negar(codigo_recuperacao)
    cliente.cookies.set("sessao_conta", token)
    resposta = cliente.get("/revisao-de-teste")
    assert resposta.status_code == 204
    if classe_rota is api.RotaConta:
        assert resposta.headers["cache-control"] == "no-store"
    perfil = cliente.get("/contas/me")
    assert perfil.json()["papel"] == "administradora"
    assert perfil.headers["cache-control"] == "no-store"

    assert main(["conta", "revogar", "--email", email]) == 0
    negar(token)
    assert cliente.get("/contas/me").json()["papel"] == "comum"

    assert main(["conta", "promover", "--email", email]) == 0
    with sessoes_conta.begin() as sessao:
        sessao.delete(sessao.get(Conta, id_conta))
    negar(token)


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
