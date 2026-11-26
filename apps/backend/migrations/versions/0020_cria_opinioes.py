"""cria opinioes

Revision ID: 0020
Revises: 0019
Create Date: 2026-11-26 15:49:53.615159
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0020"
down_revision: str | Sequence[str] | None = "0019"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "opiniao",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column(
            "criada_em", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("nota", sa.SmallInteger(), nullable=True),
        sa.Column(
            "partes",
            postgresql.ARRAY(sa.Text()),
            server_default=sa.text("'{}'::text[]"),
            nullable=False,
        ),
        sa.Column("texto", sa.Text(), nullable=False),
        sa.CheckConstraint("nota BETWEEN 1 AND 5", name=op.f("ck_opiniao_nota")),
        sa.CheckConstraint(
            "coalesce(array_ndims(partes), 1) = 1 AND cardinality(partes) = ("
            "CASE WHEN 'trilhas' = ANY(partes) THEN 1 ELSE 0 END + "
            "CASE WHEN 'parlamentares' = ANY(partes) THEN 1 ELSE 0 END + "
            "CASE WHEN 'jogos' = ANY(partes) THEN 1 ELSE 0 END + "
            "CASE WHEN 'edicoes' = ANY(partes) THEN 1 ELSE 0 END)",
            name=op.f("ck_opiniao_partes"),
        ),
        sa.CheckConstraint("char_length(texto) BETWEEN 1 AND 2000", name=op.f("ck_opiniao_texto")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_opiniao")),
    )
    op.create_table(
        "limite_opiniao",
        sa.Column("janela", sa.DateTime(timezone=True), nullable=False),
        sa.Column("quantidade", sa.Integer(), server_default="1", nullable=False),
        sa.CheckConstraint(
            "janela = date_trunc('minute', janela)", name=op.f("ck_limite_opiniao_janela_minuto")
        ),
        sa.CheckConstraint("quantidade > 0", name=op.f("ck_limite_opiniao_quantidade_positiva")),
        sa.PrimaryKeyConstraint("janela", name=op.f("pk_limite_opiniao")),
    )


def downgrade() -> None:
    op.drop_table("limite_opiniao")
    op.drop_table("opiniao")
