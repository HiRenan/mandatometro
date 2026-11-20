import re
from datetime import UTC, date, datetime
from uuid import UUID

import pytest

from mandatometro.avisos.email import MensagemInvalida, formatar_edicao, montar_email
from mandatometro.db.modelos import Edicao, Fonte, ItemEdicao
from mandatometro.ia.esquemas import FatosAto

CODIGO = UUID("34868836-8b08-4f77-9d43-fce466da4817")


@pytest.fixture
def edicao():
    fonte = Fonte(
        url="https://dadosabertos.camara.leg.br/api/v2/proposicoes/1",
        url_publica="https://www.camara.leg.br/noticias/exemplo",
        coletado_em=datetime(2026, 11, 15, 12, tzinfo=UTC),
        trecho="Trecho fictício <para teste>.",
    )
    return Edicao(
        id=1,
        titulo="Jornal de teste <&>",
        inicio=date(2026, 11, 9),
        fim=date(2026, 11, 15),
        estado="publicada",
        publicada_em=datetime(2026, 11, 15, 13, tzinfo=UTC),
        itens=[
            ItemEdicao(ordem=2, titulo="Segundo", texto="Texto fictício dois.", fonte=fonte),
            ItemEdicao(ordem=1, titulo="Primeiro", texto="Texto fictício <script>.", fonte=fonte),
        ],
    )


def montar(edicao, **opcoes):
    return montar_email(
        edicao,
        CODIGO,
        app_base_url="https://mandatometro.example.com",
        api_url=opcoes.get("api_url", "https://api.example.com"),
    )


def test_texto_html_fontes_data_trecho_e_ordem(edicao):
    mensagem = montar(edicao)
    assert mensagem.assunto == edicao.titulo
    assert mensagem.texto.index("Primeiro") < mensagem.texto.index("Segundo")
    assert mensagem.html.index("Primeiro") < mensagem.html.index("Segundo")
    for corpo in (mensagem.texto, mensagem.html):
        assert "https://www.camara.leg.br/noticias/exemplo" in corpo
        assert "15/11/2026" in corpo
        assert "Trecho fictício" in corpo
        assert f"/newsletter/sair?codigo={CODIGO}" in corpo
    assert "<script>" not in mensagem.html
    assert "&lt;script&gt;" in mensagem.html
    assert "&lt;&amp;&gt;" in mensagem.html
    assert "&lt;para teste&gt;" in mensagem.html
    assert re.findall(r"<h2>(.*?)</h2>", mensagem.html) == ["Primeiro", "Segundo"]
    assert "O que o Congresso votou" not in mensagem.texto
    assert "O que saiu no Diário Oficial" not in mensagem.texto


def test_saida_tem_url_https_e_os_dois_cabecalhos(edicao):
    assert montar(edicao).cabecalhos == {
        "List-Unsubscribe": f"<https://api.example.com/newsletter/saida/{CODIGO}>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    }


def test_sem_url_publica_usa_a_fonte_coletada(edicao):
    edicao.itens[0].fonte.url_publica = None
    assert edicao.itens[0].fonte.url in montar(edicao).texto


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "https://camara.leg.br.example.com/x",
        "https://pessoa@camara.leg.br/x",
    ],
)
def test_nao_monta_email_com_link_inseguro_ou_nao_oficial(edicao, url):
    edicao.itens[0].fonte.url_publica = url
    with pytest.raises(MensagemInvalida):
        montar(edicao)


def test_link_de_saida_real_exige_https(edicao):
    with pytest.raises(MensagemInvalida):
        montar(edicao, api_url="http://api.example.com")


def test_rascunho_nao_vira_email(edicao):
    edicao.estado = "rascunho"
    with pytest.raises(MensagemInvalida):
        montar(edicao)


def test_fatos_artigo_e_fontes_adicionais_sem_repetir_principal(edicao):
    from mandatometro.ia.esquemas import Fatos, FatoVotacao, Placar

    item = edicao.itens[0]
    item.fonte.id = 10
    outra = Fonte(
        id=20,
        url="https://dadosabertos.camara.leg.br/api/v2/proposicoes/20",
        url_publica="https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=20",
        coletado_em=item.fonte.coletado_em,
        trecho="Ementa fictícia <&>.",
    )
    item.fatos = Fatos(
        proposicoes=[20],
        votacoes=[
            FatoVotacao(
                id=30,
                data=date(2026, 11, 10),
                resultado="aprovada",
                placar=Placar(sim=10, nao=2, presidente=1),
                fontes=[10],
            )
        ],
        fontes=[10, 20],
        pendencias=[],
    ).model_dump(mode="json")
    item.artigo_caminho = "/trilhas/processo-legislativo/onde-o-projeto-comeca"
    edicao.itens = [item]
    mensagem = montar_email(
        edicao,
        CODIGO,
        app_base_url="https://mandatometro.example.com",
        api_url="https://api.example.com",
        fontes={20: outra},
    )
    assert mensagem.html.count(">Fonte oficial</a>") == 1
    assert outra.url_publica in mensagem.html
    assert "&lt;&amp;&gt;" in mensagem.html
    assert "Entenda na trilha" in mensagem.html
    assert (
        "https://mandatometro.example.com/trilhas/processo-legislativo/onde-o-projeto-comeca"
        in mensagem.texto
    )
    assert "Sim: 10" in mensagem.texto and "Não: 2" in mensagem.texto
    assert "Presidência: 1" in mensagem.texto
    # Fontes distintas podem apontar para a mesma página pública (atos da mesma sessão).
    outra.url_publica = item.fonte.url_publica
    mensagem = montar_email(
        edicao,
        CODIGO,
        app_base_url="https://mandatometro.example.com",
        api_url="https://api.example.com",
        fontes={20: outra},
    )
    assert mensagem.texto.count(item.fonte.url_publica) == 1
    assert "Trecho fictício" in mensagem.texto and "Ementa fictícia" in mensagem.texto


