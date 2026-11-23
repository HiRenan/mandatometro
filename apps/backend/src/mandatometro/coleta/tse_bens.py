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

from mandatometro.coleta import tse
from mandatometro.coleta.http import Resposta
from mandatometro.coleta.persistencia import registrar_fonte
from mandatometro.coleta.tse import ANOS as ANOS_ANCORAS
from mandatometro.coleta.tse import ResumoArquivo
from mandatometro.coleta.tse_arquivos import (
    BENS,
    CANDIDATURAS,
    ArquivoInvalido,
    CandidaturaTse,
    abrir_zip,
    url_arquivo,
)
from mandatometro.coleta.tse_bens_arquivos import (
    RESULTADOS_POR_TEXTO,
    CandidaturaLida,
    ChavePatrimonio,
    TotaisPorTipo,
    ler_bens,
    ler_candidaturas_patrimonio,
    ler_candidaturas_recentes,
)
from mandatometro.db import sessao
from mandatometro.db.modelos import BemDeclarado, Candidatura, CandidaturaPatrimonio

ANOS = (2006, 2010, 2014, 2018, *ANOS_ANCORAS)
_CHAVE = ("ano", "codigo_eleicao", "uf", "id_externo")

type ChaveDaSerie = tuple[int, ChavePatrimonio]
type Ancoras = dict[ChaveDaSerie, int]
type Historico = dict[ChaveDaSerie, tuple[int, int, int]]  # Parlamentar e as duas fontes vigentes.


@dataclass(frozen=True, repr=False)
class Vinculos:
    ancoras: Ancoras
    historico: Historico
    em_exercicio: frozenset[tse.EmExercicio]


@dataclass(repr=False)
class CargaAno:
    # Parlamentar, cargo e texto do último turno.
    ligadas: dict[ChavePatrimonio, tuple[int, int, str]] = field(default_factory=dict)
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


def _vinculos(s: Session) -> Vinculos:
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
        (ano, (eleicao, uf, externo)): (dono, fonte_cand, fonte_bens)
        for ano, eleicao, uf, externo, dono, fonte_cand, fonte_bens in s.execute(
            select(
                modelo.ano,
                modelo.codigo_eleicao,
                modelo.uf,
                modelo.id_externo,
                modelo.parlamentar_id,
                modelo.fonte_candidatura_id,
                modelo.fonte_bens_id,
            ).where(modelo.ano.in_(ANOS))
        )
    }
    return Vinculos(ancoras, historico, frozenset(tse._em_exercicio(s)))


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
    confirmadas: Ancoras,
    recentes: dict[int, dict[ChavePatrimonio, CandidaturaLida]],
    resumo: Counter[str],
) -> dict[int, str]:
    cpfs = defaultdict(set)
    com_cpf_confirmado = set()
    for (ano, chave), pessoa in ancoras.items():
        candidatura = recentes[ano].get(chave)
        if candidatura and candidatura.cpf:
            cpfs[pessoa].add(candidatura.cpf)
            if (ano, chave) in confirmadas:
                com_cpf_confirmado.add(pessoa)
        else:
            resumo["candidaturas_sem_cpf"] += 1

    resumo["sem_cpf"] = len(set(confirmadas.values()) - com_cpf_confirmado)
    identidades = {}
    for pessoa in com_cpf_confirmado:
        documentos = cpfs[pessoa]
        if len(documentos) == 1:
            identidades[pessoa] = next(iter(documentos))
        else:
            resumo["em_conflito"] += 1
    return identidades


def _confirmar_ancoras(
    vinculos: Vinculos, arquivos: dict[int, list[CandidaturaTse]], resumo: Counter[str]
) -> Ancoras:
    donos = {
        (ano, (eleicao, externo)): pessoa
        for (ano, (eleicao, _uf, externo)), pessoa in vinculos.ancoras.items()
    }
    ligacao = tse._ligar(vinculos.em_exercicio, arquivos, donos)
    confirmadas = {}
    for ano, pares in ligacao.ligadas.items():
        for (eleicao, externo), (candidatura, pessoa) in pares.items():
            chave = (ano, (eleicao, candidatura.uf, externo))
            if vinculos.ancoras.get(chave) == pessoa and pessoa not in ligacao.conflitos:
                confirmadas[chave] = pessoa

    titulares = set(vinculos.ancoras.values()) | {
        dono for dono, _, _ in vinculos.historico.values()
    }
    resumo["sem_ancora_valida"] = len(titulares - set(confirmadas.values()))
    resumo["em_conflito_na_ligacao"] = len(titulares & ligacao.conflitos)
    return confirmadas


