"""Banco: conexão com o PostgreSQL (pgvector) e a base dos modelos, em SQLAlchemy 2.

Os modelos ficam em db/modelos.py, com o diagrama no README, e cada mudança de esquema vira uma
migration do Alembic em migrations/versions.
"""

from datetime import datetime
from functools import lru_cache

from sqlalchemy import DateTime, Engine, MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session

from mandatometro.config import config

# Nomes fixos para as constraints, para o Alembic achar cada uma ao mudar ou desfazer uma tabela.
CONVENCAO_DE_NOMES = {
    "pk": "pk_%(table_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
}


class Base(DeclarativeBase):
    """Base dos modelos. O Alembic compara o metadata dela com o banco."""

    metadata = MetaData(naming_convention=CONVENCAO_DE_NOMES)
    # Data e hora sempre com fuso (timestamptz).
    type_annotation_map = {datetime: DateTime(timezone=True)}


@lru_cache
def engine() -> Engine:
    return create_engine(config().database_url, pool_pre_ping=True)


def sessao() -> Session:
    return Session(engine())
