"""Conteúdo compartilhado pela prévia, inscrição e envio semanal; texto nunca vira HTML."""

import re
from collections.abc import Collection
from dataclasses import dataclass
from datetime import UTC
from html import escape
from urllib.parse import urlsplit
from uuid import UUID

from pydantic import ValidationError

from mandatometro.db.modelos import Edicao, Fonte, ItemEdicao
from mandatometro.ia.artigos import CATALOGO
from mandatometro.ia.esquemas import Fatos, FatosAto, FatosItem, FatoVotacao

DOMINIOS_OFICIAIS = ("gov.br", "leg.br", "jus.br", "mp.br", "def.br")
FONTE_OCULTA_NA_PREVIA = "Fonte oficial disponível no arquivo de revisão."

_PAPEL = "#f6f1e4"
_FOLHA = "#fffdf7"
_TINTA = "#14161c"
_SUAVE = "#4f5461"
_FIO = "#d8cfb8"
_FITAS = ("#00a650", "#ffd200", "#0a78c8", "#e6007e", "#e30613")
_SANS = "font-family:Arial,Helvetica,sans-serif;"
_SERIFA = "font-family:Georgia,'Times New Roman',serif;"
_MANCHETE = f"font-family:'Arial Narrow',Arial,sans-serif;font-weight:900;color:{_TINTA};"
_ROTULO = (
    f"{_SANS}color:{_SUAVE};font-size:13px;line-height:18px;font-weight:bold;"
    "letter-spacing:0.7px;text-transform:uppercase;"
)
_META = f"{_SANS}font-size:14px;line-height:20px;color:{_SUAVE};"
_LINK = f"color:{_TINTA};text-decoration:underline;"
_TABELA = 'role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"'


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

    html = [
        f'<h1 class="titulo-da-edicao" style="margin:0 0 24px;{_MANCHETE}font-size:36px;'
        f'line-height:1.1;text-transform:uppercase;text-wrap:balance;">{escape(edicao.titulo)}</h1>'
    ]
    texto = [edicao.titulo]
    secoes = [
        ("O que o Congresso votou" if atos else None, votacoes),
        ("O que saiu no Diário Oficial", atos),
    ]
    for titulo, itens in secoes:
        if not itens:
            continue
        if titulo:
            html.append(f'<h2 style="margin:24px 0 8px;{_ROTULO}">{titulo}</h2>')
            texto.append(titulo)
        for item, fatos in itens:
            conteudo = _formatar_item(
                item,
                fatos,
                nivel=3 if titulo else 2,
                app_base_url=app_base_url,
                fontes=fontes or {},
                previa=previa,
                ocultar_fontes=previa and item.id in itens_sem_link,
            )
            html.append(conteudo.html)
            texto.append(conteudo.texto)
    return Conteudo("\n".join(html), "\n\n".join(texto))


def _formatar_votacao(votacao: FatoVotacao, nivel: int) -> Conteudo:
    titulo = f"Votação em {votacao.data:%d/%m/%Y}"
    resultado = (
        "O resultado desta votação não está classificado nos dados usados."
        if votacao.resultado == "outro"
        else f"Resultado registrado: {votacao.resultado}."
    )
    html = [
        f'<h{nivel} style="margin:0 0 2px;{_ROTULO}">{titulo}</h{nivel}>',
        f'<p style="margin:0;font-weight:bold;">{resultado}</p>',
    ]
    texto = [f"{titulo}. {resultado}"]
    placar = votacao.placar
    if placar is None:
        aviso = "O placar não está disponível nos dados usados."
        html.append(f'<p style="margin:4px 0 0;">{aviso}</p>')
        texto.append(aviso)
    else:
        contagens = (
            ("Sim", placar.sim),
            ("Não", placar.nao),
            ("Abstenções", placar.abstencao),
            ("Obstruções", placar.obstrucao),
        )
        numeros = " ".join(
            f'<span style="display:inline-block;margin-right:12px;">'
            f"{nome}: <strong>{valor}</strong></span>"
            for nome, valor in contagens
        )
        presidencia = f"Presidência: {placar.presidente} (contada à parte)."
        html.extend(
            [
                f'<p style="margin:4px 0;">{numeros}</p>',
                f'<p style="margin:0;{_META}">{presidencia}</p>',
            ]
        )
        texto.extend(
            [
                "Votos registrados — "
                + "; ".join(f"{nome}: {valor}" for nome, valor in contagens)
                + ".",
                presidencia,
            ]
        )
    linha = (
        f'<tr><td bgcolor="{_PAPEL}" style="padding:10px 14px;border-top:1px solid {_FIO};'
        f'background-color:{_PAPEL};{_SANS}font-size:15px;line-height:21px;color:{_TINTA};">'
        + "\n".join(html)
        + "</td></tr>"
    )
    return Conteudo(linha, "\n".join(texto))