def _ligar_candidaturas(
    cargas: dict[int, CargaAno],
    vinculos: Vinculos,
    confirmadas: Ancoras,
    resumo: Counter[str],
    ler: Callable[[int], dict[ChavePatrimonio, CandidaturaLida]],
) -> None:
    recentes = {ano: ler(ano) for ano in ANOS_ANCORAS}
    cpfs = _cpfs_das_ancoras(vinculos.ancoras, confirmadas, recentes, resumo)
    cpfs_que_ligam = set(cpfs.values())

    donos = defaultdict(set)
    por_pessoa = defaultdict(set)
    for (ano, chave), pessoa in chain(
        vinculos.ancoras.items(), ((k, dono) for k, (dono, _, _) in vinculos.historico.items())
    ):
        donos[ano, chave].add(pessoa)
        por_pessoa[ano, pessoa].add(chave)

    passadas = defaultdict(dict)
    for (ano, chave), (pessoa, _, _) in vinculos.historico.items():
        passadas[ano][chave] = pessoa

    nao_confirmadas = set()
    reivindicacoes = defaultdict(set)
    for ano, carga in cargas.items():
        candidaturas = recentes.pop(ano) if ano in recentes else ler(ano)
        for chave, pessoa in passadas[ano].items():
            anterior = candidaturas.get(chave)
            if pessoa in cpfs and (anterior is None or anterior.cpf != cpfs[pessoa]):
                nao_confirmadas.add(pessoa)

        alcancadas = defaultdict(list)
        for chave, candidatura in candidaturas.items():
            cpf = candidatura.cpf
            if cpf is not None and (titulares := donos.get((ano, chave))):
                # Uma ficha gravada é evidência de disputa mesmo sem âncora válida.
                reivindicacoes[cpf].update(titulares)
            if cpf in cpfs_que_ligam:
                alcancadas[cpf].append((chave, candidatura))

        for pessoa, cpf in cpfs.items():
            registros = alcancadas.get(cpf)
            if not registros:
                continue
            # O TSE pode trocar CD_ELEICAO entre turnos da mesma disputa.
            if len(registros) > 1 and (
                len({(uf, externo, ficha.cargo) for (_, uf, externo), ficha in registros}) > 1
                or len({ficha.turno for _, ficha in registros}) != len(registros)
            ):
                carga.contagens["cpf_repetido"] += 1
                carga.contagens["em_conflito"] += 1
                continue
            anteriores = por_pessoa[ano, pessoa]
            chave, candidatura = min(
                registros, key=lambda par: (par[0] not in anteriores, par[1].turno)
            )
            if anteriores - {chave}:
                carga.contagens["em_conflito"] += 1
            else:
                _, ultimo = max(registros, key=lambda par: par[1].turno)
                carga.ligadas[chave] = pessoa, candidatura.cargo, ultimo.situacao_turno

    ancora_confirmada = {
        pessoa
        for (ano, chave), pessoa in confirmadas.items()
        if chave in cargas[ano].ligadas and cargas[ano].ligadas[chave][0] == pessoa
    }
    conflitos_da_cadeia = {
        pessoa
        for titulares in chain(donos.values(), reivindicacoes.values())
        if len(titulares) > 1
        for pessoa in titulares
    }
    resumo["sem_ancora_unica"] = len(cpfs.keys() - ancora_confirmada)
    resumo["vinculos_nao_confirmados"] = len(nao_confirmadas)
    resumo["em_conflito_na_cadeia"] = len(conflitos_da_cadeia)
    aptas = ancora_confirmada - nao_confirmadas - conflitos_da_cadeia
    for carga in cargas.values():
        carga.ligadas = {
            chave: registro for chave, registro in carga.ligadas.items() if registro[0] in aptas
        }


