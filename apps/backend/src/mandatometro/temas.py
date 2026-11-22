"""Catálogo de temas do Mandatômetro e conversão das classificações oficiais."""

from enum import StrEnum


class TemaId(StrEnum):
    SAUDE = "saude"
    EDUCACAO = "educacao"
    ECONOMIA = "economia"
    TRABALHO = "trabalho"
    PREVIDENCIA_ASSISTENCIA = "previdencia_assistencia"
    DIREITOS_CIDADANIA = "direitos_cidadania"
    SEGURANCA_DEFESA = "seguranca_defesa"
    JUSTICA = "justica"
    MEIO_AMBIENTE = "meio_ambiente"
    AGROPECUARIA = "agropecuaria"
    INFRAESTRUTURA = "infraestrutura"
    CIDADES_MORADIA = "cidades_moradia"
    CIENCIA_TECNOLOGIA = "ciencia_tecnologia"
    CULTURA_ESPORTE = "cultura_esporte"
    POLITICA_GOVERNO = "politica_governo"
    ORCAMENTO_PUBLICO = "orcamento_publico"
    RELACOES_INTERNACIONAIS = "relacoes_internacionais"
    HOMENAGENS = "homenagens"


TEMAS: dict[TemaId, str] = {
    TemaId.SAUDE: "Saúde",
    TemaId.EDUCACAO: "Educação",
    TemaId.ECONOMIA: "Economia e impostos",
    TemaId.TRABALHO: "Trabalho e emprego",
    TemaId.PREVIDENCIA_ASSISTENCIA: "Previdência e assistência social",
    TemaId.DIREITOS_CIDADANIA: "Direitos e cidadania",
    TemaId.SEGURANCA_DEFESA: "Segurança e defesa",
    TemaId.JUSTICA: "Justiça",
    TemaId.MEIO_AMBIENTE: "Meio ambiente",
    TemaId.AGROPECUARIA: "Agricultura e pecuária",
    TemaId.INFRAESTRUTURA: "Infraestrutura e transporte",
    TemaId.CIDADES_MORADIA: "Cidades e moradia",
    TemaId.CIENCIA_TECNOLOGIA: "Ciência, tecnologia e comunicação",
    TemaId.CULTURA_ESPORTE: "Cultura, esporte e lazer",
    TemaId.POLITICA_GOVERNO: "Política e governo",
    TemaId.ORCAMENTO_PUBLICO: "Orçamento público",
    TemaId.RELACOES_INTERNACIONAIS: "Relações internacionais",
    TemaId.HOMENAGENS: "Homenagens e datas comemorativas",
}

_CAMARA: dict[int, TemaId] = {
    34: TemaId.POLITICA_GOVERNO,
    35: TemaId.CULTURA_ESPORTE,
    37: TemaId.CIENCIA_TECNOLOGIA,
    39: TemaId.CULTURA_ESPORTE,
    40: TemaId.ECONOMIA,
    41: TemaId.CIDADES_MORADIA,
    42: TemaId.JUSTICA,
    43: TemaId.JUSTICA,
    44: TemaId.DIREITOS_CIDADANIA,
    46: TemaId.EDUCACAO,
    48: TemaId.MEIO_AMBIENTE,
    51: TemaId.AGROPECUARIA,
    52: TemaId.PREVIDENCIA_ASSISTENCIA,
    53: TemaId.POLITICA_GOVERNO,
    54: TemaId.INFRAESTRUTURA,
    55: TemaId.RELACOES_INTERNACIONAIS,
    56: TemaId.SAUDE,
    57: TemaId.SEGURANCA_DEFESA,
    58: TemaId.TRABALHO,
    60: TemaId.ECONOMIA,
    61: TemaId.INFRAESTRUTURA,
    62: TemaId.CIENCIA_TECNOLOGIA,
    64: TemaId.AGROPECUARIA,
    66: TemaId.ECONOMIA,
    67: TemaId.DIREITOS_CIDADANIA,
    68: TemaId.JUSTICA,
    70: TemaId.ORCAMENTO_PUBLICO,
    72: TemaId.HOMENAGENS,
    74: TemaId.POLITICA_GOVERNO,
    76: TemaId.JUSTICA,
    85: TemaId.CIENCIA_TECNOLOGIA,
    86: TemaId.CIENCIA_TECNOLOGIA,
}

