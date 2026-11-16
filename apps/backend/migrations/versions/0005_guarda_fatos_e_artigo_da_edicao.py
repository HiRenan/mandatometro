"""guarda fatos e artigo da edicao

Revision ID: 0005
Revises: 0004
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("item_edicao", sa.Column("fatos", postgresql.JSONB(), nullable=True))
    op.add_column("item_edicao", sa.Column("artigo_caminho", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("item_edicao", "artigo_caminho")
    op.drop_column("item_edicao", "fatos")
