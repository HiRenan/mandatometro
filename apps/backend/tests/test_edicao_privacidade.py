import unicodedata

import pytest

from mandatometro.ia.privacidade import TERMO_PESSOAL, assunto_pessoal, identificacao, normalizar


@pytest.mark.parametrize("forma", ["original", "maiusculas", "sem_acento", "ambas"])
@pytest.mark.parametrize(
    "texto,siglas,esperado",
    [
        pytest.param(
            "Prorroga o período em que o parlamentar ficará afastado.", (), True, id="afastado"
        ),
        pytest.param("Autoriza o parlamentar a se licenciar do mandato.", (), True, id="licenciar"),
        pytest.param("Autoriza afastamento de parlamentar.", (), True, id="afastamento"),
        pytest.param(
            "Concede licença à Deputada Pessoa Inventada para tratamento de saúde.",
            (),
            True,
            id="licenca_deputada",
        ),
        pytest.param(
            "Requer, nos termos do art. 43 do Regimento Interno, licença para tratamento de saúde.",
            ("RQS",),
            True,
            id="requerimento_senado",
        ),
        pytest.param(
            "Requer licença para tratar de interesses particulares.",
            (),
            True,
            id="requer_sem_sigla",
        ),
        pytest.param(
            "Mantém o afastamento do mandato determinado em decisão judicial.",
            (),
            True,
            id="mandato",
        ),
        pytest.param("Trata do estado de saúde do senador.", (), True, id="saude_senador"),
        pytest.param(
            "Dispõe sobre a licença ambiental de obras de saneamento.",
            (),
            False,
            id="ambiental",
        ),
        pytest.param("Amplia a licença parental de trabalhadores.", (), False, id="parental"),
        pytest.param(
            "Garante o afastamento de trabalhadoras vítimas de violência.",
            (),
            False,
            id="trabalhadoras",
        ),
        pytest.param("Institui a política nacional de saúde mental.", (), False, id="saude_mental"),
        pytest.param(
            "Altera o regime da licença para tratamento de saúde do servidor público.",
            ("PL",),
            False,
            id="servidor",
        ),
        pytest.param(
            "Aprovado o projeto do licenciamento ambiental na Câmara dos Deputados.",
            (),
            False,
            id="nome_da_casa",
        ),
        pytest.param(
            "Dispõe sobre o licenciamento ambiental. Rejeitada a emenda do Dep. Pessoa Inventada.",
            (),
            False,
            id="outra_frase",
        ),
        pytest.param(
            "Requer urgência para o PL 123/2026, que amplia a licença-paternidade.",
            ("REQ",),
            False,
            id="urgencia_de_projeto",
        ),
        pytest.param(
            "Altera o Regimento Interno para dispor sobre a licença-maternidade das deputadas.",
            (),
            True,
            id="empate_privacidade",
        ),
        pytest.param(
            "Rejeitada a emenda do Dep. Pessoa Inventada, "
            "que alterava as regras do licenciamento ambiental.",
            (),
            True,
            id="empate_emenda_com_nome_proximo",
        ),
    ],
)
def test_assunto_pessoal_exige_ligacao_com_parlamentar(texto, siglas, esperado, forma):
    if forma in ("sem_acento", "ambas"):
        texto = "".join(
            c for c in unicodedata.normalize("NFKD", texto) if not unicodedata.combining(c)
        )
    if forma in ("maiusculas", "ambas"):
        texto = texto.upper()
    argumentos = {"siglas": siglas} if siglas else {}
    assert assunto_pessoal(texto, ["Pessoa Inventada"], **argumentos) is esperado


