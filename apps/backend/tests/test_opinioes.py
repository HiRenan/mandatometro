from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, insert, select, text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from mandatometro import db
from mandatometro.api import contas, opinioes
from mandatometro.api.app import app
from mandatometro.db.modelos import Conta, CredencialConta, LimiteOpiniao, Opiniao

ENVIO = "/opinioes"
PAINEL = "/painel/opinioes"
AGORA = datetime(2026, 11, 26, 19, 2, 50, tzinfo=UTC)
TEXTO = "O jogo ajudou a entender o que a comissão faz."


@pytest.fixture
def ambiente(engine_de_teste, relogio_db, monkeypatch):
    banco = engine_de_teste
    monkeypatch.setattr(db, "engine", lambda: banco)
    monkeypatch.setattr(contas, "agora", lambda: AGORA)
    relogio_db[0] = AGORA
    try:
        with TestClient(app, follow_redirects=False) as cliente:
            yield cliente, banco, relogio_db
    finally:
        with banco.begin() as conexao:
            conexao.execute(text("TRUNCATE opiniao, limite_opiniao, conta CASCADE"))


def _post(cliente, **dados):
    return cliente.post(ENVIO, json={"texto": TEXTO, **dados})


def _gravadas(banco):
    with banco.connect() as conexao:
        return conexao.execute(
            select(Opiniao.nota, Opiniao.partes, Opiniao.texto).order_by(Opiniao.id)
        ).all()


def _cota(banco):
    with banco.connect() as conexao:
        return conexao.scalars(
            select(LimiteOpiniao.quantidade).order_by(LimiteOpiniao.janela)
        ).all()


def _cookie(papel):
    id_conta, token = uuid4(), uuid4().hex
    with db.sessao() as sessao, sessao.begin():
        sessao.execute(
            insert(Conta).values(
                id=id_conta,
                email=f"{papel}@example.com",
                nome="Pessoa de teste",
                senha_hash="senha-de-teste",
                termo="teste",
                aceite_em=AGORA,
                criada_em=AGORA,
                confirmada_em=AGORA,
                papel=papel,
            )
        )
        sessao.add(
            CredencialConta(
                conta_id=id_conta,
                resumo=contas.resumo(token),
                finalidade="sessao",
                expira=AGORA + contas.VALIDADE_SESSAO,
            )
        )
    return {"Cookie": f"sessao_conta={token}"}


def test_grava_sem_sessao_com_atributos_opcionais_e_limite_unicode(ambiente):
    cliente, banco, _ = ambiente
    resposta = _post(cliente, texto=f" \n{TEXTO}\t ", nota=5, partes=["jogos", "edicoes"])
    assert resposta.status_code == 204
    assert resposta.content == b""
    assert resposta.headers["cache-control"] == "no-store"
    assert "set-cookie" not in resposta.headers
    assert _post(cliente, texto="🎲" * 2000).status_code == 204
    assert _gravadas(banco) == [(5, ["jogos", "edicoes"], TEXTO), (None, [], "🎲" * 2000)]
    with banco.connect() as conexao:
        assert all(
            data.utcoffset() is not None for data in conexao.scalars(select(Opiniao.criada_em))
        )


@pytest.mark.parametrize(
    "dados",
    [
        {"nota": 0},
        {"nota": 6},
        {"nota": "5"},
        {"nota": True},
        {"partes": ["outra"]},
        {"partes": ["trilhas", "trilhas"]},
        {"partes": None},
        {"texto": ""},
        {"texto": " \t\n\u00a0"},
        {"texto": "a" * 2001},
        {"texto": "a\x00b"},
        {"email": "extra@example.com"},
    ],
)
def test_recusa_dados_invalidos_sem_repetir_entrada(ambiente, dados):
    cliente, banco, _ = ambiente
    resposta = _post(cliente, **dados)
    assert resposta.status_code == 422
    assert resposta.json() == {"erro": "dados_invalidos"}
    assert _gravadas(banco) == []
    assert _cota(banco) == []


def test_recusa_corpo_grande_e_json_malformado(ambiente):
    cliente, banco, _ = ambiente
    cabecalhos = {"Content-Type": "application/json"}
    blocos = (b'{"texto":"', b"a" * opinioes.LIMITE_DO_CORPO, b'"}')
    for corpo in (b"".join(blocos), iter(blocos)):
        resposta = cliente.post(ENVIO, content=corpo, headers=cabecalhos)
        assert resposta.status_code == 413
        assert resposta.json() == {"erro": "corpo_grande"}
    invalido = cliente.post(ENVIO, content=b'{"texto":"\xff"}', headers=cabecalhos)
    assert invalido.status_code == 422
    assert invalido.json() == {"erro": "dados_invalidos"}
    assert cliente.post(ENVIO, data={"texto": TEXTO}).status_code == 422
    assert _gravadas(banco) == []
    assert _cota(banco) == []


def test_robo_e_isca_preenchida_tem_a_resposta_do_sucesso(ambiente):
    cliente, banco, _ = ambiente
    for resposta in (
        _post(cliente, site="endereco-ficticio"),
        cliente.post(ENVIO, json={"site": "preenchido"}),
        cliente.post(ENVIO, json={"texto": TEXTO}, headers={"User-Agent": "Googlebot/2.1"}),
    ):
        assert resposta.status_code == 204
        assert resposta.content == b""
        assert resposta.headers["cache-control"] == "no-store"
    assert _gravadas(banco) == []
    assert _cota(banco) == []


