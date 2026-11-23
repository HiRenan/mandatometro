"""Leitura em fluxo das chaves, dos documentos em memória e dos valores nominais."""

import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from zipfile import ZipFile

from mandatometro.coleta.tse_arquivos import (
    BENS,
    CANDIDATURAS,
    UFS,
    ArquivoInvalido,
    CandidaturaTse,
    _chave,
    _linhas,
    _numero,
    cpf_ou_nulo,
    eleicao_ordinaria,
    ler_candidaturas,
)
from mandatometro.tse_catalogos import MAXIMO_CENTAVOS, TIPOS_DE_BEM_TSE

_CAMPOS_CHAVE = {"ANO_ELEICAO", "CD_ELEICAO", "SG_UF", "SQ_CANDIDATO"}
_CAMPOS_CANDIDATURAS = {
    *_CAMPOS_CHAVE,
    "CD_TIPO_ELEICAO",
    "CD_CARGO",
    "NR_CPF_CANDIDATO",
    "NR_TURNO",
    "DS_SIT_TOT_TURNO",
}
_CAMPOS_BENS = {*_CAMPOS_CHAVE, "CD_TIPO_BEM_CANDIDATO", "VR_BEM_CANDIDATO"}
_DECIMAL = re.compile(r"-?[0-9]+,[0-9]{2}")

RESULTADOS_POR_TEXTO = {
    "ELEITO": "eleito",
    "ELEITO POR QP": "eleito_por_qp",
    "ELEITO POR MÉDIA": "eleito_por_media",
    "MÉDIA": "eleito_por_media",
    "SUPLENTE": "suplente",
    "NÃO ELEITO": "nao_eleito",
    "#NULO": "sem_resultado",
    "#NULO#": "sem_resultado",
    "2º TURNO": "sem_resultado",
    "CASSADO COM RECURSO": "sem_resultado",
    "INDEFERIDO COM RECURSO": "sem_resultado",
    "REGISTRO NEGADO ANTES DA ELEIÇÃO": "sem_resultado",
    "REGISTRO NEGADO APÓS A ELEIÇÃO": "sem_resultado",
    "RENÚNCIA/FALECIMENTO COM SUBSTITUIÇÃO": "sem_resultado",
    "RENÚNCIA/FALECIMENTO/CASSAÇÃO ANTES DA ELEIÇÃO": "sem_resultado",
    "RENÚNCIA/FALECIMENTO/CASSAÇÃO APÓS A ELEIÇÃO": "sem_resultado",
    "SUBSTITUÍDO": "sem_resultado",
}

type ChavePatrimonio = tuple[int, str, int]  # Código da eleição, UF e SQ_CANDIDATO.
type TotaisPorTipo = Counter[int]


@dataclass(frozen=True, repr=False)
class CandidaturaLida:
    cargo: int
    cpf: str | None
    turno: int
    situacao_turno: str


def _chave_patrimonio(linha: dict[str, str], ano: int) -> ChavePatrimonio:
    uf = linha["SG_UF"]
    if linha["ANO_ELEICAO"] != str(ano) or (uf != "BR" and uf not in UFS):
        raise ArquivoInvalido("Ano ou UF inválido.")
    try:
        codigo_eleicao, id_externo = _chave(linha)
    except ValueError:
        raise ArquivoInvalido("Chave eleitoral inválida.") from None
    return codigo_eleicao, uf, id_externo


def ler_candidaturas_patrimonio(
    arquivo: ZipFile, ano: int, contagens: Counter[str]
) -> dict[ChavePatrimonio, CandidaturaLida]:
    candidaturas = {}
    for linha in _linhas(
        arquivo, f"{CANDIDATURAS}_{ano}_BRASIL.csv", _CAMPOS_CANDIDATURAS, contagens
    ):
        if not eleicao_ordinaria(linha, ano):
            contagens["fora_das_gerais"] += 1
            continue
        chave = _chave_patrimonio(linha, ano)
        try:
            cargo = _numero(linha["CD_CARGO"], 1, 2**15 - 1)
        except ValueError:
            raise ArquivoInvalido("Código de cargo inválido.") from None
        try:
            turno = _numero(linha["NR_TURNO"], 1, 2**15 - 1)
        except ValueError:
            raise ArquivoInvalido("Turno eleitoral inválido.") from None
        cpf = cpf_ou_nulo(linha["NR_CPF_CANDIDATO"])
        contagens["linhas"] += 1
        if cpf is None:
            contagens["sem_cpf"] += 1
        candidatura = CandidaturaLida(cargo, cpf, turno, linha["DS_SIT_TOT_TURNO"])
        anterior = candidaturas.get(chave)
        if anterior is not None:
            if (anterior.cargo, anterior.cpf) != (cargo, cpf) or (
                anterior.turno == turno and anterior != candidatura
            ):
                raise ArquivoInvalido("Candidaturas divergentes para a mesma chave.")
            if anterior.turno >= turno:
                continue
        candidaturas[chave] = candidatura
    if contagens["linha_invalida"] or not candidaturas:
        raise ArquivoInvalido("CSV de candidaturas incompleto.")
    return candidaturas


