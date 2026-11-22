"""Enriquece as votações confirmadas com o vídeo oficial, em transações próprias."""

import re
import time
from collections.abc import Callable
from datetime import date

from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.coleta.http import ClienteHttp, ErroColeta, Resposta
from mandatometro.coleta.persistencia import salvar_video_sessao
from mandatometro.coleta.tipos import ResumoColeta
from mandatometro.db.modelos import PADRAO_URL_VIDEO, Fonte, VideoSessao, Votacao

# O detalhe pode responder com sucesso e declarar outra origem para a sessão.
URL_RECUSADA = object()

type VotacaoSemVideo = tuple[int, str, str | None]
type VotacoesPorSessao = dict[int | None, list[int]]
type ConsultarSessao = Callable[[ClienteHttp, int], tuple[Resposta, object]]


def coletar_videos(
    resumo: ResumoColeta,
    sessoes: VotacoesPorSessao,
    *,
    http: ClienteHttp,
    abrir_sessao: Callable[[], Session],
    consultar: ConsultarSessao,
    somente_videos: bool = False,
) -> None:
    videos = resumo.videos
    for id_sessao, ids_votacoes in sessoes.items():
        vincular = update(Votacao).where(Votacao.id.in_(ids_votacoes), Votacao.casa == resumo.casa)
        if id_sessao is None:
            videos.votacoes_sem_sessao += len(ids_votacoes)
            if not somente_videos:
                try:
                    with abrir_sessao() as sessao, sessao.begin():
                        sessao.execute(
                            vincular.where(Votacao.video_sessao_id.is_not(None)).values(
                                video_sessao_id=None
                            )
                        )
                except SQLAlchemyError:
                    videos.falhas_gravacao += 1
            continue
        try:
            resposta, endereco = consultar(http, id_sessao)
        except ErroColeta:
            videos.falhas_sessoes += 1
            continue

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
                vinculadas = sessao.execute(vincular.values(video_sessao_id=video_id)).rowcount
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
