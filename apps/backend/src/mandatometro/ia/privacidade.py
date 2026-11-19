"""Guardas locais; nenhum valor identificado entra no diagnóstico."""

from __future__ import annotations

import re
import unicodedata
from collections.abc import Iterable
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from mandatometro.db.modelos import Ato

TRATAMENTO = re.compile(r"\b(?:dep|sen)\.|\b(?:deputad[oa]s?|senador(?:a|es|as)?)\b")
PARTIDO_UF = re.compile(
    r"\b[a-z][a-z0-9]{1,11}\s*[-/–]\s*"
    r"(?:ac|al|am|ap|ba|ce|df|es|go|ma|mg|ms|mt|pa|pb|pe|pi|pr|rj|rn|ro|rr|rs|sc|se|sp|to)\b"
)
TERMO_PESSOAL = re.compile(
    r"\b(?:licenc\w*|afast\w*|saude|doenc\w*|doentes?|adoec\w*|adoent\w*|convalesc\w*|"
    r"enferm(?:idades?|[oa]s?)|"
    # Exclui os adjetivos interna/internas, mas mantém interna-se e as demais flexões.
    # As terminações também evitam interno, internacional, internet e internauta.
    r"intern(?:a(?:r\w*|mos|is|m|va\w*|ste\w*|sse\w*|ndo|d[oa]s?|c(?:ao|oes)|-se)|"
    r"e(?:i|s|mos|is|m)?|ou)|hospitaliz\w*|cirurg(?:ias?|ic[oa]s?)|"
    r"(?:tratamentos?|atestados?|atendimentos?)\s+medic[oa]s?)\b"
)
# Só retêm para revisão: também aparecem em políticas públicas que devem continuar elegíveis.
TERMO_ADICIONAL_DA_REDE = re.compile(
    r"\b(?:hospital|hospitais|hospitalar(?:es)?|medic[oa]s?|operad[oa]s?)\b"
)
LICENCA_OU_AFASTAMENTO = re.compile(r"\b(?:licenc|afast)\w*\b")
PALAVRA_PARLAMENTAR = re.compile(
    r"\b(?:parlamentar(?:es)?|deputad[oa]s?|senador(?:a|es|as)?|dep|sen|suplentes?|mandatos?)\b"
)
PROPOSICAO_CITADA = re.compile(
    r"\b(?:pl[a-z]{0,2}|pec|mpv?|pd[clsn]|pr[csn]|"
    r"projetos?\s+de\s+(?:lei(?:\s+(?:complementar|de\s+conversao))?|"
    r"decreto\s+legislativo|resolucao)|propostas?\s+de\s+emenda\s+a\s+constituicao|"
    r"medidas?\s+provisorias?)(?:\s+(?:do\s+senado(?:\s+federal)?|"
    r"da\s+camara(?:\s+dos\s+deputados)?))?\s*(?:n(?:umero)?[.\s°o]*)?\d"
)
DISTANCIA_PESSOAL = 6

