"""cria biografias e partidos

Revision ID: 0019
Revises: 0018
Create Date: 2026-11-23 14:49:03.758169
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0019"
down_revision: str | Sequence[str] | None = "0018"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "biografia_parlamentar",
        sa.Column("parlamentar_id", sa.Integer(), nullable=False),
        sa.Column(
            "profissoes",
            postgresql.ARRAY(sa.Text()),
            server_default=sa.text("'{}'::text[]"),
            nullable=False,
        ),
        sa.Column("escolaridade", sa.Text(), nullable=True),
        sa.Column("fonte_profissoes_id", sa.Integer(), nullable=True),
        sa.Column("fonte_escolaridade_id", sa.Integer(), nullable=True),
        sa.CheckConstraint(
            "cardinality(profissoes) > 0 OR escolaridade IS NOT NULL",
            name=op.f("ck_biografia_parlamentar_preenchida"),
        ),
        sa.CheckConstraint(
            "(cardinality(profissoes) > 0) = (fonte_profissoes_id IS NOT NULL)",
            name=op.f("ck_biografia_parlamentar_profissoes_com_fonte"),
        ),
        sa.CheckConstraint(
            "(escolaridade IS NOT NULL) = (fonte_escolaridade_id IS NOT NULL)"
            " AND (escolaridade IS NULL OR btrim(escolaridade) <> '')",
            name=op.f("ck_biografia_parlamentar_escolaridade_com_fonte"),
        ),
        sa.ForeignKeyConstraint(
            ["parlamentar_id"],
            ["parlamentar.id"],
            ondelete="CASCADE",
            name=op.f("fk_biografia_parlamentar_parlamentar_id_parlamentar"),
        ),
        sa.ForeignKeyConstraint(
            ["fonte_profissoes_id"],
            ["fonte.id"],
            name=op.f("fk_biografia_parlamentar_fonte_profissoes_id_fonte"),
        ),
        sa.ForeignKeyConstraint(
            ["fonte_escolaridade_id"],
            ["fonte.id"],
            name=op.f("fk_biografia_parlamentar_fonte_escolaridade_id_fonte"),
        ),
        sa.PrimaryKeyConstraint("parlamentar_id", name=op.f("pk_biografia_parlamentar")),
    )
    op.create_table(
        "partido",
        sa.Column("sigla", sa.Text(), nullable=False),
        sa.Column("nome", sa.Text(), nullable=False),
        sa.Column("fonte_id", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "btrim(sigla) <> '' AND btrim(nome) <> ''", name=op.f("ck_partido_sigla_e_nome")
        ),
        sa.ForeignKeyConstraint(["fonte_id"], ["fonte.id"], name=op.f("fk_partido_fonte_id_fonte")),
        sa.PrimaryKeyConstraint("sigla", name=op.f("pk_partido")),
    )


def downgrade() -> None:
    op.drop_table("partido")
    op.drop_table("biografia_parlamentar")
