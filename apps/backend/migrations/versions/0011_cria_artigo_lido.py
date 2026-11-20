"""Cria as marcas de artigos lidos de cada conta."""

import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "artigo_lido",
        sa.Column(
            "conta_id", sa.Uuid(), sa.ForeignKey("conta.id", ondelete="CASCADE"), primary_key=True
        ),
        sa.Column("artigo_id", sa.String(128), primary_key=True),
        sa.Column(
            "marcado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            """artigo_id COLLATE "C" ~ '^[a-z0-9-]+/[a-z0-9-]+$'""", name="artigo_id"
        ),
    )


def downgrade() -> None:
    op.drop_table("artigo_lido")
