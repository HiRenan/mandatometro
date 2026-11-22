from copy import deepcopy
from datetime import UTC, datetime

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session
from test_coleta_camara import ler
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.api.app import app
from mandatometro.cli import main
from mandatometro.coleta import camara
from mandatometro.coleta.http import ClienteHttp
from mandatometro.db.modelos import Edicao, Fonte, VideoSessao
from mandatometro.ia.servico import ErroEdicao, exportar, gerar, mostrar, publicar, revisar


@pytest.fixture
def abrir(sessao):
    return lambda: Session(bind=sessao.connection(), join_transaction_mode="create_savepoint")


def pronto(arquivo):
    arquivo["cobertura_confirmada"] = True
    for item in arquivo["itens"]:
        item["titulo"] = "Uma proposta para o serviço público"
        item["explicacao"] = [
            "A proposta organiza um serviço público fictício.",
            "O ato precisa ser lido com a fonte oficial.",
        ]
        item["revisado"] = True
        item["artigo_confirmado"] = True
    return arquivo


def test_fluxo_completo_sem_provedor_e_repeticao_imutavel(abrir, dados, sessao):
    dados(10, valores=("sim", "presidente"))
    primeiro = gerar(abrir, INICIO, FIM)
    edicao_id = primeiro["edicao_id"]
    assert primeiro["textos_do_codigo"] == 1
    assert gerar(abrir, INICIO, FIM)["situacao"] == "rascunho_existente"
    with pytest.raises(ErroEdicao, match="pendência"):
        publicar(abrir, edicao_id)
    arquivo = pronto(exportar(abrir, edicao_id))
    revisar(abrir, edicao_id, arquivo)
    previa = mostrar(abrir, edicao_id, app_base_url="http://localhost:3001")
    assert "Sim: 1" in previa and "Entenda na trilha" in previa
    assert publicar(abrir, edicao_id)["situacao"] == "publicada"
    sessao.expire_all()
    edicao = sessao.get(Edicao, edicao_id)
    original = (edicao.publicada_em, edicao.itens[0].texto, deepcopy(edicao.itens[0].fatos))
    assert publicar(abrir, edicao_id)["situacao"] == "ja_publicada"
    assert gerar(abrir, INICIO, FIM, refazer=True)["situacao"] == "ja_publicada"
    with pytest.raises(ErroEdicao, match="publicada"):
        revisar(abrir, edicao_id, arquivo)
    sessao.expire_all()
    assert (edicao.publicada_em, edicao.itens[0].texto, edicao.itens[0].fatos) == original


def test_arquivo_velho_e_alteracao_dos_fatos_sao_recusados(abrir, dados):
    dados(10)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    original = exportar(abrir, edicao_id)
    alterado = deepcopy(original)
    alterado["itens"][0]["fatos"]["votacoes"][0]["resultado"] = "rejeitada"
    with pytest.raises(ErroEdicao, match="fatos"):
        revisar(abrir, edicao_id, alterado)
    revisar(abrir, edicao_id, pronto(deepcopy(original)))
    with pytest.raises(ErroEdicao, match="antigo"):
        revisar(abrir, edicao_id, original)


def test_cobertura_unica_persiste_e_publicar_nao_le_arquivo(abrir, dados):
    dados(10)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    arquivo["cobertura_confirmada"] = False
    revisar(abrir, edicao_id, arquivo)
    with pytest.raises(ErroEdicao, match="cobertura"):
        publicar(abrir, edicao_id)
    atualizado = exportar(abrir, edicao_id)
    assert atualizado["cobertura_confirmada"] is False
    atualizado["cobertura_confirmada"] = True
    revisar(abrir, edicao_id, atualizado)
    assert publicar(abrir, edicao_id)["situacao"] == "publicada"


def test_recoleta_invalida_fatos_sem_modificar_o_rascunho(abrir, dados, sessao):
    votacao = dados(10)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    revisar(abrir, edicao_id, pronto(exportar(abrir, edicao_id)))
    votacao.fonte = Fonte(
        url=votacao.fonte.url,
        url_publica=votacao.fonte.url_publica,
        coletado_em=datetime(2026, 11, 17, tzinfo=UTC),
        trecho=votacao.descricao,
    )
    sessao.flush()
    with pytest.raises(ErroEdicao, match="dados.*mudaram"):
        publicar(abrir, edicao_id)
    sessao.expire_all()
    assert sessao.get(Edicao, edicao_id).estado == "rascunho"
    assert gerar(abrir, INICIO, FIM, refazer=True)["situacao"] == "rascunho_refeito"


