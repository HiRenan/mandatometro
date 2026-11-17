"""Carrega a fotografia publicada e todas as suas fontes antes de fechar a sessão."""

from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from mandatometro.db.modelos import Edicao, Fonte, ItemEdicao


@dataclass(frozen=True)
class EdicaoCarregada:
    edicao: Edicao = field(repr=False)
    fontes: dict[int, Fonte] = field(repr=False)


def publicadas():
    return select(Edicao).where(Edicao.estado == "publicada", Edicao.publicada_em.is_not(None))


def carregar_edicao(
    sessao: Session,
    edicao_id: int | None = None,
    *,
    publicada_desde: datetime | None = None,
) -> EdicaoCarregada | None:
    consulta = publicadas()
    if edicao_id is not None:
        consulta = consulta.where(Edicao.id == edicao_id)
    if publicada_desde is not None:
        consulta = consulta.where(Edicao.publicada_em >= publicada_desde)
    edicao = sessao.scalar(
        consulta.order_by(Edicao.publicada_em.desc(), Edicao.id.desc())
        .options(selectinload(Edicao.itens).joinedload(ItemEdicao.fonte))
        .limit(1)
    )
    if edicao is None:
        return None
    # A montagem valida os fatos depois da confirmação da inscrição, inclusive no legado.
    ids = set()
    for item in edicao.itens:
        if isinstance(item.fatos, dict) and isinstance(item.fatos.get("fontes"), list):
            ids.update(i for i in item.fatos["fontes"] if type(i) is int)
    fontes = {f.id: f for f in sessao.scalars(select(Fonte).where(Fonte.id.in_(ids)))}
    fontes.update({item.fonte.id: item.fonte for item in edicao.itens if item.fonte is not None})
    return EdicaoCarregada(edicao, fontes)
