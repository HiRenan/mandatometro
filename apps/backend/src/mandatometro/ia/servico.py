"""Rascunho e revisão explícita, sem envio, com fotografias e arquivos verificáveis."""

import hashlib
import json
import re
from collections import Counter
from collections.abc import Callable
from dataclasses import asdict
from datetime import UTC, date, datetime
from typing import Annotated, Literal

from pydantic import Field, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from mandatometro.avisos.email import MensagemInvalida, _url, formatar_edicao
from mandatometro.db.modelos import Edicao, Fonte, ItemEdicao
from mandatometro.ia.artigos import CATALOGO, sugerir
from mandatometro.ia.esquemas import Estrito, Fatos, Id
from mandatometro.ia.privacidade import assunto_pessoal, identificacao, normalizar
from mandatometro.ia.redacao import PENDENTE, Redator, redigir
from mandatometro.ia.selecao import ItemBase, selecionar

AbrirSessao = Callable[[], Session]


class ErroEdicao(Exception):
    """Mensagem editorial segura, sem texto de fonte ou exceção de terceiros."""


class ItemRevisao(Estrito):
    id: Id
    titulo: Annotated[str, Field(min_length=1, max_length=180)]
    explicacao: Annotated[list[str], Field(min_length=1, max_length=12)]
    artigo_caminho: str | None
    revisado: bool
    artigo_confirmado: bool
    excluir: bool
    motivo_exclusao: Annotated[str, Field(max_length=500)]
    fatos: dict
    fontes: list[dict]
    contexto: dict


class ArquivoRevisao(Estrito):
    versao: Literal[1]
    edicao_id: Id
    versao_rascunho: str
    inicio: str
    fim: str
    titulo: Annotated[str, Field(min_length=1, max_length=180)]
    cobertura_confirmada: bool
    artigos_disponiveis: dict[str, str]
    itens: list[ItemRevisao]


def titulo_periodo(inicio: date, fim: date) -> str:
    formato = "%d" if (inicio.year, inicio.month) == (fim.year, fim.month) else "%d/%m"
    if inicio.year != fim.year:
        formato = "%d/%m/%Y"
    return f"Jornal legislativo — {inicio.strftime(formato)} a {fim:%d/%m/%Y}"


def _carregar(sessao: Session, edicao_id: int) -> Edicao:
    edicao = sessao.scalar(
        select(Edicao)
        .where(Edicao.id == edicao_id)
        .options(selectinload(Edicao.itens).joinedload(ItemEdicao.fonte))
    )
    if edicao is None:
        raise ErroEdicao("Não encontramos essa edição. Confira o número informado.")
    return edicao


def _periodo(sessao: Session, inicio: date, fim: date) -> Edicao | None:
    edicoes = list(
        sessao.scalars(select(Edicao.id).where(Edicao.inicio == inicio, Edicao.fim == fim))
    )
    if len(edicoes) > 1:
        raise ErroEdicao(
            "Há mais de uma edição nesse período. Resolva a duplicação antes de continuar."
        )
    return _carregar(sessao, edicoes[0]) if edicoes else None


