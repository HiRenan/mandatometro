"""Contrato offline da coleta dos destaques e do POST de uma página por vez."""

import json
import os
from datetime import UTC, date, datetime
from functools import partial
from pathlib import Path
from types import SimpleNamespace

import httpx2
import psycopg
import pytest
from pydantic import SecretStr
from sqlalchemy import create_engine, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from mandatometro.cli import main
from mandatometro.coleta import cli, destaques
from mandatometro.coleta.http import ErroColeta
from mandatometro.db.modelos import Ato, Fonte

PAGINA = (
    "https://www.in.gov.br/servicos/diario-oficial-da-uniao/destaques-do-diario-oficial-da-uniao"
)
PORTLET = "com_liferay_asset_publisher_web_portlet_AssetPublisherPortlet_INSTANCE_mhF1RLPnJWPh"
PAGINACAO = (
    f"{PAGINA}?p_p_id={PORTLET}&p_p_lifecycle=0&p_p_state=normal&p_p_mode=view"
    f"&_{PORTLET}_delta=20&p_r_p_resetCur=false&_{PORTLET}_cur="
)
API = "https://api.firecrawl.dev/v2/scrape"
CHAVE = "chave-ficticia"
MARCADOR_PRIVADO = "CONTEUDO FICTICIO QUE DEVE FICAR FORA DA SAIDA"
INICIO, FIM = date(2026, 11, 13), date(2026, 11, 19)
LEI, PORTARIA, SEM_EMENTA, DECRETO = "24643987", "24639118", "24641657", "24632395"
PORTARIA_P2, DECRETO_P2 = "24624855", "24621021"


def envelope(html="", *, status=200):
    return {"success": True, "data": {"rawHtml": html, "metadata": {"statusCode": status}}}


@pytest.fixture
def atender():
    respostas = []
    pedidos = []

    def responder(pedido):
        pedidos.append(pedido)
        assert str(pedido.url) == API
        assert pedido.method == "POST"
        assert pedido.headers.get("authorization") == f"Bearer {CHAVE}"
        resposta = respostas.pop(0)
        if isinstance(resposta, httpx2.RequestError):
            raise resposta
        return resposta

    with httpx2.Client(transport=httpx2.MockTransport(responder), follow_redirects=True) as cliente:
        yield cliente, respostas, pedidos


@pytest.fixture
def firecrawl(atender):
    cliente, respostas, pedidos = atender
    with destaques.ClienteFirecrawl(SecretStr(CHAVE), cliente=cliente) as http:
        yield http, respostas, pedidos


@pytest.mark.parametrize("url", [PAGINA, PAGINACAO + "2"])
def test_pede_somente_html_bruto_e_leitura_fresca(firecrawl, url):
    http, respostas, pedidos = firecrawl
    respostas.append(httpx2.Response(200, json=envelope("<html></html>")))

    resposta = http.ler_pagina(url)

    assert (resposta.url, resposta.dados) == (url, "<html></html>")
    assert resposta.coletado_em.tzinfo == UTC
    assert (http.chamadas, http.tentativas_extras) == (1, 0)
    assert json.loads(pedidos[0].content) == {"url": url, "formats": ["rawHtml"], "maxAge": 0}


@pytest.mark.parametrize(
    "url",
    [
        "https://www.in.gov.br/robots.txt",
        "https://www.in.gov.br/web/dou/-/portaria-ficticia-123",
        PAGINA.replace("https:", "http:"),
        PAGINA.replace("www.in.gov.br", "example.com"),
        PAGINA.replace("www.in.gov.br", "www.in.gov.br@example.com"),
        PAGINA + "/",
        PAGINA + "#lista",
        PAGINA + "?p_p_id=" + PORTLET,
        PAGINACAO + "2&extra=1",
        PAGINACAO.replace("delta=20", "delta=40") + "2",
        pytest.param(PAGINACAO + "0", id="pagina-zero"),
        PAGINACAO + "7",
    ],
)
def test_recusa_url_fora_da_excecao_antes_do_post(firecrawl, url):
    http, respostas, pedidos = firecrawl
    respostas.append(httpx2.Response(200, json=envelope()))

    with pytest.raises(ErroColeta, match="endereco_fora_da_excecao"):
        http.ler_pagina(url)

    assert len(pedidos) == http.chamadas == 0


