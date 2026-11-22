"""Lê as classificações oficiais e grava os temas sem regravar os fatos coletados."""

import time
from collections.abc import Callable, Iterable, Mapping
from datetime import date

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.coleta.http import ClienteHttp, ErroColeta, Resposta
from mandatometro.coleta.persistencia import salvar_temas_da_proposicao
from mandatometro.coleta.tipos import ResumoColeta
from mandatometro.db.modelos import Proposicao, ProposicaoTema, Votacao, votacao_proposicao
from mandatometro.temas import TemaId, tema_da_camara, tema_do_senado


def _codigo(valor: object) -> int:
    if isinstance(valor, bool) or not isinstance(valor, (int, str)):
        raise ValueError("Código de classificação inválido.")
    numero = int(valor)
    if numero <= 0:
        raise ValueError("Código de classificação inválido.")
    return numero


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

    por_codigo = {}
    for item in itens:
        codigo = _codigo(item.get("codigo"))
        caminho = item.get("descricaoHierarquia")
        if not isinstance(caminho, str) or not caminho.strip():
            raise ValueError("Caminho da classificação inválido.")
        if codigo in por_codigo and por_codigo[codigo] != caminho:
            raise ValueError("Classificação repetida com caminhos diferentes.")
        por_codigo[codigo] = caminho
    return [tema_do_senado(caminho) for caminho in por_codigo.values()]


def coletar_temas(
    resumo: ResumoColeta,
    ids_externos: Iterable[int],
    *,
    http: ClienteHttp,
    abrir_sessao: Callable[[], Session],
    processos: Mapping[int, Resposta] | None = None,
    somente_preencher: bool = False,
) -> None:
    for id_externo in ids_externos:
        try:
            if resumo.casa == "camara":
                resposta = http.obter_json(f"/proposicoes/{id_externo}/temas")
            elif processos is None:
                resposta = http.obter_json(f"/processo/{id_externo}")
            else:
                resposta = processos[id_externo]
            classificacoes = _classificacoes(resumo.casa, id_externo, resposta)
        except (ErroColeta, ValueError):
            resumo.temas.falhas_consulta += 1
            continue

        temas = {tema for tema in classificacoes if tema is not None}
        resumo.temas.proposicoes_sem_classificacao += not classificacoes
        resumo.temas.classificacoes_sem_tema += classificacoes.count(None)
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
            resumo.temas.falhas_gravacao += 1
        else:
            resumo.fontes += fontes
            resumo.temas.proposicoes_com_tema += bool(temas)


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
