"""Série nominal de bens, ligada às candidaturas confirmadas pela coleta do TSE."""

import json
from argparse import ArgumentParser, Namespace
from collections import Counter, defaultdict
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from functools import partial
from itertools import batched, chain
from pathlib import Path
from time import monotonic
from zipfile import ZipFile

import httpx2
from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from mandatometro.coleta.http import Resposta
from mandatometro.coleta.persistencia import registrar_fonte
from mandatometro.coleta.tse import ANOS as ANOS_ANCORAS
from mandatometro.coleta.tse import ResumoArquivo
from mandatometro.coleta.tse_arquivos import (
    BENS,
    CANDIDATURAS,
    ArquivoInvalido,
    abrir_zip,
    url_arquivo,
)
from mandatometro.coleta.tse_bens_arquivos import (
    CandidaturaLida,
    ChavePatrimonio,
    TotaisPorTipo,
    ler_bens,
    ler_candidaturas_patrimonio,
)
from mandatometro.db import sessao
from mandatometro.db.modelos import BemDeclarado, Candidatura, CandidaturaPatrimonio

ANOS = (2006, 2010, 2014, 2018, *ANOS_ANCORAS)
_CHAVE = ("ano", "codigo_eleicao", "uf", "id_externo")

type ChaveDaSerie = tuple[int, ChavePatrimonio]
type Ancoras = dict[ChaveDaSerie, int]
type Historico = dict[ChaveDaSerie, tuple[int, int]]  # Parlamentar e fonte de bens vigente.


@dataclass(repr=False)
class CargaAno:
    ligadas: dict[ChavePatrimonio, tuple[int, int]] = field(default_factory=dict)
    valores: dict[ChavePatrimonio, TotaisPorTipo | None] = field(default_factory=dict)
    contagens: Counter[str] = field(default_factory=Counter)
    instantes: dict[str, datetime] = field(default_factory=dict)
    arquivos: dict[str, ResumoArquivo] = field(
        default_factory=lambda: {tipo: ResumoArquivo() for tipo in (CANDIDATURAS, BENS)}
    )

    def resumo(self):
        return {
            **self.contagens,
            "candidaturas": {
                **self.arquivos[CANDIDATURAS].descartes,
                "falhas": self.arquivos[CANDIDATURAS].falhas,
            },
            "bens": {
                **self.arquivos[BENS].descartes,
                "falhas": self.arquivos[BENS].falhas,
            },
        }


def _vinculos(s: Session) -> tuple[Ancoras, Historico]:
    ancoras = {
        (ano, (eleicao, uf, externo)): dono
        for ano, eleicao, uf, externo, dono in s.execute(
            select(
                Candidatura.ano,
                Candidatura.codigo_eleicao,
                Candidatura.uf,
                Candidatura.id_externo,
                Candidatura.parlamentar_id,
            ).where(Candidatura.ano.in_(ANOS_ANCORAS))
        )
    }
    modelo = CandidaturaPatrimonio
    historico = {
        (ano, (eleicao, uf, externo)): (dono, fonte)
        for ano, eleicao, uf, externo, dono, fonte in s.execute(
            select(
                modelo.ano,
                modelo.codigo_eleicao,
                modelo.uf,
                modelo.id_externo,
                modelo.parlamentar_id,
                modelo.fonte_bens_id,
            ).where(modelo.ano.in_(ANOS))
        )
    }
    return ancoras, historico


def _ler[T](
    ano: int,
    tipo: str,
    carga: CargaAno,
    diretorio: Path | None,
    cliente: httpx2.Client,
    ler: Callable[[ZipFile, int, Counter[str]], T],
) -> T:
    arquivo = carga.arquivos[tipo]
    try:
        with abrir_zip(ano, diretorio, cliente, tipo=tipo) as zip_:
            dados = ler(zip_, ano, arquivo.descartes)
        carga.instantes[tipo] = datetime.now(UTC)
    except Exception as erro:
        arquivo.registrar_falha(erro)
        raise
    return dados


