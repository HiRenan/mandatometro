"""Carga das candidaturas do TSE com ligação aos parlamentares em exercício."""

import argparse
import csv
import json
import time
import unicodedata
import zlib
from collections import Counter, defaultdict
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from itertools import batched, chain
from pathlib import Path
from zipfile import BadZipFile, LargeZipFile

import httpx2
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.coleta.http import Resposta
from mandatometro.coleta.persistencia import registrar_fonte
from mandatometro.coleta.tse_arquivos import (
    CANDIDATURAS,
    CARGOS_POR_CASA,
    CASA_POR_CARGO,
    ArquivoInvalido,
    CandidaturaTse,
    ChaveTse,
    abrir_zip,
    ler_candidaturas,
    url_arquivo,
)
from mandatometro.db import sessao
from mandatometro.db.modelos import (
    RESULTADOS_TSE,
    Candidatura,
    Mandato,
    Parlamentar,
)

ANOS = (2022, 2026)
_CHAVE_CANDIDATURA = ("ano", "codigo_eleicao", "id_externo")

type ChaveCandidatura = tuple[int, ChaveTse]
type ParesNominais = dict[int, dict[ChaveTse, CandidaturaTse]]
type CandidaturasGravadas = dict[ChaveCandidatura, CandidaturaTse | None]


@dataclass(frozen=True, repr=False)
class EmExercicio:
    id: int
    casa: str
    nome: str
    uf: str
    legislatura: int


@dataclass
class ResumoArquivo:
    gravados: int = 0
    fontes: int = 0
    descartes: Counter[str] = field(default_factory=Counter)
    falhas: dict[str, int] = field(default_factory=dict)

    def registrar_falha(self, erro: Exception) -> None:
        if isinstance(erro, FileNotFoundError) or (
            isinstance(erro, httpx2.HTTPStatusError) and erro.response.status_code in (404, 410)
        ):
            codigo = "ausente"
        elif isinstance(erro, httpx2.HTTPError):
            codigo = "rede"
        elif isinstance(erro, SQLAlchemyError):
            codigo = "gravacao"
        elif isinstance(
            erro,
            (ArquivoInvalido, BadZipFile, LargeZipFile, KeyError, csv.Error, EOFError, zlib.error),
        ):
            codigo = "invalido"
        elif isinstance(erro, OSError):
            codigo = "leitura"
        else:
            codigo = "inesperado"
        self.falhas[codigo] = 1


def _nome(valor: str) -> str:
    convertido = unicodedata.normalize("NFKD", valor.casefold())
    sem_pontuacao = (
        letra if letra.isalnum() else " "
        for letra in convertido
        if not unicodedata.combining(letra)
    )
    return " ".join("".join(sem_pontuacao).split())


def _compativel(pessoa: EmExercicio, ano: int, candidatura: CandidaturaTse) -> bool:
    if CASA_POR_CARGO[candidatura.cargo] != pessoa.casa:
        return False
    # A eleição de 2026 é posterior ao início dos mandatos deste recorte.
    if ano != 2022:
        return True
    if pessoa.casa == "senado" and pessoa.legislatura == 56:
        return False
    return pessoa.legislatura != 57 or candidatura.resultado_bruto in (1, 2, 3, 5)


def _compativel_com_mandatos(
    mandatos: list[EmExercicio], ano: int, candidatura: CandidaturaTse
) -> bool:
    mesma_uf = [m for m in mandatos if m.uf == candidatura.uf]
    return any(_compativel(m, ano, candidatura) for m in mesma_uf or mandatos)


