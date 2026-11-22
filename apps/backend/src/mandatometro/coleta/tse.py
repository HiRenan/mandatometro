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
from itertools import batched
from pathlib import Path
from zipfile import BadZipFile, LargeZipFile

import httpx2
from sqlalchemy import and_, delete, func, or_, select, tuple_
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.coleta.http import Resposta
from mandatometro.coleta.persistencia import registrar_fonte
from mandatometro.coleta.tse_arquivos import (
    CANDIDATURAS,
    CARGOS_POR_CASA,
    CASA_POR_CARGO,
    REDES,
    ArquivoInvalido,
    CandidaturaTse,
    ChaveTse,
    abrir_zip,
    ler_candidaturas,
    ler_links,
    url_arquivo,
)
from mandatometro.db import sessao
from mandatometro.db.modelos import (
    RESULTADOS_TSE,
    Candidatura,
    LinkCandidatura,
    Mandato,
    Parlamentar,
)

ANOS = (2022, 2026)
CARGOS = tuple(CASA_POR_CARGO)
_CHAVE_CANDIDATURA = ("ano", "codigo_eleicao", "id_externo")


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
    # A eleição de 2026 é posterior ao início dos mandatos deste recorte.
    if ano != 2022:
        return True
    if pessoa.casa == "senado" and pessoa.legislatura == 56:
        return False
    return pessoa.legislatura != 57 or candidatura.resultado_bruto in (1, 2, 3, 5)


def _ligar(
    parlamentares: list[EmExercicio],
    arquivos: dict[int, list[CandidaturaTse]],
    contagens: dict[int, dict[str, dict[str, int]]],
) -> dict[int, dict[ChaveTse, tuple[CandidaturaTse, int]]]:
    nominais = defaultdict(list)
    por_cpf = defaultdict(list)
    for ano, candidaturas in arquivos.items():
        for c in candidaturas:
            casa = CASA_POR_CARGO[c.cargo]
            for nome in {_nome(c.nome_urna), _nome(c.nome_civil)} - {""}:
                nominais[ano, casa, c.uf, nome].append(c)
            if c.cpf:
                por_cpf[ano, casa, c.cpf].append(c)

    propostas = defaultdict(list)
    for p in parlamentares:
        nome = _nome(p.nome)
        pares = {ano: nominais.get((ano, p.casa, p.uf, nome), []) for ano in arquivos}
        cpfs = {cs[0].cpf for cs in pares.values() if len(cs) == 1 and cs[0].cpf}
        if len(cpfs) > 1:
            for ano in pares:
                contagens[ano][p.casa]["em_conflito"] += 1
            continue
        if cpfs:
            cpf = next(iter(cpfs))
            pares = {ano: por_cpf.get((ano, p.casa, cpf), []) for ano in arquivos}
        confirmado = bool(cpfs) and all(len(pares.get(ano, [])) == 1 for ano in ANOS)
        for ano, cs in pares.items():
            resumo = contagens[ano][p.casa]
            if not cs:
                resumo["sem_par"] += 1
            elif len(cs) > 1:
                resumo["em_conflito"] += 1
            elif not confirmado and not _compativel(p, ano, cs[0]):
                resumo["derrubados_pela_trava"] += 1
            else:
                propostas[ano, cs[0].chave].append((cs[0], p))

    ligadas: dict[int, dict[ChaveTse, tuple[CandidaturaTse, int]]] = {ano: {} for ano in arquivos}
    for (ano, chave), pares in propostas.items():
        if len(pares) == 1:
            c, pessoa = pares[0]
            ligadas[ano][chave] = c, pessoa.id
        else:
            for _, pessoa in pares:
                contagens[ano][pessoa.casa]["em_conflito"] += 1
    return ligadas


def _gravar_em_lotes(s: Session, modelo, chave: tuple[str, ...], valores: list[dict]) -> None:
    for lote in batched(valores, 500, strict=False):
        comando = insert(modelo).values(lote)
        s.execute(
            comando.on_conflict_do_update(
                index_elements=chave,
                set_={campo: comando.excluded[campo] for campo in lote[0] if campo not in chave},
            )
        )


def _travar_ano(s: Session, ano: int) -> None:
    # Serializa as substituições do mesmo ano, inclusive em duas chamadas locais ao CLI.
    s.execute(select(func.pg_advisory_xact_lock(func.hashtext("mandatometro.coleta.tse"), ano)))


def _gravar_candidaturas(
    criar_sessao: Callable[[], Session],
    ano: int,
    instante: datetime,
    pares: dict[ChaveTse, tuple[CandidaturaTse, int]],
    parlamentares: list[EmExercicio],
    *,
    reconciliar: bool,
) -> None:
    with criar_sessao() as s, s.begin():
        _travar_ano(s, ano)
        fonte = registrar_fonte(s, Resposta(url_arquivo(CANDIDATURAS, ano), instante, None))
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
        _gravar_em_lotes(s, Candidatura, _CHAVE_CANDIDATURA, valores)
        if reconciliar:
            # Retira vínculos revistos com os dois arquivos íntegros. Preserva o histórico de
            # quem já deixou o exercício e as chaves e IDs dos pares que se confirmaram.
            recorte = [
                and_(
                    Candidatura.cargo.in_(cargos),
                    Candidatura.parlamentar_id.in_([p.id for p in parlamentares if p.casa == casa]),
                )
                for casa, cargos in CARGOS_POR_CASA.items()
            ]
            s.execute(
                delete(Candidatura).where(
                    Candidatura.ano == ano,
                    or_(*recorte),
                    tuple_(Candidatura.codigo_eleicao, Candidatura.id_externo).not_in(list(pares)),
                )
            )


