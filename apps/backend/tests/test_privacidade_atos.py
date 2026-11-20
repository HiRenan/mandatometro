import json
from pathlib import Path

import pytest

from mandatometro.db.modelos import Ato
from mandatometro.ia.privacidade import motivo_retencao_ato, separar_atos_para_modelo

MOTIVO = "ato_de_pessoal"
CASOS_ARGOS = json.loads(
    (Path(__file__).parent / "fixtures" / "privacidade-atos-argos.json").read_text(encoding="utf-8")
)
PESSOA = "Boneca de Papelão"
OUTRA = "Manequim das Simulações"


@pytest.mark.parametrize(
    ("campos", "motivo"),
    [pytest.param(campos, motivo, id=id_) for id_, campos, motivo in CASOS_ARGOS],
)
def test_casos_de_privacidade_da_revisao(campos, motivo):
    ato = Ato(
        **{"tipo": "portaria", "titulo": "Portaria fictícia", "secao": "1"} | campos,
        orgao="Órgão Inventado Alfa",
    )
    assert motivo_retencao_ato(ato) == motivo


ATOS_INDIVIDUAIS = [
    (f"Exonerada do Departamento de Ensaios, {PESSOA} deixou o cargo.", {}),
    (f"{OUTRA} foi designado para o Grupo de Simulação Editorial.", {}),
    (f"Nomeia para a Secretaria de Ensaios, após conferência, {PESSOA}.", {}),
    (f"A cessão ao Instituto de Ensaios tem como titular {OUTRA}.", {}),
    ("Regulamenta a promoção dos servidores da carreira de ensaio.", {"titulo": PESSOA}),
    (f"{OUTRA.upper()} FOI DESIGNADO PARA O COMITÊ DE ENSAIOS.", {}),
    (f"CESSÃO AO INSTITUTO DE BRINQUEDOS, {OUTRA.upper()}.", {}),
    (f"Nomeação dos candidatos aprovados: {PESSOA} e {OUTRA}.", {}),
    ("Autoriza a promoção dos militares:\n- boneca de papelão\n- manequim das simulações", {}),
    ("Ficam reconduzidos os integrantes abaixo relacionados.", {}),
    ("Regulamenta a licença dos servidores com os nomes no anexo.", {}),
    ("Reverte MASCOTE DO ENSAIO ao serviço ativo.", {}),
    (f"Tornou sem efeito a portaria anterior referente a {OUTRA}.", {}),
    (f"Foi declarada vaga a função que ocupava {PESSOA}.", {}),
    (f"Declaram-se as vacâncias decorrentes da saída de {OUTRA}.", {}),
    ("O termo de posse foi assinado em data de ensaio.", {}),
    (f"{OUTRA} foi reconduzido para o Instituto de Ensaios.", {}),
    ("Fica afastada a Boneca dos Ensaios e Testes do cargo de demonstração.", {}),
    ("Defiro a licença à servidora boneca.", {}),
    (f"Readaptada {PESSOA} para atividade experimental no departamento.", {}),
    (f"Reintegrado ao cargo da Fundação de Ensaios, {OUTRA}.", {}),
    (f"Determinado o aproveitamento, no Departamento de Ensaios, de {OUTRA}.", {}),
    (f"Encaminha {PESSOA} à disponibilidade remunerada.", {}),
    ("Indico como substituta eventual a servidora fantoche.", {}),
    (f"Deferido o afastamento do País, por missão simulada, a {OUTRA}.", {}),
    (f"À {PESSOA} é concedida a Medalha de Ensaios de Mérito.", {}),
    (f"{OUTRA} é admitido na Ordem de Ensaios.", {}),
    (f"Foi indultada por decreto a {PESSOA}.", {}),
    (f"Declaro a perda da nacionalidade anterior do {OUTRA}.", {}),
    (f"Foram anistiados {PESSOA} e {OUTRA}.", {}),
    ("Deferida a posse de Boneca do Mundo e das Estrelas.", {}),
    ("Cancela a licença anteriormente concedida a Boneca do Laboratório.", {}),
    (f"Foi atribuído ao {OUTRA} o título de Visitante Ilustre.", {}),
    (
        "Estabelece critérios de redistribuição de cargos, "
        f"incluindo a redistribuição do cargo de {PESSOA}.",
        {},
    ),
    ("Aplica penalidades à Empresa de Ensaios e Manequim de Oficina.", {}),
    (f"Extradição para o País de Ensaios, conforme o tratado, de {OUTRA}.", {}),
    ("Regulamenta a recondução dos membros do colegiado.", {"titulo": OUTRA.upper()}),
]