def test_cota_global_e_atomica_e_reabre_no_minuto_seguinte(ambiente, monkeypatch):
    cliente, banco, relogio = ambiente
    monkeypatch.setattr(opinioes, "LIMITE_POR_MINUTO", 1)
    with ThreadPoolExecutor(max_workers=2) as processos:
        respostas = list(processos.map(lambda nota: _post(cliente, nota=nota), (1, 2)))
    assert sorted(resposta.status_code for resposta in respostas) == [204, 429]
    recusada = next(resposta for resposta in respostas if resposta.status_code == 429)
    assert recusada.headers["Retry-After"] == "10"
    assert recusada.json() == {"erro": "limite_de_opinioes"}
    assert len(_gravadas(banco)) == 1
    assert _cota(banco) == [1]

    relogio[0] += timedelta(seconds=10)
    assert _post(cliente).status_code == 204
    assert len(_gravadas(banco)) == 2
    assert _cota(banco) == [1, 1]
    relogio[0] += timedelta(minutes=1)
    assert _post(cliente).status_code == 204
    assert _cota(banco) == [1, 1]


def test_banco_indisponivel_tem_503_e_log_fixo(ambiente, monkeypatch, caplog):
    cliente, banco, _ = ambiente

    def indisponivel():
        raise SQLAlchemyError(TEXTO)

    monkeypatch.setattr(db, "engine", indisponivel)
    resposta = _post(cliente, nota=5, partes=["jogos"])
    assert resposta.status_code == 503
    assert resposta.json() == {"erro": "servico_indisponivel"}
    assert caplog.messages == ["Banco indisponível no envio de opiniões."]
    assert _gravadas(banco) == []


def test_falha_ao_gravar_desfaz_o_consumo_da_cota(ambiente, caplog):
    cliente, banco, _ = ambiente

    def falhar_no_insert(_conexao, _cursor, sql, _parametros, _contexto, _lote):
        if sql.startswith("INSERT INTO opiniao"):
            raise SQLAlchemyError(TEXTO)

    event.listen(banco, "before_cursor_execute", falhar_no_insert)
    try:
        assert _post(cliente).status_code == 503
    finally:
        event.remove(banco, "before_cursor_execute", falhar_no_insert)
    assert caplog.messages == ["Banco indisponível no envio de opiniões."]
    assert _gravadas(banco) == []
    assert _cota(banco) == []


def test_painel_exige_sessao_de_administradora(ambiente):
    cliente, _, _ = ambiente
    comum = _cookie("comum")
    for cabecalhos, codigo in (
        ({}, 401),
        ({"Cookie": "sessao_conta=token-invalido"}, 401),
        (comum, 403),
    ):
        negada = cliente.get(PAINEL, headers=cabecalhos)
        assert negada.status_code == codigo
        assert negada.headers["Cache-Control"] == "no-store"
        assert cliente.get("/painel/numeros", headers=cabecalhos).status_code == 404
    assert cliente.get(PAINEL, headers=_cookie("administradora")).json() == {
        "total": 0,
        "nota_media": None,
        "por_parte": {"trilhas": 0, "parlamentares": 0, "jogos": 0, "edicoes": 0},
        "opinioes": [],
    }


def test_painel_conta_tudo_e_lista_500_em_ordem_com_desempate(ambiente):
    cliente, banco, _ = ambiente
    with banco.begin() as conexao:
        conexao.execute(
            insert(Opiniao),
            [
                {
                    "criada_em": AGORA - timedelta(days=1),
                    "nota": nota,
                    "partes": partes,
                    "texto": texto,
                }
                for nota, partes, texto in [
                    (1, ["trilhas"], "A mais antiga"),
                    *[(None, ["jogos"], "Opinião intermediária")] * 498,
                ]
            ]
            + [
                {"criada_em": AGORA, "nota": 4, "partes": [], "texto": "Chegou primeiro"},
                {"criada_em": AGORA, "nota": 5, "partes": ["trilhas", "edicoes"], "texto": TEXTO},
            ],
        )
    resposta = cliente.get(PAINEL, headers=_cookie("administradora"))
    assert resposta.status_code == 200
    assert resposta.headers["Cache-Control"] == "no-store"
    dados = resposta.json()
    assert dados["total"] == 501
    assert dados["nota_media"] == pytest.approx(10 / 3)
    assert dados["por_parte"] == {"trilhas": 2, "parlamentares": 0, "jogos": 498, "edicoes": 1}
    recentes = dados["opinioes"]
    assert len(recentes) == 500
    assert recentes[0] == {
        "criada_em": "2026-11-26T19:02:50Z",
        "nota": 5,
        "partes": ["trilhas", "edicoes"],
        "texto": TEXTO,
    }
    assert recentes[1]["texto"] == "Chegou primeiro"
    assert recentes[-1]["texto"] == "Opinião intermediária"


@pytest.mark.parametrize(
    ("dados", "constraint"),
    [
        ({"nota": 6}, "nota"),
        ({"partes": ["jogos", "jogos"]}, "partes"),
        ({"partes": ["outra"]}, "partes"),
        ({"partes": [None]}, "partes"),
        ({"texto": ""}, "texto"),
        ({"texto": "a" * 2001}, "texto"),
    ],
)
def test_checks_do_banco_recusam_dados_invalidos(sessao, dados, constraint):
    with pytest.raises(IntegrityError) as erro, sessao.begin_nested():
        sessao.execute(insert(Opiniao).values({"texto": TEXTO, **dados}))
    assert erro.value.orig.diag.constraint_name == f"ck_opiniao_{constraint}"
