"""Leitura pública de parlamentares, votos e patrimônio declarado."""

from collections import Counter
from collections.abc import Collection
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal, localcontext
from itertools import groupby
from typing import Annotated, get_args

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from sqlalchemy import and_, any_, func, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.orm import Session, aliased, contains_eager

from mandatometro.api.congresso import (
    ESPACOS_EM_BRANCO,
    IdCongresso,
    RotaCongresso,
    contagem_por_valor,
    dados_da_votacao,
    ordem_alfabetica,
    sigla_do_voto,
    temas_das_votacoes,
    voto_tem_tema,
)
from mandatometro.api.esquemas import (
    UF,
    BiografiaParlamentar,
    CargoPatrimonio,
    Casa,
    ContagemComOPartido,
    CorrecaoIpca,
    DetalheParlamentar,
    EleicaoPatrimonio,
    ErroParlamentar,
    FonteBiografia,
    FontePatrimonio,
    FotoParlamentar,
    ListaParlamentares,
    ListaVotosParlamentar,
    MandatoPublico,
    ParlamentarPublico,
    PatrimonioParlamentar,
    TemaPublico,
    ValorVotoComparavel,
    VariacaoPatrimonio,
    VotoParlamentar,
)
from mandatometro.db import sessao as sessao_do_banco
from mandatometro.db import sessao_de_leitura_repetivel
from mandatometro.db.modelos import (
    BemDeclarado,
    CandidaturaPatrimonio,
    Fonte,
    IpcaMensal,
    Mandato,
    Parlamentar,
    Partido,
    Votacao,
    Voto,
)
from mandatometro.db.modelos import BiografiaParlamentar as BiografiaGravada
from mandatometro.temas import TemaId
from mandatometro.tse_catalogos import CARGOS_TSE, MAXIMO_CENTAVOS

ORDEM_DOS_VOTOS = (Votacao.data.desc(), Votacao.id.desc())
PISO_PERCENTUAL_CENTAVOS = 5_000_000
VOTOS_COMPARAVEIS = get_args(ValorVotoComparavel)


router = APIRouter(
    prefix="/parlamentares",
    tags=["parlamentares"],
    route_class=RotaCongresso,
    responses={
        422: {"model": ErroParlamentar, "description": "Dados inválidos."},
        503: {"model": ErroParlamentar, "description": "Banco indisponível."},
    },
)


def _partidos_recentes():
    return (
        select(Voto.parlamentar_id, Voto.partido)
        .join(Voto.votacao)
        .ext(distinct_on(Voto.parlamentar_id))
        .order_by(Voto.parlamentar_id, *ORDEM_DOS_VOTOS)
    )


@router.get(
    "",
    summary="Listar os parlamentares em exercício",
    description="Lista completa em ordem alfabética, com filtros opcionais por UF e Casa.",
)
def listar_parlamentares(
    uf: Annotated[UF | None, Query(description="Sigla da UF do mandato em exercício.")] = None,
    casa: Casa | None = None,
) -> ListaParlamentares:
    mandatos = (
        select(Mandato.parlamentar_id, Mandato.uf)
        .where(Mandato.em_exercicio.is_(True))
        .ext(distinct_on(Mandato.parlamentar_id))
        .order_by(Mandato.parlamentar_id, Mandato.legislatura.desc())
        .subquery()
    )
    consulta = select(
        Parlamentar.id, Parlamentar.nome, Parlamentar.casa, Parlamentar.id_externo, mandatos.c.uf
    ).join(mandatos, mandatos.c.parlamentar_id == Parlamentar.id)
    if uf is not None:
        consulta = consulta.where(mandatos.c.uf == uf)
    if casa is not None:
        consulta = consulta.where(Parlamentar.casa == casa)
    atuais = consulta.cte()
    partidos = _partidos_recentes().join(atuais, atuais.c.id == Voto.parlamentar_id).subquery()
    with sessao_do_banco() as sessao:
        linhas = sessao.execute(
            select(atuais, partidos.c.partido).outerjoin(
                partidos, atuais.c.id == partidos.c.parlamentar_id
            )
        )
        return ListaParlamentares(
            parlamentares=sorted(
                (
                    ParlamentarPublico(
                        id=linha.id,
                        nome=linha.nome,
                        casa=linha.casa,
                        uf=linha.uf,
                        partido=linha.partido,
                        foto=_foto_parlamentar(linha.casa, linha.id_externo),
                    )
                    for linha in linhas
                ),
                key=lambda p: ordem_alfabetica(p.nome, p.id),
            )
        )