def _ponte_por_cpf(
    mandatos: list[EmExercicio],
    unicos: dict[int, CandidaturaTse],
    compativeis: dict[int, CandidaturaTse],
    por_cpf: dict[tuple[int, str], list[CandidaturaTse]],
) -> tuple[dict[int, CandidaturaTse], bool] | None:
    """Retorna a ponte e indica outro cargo em 2026. None sinaliza contradição."""
    cpfs = {c.cpf for c in unicos.values() if c.cpf}
    if len(cpfs) > 1:
        return None
    if not cpfs:
        return {}, False

    cpf = next(iter(cpfs))
    cpf_de_par_compativel = any(c.cpf for c in compativeis.values())
    alcancadas = {}
    outro_cargo = False
    for ano in ANOS:
        pares = por_cpf.get((ano, cpf), [])
        if len(pares) > 1:
            return None
        if not pares:
            continue
        c = pares[0]
        if ano in unicos and c.chave != unicos[ano].chave:
            return None
        if cpf_de_par_compativel and not _compativel_com_mandatos(mandatos, ano, c):
            if ano == 2022:
                return None
            # Em 2026, a candidatura a outra Casa preserva a âncora de 2022.
            outro_cargo = True
            continue
        alcancadas[ano] = c

    ancora = compativeis.get(2022)
    return (alcancadas, outro_cargo) if ancora and ancora.cpf else ({}, False)


def _conflitos_das_cadeias(
    pares_nominais: dict[int, ParesNominais],
    por_cpf: dict[tuple[int, str], list[CandidaturaTse]],
    donos: dict[ChaveCandidatura, int],
    gravadas: dict[int, CandidaturasGravadas],
) -> set[int]:
    por_candidatura: dict[ChaveCandidatura, set[int]] = defaultdict(set)
    por_documento: dict[str, set[int]] = defaultdict(set)
    conflitos = set()
    for pessoa in pares_nominais.keys() | gravadas.keys():
        pares = pares_nominais.get(pessoa, {})
        historico = gravadas.get(pessoa, {})
        # Mesmo um par múltiplo ou incompatível é evidência de uma possível identidade.
        cpfs = {c.cpf for cs in pares.values() for c in cs.values() if c.cpf}
        cpfs.update(c.cpf for c in historico.values() if c and c.cpf)
        chaves = {(ano, chave) for ano, cs in pares.items() for chave in cs} | historico.keys()
        for cpf in cpfs:
            por_documento[cpf].add(pessoa)
            for ano in ANOS:
                chaves.update((ano, c.chave) for c in por_cpf.get((ano, cpf), ()))
        for chave in chaves:
            por_candidatura[chave].add(pessoa)
        if any(donos.get(chave, pessoa) != pessoa for chave in chaves):
            conflitos.add(pessoa)

    for pessoas in chain(por_candidatura.values(), por_documento.values()):
        if len(pessoas) > 1:
            conflitos.update(pessoas)
    return conflitos