def _cpfs_das_ancoras(
    ancoras: Ancoras,
    recentes: dict[int, dict[ChavePatrimonio, CandidaturaLida]],
    resumo: Counter[str],
) -> dict[int, str]:
    cpfs = defaultdict(set)
    pessoas_por_cpf = defaultdict(set)
    for (ano, chave), pessoa in ancoras.items():
        candidatura = recentes[ano].get(chave)
        if candidatura and candidatura.cpf:
            cpfs[pessoa].add(candidatura.cpf)
            pessoas_por_cpf[candidatura.cpf].add(pessoa)
        else:
            resumo["candidaturas_sem_cpf"] += 1

    pessoas = set(ancoras.values())
    resumo["sem_cpf"] = len(pessoas - cpfs.keys())
    identidades = {}
    for pessoa, documentos in cpfs.items():
        if len(documentos) == 1 and len(pessoas_por_cpf[cpf := next(iter(documentos))]) == 1:
            identidades[pessoa] = cpf
        else:
            resumo["em_conflito"] += 1
    return identidades


def _ligar_candidaturas(
    cargas: dict[int, CargaAno],
    ancoras: Ancoras,
    historico: Historico,
    resumo: Counter[str],
    ler: Callable[[int], dict[ChavePatrimonio, CandidaturaLida]],
) -> None:
    recentes = {ano: ler(ano) for ano in ANOS_ANCORAS}
    cpfs = _cpfs_das_ancoras(ancoras, recentes, resumo)
    por_cpf = {cpf: pessoa for pessoa, cpf in cpfs.items()}

    donos = defaultdict(set)
    por_pessoa = defaultdict(set)
    for (ano, chave), pessoa in chain(
        ancoras.items(), ((k, dono) for k, (dono, _) in historico.items())
    ):
        donos[ano, chave].add(pessoa)
        por_pessoa[ano, pessoa].add(chave)

    passadas = defaultdict(dict)
    for (ano, chave), (pessoa, _) in historico.items():
        passadas[ano][chave] = pessoa

    nao_confirmadas = set()
    for ano, carga in cargas.items():
        candidaturas = recentes.pop(ano) if ano in recentes else ler(ano)
        for chave, pessoa in passadas[ano].items():
            anterior = candidaturas.get(chave)
            if pessoa in cpfs and (anterior is None or anterior.cpf != cpfs[pessoa]):
                nao_confirmadas.add(pessoa)

        alcancadas = defaultdict(list)
        for chave, candidatura in candidaturas.items():
            if candidatura.cpf in por_cpf:
                alcancadas[por_cpf[candidatura.cpf]].append((chave, candidatura.cargo))
        for pessoa, registros in alcancadas.items():
            chave, cargo = registros[0]
            if (
                len(registros) > 1
                or donos[ano, chave] - {pessoa}
                or por_pessoa[ano, pessoa] - {chave}
            ):
                carga.contagens["em_conflito"] += 1
            else:
                carga.ligadas[chave] = pessoa, cargo

    ancora_confirmada = {
        pessoa
        for (ano, chave), pessoa in ancoras.items()
        if chave in cargas[ano].ligadas and cargas[ano].ligadas[chave][0] == pessoa
    }
    resumo["sem_ancora_unica"] = len(cpfs.keys() - ancora_confirmada)
    resumo["vinculos_nao_confirmados"] = len(nao_confirmadas)
    aptas = ancora_confirmada - nao_confirmadas
    for carga in cargas.values():
        carga.ligadas = {
            chave: (pessoa, cargo)
            for chave, (pessoa, cargo) in carga.ligadas.items()
            if pessoa in aptas
        }


