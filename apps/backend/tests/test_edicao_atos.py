from datetime import UTC, date, datetime

import pytest
from sqlalchemy import select
from test_edicao_revisao import abrir as abrir
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.db.modelos import Ato, Edicao, Fonte, ItemEdicao
from mandatometro.ia.redacao import RespostaRedator
from mandatometro.ia.servico import ErroEdicao, exportar, gerar, publicar, revisar

HASH_ATO = "e4db65667762864c995baaefd735df69824c3db2bd7958325adb8e1803e00b18"
ERRO_DADOS = "Item 1: os dados usados mudaram. Refaça e revise o rascunho."


@pytest.fixture
def ato(sessao):
    ato = Ato(
        origem="coleta_exemplo",
        id_externo="decreto-exemplo",
        tipo="decreto",
        titulo="Título fictício da coleta.",
        ementa="Ementa fictícia da coleta.",
        data_publicacao=date(2026, 11, 12),
        data_assinatura=date(2026, 11, 11),
        orgao="Órgão de exemplo",
        numero="1234",
        fonte=Fonte(
            url="https://www.senado.leg.br/dados/ato-exemplo",
            url_publica="https://www.in.gov.br/ato-exemplo",
            coletado_em=datetime(2026, 11, 16, tzinfo=UTC),
            trecho="Trecho reservado fictício da coleta.",
        ),
    )
    sessao.add(ato)
    sessao.flush()
    return ato


@pytest.fixture
def rascunho_ato(sessao, ato):
    fatos = {
        "versao": 2,
        "ato_id": ato.id,
        "data_publicacao": ato.data_publicacao.isoformat(),
        "fontes": [ato.fonte_id],
        "hash_ato": HASH_ATO,
        "origem": "codigo",
        "pendencias": ["revisao", "cobertura"],
    }
    item = ItemEdicao(
        ordem=1, titulo="Ato fictício", texto="Explicação fictícia.", fonte=ato.fonte, fatos=fatos
    )
    edicao = Edicao(titulo="Edição fictícia", inicio=INICIO, fim=FIM, itens=[item])
    sessao.add(edicao)
    sessao.flush()
    return edicao


def nova_fonte(fonte):
    return Fonte(
        url=fonte.url,
        url_publica=fonte.url_publica,
        coletado_em=fonte.coletado_em,
        trecho=fonte.trecho,
    )


@pytest.mark.parametrize("com_votacao", [False, True])
def test_gerar_exportar_revisar_e_publicar_ato(abrir, dados, ato, com_votacao):
    entradas = []
    if com_votacao:
        dados(10, valores=("sim",))

    class RedatorFalso:
        def ordenar_atos(self, _):
            return RespostaRedator(
                {"ordem": [{"posicao": 1, "motivo": "Ajuda a entender o serviço público."}]}
            )

        def escrever(self, entrada):
            entradas.append(entrada)
            return RespostaRedator(
                {"titulo": "Proposta fictícia", "explicacao": ["Uma explicação fictícia."]}
            )

    resultado = gerar(abrir, INICIO, FIM, redator=RedatorFalso())

    assert resultado["situacao"] == "rascunho_criado"
    assert resultado["itens"] == 1 + com_votacao
    assert len(entradas) == com_votacao
    edicao_id = resultado["edicao_id"]
    arquivo = exportar(abrir, edicao_id)
    item_ato = arquivo["itens"][-1]
    assert item_ato["fatos"] == {
        "versao": 2,
        "ato_id": ato.id,
        "data_publicacao": "2026-11-12",
        "fontes": [ato.fonte_id],
        "hash_ato": HASH_ATO,
        "origem": "codigo",
        "pendencias": ["revisao", "cobertura", "redacao"],
        "selecao": {
            "ordem": 1,
            "teto": 5,
            "origem": "modelo",
            "motivo": "Ajuda a entender o serviço público.",
        },
    }
    assert item_ato["artigo_caminho"] is None
    assert ato.titulo not in str(item_ato)
    assert ato.ementa not in str(item_ato)
    assert ato.fonte.trecho not in str(item_ato)
    if com_votacao:
        assert arquivo["itens"][0]["fatos"]["versao"] == 1
    with pytest.raises(ErroEdicao, match="pendência"):
        publicar(abrir, edicao_id)

    so_removeu_o_rotulo = item_ato["explicacao"][0].split(": ", 1)[1]
    pronto(arquivo)
    item_ato["explicacao"] = [so_removeu_o_rotulo]
    with pytest.raises(ErroEdicao, match="escreva a explicação"):
        revisar(abrir, edicao_id, arquivo)
    item_ato["explicacao"] = ["O ato fictício foi publicado em 12 de novembro."]
    assert revisar(abrir, edicao_id, arquivo)["pendencias"] == []
    assert publicar(abrir, edicao_id)["situacao"] == "publicada"


def test_revisar_ato_aceita_numeros_da_linha_e_das_datas(abrir, sessao, ato):
    ato.numero = "12345"
    ato.titulo = "Título fictício sobre 628 serviços."
    ato.ementa = "Ementa fictícia sobre 73 casos."
    sessao.flush()
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    item = arquivo["itens"][0]
    item["titulo"] = "Decreto fictício nº 12.345 para 628 serviços"
    item["explicacao"] = [
        "O ato de teste, assinado em 11 de novembro e publicado no dia 12, trata de 73 casos.",
        "O período desta edição vai de 9 a 15 de novembro de 2026.",
    ]

    assert revisar(abrir, edicao_id, arquivo)["pendencias"] == []
    revisado = exportar(abrir, edicao_id)["itens"][0]
    assert revisado["titulo"] == item["titulo"]
    assert revisado["explicacao"] == item["explicacao"]
    assert revisado["contexto"] == item["contexto"] == {}
    assert revisado["fatos"] == item["fatos"] | {"origem": "revisao", "pendencias": []}


