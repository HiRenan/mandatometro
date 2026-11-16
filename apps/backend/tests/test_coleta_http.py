"""O transporte da coleta, sem rede e sem esperas reais."""

import json
from pathlib import Path

import httpx2
import pytest

from mandatometro.coleta.http import ClienteHttp, ErroColeta

BASE = "https://dadosabertos.camara.leg.br/api/v2"


def cliente(handler):
    return ClienteHttp(
        BASE, cliente=httpx2.Client(transport=httpx2.MockTransport(handler)), intervalo=0
    )


def test_utf8_headers_timeout_e_uma_consulta_a_robots():
    requisicoes = []

    def atender(req):
        requisicoes.append(req)
        if req.url.path == "/robots.txt":
            return httpx2.Response(200, text="User-agent: *\nAllow: /\n")
        return httpx2.Response(200, content='{"dados": ["Não", "Abstenção"]}'.encode())

    with cliente(atender) as http:
        resposta = http.obter_json("/votos", params={"itens": 100})
        http.obter_json("/votos")
        assert http.chamadas == 3
    assert resposta.dados == {"dados": ["Não", "Abstenção"]}
    assert resposta.url == BASE + "/votos?itens=100"
    assert resposta.coletado_em.tzinfo is not None
    assert [r.url.path for r in requisicoes].count("/robots.txt") == 1
    for req in requisicoes:
        assert req.headers["user-agent"] == "mandatometro (Hack Brasil 2026)"
        assert req.extensions["timeout"]["read"] == 30
    assert requisicoes[1].headers["accept"] == "application/json"


@pytest.mark.parametrize(
    "status,corpo", [(200, "<html>não encontrado</html>"), (403, ""), (404, "")]
)
def test_robots_indisponivel_permite_a_api(status, corpo):
    def atender(req):
        if req.url.path == "/robots.txt":
            return httpx2.Response(status, text=corpo)
        return httpx2.Response(200, json=[])

    assert cliente(atender).obter_json("/votos").dados == []


def test_robots_proibe_sem_consultar_a_api():
    caminhos = []

    def atender(req):
        caminhos.append(req.url.path)
        return httpx2.Response(200, text="User-agent: mandatometro\nDisallow: /api/\n")

    with pytest.raises(ErroColeta, match="robots"):
        cliente(atender).obter_json("/votos")
    assert caminhos == ["/robots.txt"]


def test_504_e_timeout_recebem_backoff(monkeypatch):
    pausas = []
    monkeypatch.setattr("mandatometro.coleta.http.time.sleep", pausas.append)
    tentativas = 0

    def atender(req):
        nonlocal tentativas
        if req.url.path == "/robots.txt":
            return httpx2.Response(404)
        tentativas += 1
        if tentativas == 1:
            raise httpx2.ReadTimeout("corpo que nunca pode ir ao log")
        return httpx2.Response(504) if tentativas == 2 else httpx2.Response(200, json=[])

    http = cliente(atender)
    assert http.obter_json("/votos").dados == []
    assert pausas == [1, 2]
    assert (http.chamadas, http.tentativas_extras) == (4, 2)


def test_robots_5xx_esgota_tentativas_sem_acessar_api(monkeypatch):
    monkeypatch.setattr("mandatometro.coleta.http.time.sleep", lambda _: None)
    caminhos = []

    def atender(req):
        caminhos.append(req.url.path)
        return httpx2.Response(503, text="conteúdo privado")

    with pytest.raises(ErroColeta) as erro:
        cliente(atender).obter_json("/votos")
    assert caminhos == ["/robots.txt"] * 3
    assert "privado" not in str(erro.value)


def test_retry_after_e_limite_de_espera(monkeypatch):
    pausas = []
    monkeypatch.setattr("mandatometro.coleta.http.time.sleep", pausas.append)
    tentativas = 0

    def atender(req):
        nonlocal tentativas
        if req.url.path == "/robots.txt":
            return httpx2.Response(404)
        tentativas += 1
        if tentativas == 1:
            return httpx2.Response(429, headers={"Retry-After": "5"})
        return httpx2.Response(429, headers={"Retry-After": "120"})

    with pytest.raises(ErroColeta, match="espera"):
        cliente(atender).obter_json("/votos")
    assert pausas == [5]
    assert tentativas == 2


def test_erro_permanente_e_json_invalido_nao_vazam_resposta():
    for status in (400, 403, 200):

        def atender(req, status=status):
            if req.url.path == "/robots.txt":
                return httpx2.Response(404)
            return httpx2.Response(status, content=b"dado pessoal inventado: SEGREDO")

        http = cliente(atender)
        with pytest.raises(ErroColeta) as erro:
            http.obter_json("/votos")
        assert "SEGREDO" not in str(erro.value)
        assert http.chamadas == 2


def test_link_de_paginacao_nao_pode_sair_da_base():
    with pytest.raises(ErroColeta):
        cliente(lambda _: pytest.fail("não deve fazer HTTP")).obter_json(
            "https://outro.example/api"
        )


def test_crawl_delay_e_request_rate_sao_respeitados(monkeypatch):
    pausas = []
    monkeypatch.setattr("mandatometro.coleta.http.time.sleep", pausas.append)
    monkeypatch.setattr("mandatometro.coleta.http.time.monotonic", lambda: 10.0)

    def atender(req):
        if req.url.path == "/robots.txt":
            return httpx2.Response(200, text="User-agent: *\nCrawl-delay: 2\nRequest-rate: 1/3\n")
        return httpx2.Response(200, json=[])

    cliente(atender).obter_json("/votos")
    assert pausas == [3]


def test_redirecionamento_respeita_robots():
    caminhos = []

    def atender(req):
        caminhos.append(req.url.path)
        if req.url.path == "/robots.txt":
            return httpx2.Response(200, text="User-agent: *\nDisallow: /api/v2/vedado\n")
        return httpx2.Response(302, headers={"Location": "/api/v2/vedado"})

    with pytest.raises(ErroColeta, match="robots"):
        cliente(atender).obter_json("/votos")
    assert caminhos == ["/robots.txt", "/api/v2/votos"]


def test_senado_aceita_json_sem_envelope_e_caminho_com_sufixo():
    fixture = Path(__file__).parent / "fixtures/senado/votacao-2026-11-03_2026-11-07.json"
    dados = json.loads(fixture.read_text(encoding="utf-8"))
    caminhos = []

    def atender(req):
        caminhos.append(req.url.path)
        if req.url.path == "/robots.txt":
            return httpx2.Response(403)
        assert req.headers["accept"] == "application/json"
        return httpx2.Response(200, json=dados)

    http = ClienteHttp(
        "https://legis.senado.leg.br/dadosabertos",
        cliente=httpx2.Client(transport=httpx2.MockTransport(atender)),
        intervalo=0,
    )
    assert http.obter_json("/votacao").dados == dados
    http.obter_json("/senador/lista/atual.json")
    assert caminhos[-1] == "/dadosabertos/senador/lista/atual.json"
