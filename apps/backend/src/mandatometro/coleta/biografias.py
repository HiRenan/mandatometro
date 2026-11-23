"""Profissões, escolaridade e catálogos oficiais das duas Casas."""

import argparse
import logging
import time
from collections import defaultdict
from collections.abc import Callable, Iterable
from dataclasses import dataclass, replace

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.coleta import camara, senado
from mandatometro.coleta.cli import mostrar_resumo
from mandatometro.coleta.http import ClienteHttp, ErroColeta, Resposta
from mandatometro.coleta.persistencia import registrar_fonte
from mandatometro.coleta.tipos import ResumoBiografias
from mandatometro.db import sessao
from mandatometro.db.modelos import BiografiaParlamentar, Parlamentar, Partido

logger = logging.getLogger(__name__)
FALHAS = (ErroColeta, KeyError, ValueError, SQLAlchemyError)

type Catalogo = dict[str, tuple[str, Resposta]]


@dataclass(frozen=True)
class DadosBiografia:
    profissoes: list[str]
    escolaridade: str | None
    fonte_profissoes: Resposta
    fonte_escolaridade: Resposta


def _rotulo(valor: object) -> str | None:
    if valor is None:
        return None
    if not isinstance(valor, str):
        raise ErroColeta("Texto inválido na fonte.")
    return valor.strip() or None


def _rotulos(itens: Iterable[dict], campo: str) -> list[str]:
    valores = (_rotulo(item.get(campo)) for item in itens)
    return list(dict.fromkeys(valor for valor in valores if valor))


def _biografia_camara(http: ClienteHttp, codigo: int) -> DadosBiografia:
    detalhe = http.obter_json(f"/deputados/{codigo}")
    pessoa = camara._objeto(camara._objeto(detalhe.dados)["dados"])
    if camara._inteiro(pessoa.get("id")) != codigo:
        raise ErroColeta("Detalhe da Câmara não corresponde ao parlamentar consultado.")
    escolaridade = _rotulo(pessoa.get("escolaridade"))
    fonte_escolaridade = replace(detalhe, dados=None)

    trabalhos = http.obter_json(f"/deputados/{codigo}/profissoes")
    lista = camara._lista(camara._objeto(trabalhos.dados)["dados"])
    profissoes = _rotulos((camara._objeto(item) for item in lista), "titulo")
    return DadosBiografia(
        profissoes, escolaridade, replace(trabalhos, dados=None), fonte_escolaridade
    )


def _itens_senado(resposta: Resposta, codigo: int, grupo: str, item: str) -> list[dict]:
    envelope = senado._objeto(senado._objeto(resposta.dados).get("HistoricoAcademicoParlamentar"))
    pessoa = senado._objeto(envelope.get("Parlamentar"))
    if senado._inteiro(pessoa.get("Codigo")) != codigo:
        raise ErroColeta("Detalhe do Senado não corresponde ao parlamentar consultado.")
    secao = pessoa.get(grupo)
    if secao is None:
        return []
    dados = senado._objeto(secao).get(item)
    return senado._lista(dados, objeto_unico=True) if dados is not None else []


def _biografia_senado(http: ClienteHttp, codigo: int) -> DadosBiografia:
    trabalho = http.obter_json(f"/senador/{codigo}/profissao.json")
    profissoes = _rotulos(
        _itens_senado(trabalho, codigo, "Profissoes", "Profissao"), "NomeProfissao"
    )
    historico = http.obter_json(f"/senador/{codigo}/historicoAcademico.json")
    graus = _rotulos(
        _itens_senado(historico, codigo, "HistoricoAcademico", "Curso"), "GrauInstrucao"
    )
    return DadosBiografia(
        profissoes,
        ", ".join(graus) or None,
        replace(trabalho, dados=None),
        replace(historico, dados=None),
    )


def _partidos_camara(http: ClienteHttp) -> Catalogo:
    catalogo: Catalogo = {}
    for pagina in camara._paginas(http, "/partidos", {"itens": 100}):
        fonte = replace(pagina, dados=None)
        itens = pagina.dados["dados"]
        if not itens:
            raise ErroColeta("Página vazia no catálogo de partidos da Câmara.")
        for dado in itens:
            item = camara._objeto(dado)
            sigla = _rotulo(item.get("sigla"))
            nome = _rotulo(item.get("nome"))
            if sigla and nome:
                chave = sigla.upper()
                if chave in catalogo and catalogo[chave][0] != nome:
                    raise ErroColeta("Nomes divergentes no catálogo de partidos da Câmara.")
                catalogo[chave] = (nome, fonte)
    return catalogo


