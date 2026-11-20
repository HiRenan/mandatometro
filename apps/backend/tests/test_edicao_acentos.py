import pytest

from mandatometro.ia.servico import _tem_acento_quebrado


@pytest.mark.parametrize(
    "texto",
    [
        "gest?o",
        "aç?o",
        "a?érea",
        "?poca",
        "Uma ?poca fictícia.",
        "Uma\n?poca fictícia.",
        "Uma\t?poca fictícia.",
        'A palavra "?poca".',
        "Uma (?poca) fictícia.",
        "ela ? a autora",
        "? a autora",
        "ela ?",
        "?",
        "ela\n?\na autora",
        "ela\t?\ta autora",
        "gest\ufffdo",
        "gestÃ£o",
        "espaçoÂ\u00a0fictício",
        "Ã\u0080",
        "Ã\u00bf",
        "Â\u0080",
        "Â\u00bf",
        "NÃƒO",
        "Ã‰ regra do projeto.",
        "A EXPLICAÃ‡ÃƒO ORGANIZA A IDEIA.",
        "Congresso â€” resumo fictício.",
    ],
)
def test_detecta_acento_quebrado(texto):
    assert _tem_acento_quebrado(texto)


@pytest.mark.parametrize(
    "texto",
    [
        "Quem lê?",
        "Quem lê? Outra frase.",
        "Quem lê?\nOutra frase.",
        "Quem lê?\tOutra frase.",
        '"Quem lê?"',
        "“Quem lê?”",
        "(Quem lê?)",
        "Quem lê?!",
        "Quem lê?; outra frase.",
        "Quem lê? — outra frase.",
        "NÃO",
        "SÃO",
        "ÂNGULO",
        "É regra do projeto.",
        "A EXPLICAÇÃO ORGANIZA A IDEIA.",
        "Congresso — resumo fictício.",
        "Texto fictício com ação, época, órgão e ângulo.",
        "Ã",
        "Â",
        "Ã\u007f Â\u007f",
        "ÃÀ ÂÀ",
        "",
    ],
)
def test_aceita_pergunta_e_acentos_validos(texto):
    assert not _tem_acento_quebrado(texto)


@pytest.mark.parametrize("caractere", "àáâãçéêíóôõúüÀÁÂÃÇÉÊÍÓÔÕÚÜ—–“”‘’…•")
def test_acentos_e_pontuacao_lidos_como_windows_1252(caractere):
    original = f"Um exemplo com x{caractere}x."
    # O .NET preserva o ponto de código dos cinco bytes indefinidos no Windows-1252.
    indefinidos = {0x81, 0x8D, 0x8F, 0x90, 0x9D}
    quebrado = "".join(
        chr(byte) if byte in indefinidos else bytes([byte]).decode("cp1252")
        for byte in original.encode("utf-8")
    )

    assert not _tem_acento_quebrado(original)
    assert _tem_acento_quebrado(quebrado)
