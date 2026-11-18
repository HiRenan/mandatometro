"""Persistência do piloto em PostgreSQL; todos os códigos são sorteados nos testes."""

import json
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from functools import partial
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, event, func, inspect, select
from sqlalchemy.exc import IntegrityError, OperationalError

from mandatometro.api import piloto as api_piloto
from mandatometro.api.app import app
from mandatometro.config import config
from mandatometro.db.modelos import LimiteInscricao, LimitePiloto, TentativaPiloto
from mandatometro.piloto import VERSAO_QUIZ
from mandatometro.piloto.limite import consumir_cota
from mandatometro.piloto.medicao import apagar_medicao, registrar_tentativa
from mandatometro.piloto.relatorio import resultado


@pytest.fixture
def banco(engine_de_teste):
    def limpar():
        with engine_de_teste.begin() as conexao:
            for tabela in (TentativaPiloto, LimitePiloto, LimiteInscricao):
                conexao.execute(delete(tabela))

    limpar()
    yield engine_de_teste
    limpar()


def test_tabelas_guardam_apenas_campos_aprovados_sem_ligacao_com_pessoa(banco):
    inspecao = inspect(banco)
    assert {c["name"] for c in inspecao.get_columns("tentativa_piloto")} == {
        "participacao",
        "versao_quiz",
        "etapa",
        "acertos",
    }
    assert set(inspecao.get_pk_constraint("tentativa_piloto")["constrained_columns"]) == {
        "participacao",
        "versao_quiz",
        "etapa",
    }
    assert inspecao.get_foreign_keys("tentativa_piloto") == []
    assert {c["name"] for c in inspecao.get_columns("limite_piloto")} == {"janela", "quantidade"}


def test_primeira_conclusao_fica_confirmada_e_reenvios_nao_mudam_total(banco):
    codigo = uuid4()
    registrar_tentativa(banco, codigo, VERSAO_QUIZ, "antes", 7)
    registrar_tentativa(banco, codigo, VERSAO_QUIZ, "antes", 7)
    registrar_tentativa(banco, codigo, VERSAO_QUIZ, "antes", 12)
    registrar_tentativa(banco, codigo, VERSAO_QUIZ, "depois", 10)
    with banco.connect() as conexao:
        assert dict(
            conexao.execute(select(TentativaPiloto.etapa, TentativaPiloto.acertos)).all()
        ) == {"antes": 7, "depois": 10}


def test_depois_pode_chegar_antes_e_codigos_por_etapa_ficam_sem_par(banco):
    codigo = uuid4()
    registrar_tentativa(banco, codigo, VERSAO_QUIZ, "depois", 10)
    assert resultado(banco, VERSAO_QUIZ)["participacoes"]["somente_depois"] == 1
    registrar_tentativa(banco, codigo, VERSAO_QUIZ, "antes", 7)
    registrar_tentativa(banco, uuid4(), VERSAO_QUIZ, "antes", 3)
    registrar_tentativa(banco, uuid4(), VERSAO_QUIZ, "depois", 4)
    assert resultado(banco, VERSAO_QUIZ)["participacoes"] == {
        "antes": 2,
        "depois": 2,
        "total": 3,
        "pareadas": 1,
        "somente_antes": 1,
        "somente_depois": 1,
    }


def test_conclusoes_concorrentes_da_mesma_etapa_nao_duplicam(banco):
    codigo = uuid4()

    def gravar(_):
        registrar_tentativa(banco, codigo, VERSAO_QUIZ, "antes", 7)

    with ThreadPoolExecutor(max_workers=8) as executor:
        list(executor.map(gravar, range(20)))
    registrar_tentativa(banco, codigo, VERSAO_QUIZ, "antes", 12)
    with banco.connect() as conexao:
        assert conexao.execute(select(TentativaPiloto.acertos)).all() == [(7,)]


@pytest.mark.parametrize("etapa,acertos", [("durante", 1), ("antes", -1), ("depois", 13)])
def test_banco_tambem_recusa_etapa_e_acertos_invalidos(banco, etapa, acertos):
    with pytest.raises(IntegrityError), banco.begin() as conexao:
        conexao.execute(
            TentativaPiloto.__table__.insert().values(
                participacao=uuid4(),
                versao_quiz=VERSAO_QUIZ,
                etapa=etapa,
                acertos=acertos,
            )
        )


