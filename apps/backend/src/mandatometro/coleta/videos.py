"""Enriquece as votações confirmadas com o vídeo oficial, em transações próprias."""

import re
import time
from collections.abc import Callable
from datetime import date

from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.coleta.http import (
    ClienteHttp,
    ErroColeta,
    ErroColetaTemporario,
    PrazoConsultaEsgotado,
    Resposta,
)
from mandatometro.coleta.persistencia import salvar_video_sessao
from mandatometro.coleta.tipos import ResumoColeta
from mandatometro.db.modelos import PADRAO_URL_VIDEO, Fonte, VideoSessao, Votacao

# O detalhe pode responder com sucesso e declarar outra origem para a sessão.
URL_RECUSADA = object()
LIMITE_VIDEOS_S = 4 * 60
# O job tem teto de 30 min, incluindo o preparo do ambiente e a saída do CLI.
LIMITE_COLETA_COM_VIDEOS_S = 25 * 60

type VotacaoSemVideo = tuple[int, str, str | None]
type VotacoesPorSessao = dict[int | None, list[int]]
type ConsultarSessao = Callable[[ClienteHttp, int, float | None], tuple[Resposta, object]]


def coletar_videos(
    resumo: ResumoColeta,
    sessoes: VotacoesPorSessao,
    *,
    http: ClienteHttp,
    abrir_sessao: Callable[[], Session],
    consultar: ConsultarSessao,
    somente_videos: bool = False,
    comeco_coleta: float | None = None,
) -> None:
    prazo = None
    if comeco_coleta is not None:
        prazo = min(time.monotonic() + LIMITE_VIDEOS_S, comeco_coleta + LIMITE_COLETA_COM_VIDEOS_S)
    videos = resumo.videos
    vincular = update(Votacao).where(Votacao.casa == resumo.casa)
    sem_sessao = sessoes.get(None)
    if sem_sessao:
        videos.votacoes_sem_sessao += len(sem_sessao)
        if not somente_videos:
            try:
                with abrir_sessao() as sessao, sessao.begin():
                    sessao.execute(
                        vincular.where(
                            Votacao.id.in_(sem_sessao),
                            Votacao.video_sessao_id.is_not(None),
                        ).values(video_sessao_id=None)
                    )
            except SQLAlchemyError:
                videos.falhas_gravacao += 1

    consultaveis = [(codigo, ids) for codigo, ids in sessoes.items() if codigo is not None]
    falhas_seguidas = 0
    for indice, (id_sessao, ids_votacoes) in enumerate(consultaveis):
        if prazo is not None and (falhas_seguidas >= 2 or time.monotonic() >= prazo):
            videos.sessoes_nao_consultadas += len(consultaveis) - indice
            break
        chamadas = http.chamadas
        try:
            resposta, endereco = consultar(http, id_sessao, prazo)
        except PrazoConsultaEsgotado:
            consultada = http.chamadas > chamadas
            videos.falhas_sessoes += consultada
            videos.sessoes_nao_consultadas += len(consultaveis) - indice - consultada
            break
        except ErroColeta as erro:
            videos.falhas_sessoes += 1
            falhas_seguidas = falhas_seguidas + 1 if isinstance(erro, ErroColetaTemporario) else 0
            continue

        falhas_seguidas = 0

        url_video = None
        if endereco is None or endereco == "":
            videos.sessoes_sem_video += 1
        elif isinstance(endereco, str) and re.fullmatch(PADRAO_URL_VIDEO, endereco):
            url_video = endereco
            videos.sessoes_com_video += 1
        else:
            videos.urls_recusadas += 1
        if somente_videos and url_video is None:
            continue

        try:
            with abrir_sessao() as sessao, sessao.begin():
                video_id, fonte_criada = salvar_video_sessao(
                    sessao,
                    casa=resumo.casa,
                    id_externo=id_sessao,
                    url_video=url_video,
                    resposta=resposta,
                )
                vinculadas = sessao.execute(
                    vincular.where(Votacao.id.in_(ids_votacoes)).values(video_sessao_id=video_id)
                ).rowcount
        except SQLAlchemyError:
            videos.falhas_gravacao += 1
            continue
        resumo.fontes += fonte_criada
        if url_video is not None:
            videos.votacoes_com_video += vinculadas


def preencher_videos(
    inicio: date,
    fim: date,
    *,
    casa: str,
    http: ClienteHttp,
    abrir_sessao: Callable[[], Session],
    localizar: Callable[[list[VotacaoSemVideo]], VotacoesPorSessao],
    consultar: ConsultarSessao,
) -> ResumoColeta:
    resumo = ResumoColeta(casa, inicio, fim)
    comeco = time.monotonic()
    try:
        with abrir_sessao() as sessao:
            consulta = (
                select(Votacao.id, Votacao.id_externo, Fonte.url_publica)
                .join(Votacao.fonte)
                .outerjoin(Votacao.video_sessao)
                .where(
                    Votacao.casa == casa,
                    Votacao.data.between(inicio, fim),
                    VideoSessao.url_video.is_(None),
                )
            )
            candidatas = [
                (interno, externo, url) for interno, externo, url in sessao.execute(consulta)
            ]
        if candidatas:
            coletar_videos(
                resumo,
                localizar(candidatas),
                http=http,
                abrir_sessao=abrir_sessao,
                consultar=consultar,
                somente_videos=True,
            )
        resumo.completa = not (resumo.videos.falhas_sessoes or resumo.videos.falhas_gravacao)
    except ErroColeta as erro:
        resumo.completa = False
        resumo.erro = str(erro)
    except SQLAlchemyError:
        resumo.completa = False
        resumo.erro = "Falha ao consultar as votações sem vídeo."
    resumo.chamadas = http.chamadas
    resumo.tentativas_extras = http.tentativas_extras
    resumo.duracao_s = round(time.monotonic() - comeco, 3)
    return resumo
