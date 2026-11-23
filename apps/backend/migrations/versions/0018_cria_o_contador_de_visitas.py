"""cria o contador de visitas

Revision ID: 0018
Revises: 0017
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0018"
down_revision: str | Sequence[str] | None = "0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "visita",
        sa.Column("dia", sa.Date(), nullable=False),
        sa.Column("caminho", sa.String(160), nullable=False),
        sa.Column("quantidade", sa.BigInteger(), server_default="1", nullable=False),
        sa.CheckConstraint(
            """caminho COLLATE "C" ~ '^/([a-z0-9-]+(/[a-z0-9-]+)*)?$'""",
            name=op.f("ck_visita_caminho"),
        ),
        sa.CheckConstraint("quantidade > 0", name=op.f("ck_visita_quantidade_positiva")),
        sa.PrimaryKeyConstraint("dia", "caminho", name=op.f("pk_visita")),
    )
    op.create_table(
        "limite_visita",
        sa.Column("janela", sa.DateTime(timezone=True), nullable=False),
        sa.Column("quantidade", sa.Integer(), server_default="1", nullable=False),
        sa.CheckConstraint(
            "janela = date_trunc('minute', janela)", name=op.f("ck_limite_visita_janela_minuto")
        ),
        sa.CheckConstraint("quantidade > 0", name=op.f("ck_limite_visita_quantidade_positiva")),
        sa.PrimaryKeyConstraint("janela", name=op.f("pk_limite_visita")),
    )


def downgrade() -> None:
    op.drop_table("limite_visita")
    op.drop_table("visita")
