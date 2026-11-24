"""A etapa opcional pelo CLI das duas Casas, com relógio simulado e sem rede."""

import asyncio
import json
import ssl
import time
from datetime import date
from functools import partial

import anyio
import httpcore2
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


class _Stream503(httpcore2.AsyncMockStream):
    async def read(self, max_bytes, timeout=None):
        bloco = await super().read(max_bytes, timeout)
        if bloco == b"x":
            await asyncio.sleep(9)
        return bloco


class _Backend503(httpcore2.AsyncMockBackend):
    async def connect_tcp(self, *args, **kwargs):
        return _Stream503(
            [b"HTTP/1.1 503 Service Unavailable\r\nContent-Length: 36\r\nConnection: close\r\n\r\n"]
            + [b"x"] * 36
        )


class _Transporte503(httpx2.AsyncHTTPTransport):
    def __init__(self):
        self._pool = httpcore2.AsyncConnectionPool(network_backend=_Backend503([]))


class _StreamTLS:
    def __init__(self):
        self.client_hello = []
        self.fechamentos = []

    async def send(self, item):
        self.client_hello.append(time.monotonic())

    async def receive(self, max_bytes=65536):
        await asyncio.sleep(60)
        pytest.fail("O handshake ainda deveria estar esperando a resposta.")

    async def aclose(self):
        self.fechamentos.append(time.monotonic())


def _simular_esperas_assincronas(monkeypatch, avancar):
    def criar_loop():
        loop = asyncio.SelectorEventLoop()
        selecionar = loop._selector.select

        def selecionar_sem_esperar(timeout=None):
            assert timeout is not None
            avancar(timeout)
            return selecionar(0)

        monkeypatch.setattr(loop._selector, "select", selecionar_sem_esperar)
        return loop

    monkeypatch.setattr(asyncio, "new_event_loop", criar_loop)


