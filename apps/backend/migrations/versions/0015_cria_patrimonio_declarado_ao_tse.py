"""cria patrimonio declarado ao tse

Revision ID: 0015
Revises: 0014
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0015"
down_revision: str | Sequence[str] | None = "0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "candidatura_patrimonio",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ano", sa.SmallInteger(), nullable=False),
        sa.Column("codigo_eleicao", sa.Integer(), nullable=False),
        sa.Column("uf", sa.String(length=2), nullable=False),
        sa.Column("id_externo", sa.BigInteger(), nullable=False),
        sa.Column("cargo", sa.SmallInteger(), nullable=False),
        sa.Column("parlamentar_id", sa.Integer(), nullable=False),
        sa.Column("fonte_candidatura_id", sa.Integer(), nullable=False),
        sa.Column("fonte_bens_id", sa.Integer(), nullable=False),
        sa.CheckConstraint("ano >= 2006", name=op.f("ck_candidatura_patrimonio_ano")),
        sa.CheckConstraint(
            "codigo_eleicao > 0", name=op.f("ck_candidatura_patrimonio_codigo_eleicao")
        ),
        sa.CheckConstraint("id_externo > 0", name=op.f("ck_candidatura_patrimonio_id_externo")),
        sa.CheckConstraint("cargo > 0", name=op.f("ck_candidatura_patrimonio_cargo")),
        sa.CheckConstraint(
            """uf COLLATE "C" ~ '^[A-Z]{2}$'""", name=op.f("ck_candidatura_patrimonio_uf")
        ),
        sa.ForeignKeyConstraint(
            ["fonte_bens_id"],
            ["fonte.id"],
            name=op.f("fk_candidatura_patrimonio_fonte_bens_id_fonte"),
        ),
        sa.ForeignKeyConstraint(
            ["fonte_candidatura_id"],
            ["fonte.id"],
            name=op.f("fk_candidatura_patrimonio_fonte_candidatura_id_fonte"),
        ),
        sa.ForeignKeyConstraint(
            ["parlamentar_id"],
            ["parlamentar.id"],
            name=op.f("fk_candidatura_patrimonio_parlamentar_id_parlamentar"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_candidatura_patrimonio")),
        sa.UniqueConstraint(
            "ano",
            "codigo_eleicao",
            "uf",
            "id_externo",
            name=op.f("uq_candidatura_patrimonio_ano_codigo_eleicao_uf_id_externo"),
        ),
        sa.UniqueConstraint(
            "parlamentar_id", "ano", name=op.f("uq_candidatura_patrimonio_parlamentar_id_ano")
        ),
    )
    op.create_table(
        "bem_declarado",
        sa.Column("candidatura_id", sa.Integer(), nullable=False),
        sa.Column("tipo", sa.Integer(), nullable=False),
        sa.Column("valor_centavos", sa.BigInteger(), nullable=False),
        sa.CheckConstraint(
            "valor_centavos BETWEEN 0 AND 9007199254740991",
            name=op.f("ck_bem_declarado_valor_centavos"),
        ),
        sa.ForeignKeyConstraint(
            ["candidatura_id"],
            ["candidatura_patrimonio.id"],
            name=op.f("fk_bem_declarado_candidatura_id_candidatura_patrimonio"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("candidatura_id", "tipo", name=op.f("pk_bem_declarado")),
    )


def downgrade() -> None:
    op.drop_table("bem_declarado")
    op.drop_table("candidatura_patrimonio")