@pytest.mark.parametrize(
    ("resposta", "motivo"),
    [
        (httpx2.Response(401, text=MARCADOR_PRIVADO), "chave_recusada"),
        (httpx2.Response(403), "chave_recusada"),
        (httpx2.Response(402), "sem_credito"),
        (httpx2.Response(302, headers={"Location": "https://example.com/"}), "http_inesperado"),
        (httpx2.ReadTimeout(MARCADOR_PRIVADO), "tempo_esgotado"),
        (httpx2.ConnectError(MARCADOR_PRIVADO), "falha_rede"),
        (httpx2.Response(200, text=MARCADOR_PRIVADO), "json_invalido"),
        (httpx2.Response(200, json={"success": False, "error": MARCADOR_PRIVADO}), "recusa"),
        (httpx2.Response(200, json=envelope(status=404)), "status_pagina"),
        (httpx2.Response(200, json={"success": True, "data": None}), "formato_invalido"),
        (httpx2.Response(200, json=envelope(html=None)), "formato_invalido"),
    ],
)
def test_falha_do_firecrawl_omite_corpo_e_excecao(firecrawl, resposta, motivo, caplog):
    http, respostas, pedidos = firecrawl
    respostas.append(resposta)

    with pytest.raises(ErroColeta, match=rf"\({motivo}\)\.$") as erro:
        http.ler_pagina(PAGINA)

    assert (len(pedidos), http.chamadas, http.tentativas_extras) == (1, 1, 0)
    assert erro.value.__suppress_context__ or erro.value.__context__ is None
    assert MARCADOR_PRIVADO not in str(erro.value) + caplog.text
    assert CHAVE not in str(erro.value) + caplog.text


def test_recusa_pagina_redirecionada_pelo_provedor(firecrawl):
    http, respostas, _ = firecrawl
    dados = envelope()
    dados["data"]["metadata"]["url"] = "https://www.in.gov.br/web/dou/-/ato-123"
    respostas.append(httpx2.Response(200, json=dados))

    with pytest.raises(ErroColeta, match="pagina_redirecionada"):
        http.ler_pagina(PAGINA)


@pytest.mark.parametrize("status", [429, 503, 599])
@pytest.mark.parametrize("retry_after", ["11", "Thu, 19 Nov 2026 15:00:11 GMT"])
def test_retry_after_repete_a_mesma_pagina(firecrawl, monkeypatch, status, retry_after):
    http, respostas, pedidos = firecrawl
    esperas = []

    class Relogio(datetime):
        @classmethod
        def now(cls, tz):
            return cls(2026, 11, 19, 15, tzinfo=tz)

    monkeypatch.setattr(destaques, "datetime", Relogio)
    monkeypatch.setattr(destaques.time, "sleep", esperas.append)
    respostas.extend(
        [
            httpx2.Response(status, headers={"Retry-After": retry_after}),
            httpx2.Response(200, json=envelope()),
        ]
    )

    assert http.ler_pagina(PAGINA).url == PAGINA

    assert esperas == [11]
    assert (http.chamadas, http.tentativas_extras) == (2, 1)
    assert len(pedidos) == 2 and pedidos[0].content == pedidos[1].content


@pytest.mark.parametrize("status,motivo", [(429, "limite_pedidos"), (500, "servidor_firecrawl")])
@pytest.mark.parametrize(
    "retry_after,esperas",
    [
        ("", [1, 2]),
        ("2", [2, 2]),
        (str(destaques._MAX_ESPERA_S), [destaques._MAX_ESPERA_S] * 2),
        (str(destaques._MAX_ESPERA_S + 1), []),
    ],
)
def test_limita_tentativas_e_espera_do_firecrawl(
    firecrawl, monkeypatch, status, motivo, retry_after, esperas, caplog
):
    http, respostas, pedidos = firecrawl
    pausas = []
    monkeypatch.setattr(destaques.time, "sleep", pausas.append)
    respostas.extend(
        httpx2.Response(status, headers={"Retry-After": retry_after}, text=MARCADOR_PRIVADO)
        for _ in range(destaques._TENTATIVAS)
    )

    with pytest.raises(ErroColeta, match=rf"\({motivo}\)\.$") as erro:
        http.ler_pagina(PAGINA)

    assert pausas == esperas
    assert len(pedidos) == http.chamadas == (destaques._TENTATIVAS if esperas else 1)
    assert http.tentativas_extras == len(esperas)
    assert MARCADOR_PRIVADO not in str(erro.value) + caplog.text
    assert CHAVE not in str(erro.value) + caplog.text