def _gravar_links(
    criar_sessao: Callable[[], Session],
    cliente: httpx2.Client,
    diretorio: Path | None,
    ano: int,
    parlamentares: list[EmExercicio],
    resumo: ResumoArquivo,
) -> int:
    with abrir_zip(REDES, ano, diretorio, cliente) as arq:
        observacao = Resposta(url_arquivo(REDES, ano), datetime.now(UTC), None)
        with criar_sessao() as s, s.begin():
            _travar_ano(s, ano)
            linhas = s.execute(
                select(
                    Candidatura.codigo_eleicao,
                    Candidatura.id_externo,
                    Candidatura.id,
                    Candidatura.uf,
                ).where(
                    Candidatura.ano == ano,
                    Candidatura.cargo.in_(CARGOS),
                    Candidatura.parlamentar_id.in_([p.id for p in parlamentares]),
                )
            )
            candidaturas = {(eleicao, sq): (id_, uf) for eleicao, sq, id_, uf in linhas}
            links = ler_links(arq, ano, candidaturas, resumo.descartes)
            fonte = registrar_fonte(s, observacao)
            if resumo.descartes["linha_invalida"] == 0:
                s.execute(
                    delete(LinkCandidatura).where(
                        LinkCandidatura.candidatura_id.in_(
                            [id_ for id_, _ in candidaturas.values()]
                        )
                    )
                )
            else:
                # Mesmo num arquivo parcial, um URL observado pode ter mudado de ordem.
                for lote in batched(links, 500, strict=False):
                    s.execute(
                        delete(LinkCandidatura).where(
                            tuple_(LinkCandidatura.candidatura_id, LinkCandidatura.url).in_(
                                [(id_, url) for id_, _, url in lote]
                            )
                        )
                    )
            _gravar_em_lotes(
                s,
                LinkCandidatura,
                ("candidatura_id", "ordem"),
                [
                    {"candidatura_id": id_, "ordem": ordem, "url": url, "fonte_id": fonte.id}
                    for id_, ordem, url in links
                ],
            )
    return len(links)


def _coletar(
    diretorio: Path | None,
    cliente: httpx2.Client,
    criar_sessao: Callable[[], Session],
    contagens: dict[int, dict[str, dict[str, int]]],
    resumos: dict[int, dict[str, ResumoArquivo]],
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
    for ano in ANOS:
        resumo = resumos[ano][CANDIDATURAS]
        try:
            with abrir_zip(CANDIDATURAS, ano, diretorio, cliente) as arq:
                lidas = ler_candidaturas(arq, ano, resumo.descartes)
            candidaturas[ano] = lidas
            instantes[ano] = datetime.now(UTC)
        except Exception as erro:
            resumo.registrar_falha(erro)

    ligadas = _ligar(em_exercicio, candidaturas, contagens)
    reconciliar = len(candidaturas) == len(ANOS) and all(
        resumos[ano][CANDIDATURAS].descartes["linha_invalida"] == 0 for ano in ANOS
    )
    for ano in ANOS:
        if ano in ligadas:
            resumo = resumos[ano][CANDIDATURAS]
            try:
                _gravar_candidaturas(
                    criar_sessao,
                    ano,
                    instantes[ano],
                    ligadas[ano],
                    em_exercicio,
                    reconciliar=reconciliar,
                )
            except Exception as erro:
                resumo.registrar_falha(erro)
            else:
                resumo.gravados, resumo.fontes = len(ligadas[ano]), 1
                for c, _ in ligadas[ano].values():
                    contagens[ano][CASA_POR_CARGO[c.cargo]]["ligados"] += 1

        resumo = resumos[ano][REDES]
        try:
            resumo.gravados = _gravar_links(
                criar_sessao, cliente, diretorio, ano, em_exercicio, resumo
            )
        except Exception as erro:
            resumo.registrar_falha(erro)
        else:
            resumo.fontes = 1


def _executar(args: argparse.Namespace) -> int:
    comeco = time.monotonic()
    contagens = {
        ano: {
            casa: dict.fromkeys(("ligados", "sem_par", "em_conflito", "derrubados_pela_trava"), 0)
            for casa in CARGOS_POR_CASA
        }
        for ano in ANOS
    }
    resumos = {ano: {tipo: ResumoArquivo() for tipo in (CANDIDATURAS, REDES)} for ano in ANOS}
    falhas_gerais = 0
    try:
        with httpx2.Client(timeout=30.0) as cliente:
            _coletar(args.diretorio_zips, cliente, sessao, contagens, resumos)
    except Exception:
        # Exceções do driver, do CSV ou da rede podem carregar valores da fonte.
        falhas_gerais = 1
    completa = falhas_gerais == 0 and all(
        not a.falhas for r in resumos.values() for a in r.values()
    )
    print(
        json.dumps(
            {
                "completa": completa,
                "falhas_gerais": falhas_gerais,
                "duracao_s": round(time.monotonic() - comeco, 3),
                "anos": {
                    ano: {
                        **contagens[ano],
                        "arquivos": {tipo: vars(a) for tipo, a in resumos[ano].items()},
                    }
                    for ano in ANOS
                },
            },
            ensure_ascii=False,
        )
    )
    return 0 if completa else 1


def registrar(casas) -> None:
    parser = casas.add_parser(
        "tse", help="coleta candidaturas de 2022 e 2026 e seus links declarados"
    )
    parser.add_argument(
        "--diretorio-zips", type=Path, help="lê os quatro ZIPs já baixados na pasta"
    )
    parser.set_defaults(rodar=_executar)