def _ligar(
    parlamentares: list[EmExercicio],
    arquivos: dict[int, list[CandidaturaTse]],
    donos: dict[ChaveCandidatura, int],
    contagens: dict[int, dict[str, dict[str, int]]],
) -> dict[int, dict[ChaveTse, tuple[CandidaturaTse, int]]]:
    nominais = defaultdict(list)
    por_cpf = defaultdict(list)
    por_chave = {}
    for ano, candidaturas in arquivos.items():
        for c in candidaturas:
            por_chave[ano, c.chave] = c
            casa = CASA_POR_CARGO[c.cargo]
            for nome in {_nome(c.nome_urna), _nome(c.nome_civil)} - {""}:
                nominais[ano, casa, c.uf, nome].append(c)
            if c.cpf:
                por_cpf[ano, c.cpf].append(c)

    por_parlamentar = defaultdict(list)
    for mandato in parlamentares:
        por_parlamentar[mandato.id].append(mandato)

    pares_nominais = {}
    for pessoa, mandatos in por_parlamentar.items():
        p = mandatos[0]
        nome = _nome(p.nome)
        ufs = {m.uf for m in mandatos}
        pares_nominais[pessoa] = {
            ano: {c.chave: c for uf in ufs for c in nominais.get((ano, p.casa, uf, nome), ())}
            for ano in ANOS
        }

    gravadas: dict[int, CandidaturasGravadas] = defaultdict(dict)
    for chave, dono in donos.items():
        gravadas[dono][chave] = por_chave.get(chave)
    conflitos = _conflitos_das_cadeias(pares_nominais, por_cpf, donos, gravadas)

    ligadas: dict[int, dict[ChaveTse, tuple[CandidaturaTse, int]]] = {ano: {} for ano in arquivos}
    for pessoa, mandatos in por_parlamentar.items():
        p = mandatos[0]
        pares = pares_nominais[pessoa]
        unicos = {ano: next(iter(cs.values())) for ano, cs in pares.items() if len(cs) == 1}
        compativeis = {
            ano: c for ano, c in unicos.items() if _compativel_com_mandatos(mandatos, ano, c)
        }
        ponte = _ponte_por_cpf(mandatos, unicos, compativeis, por_cpf)
        if pessoa in conflitos or ponte is None or any(len(cs) > 1 for cs in pares.values()):
            for ano in ANOS:
                contagens[ano][p.casa]["em_conflito"] += 1
            continue

        candidaturas_por_cpf, outro_cargo = ponte
        propostas = candidaturas_por_cpf | compativeis
        historico = gravadas.get(pessoa, {})
        novos_cpfs = {c.cpf for ano, c in propostas.items() if (ano, c.chave) not in historico}
        cpfs = novos_cpfs | {c.cpf if c else None for c in historico.values()}
        conflito_historico = bool(historico and novos_cpfs) and (len(cpfs) != 1 or None in cpfs)
        for ano in ANOS:
            resumo = contagens[ano][p.casa]
            c = propostas.get(ano)
            outra_ficha_no_ano = c is not None and any(
                ano_gravado == ano and chave != c.chave for ano_gravado, chave in historico
            )
            if conflito_historico or outra_ficha_no_ano:
                resumo["em_conflito"] += 1
                # O veto a vínculos novos permite atualizar uma ficha já ligada ao titular.
                if c and not outra_ficha_no_ano and (ano, c.chave) in historico:
                    ligadas[ano][c.chave] = c, pessoa
            elif ano == 2026 and outro_cargo:
                resumo["outro_cargo"] += 1
            elif ano in unicos and ano not in compativeis:
                resumo["derrubados_pela_trava"] += 1
            elif c:
                ligadas[ano][c.chave] = c, pessoa
            else:
                resumo["sem_par"] += 1
    return ligadas


def _gravar_candidaturas(
    s: Session,
    ano: int,
    instante: datetime,
    pares: dict[ChaveTse, tuple[CandidaturaTse, int]],
) -> None:
    fonte = registrar_fonte(s, Resposta(url_arquivo(ano), instante, None))
    valores = [
        {
            "ano": ano,
            "codigo_eleicao": c.chave[0],
            "id_externo": c.chave[1],
            "cargo": c.cargo,
            "uf": c.uf,
            "partido": c.partido,
            "numero": c.numero,
            "nome_urna": c.nome_urna,
            "resultado": RESULTADOS_TSE.get(c.resultado_bruto, "outro"),
            "resultado_bruto": c.resultado_bruto,
            "parlamentar_id": parlamentar_id,
            "fonte_id": fonte.id,
        }
        for c, parlamentar_id in pares.values()
    ]
    for lote in batched(valores, 500, strict=False):
        comando = insert(Candidatura).values(lote)
        s.execute(
            comando.on_conflict_do_update(
                index_elements=_CHAVE_CANDIDATURA,
                set_={
                    campo: comando.excluded[campo]
                    for campo in lote[0]
                    if campo not in _CHAVE_CANDIDATURA and campo != "parlamentar_id"
                },
            )
        )