def recorte(numero):
    pasta = Path(__file__).parent / "fixtures" / "firecrawl"
    return json.loads((pasta / f"destaques-p{numero}.json").read_text(encoding="utf-8"))


def cartao(id_externo, *, url=None, **alteracoes):
    campos = {
        "idMateria": id_externo,
        "artType": "Portaria",
        "pubName": "DO1",
        "pubDate": "18/11/2026",
        "highlight": "Destaque fictício",
        **alteracoes,
    }
    xml = "".join(
        f'<dynamic-element name="{nome}"><dynamic-content><![CDATA[{valor}]]></dynamic-content>'
        "</dynamic-element>"
        for nome, valor in campos.items()
    )
    if url is None:
        url = f"https://www.in.gov.br/web/dou/-/portaria-ficticia-{id_externo}"
    return f'<div class="dou row"><root>{xml}</root><a class="title" href="{url}">Ato</a></div>'


def pagina(*cartoes):
    return httpx2.Response(200, json=envelope('<div class="lista-de-dou">' + "".join(cartoes)))


def alvos(pedidos):
    return [json.loads(pedido.content)["url"] for pedido in pedidos]


@pytest.fixture
def executar(atender, sessao):
    def rodar(*paginas, inicio=INICIO, fim=FIM):
        cliente, respostas, pedidos = atender
        respostas.extend(paginas)
        chamadas_anteriores = len(pedidos)
        abrir_sessao = partial(
            Session, bind=sessao.connection(), join_transaction_mode="create_savepoint"
        )
        with destaques.ClienteFirecrawl(SecretStr(CHAVE), cliente=cliente) as http:
            resumo = destaques.coletar(inicio, fim, http=http, abrir_sessao=abrir_sessao, hoje=FIM)
        sessao.expire_all()
        return resumo, alvos(pedidos[chamadas_anteriores:])

    return rodar


def test_recortes_gravam_colunas_e_fontes_das_duas_paginas(sessao, executar):
    resumo, consultadas = executar(
        httpx2.Response(200, json=recorte(1)), httpx2.Response(200, json=recorte(2)), pagina()
    )

    assert resumo.completa
    assert (resumo.atos, resumo.chamadas, resumo.tentativas_extras) == (6, 3, 0)
    assert resumo.descartes == {"secao_fora_do_recorte": 1, "xml_invalido": 1, "fora_do_periodo": 1}
    assert consultadas == [PAGINA, PAGINACAO + "2", PAGINACAO + "3"]
    atos = {ato.id_externo: ato for ato in sessao.scalars(select(Ato))}
    assert set(atos) == {LEI, PORTARIA, SEM_EMENTA, DECRETO, PORTARIA_P2, DECRETO_P2}
    assert {ato.origem for ato in atos.values()} == {"destaques_dou"}
    assert {ato.secao for ato in atos.values()} == {"DO1"}
    assert all(ato.fonte.trecho is None for ato in atos.values())
    assert sessao.scalar(select(func.count()).select_from(Fonte)) == 6
    assert (atos[PORTARIA].tipo, atos[PORTARIA].numero) == ("outro", "4021")
    assert atos[SEM_EMENTA].ementa is None
    assert (atos[LEI].tipo, atos[LEI].numero, atos[LEI].data_publicacao) == ("lei", "15534", FIM)
    assert (atos[DECRETO].tipo, atos[DECRETO].numero) == ("decreto", "13167")
    assert atos[DECRETO].data_assinatura == date(2026, 11, 16)
    assert atos[DECRETO].orgao == "Órgão fictício"
    assert atos[DECRETO].titulo == "Decreto fictício"
    assert atos[DECRETO].ementa == "Ementa fictícia & referência de teste."
    assert atos[DECRETO].fonte.url == PAGINA
    assert atos[DECRETO].fonte.url_publica == (
        "https://www.in.gov.br/web/dou/-/decreto-n-13.167-de-16-de-novembro-de-2026-744721216"
    )
    assert atos[DECRETO_P2].data_publicacao == INICIO
    assert atos[DECRETO_P2].fonte.url == PAGINACAO + "2"


