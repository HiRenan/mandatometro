"""Guardas locais; nenhum valor identificado entra no diagnóstico."""

import re
import unicodedata
from collections.abc import Iterable

TRATAMENTO = re.compile(r"\b(?:dep|sen)\.|\b(?:deputad[oa]s?|senador(?:a|es|as)?)\b")
PARTIDO_UF = re.compile(
    r"\b[a-z][a-z0-9]{1,11}\s*[-/–]\s*"
    r"(?:ac|al|am|ap|ba|ce|df|es|go|ma|mg|ms|mt|pa|pb|pe|pi|pr|rj|rn|ro|rr|rs|sc|se|sp|to)\b"
)


def normalizar(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", texto.casefold()) if not unicodedata.combining(c)
    )


def identificacao(texto: str, nomes: Iterable[str]) -> bool:
    texto = normalizar(texto)
    if TRATAMENTO.search(texto) or PARTIDO_UF.search(texto):
        return True
    return any(
        re.search(r"(?<!\w)" + re.escape(normalizar(nome)) + r"(?!\w)", texto)
        for nome in nomes
        if len(nome.split()) >= 2
    )


def assunto_pessoal(texto: str, nomes: Iterable[str]) -> bool:
    texto = normalizar(texto)
    if re.search(r"\b(?:licencas?|licenciad[oa]s?|afastamentos?)\b", texto):
        return True
    return bool(
        re.search(r"\bsaude\b", texto)
        and (re.search(r"\bparlamentar(?:es)?\b", texto) or identificacao(texto, nomes))
    )
