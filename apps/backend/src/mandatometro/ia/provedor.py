"""Clientes síncronos do redator, abertos só para o comando de rascunho."""

import json
import logging
import os
from collections.abc import Iterator
from contextlib import ExitStack, contextmanager
from typing import TYPE_CHECKING, get_args

import httpx2

from mandatometro.config import Config
from mandatometro.ia.esquemas import Redacao
from mandatometro.ia.redacao import Redator, RespostaRedator

if TYPE_CHECKING:
    from anthropic import Anthropic


class ConfiguracaoRedatorInvalida(ValueError):
    pass


class FalhaRedator(RuntimeError):
    def __init__(self):
        super().__init__("Falha no serviço de redação.")


class RedatorAnthropic:
    def __init__(self, cliente: "Anthropic", modelo: str):
        from anthropic import transform_schema

        self._cliente = cliente
        self._modelo = modelo
        self._formato = {"type": "json_schema", "schema": transform_schema(Redacao)}

    def escrever(self, entrada: dict) -> RespostaRedator:
        from anthropic.types import StopReason

        try:
            mensagem = self._cliente.messages.create(
                model=self._modelo,
                max_tokens=16000,
                system=entrada["regras"],
                messages=[
                    {"role": "user", "content": json.dumps(entrada["fatos"], ensure_ascii=False)}
                ],
                output_config={"format": self._formato},
            )
        except json.JSONDecodeError:
            # Até o envelope HTTP 200 pode vir com JSON inválido.
            return RespostaRedator({})
        except KeyboardInterrupt:
            erro = KeyboardInterrupt()
        except Exception:
            erro = FalhaRedator()
        else:
            motivo = getattr(mensagem, "stop_reason", None)
            if motivo != "end_turn":
                parada = motivo if motivo in get_args(StopReason) else "desconhecido"
                return RespostaRedator({}, parada)
            try:
                (bloco_final,) = (
                    bloco
                    for bloco in mensagem.content
                    if bloco.type not in ("thinking", "redacted_thinking")
                )
                if bloco_final.type != "text":
                    return RespostaRedator({})
                conteudo = json.loads(bloco_final.text)
            except (AttributeError, TypeError, ValueError, RecursionError):
                return RespostaRedator({})
            return RespostaRedator(conteudo if isinstance(conteudo, dict) else {})
        # Fora do except, a falha e a interrupção saem sem a cadeia privada do SDK.
        raise erro


def _cliente_anthropic(http: httpx2.Client, chave: str) -> "Anthropic":
    # O import configura o logging pelo ambiente. O construtor mescla os
    # cabeçalhos do ambiente mesmo quando recebe default_headers explícito.
    variaveis = ("ANTHROPIC_LOG", "ANTHROPIC_CUSTOM_HEADERS")
    anteriores = {nome: os.environ[nome] for nome in variaveis if nome in os.environ}
    try:
        for nome in variaveis:
            os.environ.pop(nome, None)

        from anthropic import Anthropic

        return Anthropic(
            api_key=chave,
            base_url="https://api.anthropic.com",
            http_client=http,
            timeout=60.0,
            max_retries=1,
            open_telemetry={"traces": False, "propagation": False},
        )
    finally:
        # No Windows, reatribuir "" apaga a entrada vazia do ambiente nativo.
        for nome, valor in anteriores.items():
            if os.environ.get(nome) != valor:
                os.environ[nome] = valor


@contextmanager
def abrir_redator(
    conf: Config, *, transporte: httpx2.BaseTransport | None = None
) -> Iterator[Redator | None]:
    provedor = (conf.llm_provider or "").strip()
    if not provedor:
        yield None
        return
    modelo = (conf.llm_model or "").strip()
    chave = conf.llm_api_key.get_secret_value().strip() if conf.llm_api_key else ""
    if provedor != "anthropic" or not modelo or not chave:
        raise ConfiguracaoRedatorInvalida("Confira LLM_PROVIDER, LLM_MODEL e LLM_API_KEY.")

    with ExitStack() as recursos:
        anterior = logging.root.manager.disable
        recursos.callback(logging.disable, anterior)
        logging.disable(max(anterior, logging.CRITICAL))
        try:
            http = recursos.enter_context(
                httpx2.Client(transport=transporte, follow_redirects=False)
            )
            redator = RedatorAnthropic(_cliente_anthropic(http, chave), modelo)
        except Exception:
            # A exceção de abertura pode conter credenciais. Descarte também a cadeia.
            pass
        else:
            yield redator
            return
        raise FalhaRedator()