def _formatar_fontes(
    item: ItemEdicao, fatos: FatosItem | None, fontes: dict[int, Fonte], *, ocultar: bool
) -> Conteudo:
    if item.fonte is None:
        raise MensagemInvalida("Item sem fonte completa.")
    referencias = [item.fonte]
    if fatos is not None:
        if item.fonte.id not in fatos.fontes:
            raise MensagemInvalida("A fonte principal não está nas referências do item.")
        referencias.extend(fontes.get(i) for i in dict.fromkeys(fatos.fontes) if i != item.fonte.id)
    de_ato = isinstance(fatos, FatosAto)
    por_pagina: dict[str, list[Fonte]] = {}
    for fonte in referencias:
        if fonte is None or fonte.coletado_em is None:
            raise MensagemInvalida("Item sem fonte completa.")
        if de_ato and not fonte.url_publica:
            raise MensagemInvalida("A referência do ato está sem página oficial.")
        url = _url(fonte.url_publica or fonte.url)
        por_pagina.setdefault(url, []).append(fonte)

    html, texto = [], []
    for indice, (url, fontes_pagina) in enumerate(por_pagina.items(), start=1):
        rotulo = "Fonte oficial" if indice == 1 else "Outra referência oficial"
        coletas = []
        for numero, fonte in enumerate(fontes_pagina):
            coleta = fonte.coletado_em.astimezone(UTC).strftime("%d/%m/%Y às %H:%M UTC")
            if numero == 0:
                if ocultar:
                    link_html = link_texto = FONTE_OCULTA_NA_PREVIA
                else:
                    nome = f"{rotulo} {indice} — {item.titulo}"
                    link_html = (
                        f'<a href="{escape(url)}" style="{_LINK}" aria-label="{escape(nome)}">'
                        f"{rotulo}</a>"
                    )
                    link_texto = f"{rotulo}: {url}"
                linha = f"{link_html} · Coleta: {coleta}"
                coletas.append(f"{link_texto}\nColeta: {coleta}")
            else:
                linha = f"Outra coleta da mesma referência: {coleta}"
                coletas.append(linha)
            html.append(f'<p style="margin:8px 0 0;{_META}">{linha}</p>')
            if fonte.trecho and not de_ato:
                html.append(
                    f'<blockquote style="margin:4px 0 0;padding:0 0 0 12px;'
                    f"border-left:2px solid {_FIO};{_SERIFA}font-size:15px;line-height:21px;"
                    f'color:{_SUAVE};">“{escape(fonte.trecho)}”</blockquote>'
                )
                coletas.append(f"Trecho da fonte: {fonte.trecho}")
        texto.append("\n".join(coletas))
    return Conteudo("\n".join(html), "\n\n".join(texto))


def _formatar_item(
    item: ItemEdicao,
    fatos: FatosItem | None,
    *,
    nivel: int,
    app_base_url: str,
    fontes: dict[int, Fonte],
    previa: bool,
    ocultar_fontes: bool,
) -> Conteudo:
    html = [
        f'<h{nivel} style="margin:0 0 12px;padding-top:16px;border-top:2px solid {_TINTA};'
        f'{_MANCHETE}font-size:25px;line-height:1.17;">{escape(item.titulo)}</h{nivel}>'
    ]
    texto = [item.titulo, item.texto]
    corpo = item.texto.replace("\r\n", "\n").replace("\r", "\n")
    for paragrafo in re.split(r"\n\s*\n", corpo):
        linhas = escape(paragrafo).replace("\n", "<br>")
        html.append(
            f'<p style="margin:0 0 14px;{_SERIFA}font-size:18px;line-height:1.55;'
            f'color:{_TINTA};">{linhas}</p>'
        )
    if isinstance(fatos, FatosAto):
        data = f"Publicado no Diário Oficial em {fatos.data_publicacao:%d/%m/%Y}."
        html.append(f'<p style="margin:8px 0;{_META}">{data}</p>')
        texto.append(data)
    elif isinstance(fatos, Fatos):
        votos = [_formatar_votacao(v, nivel + 1) for v in fatos.votacoes]
        html.append(f'<table {_TABELA} style="border-collapse:collapse;">')
        html.extend(v.html for v in votos)
        html.append("</table>")
        texto.extend(v.texto for v in votos)
    referencias = _formatar_fontes(item, fatos, fontes, ocultar=ocultar_fontes)
    html.extend(
        [
            f'<h{nivel + 1} style="margin:16px 0 0;{_ROTULO}">Fontes</h{nivel + 1}>',
            referencias.html,
        ]
    )
    texto.append(referencias.texto)
    if item.artigo_caminho is not None:
        if item.artigo_caminho not in CATALOGO:
            raise MensagemInvalida("Artigo fora do catálogo da trilha.")
        url_artigo = _url(app_base_url, base=True, previa=previa) + item.artigo_caminho
        rotulo = f"Entenda na trilha: {CATALOGO[item.artigo_caminho]}"
        html.append(
            f'<p style="margin:16px 0 0;{_META}font-weight:bold;">'
            f'<a href="{escape(url_artigo)}" style="{_LINK}">{escape(rotulo)}</a></p>'
        )
        texto.append(f"{rotulo}\n{url_artigo}")
    return Conteudo(
        '<div style="padding-bottom:24px;">' + "\n".join(html) + "</div>", "\n\n".join(texto)
    )


