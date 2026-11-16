"""Configuração da função, sem abrir conexão durante a importação."""

import importlib
import runpy
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine, event, text
from sqlalchemy.pool import NullPool, QueuePool

import mandatometro.db as db
from mandatometro.avisos.limite import LimiteAtingido, consumir_cota
from mandatometro.config import Config

BACKEND = Path(__file__).resolve().parents[1]
URL_FICTICIA = (
    "postgresql://teste:senha-ficticia@banco.invalid/mandatometro"
    "?sslmode=require&channel_binding=require"
)


@pytest.fixture
def ambiente(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("VERCEL", raising=False)
    db.engine.cache_clear()
    yield
    db.engine.cache_clear()


@pytest.mark.parametrize("url", [None, ""])
def test_vercel_sem_banco_falha_sem_revelar_configuracao(ambiente, monkeypatch, url):
    monkeypatch.setenv("VERCEL", "1")
    if url is not None:
        monkeypatch.setenv("DATABASE_URL", url)
    with pytest.raises(ValidationError) as erro:
        Config(_env_file=None, resend_api_key="chave-ficticia-nao-mostrar")
    assert "DATABASE_URL" in str(erro.value)
    assert "chave-ficticia-nao-mostrar" not in str(erro.value)


@pytest.mark.parametrize(
    "url",
    ["segredo-ficticio", "postgresql://banco.invalid:segredo-ficticio/db", "postgresql://"],
)
def test_url_invalida_na_vercel_nao_vaza_valores(ambiente, url):
    with pytest.raises(ValidationError) as erro:
        Config(_env_file=None, vercel=True, database_url=url)
    assert "DATABASE_URL" in str(erro.value)
    assert "segredo-ficticio" not in str(erro.value)


@pytest.mark.parametrize("na_vercel", [False, True])
@pytest.mark.parametrize("esquema", ["postgresql://", "postgresql+psycopg://"])
def test_pool_e_conexao_preservam_tls(ambiente, monkeypatch, na_vercel, esquema):
    configuracao = Config(
        _env_file=None,
        vercel=na_vercel,
        database_url=URL_FICTICIA.replace("postgresql://", esquema),
    )
    monkeypatch.setattr(db, "config", lambda: configuracao)
    engine = db.engine()
    assert engine.hide_parameters
    assert isinstance(engine.pool, NullPool if na_vercel else QueuePool)
    assert engine.dialect.driver == "psycopg"

    class ConexaoInterceptada(Exception):
        pass

    @event.listens_for(engine, "do_connect")
    def conferir_parametros(dialect, conn_rec, cargs, cparams):
        assert cparams["sslmode"] == "require"
        assert cparams["channel_binding"] == "require"
        if na_vercel:
            assert cparams["connect_timeout"] == 5
            assert cparams["prepare_threshold"] is None
        raise ConexaoInterceptada

    try:
        with pytest.raises(ConexaoInterceptada):
            engine.connect()
    finally:
        engine.dispose()


def test_entrada_da_vercel_importa_sem_migration_ou_conexao(monkeypatch):
    from alembic import command
    from sqlalchemy import Engine

    def proibido(*args, **kwargs):
        pytest.fail("A importação tentou acessar o banco.")

    monkeypatch.setattr(command, "upgrade", proibido)
    monkeypatch.setattr(Engine, "connect", proibido)
    modulo = importlib.import_module("mandatometro.api.app")
    importlib.reload(modulo)
    entrada = runpy.run_path(str(BACKEND / "app.py"))
    assert entrada["app"] is modulo.app
    assert "/newsletter/saida/{codigo_saida}" in entrada["app"].openapi()["paths"]


def test_instancias_sem_pool_compartilham_a_cota(engine_de_teste):
    agora = datetime(2026, 11, 16, 14, 0, 12, tzinfo=UTC)
    with engine_de_teste.begin() as conexao:
        conexao.execute(text("delete from limite_inscricao"))
    engines = [
        create_engine(
            engine_de_teste.url,
            poolclass=NullPool,
            connect_args={"connect_timeout": 5, "prepare_threshold": None},
        )
        for _ in range(8)
    ]

    def tentar(numero):
        try:
            consumir_cota(engines[numero % len(engines)], 7, agora=agora)
            return True
        except LimiteAtingido:
            return False

    try:
        with ThreadPoolExecutor(max_workers=8) as executor:
            assert sum(executor.map(tentar, range(35))) == 7
    finally:
        for engine in engines:
            engine.dispose()
        with engine_de_teste.begin() as conexao:
            conexao.execute(text("delete from limite_inscricao"))