@pytest.mark.parametrize("publicar_antes", [False, True])
def test_preencher_video_preserva_a_revisao_e_enriquece_fotografia_v1(
    abrir, dados, sessao, monkeypatch, publicar_antes
):
    votacao = dados(83057, valores=("sim",))
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    revisar(abrir, edicao_id, pronto(exportar(abrir, edicao_id)))
    revisao = exportar(abrir, edicao_id)
    edicao = sessao.get(Edicao, edicao_id)
    fotografia = deepcopy(edicao.itens[0].fatos)
    assert fotografia["versao"] == 1
    fontes_editoriais = (
        votacao.fonte_id,
        votacao.proposicoes[0].fonte_id,
        votacao.votos[0].fonte_id,
    )
    conexao = sessao.connection()
    monkeypatch.setattr("mandatometro.db.engine", lambda: conexao)
    cliente = TestClient(app)
    rota = f"/edicoes/{edicao_id}"
    if publicar_antes:
        publicar(abrir, edicao_id)
        antes = cliente.get(rota).json()
        assert antes["itens"][0]["fatos"]["votacoes"][0]["url_video"] is None

    chamadas = []
    resumos = []

    def atender(req):
        chamadas.append(req.url.path)
        if req.url.path == "/robots.txt":
            return httpx2.Response(404)
        assert req.url.path == "/api/v2/eventos/83057"
        return httpx2.Response(200, json=ler("evento-83057"))

    argumentos = [
        "coleta",
        "camara",
        "--somente-videos",
        "--inicio",
        INICIO.isoformat(),
        "--fim",
        FIM.isoformat(),
    ]
    with httpx2.Client(transport=httpx2.MockTransport(atender)) as transporte:
        monkeypatch.setattr(
            camara, "ClienteHttp", lambda base: ClienteHttp(base, cliente=transporte, intervalo=0)
        )
        monkeypatch.setattr(camara, "sessao_do_banco", abrir)
        monkeypatch.setattr(camara, "mostrar_resumo", resumos.append)
        assert main(argumentos) == main(argumentos) == 0

    assert chamadas == ["/robots.txt", "/api/v2/eventos/83057"]
    assert [r.fontes for r in resumos] == [1, 0]
    assert [r.videos.votacoes_com_video for r in resumos] == [1, 0]
    sessao.expire_all()
    assert len(sessao.scalars(select(VideoSessao)).all()) == 1
    assert edicao.itens[0].fatos == fotografia
    assert fontes_editoriais == (
        votacao.fonte_id,
        votacao.proposicoes[0].fonte_id,
        votacao.votos[0].fonte_id,
    )
    if not publicar_antes:
        assert exportar(abrir, edicao_id) == revisao
        assert publicar(abrir, edicao_id)["situacao"] == "publicada"

    url = votacao.video_sessao.url_video
    assert url == "https://www.youtube.com/watch?v=Video_Teste"
    assert cliente.get(f"/votacoes/{votacao.id}").json()["url_video"] == url
    depois = cliente.get(rota).json()
    assert depois["itens"][0]["fatos"]["votacoes"][0]["url_video"] == url
    if publicar_antes:
        antes["itens"][0]["fatos"]["votacoes"][0]["url_video"] = url
        assert depois == antes


def test_sem_votacoes_nao_cria_edicao(abrir, sessao):
    assert gerar(abrir, INICIO, FIM)["situacao"] == "sem_votacoes_no_banco"
    assert not list(sessao.scalars(select(Edicao)))


def test_resumo_informa_ids_e_quantidades_das_exclusoes(abrir, dados, sessao):
    dados(10, proposicoes=[])
    dados(20, publica=False, ficha=False)
    resultado = gerar(abrir, INICIO, FIM)
    assert resultado["situacao"] == "sem_itens_elegiveis"
    assert resultado["quantidade_sem_proposicao"] == len(resultado["sem_proposicao"]) == 1
    assert resultado["quantidade_sem_pagina_publica"] == len(resultado["sem_pagina_publica"]) == 1
    assert resultado["quantidade_cortadas_pelo_teto"] == 0
    assert not list(sessao.scalars(select(Edicao)))


def test_duas_edicoes_no_periodo_e_erro(abrir, sessao):
    sessao.add_all([Edicao(titulo="Teste", inicio=INICIO, fim=FIM) for _ in range(2)])
    sessao.flush()
    with pytest.raises(ErroEdicao, match="mais de uma"):
        gerar(abrir, INICIO, FIM)


