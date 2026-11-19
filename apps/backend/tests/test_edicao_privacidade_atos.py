import json
from contextlib import nullcontext
from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_edicao_atos import ato as ato
from test_edicao_atos import selecao_com_ato as selecao_com_ato
from test_edicao_revisao import abrir as abrir
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.api import edicoes
from mandatometro.api.app import app
from mandatometro.cli import main
from mandatometro.db.modelos import Ato, Edicao, ItemEdicao
from mandatometro.ia import cli, privacidade
from mandatometro.ia.redacao import RespostaRedator
from mandatometro.ia.selecao import ItemAtoBase
from mandatometro.ia.servico import ErroEdicao, exportar, gerar, mostrar, publicar, revisar

NOME = "Pessoa Fictícia"
DOCUMENTO = "111.111.111-11"
MOTIVO = "ato_de_pessoal"
CAMPO = "privacidade_confirmada"
ATO_DE_PESSOAL = [
    pytest.param(
        f"NOMEAÇÕES: Nomeia {NOME} para o cargo de exemplo.",
        "Nomeia o Programa Fictício de Apoio à Leitura.",
        id="nomeacao",
    ),
    pytest.param(
        f"Exonera, a pedido, {NOME} do cargo fictício.",
        "Regulamenta a exoneração de servidores da carreira fictícia.",
        id="exoneracao",
    ),
    pytest.param(
        f"Designações de função: designada a servidora {NOME}.",
        "Dispõe sobre a designação de funções de confiança na carreira fictícia.",
        id="designacao",
    ),
    pytest.param(
        f"Dispensa {NOME} da função de exemplo.",
        "Dispensas de licitação para a contratação de serviços fictícios.",
        id="dispensa",
    ),
    pytest.param(
        f"Concedida aposentadoria à servidora {NOME}.",
        "Altera o regime de aposentadorias dos servidores da carreira fictícia.",
        id="aposentadoria",
    ),
    pytest.param(
        f"Concede pensão por morte a {NOME}.",
        "Atualiza os critérios de concessão de pensões por morte a dependentes.",
        id="pensao",
    ),
    pytest.param(
        f"Reforma, de ofício, a militar {NOME}.",
        "Reforma administrativa cria cargos e organiza o serviço fictício.",
        id="reforma",
    ),
    pytest.param(
        f"Promoção da servidora {NOME} à classe de exemplo.",
        "Promoção dos servidores da carreira fictícia conforme critérios gerais.",
        id="promocao",
    ),
    pytest.param(
        f"Demite a empregada {NOME}.",
        "Define procedimentos para demissões na carreira fictícia.",
        id="demissao",
    ),
    pytest.param(
        f"Cassa a aposentadoria de {NOME}.",
        "Cassação da licença da empresa fictícia.",
        id="cassacao",
    ),
    pytest.param(
        f"Aplica a penalidade de advertência à empregada {NOME}.",
        "Institui penalidades aplicáveis a empresas por infrações fictícias.",
        id="penalidade",
    ),
    pytest.param(
        f"Sanção administrativa aplicada à servidora {NOME}.",
        "Aplica sanções ao País Fictício.",
        id="sancao",
    ),
    pytest.param(
        f"Cessão da servidora {NOME} para órgão fictício.",
        "Cessões de imóveis para a instalação de serviços fictícios.",
        id="cessao",
    ),
    pytest.param(
        f"Remove {NOME} para a unidade fictícia.",
        "Autoriza a remoção de resíduos das unidades fictícias.",
        id="remocao",
    ),
    pytest.param(
        f"Redistribui o cargo ocupado por {NOME}.",
        "Redistribuição de cargos vagos na estrutura de exemplo.",
        id="redistribuicao",
    ),
    pytest.param(
        f"Concede naturalização a {NOME}.",
        "Define os requisitos gerais para naturalizações de estrangeiros.",
        id="naturalizacao",
    ),
    pytest.param(
        f"Autoriza a extradição de {NOME}.",
        "Aprova o tratado de extradição com o País Fictício.",
        id="extradicao",
    ),
    pytest.param(
        f"Expulsa {NOME} do território nacional.",
        "Expulsão de resíduos na estação de exemplo.",
        id="expulsao",
    ),
    pytest.param(
        f"Condecorada {NOME} com a medalha fictícia.",
        "Institui condecorações de mérito para o programa fictício.",
        id="condecoracao",
    ),
    pytest.param(
        f"Concede a {NOME} o título de cidadã honorária.",
        "Cria o título de cidadania honorária da cidade fictícia.",
        id="titulo",
    ),
    pytest.param(
        f"Outorga o título de benemérita a {NOME}.",
        "Institui o título de benemérita da cidade fictícia.",
        id="titulo-benemerita",
    ),
    pytest.param(
        f"Confere título a {NOME}.",
        "Confere títulos de propriedade a comunidades fictícias.",
        id="titulo-conferido",
    ),
]


