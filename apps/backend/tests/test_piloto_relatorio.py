"""Cálculos e supressão: só totais inventados, sem registros de pessoas."""

import pytest

from mandatometro.piloto import VERSAO_QUIZ
from mandatometro.piloto.relatorio import Totais, resumir


def test_base_vazia_tem_contagens_zero_e_medias_ausentes():
    resumo = resumir(VERSAO_QUIZ, Totais())
    assert resumo["tentativas"] == {"antes": 0, "depois": 0, "total": 0}
    assert resumo["participacoes"]["total"] == 0
    assert resumo["medias"]["antes"] == {
        "quantidade": 0,
        "acertos": None,
        "percentual": None,
        "situacao": "sem_respostas",
    }
    assert resumo["pares"]["diferenca_acertos"] is None


def test_mesmos_pares_tem_ganho_e_percentuais_com_denominador_explicito():
    resumo = resumir(VERSAO_QUIZ, Totais(5, 5, 5, 15, 25, 15, 25))
    assert resumo["versao_quiz"] == VERSAO_QUIZ
    assert resumo["total_perguntas"] == 12
    assert resumo["tentativas"] == {"antes": 5, "depois": 5, "total": 10}
    assert resumo["participacoes"] == {
        "antes": 5,
        "depois": 5,
        "total": 5,
        "pareadas": 5,
        "somente_antes": 0,
        "somente_depois": 0,
    }
    assert resumo["medias"]["antes"]["acertos"] == 3
    assert resumo["medias"]["depois"]["percentual"] == 41.67
    assert resumo["pares"] == {
        "quantidade": 5,
        "antes": {"acertos": 3, "percentual": 25},
        "depois": {"acertos": 5, "percentual": 41.67},
        "diferenca_acertos": 2,
        "diferenca_pontos_percentuais": 16.67,
        "situacao": "disponivel",
    }


def test_codigos_distintos_por_etapa_nao_sao_contados_como_pessoas_pareadas():
    resumo = resumir(VERSAO_QUIZ, Totais(5, 6, 0, 15, 30))
    assert resumo["participacoes"]["total"] == 11
    assert resumo["participacoes"]["pareadas"] == 0
    assert resumo["medias"]["antes"]["acertos"] == 3
    assert resumo["medias"]["depois"]["acertos"] == 5
    assert resumo["pares"]["diferenca_acertos"] is None


@pytest.mark.parametrize("quantidade", [1, 4])
def test_suprime_medias_e_ganho_de_amostra_pequena(quantidade):
    resumo = resumir(VERSAO_QUIZ, Totais(quantidade, quantidade, quantidade, 12, 12, 12, 12))
    assert resumo["medias"]["antes"]["situacao"] == "amostra_pequena"
    assert resumo["medias"]["antes"]["acertos"] is None
    assert resumo["pares"]["antes"]["acertos"] is None
    assert resumo["pares"]["diferenca_pontos_percentuais"] is None


@pytest.mark.parametrize("restantes", [1, 4])
def test_media_global_nao_permite_deduzir_subgrupo_pequeno(restantes):
    resumo = resumir(VERSAO_QUIZ, Totais(5 + restantes, 10, 5, 30, 60, 15, 25))
    assert resumo["medias"]["antes"]["situacao"] == "protecao_de_subgrupo"
    assert resumo["medias"]["antes"]["acertos"] is None
    assert resumo["medias"]["depois"]["acertos"] == 6
    assert resumo["pares"]["diferenca_acertos"] == 2


def test_pares_pequenos_suprimidos_nao_escondem_medias_globais_maiores():
    resumo = resumir(VERSAO_QUIZ, Totais(6, 6, 4, 30, 36, 20, 24))
    assert resumo["pares"]["situacao"] == "amostra_pequena"
    assert resumo["medias"]["antes"]["acertos"] == 5
    assert resumo["medias"]["depois"]["acertos"] == 6


def test_ganho_negativo_e_percentual_calculado_sem_arredondar_a_media_antes():
    resumo = resumir(VERSAO_QUIZ, Totais(6, 6, 6, 25, 20, 25, 20))
    assert resumo["medias"]["antes"]["percentual"] == 34.72
    assert resumo["pares"]["diferenca_acertos"] == -0.83
    assert resumo["pares"]["diferenca_pontos_percentuais"] == -6.94
