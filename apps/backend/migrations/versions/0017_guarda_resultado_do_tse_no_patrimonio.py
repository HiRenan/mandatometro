"""guarda resultado do tse no patrimonio

Revision ID: 0017
Revises: 0016
Create Date: 2026-11-22 23:56:01.596193
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0017"
down_revision: str | Sequence[str] | None = "0016"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("candidatura_patrimonio", sa.Column("resultado", sa.String(), nullable=True))
    op.add_column("candidatura_patrimonio", sa.Column("resultado_bruto", sa.Text(), nullable=True))
    op.create_check_constraint(
        op.f("ck_candidatura_patrimonio_resultado"),
        "candidatura_patrimonio",
        "resultado in ('sem_resultado', 'eleito', 'eleito_por_qp', 'eleito_por_media',"
        " 'nao_eleito', 'suplente', 'outro')",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("ck_candidatura_patrimonio_resultado"), "candidatura_patrimonio", type_="check"
    )
    op.drop_column("candidatura_patrimonio", "resultado_bruto")
    op.drop_column("candidatura_patrimonio", "resultado")