def _foto_parlamentar(casa: str, codigo: int) -> FotoParlamentar:
    if casa == "camara":
        return FotoParlamentar(
            url=f"https://www.camara.leg.br/internet/deputado/bandep/{codigo}.jpg",
            credito="Câmara dos Deputados",
        )
    return FotoParlamentar(
        url=f"https://legis.senado.leg.br/senadores/fotos-oficiais/{codigo}",
        credito="Senado Federal",
    )


def _biografia_publica(sessao: Session, parlamentar_id: int) -> BiografiaParlamentar | None:
    bio = BiografiaGravada
    registro = sessao.execute(
        select(bio.profissoes, bio.escolaridade, Fonte.url, Fonte.coletado_em)
        .join(Fonte, Fonte.id == func.coalesce(bio.fonte_escolaridade_id, bio.fonte_profissoes_id))
        .where(bio.parlamentar_id == parlamentar_id)
    ).one_or_none()
    if registro is None:
        return None
    return BiografiaParlamentar(
        profissoes=registro.profissoes,
        escolaridade=registro.escolaridade,
        fonte=FonteBiografia(url=registro.url, coletado_em=registro.coletado_em),
    )


def _comparacoes_com_o_partido(
    sessao: Session,
    parlamentar_id: int,
    votacoes: Collection[int] | None = None,
    *,
    tema: TemaId | None = None,
) -> dict[int, tuple[ValorVotoComparavel, bool | None]]:
    colega = aliased(Voto)
    total = func.count().label("total")
    consulta = (
        select(Voto.votacao_id, Voto.valor, colega.valor.label("valor_colega"), total)
        .join(
            colega,
            and_(
                colega.votacao_id == Voto.votacao_id,
                sigla_do_voto(colega.partido) == sigla_do_voto(Voto.partido),
                colega.parlamentar_id != Voto.parlamentar_id,
            ),
        )
        .where(Voto.parlamentar_id == parlamentar_id, colega.valor.in_(VOTOS_COMPARAVEIS))
        .group_by(Voto.votacao_id, Voto.valor, colega.valor)
        .order_by(Voto.votacao_id, total.desc())
    )
    if votacoes is not None:
        # Restringe as duas leituras de voto às votações da página.
        consulta = consulta.where(Voto.votacao_id.in_(votacoes), colega.votacao_id.in_(votacoes))
    if tema is not None:
        consulta = consulta.where(voto_tem_tema(tema))

    comparacoes = {}
    for votacao_id, grupo in groupby(sessao.execute(consulta), key=lambda linha: linha.votacao_id):
        placar = list(grupo)
        primeiro = placar[0]
        if sum(opcao.total for opcao in placar) < 2:
            continue
        if len(placar) > 1 and primeiro.total == placar[1].total:
            continue
        maioria = primeiro.valor_colega
        com_o_partido = primeiro.valor == maioria if primeiro.valor in VOTOS_COMPARAVEIS else None
        comparacoes[votacao_id] = maioria, com_o_partido
    return comparacoes


@router.get(
    "/{id}",
    summary="Ler um parlamentar, seus mandatos e a contagem de votos gravados",
    response_model=DetalheParlamentar,
    responses={404: {"model": ErroParlamentar}},
)
def obter_parlamentar(id: IdCongresso):
    with sessao_de_leitura_repetivel() as sessao:
        parlamentar = sessao.get(Parlamentar, id)
        if parlamentar is None:
            return JSONResponse({"erro": "parlamentar_nao_encontrado"}, status_code=404)

        mandatos = [
            MandatoPublico.model_validate(mandato, from_attributes=True)
            for mandato in sessao.scalars(
                select(Mandato)
                .where(Mandato.parlamentar_id == id)
                .order_by(Mandato.em_exercicio.desc(), Mandato.legislatura.desc())
            )
        ]
        recente = sessao.execute(
            _partidos_recentes().where(Voto.parlamentar_id == id)
        ).one_or_none()
        sigla = recente.partido if recente else None
        partido = sessao.get(Partido, sigla.strip().upper()) if sigla else None
        contagem = dict(
            sessao.execute(
                select(Voto.valor, func.count())
                .where(Voto.parlamentar_id == id)
                .group_by(Voto.valor)
            ).all()
        )
        comparacoes = Counter(
            com_o_partido for _, com_o_partido in _comparacoes_com_o_partido(sessao, id).values()
        )
        return DetalheParlamentar(
            id=parlamentar.id,
            nome=parlamentar.nome,
            casa=parlamentar.casa,
            uf=mandatos[0].uf if mandatos else None,
            partido=sigla,
            partido_nome=partido.nome if partido else None,
            foto=_foto_parlamentar(parlamentar.casa, parlamentar.id_externo),
            biografia=_biografia_publica(sessao, id),
            mandatos=mandatos,
            contagem_votos=contagem_por_valor(contagem),
            com_o_partido=ContagemComOPartido(
                comparaveis=comparacoes[True] + comparacoes[False],
                com_o_partido=comparacoes[True],
                contra=comparacoes[False],
            ),
        )


