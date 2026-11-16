"""cria o limite de inscricoes

Revision ID: 0004
Revises: 0003
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | Sequence[str] | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "limite_inscricao",
        sa.Column("janela", sa.DateTime(timezone=True), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False),
        sa.CheckConstraint("quantidade > 0", name=op.f("ck_limite_inscricao_quantidade_positiva")),
        sa.CheckConstraint(
            "janela = date_trunc('minute', janela)", name=op.f("ck_limite_inscricao_janela_minuto")
        ),
        sa.PrimaryKeyConstraint("janela", name=op.f("pk_limite_inscricao")),
    )


def downgrade() -> None:
    op.drop_table("limite_inscricao")