@pytest.mark.parametrize(("pessoal", "geral"), ATO_DE_PESSOAL)
def test_termos_de_ato_de_pessoal(pessoal, geral):
    assert privacidade.motivo_retencao_ato(Ato(tipo="decreto", titulo=pessoal)) == MOTIVO
    assert privacidade.motivo_retencao_ato(Ato(tipo="decreto", titulo=geral)) is None


@pytest.mark.parametrize(
    "ementa",
    [
        "Concurso público para nomeação e promoção de servidores.",
        "Nomeação dos candidatos aprovados em concurso público fictício.",
        "Cria cargos de provimento efetivo para nomeações futuras.",
        "Nomeação do Órgão Fictício responsável pelo programa.",
        "Nomeia Conselho Gestor do Programa Fictício.",
        "A lei foi sancionada. A sanção da lei conclui uma etapa legislativa.",
        "Aplica sanção à empresa fictícia.",
        "Impõe sanções econômicas contra o País Fictício.",
        "Aplica sanção de multa à empresa fictícia.",
        "Dispõe sobre o regime de aposentadoria da categoria fictícia.",
        "Regulamenta o regime de aposentadoria do servidor público.",
        "Atualiza o regime próprio de aposentadoria especial da carreira fictícia.",
        "Regras de promoção da igualdade no programa público.",
        "Promove a educação e a cultura no programa fictício.",
    ],
    ids=[
        "concurso",
        "candidatos",
        "cargos",
        "orgao",
        "conselho",
        "lei",
        "empresa",
        "economica",
        "multa",
        "categoria",
        "regime",
        "regime-proprio",
        "programa",
        "educacao",
    ],
)
def test_politicas_publicas_permanecem_elegiveis(ementa):
    assert (
        privacidade.motivo_retencao_ato(Ato(tipo="lei", titulo="Lei fictícia", ementa=ementa))
        is None
    )


@pytest.mark.parametrize(
    ("rotulo", "numero"),
    [
        ("CPF n.º", "11111111111"),
        ("MATRÍCULA SIAPE:", "1111111"),
        ("RG nº", "11.111.111-1"),
        ("título de eleitor", "1111 1111 1111"),
        ("passaporte", "XX111111"),
        ("CNH", "11111111111"),
        ("número do documento nº", "111111"),
        ("documento de identidade nº", "111111"),
    ],
    ids=["cpf", "matricula", "rg", "eleitor", "passaporte", "cnh", "documento", "identidade"],
)
def test_documento_pessoal_com_numero(rotulo, numero):
    base = {"tipo": "outro", "titulo": "Portaria fictícia"}
    com_numero = Ato(**base, ementa=f"Identificador de exemplo: {rotulo} {numero}.")
    sem_numero = Ato(**base, ementa=f"A norma fictícia disciplina o uso de {rotulo}.")
    assert privacidade.motivo_retencao_ato(com_numero) == "documento_pessoal"
    assert privacidade.motivo_retencao_ato(sem_numero) is None


