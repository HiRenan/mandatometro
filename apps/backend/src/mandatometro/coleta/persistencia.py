"""Gravações idempotentes. O chamador delimita a transação; nenhum helper faz commit."""

from collections.abc import Sequence
from dataclasses import asdict
from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from mandatometro.coleta.http import Resposta
from mandatometro.coleta.tipos import DadosVoto
from mandatometro.db.modelos import (
    Ato,
    Fonte,
    Mandato,
    Parlamentar,
    Proposicao,
    ProposicaoTema,
    VideoSessao,
    Votacao,
    Voto,
)
from mandatometro.temas import TemaId


def registrar_fonte(
    sessao: Session,
    resposta: Resposta,
    *,
    url_publica: str | None = None,
    trecho: str | None = None,
) -> Fonte:
    """Nova observação imutável, compartilhada por todos os registros da resposta."""
    fonte = Fonte(
        url=resposta.url,
        coletado_em=resposta.coletado_em,
        url_publica=url_publica,
        trecho=trecho,
    )
    sessao.add(fonte)
    sessao.flush()
    return fonte


def _salvar(sessao, modelo, chaves, valores):
    comando = insert(modelo).values(**valores)
    comando = comando.on_conflict_do_update(
        index_elements=chaves,
        set_={nome: getattr(comando.excluded, nome) for nome in valores if nome not in chaves},
    ).returning(modelo)
    return sessao.scalars(comando, execution_options={"populate_existing": True}).one()


def salvar_ato(
    sessao: Session,
    *,
    origem: str,
    id_externo: str,
    tipo: str,
    titulo: str,
    data_publicacao: date,
    fonte: Fonte,
    ementa: str | None = None,
    data_assinatura: date | None = None,
    secao: str | None = None,
    orgao: str | None = None,
    numero: str | None = None,
) -> Ato:
    return _salvar(
        sessao,
        Ato,
        ["origem", "id_externo"],
        {
            "origem": origem,
            "id_externo": id_externo,
            "tipo": tipo,
            "titulo": titulo,
            "data_publicacao": data_publicacao,
            "fonte_id": fonte.id,
            "ementa": ementa,
            "data_assinatura": data_assinatura,
            "secao": secao,
            "orgao": orgao,
            "numero": numero,
        },
    )


def salvar_parlamentar(
    sessao: Session,
    *,
    casa: str,
    id_externo: int,
    nome: str,
    fonte: Fonte,
) -> Parlamentar:
    return _salvar(
        sessao,
        Parlamentar,
        ["casa", "id_externo"],
        {
            "casa": casa,
            "id_externo": id_externo,
            "nome": nome,
            "fonte_id": fonte.id,
        },
    )


def salvar_mandato(
    sessao: Session,
    *,
    parlamentar_id: int,
    legislatura: int,
    uf: str,
    condicao: str | None,
    em_exercicio: bool,
    fonte: Fonte,
) -> Mandato:
    return _salvar(
        sessao,
        Mandato,
        ["parlamentar_id", "legislatura"],
        {
            "parlamentar_id": parlamentar_id,
            "legislatura": legislatura,
            "uf": uf,
            "condicao": condicao,
            "em_exercicio": em_exercicio,
            "fonte_id": fonte.id,
        },
    )


def salvar_proposicao(
    sessao: Session,
    *,
    casa: str,
    id_externo: int,
    sigla: str,
    numero: int,
    ano: int,
    ementa: str | None,
    apelido: str | None,
    url_inteiro_teor: str | None,
    fonte: Fonte,
) -> Proposicao:
    return _salvar(
        sessao,
        Proposicao,
        ["casa", "id_externo"],
        {
            "casa": casa,
            "id_externo": id_externo,
            "sigla": sigla,
            "numero": numero,
            "ano": ano,
            "ementa": ementa,
            "apelido": apelido,
            "url_inteiro_teor": url_inteiro_teor,
            "fonte_id": fonte.id,
        },
    )


