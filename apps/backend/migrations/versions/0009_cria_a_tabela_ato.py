"""Cria a tabela dos atos do DOU."""

import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ato",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("origem", sa.String(), nullable=False),
        sa.Column("id_externo", sa.String(), nullable=False),
        sa.Column("tipo", sa.String(), nullable=False),
        sa.Column("titulo", sa.String(), nullable=False),
        sa.Column("ementa", sa.String()),
        sa.Column("data_publicacao", sa.Date(), nullable=False),
        sa.Column("data_assinatura", sa.Date()),
        sa.Column("secao", sa.String()),
        sa.Column("orgao", sa.String()),
        sa.Column("numero", sa.String()),
        sa.Column("fonte_id", sa.Integer(), sa.ForeignKey("fonte.id"), nullable=False),
        sa.UniqueConstraint("origem", "id_externo"),
        sa.CheckConstraint("tipo in ('decreto', 'lei', 'medida_provisoria', 'outro')", name="tipo"),
    )
    op.create_index("ix_ato_data_publicacao", "ato", ["data_publicacao"])


def downgrade() -> None:
    op.drop_table("ato")