def test_exclusao_exige_motivo_e_nao_pode_esvaziar_edicao(abrir, dados):
    dados(10)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    arquivo["itens"][0]["excluir"] = True
    with pytest.raises(ErroEdicao, match="motivo"):
        revisar(abrir, edicao_id, arquivo)
    arquivo["itens"][0]["motivo_exclusao"] = "Não será usado nesta edição."
    with pytest.raises(ErroEdicao, match="ao menos um"):
        revisar(abrir, edicao_id, arquivo)


def test_item_excluido_pode_ter_acentos_quebrados(abrir, dados):
    dados(10)
    dados(20)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    excluido = arquivo["itens"][0]
    excluido["excluir"] = True
    excluido["motivo_exclusao"] = "Recorte editorial desta edição."
    excluido["titulo"] = "A gest?o fictícia"
    excluido["explicacao"] = ["?poca de gestÃ£o fictícia.", "O servi\ufffdo ? fictício."]

    assert revisar(abrir, edicao_id, arquivo)["itens"] == 1
    salvo = exportar(abrir, edicao_id)
    assert len(salvo["itens"]) == 1
    assert salvo["itens"][0]["titulo"] == arquivo["itens"][1]["titulo"]
    assert salvo["itens"][0]["fatos"]["votacoes"] == arquivo["itens"][1]["fatos"]["votacoes"]


def test_nome_na_saida_avisa_sem_bloquear_e_sem_repetir_nome(abrir, dados):
    dados(10, valores=("sim",))
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    arquivo["itens"][0]["titulo"] = "Deputada citada no texto"
    resultado = revisar(abrir, edicao_id, arquivo)
    assert resultado["avisos"] == ["Confira o item 1: o texto pode citar parlamentar ou partido."]
    assert publicar(abrir, edicao_id)["situacao"] == "publicada"


def test_reordenacao_e_exclusao_preservam_os_fatos_dos_itens_mantidos(abrir, dados):
    for numero in (10, 20, 30):
        dados(numero)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    arquivo["itens"].reverse()
    arquivo["itens"][1]["excluir"] = True
    arquivo["itens"][1]["motivo_exclusao"] = "Recorte editorial desta edição."
    esperadas = [i["fatos"]["votacoes"] for i in arquivo["itens"] if not i["excluir"]]
    assert revisar(abrir, edicao_id, arquivo)["itens"] == 2
    atual = exportar(abrir, edicao_id)
    assert [i["fatos"]["votacoes"] for i in atual["itens"]] == esperadas
    assert publicar(abrir, edicao_id)["situacao"] == "publicada"


def test_publicada_mantem_fontes_e_placares_apos_recoleta(abrir, dados, sessao):
    votacao = dados(10, valores=("sim",))
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    revisar(abrir, edicao_id, pronto(exportar(abrir, edicao_id)))
    publicar(abrir, edicao_id)
    antes = mostrar(abrir, edicao_id, app_base_url="http://localhost:3001")
    votacao.resultado = "rejeitada"
    votacao.fonte = Fonte(
        url=votacao.fonte.url,
        url_publica=votacao.fonte.url_publica,
        coletado_em=datetime(2026, 11, 17, tzinfo=UTC),
        trecho="Trecho alterado na nova coleta.",
    )
    sessao.flush()
    assert mostrar(abrir, edicao_id, app_base_url="http://localhost:3001") == antes


@pytest.mark.parametrize(
    "mudanca", ["numero", "placeholder", "sem_marcador", "artigo", "tipo", "pessoal"]
)
def test_erro_informa_item_e_campo_e_nao_grava_parcial(abrir, dados, mudanca):
    dados(10)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    antes = exportar(abrir, edicao_id)
    item = arquivo["itens"][0]
    if mudanca == "numero":
        item["explicacao"] = ["O projeto cria 987654 serviços."]
    elif mudanca == "placeholder":
        item["explicacao"] = ["Redação pendente: preencher."]
    elif mudanca == "sem_marcador":
        item["explicacao"] = ["Explique o ato votado e o que a proposta prevê."]
    elif mudanca == "artigo":
        item["artigo_caminho"] = "//exemplo.com/fora"
    elif mudanca == "tipo":
        item["explicacao"] = "Uma frase."
    else:
        item["explicacao"] = ["Licença para tratamento de saúde de parlamentar."]
    with pytest.raises(ErroEdicao, match="[Ii]tem 1"):
        revisar(abrir, edicao_id, arquivo)
    assert exportar(abrir, edicao_id) == antes
