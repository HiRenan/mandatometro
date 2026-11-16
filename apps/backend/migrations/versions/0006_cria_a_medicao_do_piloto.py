"""cria a medicao do piloto

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-16 18:20:42.699098
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: str | Sequence[str] | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Só acrescenta tabelas: a API anterior continua funcionando durante o deploy.
    op.create_table(
        "limite_piloto",
        sa.Column("janela", sa.DateTime(timezone=True), nullable=False),
        sa.Column("quantidade", sa.Integer(), nullable=False),
        sa.CheckConstraint(
            "janela = date_trunc('minute', janela)", name=op.f("ck_limite_piloto_janela_minuto")
        ),
        sa.CheckConstraint("quantidade > 0", name=op.f("ck_limite_piloto_quantidade_positiva")),
        sa.PrimaryKeyConstraint("janela", name=op.f("pk_limite_piloto")),
    )
    op.create_table(
        "tentativa_piloto",
        sa.Column("participacao", sa.Uuid(), nullable=False),
        sa.Column("versao_quiz", sa.String(length=40), nullable=False),
        sa.Column("etapa", sa.String(), nullable=False),
        sa.Column("acertos", sa.SmallInteger(), nullable=False),
        sa.CheckConstraint(
            "etapa IN ('antes', 'depois')", name=op.f("ck_tentativa_piloto_etapa_valida")
        ),
        sa.CheckConstraint(
            "acertos >= 0 AND acertos <= 12", name=op.f("ck_tentativa_piloto_acertos_validos")
        ),
        sa.PrimaryKeyConstraint(
            "participacao", "versao_quiz", "etapa", name=op.f("pk_tentativa_piloto")
        ),
    )


def downgrade() -> None:
    op.drop_table("tentativa_piloto")
    op.drop_table("limite_piloto")
