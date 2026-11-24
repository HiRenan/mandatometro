"""A etapa opcional pelo CLI das duas Casas, com relógio simulado e sem rede."""

import json
import time
from contextlib import nullcontext
from datetime import date
from functools import partial

import httpx2
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from test_coleta_camara import roteiro as roteiro
from test_coleta_senado import respostas as respostas

from mandatometro.cli import main
from mandatometro.coleta import camara, senado
from mandatometro.coleta.http import ClienteHttp
from mandatometro.coleta.tipos import ResumoColeta
from mandatometro.coleta.videos import coletar_videos
from mandatometro.db.modelos import VideoSessao, Votacao, Voto

SESSOES = range(1, 21)


def _eventos(roteiro):
    detalhe = roteiro["/votacoes/2236186-60"]["dados"]
    votos = roteiro["/votacoes/2236186-60/votos"]["dados"][:1]
    evento = roteiro["/eventos/83057"]["dados"]
    itens = roteiro["/votacoes"]["dados"] = []
    for codigo in [*SESSOES, None]:
        externo = f"2236186-{codigo or 21}"
        item = {**detalhe, "id": externo, "idEvento": codigo}
        itens.append(item)
        roteiro[f"/votacoes/{externo}"] = {"dados": item}
        roteiro[f"/votacoes/{externo}/votos"] = {"dados": votos, "links": []}
        if codigo is not None:
            roteiro[f"/eventos/{codigo}"] = {"dados": {**evento, "id": codigo}}
    return roteiro


def _encontros(respostas):
    detalhe = respostas["/votacao"][0]
    plenario = respostas["/plenario/encontro/594169"]["ServicoPlenario"]
    encontro = plenario["encontros"]["encontro"][0]
    itens = respostas["/votacao"] = []
    for codigo in [*SESSOES, None]:
        itens.append(
            {
                **detalhe,
                "codigoSessaoVotacao": codigo or 21,
                "codigoSessao": codigo,
                "votos": detalhe["votos"][:1],
            }
        )
        if codigo is not None:
            respostas[f"/plenario/encontro/{codigo}"] = {
                "ServicoPlenario": {"encontros": {"encontro": {**encontro, "codigo": codigo}}}
            }
    return respostas