MotivoRetencaoAto = Literal["secao_de_pessoal", "documento_pessoal", "ato_de_pessoal"]
SECAO_DE_PESSOAL = re.compile(
    r"^(?:dou?[–-]?[ ]*)?(?:0?2e?|ii)(?:$|[ :–—-])|"
    r"\b(?:secao\s*[-:]?\s*(?:(?:n[.°o]+|numero)\s*)?(?:0?2|ii)|0?2[ao]\s+secao)\b"
)
ATOS_DE_PESSOAL = re.compile(r"\batos?\s+de\s+pessoal\b")
CPF = re.compile(r"(?<!\w)(?:[\d*x]{3}\.[\d*x]{3}\.[\d*x]{3}[-–][\d*x]{2}|\d{11})(?!\w)")
DOCUMENTO_PESSOAL = re.compile(
    r"\b(?:cpf|matriculas?(?:\s+(?:funcional|siape))?|siape|rg|cnh|ctps|nit|pis(?:/pasep)?|"
    r"pasep|rnm|rne|passaportes?|titulos?\s+de\s+eleitor|carteira\s+de\s+trabalho|"
    r"(?:cedula|carteira|documento)\s+de\s+identidade|numero\s+d[eo]\s+documento)\b[\s:.()/-]*"
    r"(?:(?:sob\s+o\s+)?(?:n\.?\s*[o°]?\.?|numero)\s*:?\s*)?(?:[a-z]{1,3}-?)?[*x]*\d"
)
TERMO_ATO_PESSOAL = re.compile(
    r"\b(?:nomea(?:c(?:ao|oes)|r|d[oa]s?|m|ndo|ram|va\w*)|nomei(?:[aeo]|am|em|ou)|"
    r"exoner\w*|design(?:a\w*|e[ms]?|ou)|dispens\w*|aposent\w*|pens(?:ao|oes)|"
    r"reform(?:a\w*|e[ms]?|ou)|promoc(?:ao|oes)|promov\w*|demiss(?:ao|oes)|demit\w*|"
    r"cass(?:a\w*|e[ms]?|ou)|penalidad(?:e|es)|penaliz\w*|sanc(?:ao|oes)|sancion\w*|"
    r"cess(?:ao|oes)|ced(?:e[ms]?|a[ms]?|er|eu|id[oa]s?|endo)|"
    r"remoc(?:ao|oes)|remov\w*|redistribu\w*|naturali[sz]\w*|extradi\w*|expuls\w*|"
    r"condecor\w*|titulos?\s+(?:honorific[oa]s?|de\s+(?:cidad(?:ania|aos?|as?)|benemerit[oa]s?|"
    r"doutor(?:a)?\s+honoris\s+causa)))\b"
)
# Esses sinais se aplicam ao termo da oração, sem liberar outros atos no mesmo texto.
REGRA_GERAL = re.compile(
    r"\b(?:concursos?\s+publicos?|tratados?|futur[oa]s?|"
    r"(?:cria|institui|estabelece)\s+(?:(?:o|a|os|as)\s+)?(?:cargos?\b|$)|"
    r"(?:regras?|normas?|regimes?|politicas?|criterios?|requisitos?|procedimentos?)\s+"
    r"(?:(?:gerais|propri[oa]s?)\s+)?(?:para|d[aeo]s?|sobre)\b)"
)
LEI_SANCIONADA = re.compile(
    r"\b(?:leis?|projetos?\s+de\s+leis?)\b"
    r"(?:[\s,]+(?:n[.o°]*|\d[\d/.-]*|ja|foi|foram|sera|serao|ser|sendo))*[\s,]*$"
)
REFORMA_GERAL = re.compile(
    r"^\s+(?:administrativ[oa]s?|previdenciari[oa]s?|tributari[oa]s?|eleitorais?|constitucionais?)\b"
)
ALVO_INSTITUCIONAL = re.compile(
    r"^[\s,:–-]*(?:(?:a|o|ao|as|os|aos|de|do|da|dos|das|para|contra|como|uma?|"
    r"concedid[oa]s?|aplicad[oa]s?|aplicave(?:l|is)|economic[oa]s?|comercia(?:l|is)|administrativ[oa]s?|"
    r"de\s+(?:multa|advertencia|suspensao))\s+)*"
    r"(?:orgaos?|programas?|sistemas?|conselhos?|comissoes?|comites?|instituicoes?|"
    r"ministerios?|entidades?|empresas?|pais(?:es)?|pessoas?\s+juridicas?|leis?|projetos?|"
    r"licitac(?:ao|oes)|orcamentos?|categorias?|carreiras?|igualdade|transparencia|saude|"
    r"educacao|cultura|presidencial|reformas?|previdencia|"
    r"imoveis?|residuos?|futur[oa]s?|(?:licencas?|autorizacoes?)\s+"
    r"(?:d[aeo]s?\s+)(?:uma?\s+)?(?:empresas?|entidades?))\b"
)
ALVO_COLETIVO = re.compile(
    r"^\s*(?:(?:a|o|ao|as|os|aos|de|do|da|dos|das|para)\s+)*"
    r"(?:servidores|servidoras|empregad[oa]s|militares|estrangeir[oa]s|dependentes|"
    r"funcoes|cargos|nomeacoes|pensoes)\b"
)
SINAL_INDIVIDUAL = re.compile(
    r"\b(?:a\s+pedido|ocupad[oa]s?\s+por|abaixo\s+relacionad[oa]s?|"
    r"listad[oa]s?\s+no\s+anexo|(?:sr|sra|senhor|senhora)(?=[.\s]))\b"
)
ORACOES_ATO = re.compile(
    r"[;!?]+|(?<=[a-z]{5})\.+\s+|\be\s+(?=(?:nomeia|exonera|designa|dispensa|"
    r"demite|cassa|aplica|cede|remove|redistribui|expulsa|concede|condecora)\b)"
)


def normalizar(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", texto.casefold()) if not unicodedata.combining(c)
    )


