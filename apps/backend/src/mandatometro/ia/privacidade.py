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
    r"^(?:dou?[–-]?[ ]*)?(?:0?2[aeo]?|ii)(?:$|[ :–—-])|"
    r"\b(?:secao\s*[-:]?\s*(?:(?:n[.°o]+|numero)\s*)?(?:0?2[ao]?|ii)|0?2[ao]\s+secao)\b"
)
ATOS_DE_PESSOAL = re.compile(r"\batos?\s+de\s+pessoal\b")
CPF = re.compile(
    r"(?<!\w)(?:[\d*x]{3}(?:\s*\.\s*|\s+)[\d*x]{3}(?:\s*\.\s*|\s+)"
    r"[\d*x]{3}(?:\s*[-–]\s*|\s+)[\d*x]{2}|\d{11})(?!\w)"
)
DOCUMENTO_PESSOAL = re.compile(
    r"\b(?:cpf|matriculas?(?:\s+(?:funcional|siape))?|siape|rg|cnh|ctps|nit|pis(?:/pasep)?|"
    r"pasep|rnm|rne|passaportes?|titulos?\s+de\s+eleitor|carteira\s+de\s+trabalho|"
    r"(?:cedula|carteira|documento)\s+de\s+identidade|numero\s+d[eo]\s+documento)\b[\s:.()/-]*"
    r"(?:(?:sob\s+o\s+)?(?:n\.?\s*[o°]?\.?|numero)\s*:?\s*)?(?:[a-z]{1,3}-?)?[*x]*\d"
)
TERMO_ATO_PESSOAL = re.compile(
    r"\b(?:nomea(?:c(?:ao|oes)|r|d[oa]s?|m|ndo|ram|va\w*)|nomei(?:[aeo]|am|em|ou)|"
    r"exoner\w*|design(?:a\w*|e[ms]?|ou?)|dispens\w*|aposent\w*|pens(?:ao|oes)|"
    r"reform(?:a\w*|e[ms]?|ou?)|promoc(?:ao|oes)|promov\w*|demiss(?:ao|oes)|demit\w*|"
    r"cass(?:a\w*|e[ms]?|ou?)|penalidad(?:e|es)|penaliz\w*|sanc(?:ao|oes)|sancion\w*|"
    r"cess(?:ao|oes)|ced(?:e[ms]?|a[ms]?|er|eu|id[oa]s?|endo)|"
    r"cedo(?=\s+(?:[oa]s?\s+)?(?:servidora?|empregad[oa]|funcionari[oa]|pessoa)\b)|"
    r"remoc(?:ao|oes)|remov\w*|redistribu\w*|naturali[sz]\w*|extradi\w*|expuls\w*|"
    r"condecor\w*|(?:conced[eo]|outorg[ao]|confere|confiro|atribu[io])\s+"
    r"(?:(?:o|a|os|as|um|uns)\s+)?titulos?|"
    r"titulos?\s+(?:honor(?:ari|ific)[oa]s?|(?:concedid|outorgad|conferid)[oa]s?|"
    r"de\s+(?:cidad(?:ania|aos?|as?)|benemerit[oa]s?|visitantes?\s+ilustres?|"
    r"doutor(?:a)?\s+honoris\s+causa))|"
    r"declar\w*(?:-se)?\s+vag[oa]s?|vacancias?|recondu(?:z\w*|c(?:ao|oes))|readapt\w*|"
    r"substitut[oa]s?\s+eventua(?:l|is)|perdas?\s+d[ae]\s+nacionalidades?|"
    r"(?P<ambiguo>torn\w*(?:-se)?\s+sem\s+efeito|posses?|afast\w*|licencas?|"
    r"reintegr\w*|revert\w*|revers(?:ao|oes)|aproveitamentos?|disponibilidades?|"
    r"medalhas?|orde(?:m|ns)|indult\w*|anisti\w*))\b"
)
FORMA_INDIVIDUAL = re.compile(
    r"\b(?:termos?\s+de\s+posse|licencas?\s+(?:a|ao|da|do)\s+servidora?|"
    r"afastamento\s+do\s+pais\s+(?:da|do)\s+servidora?|"
    r"reintegr\w*(?:\s+[a-z]+){0,3}\s+ao\s+cargo|"
    r"revert\w*(?:\s+[a-z]+){0,3}\s+ao\s+servico\s+ativo)\b"
)
INSTITUICAO = (
    r"orgaos?|programas?|sistemas?|conselhos?|comiss(?:ao|oes)|comites?|instituic(?:ao|oes)|"
    r"ministerios?|entidades?|empresas?|pais(?:es)?|leis?|projetos?|estados?|municipios?|"
    r"secretarias?|departamentos?|institutos?|fundac(?:ao|oes)|universidades?|grupos?|"
    r"agencias?|autarquias?|forcas?|tribuna(?:l|is)|camara(?:s)?|congresso|presidencia|"
    r"uniao|republica|diarios?|portarias?|decretos?|resoluc(?:ao|oes)|medalhas?|orde(?:m|ns)"
)
INICIO_INSTITUCIONAL = re.compile(rf"^(?:(?:d[aeo]s?|e)\s+)*(?:{INSTITUICAO})\b")
PALAVRA_CAPITALIZADA = r"[A-ZÀ-ÖØ-Þ][^\W\d_]+(?:[-'’][^\W\d_]+)*"
POSSIVEL_NOME = re.compile(
    rf"\b(?:(?P<anterior>[a-zà-öø-ÿ][^\W\d_]*)\s+)?"
    rf"(?P<nome>{PALAVRA_CAPITALIZADA}(?:\s+(?:(?:d[aeo]s?|e)\s+)*{PALAVRA_CAPITALIZADA})+)\b"
)
LISTA_APOS_DOIS_PONTOS = re.compile(r":\s*(?:[-–—•]|\d+[.)])[ \t]+\S")
LISTA_NOMINAL = re.compile(
    r"\b(?:abaixo\s+relacionad[oa]s?|(?:listad[oa]s?|relacionad[oa]s?|nominad[oa]s?)\s+(?:no|em)\s+anexo|"
    r"nomes?\s+(?:no|em|do)\s+anexo|anexo\s+(?:nominal|de\s+nomes)|"
    r"(?<!sem )(?<!sem a )(?:lista|relacao)\s+(?:nominal|de\s+nomes))\b"
)
# Esses sinais se aplicam ao termo da oração, sem liberar outros atos no mesmo texto.
REGRA_GERAL = re.compile(
    r"\b(?:concursos?(?:\s+publicos?)?\s+(?:para|de)\s+(?:[oa]s?\s+)?$|"
    r"tratados?(?:\s+(?:bilatera|internaciona)(?:l|is))?\s+(?:para|de|sobre)\s*$|"
    r"futur[oa]s?\s*$|"
    r"(?:cria|institui|estabelece)\s+(?:(?:o|a|os|as)\s+)?(?:cargos?\b|$)|"
    r"(?:regras?|normas?|regimes?|politicas?|criterios?|requisitos?|procedimentos?|"
    r"diretrizes|regulamentos?|atribuicoes)\s+"
    r"(?:(?:gerais|propri[oa]s?)\s+)?(?:para|d[aeo]s?|sobre)\b)"
)
LEI_SANCIONADA = re.compile(
    r"\b(?:leis?|projetos?\s+de\s+leis?)\b"
    r"(?:\s+[a-z]+\s+(?:foi|foram|sera|serao)|"
    r"(?:[\s,]+(?:n[.o°]*|\d[\d/.-]*|ja|foi|foram|sera|serao|ser|sendo))*)[\s,]*$"
)
REFORMA_GERAL = re.compile(
    r"^\s+(?:administrativ[oa]s?|previdenciari[oa]s?|tributari[oa]s?|eleitorais?|constitucionais?)\b"
)
ALVO_INSTITUCIONAL = re.compile(
    r"^[\s,:–-]*(?:(?:a|o|ao|as|os|aos|de|do|da|dos|das|para|contra|como|com|em|uma?|"
    r"concedid[oa]s?|aplicad[oa]s?|aplicave(?:l|is)|economic[oa]s?|comercia(?:l|is)|administrativ[oa]s?|"
    r"internaciona(?:l|is)|impost[oa]s?|respectiv[oa]s?|de\s+(?:multa|advertencia|suspensao))\s+)*"
    rf"(?:{INSTITUICAO}|pessoas?\s+juridicas?|contratad[oa]s|"
    r"licitac(?:ao|oes)|concursos?\s+publicos?|orcamentos?|categorias?|carreiras?|"
    r"igualdade|transparencia|saude|"
    r"educacao|cultura|presidencial|reformas?|previdencia|propriedade|credito|divida|"
    r"imove(?:l|is)|be(?:m|ns)\s+move(?:l|is)|residuos?|entulhos?|futur[oa]s?|"
    r"(?:licencas?|autorizac(?:ao|oes))\s+"
    r"(?:d[aeo]s?\s+)(?:uma?\s+)?(?:empresas?|entidades?))\b"
)
# O plural só indica uma categoria se o complemento também for genérico.
ALVO_COLETIVO = re.compile(
    r"^\s*(?:(?:a|o|ao|as|os|aos|de|do|da|dos|das|para)\s+)*"
    r"(?:servidores|servidoras|empregad[oa]s|militares|estrangeir[oa]s|dependentes|"
    r"candidat[oa]s|funcoes|cargos|nomeacoes|pensoes)\b"
    r"(?=\s*(?:$|[.,]|(?:(?:d[aeo]|n[ao]|em)\s+)?"
    r"(?:carreiras?|categorias?|classes?|confianca|comissao|comissionad[oa]s|"
    r"public[oa]s|federais|vag[oa]s|aprovad[oa]s)\b))"
)
SINAL_INDIVIDUAL = re.compile(
    r"\b(?:a\s+pedido|ocupad[oa]s?\s+por|(?:sr|sra|senhor|senhora)(?=[.\s]))\b"
)
ORACOES_ATO = re.compile(
    r"[;!?]+|(?<=[a-z]{5})\.+\s+|(?:\be\s+|,\s*)(?=(?:nomeia|nomear|exonera|designa|dispensa|"
    r"demite|cassa|aplica|cede|remove|redistribui|expulsa|concede|condecora)\b)"
)