def test_pagina_so_com_ato_mais_novo_nao_interrompe_e_pagina_so_antiga_interrompe(executar):
    resumo, consultadas = executar(
        pagina(cartao("100", pubDate="19/11/2026") + '<a href="https://example.com/">Mais</a>'),
        pagina(cartao("200")),
        pagina(cartao("300", pubDate="12/11/2026")),
        fim=date(2026, 11, 18),
    )

    assert consultadas == [PAGINA, PAGINACAO + "2", PAGINACAO + "3"]
    assert resumo.completa and resumo.atos == 1
    assert resumo.descartes == {"fora_do_periodo": 2}


@pytest.mark.parametrize(
    "abertura",
    [
        pytest.param('<div class="dou row" data-exemplo="argos">', id="atributo-extra"),
        pytest.param('<div class="row dou">', id="ordem-das-classes"),
    ],
)
def test_grava_os_atos_quando_a_marcacao_do_cartao_varia(sessao, executar, abertura):
    primeiro = cartao("100").replace('<div class="dou row">', abertura, 1)

    resumo, consultadas = executar(pagina(primeiro, cartao("200")), pagina())

    assert resumo.completa and resumo.atos == 2
    assert resumo.descartes == {}
    assert sessao.scalars(select(Ato.id_externo).order_by(Ato.id_externo)).all() == ["100", "200"]
    assert consultadas == [PAGINA, PAGINACAO + "2"]


def test_abertura_de_xml_em_cdata_nao_divide_o_cartao(executar):
    primeiro = cartao("100", ementa="Exemplo <root>", texto="<root>").replace(
        "<![CDATA[<root>]]>", "<!--[CDATA[<root>]]-->"
    )

    resumo, _ = executar(pagina(primeiro, cartao("200")), pagina())

    assert resumo.completa and resumo.atos == 2
    assert resumo.descartes == {}


def test_teto_da_excecao_tem_seis_paginas_e_sinaliza_coleta_incompleta(executar):
    paginas = [pagina(cartao(f"{n}00", pubDate="19/11/2026")) for n in range(1, 7)]
    resumo, pedidos = executar(*paginas, fim=date(2026, 11, 18))

    assert pedidos == [PAGINA, *(PAGINACAO + str(n) for n in range(2, 7))]
    assert (resumo.atos, resumo.chamadas, resumo.completa) == (0, 6, False)
    assert resumo.descartes == {"fora_do_periodo": 6}
    assert resumo.erro == "Limite de páginas dos destaques atingido."


def test_data_ilegivel_nao_prova_que_uma_pagina_e_toda_antiga(executar):
    quebrado = cartao("100").replace("</root>", "")
    resumo, consultadas = executar(
        pagina(quebrado, cartao("200", pubDate="data inválida")),
        pagina(cartao("300", pubDate="12/11/2026")),
    )

    assert consultadas == [PAGINA, PAGINACAO + "2"]
    assert resumo.completa and resumo.atos == 0
    assert resumo.descartes == {"xml_invalido": 1, "data_invalida": 1, "fora_do_periodo": 1}


def test_secoes_e_campos_opcionais(sessao, executar):
    resumo, _ = executar(
        pagina(
            cartao(
                "100",
                artType="Medida Provisória",
                pubName="DO1E",
                titulo="Medida Provisória nº 9",
                data="17/11/2026",
                hierarchy="Órgão fictício/Unidade fictícia",
            ),
            cartao("200", pubName="DO1S", ementa="   "),
            cartao("300", pubName="DO2E"),
            cartao("400", pubName="DO3"),
            cartao("500", pubName="DO10"),
        ),
        pagina(),
    )

    assert resumo.atos == 2 and resumo.descartes == {"secao_fora_do_recorte": 3}
    atos = {a.id_externo: a for a in sessao.scalars(select(Ato))}
    assert set(atos) == {"100", "200"}
    a, b = atos["100"], atos["200"]
    assert (a.secao, a.tipo, a.numero) == ("DO1E", "medida_provisoria", "9")
    assert (a.data_assinatura, a.orgao) == (date(2026, 11, 17), "Órgão fictício/Unidade fictícia")
    assert a.titulo == "Medida Provisória nº 9"
    assert (b.secao, b.data_assinatura, b.orgao, b.numero, b.ementa) == (
        "DO1S",
        None,
        None,
        None,
        None,
    )


