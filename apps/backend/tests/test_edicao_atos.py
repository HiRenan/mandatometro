from datetime import UTC, date, datetime

import pytest
from sqlalchemy import select
from test_edicao_revisao import abrir as abrir
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.db.modelos import Ato, Edicao, Fonte, ItemEdicao
from mandatometro.ia import selecao, servico
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


@pytest.fixture
def selecao_com_ato(monkeypatch, ato):
    def selecionar(sessao, inicio, fim, *, teto):
        resultado = selecao.selecionar(sessao, inicio, fim, teto=teto)
        if teto == 8:  # Simula a seleção inicial da #205, que a conferência não repete.
            resultado.itens.append(selecao.ItemAtoBase.de_ato(sessao.get(Ato, ato.id)))
        return resultado

    monkeypatch.setattr(servico, "selecionar", selecionar)


def nova_fonte(fonte):
    return Fonte(
        url=fonte.url,
        url_publica=fonte.url_publica,
        coletado_em=fonte.coletado_em,
        trecho=fonte.trecho,
    )


@pytest.mark.parametrize("com_votacao", [False, True])
def test_gerar_exportar_revisar_e_publicar_ato(abrir, dados, ato, selecao_com_ato, com_votacao):
    entradas = []
    if com_votacao:
        dados(10, valores=("sim",))

    class RedatorFalso:
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


def test_gerar_recusa_coleta_alterada_entre_selecao_e_gravacao(
    abrir, dados, sessao, ato, selecao_com_ato
):
    dados(10, valores=("sim",))

    class RedatorFalso:
        def escrever(self, _):
            ato.fonte = nova_fonte(ato.fonte)
            sessao.flush()
            return RespostaRedator(
                {"titulo": "Proposta fictícia", "explicacao": ["Uma explicação fictícia."]}
            )

    with pytest.raises(ErroEdicao, match="Item 2: os dados usados mudaram"):
        gerar(abrir, INICIO, FIM, redator=RedatorFalso())
    assert sessao.scalar(select(Edicao)) is None


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
