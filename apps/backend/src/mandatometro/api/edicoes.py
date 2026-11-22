"""Leitura da fotografia publicada e dos temas oficiais das votações no banco."""

from typing import Annotated

from fastapi import APIRouter, Path, Query
from fastapi.responses import JSONResponse
from sqlalchemy import func, select

from mandatometro.api.congresso import temas_das_votacoes
from mandatometro.api.esquemas import (
    ArtigoDaEdicao,
    EdicaoPublica,
    ErroEdicaoPublica,
    FatosAtoPublicos,
    FatosPublicos,
    FontePublica,
    ItemPublico,
    ListaEdicoes,
    PlacarPublico,
    ResumoEdicao,
    TemaPublico,
    VotacaoPublica,
)
from mandatometro.api.newsletter import RotaNewsletter
from mandatometro.avisos.consulta import carregar_edicao, publicadas
from mandatometro.avisos.email import MensagemInvalida, formatar_edicao
from mandatometro.config import config
from mandatometro.db import sessao as sessao_do_banco
from mandatometro.db.modelos import Edicao, Fonte, ItemEdicao
from mandatometro.ia.artigos import CATALOGO
from mandatometro.ia.esquemas import Fatos, FatosAto, FatosItem

router = APIRouter(
    prefix="/edicoes",
    tags=["edicoes"],
    route_class=RotaNewsletter,
    responses={
        422: {"model": ErroEdicaoPublica},
        503: {"model": ErroEdicaoPublica},
    },
)


def _resumo(edicao: Edicao) -> ResumoEdicao:
    return ResumoEdicao(
        id=edicao.id,
        titulo=edicao.titulo,
        inicio=edicao.inicio,
        fim=edicao.fim,
        publicada_em=edicao.publicada_em,
    )


def _fonte(fonte: Fonte, *, de_ato: bool = False) -> FontePublica:
    url = fonte.url_publica if de_ato else fonte.url_publica or fonte.url
    if not url:
        raise MensagemInvalida("A referência está sem página oficial.")
    return FontePublica(
        url=url,
        coletado_em=fonte.coletado_em,
        trecho=None if de_ato else fonte.trecho,
    )


def _item(
    item: ItemEdicao,
    fatos: FatosItem | None,
    fontes: dict[int, Fonte],
    temas: dict[int, list[TemaPublico]],
) -> ItemPublico:
    fatos_publicos: FatosPublicos | FatosAtoPublicos | None
    de_ato = isinstance(fatos, FatosAto)
    if de_ato:
        fatos_publicos = FatosAtoPublicos(votacoes=[], data_publicacao=fatos.data_publicacao)
        fontes_publicas = [
            _fonte(fontes[i], de_ato=True) for i in dict.fromkeys([item.fonte_id, *fatos.fontes])
        ]
    elif fatos is not None:
        fatos_publicos = FatosPublicos(
            votacoes=[
                VotacaoPublica(
                    id=v.id,
                    data=v.data,
                    resultado=v.resultado,
                    placar=PlacarPublico(**v.placar.model_dump()) if v.placar else None,
                    fontes=[_fonte(fontes[i]) for i in dict.fromkeys(v.fontes)],
                    temas=temas.get(v.id, []),
                )
                for v in fatos.votacoes
            ]
        )
        fontes_publicas = [_fonte(fontes[i]) for i in dict.fromkeys(fatos.fontes)]
    else:
        fatos_publicos = None
        fontes_publicas = [_fonte(item.fonte)]
    return ItemPublico(
        ordem=item.ordem,
        tipo="ato" if de_ato else "votacao",
        titulo=item.titulo,
        texto=item.texto,
        fatos=fatos_publicos,
        fontes=fontes_publicas,
        artigo=ArtigoDaEdicao(titulo=CATALOGO[item.artigo_caminho], caminho=item.artigo_caminho)
        if item.artigo_caminho
        else None,
    )


@router.get("", summary="Listar as edições publicadas")
def listar_edicoes(
    limite: Annotated[int, Query(ge=1, le=100)] = 20,
    deslocamento: Annotated[int, Query(ge=0)] = 0,
) -> ListaEdicoes:
    with sessao_do_banco() as sessao:
        total = sessao.scalar(select(func.count()).select_from(publicadas().subquery()))
        edicoes = sessao.scalars(
            publicadas()
            .order_by(Edicao.publicada_em.desc(), Edicao.id.desc())
            .limit(limite)
            .offset(deslocamento)
        )
        return ListaEdicoes(
            edicoes=[_resumo(e) for e in edicoes],
            total=total,
            limite=limite,
            deslocamento=deslocamento,
        )


@router.get(
    "/{id}",
    summary="Ler uma edição publicada com fatos, fontes e artigos da trilha",
    response_model=EdicaoPublica,
    responses={404: {"model": ErroEdicaoPublica}},
)
def obter_edicao(id: Annotated[int, Path(gt=0)]):
    with sessao_do_banco() as sessao:
        carregada = carregar_edicao(sessao, id)
        if carregada is None:
            return JSONResponse({"erro": "edicao_nao_encontrada"}, status_code=404)
        edicao, fontes = carregada.edicao, carregada.fontes
        try:
            # Compartilha a validação de fontes/fatos com a prévia e o e-mail; não interpreta HTML.
            formatar_edicao(edicao, fontes=fontes, app_base_url=config().app_base_url, previa=True)
            itens = [(i, Fatos.ler(i.fatos) if i.fatos is not None else None) for i in edicao.itens]
            ids = {v.id for _, fatos in itens if isinstance(fatos, Fatos) for v in fatos.votacoes}
            temas = temas_das_votacoes(sessao, ids)
            return EdicaoPublica(
                **_resumo(edicao).model_dump(),
                itens=[_item(i, fatos, fontes, temas) for i, fatos in itens],
            )
        except (MensagemInvalida, KeyError):
            return JSONResponse({"erro": "servico_indisponivel"}, status_code=503)
