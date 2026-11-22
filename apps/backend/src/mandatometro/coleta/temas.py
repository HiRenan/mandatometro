"""Lê as classificações oficiais e grava os temas sem regravar os fatos coletados."""

import time
from collections.abc import Callable, Collection, Mapping
from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.coleta.http import (
    ClienteHttp,
    ErroColeta,
    ErroColetaTemporario,
    PrazoConsultaEsgotado,
    Resposta,
)
from mandatometro.coleta.persistencia import salvar_temas_da_proposicao
from mandatometro.coleta.tipos import ResumoColeta
from mandatometro.db.modelos import Proposicao, ProposicaoTema, Votacao, votacao_proposicao
from mandatometro.temas import TemaId, tema_da_camara, tema_do_senado


def _codigo(valor: object) -> int:
    if isinstance(valor, str) and valor.isascii() and valor.isdecimal():
        valor = int(valor)
    if type(valor) is not int or valor <= 0:
        raise ValueError("Código de classificação inválido.")
    return valor


def _classificacoes(casa: str, id_externo: int, resposta: Resposta) -> list[TemaId | None]:
    dados = resposta.dados
    if not isinstance(dados, dict):
        raise ValueError("Resposta de classificação inválida.")

    if casa == "camara":
        itens = dados.get("dados")
    else:
        if _codigo(dados.get("id")) != id_externo:
            raise ValueError("O processo não corresponde à proposição consultada.")
        itens = dados.get("classificacoes")
        if itens is None:
            return []
    if not isinstance(itens, list) or any(not isinstance(item, dict) for item in itens):
        raise ValueError("Lista de classificações inválida.")
    if casa == "camara":
        por_codigo = {_codigo(item.get("codTema")) for item in itens}
        return [tema_da_camara(codigo) for codigo in por_codigo]

    caminhos = set()
    for item in itens:
        _codigo(item.get("codigo"))
        caminho = item.get("descricaoHierarquia")
        if not isinstance(caminho, str) or not caminho.strip():
            raise ValueError("Caminho da classificação inválido.")
        caminhos.add(caminho)
    return [tema_do_senado(caminho) for caminho in caminhos]


def coletar_temas(
    resumo: ResumoColeta,
    ids_externos: Collection[int],
    *,
    http: ClienteHttp,
    abrir_sessao: Callable[[], Session],
    processos: Mapping[int, Resposta] | None = None,
    somente_preencher: bool = False,
    prazo: float | None = None,
) -> None:
    contagens = resumo.temas
    falhas_seguidas = 0
    for indice, id_externo in enumerate(ids_externos):
        if prazo is not None and (falhas_seguidas >= 2 or time.monotonic() >= prazo):
            contagens.proposicoes_nao_consultadas += len(ids_externos) - indice
            break
        chamadas = http.chamadas
        try:
            if resumo.casa == "camara":
                resposta = http.obter_json(f"/proposicoes/{id_externo}/temas", prazo=prazo)
            elif processos is None:
                resposta = http.obter_json(f"/processo/{id_externo}")
            else:
                resposta = processos[id_externo]
            classificacoes = _classificacoes(resumo.casa, id_externo, resposta)
        except PrazoConsultaEsgotado:
            consultada = http.chamadas > chamadas
            contagens.falhas_consulta += consultada
            contagens.proposicoes_nao_consultadas += len(ids_externos) - indice - consultada
            break
        except (ErroColeta, ValueError) as erro:
            contagens.falhas_consulta += 1
            falhas_seguidas = falhas_seguidas + 1 if isinstance(erro, ErroColetaTemporario) else 0
            continue

        falhas_seguidas = 0
        temas = {tema for tema in classificacoes if tema is not None}
        contagens.proposicoes_sem_classificacao += not classificacoes
        contagens.classificacoes_sem_tema += classificacoes.count(None)
        try:
            with abrir_sessao() as sessao, sessao.begin():
                fontes = salvar_temas_da_proposicao(
                    sessao,
                    casa=resumo.casa,
                    id_externo=id_externo,
                    temas=temas,
                    resposta=resposta,
                    somente_preencher=somente_preencher,
                )
        except SQLAlchemyError:
            contagens.falhas_gravacao += 1
        else:
            resumo.fontes += fontes
            contagens.proposicoes_com_tema += bool(temas)


def preencher_temas(
    inicio: date,
    fim: date,
    *,
    casa: str,
    http: ClienteHttp,
    abrir_sessao: Callable[[], Session],
) -> ResumoColeta:
    resumo = ResumoColeta(casa, inicio, fim)
    comeco = time.monotonic()
    classificadas = (
        select(ProposicaoTema.proposicao_id)
        .where(ProposicaoTema.proposicao_id == Proposicao.id)
        .exists()
    )
    consulta = (
        select(Proposicao.id_externo)
        .join(votacao_proposicao)
        .join(Votacao)
        .where(Proposicao.casa == casa, Votacao.data.between(inicio, fim), ~classificadas)
        .distinct()
        .order_by(Proposicao.id_externo)
    )
    try:
        with abrir_sessao() as sessao:
            ids = list(sessao.scalars(consulta))
    except SQLAlchemyError:
        resumo.completa = False
        resumo.erro = "Falha ao consultar as proposições sem tema."
    else:
        coletar_temas(resumo, ids, http=http, abrir_sessao=abrir_sessao, somente_preencher=True)
        resumo.completa = not (resumo.temas.falhas_consulta or resumo.temas.falhas_gravacao)

    resumo.chamadas = http.chamadas
    resumo.tentativas_extras = http.tentativas_extras
    resumo.duracao_s = round(time.monotonic() - comeco, 3)
    return resumo