def _gravar_ano(s: Session, ano: int, carga: CargaAno, historico: Historico) -> tuple[int, int]:
    candidaturas = [
        (chave, pessoa, cargo)
        for chave, (pessoa, cargo) in carga.ligadas.items()
        if (ano, chave) not in historico or carga.valores.get(chave, {}) is not None
    ]
    if not candidaturas:
        return 0, 0

    fonte_cand = registrar_fonte(s, Resposta(url_arquivo(ano), carga.instantes[CANDIDATURAS], None))
    fonte_bens = registrar_fonte(s, Resposta(url_arquivo(ano, BENS), carga.instantes[BENS], None))
    valores = [
        {
            "ano": ano,
            "codigo_eleicao": eleicao,
            "uf": uf,
            "id_externo": externo,
            "cargo": cargo,
            "parlamentar_id": pessoa,
            "fonte_candidatura_id": fonte_cand.id,
            "fonte_bens_id": fonte_bens.id,
        }
        for (eleicao, uf, externo), pessoa, cargo in candidaturas
    ]
    modelo = CandidaturaPatrimonio
    ids = {}
    for lote in batched(valores, 500, strict=False):
        comando = insert(modelo).values(lote)
        linhas = s.execute(
            comando.on_conflict_do_update(
                index_elements=_CHAVE,
                set_={
                    coluna: comando.excluded[coluna]
                    for coluna in ("cargo", "fonte_candidatura_id", "fonte_bens_id")
                },
                where=modelo.parlamentar_id == comando.excluded.parlamentar_id,
            ).returning(modelo.codigo_eleicao, modelo.uf, modelo.id_externo, modelo.id)
        ).all()
        if len(linhas) != len(lote):
            raise ArquivoInvalido("A titularidade de uma candidatura mudou durante a carga.")
        ids.update({(eleicao, uf, externo): id_ for eleicao, uf, externo, id_ in linhas})

    s.execute(delete(BemDeclarado).where(BemDeclarado.candidatura_id.in_(ids.values())))
    totais = [
        {"candidatura_id": id_, "tipo": tipo, "valor_centavos": total}
        for chave, id_ in ids.items()
        for tipo, total in (carga.valores.get(chave) or {}).items()
    ]
    if totais:
        s.execute(insert(BemDeclarado), totais)
    return len(ids), len(totais)


def _coletar(
    diretorio: Path | None,
    cliente: httpx2.Client,
    cargas: dict[int, CargaAno],
    resumo_ancoras: Counter[str],
) -> None:
    with sessao() as s:
        ancoras, historico = _vinculos(s)
    if not ancoras:
        raise ArquivoInvalido("Carregue as candidaturas antes dos bens do TSE.")

    def ler_candidaturas(ano):
        return _ler(
            ano,
            CANDIDATURAS,
            cargas[ano],
            diretorio,
            cliente,
            ler_candidaturas_patrimonio,
        )

    _ligar_candidaturas(cargas, ancoras, historico, resumo_ancoras, ler_candidaturas)
    for ano, carga in cargas.items():
        carga.valores = _ler(
            ano,
            BENS,
            carga,
            diretorio,
            cliente,
            partial(ler_bens, chaves=set(carga.ligadas)),
        )

    with sessao() as s, s.begin():
        # A mesma chave e ordem da coleta das candidaturas serializam os dois comandos.
        for ano in ANOS_ANCORAS:
            s.execute(
                select(func.pg_advisory_xact_lock(func.hashtext("mandatometro.coleta.tse"), ano))
            )
        if _vinculos(s) != (ancoras, historico):
            raise ArquivoInvalido("Os vínculos mudaram durante a leitura dos arquivos.")
        gravacoes = {ano: _gravar_ano(s, ano, carga, historico) for ano, carga in cargas.items()}
    for ano, (candidaturas, totais) in gravacoes.items():
        cargas[ano].contagens.update(candidaturas_gravadas=candidaturas, totais_gravados=totais)


def _executar(args: Namespace) -> int:
    inicio = monotonic()
    cargas = {ano: CargaAno() for ano in ANOS}
    resumo_ancoras = Counter()
    geral = ResumoArquivo()
    try:
        with httpx2.Client(timeout=30.0) as cliente:
            _coletar(args.diretorio_zips, cliente, cargas, resumo_ancoras)
    except Exception as erro:
        # Erros de rede, CSV e SQL não são impressos, pois podem incluir dados da fonte.
        geral.registrar_falha(erro)
    completa = not geral.falhas
    print(
        json.dumps(
            {
                "completa": completa,
                "duracao_s": round(monotonic() - inicio, 3),
                "falhas": geral.falhas,
                "ancoras": resumo_ancoras,
                "anos": {ano: carga.resumo() for ano, carga in cargas.items()},
            }
        )
    )
    return 0 if completa else 1


def registrar(casas) -> None:
    parser: ArgumentParser = casas.add_parser(
        "bens-tse", help="coleta bens das eleições gerais de 2006 a 2026"
    )
    parser.add_argument("--diretorio-zips", type=Path, help="lê os ZIPs já baixados na pasta")
    parser.set_defaults(rodar=_executar)