@pytest.mark.parametrize(
    ("ementa", "campos"),
    ATOS_INDIVIDUAIS,
    ids=[f"N{i:02}" for i in range(1, len(ATOS_INDIVIDUAIS) + 1)],
)
def test_atos_individuais_com_contexto(ementa, campos):
    ato = Ato(id=1, tipo="decreto", ementa=ementa, **{"titulo": "Decreto de ensaio"} | campos)
    assert separar_atos_para_modelo([ato]) == ([], [(1, MOTIVO)])


POLITICAS_PUBLICAS = [
    "Regulamenta a posse de arma de fogo na atividade de ensaio.",
    "Dispõe sobre a reintegração de posse de terrenos municipais.",
    "Estabelece parâmetros de aproveitamento de recursos hídricos da região de ensaio.",
    "Comprova a disponibilidade orçamentária para a obra fictícia.",
    "Altera as condições da licença ambiental da Empresa de Simulação.",
    "Concede indulto coletivo de fim de ano a quem cumprir as condições gerais.",
    "Concede anistia de multas por atraso na entrega de declarações fictícias.",
    "Institui anistia de débitos do programa experimental.",
    "Afasta a incidência da regra de cobrança sobre bens de ensaio.",
    "Reverte ao patrimônio da União o terreno destinado a demonstração.",
    "Tornam-se sem efeito os dispositivos de uma portaria experimental.",
    "Cria a Medalha de Mérito de Oficinas de Ensaio.",
    "Aprova o regulamento da Ordem do Mérito de Oficinas.",
    "Regulamenta os procedimentos para a perda da nacionalidade.",
    "Disciplina as regras para recondução de conselheiros no colegiado experimental.",
    "Define critérios de readaptação dos servidores da carreira de ensaio.",
    "Institui normas para vacância dos cargos de gestão de ensaio.",
    "Disciplina o afastamento da incidência da regra fiscal de demonstração.",
    "Institui a licença de funcionamento dos pontos de coleta fictícios.",
    "Dispõe sobre o aproveitamento integral de materiais usados em oficinas.",
    "Regulamenta a posse de equipamentos cedidos às entidades participantes.",
    "Estabelece condições gerais para o indulto coletivo de fim de ano.",
    "Define a emissão de licenças ambientais no Município de Ensaio.",
    "Aprova critérios para o afastamento do País dos servidores civis.",
    "Aprova o regulamento para escolha de substitutos eventuais no órgão de ensaio.",
    "Estabelece o procedimento para declarar vagos os cargos após desvinculação.",
    "A lei ordinária foi sancionada para custear pesquisa em bibliotecas.",
    "Aprova o regulamento de promoção a classes da carreira de ensaio.",
    "Aplica sanção comercial imposta ao Estado de Ensaio.",
    "Cria o Programa das Oficinas e nomeia a respectiva Comissão de Gestão Técnica.",
    "Concede anistia tributária a empresas de demonstração.",
    "Disciplina a ordem de apresentação dos relatórios no sistema fictício.",
    "Reverte o saldo da reserva ao fundo de ensaio.",
    "Dispensa licitação para o Programa de Ensaios e Testes.",
    "Homologa o resultado do concurso para nomeação, sem relação nominal.",
    "Torna sem efeito a Portaria de Gestão de Ensaios.",
]


@pytest.mark.parametrize(
    "ementa", POLITICAS_PUBLICAS, ids=[f"N{i:02}" for i in range(1, len(POLITICAS_PUBLICAS) + 1)]
)
def test_politicas_publicas_com_contexto(ementa):
    ato = Ato(tipo="portaria", titulo="Portaria de ensaio", ementa=ementa)
    assert motivo_retencao_ato(ato) is None


def test_caixa_alta_impede_excecao_institucional():
    ato = Ato(tipo="decreto", titulo="APLICA SANÇÃO À EMPRESA DE ENSAIOS.")
    assert motivo_retencao_ato(ato) == MOTIVO
