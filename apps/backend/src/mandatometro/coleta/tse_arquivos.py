"""Leitura dos arquivos do TSE. Os ZIPs temporários são descartados depois do uso."""

import csv
import re
from codecs import BOM_UTF8, BOM_UTF16_BE, BOM_UTF16_LE, getincrementaldecoder
from collections import Counter
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from io import BufferedReader, RawIOBase, TextIOWrapper
from pathlib import Path
from tempfile import TemporaryFile
from zipfile import ZipExtFile, ZipFile

import httpx2

BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele"
CANDIDATURAS = "consulta_cand"
BENS = "bem_candidato"
LIMITE_DOWNLOAD = 50_000_000
LIMITE_MEMBRO = 300_000_000
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
_UTF8_MULTIBYTE = re.compile(r"[^\x00-\x7f\udc80-\udcff]")

type ChaveTse = tuple[int, int]  # CD_ELEICAO e SQ_CANDIDATO, dentro do ano do arquivo.


class ArquivoInvalido(ValueError):
    """O arquivo inteiro precisa ser descartado."""


class _LeituraCSV(RawIOBase):
    def __init__(self, membro: ZipExtFile, *, validar_utf8: bool = True):
        super().__init__()
        self._membro = membro
        self._lidos = 0
        self._prefixo = b""
        self._utf8 = getincrementaldecoder("utf-8")("surrogateescape") if validar_utf8 else None

    def readable(self) -> bool:
        return True

    def readinto(self, destino) -> int:
        bloco = self._membro.read(min(len(destino), LIMITE_MEMBRO + 1 - self._lidos))
        self._lidos += len(bloco)
        if self._lidos > LIMITE_MEMBRO:
            raise ArquivoInvalido("Membro do ZIP acima do limite.")
        if len(self._prefixo) < 3:
            self._prefixo = (self._prefixo + bloco[:3])[:3]
        # surrogateescape preserva octetos soltos de latin-1. Um caractere acima de
        # ASCII que não veio desse escape representa uma sequência UTF-8 completa.
        if (
            self._prefixo.startswith((BOM_UTF8, BOM_UTF16_LE, BOM_UTF16_BE))
            or b"\0" in bloco
            or (self._utf8 and _UTF8_MULTIBYTE.search(self._utf8.decode(bloco, final=not bloco)))
        ):
            raise ArquivoInvalido("O CSV deve estar em latin-1.")
        destino[: len(bloco)] = bloco
        return len(bloco)


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


def url_arquivo(ano: int, tipo: str = CANDIDATURAS) -> str:
    return f"{BASE}/{tipo}/{tipo}_{ano}.zip"


@contextmanager
def abrir_zip(
    ano: int, diretorio: Path | None, cliente: httpx2.Client, *, tipo: str = CANDIDATURAS
) -> Iterator[ZipFile]:
    if diretorio is not None:
        caminho = diretorio / f"{tipo}_{ano}.zip"
        if caminho.stat().st_size > LIMITE_DOWNLOAD:
            raise ArquivoInvalido("ZIP local acima do limite.")
        with ZipFile(caminho) as arquivo:
            yield arquivo
        return
    # O diretório central do ZIP fica no fim. O temporário permite a leitura com seek.
    with TemporaryFile() as temporario:
        with cliente.stream("GET", url_arquivo(ano, tipo), follow_redirects=False) as resposta:
            resposta.raise_for_status()
            tamanho = 0
            for bloco in resposta.iter_bytes(chunk_size=128 * 1024):
                tamanho += len(bloco)
                if tamanho > LIMITE_DOWNLOAD:
                    raise ArquivoInvalido("Download do ZIP acima do limite.")
                temporario.write(bloco)
        temporario.seek(0)
        with ZipFile(temporario) as arquivo:
            yield arquivo


def _linhas(
    arquivo: ZipFile,
    membro: str,
    campos: set[str],
    descartes: Counter[str],
    *,
    ignorar_coluna: str | None = None,
) -> Iterator[dict[str, str]]:
    # BRASIL já contém os registros de BR e de todas as UFs.
    info = arquivo.getinfo(membro)
    if info.file_size > LIMITE_MEMBRO:
        raise ArquivoInvalido("Membro do ZIP acima do limite.")
    with (
        arquivo.open(info) as bruto,
        TextIOWrapper(
            BufferedReader(_LeituraCSV(bruto, validar_utf8=ignorar_coluna is None)),
            encoding="latin-1",
            newline="",
        ) as csv_,
    ):
        fim = False
        linha_terminada = False

        def linhas_fisicas():
            nonlocal fim, linha_terminada
            for linha in csv_:
                linha_terminada = linha.endswith(("\r", "\n"))
                yield linha
            fim = True

        leitor = csv.reader(linhas_fisicas(), delimiter=";", strict=True)
        colunas = next(leitor, [])
        if not campos.issubset(colunas) or len(colunas) != len(set(colunas)):
            raise ArquivoInvalido("Cabeçalho inválido.")
        if ignorar_coluna is not None and ignorar_coluna not in colunas:
            raise ArquivoInvalido("Cabeçalho inválido.")
        indices = [(i, campo) for i, campo in enumerate(colunas) if campo in campos]
        ignorado = colunas.index(ignorar_coluna) if ignorar_coluna is not None else None
        while True:
            try:
                valores = next(leitor)
            except StopIteration:
                break
            except csv.Error:
                if fim:
                    raise ArquivoInvalido("Registro CSV truncado.") from None
                descartes["linha_invalida"] += 1
                continue
            if len(valores) == len(colunas):
                if ignorado is not None:
                    # A descrição livre de bens vem com codificação mista no arquivo de 2022.
                    valores[ignorado] = ""
                    if any(
                        not valor.isascii()
                        and _UTF8_MULTIBYTE.search(
                            valor.encode("latin-1").decode("utf-8", "surrogateescape")
                        )
                        for valor in valores
                    ):
                        raise ArquivoInvalido("O CSV deve estar em latin-1.")
                yield {campo: valores[i] for i, campo in indices}
            elif len(valores) < len(colunas) and not linha_terminada:
                raise ArquivoInvalido("Registro CSV truncado.")
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


def cpf_ou_nulo(valor: str) -> str | None:
    cpf = valor.strip()
    return cpf if re.fullmatch(r"[0-9]{11}", cpf) and len(set(cpf)) > 1 else None


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
    return CandidaturaTse(
        _chave(linha),
        cargo,
        uf,
        partido,
        numero,
        nome,
        _numero(linha["CD_SIT_TOT_TURNO"], -(2**15), 2**15 - 1),
        linha["NM_CANDIDATO"],
        cpf_ou_nulo(linha["NR_CPF_CANDIDATO"]),
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
