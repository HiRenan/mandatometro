"""Cota global do piloto, seguindo a transação independente da newsletter."""

from datetime import datetime, timedelta
from math import ceil

from sqlalchemy import Engine, delete, func, select
from sqlalchemy.dialects.postgresql import insert

from mandatometro.db.modelos import LimitePiloto


class LimiteAtingido(Exception):
    def __init__(self, tentar_em: int):
        self.tentar_em = tentar_em
        super().__init__("Limite de tentativas do piloto atingido.")


def consumir_cota(banco: Engine, limite: int, *, agora: datetime | None = None) -> None:
    with banco.begin() as conexao:
        instante = agora if agora is not None else conexao.scalar(select(func.clock_timestamp()))
        janela = instante.replace(second=0, microsecond=0)
        conexao.execute(
            delete(LimitePiloto).where(LimitePiloto.janela < janela - timedelta(minutes=1))
        )
        gravar = insert(LimitePiloto).values(janela=janela, quantidade=1)
        quantidade = conexao.scalar(
            gravar.on_conflict_do_update(
                index_elements=[LimitePiloto.janela],
                set_={"quantidade": LimitePiloto.quantidade + 1},
                where=LimitePiloto.quantidade < limite,
            ).returning(LimitePiloto.quantidade)
        )
        if quantidade is None:
            raise LimiteAtingido(
                max(1, ceil((janela + timedelta(minutes=1) - instante).total_seconds()))
            )