def _hash(edicao: Edicao) -> str:
    dados = {
        "id": edicao.id,
        "titulo": edicao.titulo,
        "inicio": str(edicao.inicio),
        "fim": str(edicao.fim),
        "estado": edicao.estado,
        "publicada_em": str(edicao.publicada_em),
        "itens": [
            {
                "id": i.id,
                "ordem": i.ordem,
                "titulo": i.titulo,
                "texto": i.texto,
                "fonte": i.fonte_id,
                "fatos": i.fatos,
                "artigo": i.artigo_caminho,
            }
            for i in sorted(edicao.itens, key=lambda item: item.ordem)
        ],
    }
    return hashlib.sha256(
        json.dumps(dados, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


def _fatos(item: ItemEdicao) -> Fatos:
    try:
        if item.fatos is None:
            raise ValueError
        return Fatos.ler(item.fatos)
    except (ValueError, TypeError):
        raise ErroEdicao(
            f"Item {item.ordem}: fatos ausentes ou inválidos. Refaça o rascunho."
        ) from None


def _fontes(sessao: Session, edicao: Edicao) -> dict[int, Fonte]:
    ids = {item.fonte_id for item in edicao.itens}
    for item in edicao.itens:
        if item.fatos is not None:
            ids.update(_fatos(item).fontes)
    fontes = {f.id: f for f in sessao.scalars(select(Fonte).where(Fonte.id.in_(ids)))}
    if len(fontes) != len(ids):
        raise ErroEdicao("Uma referência oficial não está mais no banco. Refaça o rascunho.")
    for fonte in fontes.values():
        try:
            _url(fonte.url)
            if fonte.url_publica:
                _url(fonte.url_publica)
            if fonte.coletado_em is None:
                raise MensagemInvalida
        except MensagemInvalida:
            raise ErroEdicao(
                "Uma referência está sem endereço oficial ou data de coleta."
            ) from None
    return fontes


def _dados_fatuais(fatos: Fatos) -> dict:
    return fatos.model_dump(mode="json", exclude={"origem", "pendencias"})


def _conferir(sessao: Session, edicao: Edicao) -> tuple[dict[int, ItemBase], list[str]]:
    if not edicao.itens:
        raise ErroEdicao("A edição precisa ter ao menos um item.")
    selecao = selecionar(sessao, edicao.inicio, edicao.fim, teto=2**31 - 1)
    atuais = {frozenset(v.id for v in i.fatos.votacoes): i for i in selecao.itens}
    bases = {}
    for item in edicao.itens:
        fatos = _fatos(item)
        atual = atuais.get(frozenset(v.id for v in fatos.votacoes))
        if (
            atual is None
            or _dados_fatuais(atual.fatos) != _dados_fatuais(fatos)
            or atual.principal.id != item.fonte_id
        ):
            raise ErroEdicao(
                f"Item {item.ordem}: os dados usados mudaram. Refaça e revise o rascunho."
            )
        bases[item.id] = atual
    return bases, selecao.nomes


def gerar(
    abrir: AbrirSessao,
    inicio: date,
    fim: date,
    *,
    teto: int = 8,
    refazer: bool = False,
    redator: Redator | None = None,
) -> dict:
    with abrir() as sessao:
        anterior = _periodo(sessao, inicio, fim)
        if anterior and (anterior.estado == "publicada" or not refazer):
            return {
                "situacao": "ja_publicada"
                if anterior.estado == "publicada"
                else "rascunho_existente",
                "edicao_id": anterior.id,
            }
        versao = _hash(anterior) if anterior else None
        selecao = selecionar(sessao, inicio, fim, teto=teto)
    resumo = asdict(selecao.resumo)
    for campo in ("sem_proposicao", "sem_pagina_publica", "cortadas_pelo_teto"):
        resumo[f"quantidade_{campo}"] = len(resumo[campo])
    if not selecao.itens:
        return {
            "situacao": "sem_votacoes_no_banco"
            if not resumo["votacoes_no_banco"]
            else "sem_itens_elegiveis",
            **resumo,
        }
    # Nenhuma transação ou conexão do banco fica aberta durante a chamada ao redator.
    preparados = []
    motivos = Counter()
    for base in selecao.itens:
        texto = redigir(base, selecao.nomes, redator)
        artigo = sugerir(base)
        fatos = base.fatos.model_copy(deep=True)
        fatos.origem = texto.origem
        if texto.origem == "codigo":
            fatos.pendencias.append("redacao")
            motivos[texto.motivo] += 1
        if artigo:
            fatos.pendencias.append("artigo")
        preparados.append((base.principal.id, texto, fatos.model_dump(mode="json"), artigo))
    with abrir() as sessao, sessao.begin():
        edicao = _periodo(sessao, inicio, fim)
        if edicao and edicao.estado == "publicada":
            return {"situacao": "ja_publicada", "edicao_id": edicao.id}
        if (edicao is not None and _hash(edicao) != versao) or (
            edicao is None and versao is not None
        ):
            raise ErroEdicao("O rascunho mudou durante a geração. Execute novamente.")
        if edicao is None:
            edicao = Edicao(titulo=titulo_periodo(inicio, fim), inicio=inicio, fim=fim)
            sessao.add(edicao)
        else:
            edicao.itens.clear()
            sessao.flush()
            edicao.titulo = titulo_periodo(inicio, fim)
        for ordem, (fonte_id, texto, fatos, artigo) in enumerate(preparados, 1):
            edicao.itens.append(
                ItemEdicao(
                    ordem=ordem,
                    titulo=texto.titulo,
                    texto=texto.texto,
                    fonte_id=fonte_id,
                    fatos=fatos,
                    artigo_caminho=artigo,
                )
            )
        sessao.flush()
        # A coleta pode mudar entre leitura e gravação, mesmo com um único editor.
        _conferir(sessao, edicao)
        edicao_id = edicao.id
    return {
        "situacao": "rascunho_refeito" if versao else "rascunho_criado",
        "edicao_id": edicao_id,
        "itens": len(preparados),
        "textos_do_codigo": sum(motivos.values()),
        "motivos_texto_do_codigo": dict(motivos),
        **resumo,
    }


def _arquivo(sessao: Session, edicao: Edicao, bases: dict[int, ItemBase]) -> dict:
    fontes = _fontes(sessao, edicao)
    itens = []
    for item in edicao.itens:
        fatos, base = _fatos(item), bases[item.id]
        itens.append(
            {
                "id": item.id,
                "titulo": item.titulo,
                "explicacao": item.texto.split("\n\n"),
                "artigo_caminho": item.artigo_caminho,
                "revisado": "revisao" not in fatos.pendencias,
                "artigo_confirmado": "artigo" not in fatos.pendencias,
                "excluir": False,
                "motivo_exclusao": "",
                "fatos": item.fatos,
                "fontes": [
                    {
                        "id": i,
                        "url": fontes[i].url,
                        "url_publica": fontes[i].url_publica,
                        "coletado_em": fontes[i].coletado_em.isoformat(),
                        "trecho": fontes[i].trecho,
                    }
                    for i in fatos.fontes
                ],
                "contexto": {
                    "proposicoes": [
                        {
                            "id": p.id,
                            "sigla": p.sigla,
                            "numero": p.numero,
                            "ano": p.ano,
                            "ementa": p.ementa,
                        }
                        for p in base.proposicoes
                    ],
                    "votacoes": [
                        {
                            "id": v.id,
                            "casa": v.casa,
                            "id_externo": v.id_externo,
                            "descricao": v.descricao,
                        }
                        for v in base.votacoes
                    ],
                },
            }
        )
    return {
        "versao": 1,
        "edicao_id": edicao.id,
        "versao_rascunho": _hash(edicao),
        "inicio": str(edicao.inicio),
        "fim": str(edicao.fim),
        "titulo": edicao.titulo,
        # Um único campo para quem revisa. A pendência é persistida nos itens para que qualquer
        # item novo/refeito exija novamente a confirmação, sem outra coluna no banco.
        "cobertura_confirmada": all("cobertura" not in _fatos(i).pendencias for i in edicao.itens),
        "artigos_disponiveis": CATALOGO,
        "itens": itens,
    }


def exportar(abrir: AbrirSessao, edicao_id: int) -> dict:
    with abrir() as sessao:
        edicao = _carregar(sessao, edicao_id)
        if edicao.estado == "publicada":
            raise ErroEdicao("A edição está publicada. Use mostrar para consultá-la.")
        bases, _ = _conferir(sessao, edicao)
        return _arquivo(sessao, edicao, bases)


def _ler_arquivo(dados: dict) -> ArquivoRevisao:
    try:
        return ArquivoRevisao.model_validate(dados)
    except ValidationError as erro:
        local = erro.errors(include_input=False, include_context=False)[0]["loc"]
        prefixo = (
            f"Item {local[1] + 1}: "
            if len(local) > 1 and local[0] == "itens" and type(local[1]) is int
            else "Edição: "
        )
        campos = {
            "titulo": "título",
            "explicacao": "explicação em parágrafos",
            "revisado": "confirmação da revisão",
            "artigo_confirmado": "confirmação do artigo",
            "cobertura_confirmada": "confirmação da cobertura",
            "artigo_caminho": "artigo",
        }
        campo = next((campos[c] for c in reversed(local) if c in campos), "formato do arquivo")
        raise ErroEdicao(prefixo + f"confira o campo {campo}.") from None


def _numeros(texto: str) -> set[str]:
    return {t.replace(".", "").replace(",", ".") for t in re.findall(r"\d+(?:[.,]\d+)*", texto)}


def _numeros_permitidos(base: ItemBase, edicao: Edicao) -> set[str]:
    dados = [str(edicao.inicio), str(edicao.fim)]
    for p in base.proposicoes:
        dados.extend([str(p.numero), str(p.ano), p.ementa or ""])
    for v, fato in zip(base.votacoes, base.fatos.votacoes, strict=True):
        dados.extend([v.descricao, str(fato.data)])
        if fato.placar:
            dados.extend(str(n) for n in fato.placar.model_dump().values())
    return _numeros(" ".join(dados))


def _texto_valido(texto: str, campo: str, prefixo: str, numeros: set[str]) -> None:
    if (
        not texto.strip()
        or len(texto) > 10000
        or any(ord(c) < 32 and c not in "\n\t" for c in texto)
    ):
        raise ErroEdicao(
            f"{prefixo}: confira o campo {campo}; use texto preenchido e sem controles."
        )
    if _numeros(texto) - numeros:
        raise ErroEdicao(f"{prefixo}: o campo {campo} tem número que não está nos fatos enviados.")


def revisar(abrir: AbrirSessao, edicao_id: int, dados: dict) -> dict:
    arquivo = _ler_arquivo(dados)
    with abrir() as sessao, sessao.begin():
        edicao = _carregar(sessao, edicao_id)
        if edicao.estado == "publicada":
            raise ErroEdicao("A edição publicada não pode ser revisada.")
        if arquivo.edicao_id != edicao.id or arquivo.versao_rascunho != _hash(edicao):
            raise ErroEdicao("Esse arquivo é antigo ou de outra edição. Exporte o rascunho atual.")
        bases, nomes = _conferir(sessao, edicao)
        original = _arquivo(sessao, edicao, bases)
        if (
            arquivo.inicio != original["inicio"]
            or arquivo.fim != original["fim"]
            or arquivo.artigos_disponiveis != CATALOGO
        ):
            raise ErroEdicao(
                "Datas e catálogo são campos de consulta. Exporte o rascunho novamente."
            )
        existentes = {i.id: i for i in edicao.itens}
        recebidos = [i.id for i in arquivo.itens]
        if len(set(recebidos)) != len(recebidos) or set(recebidos) != set(existentes):
            raise ErroEdicao(
                "Não acrescente nem remova linhas de itens. Para retirar, use excluir."
            )
        referencias = {i["id"]: i for i in original["itens"]}
        novos, avisos, numeros_edicao = [], [], set()
        for numero, revisao in enumerate(arquivo.itens, 1):
            item, base = existentes[revisao.id], bases[revisao.id]
            for campo in ("fatos", "fontes", "contexto"):
                if getattr(revisao, campo) != referencias[item.id][campo]:
                    raise ErroEdicao(
                        f"Item {numero}: o campo {campo} é de consulta e não pode mudar."
                    )
            if revisao.excluir:
                if not revisao.motivo_exclusao.strip():
                    raise ErroEdicao(f"Item {numero}: preencha o motivo da exclusão.")
                continue
            numeros = _numeros_permitidos(base, edicao)
            numeros_edicao.update(numeros)
            texto = "\n\n".join(p.strip() for p in revisao.explicacao)
            _texto_valido(revisao.titulo, "título", f"Item {numero}", numeros)
            for p in revisao.explicacao:
                _texto_valido(p, "explicação", f"Item {numero}", numeros)
            if assunto_pessoal(revisao.titulo + " " + texto, nomes):
                raise ErroEdicao(
                    f"Item {numero}: a explicação trata de assunto pessoal fora da edição."
                )
            if revisao.artigo_caminho is not None and revisao.artigo_caminho not in CATALOGO:
                raise ErroEdicao(f"Item {numero}: escolha um artigo do catálogo ou use null.")
            pendente = (
                "redacao pendente" in normalizar(texto)
                or normalizar(texto).strip() == normalizar(PENDENTE.split(":", 1)[1]).strip()
            )
            if revisao.revisado and pendente:
                raise ErroEdicao(
                    f"Item {numero}: escreva a explicação antes de confirmar a revisão."
                )
            fatos = _fatos(item)
            fatos.pendencias = []
            if pendente:
                fatos.pendencias.append("redacao")
            if not revisao.revisado:
                fatos.pendencias.append("revisao")
            if not arquivo.cobertura_confirmada:
                fatos.pendencias.append("cobertura")
            if revisao.artigo_caminho and not revisao.artigo_confirmado:
                fatos.pendencias.append("artigo")
            if texto != item.texto or revisao.titulo.strip() != item.titulo:
                fatos.origem = "revisao"
            if identificacao(revisao.titulo + " " + texto, nomes):
                avisos.append(
                    f"Confira o item {numero}: o texto pode citar parlamentar ou partido."
                )
            novos.append(
                ItemEdicao(
                    ordem=len(novos) + 1,
                    titulo=revisao.titulo.strip(),
                    texto=texto,
                    fonte_id=item.fonte_id,
                    fatos=fatos.model_dump(mode="json"),
                    artigo_caminho=revisao.artigo_caminho,
                )
            )
        if not novos:
            raise ErroEdicao("Mantenha ao menos um item na edição.")
        _texto_valido(arquivo.titulo, "título", "Edição", numeros_edicao)
        if "\n" in arquivo.titulo or "\t" in arquivo.titulo:
            raise ErroEdicao("Edição: o título precisa ficar em uma linha.")
        if assunto_pessoal(arquivo.titulo, nomes):
            raise ErroEdicao("Edição: o título trata de assunto pessoal fora da edição.")
        if identificacao(arquivo.titulo, nomes):
            avisos.append("Confira o título da edição: o texto pode citar parlamentar ou partido.")
        edicao.titulo = arquivo.titulo.strip()
        edicao.itens.clear()
        sessao.flush()
        edicao.itens.extend(novos)
        sessao.flush()
        pendencias = sorted({p for i in edicao.itens for p in _fatos(i).pendencias})
    return {
        "situacao": "revisao_salva",
        "edicao_id": edicao_id,
        "itens": len(novos),
        "pendencias": pendencias,
        "avisos": avisos,
    }


def publicar(abrir: AbrirSessao, edicao_id: int) -> dict:
    with abrir() as sessao, sessao.begin():
        edicao = _carregar(sessao, edicao_id)
        if edicao.estado == "publicada":
            return {"situacao": "ja_publicada", "edicao_id": edicao_id}
        _periodo(sessao, edicao.inicio, edicao.fim)
        _conferir(sessao, edicao)
        for item in edicao.itens:
            pendencias = _fatos(item).pendencias
            if pendencias:
                raise ErroEdicao(
                    f"Item {item.ordem}: há pendência de {', '.join(pendencias)}. Exporte e revise."
                )
            if not item.titulo.strip() or not item.texto.strip() or PENDENTE in item.texto:
                raise ErroEdicao(
                    f"Item {item.ordem}: preencha título e explicação antes de publicar."
                )
        try:
            formatar_edicao(
                edicao, app_base_url="https://mandatometro.com.br", fontes=_fontes(sessao, edicao)
            )
        except MensagemInvalida:
            raise ErroEdicao(
                "Confira os textos, os artigos e as referências antes de publicar."
            ) from None
        edicao.estado, edicao.publicada_em = "publicada", datetime.now(UTC)
    return {"situacao": "publicada", "edicao_id": edicao_id}


def mostrar(abrir: AbrirSessao, edicao_id: int, *, app_base_url: str) -> str:
    with abrir() as sessao:
        edicao = _carregar(sessao, edicao_id)
        try:
            return formatar_edicao(
                edicao, app_base_url=app_base_url, fontes=_fontes(sessao, edicao), previa=True
            ).texto
        except MensagemInvalida:
            raise ErroEdicao("Confira os textos, os artigos e as referências da edição.") from None