def test_descarta_datas_e_campos_obrigatorios(executar):
    resumo, _ = executar(
        pagina(
            cartao("100", pubDate="31/11/2026"),
            cartao("200", pubDate="20/11/2026"),
            cartao("300", data="20/11/2026"),
            cartao("500", data="31 de novembro de 2026"),
            cartao("600", pubDate=""),
            cartao("700", artType=" "),
            cartao("800", highlight="", titulo=" "),
            cartao("900", pubName=" "),
            cartao("999", idMateria=" "),
            cartao("1000", idMateria="A46"),
        ),
        pagina(),
    )

    assert resumo.completa and resumo.atos == 1
    assert resumo.assinaturas_ignoradas == 1
    assert resumo.descartes == {"data_invalida": 2, "data_futura": 1, "campo_obrigatorio": 6}


@pytest.mark.parametrize("data_no_link", ["19-de-novembro-de-2026", "12-de-dezembro-de-2026"])
def test_assinatura_do_link_posterior_a_publicacao_fica_nula(
    sessao, executar, capsys, data_no_link
):
    url = f"https://www.in.gov.br/web/dou/-/portaria-n-10-de-{data_no_link}-123"
    titulo = "Portaria fictícia"
    resumo, _ = executar(pagina(cartao("100", url=url, highlight=titulo)), pagina())

    assert resumo.completa and resumo.atos == 1
    ato = sessao.scalars(select(Ato)).one()
    assert ato.id_externo == "100" and ato.data_publicacao == date(2026, 11, 18)
    assert ato.data_assinatura is None
    assert ato.titulo == titulo and ato.fonte.url_publica == url

    cli.mostrar_resumo(resumo)
    saida = json.loads(capsys.readouterr().out)
    assert saida["assinaturas_ignoradas"] == 1
    assert saida["descartes"] == {}


@pytest.mark.parametrize(
    "url",
    [
        "",
        "http://www.in.gov.br/web/dou/-/ato-1",
        "https://in.gov.br/web/dou/-/ato-1",
        "https://www.in.gov.br.example.com/web/dou/-/ato-1",
        "https://www.in.gov.br:443/web/dou/-/ato-1",
        "https://www.in.gov.br/servicos/ato-1",
        "https://www.in.gov.br/web/dou/-/ato-sem-identificador",
        "https://www.in.gov.br/web/dou/-/a%2Fb-1",
        "https://www.in.gov.br/web/dou/-/pasta/../ato-1",
        "https://www.in.gov.br/web/dou/-/pasta//ato-1",
        "https://www.in.gov.br/web/dou/-/ato-1?externo=1",
        "https://www.in.gov.br/web/dou/-/ato-1#externo",
    ],
)
def test_descarta_link_invalido_sem_pedir_o_ato(executar, url):
    resumo, consultadas = executar(pagina(cartao("200", url=url)), pagina())

    assert resumo.completa and resumo.atos == 0
    assert resumo.descartes == {"link_invalido": 1}
    assert consultadas == [PAGINA, PAGINACAO + "2"]


def test_cartao_sem_link_nao_reaproveita_o_link_do_proximo(sessao, executar):
    sem_link = cartao("100").replace('class="title"', 'class="rotulo"')

    resumo, _ = executar(pagina(sem_link, cartao("200")), pagina())

    assert resumo.completa and resumo.atos == 1
    assert resumo.descartes == {"link_invalido": 1}
    assert sessao.scalars(select(Ato.id_externo)).all() == ["200"]


def test_link_de_portaria_pode_conter_barras_no_nome_do_ato(sessao, executar):
    url = (
        "https://www.in.gov.br/web/dou/-/portaria/orgaos/ficticio-n-21-de-13-de-novembro-de-2026-1"
    )
    resumo, consultadas = executar(pagina(cartao("200", url=url)), pagina())

    assert resumo.atos == 1 and resumo.descartes == {}
    assert consultadas == [PAGINA, PAGINACAO + "2"]
    assert sessao.scalars(select(Fonte.url_publica)).one() == url


