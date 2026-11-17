"""Clientes síncronos do redator, abertos só para o comando de rascunho."""

import json
import logging
import os
from collections.abc import Iterator
from contextlib import contextmanager
from typing import TYPE_CHECKING, get_args

import httpx2

from mandatometro.config import Config
from mandatometro.ia.esquemas import Redacao
from mandatometro.ia.redacao import Redator, RespostaRedator

if TYPE_CHECKING:
    from anthropic import Anthropic


class ConfiguracaoRedatorInvalida(ValueError):
    pass


class RedatorAnthropic:
    def __init__(self, cliente: "Anthropic", modelo: str):
        from anthropic import transform_schema

        self._cliente = cliente
        self._modelo = modelo
        self._formato = {"type": "json_schema", "schema": transform_schema(Redacao)}

    def escrever(self, entrada: dict) -> RespostaRedator:
        from anthropic.types import RedactedThinkingBlock, StopReason, TextBlock, ThinkingBlock

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
        except Exception:
            # Fora do except, a exceção pública também fica sem __context__ do SDK.
            pass
        else:
            motivo = getattr(mensagem, "stop_reason", None)
            if motivo != "end_turn":
                parada = motivo if motivo in get_args(StopReason) else "desconhecido"
                return RespostaRedator({}, parada)
            try:
                (bloco_final,) = (
                    bloco
                    for bloco in mensagem.content
                    if not isinstance(bloco, (ThinkingBlock, RedactedThinkingBlock))
                )
                if not isinstance(bloco_final, TextBlock):
                    return RespostaRedator({})
                conteudo = json.loads(bloco_final.text)
            except (AttributeError, TypeError, ValueError, RecursionError):
                return RespostaRedator({})
            return RespostaRedator(conteudo if isinstance(conteudo, dict) else {})
        raise RuntimeError("Falha no serviço de redação.")


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

    anterior = logging.root.manager.disable
    logging.disable(max(anterior, logging.CRITICAL))
    try:
        with httpx2.Client(transport=transporte, follow_redirects=False) as http:
            # O import configura o logging pelo ambiente. O construtor mescla os
            # cabeçalhos do ambiente mesmo quando recebe default_headers explícito.
            nivel_sdk = os.environ.pop("ANTHROPIC_LOG", None)
            cabecalhos = os.environ.pop("ANTHROPIC_CUSTOM_HEADERS", None)
            try:
                from anthropic import Anthropic

                cliente = Anthropic(
                    api_key=chave,
                    base_url="https://api.anthropic.com",
                    http_client=http,
                    timeout=60.0,
                    max_retries=1,
                    open_telemetry={"traces": False, "propagation": False},
                )
            finally:
                if cabecalhos is not None:
                    os.environ["ANTHROPIC_CUSTOM_HEADERS"] = cabecalhos
                if nivel_sdk is not None:
                    os.environ["ANTHROPIC_LOG"] = nivel_sdk
            yield RedatorAnthropic(cliente, modelo)
    finally:
        logging.disable(anterior)
