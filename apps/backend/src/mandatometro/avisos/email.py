"""Conteúdo compartilhado pela prévia, inscrição e envio semanal; texto nunca vira HTML."""

from collections.abc import Collection
from dataclasses import dataclass
from datetime import UTC
from html import escape
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import ValidationError

from mandatometro.db.modelos import Edicao, Fonte, ItemEdicao
from mandatometro.ia.artigos import CATALOGO
from mandatometro.ia.esquemas import Fatos, FatosAto, FatosItem

DOMINIOS_OFICIAIS = ("gov.br", "leg.br", "jus.br", "mp.br", "def.br")
FONTE_OCULTA_NA_PREVIA = "Fonte oficial disponível no arquivo de revisão."


class MensagemInvalida(Exception):
    """Conteúdo ou configuração que não permite uma mensagem com fontes e links seguros."""


@dataclass(frozen=True)
class Mensagem:
    assunto: str
    html: str
    texto: str
    cabecalhos: dict[str, str]


@dataclass(frozen=True)
class Conteudo:
    html: str
    texto: str


def _url(url: str, *, base: bool = False, previa: bool = False) -> str:
    try:
        partes = urlsplit(url)
        host = partes.hostname or ""
        invalida = (
            not host
            or partes.scheme not in ("http", "https")
            or partes.username is not None
            or partes.password is not None
            or any(c.isspace() or ord(c) < 32 for c in url)
        )
        if base:
            local = previa and host in ("localhost", "127.0.0.1")
            invalida |= (partes.scheme != "https" and not local) or bool(
                partes.query or partes.fragment
            )
        else:
            invalida |= not any(
                host == dominio or host.endswith("." + dominio) for dominio in DOMINIOS_OFICIAIS
            )
        if invalida:
            raise MensagemInvalida("URL inadequada para o e-mail.")
    except ValueError:
        raise MensagemInvalida("URL inadequada para o e-mail.") from None
    return url.rstrip("/") if base else url


def validar_enderecos_envio(app_base_url: str, api_url: str) -> None:
    _url(app_base_url, base=True)
    _url(api_url, base=True)


def formatar_edicao(
    edicao: Edicao,
    *,
    app_base_url: str,
    fontes: dict[int, Fonte] | None = None,
    previa: bool = False,
    itens_sem_link: Collection[int] = (),
) -> Conteudo:
    """Não lê banco, não publica e não envia. A prévia admite endereço local do site."""
    if not edicao.titulo.strip() or any(ord(c) < 32 for c in edicao.titulo):
        raise MensagemInvalida("Título inadequado para o e-mail.")
    votacoes, atos = [], []
    for item in sorted(edicao.itens, key=lambda item: item.ordem):
        try:
            fatos = Fatos.ler(item.fatos) if item.fatos is not None else None
        except (ValidationError, ValueError, TypeError):
            raise MensagemInvalida("Item com fatos inválidos.") from None
        secao = atos if isinstance(fatos, FatosAto) else votacoes
        secao.append((item, fatos))

    html, texto = [f"<h1>{escape(edicao.titulo)}</h1>"], [edicao.titulo]
    secoes = [
        ("O que o Congresso votou" if atos else None, votacoes),
        ("O que saiu no Diário Oficial", atos),
    ]
    for titulo, itens in secoes:
        if not itens:
            continue
        conteudo = _formatar_secao(
            itens,
            titulo=titulo,
            app_base_url=app_base_url,
            fontes=fontes or {},
            previa=previa,
            itens_sem_link=itens_sem_link,
        )
        html.append(conteudo.html)
        texto.append(conteudo.texto)
    return Conteudo("\n".join(html), "\n\n".join(texto))


