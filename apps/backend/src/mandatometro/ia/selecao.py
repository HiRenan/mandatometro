"""Seleção determinística de votações e bases dos itens da edição."""

import hashlib
import json
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from urllib.parse import urlsplit

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from mandatometro.db.modelos import Ato, Fonte, Parlamentar, Proposicao, Votacao, Voto
from mandatometro.ia.esquemas import Fatos, FatosAto, FatoVotacao, Placar
from mandatometro.ia.privacidade import assunto_pessoal

PROCEDIMENTAIS = {"REQ", "REC", "DTQ"}
VALORES = tuple(Placar.model_fields)


@dataclass
class ResumoSelecao:
    votacoes_no_banco: int = 0
    grupos: int = 0
    selecionadas: list[str] = field(default_factory=list)
    sem_proposicao: list[str] = field(default_factory=list)
    sem_pagina_publica: list[str] = field(default_factory=list)
    assunto_pessoal: int = 0
    cortadas_pelo_teto: list[str] = field(default_factory=list)


@dataclass
class ItemBase:
    votacoes: list[Votacao] = field(repr=False)
    proposicoes: list[Proposicao] = field(repr=False)
    principal: Fonte = field(repr=False)
    fatos: Fatos


@dataclass
class ItemAtoBase:
    principal: Fonte = field(repr=False)
    fatos: FatosAto

    @classmethod
    def de_ato(cls, ato: Ato) -> "ItemAtoBase":
        # Detecta alterações nos demais campos da linha sem copiar texto oficial para os fatos.
        dados = (
            ato.origem,
            ato.id_externo,
            ato.tipo,
            ato.titulo,
            ato.ementa,
            ato.data_assinatura.isoformat() if ato.data_assinatura else None,
            ato.secao,
            ato.orgao,
            ato.numero,
        )
        return cls(
            principal=ato.fonte,
            fatos=FatosAto(
                versao=2,
                ato_id=ato.id,
                data_publicacao=ato.data_publicacao,
                fontes=[ato.fonte_id],
                hash_ato=hashlib.sha256(json.dumps(dados).encode()).hexdigest(),
            ),
        )


@dataclass
class Selecao:
    itens: list[ItemBase | ItemAtoBase]
    resumo: ResumoSelecao
    nomes: list[str] = field(repr=False)


def pagina_publica(fonte: Fonte) -> bool:
    try:
        url = fonte.url_publica or ""
        partes = urlsplit(url)
        host = partes.hostname or ""
        return (
            partes.scheme == "https"
            and partes.username is None
            and partes.password is None
            and not any(c.isspace() or ord(c) < 32 for c in url)
            and any(host == d or host.endswith("." + d) for d in ("leg.br", "gov.br"))
            and fonte.coletado_em is not None
        )
    except ValueError:
        return False


def chave_votacao(votacao: Votacao) -> tuple:
    # As duas coletas validam identificadores numéricos, com sequencial na Câmara.
    return votacao.data, tuple(int(parte) for parte in votacao.id_externo.split("-"))


def identificador(votacao: Votacao) -> str:
    return f"{votacao.casa}:{votacao.id_externo}"