def salvar_temas_da_proposicao(
    sessao: Session,
    *,
    casa: str,
    id_externo: int,
    temas: set[TemaId],
    resposta: Resposta,
    somente_preencher: bool,
) -> int:
    """Serializa a troca do conjunto e retorna quantas fontes foram criadas."""
    proposicao_id = sessao.scalar(
        select(Proposicao.id)
        .where(Proposicao.casa == casa, Proposicao.id_externo == id_externo)
        .with_for_update()
    )
    if proposicao_id is None:
        return 0
    desta_proposicao = ProposicaoTema.proposicao_id == proposicao_id
    anteriores = set(sessao.scalars(select(ProposicaoTema.tema).where(desta_proposicao)))
    if (somente_preencher and anteriores) or anteriores == temas:
        return 0
    sessao.execute(delete(ProposicaoTema).where(desta_proposicao))
    if not temas:
        return 0
    fonte = registrar_fonte(sessao, resposta)
    sessao.add_all(
        ProposicaoTema(proposicao_id=proposicao_id, tema=tema.value, fonte_id=fonte.id)
        for tema in sorted(temas)
    )
    return 1


def salvar_votacao(
    sessao: Session,
    *,
    casa: str,
    id_externo: str,
    data: date,
    descricao: str,
    resultado: str,
    resultado_bruto: str | None,
    fonte: Fonte,
    proposicoes: Sequence[Proposicao],
) -> Votacao:
    votacao = _salvar(
        sessao,
        Votacao,
        ["casa", "id_externo"],
        {
            "casa": casa,
            "id_externo": id_externo,
            "data": data,
            "descricao": descricao,
            "resultado": resultado,
            "resultado_bruto": resultado_bruto,
            "fonte_id": fonte.id,
        },
    )
    votacao.proposicoes = list({p.id: p for p in proposicoes}.values())
    sessao.flush()
    return votacao


def salvar_video_sessao(
    sessao: Session,
    *,
    casa: str,
    id_externo: int,
    url_video: str | None,
    resposta: Resposta,
) -> tuple[int, bool]:
    anterior = sessao.scalar(
        select(VideoSessao)
        .where(VideoSessao.casa == casa, VideoSessao.id_externo == id_externo)
        .with_for_update()
    )
    if anterior is not None and anterior.url_video == url_video:
        return anterior.id, False
    fonte = registrar_fonte(sessao, resposta)
    video = _salvar(
        sessao,
        VideoSessao,
        ["casa", "id_externo"],
        {"casa": casa, "id_externo": id_externo, "url_video": url_video, "fonte_id": fonte.id},
    )
    return video.id, True


def sincronizar_votos(sessao: Session, votacao: Votacao, votos: Sequence[DadosVoto]) -> int:
    """Substitui o conjunto completo, preservando as chaves e as fontes de cada página."""
    ids = [v.parlamentar_id for v in votos]
    if len(ids) != len(set(ids)):
        raise ValueError("A lista tem mais de um voto para o mesmo parlamentar.")
    remover = delete(Voto).where(Voto.votacao_id == votacao.id)
    if ids:
        remover = remover.where(Voto.parlamentar_id.not_in(ids))
    sessao.execute(remover)
    if votos:
        comando = insert(Voto).values([{"votacao_id": votacao.id, **asdict(v)} for v in votos])
        sessao.execute(
            comando.on_conflict_do_update(
                index_elements=["votacao_id", "parlamentar_id"],
                set_={
                    nome: getattr(comando.excluded, nome)
                    for nome in (
                        "valor",
                        "valor_bruto",
                        "partido",
                        "uf",
                        "fonte_id",
                    )
                },
            )
        )
    sessao.flush()
    sessao.expire(votacao, ["votos"])
    return len(votos)


def reconciliar_exercicio(
    sessao: Session,
    *,
    casa: str,
    atuais: set[tuple[int, int]],
    fonte: Fonte,
) -> int:
    """Recebe ids internos e a primeira legislatura de cada mandato da lista COMPLETA.

    Não deduz legislatura atual: no Senado há mandatos ativos que começam em legislaturas
    diferentes. Quem chama confirma a completude da lista antes desta operação.
    """
    mandatos = sessao.scalars(select(Mandato).join(Parlamentar).where(Parlamentar.casa == casa))
    alterados = 0
    for mandato in mandatos:
        em_exercicio = (mandato.parlamentar_id, mandato.legislatura) in atuais
        if mandato.em_exercicio != em_exercicio:
            mandato.em_exercicio = em_exercicio
            mandato.fonte_id = fonte.id
            alterados += 1
    sessao.flush()
    return alterados