def _gravar_ano(s: Session, ano: int, carga: CargaAno, historico: Historico) -> tuple[int, int]:
    if not carga.ligadas:
        return 0, 0

    fontes_preservadas = {
        chave: fonte
        for (ano_anterior, chave), (_, _, fonte) in historico.items()
        if ano_anterior == ano and chave in carga.ligadas and carga.valores.get(chave, {}) is None
    }
    fonte_cand = registrar_fonte(s, Resposta(url_arquivo(ano), carga.instantes[CANDIDATURAS], None))
    fonte_bens_id = None
    if len(fontes_preservadas) < len(carga.ligadas):
        fonte_bens_id = registrar_fonte(
            s, Resposta(url_arquivo(ano, BENS), carga.instantes[BENS], None)
        ).id
    valores = []
    for (eleicao, uf, externo), (pessoa, cargo, texto) in carga.ligadas.items():
        resultado = RESULTADOS_POR_TEXTO.get(texto, "outro")
        valores.append(
            {
                "ano": ano,
                "codigo_eleicao": eleicao,
                "uf": uf,
                "id_externo": externo,
                "cargo": cargo,
                "resultado": resultado,
                "resultado_bruto": texto if resultado == "outro" else None,
                "parlamentar_id": pessoa,
                "fonte_candidatura_id": fonte_cand.id,
                "fonte_bens_id": fontes_preservadas.get((eleicao, uf, externo), fonte_bens_id),
            }
        )
    modelo = CandidaturaPatrimonio
    ids = {}
    for lote in batched(valores, 500, strict=False):
        comando = insert(modelo).values(lote)
        linhas = s.execute(
            comando.on_conflict_do_update(
                index_elements=_CHAVE,
                set_={
                    coluna: comando.excluded[coluna]
                    for coluna in (
                        "cargo",
                        "resultado",
                        "resultado_bruto",
                        "fonte_candidatura_id",
                        "fonte_bens_id",
                    )
                },
                where=modelo.parlamentar_id == comando.excluded.parlamentar_id,
            ).returning(modelo.codigo_eleicao, modelo.uf, modelo.id_externo, modelo.id)
        ).all()
        if len(linhas) != len(lote):
            raise ArquivoInvalido("A titularidade de uma candidatura mudou durante a carga.")
        ids.update(
            {
                (eleicao, uf, externo): id_
                for eleicao, uf, externo, id_ in linhas
                if (eleicao, uf, externo) not in fontes_preservadas
            }
        )

    if ids:
        s.execute(delete(BemDeclarado).where(BemDeclarado.candidatura_id.in_(ids.values())))
    totais = [
        {"candidatura_id": id_, "tipo": tipo, "valor_centavos": total}
        for chave, id_ in ids.items()
        for tipo, total in (carga.valores.get(chave) or {}).items()
    ]
    if totais:
        s.execute(insert(BemDeclarado), totais)
    return len(valores), len(totais)


def _coletar(
    diretorio: Path | None,
    cliente: httpx2.Client,
    cargas: dict[int, CargaAno],
    resumo_ancoras: Counter[str],
) -> None:
    with sessao() as s:
        vinculos = _vinculos(s)
    if not vinculos.ancoras:
        raise ArquivoInvalido("Carregue as candidaturas antes dos bens do TSE.")

    def ler_consulta(ano, leitor):
        return _ler(
            ano,
            CANDIDATURAS,
            cargas[ano],
            diretorio,
            cliente,
            leitor,
        )

    recentes = {ano: ler_consulta(ano, ler_candidaturas_recentes) for ano in ANOS_ANCORAS}
    confirmadas = _confirmar_ancoras(
        vinculos, {ano: nominais for ano, (_, nominais) in recentes.items()}, resumo_ancoras
    )

    def ler_candidaturas(ano):
        if ano in recentes:
            lidas, _ = recentes.pop(ano)
            return lidas
        return ler_consulta(ano, ler_candidaturas_patrimonio)

    _ligar_candidaturas(cargas, vinculos, confirmadas, resumo_ancoras, ler_candidaturas)
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
        if _vinculos(s) != vinculos:
            raise ArquivoInvalido("Os vínculos mudaram durante a leitura dos arquivos.")
        gravacoes = {
            ano: _gravar_ano(s, ano, carga, vinculos.historico) for ano, carga in cargas.items()
        }
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
