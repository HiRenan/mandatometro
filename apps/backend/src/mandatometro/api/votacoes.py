"""A votação, os votos individuais gravados e os placares desses mesmos registros."""

from collections import Counter, defaultdict
from typing import Annotated

from fastapi import APIRouter, Path
from fastapi.responses import JSONResponse
from sqlalchemy import func, select
from sqlalchemy.orm import joinedload, selectinload

from mandatometro.api.congresso import (
    RotaCongresso,
    contagem_por_valor,
    dados_da_votacao,
    ordem_alfabetica,
)
from mandatometro.api.esquemas import DetalheVotacao, ErroVotacao, PlacarPorPartido, VotoNominal
from mandatometro.db import sessao as sessao_do_banco
from mandatometro.db.modelos import Parlamentar, Votacao, Voto

router = APIRouter(
    prefix="/votacoes",
    tags=["votacoes"],
    route_class=RotaCongresso,
    responses={
        422: {"model": ErroVotacao, "description": "Dados inválidos."},
        503: {"model": ErroVotacao, "description": "Banco indisponível."},
    },
)


@router.get(
    "/{id}",
    summary="Ler uma votação, seus votos por nome e os placares geral e por partido",
    description="A lista contém todos os votos individuais gravados. Quando a votação não tem "
    "registros individuais, a lista de votos e a de partidos vêm vazias e o placar vem zerado.",
    response_model=DetalheVotacao,
    responses={404: {"model": ErroVotacao}},
)
def obter_votacao(id: Annotated[int, Path(gt=0)]):
    with sessao_do_banco() as sessao:
        votacao = sessao.get(
            Votacao, id, options=(joinedload(Votacao.fonte), selectinload(Votacao.proposicoes))
        )
        if votacao is None:
            return JSONResponse({"erro": "votacao_nao_encontrada"}, status_code=404)

        linhas = sessao.execute(
            select(
                Voto.parlamentar_id,
                Parlamentar.nome,
                func.nullif(func.trim(Voto.partido), "").label("partido"),
                Voto.uf,
                Voto.valor,
            )
            .join(Voto.parlamentar)
            .where(Voto.votacao_id == id)
        ).mappings()
        votos = []
        total: Counter[str] = Counter()
        por_partido: defaultdict[str | None, Counter[str]] = defaultdict(Counter)
        for linha in linhas:
            voto = VotoNominal.model_validate(linha)
            votos.append(voto)
            total[voto.valor] += 1
            por_partido[voto.partido][voto.valor] += 1

        votos.sort(key=lambda v: ordem_alfabetica(v.nome, v.parlamentar_id))
        return DetalheVotacao(
            id=votacao.id,
            casa=votacao.casa,
            **dados_da_votacao(votacao),
            placar=contagem_por_valor(total),
            placar_por_partido=[
                PlacarPorPartido(partido=sigla, placar=contagem_por_valor(por_partido[sigla]))
                for sigla in sorted(por_partido, key=lambda s: (s is None, s or ""))
            ],
            votos=votos,
        )