@pytest.mark.parametrize(
    "termo",
    [
        "licenças",
        "licenciar",
        "licenciado",
        "licenciada",
        "licenciou",
        "licenciamento",
        "afastamentos",
        "afastar",
        "afastado",
        "afastada",
        "afastou",
        "saúde",
        "doenças",
        "enfermidades",
        "internações",
        "internado",
        "internada",
        "internou",
        "internaram",
        "internar",
        "internando",
        "internava",
        "internássemos",
        "internaremos",
        "internaria",
        "interne",
        "internem",
        "internei",
        "internam",
        "interna-se",
        "internou-se",
        "internar-se",
        "hospitalizado",
        "hospitalizadas",
        "hospitalizou",
        "hospitalizaram",
        "hospitalizar",
        "hospitalizando",
        "adoeceu",
        "adoeceram",
        "adoecer",
        "adoecendo",
        "adoeça",
        "adoentado",
        "adoentada",
        "adoentou",
        "adoentar",
        "adoentando",
        "adoentam",
        "adoentaram",
        "adoentava",
        "adoentará",
        "adoentaria",
        "adoentasse",
        "adoente",
        "convalescente",
        "convalescença",
        "convalescer",
        "convalescendo",
        "convalesço",
        "convalesça",
        "convalesceu",
        "convalesceram",
        "convalescia",
        "convalescerá",
        "convalesceria",
        "convalescesse",
        "doente",
        "doentes",
        "enfermo",
        "cirurgias",
        "tratamentos médicos",
        "atestados médicos",
        "atendimento médico",
        "atendimentos médicos",
    ],
)
def test_flexoes_das_familias_com_ligacao(termo):
    assert assunto_pessoal(f"Registro de {termo} do parlamentar.", [])


@pytest.mark.parametrize(
    "sinal",
    [
        "parlamentar",
        "parlamentares",
        "deputado",
        "deputadas",
        "senador",
        "senadoras",
        "senadores",
        "dep.",
        "sen.",
        "suplente",
        "suplentes",
        "mandato",
        "mandatos",
        "Pessoa Inventada",
        "ABC-SC",
        "ABC / DF",
    ],
)
@pytest.mark.parametrize("ordem", ["antes", "depois"])
def test_ligacao_proxima_em_ambas_as_ordens(sinal, ordem):
    texto = f"{sinal} em licença" if ordem == "antes" else f"licença de {sinal}"
    assert assunto_pessoal(texto, ["Pessóa Inventada"])


@pytest.mark.parametrize("sinal", ["parlamentar", "Pessoa Inventada", "ABC-SC"])
@pytest.mark.parametrize("distancia,esperado", [(6, True), (7, False)])
@pytest.mark.parametrize("ordem", ["antes", "depois"])
def test_ligacao_limitada_a_seis_palavras_intermediarias(sinal, distancia, esperado, ordem):
    intervalo = " ".join(["palavra"] * distancia)
    texto = f"{sinal} {intervalo} licença" if ordem == "antes" else f"licença {intervalo} {sinal}"
    assert assunto_pessoal(texto, ["Pessoa Inventada"]) is esperado


@pytest.mark.parametrize("separador", [". ", "! ", "? "])
def test_ligacao_nao_atravessa_frase(separador):
    assert not assunto_pessoal("Licença ambiental" + separador + "Senador propõe emenda.", [])


@pytest.mark.parametrize(
    "separador", ["\n", "\r\n", " Sr. ", " Sra. ", " Dr. ", " Exmo. ", " nº. "]
)
def test_quebra_tipografica_e_ponto_apos_palavra_curta_preservam_ligacao(separador):
    assert assunto_pessoal("Concede licença ao" + separador + "parlamentar.", [])


@pytest.mark.parametrize("palavra,esperado", [("abcd", True), ("abcde", False)])
def test_ponto_so_separa_apos_cinco_letras(palavra, esperado):
    assert assunto_pessoal(f"Licença {palavra}. Parlamentar apresenta emenda.", []) is esperado


@pytest.mark.parametrize(
    "texto",
    [
        "O parlamentar propõe alterar o Regimento Interno.",
        "O parlamentar participa de evento internacional.",
        "O parlamentar propõe ampliar o acesso à internet.",
        "O parlamentar propõe valorizar a enfermagem.",
        "O parlamentar discute uma operação de crédito.",
        "O parlamentar propõe melhorar a segurança interna.",
        "O parlamentar propõe regras de organização interna.",
        "O parlamentar propõe alterar as normas internas.",
        "O parlamentar propõe uma auditoria interna.",
    ],
)
def test_palavras_proximas_dos_radicais_nao_sao_termos_de_saude(texto):
    assert not TERMO_PESSOAL.search(normalizar(texto))
    assert not assunto_pessoal(texto, [])


