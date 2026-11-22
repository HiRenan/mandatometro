"""guarda temas das proposicoes

Revision ID: 0014
Revises: 0012
Create Date: 2026-11-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: str | Sequence[str] | None = "0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "proposicao_tema",
        sa.Column(
            "proposicao_id",
            sa.Integer(),
            sa.ForeignKey("proposicao.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("tema", sa.String(), primary_key=True),
        sa.Column("fonte_id", sa.Integer(), sa.ForeignKey("fonte.id"), nullable=False),
        sa.CheckConstraint(
            "tema in ('saude', 'educacao', 'economia', 'trabalho', 'previdencia_assistencia', "
            "'direitos_cidadania', 'seguranca_defesa', 'justica', 'meio_ambiente', 'agropecuaria', "
            "'infraestrutura', 'cidades_moradia', 'ciencia_tecnologia', 'cultura_esporte', "
            "'politica_governo', 'orcamento_publico', 'relacoes_internacionais', 'homenagens')",
            name="tema",
        ),
    )


def downgrade() -> None:
    op.drop_table("proposicao_tema")
