"""Inscrição e saída, sem depender do HTTP; o envio usa um cadastro já confirmado."""

import logging
from dataclasses import dataclass, field
from typing import Literal
from uuid import UUID

from sqlalchemy import Engine, delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session, selectinload

from mandatometro.avisos.email import MensagemInvalida, montar_email
from mandatometro.avisos.resend import EnvioIndisponivel, Resend
from mandatometro.db.modelos import Edicao, Fonte, Inscrito, ItemEdicao

logger = logging.getLogger(__name__)
SituacaoInscricao = Literal["edicao_enviada", "aguardando_edicao", "envio_indisponivel"]


@dataclass(frozen=True)
class InscricaoPreparada:
    inscrito_id: int
    email: str = field(repr=False)
    codigo_saida: UUID = field(repr=False)
    edicao: Edicao | None = field(repr=False)
    fontes: dict[int, Fonte] = field(default_factory=dict, repr=False)


def preparar_inscricao(banco: Engine, email: str) -> InscricaoPreparada:
    # Atualizar com o mesmo e-mail permite obter o id em uma única operação atômica, sem
    # alterar data/código de quem já assinava. Nunca decidir a resposta pela existência anterior.
    with Session(banco, expire_on_commit=False) as sessao, sessao.begin():
        inserir = insert(Inscrito).values(email=email)
        inscrito = sessao.scalars(
            inserir.on_conflict_do_update(
                index_elements=[Inscrito.email], set_={"email": inserir.excluded.email}
            ).returning(Inscrito)
        ).one()
        edicao = sessao.scalar(
            select(Edicao)
            .where(Edicao.estado == "publicada")
            .order_by(Edicao.publicada_em.desc(), Edicao.id.desc())
            .options(selectinload(Edicao.itens).joinedload(ItemEdicao.fonte))
            .limit(1)
        )
        # Carrega referências antes de fechar a transação. A validação continua na montagem:
        # edição inválida deve resultar em envio indisponível, preservando a inscrição.
        ids = set()
        for item in edicao.itens if edicao else []:
            if isinstance(item.fatos, dict) and isinstance(item.fatos.get("fontes"), list):
                ids.update(i for i in item.fatos["fontes"] if type(i) is int)
        fontes = {f.id: f for f in sessao.scalars(select(Fonte).where(Fonte.id.in_(ids)))}
        preparada = InscricaoPreparada(
            inscrito.id, inscrito.email, inscrito.codigo_saida, edicao, fontes
        )
    # Todas as relações já vieram do banco. Não há transação/conexão aberta durante a rede.
    return preparada


async def enviar_ultima_edicao(
    inscricao: InscricaoPreparada, envio: Resend, *, app_base_url: str, api_url: str
) -> SituacaoInscricao:
    if inscricao.edicao is None:
        return "aguardando_edicao"
    try:
        mensagem = montar_email(
            inscricao.edicao,
            inscricao.codigo_saida,
            app_base_url=app_base_url,
            api_url=api_url,
            fontes=inscricao.fontes,
        )
        await envio.enviar(
            inscricao.email,
            mensagem,
            f"inscricao/{inscricao.inscrito_id}/edicao/{inscricao.edicao.id}",
        )
    except (MensagemInvalida, EnvioIndisponivel):
        # Não incluir exceção: provedor/banco podem devolver dados pessoais em seu texto.
        logger.warning(
            "Envio da última edição indisponível para o inscrito %s.", inscricao.inscrito_id
        )
        return "envio_indisponivel"
    return "edicao_enviada"


def sair(banco: Engine, codigo_saida: UUID) -> None:
    with banco.begin() as conexao:
        conexao.execute(delete(Inscrito).where(Inscrito.codigo_saida == codigo_saida))
