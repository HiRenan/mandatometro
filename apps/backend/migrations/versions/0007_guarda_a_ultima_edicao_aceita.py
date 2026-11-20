"""guarda a ultima edicao aceita

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-16
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | Sequence[str] | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Sem backfill: não sabemos qual envio anterior foi aceito. O código antigo continua válido.
    op.add_column("inscrito", sa.Column("ultima_edicao_enviada_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        op.f("fk_inscrito_ultima_edicao_enviada_id_edicao"),
        "inscrito",
        "edicao",
        ["ultima_edicao_enviada_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_inscrito_ultima_edicao_enviada_id_edicao"), "inscrito", type_="foreignkey"
    )
    op.drop_column("inscrito", "ultima_edicao_enviada_id")
