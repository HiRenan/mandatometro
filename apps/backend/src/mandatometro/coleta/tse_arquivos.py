"""Leitura dos arquivos do TSE. Os ZIPs temporários são descartados depois do uso."""

import csv
import re
from collections import Counter
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from io import TextIOWrapper
from pathlib import Path
from tempfile import TemporaryFile
from urllib.parse import urlsplit
from zipfile import ZipFile

import httpx2

BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand"
CANDIDATURAS = "consulta_cand"
REDES = "rede_social_candidato"
CARGOS_POR_CASA = {"camara": (6,), "senado": (5, 9, 10)}
CASA_POR_CARGO = {cargo: casa for casa, cargos in CARGOS_POR_CASA.items() for cargo in cargos}
UFS = frozenset(
    [
        "AC",
        "AL",
        "AP",
        "AM",
        "BA",
        "CE",
        "DF",
        "ES",
        "GO",
        "MA",
        "MT",
        "MS",
        "MG",
        "PA",
        "PB",
        "PR",
        "PE",
        "PI",
        "RJ",
        "RN",
        "RS",
        "RO",
        "RR",
        "SC",
        "SP",
        "SE",
        "TO",
    ]
)

_CAMPOS_CANDIDATURAS = {
    "ANO_ELEICAO",
    "CD_ELEICAO",
    "CD_CARGO",
    "SG_UF",
    "SG_PARTIDO",
    "SQ_CANDIDATO",
    "NR_CANDIDATO",
    "NM_URNA_CANDIDATO",
    "NM_CANDIDATO",
    "NR_CPF_CANDIDATO",
    "CD_SIT_TOT_TURNO",
}
_CAMPOS_REDES = {
    "AA_ELEICAO",
    "CD_ELEICAO",
    "SQ_CANDIDATO",
    "SG_UF",
    "DS_URL",
    "NR_ORDEM_REDE_SOCIAL",
}

type ChaveTse = tuple[int, int]  # CD_ELEICAO e SQ_CANDIDATO, dentro do ano do arquivo.


class ArquivoInvalido(ValueError):
    """O arquivo inteiro precisa ser descartado."""


@dataclass(frozen=True, repr=False)
class CandidaturaTse:
    chave: ChaveTse
    cargo: int
    uf: str
    partido: str
    numero: str
    nome_urna: str
    resultado_bruto: int
    nome_civil: str
    cpf: str | None


def url_arquivo(tipo: str, ano: int) -> str:
    return f"{BASE}/{tipo}_{ano}.zip"


@contextmanager
def abrir_zip(
    tipo: str, ano: int, diretorio: Path | None, cliente: httpx2.Client
) -> Iterator[ZipFile]:
    if diretorio is not None:
        with ZipFile(diretorio / f"{tipo}_{ano}.zip") as arquivo:
            yield arquivo
        return
    # O diretório central do ZIP fica no fim. O temporário permite a leitura com seek.
    with TemporaryFile() as temporario:
        with cliente.stream("GET", url_arquivo(tipo, ano), follow_redirects=False) as resposta:
            resposta.raise_for_status()
            for bloco in resposta.iter_bytes(chunk_size=128 * 1024):
                temporario.write(bloco)
        temporario.seek(0)
        with ZipFile(temporario) as arquivo:
            yield arquivo


def _linhas(
    arquivo: ZipFile,
    membro: str,
    campos: set[str],
    descartes: Counter[str],
) -> Iterator[dict[str, str]]:
    # BRASIL já contém os registros de BR e de todas as UFs.
    with (
        arquivo.open(membro) as bruto,
        TextIOWrapper(bruto, encoding="latin-1", newline="") as csv_,
    ):
        leitor = csv.reader(csv_, delimiter=";", strict=True)
        colunas = next(leitor, [])
        if not campos.issubset(colunas) or len(colunas) != len(set(colunas)):
            raise ArquivoInvalido("Cabeçalho inválido.")
        for valores in leitor:
            if len(valores) == len(colunas):
                yield dict(zip(colunas, valores, strict=True))
            else:
                descartes["linha_invalida"] += 1


def _numero(valor: str, minimo: int, maximo: int) -> int:
    if not re.fullmatch(r"-?[0-9]+", valor):
        raise ValueError("Número inválido.")
    numero = int(valor)
    if not minimo <= numero <= maximo:
        raise ValueError("Número fora do intervalo.")
    return numero