def test_relatorio_real_faz_contas_dos_mesmos_pares_sem_misturar_versoes(banco):
    codigos = [uuid4() for _ in range(5)]
    for acertos, codigo in enumerate(codigos, start=1):
        registrar_tentativa(banco, codigo, VERSAO_QUIZ, "antes", acertos)
        registrar_tentativa(banco, codigo, VERSAO_QUIZ, "depois", acertos + 2)
    with banco.begin() as conexao:
        conexao.execute(
            TentativaPiloto.__table__.insert().values(
                participacao=codigos[0],
                versao_quiz="outra-versao-ficticia",
                etapa="antes",
                acertos=12,
            )
        )
    resumo = resultado(banco, VERSAO_QUIZ)
    assert resumo["tentativas"] == {"antes": 5, "depois": 5, "total": 10}
    assert resumo["medias"]["antes"]["acertos"] == 3
    assert resumo["medias"]["depois"]["acertos"] == 5
    assert resumo["pares"]["diferenca_acertos"] == 2
    assert all(str(codigo) not in json.dumps(resumo) for codigo in codigos)


def test_relatorio_real_vazio_e_com_amostra_pequena(banco):
    assert resultado(banco, VERSAO_QUIZ)["medias"]["antes"]["situacao"] == "sem_respostas"
    registrar_tentativa(banco, uuid4(), VERSAO_QUIZ, "antes", 12)
    media = resultado(banco, VERSAO_QUIZ)["medias"]["antes"]
    assert media["situacao"] == "amostra_pequena" and media["acertos"] is None


def test_apagar_e_idempotente_e_preserva_outras_versoes_e_newsletter(banco):
    codigo = uuid4()
    registrar_tentativa(banco, codigo, VERSAO_QUIZ, "antes", 7)
    consumir_cota(banco, 120)
    with banco.begin() as conexao:
        conexao.execute(
            TentativaPiloto.__table__.insert().values(
                participacao=codigo,
                versao_quiz="outra-versao-ficticia",
                etapa="antes",
                acertos=5,
            )
        )
        conexao.execute(
            LimiteInscricao.__table__.insert().values(
                janela=datetime(2026, 11, 20, tzinfo=UTC),
                quantidade=2,
            )
        )
    assert apagar_medicao(banco, VERSAO_QUIZ, ativo=False) == {
        "tentativas_apagadas": 1,
        "janelas_apagadas": 1,
    }
    assert apagar_medicao(banco, VERSAO_QUIZ, ativo=False) == {
        "tentativas_apagadas": 0,
        "janelas_apagadas": 0,
    }
    with banco.connect() as conexao:
        assert conexao.scalar(select(func.count()).select_from(TentativaPiloto)) == 1
        assert conexao.scalar(select(LimiteInscricao.quantidade)) == 2


def test_apagar_e_transacional(banco):
    registrar_tentativa(banco, uuid4(), VERSAO_QUIZ, "antes", 7)
    consumir_cota(banco, 120)

    def falhar(conexao, cursor, statement, parameters, context, executemany):
        if statement.startswith("DELETE FROM limite_piloto"):
            raise OperationalError("Falha fictícia", {}, Exception())

    event.listen(banco, "before_cursor_execute", falhar)
    try:
        with pytest.raises(OperationalError):
            apagar_medicao(banco, VERSAO_QUIZ, ativo=False)
    finally:
        event.remove(banco, "before_cursor_execute", falhar)
    with banco.connect() as conexao:
        assert conexao.scalar(select(func.count()).select_from(TentativaPiloto)) == 1
        assert conexao.scalar(select(LimitePiloto.quantidade)) == 1


def test_apagar_ativo_ou_versao_desconhecida_nao_abre_banco():
    with pytest.raises(ValueError, match="Desligue"):
        apagar_medicao(object(), VERSAO_QUIZ, ativo=True)
    with pytest.raises(ValueError, match="desconhecida"):
        apagar_medicao(object(), "desconhecida", ativo=False)


def test_http_real_reenvio_e_invalido_gastam_cota_sem_duplicar(banco, monkeypatch):
    monkeypatch.setenv("PILOTO_ATIVO", "true")
    monkeypatch.setenv("PILOTO_LIMITE_POR_MINUTO", "3")
    monkeypatch.setattr(api_piloto, "engine", lambda: banco)
    monkeypatch.setattr(
        api_piloto, "consumir_cota", partial(consumir_cota, agora=datetime.now(UTC))
    )
    config.cache_clear()
    corpo = {
        "participacao": str(uuid4()),
        "versao_quiz": VERSAO_QUIZ,
        "etapa": "antes",
        "acertos": 7,
    }
    try:
        with TestClient(app) as cliente:
            assert cliente.post("/piloto/tentativas", json=corpo).status_code == 200
            assert (
                cliente.post("/piloto/tentativas", json={**corpo, "acertos": 12}).status_code == 200
            )
            assert cliente.post("/piloto/tentativas", json={}).status_code == 422
            resposta = cliente.post("/piloto/tentativas", json={})
            assert resposta.status_code == 429
            assert 1 <= int(resposta.headers["retry-after"]) <= 60
        with banco.connect() as conexao:
            assert conexao.execute(select(TentativaPiloto.acertos)).all() == [(7,)]
            assert conexao.scalar(select(LimitePiloto.quantidade)) == 3
    finally:
        config.cache_clear()