def selecionar(sessao: Session, inicio: date, fim: date, *, teto: int = 8) -> Selecao:
    if type(teto) is not int or teto < 1 or inicio > fim:
        raise ValueError("Confira o período e informe um teto maior que zero.")
    votacoes = list(
        sessao.scalars(
            select(Votacao)
            .where(Votacao.data.between(inicio, fim))
            .options(
                joinedload(Votacao.fonte),
                selectinload(Votacao.proposicoes).joinedload(Proposicao.fonte),
            )
            .order_by(Votacao.casa, Votacao.id_externo)
        )
    )
    nomes = list(sessao.scalars(select(Parlamentar.nome)))
    resumo = ResumoSelecao(votacoes_no_banco=len(votacoes))
    elegiveis = []
    for v in votacoes:
        siglas = [p.sigla for p in v.proposicoes]
        if any(
            assunto_pessoal(t, nomes, siglas=siglas)
            for t in [v.descricao, *(p.ementa or "" for p in v.proposicoes)]
        ):
            resumo.assunto_pessoal += 1
        elif not v.proposicoes:
            resumo.sem_proposicao.append(identificador(v))
        elif not pagina_publica(v.fonte) and not any(
            pagina_publica(p.fonte) for p in v.proposicoes
        ):
            resumo.sem_pagina_publica.append(identificador(v))
        else:
            elegiveis.append(v)

    contagens = defaultdict(dict)
    fontes_votos = defaultdict(set)
    for votacao_id, valor, fonte_id, quantidade in sessao.execute(
        select(Voto.votacao_id, Voto.valor, Voto.fonte_id, func.count())
        .where(Voto.votacao_id.in_([v.id for v in elegiveis]), Voto.valor.in_(VALORES))
        .group_by(Voto.votacao_id, Voto.valor, Voto.fonte_id)
    ):
        contagens[votacao_id][valor] = contagens[votacao_id].get(valor, 0) + quantidade
        fontes_votos[votacao_id].add(fonte_id)

    # Componentes conexos: A, A+B e B formam um grupo; Casas nunca compartilham uma chave.
    pais = {}

    def raiz(chave):
        pais.setdefault(chave, chave)
        while pais[chave] != chave:
            pais[chave] = pais[pais[chave]]
            chave = pais[chave]
        return chave

    for v in elegiveis:
        chaves = [(v.casa, p.id) for p in v.proposicoes]
        for chave in chaves:
            pais[raiz(chave)] = raiz(chaves[0])
    grupos = defaultdict(list)
    for v in elegiveis:
        grupos[raiz((v.casa, v.proposicoes[0].id))].append(v)

    itens = []
    for grupo in grupos.values():
        grupo.sort(key=chave_votacao)
        todas = {p.id: p for v in grupo for p in v.proposicoes}
        principais = [p for p in todas.values() if p.sigla not in PROCEDIMENTAIS]
        principais = sorted(principais or todas.values(), key=lambda p: p.id_externo)
        referencia = grupo[-1]
        principal = referencia.fonte
        if not pagina_publica(principal):
            principal = min(
                (p for p in referencia.proposicoes if pagina_publica(p.fonte)),
                key=lambda p: p.id_externo,
            ).fonte
        fatos_votacoes = []
        fontes = {p.fonte_id for p in todas.values()}
        for v in grupo:
            totais = contagens[v.id]
            tem_placar = any(totais.get(valor, 0) for valor in VALORES if valor != "presidente")
            fontes_da_votacao = [v.fonte_id, *sorted(fontes_votos[v.id] - {v.fonte_id})]
            fontes.update(fontes_da_votacao)
            fatos_votacoes.append(
                FatoVotacao(
                    id=v.id,
                    data=v.data,
                    resultado=v.resultado,
                    placar=Placar(**totais) if tem_placar else None,
                    fontes=fontes_da_votacao,
                )
            )
        itens.append(
            ItemBase(
                grupo,
                principais,
                principal,
                Fatos(
                    proposicoes=sorted(todas),
                    votacoes=fatos_votacoes,
                    fontes=sorted(fontes),
                ),
            )
        )
    itens.sort(
        key=lambda item: (
            not any(v.placar is not None for v in item.fatos.votacoes),
            -max(v.data.toordinal() for v in item.votacoes),
            item.votacoes[0].casa,
            min(p.id_externo for p in item.proposicoes),
        )
    )
    resumo.grupos = len(itens)
    resumo.cortadas_pelo_teto = [identificador(v) for item in itens[teto:] for v in item.votacoes]
    resumo.selecionadas = [identificador(v) for item in itens[:teto] for v in item.votacoes]
    return Selecao(itens[:teto], resumo, nomes)
