"""Catálogo explícito de artigos publicados; não depende da pasta do site em produção."""

from mandatometro.ia.privacidade import normalizar
from mandatometro.ia.selecao import ItemBase

BASE = "/trilhas/processo-legislativo/"
CATALOGO = {
    BASE + "quem-pode-propor-uma-lei": "Quem pode propor uma lei",
    BASE + "onde-o-projeto-comeca": "Onde o projeto começa",
    BASE + "o-projeto-passa-pelas-comissoes": "O projeto passa pelas comissões",
    BASE + "o-plenario-vota-o-projeto": "O Plenário vota o projeto",
    BASE + "a-outra-casa-revisa-o-projeto": "A outra Casa revisa o projeto",
    BASE + "o-presidente-sanciona-ou-veta": "O presidente sanciona ou veta",
}


def sugerir(item: ItemBase) -> str | None:
    textos = " ".join(normalizar(v.descricao) for v in item.votacoes)
    if "recurso" in textos and "conclusiv" in textos:
        return BASE + "o-projeto-passa-pelas-comissoes"
    if all(p.sigla in ("PL", "PLP") for p in item.proposicoes):
        return BASE + "o-plenario-vota-o-projeto"
    return None