def normalizar(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFKD", texto.casefold()) if not unicodedata.combining(c)
    )


def _sinal_de_nome(texto: str) -> bool:
    texto = unicodedata.normalize("NFC", texto).strip()
    if texto.isupper():
        # Um campo isolado em caixa alta também pode ser só o nome.
        return bool(
            POSSIVEL_NOME.fullmatch(texto) and not INICIO_INSTITUCIONAL.match(normalizar(texto))
        )
    for trecho in POSSIVEL_NOME.finditer(texto):
        anterior = normalizar(trecho["anterior"] or "")
        nome = normalizar(trecho["nome"])
        primeira, resto = nome.split(maxsplit=1)
        if not (
            INICIO_INSTITUCIONAL.match(anterior)
            or INICIO_INSTITUCIONAL.match(nome)
            or (TERMO_ATO_PESSOAL.fullmatch(primeira) and INICIO_INSTITUCIONAL.match(resto))
        ):
            return True
        # Uma pessoa pode aparecer em paralelo com a instituição ou depois do país de destino.
        separador = r"\s+(?:e|d[aeo]s?)\s+" if primeira == "pais" else r"\s+e\s+"
        for ligacao in re.finditer(separador, trecho["nome"]):
            complemento = trecho["nome"][ligacao.end() :]
            if POSSIVEL_NOME.fullmatch(complemento) and not INICIO_INSTITUCIONAL.match(
                normalizar(complemento)
            ):
                return True
    return False


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
    termo_tipo = TERMO_ATO_PESSOAL.fullmatch(tipo)
    if (termo_tipo and not termo_tipo["ambiguo"]) or any(
        ATOS_DE_PESSOAL.search(t) for t in (tipo, titulo, ementa, orgao)
    ):
        return "ato_de_pessoal"
    textos = ((ato.titulo or "", titulo), (ato.ementa or "", ementa))
    if not termo_tipo and not any(TERMO_ATO_PESSOAL.search(t) for _, t in textos):
        return None
    # A suspeita no título ou na ementa impede as exceções nos dois campos.
    if any(
        _sinal_de_nome(original)
        or LISTA_NOMINAL.search(t)
        or LISTA_APOS_DOIS_PONTOS.search(original)
        for original, t in textos
    ):
        return "ato_de_pessoal"
    if any(
        (original.isupper() and TERMO_ATO_PESSOAL.search(t)) or FORMA_INDIVIDUAL.search(t)
        for original, t in textos
    ):
        return "ato_de_pessoal"
    for texto in (titulo, ementa):
        for oracao in ORACOES_ATO.split(texto):
            for termo in TERMO_ATO_PESSOAL.finditer(oracao):
                if termo["ambiguo"]:
                    continue
                antes, depois = oracao[: termo.start()], oracao[termo.end() :]
                if SINAL_INDIVIDUAL.search(depois):
                    return "ato_de_pessoal"
                if ALVO_INSTITUCIONAL.match(depois):
                    continue
                if termo[0].startswith("sancion") and LEI_SANCIONADA.search(antes):
                    continue
                if termo[0].startswith("reform") and REFORMA_GERAL.match(depois):
                    continue
                if not ALVO_COLETIVO.match(depois) and not REGRA_GERAL.search(antes):
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
