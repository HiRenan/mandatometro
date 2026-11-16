"""Medição do piloto, independente de conta, newsletter e transporte HTTP."""

from typing import Literal

VERSAO_QUIZ = "processo-legislativo-final-v1"
TOTAL_PERGUNTAS = 12
VersaoQuiz = Literal["processo-legislativo-final-v1"]
Etapa = Literal["antes", "depois"]


def conferir_versao(versao: str) -> None:
    if versao != VERSAO_QUIZ:
        raise ValueError("Versão do quiz desconhecida.")
