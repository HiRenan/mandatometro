"""Guardas locais; nenhum valor identificado entra no diagnóstico."""

import re
import unicodedata
from collections.abc import Iterable

TRATAMENTO = re.compile(r"\b(?:dep|sen)\.|\b(?:deputad[oa]s?|senador(?:a|es|as)?)\b")
PARTIDO_UF = re.compile(
    r"\b[a-z][a-z0-9]{1,11}\s*[-/–]\s*"
    r"(?:ac|al|am|ap|ba|ce|df|es|go|ma|mg|ms|mt|pa|pb|pe|pi|pr|rj|rn|ro|rr|rs|sc|se|sp|to)\b"
)
TERMO_PESSOAL = re.compile(
    r"\b(?:licenc\w*|afast\w*|saude|doenc\w*|enfermidades?|internac\w*|"
    r"internad[oa]s?|hospitaliz\w*|cirurgias?|(?:tratamentos?|atestados?)\s+medic[oa]s?)\b"
)
PALAVRA_PARLAMENTAR = re.compile(
    r"\b(?:parlamentar(?:es)?|deputad[oa]s?|senador(?:a|es|as)?|dep|sen|suplentes?|mandatos?)\b"
)
PROPOSICAO_CITADA = re.compile(
    r"\b(?:pl[a-z]{0,2}|pec|mpv?|pd[clsn]|pr[csn])\s*(?:n(?:umero)?[.\s°o]*)?\d"
)
DISTANCIA_PESSOAL = 6


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


def assunto_pessoal(texto: str, nomes: Iterable[str], *, siglas: Iterable[str] = ()) -> bool:
    """Termo pessoal ligado a parlamentar; siglas só vêm dos vínculos da fonte."""
    texto = normalizar(texto)
    if not TERMO_PESSOAL.search(texto):
        return False
    requerimento = any(normalizar(s).startswith(("req", "rq")) for s in siglas) or re.match(
        r"\s*(?:requer|requerimento)\b", texto
    )
    if requerimento and not PROPOSICAO_CITADA.search(texto):
        return True

    # O nome da Casa não identifica parlamentar. Mantém a contagem de três palavras,
    # sem mudar a guarda mais ampla de identificacao usada na entrada do redator.
    texto = re.sub(r"\bcamara\s+dos\s+deputados\b", "casa legislativa federal", texto)
    # Abreviações não encerram a frase; quebras de linha encerram o contexto.
    texto = re.sub(r"\b(dep|sen|art|arts)\.", r"\1", texto)
    sinais = [PALAVRA_PARLAMENTAR, PARTIDO_UF]
    sinais.extend(
        re.compile(r"(?<!\w)" + re.escape(normalizar(nome)) + r"(?!\w)")
        for nome in nomes
        if len(nome.split()) >= 2
    )
    for frase in re.split(r"[.!?\r\n]+", texto):
        termos = list(TERMO_PESSOAL.finditer(frase))
        if not termos:
            continue
        for padrao in sinais:
            for sinal in padrao.finditer(frase):
                for termo in termos:
                    antes, depois = sorted((termo, sinal), key=lambda m: m.start())
                    intervalo = frase[antes.end() : depois.start()]
                    if len(re.findall(r"\w+", intervalo)) <= DISTANCIA_PESSOAL:
                        return True
    return False