def _partidos_senado(http: ClienteHttp) -> Catalogo:
    resposta = http.obter_json("/senador/partidos.json")
    envelope = senado._objeto(senado._objeto(resposta.dados).get("ListaPartidos"))
    itens = senado._lista(senado._objeto(envelope.get("Partidos")).get("Partido"))
    if not itens:
        raise ErroColeta("Catálogo de partidos do Senado vazio.")
    nomes = defaultdict(set)
    ativos = defaultdict(set)
    for item in itens:
        sigla = _rotulo(item.get("Sigla"))
        if not sigla:
            continue
        chave = sigla.upper()
        nome = _rotulo(item.get("Nome"))
        if nome:
            nomes[chave].add(nome)
        if not _rotulo(item.get("DataExtincao")):
            candidatos = ativos[chave]
            if nome:
                candidatos.add(nome)
    fonte = replace(resposta, dados=None)
    catalogo: Catalogo = {}
    for chave, historico in nomes.items():
        candidatos = ativos.get(chave, historico)
        if len(candidatos) == 1:
            catalogo[chave] = (next(iter(candidatos)), fonte)
    return catalogo


def _gravar_partidos(banco: Session, catalogo: Catalogo) -> None:
    banco.execute(select(func.pg_advisory_xact_lock(func.hashtext("mandatometro.coleta.partidos"))))
    fontes: dict[str, int] = {}
    partidos: list[Partido] = []
    for sigla, (nome, resposta) in catalogo.items():
        if resposta.url not in fontes:
            fontes[resposta.url] = registrar_fonte(banco, resposta).id
        partidos.append(Partido(sigla=sigla, nome=nome, fonte_id=fontes[resposta.url]))
    banco.execute(delete(Partido))
    banco.add_all(partidos)


def _gravar_biografia(banco: Session, parlamentar_id: int, dados: DadosBiografia) -> bool:
    if not (dados.profissoes or dados.escolaridade):
        banco.execute(
            delete(BiografiaParlamentar).where(
                BiografiaParlamentar.parlamentar_id == parlamentar_id
            )
        )
        return False

    fonte_profissoes_id = None
    fonte_escolaridade_id = None
    if dados.profissoes:
        fonte_profissoes_id = registrar_fonte(banco, dados.fonte_profissoes).id
    if dados.escolaridade:
        fonte_escolaridade_id = registrar_fonte(banco, dados.fonte_escolaridade).id
    valores = {
        "profissoes": dados.profissoes,
        "escolaridade": dados.escolaridade,
        "fonte_profissoes_id": fonte_profissoes_id,
        "fonte_escolaridade_id": fonte_escolaridade_id,
    }
    comando = insert(BiografiaParlamentar).values(parlamentar_id=parlamentar_id, **valores)
    banco.execute(
        comando.on_conflict_do_update(
            index_elements=[BiografiaParlamentar.parlamentar_id], set_=valores
        )
    )
    return True


def coletar(
    http_camara: ClienteHttp, http_senado: ClienteHttp, *, abrir_sessao: Callable[[], Session]
) -> ResumoBiografias:
    inicio = time.monotonic()
    resumo = ResumoBiografias()
    try:
        with abrir_sessao() as banco:
            pessoas = banco.execute(
                select(Parlamentar.id, Parlamentar.casa, Parlamentar.id_externo).order_by(
                    Parlamentar.casa, Parlamentar.id_externo
                )
            ).all()
    except SQLAlchemyError:
        resumo.erro = "Falha ao ler os parlamentares cadastrados."
        pessoas = []
    else:
        try:
            catalogo_camara = _partidos_camara(http_camara)
            catalogo = _partidos_senado(http_senado) | catalogo_camara
            with abrir_sessao() as banco, banco.begin():
                _gravar_partidos(banco, catalogo)
        except FALHAS:
            resumo.falha_partidos = True
            logger.warning(
                "Falha no catálogo oficial de partidos. A versão anterior foi preservada."
            )
        else:
            resumo.partidos = len(catalogo)

    consultas = {
        "camara": (_biografia_camara, http_camara),
        "senado": (_biografia_senado, http_senado),
    }
    resumo.parlamentares = len(pessoas)
    for parlamentar_id, casa, codigo in pessoas:
        consultar, http = consultas[casa]
        try:
            dados = consultar(http, codigo)
            with abrir_sessao() as banco, banco.begin():
                tem_biografia = _gravar_biografia(banco, parlamentar_id, dados)
        except FALHAS:
            resumo.falhas_parlamentares += 1
        else:
            if tem_biografia:
                resumo.biografias += 1
            else:
                resumo.sem_biografia += 1

    resumo.completa = not (resumo.erro or resumo.falha_partidos or resumo.falhas_parlamentares)
    resumo.chamadas = http_camara.chamadas + http_senado.chamadas
    resumo.tentativas_extras = http_camara.tentativas_extras + http_senado.tentativas_extras
    resumo.duracao_s = round(time.monotonic() - inicio, 2)
    return resumo


def _executar(_: argparse.Namespace) -> int:
    with ClienteHttp(camara.BASE) as http_camara, ClienteHttp(senado.BASE) as http_senado:
        resumo = coletar(http_camara, http_senado, abrir_sessao=sessao)
    mostrar_resumo(resumo)
    return 0 if resumo.completa else 1


def registrar(casas: argparse._SubParsersAction) -> None:
    parser = casas.add_parser("biografias", help="coleta biografias e nomes de partidos das Casas")
    parser.set_defaults(rodar=_executar)
