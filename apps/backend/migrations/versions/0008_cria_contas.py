"""Cria contas, credenciais e a fila de e-mails de conta."""

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade():
    instante = sa.DateTime(timezone=True)
    op.create_table(
        "conta",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("senha_hash", sa.String(), nullable=False),
        sa.Column("genero", sa.String()),
        sa.Column("autodescricao", sa.String()),
        sa.Column("estado", sa.String()),
        sa.Column("nascimento", sa.Date()),
        sa.Column("termo", sa.String(), nullable=False),
        sa.Column("aceite_em", instante, nullable=False),
        sa.Column("criada_em", instante, nullable=False),
        sa.Column("confirmada_em", instante),
    )
    op.create_table(
        "credencial_conta",
        sa.Column("resumo", sa.String(), primary_key=True),
        sa.Column(
            "conta_id", sa.Uuid(), sa.ForeignKey("conta.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("finalidade", sa.String(), nullable=False),
        sa.Column("expira", instante, nullable=False),
    )
    op.create_index("ix_credencial_conta_conta_id", "credencial_conta", ["conta_id"])
    op.create_table(
        "aviso_conta",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("conta_id", sa.Uuid(), sa.ForeignKey("conta.id", ondelete="CASCADE")),
        sa.Column("conteudo", sa.LargeBinary(), nullable=False),
        sa.Column("proxima", instante, nullable=False),
        sa.Column("expira", instante, nullable=False),
    )
    op.create_index("ix_aviso_conta_proxima", "aviso_conta", ["proxima"])
    op.create_table(
        "limite_conta",
        sa.Column("chave", sa.String(), primary_key=True),
        sa.Column("minuto", sa.Integer(), nullable=False),
        sa.Column("tentativas", sa.Integer(), nullable=False),
    )


def downgrade():
    for tabela in ("limite_conta", "aviso_conta", "credencial_conta", "conta"):
        op.drop_table(tabela)