def _coletar(
    diretorio: Path | None,
    cliente: httpx2.Client,
    criar_sessao: Callable[[], Session],
    contagens: dict[int, dict[str, dict[str, int]]],
    resumos: dict[int, ResumoArquivo],
) -> None:
    with criar_sessao() as s:
        em_exercicio = [
            EmExercicio(*linha)
            for linha in s.execute(
                select(
                    Parlamentar.id,
                    Parlamentar.casa,
                    Parlamentar.nome,
                    Mandato.uf,
                    Mandato.legislatura,
                )
                .join(Mandato)
                .where(Mandato.em_exercicio.is_(True))
            )
        ]
    if not em_exercicio:
        raise ArquivoInvalido("Cadastre os parlamentares em exercício antes da coleta.")

    candidaturas, instantes = {}, {}
    for ano, resumo in resumos.items():
        try:
            with abrir_zip(ano, diretorio, cliente) as arq:
                lidas = ler_candidaturas(arq, ano, resumo.descartes)
            candidaturas[ano] = lidas
            instantes[ano] = datetime.now(UTC)
        except Exception as erro:
            resumo.registrar_falha(erro)

    if len(candidaturas) != len(ANOS):
        for ano in candidaturas:
            resumos[ano].falhas["candidaturas_incompletas"] = 1
        return

    try:
        with criar_sessao() as s, s.begin():
            # Confere os titulares e grava os dois anos sob as mesmas travas, sempre nesta ordem.
            for ano in ANOS:
                s.execute(
                    select(
                        func.pg_advisory_xact_lock(func.hashtext("mandatometro.coleta.tse"), ano)
                    )
                )
            donos = {
                (ano, (eleicao, externo)): pessoa
                for ano, eleicao, externo, pessoa in s.execute(
                    select(
                        Candidatura.ano,
                        Candidatura.codigo_eleicao,
                        Candidatura.id_externo,
                        Candidatura.parlamentar_id,
                    )
                )
            }
            ligadas = _ligar(em_exercicio, candidaturas, donos, contagens)
            for ano, instante in instantes.items():
                _gravar_candidaturas(s, ano, instante, ligadas[ano])
    except SQLAlchemyError as erro:
        for resumo in resumos.values():
            resumo.registrar_falha(erro)
        return

    for ano, pares in ligadas.items():
        resumos[ano].gravados, resumos[ano].fontes = len(pares), 1
        for c, _ in pares.values():
            contagens[ano][CASA_POR_CARGO[c.cargo]]["ligados"] += 1


def _executar(args: argparse.Namespace) -> int:
    comeco = time.monotonic()
    contagens = {
        ano: {
            casa: dict.fromkeys(
                ("ligados", "sem_par", "em_conflito", "derrubados_pela_trava", "outro_cargo"), 0
            )
            for casa in CARGOS_POR_CASA
        }
        for ano in ANOS
    }
    resumos = {ano: ResumoArquivo() for ano in ANOS}
    falhas_gerais = 0
    try:
        with httpx2.Client(timeout=30.0) as cliente:
            _coletar(args.diretorio_zips, cliente, sessao, contagens, resumos)
    except Exception:
        # Exceções do driver, do CSV ou da rede podem carregar valores da fonte.
        falhas_gerais = 1
    completa = falhas_gerais == 0 and all(not a.falhas for a in resumos.values())
    print(
        json.dumps(
            {
                "completa": completa,
                "falhas_gerais": falhas_gerais,
                "duracao_s": round(time.monotonic() - comeco, 3),
                "anos": {
                    ano: {
                        **contagens[ano],
                        "arquivos": {CANDIDATURAS: vars(resumos[ano])},
                    }
                    for ano in ANOS
                },
            },
            ensure_ascii=False,
        )
    )
    return 0 if completa else 1


def registrar(casas) -> None:
    parser = casas.add_parser("tse", help="coleta candidaturas de 2022 e 2026")
    parser.add_argument("--diretorio-zips", type=Path, help="lê os dois ZIPs já baixados na pasta")
    parser.set_defaults(rodar=_executar)