def test_artigo_fora_do_catalogo_nao_vira_link(edicao):
    edicao.itens[0].artigo_caminho = "//exemplo.com/fora"
    with pytest.raises(MensagemInvalida):
        montar(edicao)


def test_sem_placar_nao_inventa_modalidade_e_resultado_outro_nao_vira_aprovacao(edicao):
    from mandatometro.ia.esquemas import Fatos, FatoVotacao

    item = edicao.itens[0]
    item.fonte.id = 10
    edicao.itens = [item]
    item.fatos = Fatos(
        proposicoes=[20],
        votacoes=[
            FatoVotacao(id=30, data=date(2026, 11, 10), resultado="outro", placar=None, fontes=[10])
        ],
        fontes=[10],
    ).model_dump(mode="json")
    texto = montar(edicao).texto
    assert "O resultado desta votação não está classificado nos dados usados." in texto
    assert "O placar não está disponível nos dados usados." in texto
    assert all(palavra not in texto for palavra in ("secreta", "simbólica", "Sim: 0", "aprovada"))
    item.fatos["fontes"].append(999)
    with pytest.raises(MensagemInvalida):
        montar(edicao)


@pytest.fixture
def ato_da_edicao():
    fonte = Fonte(
        id=110,
        url="https://www.senado.leg.br/dados/ato-ficticio",
        url_publica="https://www.in.gov.br/ato-ficticio",
        coletado_em=datetime(2026, 11, 15, 12, tzinfo=UTC),
        trecho="Trecho fictício reservado do ato.",
    )
    fatos = FatosAto(
        versao=2,
        ato_id=989898,
        data_publicacao=date(2026, 11, 12),
        fontes=[fonte.id],
        hash_ato="b" * 64,
        origem="revisao",
        pendencias=[],
    ).model_dump(mode="json")
    return ItemEdicao(
        ordem=1, titulo="Primeiro ato", texto="Ato fictício.", fonte=fonte, fatos=fatos
    )


@pytest.fixture
def edicao_com_ato(edicao, ato_da_edicao):
    edicao.itens = [ato_da_edicao]
    return edicao


def test_formatar_ato_mostra_data_e_pagina_oficial_sem_campos_internos(edicao_com_ato):
    previa = formatar_edicao(edicao_com_ato, app_base_url="http://localhost:3001", previa=True)
    mensagem = montar(edicao_com_ato)

    assert re.findall(r"<h([23])>(.*?)</h[23]>", mensagem.html) == [
        ("2", "O que saiu no Diário Oficial"),
        ("3", "Primeiro ato"),
    ]
    for corpo in (previa.texto, previa.html, mensagem.texto, mensagem.html):
        assert corpo.index("O que saiu no Diário Oficial") < corpo.index("Primeiro ato")
        assert "O que o Congresso votou" not in corpo
        assert "Publicado no Diário Oficial em 12/11/2026." in corpo
        assert "https://www.in.gov.br/ato-ficticio" in corpo
        assert all(
            termo not in corpo
            for termo in (
                "https://www.senado.leg.br/dados/ato-ficticio",
                "Trecho fictício",
                "989898",
                "revisao",
                "pendencias",
                "versao",
                "Votação",
                "placar",
            )
        )


def test_edicao_mista_agrupa_as_votacoes_e_os_atos_na_ordem_de_cada_secao(edicao, ato_da_edicao):
    segunda_votacao, primeira_votacao = edicao.itens
    primeira_votacao.ordem, segunda_votacao.ordem = 2, 4
    segundo_ato = ItemEdicao(
        ordem=3,
        titulo="Segundo ato",
        texto="Outro ato fictício.",
        fonte=ato_da_edicao.fonte,
        fatos=ato_da_edicao.fatos,
    )
    edicao.itens = [segundo_ato, segunda_votacao, ato_da_edicao, primeira_votacao]
    titulos = [
        ("2", "O que o Congresso votou"),
        ("3", "Primeiro"),
        ("3", "Segundo"),
        ("2", "O que saiu no Diário Oficial"),
        ("3", "Primeiro ato"),
        ("3", "Segundo ato"),
    ]

    previa = formatar_edicao(edicao, app_base_url="http://localhost:3001", previa=True)
    mensagem = montar(edicao)

    for html in (previa.html, mensagem.html):
        assert re.findall(r"<h([23])>(.*?)</h[23]>", html) == titulos
    textos_dos_titulos = [titulo for _, titulo in titulos]
    for texto in (previa.texto, mensagem.texto):
        assert [linha for linha in texto.splitlines() if linha in textos_dos_titulos] == (
            textos_dos_titulos
        )
        votacoes, atos = texto.split("O que saiu no Diário Oficial")
        assert votacoes.count(f"Fonte oficial: {primeira_votacao.fonte.url_publica}") == 2
        assert atos.count(f"Fonte oficial: {ato_da_edicao.fonte.url_publica}") == 2
        assert "Trecho fictício reservado do ato." not in texto


def test_formatar_ato_exige_pagina_oficial(edicao_com_ato):
    edicao_com_ato.itens[0].fonte.url_publica = None

    with pytest.raises(MensagemInvalida, match="página oficial"):
        montar(edicao_com_ato)
