"""cria candidaturas do tse

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-21 23:43:48.051532
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: str | Sequence[str] | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "candidatura",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ano", sa.SmallInteger(), nullable=False),
        sa.Column("codigo_eleicao", sa.Integer(), nullable=False),
        sa.Column("id_externo", sa.BigInteger(), nullable=False),
        sa.Column("cargo", sa.SmallInteger(), nullable=False),
        sa.Column("uf", sa.String(length=2), nullable=False),
        sa.Column("partido", sa.String(), nullable=False),
        sa.Column("numero", sa.String(), nullable=False),
        sa.Column("nome_urna", sa.String(), nullable=False),
        sa.Column("resultado", sa.String(), nullable=False),
        sa.Column("resultado_bruto", sa.SmallInteger(), nullable=False),
        sa.Column("parlamentar_id", sa.Integer(), nullable=False),
        sa.Column("fonte_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("ano >= 2006", name=op.f("ck_candidatura_ano")),
        sa.CheckConstraint("codigo_eleicao > 0", name=op.f("ck_candidatura_codigo_eleicao")),
        sa.CheckConstraint("id_externo > 0", name=op.f("ck_candidatura_id_externo")),
        sa.CheckConstraint("cargo > 0", name=op.f("ck_candidatura_cargo")),
        sa.CheckConstraint("""uf COLLATE "C" ~ '^[A-Z]{2}$'""", name=op.f("ck_candidatura_uf")),
        sa.CheckConstraint(
            """numero COLLATE "C" ~ '^[0-9]+$'""", name=op.f("ck_candidatura_numero")
        ),
        sa.CheckConstraint("btrim(nome_urna) <> ''", name=op.f("ck_candidatura_nome_urna")),
        sa.CheckConstraint(
            "resultado in ('sem_resultado', 'eleito', 'eleito_por_qp', 'eleito_por_media',"
            " 'nao_eleito', 'suplente', 'outro')",
            name=op.f("ck_candidatura_resultado"),
        ),
        sa.ForeignKeyConstraint(
            ["fonte_id"], ["fonte.id"], name=op.f("fk_candidatura_fonte_id_fonte")
        ),
        sa.ForeignKeyConstraint(
            ["parlamentar_id"],
            ["parlamentar.id"],
            name=op.f("fk_candidatura_parlamentar_id_parlamentar"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_candidatura")),
        sa.UniqueConstraint(
            "ano",
            "codigo_eleicao",
            "id_externo",
            name=op.f("uq_candidatura_ano_codigo_eleicao_id_externo"),
        ),
    )
    op.create_index(
        op.f("ix_candidatura_parlamentar_id"), "candidatura", ["parlamentar_id"], unique=False
    )
    op.create_table(
        "link_candidatura",
        sa.Column("candidatura_id", sa.Integer(), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False),
        sa.Column("url", sa.String(), nullable=False),
        sa.Column("fonte_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("ordem > 0", name=op.f("ck_link_candidatura_ordem")),
        sa.CheckConstraint(
            "url like 'http://%' or url like 'https://%'", name=op.f("ck_link_candidatura_url")
        ),
        sa.ForeignKeyConstraint(
            ["candidatura_id"],
            ["candidatura.id"],
            name=op.f("fk_link_candidatura_candidatura_id_candidatura"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["fonte_id"], ["fonte.id"], name=op.f("fk_link_candidatura_fonte_id_fonte")
        ),
        sa.PrimaryKeyConstraint("candidatura_id", "ordem", name=op.f("pk_link_candidatura")),
    )


def downgrade() -> None:
    op.drop_table("link_candidatura")
    op.drop_index(op.f("ix_candidatura_parlamentar_id"), table_name="candidatura")
    op.drop_table("candidatura")