def _chave(linha: dict[str, str]) -> ChaveTse:
    return (
        _numero(linha["CD_ELEICAO"], 1, 2**31 - 1),
        _numero(linha["SQ_CANDIDATO"], 1, 2**63 - 1),
    )


def _candidatura(linha: dict[str, str], ano: int, cargo: int) -> CandidaturaTse:
    uf = linha["SG_UF"]
    partido, nome = linha["SG_PARTIDO"].strip(), linha["NM_URNA_CANDIDATO"].strip()
    numero = linha["NR_CANDIDATO"].strip()
    if (
        linha["ANO_ELEICAO"] != str(ano)
        or uf not in UFS
        or not partido
        or not nome
        or "\0" in partido + nome
        or not re.fullmatch(r"[0-9]+", numero)
    ):
        raise ValueError("Campos obrigatórios inválidos.")
    cpf = linha["NR_CPF_CANDIDATO"].strip()
    return CandidaturaTse(
        _chave(linha),
        cargo,
        uf,
        partido,
        numero,
        nome,
        _numero(linha["CD_SIT_TOT_TURNO"], -(2**15), 2**15 - 1),
        linha["NM_CANDIDATO"],
        cpf if re.fullmatch(r"[0-9]{11}", cpf) and len(set(cpf)) > 1 else None,
    )


def ler_candidaturas(
    arquivo: ZipFile,
    ano: int,
    descartes: Counter[str],
) -> list[CandidaturaTse]:
    candidaturas: dict[ChaveTse, CandidaturaTse] = {}
    for linha in _linhas(
        arquivo, f"{CANDIDATURAS}_{ano}_BRASIL.csv", _CAMPOS_CANDIDATURAS, descartes
    ):
        try:
            cargo = _numero(linha["CD_CARGO"], 1, 2**15 - 1)
            if cargo not in CASA_POR_CARGO:
                continue
            c = _candidatura(linha, ano, cargo)
        except ValueError:
            descartes["linha_invalida"] += 1
            continue
        if c.chave in candidaturas:
            if candidaturas[c.chave] != c:
                raise ArquivoInvalido("Candidaturas divergentes para a mesma chave.")
            descartes["candidatura_repetida"] += 1
        else:
            candidaturas[c.chave] = c
    if not candidaturas:
        raise ArquivoInvalido("O arquivo não traz candidaturas do recorte.")
    return list(candidaturas.values())


def _url_declarada(valor: str) -> str:
    valor = valor.strip()
    if not valor or "\\" in valor or any(ch.isspace() or ord(ch) < 32 for ch in valor):
        raise ValueError("Endereço inválido.")
    if valor.startswith("//"):
        valor = "https:" + valor
    elif "://" not in valor:
        valor = "https://" + valor
    url = urlsplit(valor)
    if (
        url.scheme not in ("https", "http")
        or not url.hostname
        or "." not in url.hostname
        or url.username is not None
        or url.port == 0
    ):
        raise ValueError("Endereço inválido.")
    return url.geturl()


def ler_links(
    arquivo: ZipFile,
    ano: int,
    candidaturas: dict[ChaveTse, tuple[int, str]],
    descartes: Counter[str],
) -> list[tuple[int, int, str]]:
    por_url: dict[tuple[int, str], int] = {}
    por_ordem: dict[tuple[int, int], str] = {}
    for linha in _linhas(arquivo, f"{REDES}_{ano}_BRASIL.csv", _CAMPOS_REDES, descartes):
        try:
            chave = _chave(linha)
            if chave not in candidaturas:
                continue
            candidatura_id, uf = candidaturas[chave]
            ordem = _numero(linha["NR_ORDEM_REDE_SOCIAL"], 1, 2**31 - 1)
            if linha["AA_ELEICAO"] != str(ano) or linha["SG_UF"] != uf:
                raise ValueError("A rede diverge da candidatura.")
        except ValueError:
            descartes["linha_invalida"] += 1
            continue
        try:
            url = _url_declarada(linha["DS_URL"])
        except ValueError:
            descartes["url_invalida"] += 1
            continue
        if por_ordem.setdefault((candidatura_id, ordem), url) != url:
            raise ArquivoInvalido("Endereços divergentes para a mesma ordem.")
        chave_url = candidatura_id, url
        if chave_url in por_url:
            descartes["url_repetida"] += 1
            ordem = min(ordem, por_url[chave_url])
        por_url[chave_url] = ordem
    return [(candidatura_id, ordem, url) for (candidatura_id, url), ordem in por_url.items()]
