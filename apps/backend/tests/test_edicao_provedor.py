import json
import logging
import os
import subprocess
import sys
import traceback
from unittest.mock import Mock

import httpx2
import pytest
from opentelemetry import baggage, context, trace

from mandatometro.config import Config
from mandatometro.ia.provedor import abrir_redator

MODELO = "claude-opus-5-5"
CHAVE = "chave-ficticia-do-redator"
ENTRADA = {"regras": "Instrução fictícia.", "fatos": {"ementa": "Dado fictício."}}
REDACAO = {"titulo": "Título fictício", "explicacao": ["Um parágrafo fictício."]}


def mensagem(*blocos, motivo="end_turn"):
    return httpx2.Response(
        200,
        json={
            "id": "msg_ficticia",
            "type": "message",
            "role": "assistant",
            "model": MODELO,
            "content": list(blocos),
            "stop_reason": motivo,
            "stop_sequence": None,
            "usage": {"input_tokens": 20, "output_tokens": 10},
        },
    )


def configuracao():
    return Config(_env_file=None, llm_provider="anthropic", llm_model=MODELO, llm_api_key=CHAVE)


def test_provedor_so_com_espacos_mantem_redacao_manual_sem_cliente_http(monkeypatch):
    conf = Config(_env_file=None, llm_provider="   ", llm_model=MODELO, llm_api_key=CHAVE)
    monkeypatch.setattr(httpx2, "Client", lambda **kw: pytest.fail("Não deve abrir cliente HTTP."))
    with abrir_redator(conf) as redator:
        assert redator is None


@pytest.mark.parametrize("construtor", ["httpx2.Client", "anthropic.Anthropic"])
def test_falha_na_abertura_oculta_erro_e_restaura_ambiente(construtor, monkeypatch, caplog, capsys):
    def falhar(**opcoes):
        logging.getLogger(__name__).error("Falha privada")
        raise ValueError("Falha privada " + CHAVE)

    monkeypatch.setattr(construtor, falhar)
    monkeypatch.setenv("ANTHROPIC_LOG", "debug")
    monkeypatch.setenv("ANTHROPIC_CUSTOM_HEADERS", "X-Teste: ficticio")
    transporte = httpx2.MockTransport(lambda p: pytest.fail("Não deve fazer pedido."))
    anterior = logging.root.manager.disable
    try:
        logging.disable(logging.INFO)
        with (
            pytest.raises(RuntimeError, match=r"^Falha no serviço de redação\.$") as erro,
            abrir_redator(configuracao(), transporte=transporte),
        ):
            pytest.fail("O redator não deveria abrir.")
        assert logging.root.manager.disable == logging.INFO
    finally:
        logging.disable(anterior)
    assert erro.value.__cause__ is None and erro.value.__context__ is None
    assert os.environ["ANTHROPIC_LOG"] == "debug"
    assert os.environ["ANTHROPIC_CUSTOM_HEADERS"] == "X-Teste: ficticio"
    saida = capsys.readouterr()
    assert saida.out == saida.err == caplog.text == ""


def test_pedido_usa_so_configuracao_do_projeto_regras_fatos_e_esquema(monkeypatch, caplog, capsys):
    externos = {
        "ANTHROPIC_API_KEY": "chave-de-outra-ferramenta",
        "ANTHROPIC_AUTH_TOKEN": "token-de-outra-ferramenta",
        "ANTHROPIC_BASE_URL": "https://outra-ferramenta.invalid",
        "ANTHROPIC_CUSTOM_HEADERS": (
            "X-Outro-Projeto: pasta-ficticia\nAuthorization: token-externo\n"
            "User-Agent: usuario-ficticio\nX-Stainless-OS: maquina-ficticia"
        ),
    }
    for nome, valor in externos.items():
        monkeypatch.setenv(nome, valor)
    caplog.set_level(logging.DEBUG)
    monkeypatch.setenv("ANTHROPIC_LOG", "debug")
    pedidos = []

    def responder(pedido):
        pedidos.append(pedido)
        return mensagem(
            {"type": "thinking", "thinking": "Raciocínio fictício.", "signature": "ficticia"},
            {"type": "text", "text": json.dumps(REDACAO)},
        )

    with abrir_redator(configuracao(), transporte=httpx2.MockTransport(responder)) as redator:
        resposta = redator.escrever(ENTRADA)

    assert resposta.motivo_parada == "end_turn" and resposta.conteudo == REDACAO
    (pedido,) = pedidos
    assert pedido.method == "POST" and str(pedido.url) == "https://api.anthropic.com/v1/messages"
    assert pedido.headers["authorization"] == f"Bearer {CHAVE}"
    assert pedido.headers["user-agent"] and pedido.headers["x-stainless-os"]
    assert "x-outro-projeto" not in pedido.headers
    for valor in (
        "chave-de-outra",
        "token-de-outra",
        "token-externo",
        "pasta-",
        "usuario-",
        "maquina-",
    ):
        assert all(valor not in v for v in pedido.headers.values())
    assert os.environ["ANTHROPIC_CUSTOM_HEADERS"] == externos["ANTHROPIC_CUSTOM_HEADERS"]
    assert set(pedido.extensions["timeout"].values()) == {60.0}
    corpo = json.loads(pedido.content)
    opcoes = corpo.pop("output_config")
    assert set(opcoes) == {"format"}
    formato = opcoes["format"]
    assert corpo == {
        "model": MODELO,
        "max_tokens": 16000,
        "system": ENTRADA["regras"],
        "messages": [{"role": "user", "content": corpo["messages"][0]["content"]}],
    }
    assert json.loads(corpo["messages"][0]["content"]) == ENTRADA["fatos"]
    assert formato["type"] == "json_schema"
    assert (
        set(formato["schema"]["properties"]) == set(formato["schema"]["required"]) == set(REDACAO)
    )
    assert formato["schema"]["additionalProperties"] is False
    saida = capsys.readouterr()
    rastros = repr(resposta) + caplog.text + saida.out + saida.err
    for marcador in (CHAVE, ENTRADA["regras"], ENTRADA["fatos"]["ementa"], REDACAO["titulo"]):
        assert marcador not in rastros


