from datetime import UTC, date, datetime
from uuid import UUID

import pytest

from mandatometro.avisos.email import MensagemInvalida, montar_email
from mandatometro.db.modelos import Edicao, Fonte, ItemEdicao

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