@pytest.mark.parametrize(
    ("alteracao", "campo"),
    [
        ({"titulo": "Decreto fictício nº 98.765"}, "título"),
        ({"explicacao": ["O exemplo define 98.765 casos."]}, "explicação"),
    ],
    ids=["titulo", "explicacao"],
)
def test_revisar_ato_recusa_numero_de_fora(abrir, rascunho_ato, alteracao, campo):
    arquivo = pronto(exportar(abrir, rascunho_ato.id))
    arquivo["itens"][0].update(alteracao)

    with pytest.raises(ErroEdicao) as erro:
        revisar(abrir, rascunho_ato.id, arquivo)
    assert str(erro.value) == f"Item 1: o campo {campo} tem número que não está nos fatos enviados."


def test_gerar_recusa_coleta_alterada_entre_selecao_e_gravacao(abrir, dados, sessao, ato):
    dados(10, valores=("sim",))

    class RedatorFalso:
        def ordenar_atos(self, _):
            return RespostaRedator({})

        def escrever(self, _):
            ato.fonte = nova_fonte(ato.fonte)
            sessao.flush()
            return RespostaRedator(
                {"titulo": "Proposta fictícia", "explicacao": ["Uma explicação fictícia."]}
            )

    with pytest.raises(ErroEdicao, match="Item 2: os dados usados mudaram"):
        gerar(abrir, INICIO, FIM, redator=RedatorFalso())
    assert sessao.scalar(select(Edicao)) is None


@pytest.mark.parametrize("etapa", ["gerar", "exportar", "revisar", "publicar"])
@pytest.mark.parametrize(
    "url_publica",
    [None, "", "https://example.com/ato-exemplo"],
    ids=["ausente", "vazia", "dominio-nao-oficial"],
)
def test_conferencia_recusa_ato_sem_pagina_publica_oficial(abrir, sessao, ato, etapa, url_publica):
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    revisar(abrir, edicao_id, pronto(exportar(abrir, edicao_id)))
    arquivo = exportar(abrir, edicao_id)

    class RedatorFalso:
        def ordenar_atos(self, _):
            ato.fonte.url_publica = url_publica
            sessao.flush()
            return RespostaRedator({})

    if etapa != "gerar":
        ato.fonte.url_publica = url_publica
        sessao.flush()

    operacoes = {
        "gerar": lambda: gerar(abrir, INICIO, FIM, refazer=True, redator=RedatorFalso()),
        "exportar": lambda: exportar(abrir, edicao_id),
        "revisar": lambda: revisar(abrir, edicao_id, arquivo),
        "publicar": lambda: publicar(abrir, edicao_id),
    }
    with pytest.raises(ErroEdicao) as erro:
        operacoes[etapa]()
    assert str(erro.value) == ERRO_DADOS


@pytest.mark.parametrize("mudanca", ["data", "ementa", "fonte", "exclusao"])
def test_exportar_revisar_e_publicar_recusam_ato_alterado_ou_removido(
    abrir, sessao, ato, rascunho_ato, mudanca
):
    edicao_id = rascunho_ato.id
    revisar(abrir, edicao_id, pronto(exportar(abrir, edicao_id)))
    arquivo = exportar(abrir, edicao_id)
    ato_id, fonte_id = ato.id, ato.fonte_id

    if mudanca == "data":
        ato.data_publicacao = date(2026, 11, 13)
    elif mudanca == "ementa":
        ato.ementa = "Outra ementa fictícia."
    elif mudanca == "fonte":
        ato.fonte = nova_fonte(ato.fonte)
    else:
        sessao.delete(ato)
    sessao.flush()
    if mudanca == "fonte":
        assert ato.id == ato_id and ato.fonte_id != fonte_id

    for operacao, args in ((exportar, ()), (revisar, (arquivo,)), (publicar, ())):
        with pytest.raises(ErroEdicao) as erro:
            operacao(abrir, edicao_id, *args)
        assert str(erro.value) == ERRO_DADOS

    sessao.expire(rascunho_ato)
    assert rascunho_ato.estado == "rascunho"
    assert rascunho_ato.itens[0].fatos == arquivo["itens"][0]["fatos"]
    assert rascunho_ato.itens[0].fonte_id == fonte_id


@pytest.mark.parametrize("campo", ["fontes", "fonte_id"])
def test_conferir_exige_fatos_e_fonte_principal_exatos(abrir, sessao, rascunho_ato, campo):
    item = rascunho_ato.itens[0]
    fonte = nova_fonte(item.fonte)
    sessao.add(fonte)
    sessao.flush()
    if campo == "fontes":
        item.fatos = item.fatos | {"fontes": [item.fonte_id, fonte.id]}
    else:
        item.fonte = fonte
    sessao.flush()

    with pytest.raises(ErroEdicao) as erro:
        exportar(abrir, rascunho_ato.id)
    assert str(erro.value) == ERRO_DADOS