def test_prazo_durante_tls_fecha_tcp_antes_de_voltar_ao_laco(monkeypatch):
    agora = 1498.0

    def avancar(segundos):
        nonlocal agora
        agora += segundos

    monkeypatch.setattr(time, "monotonic", lambda: agora)
    _simular_esperas_assincronas(monkeypatch, avancar)
    stream = _StreamTLS()

    async def conectar(**_):
        await asyncio.sleep(1)
        return stream

    monkeypatch.setattr(anyio, "connect_tcp", conectar)
    # O contexto da biblioteca padrão mantém o handshake no loop simulado.
    transporte_tls = httpx2.AsyncHTTPTransport(verify=ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT))

    def atender(req):
        if req.url.path == "/robots.txt":
            return httpx2.Response(200, text="User-agent: *\nAllow: /\n")
        return transporte_tls.handle_async_request(req)

    dia = date(2026, 11, 5)
    resumo = ResumoColeta("camara", dia, dia)
    with ClienteHttp(
        camara.BASE, transporte=httpx2.MockTransport(atender), intervalo=0, timeout=2, tentativas=1
    ) as http:
        coletar_videos(
            resumo,
            {codigo: [codigo] for codigo in SESSOES},
            http=http,
            abrir_sessao=lambda: pytest.fail("Sem vídeo para gravar."),
            consultar=camara._video_evento,
            comeco_coleta=0,
        )
        assert (agora, stream.client_hello, stream.fechamentos) == (1500, [1499], [1500])

    assert stream.fechamentos == [1500]
    assert resumo.videos.falhas_sessoes == 1
    assert resumo.videos.sessoes_nao_consultadas == 19


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
    "cenario, tempo_coleta, tempo_videos, tentativas, falhas",
    [
        pytest.param("timeout", 0, 186, 6, 2, id="duas-falhas"),
        pytest.param("timeout", 1490, 10, 1, 1, id="prazo-na-consulta"),
        pytest.param("timeout", 1500, 0, 0, 0, id="prazo-sem-consulta"),
        pytest.param("corpo-lento", 1490, 10, 1, 1, id="corpo-lento"),
        pytest.param("retry-after", 0, 0, 1, 1, id="retry-after"),
    ],
)
def test_cli_limita_videos_e_recupera_sessoes_pendentes(
    casa,
    cenario,
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
        nome_consulta = "_video_evento"
        rotas = _eventos(roteiro)
        monkeypatch.setattr(camara, "sessao_do_banco", abrir)
    else:
        modulo, rota_lista, rota_video = senado, "/votacao", "/plenario/encontro/"
        nome_consulta = "_video_encontro"
        rotas = _encontros(respostas)
        monkeypatch.setattr(senado, "sessao", abrir)
        monkeypatch.setattr(senado, "coletar", partial(senado.coletar, abrir_sessao=abrir))
    prefixo = httpx2.URL(modulo.BASE).path

    agora = 0.0
    fonte_fora = True
    consultadas = []
    sessoes_avaliadas = []
    consultar = getattr(modulo, nome_consulta)

    def avaliar(http, codigo, prazo):
        sessoes_avaliadas.append(codigo)
        return consultar(http, codigo, prazo)

    monkeypatch.setattr(modulo, nome_consulta, avaliar)

    def avancar(segundos):
        nonlocal agora
        agora += segundos

    monkeypatch.setattr(time, "monotonic", lambda: agora)
    monkeypatch.setattr(time, "sleep", avancar)

    if cenario == "corpo-lento":
        _simular_esperas_assincronas(monkeypatch, avancar)
    lento = _Transporte503()

    def atender(req):
        if req.url.path == "/robots.txt":
            return httpx2.Response(200, text="User-agent: *\nDisallow:")
        caminho = req.url.path.removeprefix(prefixo)
        if fonte_fora and caminho == rota_lista:
            avancar(tempo_coleta)
        if caminho.startswith(rota_video):
            consultadas.append(int(caminho.removeprefix(rota_video)))
            if fonte_fora:
                if cenario == "corpo-lento":
                    return lento.handle_async_request(req)
                if cenario == "retry-after":
                    return httpx2.Response(503, headers={"Retry-After": "120"})
                avancar(req.extensions["timeout"]["read"])
                raise httpx2.ReadTimeout("Conteúdo privado de teste.", request=req)
        return httpx2.Response(200, json=rotas[caminho])

    args = ["coleta", casa, "--inicio", "2026-10-01", "--fim", "2026-11-07"]
    consulta_votacoes = select(Votacao.id, Votacao.fonte_id)
    consulta_votos = select(Voto.votacao_id, Voto.parlamentar_id, Voto.valor, Voto.fonte_id)
    monkeypatch.setattr(
        modulo,
        "ClienteHttp",
        lambda base: ClienteHttp(base, transporte=httpx2.MockTransport(atender), intervalo=0),
    )
    assert main(args) == 0
    saida = capsys.readouterr().out
    resumo = json.loads(saida)

    assert (resumo["duracao_s"], len(consultadas)) == (tempo_coleta + tempo_videos, tentativas)
    assert resumo["completa"] and resumo["votacoes"] == 21
    assert list(dict.fromkeys(consultadas)) == list(SESSOES)[:falhas]
    assert sessoes_avaliadas == list(SESSOES)[: falhas + (cenario == "retry-after")]
    assert (resumo["videos"]["falhas_sessoes"], resumo["videos"]["sessoes_nao_consultadas"]) == (
        falhas,
        len(SESSOES) - falhas,
    )
    assert resumo["videos"]["votacoes_sem_sessao"] == 1
    assert "Conteúdo privado de teste." not in saida + caplog.text
    assert sessao.scalars(select(VideoSessao.id)).all() == []
    votacoes = set(sessao.execute(consulta_votacoes))
    votos = set(sessao.execute(consulta_votos))
    assert len(votacoes) == 21
    assert len(votos) == resumo["votos"] == 21

    if cenario == "retry-after":
        consultadas.clear()
        assert main([*args, "--somente-videos"]) == 1
        incompleto = json.loads(capsys.readouterr().out)
        assert not incompleto["completa"]
        assert len(consultadas) == incompleto["videos"]["falhas_sessoes"] == 1
        assert incompleto["videos"]["sessoes_nao_consultadas"] == len(SESSOES) - 1

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
    with ClienteHttp(camara.BASE, transporte=httpx2.MockTransport(atender), intervalo=0) as http:
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
