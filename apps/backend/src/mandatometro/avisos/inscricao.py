"""Inscrição e saída, sem depender do HTTP; o envio usa um cadastro já confirmado."""

import logging
from dataclasses import dataclass, field
from typing import Literal
from uuid import UUID

from sqlalchemy import Engine, delete
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.avisos.consulta import EdicaoCarregada, carregar_edicao
from mandatometro.avisos.email import MensagemInvalida
from mandatometro.avisos.envio import enviar_para_inscrito
from mandatometro.avisos.resend import EnvioIndisponivel, Resend
from mandatometro.db.modelos import Inscrito

logger = logging.getLogger(__name__)
SituacaoInscricao = Literal["edicao_enviada", "aguardando_edicao", "envio_indisponivel"]


@dataclass(frozen=True)
class InscricaoPreparada:
    inscrito_id: int
    carregada: EdicaoCarregada | None = field(repr=False)


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
        preparada = InscricaoPreparada(inscrito.id, carregar_edicao(sessao))
    # Todas as relações já vieram do banco. Não há transação/conexão aberta durante a rede.
    return preparada


async def enviar_ultima_edicao(
    inscricao: InscricaoPreparada, envio: Resend, *, banco: Engine, app_base_url: str, api_url: str
) -> SituacaoInscricao:
    if inscricao.carregada is None:
        return "aguardando_edicao"
    try:
        resultado = await enviar_para_inscrito(
            banco,
            inscricao.inscrito_id,
            inscricao.carregada,
            envio,
            app_base_url=app_base_url,
            api_url=api_url,
        )
    except (MensagemInvalida, EnvioIndisponivel, SQLAlchemyError):
        # Não incluir exceção: provedor/banco podem devolver dados pessoais em seu texto.
        logger.warning("Envio indisponível da edição %s.", inscricao.carregada.edicao.id)
        return "envio_indisponivel"
    return "envio_indisponivel" if resultado == "removido" else "edicao_enviada"


def sair(banco: Engine, codigo_saida: UUID) -> None:
    with banco.begin() as conexao:
        conexao.execute(delete(Inscrito).where(Inscrito.codigo_saida == codigo_saida))