def _correcao_ipca(sessao: Session) -> tuple[CorrecaoIpca | None, dict[date, Decimal]]:
    registros = sessao.execute(
        select(IpcaMensal.mes, IpcaMensal.variacao_percentual, Fonte.url, Fonte.coletado_em)
        .join(IpcaMensal.fonte)
        .order_by(IpcaMensal.mes.desc())
    ).all()
    if not registros:
        return None, {}

    mes_fim, _, url, coletado_em = registros[0]
    fatores = {}
    esperado = mes_fim
    acumulado = Decimal(1)
    with localcontext() as contexto:
        # Uma taxa NUMERIC(7, 2) gera um fator com até 8 algarismos (1000.9999).
        contexto.prec = 8 * len(registros)
        for mes, variacao, _, _ in registros:
            if mes != esperado:
                break
            acumulado *= 1 + variacao / 100
            fatores[mes] = acumulado
            esperado = (mes - timedelta(days=1)).replace(day=1)

    correcao = CorrecaoIpca(
        indice="IPCA",
        mes_fim=mes_fim.strftime("%Y-%m"),
        fonte=FontePatrimonio(url=url, coletado_em=coletado_em),
    )
    return correcao, fatores


def _total_corrigido(total: int | None, fator: Decimal | None) -> int | None:
    if total is None or fator is None:
        return None
    with localcontext() as contexto:
        contexto.prec = len(str(total)) + len(fator.as_tuple().digits)
        centavos = int((total * fator).to_integral_value(rounding=ROUND_HALF_UP))
    return centavos if centavos <= MAXIMO_CENTAVOS else None


def _indicadores_ipca(fator: Decimal | None) -> tuple[str | None, str | None]:
    if fator is None:
        return None, None
    with localcontext() as contexto:
        digitos = fator.as_tuple()
        # A subtração alinha o 1 à escala do fator, mesmo em uma deflação acumulada.
        contexto.prec = max(len(digitos.digits), 1 - digitos.exponent) + 4
        contexto.rounding = ROUND_HALF_UP
        return f"{fator:.4f}", f"{(fator - 1) * 100:.1f}"


def _variacao_patrimonio(atual: int, anterior: tuple[int, int]) -> VariacaoPatrimonio:
    ano, total_anterior = anterior
    diferenca = atual - total_anterior
    percentual = None
    if total_anterior > PISO_PERCENTUAL_CENTAVOS:
        taxa = Decimal(diferenca) * 100 / total_anterior
        percentual = str(taxa.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP))
    return VariacaoPatrimonio(ano_anterior=ano, diferenca_centavos=diferenca, percentual=percentual)


@router.get(
    "/{id}/patrimonio",
    summary="Listar o patrimônio declarado ao TSE por eleição",
    description="Eleições com vínculo confirmado, em ordem crescente de ano, com os totais "
    "nominais e a correção pelo IPCA quando disponível.",
    response_model=PatrimonioParlamentar,
    responses={404: {"model": ErroParlamentar}},
)
def obter_patrimonio_parlamentar(id: IdCongresso):
    eleicao = CandidaturaPatrimonio
    with sessao_do_banco() as sessao:
        if sessao.get(Parlamentar, id) is None:
            return JSONResponse({"erro": "parlamentar_nao_encontrado"}, status_code=404)
        registros = sessao.execute(
            select(
                eleicao.ano,
                eleicao.cargo,
                eleicao.uf,
                eleicao.resultado,
                func.sum(BemDeclarado.valor_centavos),
                Fonte.url,
                Fonte.coletado_em,
            )
            .select_from(eleicao)
            .join(Fonte, Fonte.id == eleicao.fonte_bens_id)
            .outerjoin(BemDeclarado, BemDeclarado.candidatura_id == eleicao.id)
            .where(eleicao.parlamentar_id == id)
            .group_by(eleicao.id, Fonte.id)
            .order_by(eleicao.ano)
        ).all()
        correcao, fatores = _correcao_ipca(sessao)
        eleicoes = []
        anterior = None
        for ano, cargo, uf, resultado, total, url, coletado_em in registros:
            inicio = date(ano, 10, 1)
            nominal = int(total) if total is not None else None
            fator = fatores.get(inicio)
            corrigido = _total_corrigido(nominal, fator)
            fator_ipca, alta_ipca_percentual = _indicadores_ipca(fator)
            variacao = None
            if corrigido is not None:
                if anterior is not None:
                    variacao = _variacao_patrimonio(corrigido, anterior)
                anterior = ano, corrigido
            eleicoes.append(
                EleicaoPatrimonio(
                    ano=ano,
                    cargo=CargoPatrimonio(
                        codigo=cargo, nome=CARGOS_TSE.get(cargo, "Cargo desconhecido")
                    ),
                    uf=uf,
                    total_centavos=nominal,
                    fonte=FontePatrimonio(url=url, coletado_em=coletado_em),
                    mes_inicio=inicio.strftime("%Y-%m"),
                    total_corrigido_centavos=corrigido,
                    resultado=resultado,
                    fator_ipca=fator_ipca,
                    alta_ipca_percentual=alta_ipca_percentual,
                    variacao=variacao,
                )
            )
        return PatrimonioParlamentar(eleicoes=eleicoes, correcao_ipca=correcao)