# Cada entrada cobre a subárvore até um caminho mais específico da tabela.
# As raízes que reúnem áreas distintas precisam de uma regra explícita para o ramo.
_SENADO: dict[str, TemaId] = {
    "Administração Pública": TemaId.POLITICA_GOVERNO,
    "Economia e Desenvolvimento / Agropecuária e Abastecimento": TemaId.AGROPECUARIA,
    "Economia e Desenvolvimento / Ciência, Tecnologia e Informática": TemaId.CIENCIA_TECNOLOGIA,
    "Economia e Desenvolvimento / Finanças Públicas": TemaId.ORCAMENTO_PUBLICO,
    "Economia e Desenvolvimento / Fiscalização e Controle da Atividade Econômica": TemaId.ECONOMIA,
    "Economia e Desenvolvimento / Indústria, Comércio e Serviços": TemaId.ECONOMIA,
    "Economia e Desenvolvimento / Linha de Crédito": TemaId.ECONOMIA,
    "Economia e Desenvolvimento / Política Fundiária e Reforma Agrária": TemaId.AGROPECUARIA,
    "Economia e Desenvolvimento / Sistema Financeiro Nacional": TemaId.ECONOMIA,
    "Economia e Desenvolvimento / Tributos": TemaId.ECONOMIA,
    "Honorífico": TemaId.HOMENAGENS,
    "Infraestrutura": TemaId.INFRAESTRUTURA,
    "Infraestrutura / Comunicações": TemaId.CIENCIA_TECNOLOGIA,
    "Jurídico / Direito Civil": TemaId.JUSTICA,
    "Jurídico / Direito de Trânsito": TemaId.INFRAESTRUTURA,
    "Jurídico / Direito do Consumidor": TemaId.DIREITOS_CIDADANIA,
    "Jurídico / Direito Eleitoral": TemaId.POLITICA_GOVERNO,
    "Jurídico / Direito Empresarial e Econômico": TemaId.JUSTICA,
    "Jurídico / Direito Notarial e Registral": TemaId.JUSTICA,
    "Jurídico / Direito Penal e Penitenciário": TemaId.JUSTICA,
    "Jurídico / Direitos e Garantias": TemaId.DIREITOS_CIDADANIA,
    "Jurídico / Processo / Processo Administrativo": TemaId.POLITICA_GOVERNO,
    "Jurídico / Processo / Processo Civil": TemaId.JUSTICA,
    "Jurídico / Processo / Processo do Trabalho": TemaId.TRABALHO,
    "Jurídico / Processo / Processo Legislativo": TemaId.POLITICA_GOVERNO,
    "Jurídico / Processo / Processo Penal": TemaId.JUSTICA,
    "Meio Ambiente": TemaId.MEIO_AMBIENTE,
    "Orçamento Público": TemaId.ORCAMENTO_PUBLICO,
    "Organização do Estado / Fiscalização e Controle": TemaId.POLITICA_GOVERNO,
    "Organização do Estado / Funções Essenciais à Justiça": TemaId.JUSTICA,
    "Organização do Estado / Organização Federativa": TemaId.POLITICA_GOVERNO,
    "Organização do Estado / Poder Judiciário": TemaId.JUSTICA,
    "Organização do Estado / Poder Legislativo": TemaId.POLITICA_GOVERNO,
    "Política Social / Cultura": TemaId.CULTURA_ESPORTE,
    "Política Social / Desenvolvimento Urbano": TemaId.CIDADES_MORADIA,
    "Política Social / Desenvolvimento Urbano / Mobilidade Urbana": TemaId.INFRAESTRUTURA,
    "Política Social / Desporto e Lazer": TemaId.CULTURA_ESPORTE,
    "Política Social / Educação": TemaId.EDUCACAO,
    "Política Social / Habitação": TemaId.CIDADES_MORADIA,
    "Política Social / Previdência Social": TemaId.PREVIDENCIA_ASSISTENCIA,
    "Política Social / Proteção Social / Assistência Social": TemaId.PREVIDENCIA_ASSISTENCIA,
    "Política Social / Proteção Social / Crianças e Adolescentes": TemaId.DIREITOS_CIDADANIA,
    (
        "Política Social / Proteção Social / Desenvolvimento Social e Combate à Fome"
    ): TemaId.PREVIDENCIA_ASSISTENCIA,
    "Política Social / Proteção Social / Direitos Humanos e Minorias": TemaId.DIREITOS_CIDADANIA,
    "Política Social / Proteção Social / Idosos": TemaId.DIREITOS_CIDADANIA,
    "Política Social / Proteção Social / Mulheres": TemaId.DIREITOS_CIDADANIA,
    "Política Social / Proteção Social / Pessoas com Deficiência": TemaId.DIREITOS_CIDADANIA,
    "Política Social / Proteção Social / População Indígena": TemaId.DIREITOS_CIDADANIA,
    "Política Social / Saúde": TemaId.SAUDE,
    "Política Social / Trabalho e Emprego": TemaId.TRABALHO,
    (
        "Soberania, Defesa Nacional e Ordem Pública"
        " / Defesa do Estado e das Instituições Democráticas"
    ): TemaId.SEGURANCA_DEFESA,
    (
        "Soberania, Defesa Nacional e Ordem Pública / Direito dos Estrangeiros"
    ): TemaId.DIREITOS_CIDADANIA,
    (
        "Soberania, Defesa Nacional e Ordem Pública / Relações Internacionais"
    ): TemaId.RELACOES_INTERNACIONAIS,
}


def tema_da_camara(codigo: int) -> TemaId | None:
    return _CAMARA.get(codigo)


def tema_do_senado(caminho: str) -> TemaId | None:
    while caminho:
        if tema := _SENADO.get(caminho):
            return tema
        caminho = caminho.rpartition(" / ")[0]
    return None