def test_recoleta_atualiza_mesma_linha_sem_juntar_origens(sessao, executar):
    fonte = Fonte(url="https://example.com", coletado_em=datetime.now(UTC))
    senado = Ato(
        origem="legislacao_senado",
        id_externo=DECRETO,
        tipo="decreto",
        numero="13167",
        titulo="Decreto fictício no Senado",
        data_publicacao=INICIO,
        fonte=fonte,
    )
    sessao.add(senado)
    sessao.flush()

    dados = recorte(1)
    executar(httpx2.Response(200, json=dados), pagina())
    consulta = select(Ato).where(Ato.origem == "destaques_dou", Ato.id_externo == DECRETO)
    antigo = sessao.scalars(consulta).one()
    id_original, fonte_original = antigo.id, antigo.fonte_id

    dados["data"]["rawHtml"] = dados["data"]["rawHtml"].replace(
        "Decreto fictício", "Decreto fictício atualizado"
    )
    resumo, _ = executar(httpx2.Response(200, json=dados), pagina())

    atualizado = sessao.scalars(consulta).one()
    assert resumo.atos == 4
    assert atualizado.id == id_original and atualizado.fonte_id != fonte_original
    assert atualizado.titulo == "Decreto fictício atualizado"
    assert senado.titulo == "Decreto fictício no Senado" and senado.numero == atualizado.numero
    assert sessao.scalar(select(func.count()).select_from(Ato)) == 5


def test_falha_na_segunda_pagina_preserva_os_atos_e_as_fontes(sessao, executar, monkeypatch):
    monkeypatch.setattr(destaques.time, "sleep", lambda _: None)
    resumo, consultadas = executar(
        httpx2.Response(200, json=recorte(1)),
        *(httpx2.Response(503, text=MARCADOR_PRIVADO) for _ in range(destaques._TENTATIVAS)),
    )

    assert consultadas == [PAGINA] + [PAGINACAO + "2"] * destaques._TENTATIVAS
    assert (resumo.chamadas, resumo.tentativas_extras) == (len(consultadas), len(consultadas) - 2)
    assert not resumo.completa and resumo.atos == 4
    assert resumo.erro == "Falha na coleta de destaques pelo Firecrawl (servidor_firecrawl)."
    assert sessao.scalar(select(func.count()).select_from(Ato)) == 4
    assert sessao.scalar(select(func.count()).select_from(Fonte)) == 4


def test_falha_de_gravacao_desfaz_a_fonte_do_ato(sessao, executar, monkeypatch):
    salvar = destaques.salvar_ato

    def falhar_no_segundo(s, **dados):
        if dados["id_externo"] == "200":
            raise SQLAlchemyError(MARCADOR_PRIVADO)
        return salvar(s, **dados)

    monkeypatch.setattr(destaques, "salvar_ato", falhar_no_segundo)
    resumo, _ = executar(pagina(cartao("100"), cartao("200")))

    assert not resumo.completa and resumo.atos == 1
    assert resumo.descartes == {"falha_gravacao": 1}
    assert MARCADOR_PRIVADO not in resumo.erro
    assert sessao.scalars(select(Ato.id_externo)).all() == ["100"]
    assert sessao.scalar(select(func.count()).select_from(Fonte)) == 1


@pytest.fixture
def atender_cli(atender, monkeypatch):
    cliente, respostas, pedidos = atender
    monkeypatch.setattr(
        destaques, "config", lambda: SimpleNamespace(firecrawl_api_key=SecretStr(CHAVE))
    )
    monkeypatch.setattr(
        destaques, "ClienteFirecrawl", partial(destaques.ClienteFirecrawl, cliente=cliente)
    )
    return respostas, pedidos


@pytest.mark.parametrize(
    ("status", "motivo"),
    [
        (200, "pagina_sem_destaques"),
        (401, "chave_recusada"),
        (402, "sem_credito"),
        (429, "limite_pedidos"),
        (503, "servidor_firecrawl"),
    ],
)
def test_cli_resolve_sete_dias_e_emite_uma_linha_json(
    atender_cli, engine_de_teste, monkeypatch, capsys, status, motivo
):
    class Relogio:
        @staticmethod
        def now(fuso):
            assert fuso.key == "America/Sao_Paulo"
            return datetime(2026, 11, 20, tzinfo=fuso)

    respostas, pedidos = atender_cli
    if status == 200:
        respostas.append(pagina())
    else:
        respostas.append(
            httpx2.Response(status, text=MARCADOR_PRIVADO, headers={"Retry-After": "3600"})
        )
    monkeypatch.setattr(cli, "datetime", Relogio)
    monkeypatch.setattr("mandatometro.db.engine", lambda: engine_de_teste)

    assert main(["coleta", "destaques"]) == 1

    saida = capsys.readouterr()
    assert len(saida.out.splitlines()) == 1 and not saida.err
    resumo = json.loads(saida.out)
    assert (resumo["inicio"], resumo["fim"], resumo["atos"]) == ("2026-11-13", "2026-11-19", 0)
    assert resumo["assinaturas_ignoradas"] == 0
    assert resumo["completa"] is False and resumo["descartes"] == {}
    assert resumo["erro"] == f"Falha na coleta de destaques pelo Firecrawl ({motivo})."
    assert alvos(pedidos) == [PAGINA]
    assert not {"titulo", "ementa", "assina", "cargo", "texto"}.intersection(resumo)
    assert CHAVE not in saida.out and MARCADOR_PRIVADO not in saida.out


