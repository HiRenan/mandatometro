import asyncio
import json
from time import monotonic

import httpx2
import pytest

from mandatometro.avisos import resend
from mandatometro.avisos.email import Mensagem
from mandatometro.avisos.resend import EnvioIndisponivel, Resend

ID_ENVIO = "3cc98c59-839e-43bd-b5ce-e380c35bb5c0"
MENSAGEM = Mensagem(
    "Edição de teste", "<p>Teste</p>", "Teste", {"List-Unsubscribe": "<https://example.com/sair>"}
)


def executar(handler, *, chave="chave-ficticia", dormir=None):
    async def sem_espera(_):
        pass

    cliente = Resend(
        chave,
        "Mandatômetro <remetente@example.com>",
        transporte=httpx2.MockTransport(handler),
        dormir=dormir or sem_espera,
    )
    return asyncio.run(cliente.enviar("pessoa@example.com", MENSAGEM, "inscricao/1/edicao/2"))


def test_envio_completo_e_idempotente():
    chamadas = []

    def handler(request):
        chamadas.append(request)
        assert request.url == "https://api.resend.com/emails"
        assert request.headers["user-agent"] == "mandatometro (Hack Brasil 2026)"
        assert request.headers["idempotency-key"] == "inscricao/1/edicao/2"
        assert request.headers["authorization"] == "Bearer chave-ficticia"
        assert json.loads(request.content) == {
            "from": "Mandatômetro <remetente@example.com>",
            "to": ["pessoa@example.com"],
            "subject": MENSAGEM.assunto,
            "html": MENSAGEM.html,
            "text": MENSAGEM.texto,
            "headers": MENSAGEM.cabecalhos,
        }
        return httpx2.Response(200, json={"id": ID_ENVIO})

    assert executar(handler) is None
    assert len(chamadas) == 1


@pytest.mark.parametrize("falha", ["timeout", "500", "429"])
def test_repete_falhas_transitorias_com_mesma_chave_e_corpo(falha):
    chamadas, esperas = [], []

    def handler(request):
        chamadas.append((request.headers["idempotency-key"], request.content))
        if len(chamadas) == 1:
            if falha == "timeout":
                raise httpx2.ReadTimeout("Detalhe privado: pessoa@example.com", request=request)
            return httpx2.Response(
                int(falha),
                json={
                    "name": "concurrent_idempotent_requests"
                    if falha == "409"
                    else "rate_limit_exceeded"
                },
                headers={"Retry-After": "1"},
            )
        return httpx2.Response(200, json={"id": ID_ENVIO})

    async def dormir(segundos):
        esperas.append(segundos)

    executar(handler, dormir=dormir)
    assert chamadas[0] == chamadas[1]
    assert len(esperas) == 1
    assert esperas[0] >= (0.5 if falha == "timeout" else 1)


@pytest.mark.parametrize(
    ("status", "nome"),
    [
        (401, "missing_api_key"),
        (400, "validation_error"),
        (409, "invalid_idempotent_request"),
        (429, "daily_quota_exceeded"),
        (429, "monthly_quota_exceeded"),
    ],
)
def test_erro_permanente_nao_repete_nem_expoe_o_provedor(status, nome, caplog):
    chamadas = []

    def handler(request):
        chamadas.append(request)
        return httpx2.Response(status, json={"name": nome, "message": "pessoa@example.com"})

    with pytest.raises(EnvioIndisponivel) as erro:
        executar(handler)
    assert len(chamadas) == 1
    assert "pessoa@example.com" not in str(erro.value) + caplog.text


def test_sem_chave_nao_chama_a_rede():
    def handler(_):
        pytest.fail("Não deveria chamar a rede.")

    with pytest.raises(EnvioIndisponivel):
        executar(handler, chave=None)


def test_exaure_no_maximo_tres_tentativas():
    chamadas = []

    def handler(request):
        chamadas.append(request)
        return httpx2.Response(503, json={"name": "service_unavailable"})

    with pytest.raises(EnvioIndisponivel):
        executar(handler)
    assert len(chamadas) == 3


def test_retry_after_maior_que_o_orcamento_nao_dorme_nem_repete():
    chamadas = []

    def handler(request):
        chamadas.append(request)
        return httpx2.Response(429, headers={"Retry-After": "60"})

    async def dormir(_):
        pytest.fail("Não deve ultrapassar o orçamento esperando o Retry-After.")

    with pytest.raises(EnvioIndisponivel):
        executar(handler, dormir=dormir)
    assert len(chamadas) == 1


def test_orcamento_total_cancela_uma_chamada_presa(monkeypatch):
    assert resend.ORCAMENTO_ENVIO == 8
    monkeypatch.setattr(resend, "ORCAMENTO_ENVIO", 0.03)

    async def handler(_):
        await asyncio.sleep(60)
        pytest.fail("A chamada deveria ter sido cancelada.")

    inicio = monotonic()
    with pytest.raises(EnvioIndisponivel):
        executar(handler)
    assert monotonic() - inicio < 1


@pytest.mark.parametrize("corpo", [{}, {"id": None}, ["resposta inválida"]])
def test_resposta_sem_id_nao_confirma_envio(corpo):
    with pytest.raises(EnvioIndisponivel):
        executar(lambda _: httpx2.Response(200, json=corpo))


@pytest.mark.parametrize(
    "status,nome,motivo",
    [
        (400, "validation_error", "individual"),
        (401, "missing_api_key", "geral"),
        (403, "validation_error", "geral"),
        (409, "concurrent_idempotent_requests", "concorrente"),
        (409, "invalid_idempotent_request", "individual"),
        (429, "daily_quota_exceeded", "cota_diaria"),
        (429, "monthly_quota_exceeded", "cota_mensal"),
    ],
)
def test_categoria_segura_permite_continuar_ou_parar_rodada(status, nome, motivo):
    chamadas = []

    def handler(request):
        chamadas.append(request)
        return httpx2.Response(status, json={"name": nome, "message": "pessoa@example.com"})

    with pytest.raises(EnvioIndisponivel) as erro:
        executar(handler)
    assert erro.value.motivo == motivo
    assert len(chamadas) == 1
    assert "pessoa@example.com" not in str(erro.value)


@pytest.mark.parametrize(
    "status,nome,mensagem",
    [
        (400, "validation_error", "API key is invalid"),
        (400, "validation_error", " \tApI KeY IS INVALID\n"),
        (422, "missing_required_field", "Campo ausente: pessoa@example.com"),
    ],
)
def test_validacao_de_configuracao_e_geral_sem_expor_mensagem(status, nome, mensagem, caplog):
    chamadas = []

    def handler(request):
        chamadas.append(request)
        return httpx2.Response(status, json={"name": nome, "message": mensagem})

    with pytest.raises(EnvioIndisponivel) as erro:
        executar(handler)
    assert erro.value.motivo == "geral"
    assert len(chamadas) == 1
    assert str(erro.value) == "Não foi possível confirmar o envio."
    assert erro.value.__cause__ is None and erro.value.__context__ is None
    assert mensagem not in caplog.text


@pytest.mark.parametrize("mensagem", [None, {}, ["API key is invalid"]])
def test_validacao_sem_mensagem_textual_continua_individual(mensagem):
    with pytest.raises(EnvioIndisponivel) as erro:
        executar(
            lambda _: httpx2.Response(400, json={"name": "validation_error", "message": mensagem})
        )
    assert erro.value.motivo == "individual"
