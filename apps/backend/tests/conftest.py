"""O banco dos testes: um PostgreSQL só deles, apontado pelo TEST_DATABASE_URL.

A variável vem só do ambiente, nunca do DATABASE_URL nem do padrão do config.py, porque os testes
apagam tudo no banco. Sem ela, os testes de banco são pulados; no CI, falham, para não passarem em
silêncio. O nome do banco tem de terminar em _teste, na URL e no banco que a conexão abriu. Como
criar o banco e rodar está no README, em "Como rodar".
"""

import os
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import Connection, Engine, create_engine, make_url, text
from sqlalchemy.orm import Session

PYPROJECT = Path(__file__).resolve().parents[1] / "pyproject.toml"


def _config_do_alembic(conexao: Connection) -> Config:
    """O Alembic do projeto, rodando na conexão dos testes (ver migrations/env.py)."""
    return Config(toml_file=PYPROJECT, attributes={"connection": conexao})


@pytest.fixture(scope="session")
def engine_de_teste() -> Iterator[Engine]:
    """O banco de teste, zerado e com todas as migrations aplicadas."""
    url = os.environ.get("TEST_DATABASE_URL")
    if not url:
        if os.environ.get("CI"):
            pytest.fail("No CI, os testes de banco precisam do TEST_DATABASE_URL.")
        pytest.skip("Defina o TEST_DATABASE_URL para rodar os testes de banco (ver o README).")
    if not (make_url(url).database or "").endswith("_teste"):
        pytest.fail(
            "O TEST_DATABASE_URL tem de apontar para um banco terminado em _teste: "
            "os testes apagam tudo nele."
        )

    engine = create_engine(url)
    with engine.begin() as conexao:
        # O nome na URL não basta: um ?dbname= na query troca o banco que o psycopg abre. Confere o
        # banco conectado, na mesma conexão que vai apagá-lo.
        banco = conexao.execute(text("select current_database()")).scalar_one()
        if not banco.endswith("_teste"):
            pytest.fail(
                f"O TEST_DATABASE_URL abriu o banco {banco}, que não termina em _teste: "
                "os testes apagam tudo nele."
            )
        # Do zero: apaga o que sobrou de outra rodada, inclusive a extensão vector.
        conexao.execute(text("drop schema public cascade"))
        conexao.execute(text("create schema public"))
        command.upgrade(_config_do_alembic(conexao), "head")
    yield engine
    engine.dispose()


@pytest.fixture
def alembic(engine_de_teste: Engine) -> Callable[..., None]:
    """Roda um comando do Alembic no banco de teste, como alembic("downgrade", "base")."""

    def rodar(comando: str, *argumentos: str) -> None:
        with engine_de_teste.begin() as conexao:
            getattr(command, comando)(_config_do_alembic(conexao), *argumentos)

    return rodar


@pytest.fixture
def sessao(engine_de_teste: Engine) -> Iterator[Session]:
    """Uma sessão numa transação desfeita no fim do teste: o banco volta como estava."""
    with engine_de_teste.connect() as conexao:
        transacao = conexao.begin()
        with Session(bind=conexao, join_transaction_mode="create_savepoint") as s:
            yield s
        transacao.rollback()
