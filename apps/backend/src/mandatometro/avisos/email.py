"""Montagem do e-mail, compartilhada pela inscrição e pelo envio semanal (#39).

O visual da #113 pode trocar só este módulo. Texto do banco nunca vira HTML executável.
"""

from dataclasses import dataclass
from datetime import UTC
from html import escape
from urllib.parse import urlsplit
from uuid import UUID

from mandatometro.db.modelos import Edicao

DOMINIOS_OFICIAIS = ("gov.br", "leg.br", "jus.br", "mp.br", "def.br")


class MensagemInvalida(Exception):
    """Edição ou configuração que não permite montar um envio com fontes e saída seguras."""


@dataclass(frozen=True)
class Mensagem:
    assunto: str
    html: str
    texto: str
    cabecalhos: dict[str, str]


def _url(url: str, *, base: bool = False) -> str:
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
            invalida |= partes.scheme != "https" or bool(partes.query or partes.fragment)
        else:
            invalida |= not any(
                host == dominio or host.endswith("." + dominio) for dominio in DOMINIOS_OFICIAIS
            )
        if invalida:
            raise MensagemInvalida("URL inadequada para o e-mail.")
    except ValueError:
        raise MensagemInvalida("URL inadequada para o e-mail.") from None
    return url.rstrip("/") if base else url


def montar_email(
    edicao: Edicao, codigo_saida: UUID, *, app_base_url: str, api_url: str
) -> Mensagem:
    if edicao.estado != "publicada" or edicao.publicada_em is None:
        raise MensagemInvalida("Só uma edição publicada pode ser enviada.")
    if not edicao.titulo.strip() or any(ord(c) < 32 for c in edicao.titulo):
        raise MensagemInvalida("Título inadequado para o e-mail.")

    pagina_saida = f"{_url(app_base_url, base=True)}/newsletter/sair?codigo={codigo_saida}"
    endpoint_saida = f"{_url(api_url, base=True)}/newsletter/saida/{codigo_saida}"
    html = [f'<html lang="pt-BR"><body><h1>{escape(edicao.titulo)}</h1>']
    texto = [edicao.titulo]
    for item in sorted(edicao.itens, key=lambda item: item.ordem):
        fonte = item.fonte
        if fonte is None or fonte.coletado_em is None:
            raise MensagemInvalida("Item sem fonte completa.")
        url = _url(fonte.url_publica or fonte.url)
        coleta = fonte.coletado_em.astimezone(UTC).strftime("%d/%m/%Y às %H:%M UTC")
        html.extend(
            [
                f"<h2>{escape(item.titulo)}</h2>",
                "<p>" + escape(item.texto).replace("\n", "<br>") + "</p>",
                f'<p><a href="{escape(url, quote=True)}">Fonte oficial</a> · Coleta: {coleta}</p>',
            ]
        )
        texto.extend([item.titulo, item.texto, f"Fonte oficial: {url}\nColeta: {coleta}"])
        if fonte.trecho:
            html.append(f"<blockquote>{escape(fonte.trecho)}</blockquote>")
            texto.append(f"Trecho da fonte: {fonte.trecho}")
    html.append(
        f'<p><a href="{escape(pagina_saida, quote=True)}">Sair da newsletter</a></p></body></html>'
    )
    texto.append(f"Sair da newsletter: {pagina_saida}")
    return Mensagem(
        assunto=edicao.titulo,
        html="\n".join(html),
        texto="\n\n".join(texto),
        cabecalhos={
            "List-Unsubscribe": f"<{endpoint_saida}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    )