def _voto_publico(
    voto: Voto, temas: list[TemaPublico], comparacao: tuple[ValorVotoComparavel | None, bool | None]
) -> VotoParlamentar:
    maioria, com_o_partido = comparacao
    return VotoParlamentar(
        votacao_id=voto.votacao_id,
        valor=voto.valor,
        partido=(voto.partido or "").strip(ESPACOS_EM_BRANCO) or None,
        maioria_do_partido=maioria,
        com_o_partido=com_o_partido,
        **dados_da_votacao(voto.votacao, temas),
    )


@router.get(
    "/{id}/votos",
    summary="Listar os votos gravados do parlamentar da votação mais recente para a mais antiga",
    description="Os filtros por tema e por comparação com o partido são aplicados antes da "
    "contagem e da paginação por deslocamento. "
    "O desempate usa o id interno decrescente da votação.",
    response_model=ListaVotosParlamentar,
    responses={404: {"model": ErroParlamentar}},
)
def listar_votos_parlamentar(
    id: IdCongresso,
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
    deslocamento: Annotated[int, Query(ge=0)] = 0,
    tema: Annotated[TemaId | None, Query(description="Tema das proposições afetadas.")] = None,
    com_o_partido: Annotated[
        bool | None,
        Query(
            description="Filtra os votos que seguiram a maioria do partido (true) "
            "ou divergiram dela (false)."
        ),
    ] = None,
):
    with sessao_de_leitura_repetivel() as sessao:
        if sessao.get(Parlamentar, id) is None:
            return JSONResponse({"erro": "parlamentar_nao_encontrado"}, status_code=404)

        filtros = [Voto.parlamentar_id == id]
        if com_o_partido is None:
            comparacoes = {}
            if tema is not None:
                filtros.append(voto_tem_tema(tema))
            total = sessao.scalar(select(func.count()).select_from(Voto).where(*filtros))
        else:
            comparacoes = _comparacoes_com_o_partido(sessao, id, tema=tema)
            ids_filtrados = [
                votacao_id
                for votacao_id, (_, seguiu) in comparacoes.items()
                if seguiu is com_o_partido
            ]
            filtros.append(Voto.votacao_id == any_(ids_filtrados))
            total = len(ids_filtrados)
        votos = []
        if deslocamento < total:
            registros = sessao.scalars(
                select(Voto)
                .join(Voto.votacao)
                .where(*filtros)
                .options(
                    contains_eager(Voto.votacao).joinedload(Votacao.fonte),
                    contains_eager(Voto.votacao).selectinload(Votacao.proposicoes),
                )
                .order_by(*ORDEM_DOS_VOTOS)
                .limit(limite)
                .offset(deslocamento)
            ).all()
            ids = [voto.votacao_id for voto in registros]
            temas = temas_das_votacoes(sessao, ids)
            if com_o_partido is None:
                comparacoes = _comparacoes_com_o_partido(sessao, id, ids)
            votos = [
                _voto_publico(
                    voto,
                    temas.get(voto.votacao_id, []),
                    comparacoes.get(voto.votacao_id, (None, None)),
                )
                for voto in registros
            ]
        return ListaVotosParlamentar(
            votos=votos,
            total=total,
            limite=limite,
            deslocamento=deslocamento,
        )
