"""Adiciona o papel da conta."""

import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("conta", sa.Column("papel", sa.String(), server_default="comum", nullable=False))
    op.create_check_constraint("papel", "conta", "papel in ('comum', 'administradora')")


def downgrade() -> None:
    op.drop_constraint(op.f("ck_conta_papel"), "conta", type_="check")
    op.drop_column("conta", "papel")
