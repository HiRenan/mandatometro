"""Banco: conexão com o PostgreSQL (pgvector) e a base dos modelos, em SQLAlchemy 2.

Os modelos entram com o modelo de dados (issue #7), e cada mudança de esquema vira uma migration
do Alembic em migrations/versions.
"""

from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session

from mandatometro.config import config


class Base(DeclarativeBase):
    """Base dos modelos. O Alembic compara o metadata dela com o banco."""


@lru_cache
def engine() -> Engine:
    return create_engine(config().database_url, pool_pre_ping=True)


def sessao() -> Session:
    return Session(engine())
