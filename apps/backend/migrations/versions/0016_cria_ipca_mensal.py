"""cria ipca mensal

Revision ID: 0016
Revises: 0015
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0016"
down_revision: str | Sequence[str] | None = "0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ipca_mensal",
        sa.Column("mes", sa.Date(), nullable=False),
        sa.Column("variacao_percentual", sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column("fonte_id", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "mes >= DATE '2006-01-01' AND EXTRACT(DAY FROM mes) = 1",
            name=op.f("ck_ipca_mensal_mes"),
        ),
        sa.CheckConstraint(
            "variacao_percentual > -100 AND variacao_percentual <= 99999.99",
            name=op.f("ck_ipca_mensal_variacao_percentual"),
        ),
        sa.ForeignKeyConstraint(
            ["fonte_id"], ["fonte.id"], name=op.f("fk_ipca_mensal_fonte_id_fonte")
        ),
        sa.PrimaryKeyConstraint("mes", name=op.f("pk_ipca_mensal")),
    )


def downgrade() -> None:
    op.drop_table("ipca_mensal")
