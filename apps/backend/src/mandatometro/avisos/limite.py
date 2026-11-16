"""Limite global compartilhado por todas as instâncias da API, sem dado pessoal."""

from datetime import datetime, timedelta
from math import ceil

from sqlalchemy import Engine, delete, func, select
from sqlalchemy.dialects.postgresql import insert

from mandatometro.db.modelos import LimiteInscricao


class LimiteAtingido(Exception):
    def __init__(self, tentar_em: int):
        self.tentar_em = tentar_em
        super().__init__("Limite de inscrições atingido.")


def consumir_cota(banco: Engine, limite: int, *, agora: datetime | None = None) -> None:
    """Consome uma tentativa em transação própria, mesmo se a inscrição depois falhar.

    A hora vem do PostgreSQL: as funções da hospedagem não precisam concordar nos relógios.
    ``agora`` permite testar a virada da janela sem dormir. Rejeições não aumentam o contador.
    """
    with banco.begin() as conexao:
        instante = agora if agora is not None else conexao.scalar(select(func.clock_timestamp()))
        janela = instante.replace(second=0, microsecond=0)
        conexao.execute(
            delete(LimiteInscricao).where(LimiteInscricao.janela < janela - timedelta(minutes=1))
        )
        gravar = insert(LimiteInscricao).values(janela=janela, quantidade=1)
        quantidade = conexao.scalar(
            gravar.on_conflict_do_update(
                index_elements=[LimiteInscricao.janela],
                set_={"quantidade": LimiteInscricao.quantidade + 1},
                where=LimiteInscricao.quantidade < limite,
            ).returning(LimiteInscricao.quantidade)
        )
        if quantidade is None:
            raise LimiteAtingido(
                max(1, ceil((janela + timedelta(minutes=1) - instante).total_seconds()))
            )