def test_cli_banco_indisponivel_falha_sem_pedir_ao_firecrawl(atender_cli, monkeypatch, capsys):
    respostas, pedidos = atender_cli
    respostas.append(httpx2.Response(401))
    tentativas = []

    def conectar():
        tentativas.append(1)
        raise psycopg.OperationalError(MARCADOR_PRIVADO)

    banco = create_engine("postgresql+psycopg://", creator=conectar)
    monkeypatch.setattr("mandatometro.db.engine", lambda: banco)

    try:
        assert main(["coleta", "destaques", "--inicio", str(INICIO), "--fim", str(FIM)]) == 1
    finally:
        banco.dispose()

    assert tentativas == [1]
    assert pedidos == []
    saida = capsys.readouterr()
    assert saida.err == ""
    resumo = json.loads(saida.out)
    assert resumo["completa"] is False
    assert (resumo["atos"], resumo["chamadas"], resumo["tentativas_extras"]) == (0, 0, 0)
    assert resumo["descartes"] == {}
    assert resumo["erro"] == "O banco não respondeu antes da coleta dos destaques."
    assert CHAVE not in saida.out and MARCADOR_PRIVADO not in saida.out


def test_cli_resume_coleta_com_ato_apos_falha_passageira(atender_cli, sessao, monkeypatch, capsys):
    titulo, ementa = "Título fictício do teste", "Ementa fictícia do teste"
    respostas, pedidos = atender_cli
    respostas.extend(
        (httpx2.Response(503), pagina(cartao("100", titulo=titulo, ementa=ementa)), pagina())
    )
    monkeypatch.setattr(destaques.time, "sleep", lambda _: None)
    abrir_sessao = partial(
        Session, bind=sessao.connection(), join_transaction_mode="create_savepoint"
    )
    monkeypatch.setattr(
        destaques, "coletar", partial(destaques.coletar, abrir_sessao=abrir_sessao, hoje=FIM)
    )

    assert main(["coleta", "destaques", "--inicio", str(INICIO), "--fim", str(FIM)]) == 0

    saida = capsys.readouterr()
    assert len(saida.out.splitlines()) == 1 and not saida.err
    resumo = json.loads(saida.out)
    assert set(resumo) == {
        "origem",
        "inicio",
        "fim",
        "atos",
        "descartes",
        "chamadas",
        "tentativas_extras",
        "duracao_s",
        "completa",
        "erro",
        "assinaturas_ignoradas",
    }
    assert (resumo["atos"], resumo["completa"], resumo["erro"]) == (1, True, None)
    assert (resumo["chamadas"], resumo["tentativas_extras"]) == (3, 1)
    assert all(marcador not in saida.out for marcador in (titulo, ementa, CHAVE))
    assert sessao.scalars(select(Ato.id_externo)).all() == ["100"]
    assert alvos(pedidos) == [PAGINA, PAGINA, PAGINACAO + "2"]


@pytest.mark.online
def test_firecrawl_ainda_entrega_os_cartoes_liferay():
    chave = os.environ.get("FIRECRAWL_API_KEY", "").strip()
    if not chave:
        pytest.skip("Defina FIRECRAWL_API_KEY para conferir a fonte ao vivo.")

    with destaques.ClienteFirecrawl(SecretStr(chave)) as http:
        html = http.ler_pagina(PAGINA).dados

    assert isinstance(html, str)
    assert 0 < len(destaques._dividir_cartoes(html)) <= 20
    assert all(html.count(f'name="{campo}"') > 0 for campo in ("idMateria", "pubDate", "pubName"))