def ler_candidaturas_recentes(
    arquivo: ZipFile, ano: int, contagens: Counter[str]
) -> tuple[dict[ChavePatrimonio, CandidaturaLida], list[CandidaturaTse]]:
    patrimonio = ler_candidaturas_patrimonio(arquivo, ano, contagens)
    # A primeira leitura já validou o arquivo de todos os cargos e contou os descartes.
    candidaturas = ler_candidaturas(arquivo, ano, Counter(), exigir_recorte=False)
    return patrimonio, candidaturas


def _centavos(texto: str, contagens: Counter[str]) -> int | None:
    valor = texto.strip()
    if not valor:
        contagens["valor_vazio"] += 1
    elif not _DECIMAL.fullmatch(valor):
        contagens["valor_malformado"] += 1
    elif valor.startswith("-"):
        contagens["valor_negativo"] += 1
    else:
        digitos = valor.replace(",", "").lstrip("0")
        if len(digitos) <= 16 and (centavos := int(digitos or "0")) <= MAXIMO_CENTAVOS:
            if centavos == 0:
                contagens["valor_zero"] += 1
            return centavos
        contagens["valor_acima_do_limite"] += 1
    return None


def ler_bens(
    arquivo: ZipFile,
    ano: int,
    contagens: Counter[str],
    *,
    chaves: set[ChavePatrimonio],
) -> dict[ChavePatrimonio, TotaisPorTipo | None]:
    ordem = "NR_ORDEM_CANDIDATO" if ano <= 2010 else "NR_ORDEM_BEM_CANDIDATO"
    itens = defaultdict(dict)
    invalidas = set()
    tipos = set()
    for linha in _linhas(
        arquivo,
        f"{BENS}_{ano}_BRASIL.csv",
        _CAMPOS_BENS | {ordem},
        contagens,
        ignorar_coluna="DS_BEM_CANDIDATO",
    ):
        chave = _chave_patrimonio(linha, ano)
        contagens["linhas"] += 1
        centavos = _centavos(linha["VR_BEM_CANDIDATO"], contagens)
        try:
            tipo = _numero(linha["CD_TIPO_BEM_CANDIDATO"], -(2**31), 2**31 - 1)
            tipos.add(tipo)
            if tipo not in TIPOS_DE_BEM_TSE:
                contagens["tipo_desconhecido"] += 1
            id_bem = _numero(linha[ordem], 1, 2**63 - 1)
        except ValueError:
            contagens["tipo_ou_ordem_invalida"] += 1
            if chave in chaves:
                invalidas.add(chave)
            continue

        if chave in chaves:
            contagens["linhas_vinculadas"] += 1
            if centavos is None:
                invalidas.add(chave)
                continue
            item = (tipo, centavos)
            if itens[chave].setdefault(id_bem, item) != item:
                invalidas.add(chave)
                contagens["ordem_divergente"] += 1

    if contagens["linha_invalida"] or not contagens["linhas"]:
        raise ArquivoInvalido("CSV de bens incompleto.")
    totais = {}
    for chave, bens in itens.items():
        if chave in invalidas:
            continue
        por_tipo = Counter()
        for tipo, centavos in bens.values():
            por_tipo[tipo] += centavos
        if sum(por_tipo.values()) > MAXIMO_CENTAVOS:
            invalidas.add(chave)
        else:
            totais[chave] = por_tipo
    contagens["tipos"] = len(tipos)
    contagens["declaracoes_invalidas"] = len(invalidas)
    return totais | dict.fromkeys(invalidas)