def motivo_retencao_ato(ato: Ato) -> MotivoRetencaoAto | None:
    """Classifica a linha do DOU antes de qualquer uso editorial ou pelo modelo."""
    tipo, titulo, ementa, secao, orgao = (
        re.sub(r"\s+", " ", normalizar(texto or "")).strip()
        for texto in (ato.tipo, ato.titulo, ato.ementa, ato.secao, ato.orgao)
    )
    if SECAO_DE_PESSOAL.search(secao) or ATOS_DE_PESSOAL.search(secao):
        return "secao_de_pessoal"
    if any(
        CPF.search(t) or DOCUMENTO_PESSOAL.search(t) for t in (tipo, titulo, ementa, secao, orgao)
    ):
        return "documento_pessoal"
    if TERMO_ATO_PESSOAL.fullmatch(tipo) or any(
        ATOS_DE_PESSOAL.search(t) for t in (tipo, titulo, ementa, orgao)
    ):
        return "ato_de_pessoal"
    for texto in (titulo, ementa):
        for oracao in ORACOES_ATO.split(texto):
            for termo in TERMO_ATO_PESSOAL.finditer(oracao):
                antes, depois = oracao[: termo.start()], oracao[termo.end() :]
                if ALVO_INSTITUCIONAL.match(depois):
                    continue
                if termo[0].startswith("sancion") and LEI_SANCIONADA.search(antes):
                    continue
                if termo[0].startswith("reform") and REFORMA_GERAL.match(depois):
                    continue
                if SINAL_INDIVIDUAL.search(depois) or (
                    not ALVO_COLETIVO.match(depois) and not REGRA_GERAL.search(antes)
                ):
                    return "ato_de_pessoal"
    return None


def separar_atos_para_modelo(
    atos: Iterable[Ato],
) -> tuple[list[Ato], list[tuple[int, MotivoRetencaoAto]]]:
    """Devolve os atos elegíveis e, para cada retido, apenas o id interno e o código."""
    elegiveis, retidos = [], []
    for ato in atos:
        motivo = motivo_retencao_ato(ato)
        if motivo is None:
            elegiveis.append(ato)
        else:
            retidos.append((ato.id, motivo))
    return elegiveis, retidos


def identificacao(texto: str, nomes: Iterable[str]) -> bool:
    texto = normalizar(texto)
    if TRATAMENTO.search(texto) or PARTIDO_UF.search(texto):
        return True
    return any(
        re.search(r"(?<!\w)" + re.escape(normalizar(nome)) + r"(?!\w)", texto)
        for nome in nomes
        if len(nome.split()) >= 2
    )


def assunto_pessoal(texto: str, nomes: Iterable[str], *, siglas: Iterable[str] = ()) -> bool:
    """Termo pessoal ligado a parlamentar; siglas só vêm dos vínculos da fonte."""
    texto = re.sub(r"\s+", " ", normalizar(texto))
    if not TERMO_PESSOAL.search(texto):
        return False
    requerimento = any(normalizar(s).startswith(("req", "rq")) for s in siglas) or re.match(
        r"\s*(?:requer|requerimento)\b", texto
    )
    if (
        requerimento
        and LICENCA_OU_AFASTAMENTO.search(texto)
        and not PROPOSICAO_CITADA.search(texto)
    ):
        return True

    # O nome da Casa não identifica parlamentar. Mantém a contagem de três palavras,
    # sem mudar a guarda mais ampla de identificacao usada na entrada do redator.
    texto = re.sub(r"\bcamara\s+dos\s+deputados\b", "casa legislativa federal", texto)
    sinais = [PALAVRA_PARLAMENTAR, PARTIDO_UF]
    sinais.extend(
        re.compile(r"(?<!\w)" + re.escape(normalizar(nome)) + r"(?!\w)")
        for nome in nomes
        if len(nome.split()) >= 2
    )
    # Ponto após palavra curta preserva a ligação, inclusive em abreviações.
    # Cinco letras antes do ponto bastam; ! e ? sempre encerram a frase.
    for frase in re.split(r"(?<=[a-z]{5})\.+|[!?]+", texto):
        termos = list(TERMO_PESSOAL.finditer(frase))
        if not termos:
            continue
        for padrao in sinais:
            for sinal in padrao.finditer(frase):
                for termo in termos:
                    antes, depois = sorted((termo, sinal), key=lambda m: m.start())
                    intervalo = frase[antes.end() : depois.start()]
                    if len(re.findall(r"\w+", intervalo)) <= DISTANCIA_PESSOAL:
                        return True
    return False
