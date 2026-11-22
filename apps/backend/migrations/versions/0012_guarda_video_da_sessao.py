"""guarda video da sessao

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-22
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0012"
down_revision: str | Sequence[str] | None = "0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "video_sessao",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("casa", sa.String(), nullable=False),
        sa.Column("id_externo", sa.Integer(), nullable=False),
        sa.Column("url_video", sa.String(), nullable=True),
        sa.Column("fonte_id", sa.Integer(), sa.ForeignKey("fonte.id"), nullable=False),
        sa.UniqueConstraint("casa", "id_externo"),
        sa.CheckConstraint("casa in ('camara', 'senado')", name="casa"),
        sa.CheckConstraint("id_externo > 0", name="id_externo"),
        sa.CheckConstraint(
            """url_video COLLATE "C" ~ '^https://www[.]youtube[.]com/watch[?]v=[A-Za-z0-9_-]{11}$'""",
            name="url_video",
        ),
    )
    op.add_column("votacao", sa.Column("video_sessao_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        op.f("fk_votacao_video_sessao_id_video_sessao"),
        "votacao",
        "video_sessao",
        ["video_sessao_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_votacao_video_sessao_id_video_sessao"), "votacao", type_="foreignkey"
    )
    op.drop_column("votacao", "video_sessao_id")
    op.drop_table("video_sessao")
