"""cria a extensao vector

A extensão pgvector guarda os embeddings das promessas e dos atos no próprio PostgreSQL.

Revision ID: 0001
Revises:
Create Date: 2026-11-05 16:34:51.773083
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0001"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS vector")
