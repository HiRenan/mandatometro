"""Um relatório agregado; linhas de tentativa não saem do PostgreSQL."""

from dataclasses import dataclass

from sqlalchemy import Engine, and_, func, select

from mandatometro.db.modelos import TentativaPiloto
from mandatometro.piloto import TOTAL_PERGUNTAS, conferir_versao

MINIMO_PARA_MEDIA = 5


@dataclass(frozen=True)
class Totais:
    antes: int = 0
    depois: int = 0
    pares: int = 0
    acertos_antes: int = 0
    acertos_depois: int = 0
    acertos_antes_pares: int = 0
    acertos_depois_pares: int = 0


def _situacao(quantidade: int) -> str:
    if quantidade == 0:
        return "sem_respostas"
    return "amostra_pequena" if quantidade < MINIMO_PARA_MEDIA else "disponivel"


def _media(quantidade: int, acertos: int, situacao: str) -> dict:
    media = acertos / quantidade if situacao == "disponivel" else None
    return {
        "acertos": round(media, 2) if media is not None else None,
        "percentual": round(media * 100 / TOTAL_PERGUNTAS, 2) if media is not None else None,
    }


def resumir(versao_quiz: str, totais: Totais) -> dict:
    conferir_versao(versao_quiz)
    medias = {}
    for etapa in ("antes", "depois"):
        quantidade = getattr(totais, etapa)
        situacao = _situacao(quantidade)
        # Se ambas as médias saíssem, subtrair a soma dos pares da global revelaria
        # o resultado dos poucos códigos que fizeram só uma etapa.
        if totais.pares >= MINIMO_PARA_MEDIA and 0 < quantidade - totais.pares < MINIMO_PARA_MEDIA:
            situacao = "protecao_de_subgrupo"
        medias[etapa] = {
            "quantidade": quantidade,
            **_media(quantidade, getattr(totais, f"acertos_{etapa}"), situacao),
            "situacao": situacao,
        }
    situacao_pares = _situacao(totais.pares)
    diferenca = (
        (totais.acertos_depois_pares - totais.acertos_antes_pares) / totais.pares
        if situacao_pares == "disponivel"
        else None
    )
    return {
        "versao_quiz": versao_quiz,
        "total_perguntas": TOTAL_PERGUNTAS,
        "tentativas": {
            "antes": totais.antes,
            "depois": totais.depois,
            "total": totais.antes + totais.depois,
        },
        "participacoes": {
            "antes": totais.antes,
            "depois": totais.depois,
            "total": totais.antes + totais.depois - totais.pares,
            "pareadas": totais.pares,
            "somente_antes": totais.antes - totais.pares,
            "somente_depois": totais.depois - totais.pares,
        },
        "medias": medias,
        "pares": {
            "quantidade": totais.pares,
            "antes": _media(totais.pares, totais.acertos_antes_pares, situacao_pares),
            "depois": _media(totais.pares, totais.acertos_depois_pares, situacao_pares),
            "diferenca_acertos": round(diferenca, 2) if diferenca is not None else None,
            "diferenca_pontos_percentuais": (
                round(diferenca * 100 / TOTAL_PERGUNTAS, 2) if diferenca is not None else None
            ),
            "situacao": situacao_pares,
        },
    }


def resultado(banco: Engine, versao_quiz: str) -> dict:
    conferir_versao(versao_quiz)

    def etapa(nome):
        return (
            select(TentativaPiloto.participacao, TentativaPiloto.acertos)
            .where(TentativaPiloto.versao_quiz == versao_quiz, TentativaPiloto.etapa == nome)
            .subquery(nome)
        )

    antes, depois = etapa("antes"), etapa("depois")
    pares = and_(antes.c.participacao.is_not(None), depois.c.participacao.is_not(None))
    consulta = select(
        func.count(antes.c.participacao).label("antes"),
        func.count(depois.c.participacao).label("depois"),
        func.count().filter(pares).label("pares"),
        func.coalesce(func.sum(antes.c.acertos), 0).label("acertos_antes"),
        func.coalesce(func.sum(depois.c.acertos), 0).label("acertos_depois"),
        func.coalesce(func.sum(antes.c.acertos).filter(pares), 0).label("acertos_antes_pares"),
        func.coalesce(func.sum(depois.c.acertos).filter(pares), 0).label("acertos_depois_pares"),
    ).select_from(antes.join(depois, antes.c.participacao == depois.c.participacao, full=True))
    # Uma consulta/snapshot evita contagens incompatíveis se um POST chegar durante a leitura.
    with banco.connect() as conexao:
        totais = Totais(**conexao.execute(consulta).mappings().one())
    return resumir(versao_quiz, totais)