@pytest.mark.parametrize("sigla", ["REQ", "REQV", "RQ", "RQS"])
def test_sigla_de_requerimento_sem_verbo_requer(sigla):
    assert assunto_pessoal("Licença para interesses particulares.", [], siglas=[sigla])


@pytest.mark.parametrize("sigla", ["PL", "PLP", "PEC", "MPV", "PDL", "PLN", "PLC", "PDS"])
@pytest.mark.parametrize("numero", ["123/2026", "nº 123", "n. 123", "n.º 123"])
def test_requerimento_sobre_outra_proposicao_nao_vira_ato_pessoal(sigla, numero):
    texto = f"Requer urgência para o {sigla} {numero}, que amplia a licença parental."
    assert not assunto_pessoal(texto, [], siglas=["REQ"])


def test_citacao_nao_anula_ligacao_pessoal_e_requerimento_precisa_de_termo():
    assert assunto_pessoal("Requer licença do parlamentar conforme o PL 123/2026.", [])
    assert not assunto_pessoal("Requer votação nominal.", [], siglas=["RQS"])
    assert assunto_pessoal("Requerimento de licença para interesses particulares.", [])


def test_nome_isolado_nao_identifica_e_guarda_do_redator_continua_larga():
    assert not assunto_pessoal("Concede licença ambiental ao Campo.", ["Campo"])
    texto = "Licença ambiental na Câmara dos Deputados."
    assert not assunto_pessoal(texto, [])
    assert identificacao(texto, [])


@pytest.mark.parametrize("siglas", [(), ("REQ",), ("RQS",)])
@pytest.mark.parametrize(
    "texto",
    [
        "Requer a convocação do Ministro da Saúde para prestar informações.",
        "Requer a realização de sessão de debates sobre a saúde pública.",
    ],
    ids=["convocacao", "debates"],
)
def test_saude_sozinha_nao_e_pedido_de_licenca(texto, siglas):
    assert not assunto_pessoal(texto, [], siglas=siglas)


@pytest.mark.parametrize("sinal", ["senador", "Pessoa Inventada", "ABC-SC"])
def test_saude_com_ligacao_pessoal_continua_saindo_no_requerimento(sinal):
    assert assunto_pessoal(f"Requer informações sobre a saúde de {sinal}.", ["Pessoa Inventada"])


@pytest.mark.parametrize(
    "tipo",
    [
        "Projeto de Lei",
        "Projeto de Lei Complementar",
        "Proposta de Emenda à Constituição",
        "Medida Provisória",
        "Projeto de Decreto Legislativo",
        "Projeto de Resolução",
        "Projeto de Lei de Conversão",
    ],
)
@pytest.mark.parametrize(
    "numero",
    ["nº 123, de 2026", "123, de 2026", "n 123, de 2026", "n. 123/2026", "nº 1.234, de 2026"],
)
def test_requerimento_cita_proposicao_por_extenso(tipo, numero):
    texto = f"Requer urgência para o {tipo} {numero}, que amplia a licença-paternidade."
    assert not assunto_pessoal(texto, [], siglas=["REQ"])


def test_extenso_precisa_de_numero_e_nao_anula_ligacao_pessoal():
    assert assunto_pessoal("Requer licença para discutir um Projeto de Lei.", [])
    assert assunto_pessoal(
        "Requer licença do senador conforme o Projeto de Lei nº 123, de 2026.", []
    )


@pytest.mark.parametrize(
    "tipo",
    [
        "Projetos de Lei",
        "Projetos de Lei Complementar",
        "Propostas de Emenda à Constituição",
        "Medidas Provisórias",
        "Projetos de Decreto Legislativo",
        "Projetos de Resolução",
        "Projetos de Lei de Conversão",
    ],
)
@pytest.mark.parametrize("casa", ["", " do Senado", " da Câmara", " da Câmara dos Deputados"])
def test_citacao_plural_com_casa_ainda_exige_numero(tipo, casa):
    inicio = f"Requer urgência para os {tipo}{casa}"
    assert not assunto_pessoal(f"{inicio} nº 100 e 123, sobre licença parental.", [])
    assert assunto_pessoal(f"{inicio}, sobre licença parental.", [])