def _folha(titulo: str, conteudo_html: str, pagina_edicao: str, pagina_saida: str) -> str:
    fitas = "".join(
        f'<td width="20%" height="6" bgcolor="{cor}" style="background-color:{cor};'
        'height:6px;font-size:1px;line-height:6px;mso-line-height-rule:exactly;">&nbsp;</td>'
        for cor in _FITAS
    )
    # O Outlook clássico usa a tabela condicional para limitar a largura da folha.
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(titulo)}</title>
<style>
@media screen and (max-width:380px) {{
  .marca-do-jornal {{ font-size:19px !important; }}
  .titulo-da-edicao {{ font-size:29px !important; }}
}}
</style>
</head>
<body style="margin:0;padding:0;background-color:{_PAPEL};">
<table {_TABELA} bgcolor="{_PAPEL}" style="background-color:{_PAPEL};border-collapse:collapse;">
<tr><td align="center" style="padding:16px 8px;">
<!--[if mso]>
<table role="presentation" width="624" border="0" cellspacing="0" cellpadding="0"><tr><td>
<![endif]-->
<table {_TABELA} align="center" bgcolor="{_FOLHA}"
 style="width:100%;max-width:624px;table-layout:fixed;border-collapse:collapse;
 background-color:{_FOLHA};border:1px solid {_FIO};">
<tr><td bgcolor="{_TINTA}" style="background-color:{_TINTA};">
  <table {_TABELA} style="border-collapse:collapse;"><tr>
    <td class="marca-do-jornal" align="left" style="padding:14px 0 14px 20px;
    font-family:'Arial Narrow',Arial,sans-serif;
    font-size:22px;line-height:28px;font-weight:900;text-transform:uppercase;
    color:{_FOLHA};">Mandatômetro</td>
    <td align="right" style="padding:14px 20px 14px 10px;{_SANS}font-size:14px;line-height:19px;">
      <a href="{escape(pagina_edicao)}" style="color:{_FOLHA};text-decoration:underline;">
        Ler edição no site</a></td>
  </tr></table>
</td></tr>
<tr><td><table {_TABELA} aria-hidden="true" style="border-collapse:collapse;">
  <tr>{fitas}</tr>
</table></td></tr>
<tr><td align="left" style="padding:28px 5% 0;word-wrap:break-word;overflow-wrap:anywhere;">
{conteudo_html}
</td></tr>
<tr><td align="left" bgcolor="{_PAPEL}" style="padding:18px 5%;border-top:3px solid {_TINTA};
 background-color:{_PAPEL};{_META}">
  <a href="{escape(pagina_saida)}" style="{_LINK}">Sair da newsletter</a>
</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>"""


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
    site = _url(app_base_url, base=True)
    pagina_edicao = f"{site}/edicoes/{edicao.id}"
    pagina_saida = f"{site}/newsletter/sair?codigo={codigo_saida}"
    endpoint_saida = f"{_url(api_url, base=True)}/newsletter/saida/{codigo_saida}"
    conteudo = formatar_edicao(edicao, app_base_url=app_base_url, fontes=fontes)
    return Mensagem(
        assunto=edicao.titulo,
        html=_folha(edicao.titulo, conteudo.html, pagina_edicao, pagina_saida),
        texto=(
            f"Mandatômetro\nLer edição no site: {pagina_edicao}\n\n"
            f"{conteudo.texto}\n\nSair da newsletter: {pagina_saida}"
        ),
        cabecalhos={
            "List-Unsubscribe": f"<{endpoint_saida}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    )