@pytest.mark.parametrize("campo", ["titulo", "ementa", "orgao", "tipo", "secao"])
@pytest.mark.parametrize("numero", [DOCUMENTO, "***.111.111-**"], ids=["completo", "mascarado"])
def test_cpf_em_qualquer_campo(campo, numero):
    valores = {"tipo": "outro", "titulo": "Portaria fictícia", campo: f"Registro {numero}."}
    assert privacidade.motivo_retencao_ato(Ato(**valores)) == "documento_pessoal"


@pytest.mark.parametrize(
    "secao", ["2", "Seção II", "DO2", "DOU - Seção 2 (extra)", "2ª Seção", "2ª"]
)
def test_secao_de_pessoal_retem_mesmo_sem_termo(secao):
    valores = {"tipo": "outro", "titulo": "Portaria fictícia sobre concurso público"}
    retido = Ato(**valores, secao=secao, ementa=f"CPF {DOCUMENTO}.")
    assert privacidade.motivo_retencao_ato(retido) == "secao_de_pessoal"
    assert privacidade.motivo_retencao_ato(Ato(**valores, secao="Seção 1")) is None


def test_tipo_de_pessoal_independe_do_titulo():
    assert privacidade.motivo_retencao_ato(Ato(tipo="EXONERAÇÕES", titulo="Ato fictício")) == MOTIVO


@pytest.mark.parametrize(
    "verbo", ["Designo", "Cedo", "Reformo", "Casso o mandato de", "Confiro título a"]
)
def test_flexoes_verbais_de_atos_de_pessoal(verbo):
    ato = Ato(tipo="outro", titulo="Portaria fictícia", ementa=f"{verbo} {NOME}.")
    assert privacidade.motivo_retencao_ato(ato) == MOTIVO


@pytest.mark.parametrize(
    "ementa",
    [
        "Regulamenta o concurso público fictício e nomeia Exemplo Fictício para o cargo.",
        "Após o concurso público, nomear Exemplo Fictício para o cargo.",
        "Com base no tratado fictício, fica deferida a extradição de Exemplo Fictício.",
        "Dispõe sobre a nomeação de Exemplo Fictício.",
        "Nomeia os servidores abaixo relacionados.",
        "Nomeados os servidores Exemplo Fictício e Exemplo Inventado.",
    ],
    ids=[
        "concurso-com-nomeacao",
        "concurso-antecedente",
        "tratado-antecedente",
        "ementa-com-nomeacao",
        "lista-de-servidores",
        "lista-nominal",
    ],
)
def test_regra_geral_nao_libera_ato_individual_na_mesma_ementa(ementa):
    ato = Ato(
        tipo="decreto",
        titulo="Decreto fictício sobre a carreira",
        ementa=ementa,
    )
    assert privacidade.motivo_retencao_ato(ato) == MOTIVO


def test_porta_do_modelo_preserva_ordem_e_retorna_so_id_e_codigo_dos_retidos():
    elegivel = Ato(id=1, tipo="decreto", titulo="Regras fictícias de concurso")
    retido = Ato(id=2, tipo="decreto", titulo=f"Nomeia {NOME}", ementa="Ementa de teste")
    outro = Ato(id=3, tipo="lei", titulo="Lei fictícia", orgao="Órgão fictício")
    secao = Ato(id=4, tipo="outro", titulo="Portaria fictícia", secao="2")
    liberados, retidos = privacidade.separar_atos_para_modelo(
        iter([elegivel, retido, outro, secao])
    )
    assert liberados == [elegivel, outro]
    assert retidos == [(2, MOTIVO), (4, "secao_de_pessoal")]


@pytest.fixture
def ato_retido(sessao, ato):
    ato.titulo = f"Nomeia {NOME} para o cargo de exemplo."
    ato.ementa = "Ementa reservada fictícia da coleta."
    ato.orgao = "Órgão reservado fictício da coleta."
    sessao.flush()
    return ato