@pytest.mark.parametrize("casa", ["camara", "senado"])
@pytest.mark.parametrize(
    "tempo_coleta, tempo_videos, tentativas, falhas",
    [(0, 186, 6, 2), (1490, 10, 1, 1), (1500, 0, 0, 0)],
    ids=["duas-falhas", "prazo-na-consulta", "prazo-sem-consulta"],
)
def test_cli_limita_videos_e_recupera_sessoes_pendentes(
    casa,
    tempo_coleta,
    tempo_videos,
    tentativas,
    falhas,
    roteiro,
    respostas,
    sessao,
    monkeypatch,
    capsys,
    caplog,
):
    conexao = sessao.connection()

    def abrir():
        return Session(bind=conexao, join_transaction_mode="create_savepoint")

    if casa == "camara":
        modulo, rota_lista, rota_video = camara, "/votacoes", "/eventos/"
        rotas = _eventos(roteiro)
        monkeypatch.setattr(camara, "sessao_do_banco", abrir)
    else:
        modulo, rota_lista, rota_video = senado, "/votacao", "/plenario/encontro/"
        rotas = _encontros(respostas)
        monkeypatch.setattr(senado, "sessao", abrir)
        monkeypatch.setattr(senado, "coletar", partial(senado.coletar, abrir_sessao=abrir))
    prefixo = httpx2.URL(modulo.BASE).path

    agora = 0.0
    fonte_fora = True
    consultadas = []

    def avancar(segundos):
        nonlocal agora
        agora += segundos

    monkeypatch.setattr(time, "monotonic", lambda: agora)
    monkeypatch.setattr(time, "sleep", avancar)

    def atender(req):
        if req.url.path == "/robots.txt":
            return httpx2.Response(200, text="User-agent: *\nDisallow:")
        caminho = req.url.path.removeprefix(prefixo)
        if fonte_fora and caminho == rota_lista:
            avancar(tempo_coleta)
        if caminho.startswith(rota_video):
            consultadas.append(int(caminho.removeprefix(rota_video)))
            if fonte_fora:
                avancar(req.extensions["timeout"]["read"])
                raise httpx2.ReadTimeout("Conteúdo privado de teste.", request=req)
        return httpx2.Response(200, json=rotas[caminho])

    args = ["coleta", casa, "--inicio", "2026-10-01", "--fim", "2026-11-07"]
    consulta_votacoes = select(Votacao.id, Votacao.fonte_id)
    consulta_votos = select(Voto.votacao_id, Voto.parlamentar_id, Voto.valor, Voto.fonte_id)
    with httpx2.Client(transport=httpx2.MockTransport(atender)) as transporte:
        monkeypatch.setattr(
            modulo,
            "ClienteHttp",
            lambda base: nullcontext(ClienteHttp(base, cliente=transporte, intervalo=0)),
        )
        assert main(args) == 0
        saida = capsys.readouterr().out
        resumo = json.loads(saida)

        assert (resumo["duracao_s"] - tempo_coleta, len(consultadas)) == (tempo_videos, tentativas)
        assert resumo["completa"] and resumo["votacoes"] == 21
        assert list(dict.fromkeys(consultadas)) == list(SESSOES)[:falhas]
        assert resumo["videos"]["falhas_sessoes"] == falhas
        assert resumo["videos"]["sessoes_nao_consultadas"] == len(SESSOES) - falhas
        assert resumo["videos"]["votacoes_sem_sessao"] == 1
        assert "Conteúdo privado de teste." not in saida + caplog.text
        assert sessao.scalars(select(VideoSessao.id)).all() == []
        votacoes = set(sessao.execute(consulta_votacoes))
        votos = set(sessao.execute(consulta_votos))
        assert len(votacoes) == 21
        assert len(votos) == resumo["votos"] == 21

        consultadas.clear()
        fonte_fora = False
        assert main([*args, "--somente-videos"]) == 0
        recuperacao = json.loads(capsys.readouterr().out)

    assert sorted(consultadas) == list(SESSOES)
    assert recuperacao["videos"]["sessoes_nao_consultadas"] == 0
    assert recuperacao["videos"]["votacoes_com_video"] == len(SESSOES)
    assert sessao.scalars(
        select(VideoSessao.id_externo).order_by(VideoSessao.id_externo)
    ).all() == list(SESSOES)
    assert set(sessao.execute(consulta_votacoes)) == votacoes
    assert set(sessao.execute(consulta_votos)) == votos


def test_prazo_de_quatro_minutos_limita_consultas_com_falhas_definitivas(monkeypatch):
    agora = 0.0
    monkeypatch.setattr(time, "monotonic", lambda: agora)

    def atender(req):
        nonlocal agora
        if req.url.path == "/robots.txt":
            return httpx2.Response(200, text="User-agent: *\nDisallow:")
        assert req.extensions["timeout"]["read"] >= 16
        agora += 16
        return httpx2.Response(404)

    dia = date(2026, 11, 5)
    resumo = ResumoColeta("camara", dia, dia)
    with httpx2.Client(transport=httpx2.MockTransport(atender)) as transporte:
        http = ClienteHttp(camara.BASE, cliente=transporte, intervalo=0)
        coletar_videos(
            resumo,
            {codigo: [codigo] for codigo in SESSOES},
            http=http,
            abrir_sessao=lambda: pytest.fail("Sem vídeo para gravar."),
            consultar=camara._video_evento,
            comeco_coleta=agora,
        )

    assert agora == 240
    assert resumo.videos.falhas_sessoes == 15
    assert resumo.videos.sessoes_nao_consultadas == 5