def test_restabelece_o_log_de_quem_chama_mesmo_no_primeiro_import_do_sdk(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_LOG", "debug")
    programa = """
import logging
import httpx2
from mandatometro.config import Config
from mandatometro.ia.provedor import abrir_redator

conf = Config(_env_file=None, llm_provider="anthropic", llm_model="modelo", llm_api_key="ficticia")
sdk, http = logging.getLogger("anthropic"), logging.getLogger("httpx2")
antes = (sdk.level, http.level, list(logging.root.handlers), logging.root.manager.disable)
with abrir_redator(conf, transporte=httpx2.MockTransport(lambda p: httpx2.Response(400))):
    assert logging.root.manager.disable >= logging.CRITICAL
assert (sdk.level, http.level, logging.root.handlers, logging.root.manager.disable) == antes
"""
    processo = subprocess.run([sys.executable, "-c", programa], capture_output=True, timeout=60)
    assert processo.returncode == 0
    assert processo.stdout == processo.stderr == b""


def test_telemetria_do_ambiente_nao_propaga_contexto_ativo(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_OPEN_TELEMETRY", "true")
    monkeypatch.setenv("ANTHROPIC_OPEN_TELEMETRY_TRACES_CONTENT_MODE", "content")
    monkeypatch.setenv("ANTHROPIC_OPEN_TELEMETRY_TRACES_MAX_CONTENT_BYTES", "128")
    monkeypatch.setenv("ANTHROPIC_OPEN_TELEMETRY_PROPAGATION", "true")
    obter_tracer = Mock(wraps=trace.get_tracer)
    monkeypatch.setattr(trace, "get_tracer", obter_tracer)
    cabecalhos_de_trace = []

    def responder(pedido):
        cabecalhos_de_trace.append(
            {"traceparent", "tracestate", "baggage"}.intersection(pedido.headers)
        )
        return mensagem({"type": "text", "text": json.dumps(REDACAO)})

    span = trace.NonRecordingSpan(
        trace.SpanContext(
            trace_id=1,
            span_id=2,
            is_remote=True,
            trace_state=trace.TraceState([("teste", "local")]),
        )
    )
    token = context.attach(trace.set_span_in_context(span, baggage.set_baggage("teste", "local")))
    try:
        with abrir_redator(configuracao(), transporte=httpx2.MockTransport(responder)) as redator:
            assert redator.escrever(ENTRADA).conteudo == REDACAO
    finally:
        context.detach(token)
    assert cabecalhos_de_trace == [set()]
    obter_tracer.assert_not_called()


def test_ignora_raciocinio_oculto_ao_ler_um_texto_valido():
    def responder(pedido):
        return mensagem(
            {"type": "redacted_thinking", "data": "ficticio"},
            {"type": "text", "text": json.dumps(REDACAO)},
        )

    with abrir_redator(configuracao(), transporte=httpx2.MockTransport(responder)) as redator:
        assert redator.escrever(ENTRADA).conteudo == REDACAO


def test_redirecionamento_307_da_erro_fixo_no_primeiro_pedido():
    destinos = []

    def responder(pedido):
        destinos.append(pedido.url.host)
        if len(destinos) == 1:
            return httpx2.Response(307, headers={"Location": "https://alternativo.invalid/"})
        return mensagem({"type": "text", "text": json.dumps(REDACAO)})

    with (
        abrir_redator(configuracao(), transporte=httpx2.MockTransport(responder)) as redator,
        pytest.raises(RuntimeError, match=r"^Falha no serviço de redação\.$"),
    ):
        redator.escrever(ENTRADA)
    assert destinos == ["api.anthropic.com"]


@pytest.mark.parametrize(
    "motivo",
    [
        "refusal",
        "max_tokens",
        "model_context_window_exceeded",
        "stop_sequence",
        "tool_use",
        "pause_turn",
        None,
        "futuro",
    ],
)
def test_apenas_end_turn_abre_o_texto(motivo):
    pedidos = []

    def responder(pedido):
        pedidos.append(pedido)
        return mensagem({"type": "text", "text": "JSON interrompido {"}, motivo=motivo)

    with abrir_redator(configuracao(), transporte=httpx2.MockTransport(responder)) as redator:
        resposta = redator.escrever(ENTRADA)
    assert resposta.motivo_parada == ("desconhecido" if motivo in (None, "futuro") else motivo)
    assert resposta.conteudo == {}
    assert len(pedidos) == 1


@pytest.mark.parametrize(
    "blocos",
    [
        [],
        [{"type": "text", "text": "{"}],
        [{"type": "text", "text": "[]"}],
        pytest.param(
            [{"type": "desconhecido", "text": json.dumps(REDACAO)}], id="tipo-desconhecido"
        ),
        pytest.param([{"text": json.dumps(REDACAO)}], id="sem-tipo"),
        [{"type": "text", "text": json.dumps(REDACAO)}] * 2,
        [{"type": "thinking", "thinking": "Texto fictício.", "signature": "ficticia"}],
        [
            {"type": "tool_use", "id": "tool_ficticia", "name": "ficticia", "input": {}},
            {"type": "text", "text": json.dumps(REDACAO)},
        ],
    ],
)
def test_formato_invalido_chega_ao_validador_sem_repeticao(blocos):
    pedidos = []

    def responder(pedido):
        pedidos.append(pedido)
        return mensagem(*blocos)

    with abrir_redator(configuracao(), transporte=httpx2.MockTransport(responder)) as redator:
        resposta = redator.escrever(ENTRADA)
    assert resposta.motivo_parada == "end_turn" and resposta.conteudo == {}
    assert len(pedidos) == 1


@pytest.mark.parametrize("primeira", ["timeout", 429])
def test_sdk_repete_uma_vez_e_recupera(primeira):
    pedidos = []

    def responder(pedido):
        pedidos.append(pedido)
        if len(pedidos) == 1:
            if primeira == "timeout":
                raise httpx2.ReadTimeout("Tempo esgotado.")
            return httpx2.Response(primeira, headers={"retry-after-ms": "1"})
        return mensagem({"type": "text", "text": json.dumps(REDACAO)})

    with abrir_redator(configuracao(), transporte=httpx2.MockTransport(responder)) as redator:
        assert redator.escrever(ENTRADA).conteudo == REDACAO
    assert len(pedidos) == 2 and pedidos[0].content == pedidos[1].content


def test_interrupcao_na_espera_apos_timeout_sai_sem_cadeia(monkeypatch):
    responder = Mock(side_effect=httpx2.ReadTimeout(CHAVE))
    esperar = Mock(side_effect=KeyboardInterrupt)
    with (
        pytest.raises(KeyboardInterrupt) as erro,
        abrir_redator(configuracao(), transporte=httpx2.MockTransport(responder)) as redator,
    ):
        monkeypatch.setattr("time.sleep", esperar)
        redator.escrever(ENTRADA)

    responder.assert_called_once()
    esperar.assert_called_once()
    assert erro.value.__context__ is None and erro.value.__cause__ is None
    assert CHAVE not in repr(erro.value)
    assert CHAVE not in "".join(traceback.format_exception(erro.value))


@pytest.mark.parametrize(("falha", "tentativas"), [(400, 1), (503, 2), ("timeout", 2)])
def test_falha_entrega_so_erro_fixo_e_restaura_registros(
    falha, tentativas, monkeypatch, caplog, capsys
):
    pedidos = []
    anterior = logging.root.manager.disable
    for nome in ("anthropic", "httpx2", "httpcore2"):
        caplog.set_level(logging.DEBUG, logger=nome)
    monkeypatch.setenv("ANTHROPIC_LOG", "debug")

    def responder(pedido):
        pedidos.append(pedido)
        if falha == "timeout":
            raise httpx2.ReadTimeout("Falha privada " + CHAVE)
        return httpx2.Response(
            falha,
            json={"error": {"message": "Falha privada " + CHAVE}},
            headers={"retry-after-ms": "1"},
        )

    conf = configuracao()
    with (
        pytest.raises(RuntimeError, match=r"^Falha no serviço de redação\.$") as erro,
        abrir_redator(conf, transporte=httpx2.MockTransport(responder)) as redator,
    ):
        redator.escrever(ENTRADA)

    assert len(pedidos) == tentativas and logging.root.manager.disable == anterior
    assert erro.value.__context__ is None and erro.value.__cause__ is None
    saida = capsys.readouterr()
    rastros = repr(conf) + repr(redator) + repr(erro.value) + caplog.text + saida.out + saida.err
    for marcador in (CHAVE, "Falha privada", ENTRADA["regras"], ENTRADA["fatos"]["ementa"]):
        assert marcador not in rastros