def _sem_dados_oficiais(ato, *saidas):
    for dado in (NOME, DOCUMENTO, ato.titulo, ato.ementa, ato.orgao, ato.fonte.trecho):
        if any(dado in str(saida) for saida in saidas):
            pytest.fail("Uma saída do ato retido contém dados da fonte.")


def test_rascunho_e_arquivo_de_ato_retido_sem_enviar_ato_ao_redator(
    abrir, dados, ato_retido, selecao_com_ato, caplog
):
    dados(10, valores=("sim",))
    entradas = []

    class RedatorFalso:
        def escrever(self, entrada):
            entradas.append(entrada)
            return RespostaRedator(
                {"titulo": "Votação fictícia", "explicacao": ["Texto fictício."]}
            )

    resumo = gerar(abrir, INICIO, FIM, redator=RedatorFalso())
    edicao_id = resumo["edicao_id"]
    item = exportar(abrir, edicao_id)["itens"][1]
    previa = mostrar(abrir, edicao_id, app_base_url="https://example.com")

    assert len(entradas) == 1
    assert "Item 2" in resumo["avisos"][0] and MOTIVO in resumo["avisos"][0]
    assert "Item 2" in previa and MOTIVO in previa
    assert item["contexto"]["motivo_retencao"] == MOTIVO
    [aviso] = item["contexto"]["avisos"]
    assert "Item 2" in aviso and MOTIVO in aviso
    assert aviso in resumo["avisos"][0] and aviso in previa
    assert item[CAMPO] is False and item["fatos"][CAMPO] is False
    _sem_dados_oficiais(ato_retido, resumo, item, entradas, previa, caplog.text)


@pytest.mark.parametrize(
    "valor", [False, None, "true", 1], ids=["falsa", "ausente", "texto", "numero"]
)
def test_revisao_e_publicacao_recusam_ato_sem_decisao(abrir, ato_retido, selecao_com_ato, valor):
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    original = exportar(abrir, edicao_id)
    arquivo = pronto(deepcopy(original))
    if valor is None:
        arquivo["itens"][0].pop(CAMPO, None)
    else:
        arquivo["itens"][0][CAMPO] = valor

    for operacao, argumentos in ((revisar, (arquivo,)), (publicar, ())):
        with pytest.raises(ErroEdicao, match=rf"Item 1.*{MOTIVO}.*{CAMPO}") as erro:
            operacao(abrir, edicao_id, *argumentos)
        _sem_dados_oficiais(ato_retido, erro.value)
    assert exportar(abrir, edicao_id) == original


def test_confirma_ato_no_arquivo_grava_decisao_e_api_so_mostra_fatos_publicos(
    abrir, ato_retido, selecao_com_ato, monkeypatch
):
    monkeypatch.setattr(edicoes, "sessao_do_banco", abrir)
    cliente = TestClient(app)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    caminho = f"/edicoes/{edicao_id}"
    assert cliente.get(caminho).status_code == 404

    arquivo = pronto(exportar(abrir, edicao_id))
    arquivo["itens"][0][CAMPO] = True
    revisao = revisar(abrir, edicao_id, arquivo)
    [item] = exportar(abrir, edicao_id)["itens"]
    assert revisao["pendencias"] == []
    assert item[CAMPO] is True and item["fatos"][CAMPO] is True
    assert "motivo_retencao" not in item["fatos"] and "avisos" not in item["fatos"]
    assert publicar(abrir, edicao_id)["situacao"] == "publicada"

    resposta = cliente.get(caminho)
    assert resposta.status_code == 200
    [publico] = resposta.json()["itens"]
    assert publico["fatos"] == {"votacoes": [], "data_publicacao": "2026-11-12"}
    assert publico["fontes"][0]["trecho"] is None
    previa_publicada = mostrar(abrir, edicao_id, app_base_url="https://example.com")
    assert all(c not in resposta.text for c in (CAMPO, MOTIVO, "avisos"))
    assert MOTIVO not in previa_publicada
    _sem_dados_oficiais(ato_retido, revisao, resposta.text, previa_publicada)