def _formatar_secao(
    itens: list[tuple[ItemEdicao, FatosItem | None]],
    *,
    titulo: str | None,
    app_base_url: str,
    fontes: dict[int, Fonte],
    previa: bool,
    itens_sem_link: Collection[int],
) -> Conteudo:
    html, texto = [], []
    if titulo:
        html.append(f"<h2>{escape(titulo)}</h2>")
        texto.append(titulo)
    nivel_titulo = "h3" if titulo else "h2"
    for item, fatos in itens:
        if item.fonte is None:
            raise MensagemInvalida("Item sem fonte completa.")
        referencias, linhas = [item.fonte], []
        de_ato = isinstance(fatos, FatosAto)
        if fatos is not None:
            if item.fonte.id not in fatos.fontes:
                raise MensagemInvalida("A fonte principal não está nas referências do item.")
            referencias.extend(
                fontes.get(i) for i in dict.fromkeys(fatos.fontes) if i != item.fonte.id
            )
            if de_ato:
                linhas.append(f"Publicado no Diário Oficial em {fatos.data_publicacao:%d/%m/%Y}.")
            else:
                for votacao in fatos.votacoes:
                    resultado = (
                        "O resultado desta votação não está classificado nos dados usados."
                        if votacao.resultado == "outro"
                        else f"Resultado registrado: {votacao.resultado}."
                    )
                    linhas.append(f"Votação em {votacao.data:%d/%m/%Y}. {resultado}")
                    p = votacao.placar
                    if p is None:
                        linhas.append("O placar não está disponível nos dados usados.")
                    else:
                        linhas.append(
                            f"Votos registrados — Sim: {p.sim}; Não: {p.nao}; "
                            f"Abstenções: {p.abstencao}; Obstruções: {p.obstrucao}. "
                            f"Presidência: {p.presidente} (contada à parte)."
                        )
        corpo = "\n\n".join([item.texto, *linhas])
        html.extend(
            [
                f"<{nivel_titulo}>{escape(item.titulo)}</{nivel_titulo}>",
                "<p>" + escape(corpo).replace("\n", "<br>") + "</p>",
            ]
        )
        texto.extend([item.titulo, corpo])
        por_pagina: dict[str, list[Fonte]] = {}
        for fonte in referencias:
            if fonte is None or fonte.coletado_em is None:
                raise MensagemInvalida("Item sem fonte completa.")
            if de_ato and not fonte.url_publica:
                raise MensagemInvalida("A referência do ato está sem página oficial.")
            url = _url(fonte.url_publica or fonte.url)
            por_pagina.setdefault(url, []).append(fonte)
        for indice, (url, fontes_pagina) in enumerate(por_pagina.items()):
            rotulo = "Fonte oficial" if indice == 0 else "Outra referência oficial"
            for numero, fonte in enumerate(fontes_pagina):
                coleta = fonte.coletado_em.astimezone(UTC).strftime("%d/%m/%Y às %H:%M UTC")
                if numero == 0:
                    if previa and item.id in itens_sem_link:
                        link_html = link_texto = FONTE_OCULTA_NA_PREVIA
                    else:
                        link_html = f'<a href="{escape(url, quote=True)}">{rotulo}</a>'
                        link_texto = f"{rotulo}: {url}"
                    html.append(f"<p>{link_html} · Coleta: {coleta}</p>")
                    texto.append(f"{link_texto}\nColeta: {coleta}")
                else:
                    html.append(f"<p>Outra coleta da mesma referência: {coleta}</p>")
                    texto.append(f"Outra coleta da mesma referência: {coleta}")
                if fonte.trecho and not de_ato:
                    html.append(f"<blockquote>{escape(fonte.trecho)}</blockquote>")
                    texto.append(f"Trecho da fonte: {fonte.trecho}")
        if item.artigo_caminho is not None:
            if item.artigo_caminho not in CATALOGO:
                raise MensagemInvalida("Artigo fora do catálogo da trilha.")
            url_artigo = _url(app_base_url, base=True, previa=previa) + item.artigo_caminho
            html.append(f'<p><a href="{escape(url_artigo, quote=True)}">Entenda na trilha</a></p>')
            texto.append(f"Entenda na trilha: {url_artigo}")
    return Conteudo("\n".join(html), "\n\n".join(texto))


def montar_email(
    edicao: Edicao,
    codigo_saida: UUID,
    *,
    app_base_url: str,
    api_url: str,
    fontes: dict[int, Fonte] | None = None,
) -> Mensagem:
    if edicao.estado != "publicada" or edicao.publicada_em is None:
        raise MensagemInvalida("Só uma edição publicada pode ser enviada.")
    pagina_saida = f"{_url(app_base_url, base=True)}/newsletter/sair?codigo={codigo_saida}"
    endpoint_saida = f"{_url(api_url, base=True)}/newsletter/saida/{codigo_saida}"
    conteudo = formatar_edicao(edicao, app_base_url=app_base_url, fontes=fontes)
    return Mensagem(
        assunto=edicao.titulo,
        html=(
            f'<html lang="pt-BR"><body>{conteudo.html}\n'
            f'<p><a href="{escape(pagina_saida, quote=True)}">Sair da newsletter</a></p>'
            "</body></html>"
        ),
        texto=conteudo.texto + f"\n\nSair da newsletter: {pagina_saida}",
        cabecalhos={
            "List-Unsubscribe": f"<{endpoint_saida}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    )
