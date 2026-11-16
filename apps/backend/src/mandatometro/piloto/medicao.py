"""Gravação e descarte sem expor identificadores ou respostas individuais."""

from uuid import UUID

from sqlalchemy import Engine, delete
from sqlalchemy.dialects.postgresql import insert

from mandatometro.db.modelos import LimitePiloto, TentativaPiloto
from mandatometro.piloto import Etapa, conferir_versao


def registrar_tentativa(
    banco: Engine, participacao: UUID, versao_quiz: str, etapa: Etapa, acertos: int
) -> None:
    conferir_versao(versao_quiz)
    # A chave no PostgreSQL decide atomicamente, inclusive entre instâncias da API.
    # Não atualizar a primeira conclusão nem revelar se a tentativa já existia.
    with banco.begin() as conexao:
        conexao.execute(
            insert(TentativaPiloto)
            .values(
                participacao=participacao, versao_quiz=versao_quiz, etapa=etapa, acertos=acertos
            )
            .on_conflict_do_nothing(
                index_elements=[
                    TentativaPiloto.participacao,
                    TentativaPiloto.versao_quiz,
                    TentativaPiloto.etapa,
                ]
            )
        )


def apagar_medicao(banco: Engine, versao_quiz: str, *, ativo: bool) -> dict[str, int]:
    conferir_versao(versao_quiz)
    if ativo:
        raise ValueError("Desligue o piloto antes de apagar a medição.")
    with banco.begin() as conexao:
        tentativas = conexao.execute(
            delete(TentativaPiloto).where(TentativaPiloto.versao_quiz == versao_quiz)
        ).rowcount
        janelas = conexao.execute(delete(LimitePiloto)).rowcount
    return {"tentativas_apagadas": tentativas, "janelas_apagadas": janelas}