def test_excluir_ato_retido_exige_motivo_e_grava_a_remocao(
    abrir, dados, ato_retido, selecao_com_ato
):
    dados(10, valores=("sim",))
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    item = arquivo["itens"][1]
    item["excluir"] = True
    del item["motivo_exclusao"]
    with pytest.raises(ErroEdicao, match=rf"Item 2.*{MOTIVO}.*motivo_exclusao"):
        revisar(abrir, edicao_id, arquivo)
    item["motivo_exclusao"] = "Decisão editorial fictícia."

    assert revisar(abrir, edicao_id, arquivo)["itens"] == 1
    [restante] = exportar(abrir, edicao_id)["itens"]
    assert restante["fatos"]["versao"] == 1
    assert publicar(abrir, edicao_id)["situacao"] == "publicada"


def test_rascunho_antigo_de_ato_retido_exige_nova_confirmacao(abrir, sessao, ato_retido):
    fatos_v2 = ItemAtoBase.de_ato(ato_retido).fatos.model_dump(mode="json", exclude={CAMPO})
    fatos_v2["pendencias"] = []
    item = ItemEdicao(
        ordem=1,
        titulo="Ato fictício",
        texto="Explicação fictícia.",
        fonte=ato_retido.fonte,
        fatos=fatos_v2,
    )
    edicao = Edicao(titulo="Edição fictícia", inicio=INICIO, fim=FIM, itens=[item])
    sessao.add(edicao)
    sessao.flush()

    with pytest.raises(ErroEdicao, match=rf"Item 1.*{MOTIVO}.*{CAMPO}"):
        publicar(abrir, edicao.id)
    arquivo = exportar(abrir, edicao.id)
    assert arquivo["versao"] == 1 and arquivo["itens"][0]["fatos"] == fatos_v2
    assert arquivo["itens"][0][CAMPO] is False
    arquivo["itens"][0][CAMPO] = True
    revisar(abrir, edicao.id, arquivo)
    assert publicar(abrir, edicao.id)["situacao"] == "publicada"


def test_cli_retido_mensagens_e_logs_seguros(
    abrir, sessao, ato_retido, selecao_com_ato, monkeypatch, tmp_path, capsys, caplog
):
    ato_retido.orgao = f"Órgão fictício com CPF {DOCUMENTO}"
    sessao.flush()
    monkeypatch.setattr(cli, "sessao_do_banco", abrir)
    monkeypatch.setattr(cli, "abrir_redator", lambda _: nullcontext(None))
    caplog.set_level("INFO")
    assert main(["edicao", "rascunho", "--inicio", str(INICIO), "--fim", str(FIM)]) == 0
    resumo = capsys.readouterr()
    edicao_id = json.loads(resumo.out)["edicao_id"]
    alvo = tmp_path / "revisao-ficticia.json"
    arquivo = pronto(exportar(abrir, edicao_id))
    alvo.write_text(json.dumps(arquivo, ensure_ascii=False), encoding="utf-8")

    assert main(["edicao", "revisar", str(edicao_id), "--arquivo", str(alvo)]) == 1
    erro_revisao = capsys.readouterr()
    assert main(["edicao", "publicar", str(edicao_id)]) == 1
    erro_publicacao = capsys.readouterr()
    for erro in (erro_revisao, erro_publicacao):
        assert "Item 1 (documento_pessoal)" in erro.out and CAMPO in erro.out
        assert erro.err == ""
    _sem_dados_oficiais(
        ato_retido, resumo.out, resumo.err, erro_revisao.out, erro_publicacao.out, caplog.text
    )
    sessao.expire_all()
    assert sessao.get(Edicao, edicao_id).estado == "rascunho"
    assert sessao.scalar(select(Ato).where(Ato.id == ato_retido.id)) is ato_retido
    assert ato_retido.titulo == f"Nomeia {NOME} para o cargo de exemplo."
    assert ato_retido.ementa == "Ementa reservada fictícia da coleta."
