"""O conector inteiro contra respostas gravadas, num banco isolado, sem rede."""

import json
from contextlib import nullcontext
from copy import deepcopy
from datetime import date
from pathlib import Path

import httpx2
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from mandatometro.cli import main
from mandatometro.coleta import camara
from mandatometro.coleta.camara import coletar
from mandatometro.coleta.http import ClienteHttp
from mandatometro.db.modelos import Fonte, Mandato, Parlamentar, Proposicao, Votacao, Voto

BASE = "https://dadosabertos.camara.leg.br/api/v2"
INICIO, FIM = date(2026, 10, 1), date(2026, 11, 7)


def ler(nome):
    caminho = Path(__file__).parent / "fixtures/camara" / f"{nome}.json"
    return json.loads(caminho.read_text(encoding="utf-8"))


@pytest.fixture
def roteiro():
    dados = {
        "/deputados": ler("deputados-atuais-pagina-curta"),
        "/deputados/178843": ler("deputado-178843"),
    }
    for identificador in ("2637478-26", "2236186-60"):
        dados[f"/votacoes/{identificador}"] = ler(f"votacao-{identificador}")
        dados[f"/votacoes/{identificador}/votos"] = ler(f"votacao-{identificador}-votos")
    for identificador in (2637478, 2236186):
        dados[f"/proposicoes/{identificador}"] = ler(f"proposicao-{identificador}")
        dados[f"/proposicoes/{identificador}/temas"] = {"dados": [], "links": []}
    for evento in (83057, 83188):
        dados[f"/eventos/{evento}"] = ler(f"evento-{evento}")
    dados["/votacoes"] = {
        "dados": [deepcopy(dados[f"/votacoes/{i}"]["dados"]) for i in ("2637478-26", "2236186-60")],
        "links": [],
    }
    return dados


def executar(
    sessao,
    roteiro,
    *,
    inicio=INICIO,
    fim=FIM,
    interceptar=None,
    saida_esperada=None,
    somente_videos=False,
):
    caminhos = []

    def atender(req):
        caminhos.append(str(req.url))
        if req.url.path == "/robots.txt":
            return httpx2.Response(404)
        if interceptar:
            resposta = interceptar(req)
            if resposta is not None:
                return resposta
        caminho = req.url.path.removeprefix("/api/v2")
        dado = roteiro.get(caminho)
        if isinstance(dado, int):
            return httpx2.Response(dado)
        assert dado is not None, f"chamada não prevista: {caminho}"
        return httpx2.Response(200, json=dado)

    conexao = sessao.connection()
    with (
        httpx2.Client(transport=httpx2.MockTransport(atender)) as transporte,
        ClienteHttp(BASE, cliente=transporte, intervalo=0) as http,
    ):

        def criar_sessao():
            return Session(bind=conexao, join_transaction_mode="create_savepoint")

        if saida_esperada is None and not somente_videos:
            resumo = coletar(inicio, fim, http=http, criar_sessao=criar_sessao)
        else:
            argumentos = [
                "coleta",
                "camara",
                "--inicio",
                inicio.isoformat(),
                "--fim",
                fim.isoformat(),
            ]
            if somente_videos:
                argumentos.append("--somente-videos")
            resumos = []
            with pytest.MonkeyPatch.context() as patch:
                patch.setattr(camara, "ClienteHttp", lambda _: nullcontext(http))
                patch.setattr(camara, "sessao_do_banco", criar_sessao)
                patch.setattr(camara, "mostrar_resumo", resumos.append)
                assert main(argumentos) == (saida_esperada or 0)
            resumo = resumos[0]
    sessao.expire_all()
    return resumo, caminhos


def contar(sessao, modelo):
    return sessao.scalar(select(func.count()).select_from(modelo))


def test_coleta_nominal_simbolica_e_repete_sem_duplicar(sessao, roteiro):
    primeiro, chamadas = executar(sessao, roteiro)
    assert primeiro.completa
    assert (primeiro.votacoes, primeiro.proposicoes, primeiro.votos) == (2, 2, 429)
    assert primeiro.videos.sessoes_com_video == 1
    assert primeiro.videos.sessoes_sem_video == 1
    assert all("/orientacoes" not in x for x in chamadas)
    assert [contar(sessao, m) for m in (Parlamentar, Mandato, Proposicao, Votacao, Voto)] == [
        429,
        429,
        2,
        2,
        429,
    ]
    fontes_antes = contar(sessao, Fonte)
    ids = set(sessao.scalars(select(Votacao.id)))
    # Correção da Casa: o voto é atualizado na repetição.
    roteiro["/votacoes/2236186-60/votos"]["dados"][0]["tipoVoto"] = "Não"
    segundo, _ = executar(sessao, roteiro)
    assert segundo.completa and segundo.votos == 429
    assert set(sessao.scalars(select(Votacao.id))) == ids
    assert contar(sessao, Voto) == 429
    deputado_corrigido = roteiro["/votacoes/2236186-60/votos"]["dados"][0]["deputado_"]["id"]
    assert (
        sessao.scalar(
            select(Voto.valor)
            .join(Parlamentar)
            .where(
                Parlamentar.id_externo == deputado_corrigido,
            )
        )
        == "nao"
    )
    assert contar(sessao, Fonte) == fontes_antes + segundo.fontes
    for votacao in sessao.scalars(select(Votacao)):
        assert votacao.fonte.url_publica.startswith("https://www.camara.leg.br/evento-legislativo/")
        assert votacao.fonte.trecho == votacao.descricao
    for proposicao in sessao.scalars(select(Proposicao)):
        assert f"idProposicao={proposicao.id_externo}" in proposicao.fonte.url_publica
        assert proposicao.fonte.trecho == proposicao.ementa


def test_video_da_camara_e_consultado_uma_vez_por_evento(sessao, roteiro):
    roteiro["/votacoes/2637478-26"]["dados"]["idEvento"] = 83057

    resumo, chamadas = executar(sessao, roteiro)

    assert resumo.videos.votacoes_com_video == 2
    assert [url for url in chamadas if "/eventos/" in url] == [f"{BASE}/eventos/83057"]
    votacoes = sessao.scalars(select(Votacao)).all()
    assert len({v.video_sessao_id for v in votacoes}) == 1
    video = votacoes[0].video_sessao
    assert video.url_video == "https://www.youtube.com/watch?v=Video_Teste"
    assert video.fonte.url == f"{BASE}/eventos/83057"
    assert video.fonte.coletado_em is not None
    assert all(v.fonte_id != video.fonte_id for v in votacoes)


@pytest.mark.parametrize("status,recusadas,falhas", [(None, 1, 0), (404, 0, 1)])
def test_video_da_camara_invalido_ou_indisponivel_preserva_votacao(
    sessao, roteiro, status, recusadas, falhas
):
    roteiro["/eventos/83188"] = status or ler("evento-url-recusada")

    resumo, chamadas = executar(sessao, roteiro)

    assert resumo.completa and resumo.votacoes == 2
    assert (resumo.videos.urls_recusadas, resumo.videos.falhas_sessoes) == (recusadas, falhas)
    depois_do_video = chamadas[chamadas.index(f"{BASE}/eventos/83188") + 1 :]
    assert f"{BASE}/proposicoes/2637478/temas" in depois_do_video
    votacao = sessao.scalar(select(Votacao).where(Votacao.id_externo == "2637478-26"))
    assert votacao.video_sessao is None or votacao.video_sessao.url_video is None


@pytest.mark.parametrize("sufixo", ["&t=60", "\n"], ids=["tempo", "quebra-de-linha"])
def test_video_recusa_url_com_sufixo_antes_da_gravacao(sessao, roteiro, sufixo):
    url = roteiro["/eventos/83057"]["dados"]["urlRegistro"]
    roteiro["/eventos/83188"]["dados"]["urlRegistro"] = url + sufixo

    resumo, _ = executar(sessao, roteiro)

    assert resumo.completa and resumo.votacoes == 2
    assert resumo.videos.urls_recusadas == 1
    assert resumo.videos.falhas_gravacao == 0
    votacao = sessao.scalar(select(Votacao).where(Votacao.id_externo == "2637478-26"))
    assert votacao.video_sessao.url_video is None


@pytest.mark.parametrize("somente_videos", [False, True])
@pytest.mark.parametrize(
    "orgaos",
    [None, [{"id": 999, "sigla": "CCJC"}], [{"id": 180, "sigla": "PLEN"}, {"id": 999}]],
    ids=["ausente", "comissao", "misto"],
)
def test_video_da_camara_recusa_evento_fora_do_plenario(sessao, roteiro, somente_videos, orgaos):
    rota = "/eventos/83057"
    evento = roteiro[rota]
    if somente_videos:
        roteiro[rota] = 404
        executar(sessao, roteiro)
        roteiro[rota] = evento
    if orgaos is None:
        evento["dados"].pop("orgaos")
    else:
        evento["dados"]["orgaos"] = orgaos

    resumo, chamadas = executar(sessao, roteiro, somente_videos=somente_videos)

    assert resumo.completa
    assert resumo.votacoes == (0 if somente_videos else 2)
    assert [url for url in chamadas if url.endswith(rota)] == [f"{BASE}{rota}"]
    assert resumo.videos.urls_recusadas == 1
    assert resumo.videos.falhas_sessoes == 0
    assert resumo.videos.votacoes_com_video == 0
    assert all(
        v.video_sessao is None or v.video_sessao.url_video is None
        for v in sessao.scalars(select(Votacao))
    )


def test_votacao_sem_evento_e_contada(sessao, roteiro):
    roteiro["/votacoes/2637478-26"]["dados"]["idEvento"] = None

    resumo, chamadas = executar(sessao, roteiro)

    assert resumo.completa and resumo.votacoes == 2
    assert resumo.videos.votacoes_sem_sessao == 1
    assert not any(url.endswith("/eventos/83188") for url in chamadas)


def test_quem_votou_fora_da_lista_atual_tem_mandato_da_fonte_do_voto(sessao, roteiro):
    executar(sessao, roteiro)
    atuais = sessao.scalars(select(Mandato).where(Mandato.em_exercicio.is_(True))).all()
    assert len(atuais) == 1 and atuais[0].parlamentar.id_externo == 178843
    historicos = sessao.scalars(select(Mandato).where(Mandato.em_exercicio.is_(False))).all()
    assert len(historicos) == 428
    assert all(m.legislatura == 57 and m.condicao is None for m in historicos)
    assert all(m.fonte.url.endswith("/votos") for m in historicos)


def test_falha_de_detalhe_preserva_condicao_e_continua(sessao, roteiro):
    executar(sessao, roteiro)
    roteiro["/deputados/178843"] = 404
    resumo, _ = executar(sessao, roteiro)
    assert not resumo.completa and resumo.falhas_parlamentares == 1
    assert resumo.votacoes == 2
    mandato = sessao.scalars(
        select(Mandato).join(Parlamentar).where(Parlamentar.id_externo == 178843)
    ).one()
    assert mandato.condicao == "Titular" and mandato.em_exercicio


def test_detalhe_divergente_nao_troca_legislatura_da_lista(sessao, roteiro):
    roteiro["/deputados/178843"]["dados"]["ultimoStatus"]["idLegislatura"] = 58
    resumo, _ = executar(sessao, roteiro)
    assert not resumo.completa and resumo.falhas_parlamentares == 1
    mandato = sessao.scalars(
        select(Mandato).join(Parlamentar).where(Parlamentar.id_externo == 178843)
    ).one()
    assert mandato.legislatura == 57 and mandato.condicao is None


def test_lista_incompleta_nao_reconcilia_exercicio(sessao, roteiro):
    executar(sessao, roteiro)
    roteiro["/deputados"]["dados"] = []
    resumo, chamadas = executar(sessao, roteiro)
    assert not resumo.completa and resumo.votacoes == 0
    assert (
        sessao.scalar(
            select(func.count()).select_from(Mandato).where(Mandato.em_exercicio.is_(True))
        )
        == 1
    )
    assert not any("/votacoes" in x for x in chamadas)


def test_falha_isolada_pula_votacao_e_reexecucao_completa(sessao, roteiro):
    original = roteiro["/votacoes/2637478-26/votos"]
    roteiro["/votacoes/2637478-26/votos"] = 403
    resumo, _ = executar(sessao, roteiro)
    assert not resumo.completa
    assert resumo.falhas_votacoes == ["2637478-26"]
    assert (contar(sessao, Votacao), contar(sessao, Voto)) == (1, 429)
    roteiro["/votacoes/2637478-26/votos"] = original
    resumo, _ = executar(sessao, roteiro)
    assert resumo.completa
    assert (contar(sessao, Votacao), contar(sessao, Voto)) == (2, 429)


def test_tres_falhas_seguidas_param_sem_buscar_quarta_votacao(sessao, roteiro):
    modelo = roteiro["/votacoes"]["dados"][0]
    roteiro["/votacoes"]["dados"] = [dict(modelo, id=f"1-{i}") for i in range(1, 5)]
    for i in range(1, 5):
        roteiro[f"/votacoes/1-{i}"] = 403
    resumo, chamadas = executar(sessao, roteiro)
    assert resumo.falhas_votacoes == ["1-1", "1-2", "1-3"]
    assert not resumo.completa and resumo.erro
    assert not any(x.endswith("/1-4") for x in chamadas)


def test_tres_detalhes_falhos_param_antes_das_votacoes(sessao, roteiro):
    modelo = roteiro["/deputados"]["dados"][0]
    roteiro["/deputados"]["dados"] = [
        dict(modelo, id=i, nome="Pessoa inventada") for i in range(1, 5)
    ]
    for i in range(1, 5):
        roteiro[f"/deputados/{i}"] = 404
    resumo, chamadas = executar(sessao, roteiro)
    assert resumo.falhas_parlamentares == 3 and not resumo.completa
    assert not any("/votacoes" in x or x.endswith("/deputados/4") for x in chamadas)


def test_proposicoes_afetadas_nunca_saem_do_prefixo(sessao, roteiro):
    roteiro["/votacoes/2637478-26"]["dados"]["proposicoesAfetadas"] = [
        roteiro["/proposicoes/2236186"]["dados"],
        roteiro["/proposicoes/2637478"]["dados"],
    ]
    resumo, _ = executar(sessao, roteiro)
    assert resumo.completa
    v = sessao.scalars(select(Votacao).where(Votacao.id_externo == "2637478-26")).one()
    assert {p.id_externo for p in v.proposicoes} == {2236186, 2637478}


def test_codigo_desconhecido_nao_vaza_codigo_ou_pessoa(sessao, roteiro, caplog):
    linha = roteiro["/votacoes/2236186-60/votos"]["dados"][0]
    linha["tipoVoto"] = "MOTIVO_PESSOAL_FICTICIO"
    linha["deputado_"]["nome"] = "PESSOA_NAO_DEVE_APARECER_NO_LOG"
    resumo, _ = executar(sessao, roteiro)
    voto = sessao.scalars(select(Voto).where(Voto.valor == "outro")).one()
    assert voto.valor_bruto is None and resumo.codigos_desconhecidos == 1
    assert "2236186-60" in caplog.text
    assert "MOTIVO_PESSOAL_FICTICIO" not in caplog.text
    assert "PESSOA_NAO_DEVE_APARECER_NO_LOG" not in caplog.text
    assert not any(
        f.trecho and "MOTIVO_PESSOAL_FICTICIO" in f.trecho for f in sessao.scalars(select(Fonte))
    )


@pytest.mark.parametrize("inicio", [date(2026, 10, 13), date(2026, 10, 14)])
def test_inclui_o_ultimo_dia_e_exclui_a_meia_noite_seguinte(sessao, roteiro, inicio):
    nominal = roteiro["/votacoes/2236186-60"]["dados"]
    seguinte = dict(
        nominal, id="9999999-1", data="2026-10-15", dataHoraRegistro="2026-10-15T00:00:00"
    )

    def interceptar(req):
        if req.url.path.endswith("/votacoes"):
            inicio_api = req.url.params["dataInicio"] + "T00:00:00"
            fim_api = req.url.params["dataFim"] + "T00:00:00"
            itens = [
                v for v in (nominal, seguinte) if inicio_api <= v["dataHoraRegistro"] <= fim_api
            ]
            return httpx2.Response(200, json={"dados": itens, "links": []})

    resumo, chamadas = executar(
        sessao, roteiro, inicio=inicio, fim=date(2026, 10, 14), interceptar=interceptar
    )
    assert resumo.completa and (resumo.votacoes, resumo.votos) == (1, 429)
    assert sessao.scalars(select(Votacao.data)).all() == [date(2026, 10, 14)]
    assert not any("/votacoes/9999999-1" in chamada for chamada in chamadas)


def test_paginacao_e_divisao_na_virada_do_ano(sessao, roteiro):
    periodos = []
    paginas = []
    itens = []
    for identificador, dia in (("2637478-26", "2025-12-31"), ("2236186-60", "2026-01-02")):
        item = roteiro[f"/votacoes/{identificador}"]["dados"]
        item.update(data=dia, dataHoraRegistro=dia + "T12:00:00")
        itens.append(item)

    def interceptar(req):
        if req.url.path.endswith("/votacoes"):
            inicio_api = req.url.params["dataInicio"]
            fim_api = req.url.params.get("dataFim")
            periodos.append((inicio_api, fim_api))
            paginas.append(req.url.params.get("pagina", "1"))
            links = []
            dados = []
            if "pagina" not in req.url.params:
                links = [{"rel": "next", "href": str(req.url.copy_set_param("pagina", 2))}]
            else:
                limite = fim_api or f"{int(inicio_api[:4]) + 1}-01-01"
                dados = [v for v in itens if inicio_api <= v["dataHoraRegistro"] < limite]
            return httpx2.Response(200, json={"dados": dados, "links": links})

    resumo, _ = executar(
        sessao, roteiro, inicio=date(2025, 12, 30), fim=date(2026, 1, 2), interceptar=interceptar
    )
    assert resumo.completa and resumo.votacoes == 2
    assert set(sessao.scalars(select(Votacao.data))) == {date(2025, 12, 31), date(2026, 1, 2)}
    assert set(periodos) == {("2025-12-30", None), ("2026-01-01", "2026-01-03")}
    assert paginas == ["1", "2", "1", "2"]


def test_paginacao_truncada_e_recusada(sessao, roteiro):
    roteiro["/deputados"]["links"] = [{"rel": "last", "href": BASE + "/deputados?pagina=2"}]
    resumo, _ = executar(sessao, roteiro)
    assert not resumo.completa and contar(sessao, Mandato) == 0


def test_pagina_vazia_no_cadastro_paginado_nao_reconcilia(sessao, roteiro):
    roteiro["/deputados"]["links"] = [{"rel": "next", "href": BASE + "/deputados?pagina=2"}]

    def interceptar(req):
        if req.url.path.endswith("/deputados") and req.url.params.get("pagina") == "2":
            return httpx2.Response(200, json={"dados": [], "links": []})

    resumo, _ = executar(sessao, roteiro, interceptar=interceptar)
    assert not resumo.completa and contar(sessao, Mandato) == 0


@pytest.mark.parametrize("modo", ["salto", "fim_antecipado"])
def test_lista_incompleta_com_lacuna_preserva_exercicio(sessao, roteiro, modo):
    modelo = roteiro["/deputados"]["dados"][0]
    pessoas = [dict(modelo, id=900001 + i, nome="Pessoa inventada") for i in range(3)]
    roteiro["/deputados"] = {"dados": pessoas, "links": []}
    roteiro["/votacoes"] = {"dados": [], "links": []}
    for pessoa in pessoas:
        detalhe = deepcopy(roteiro["/deputados/178843"])
        detalhe["dados"]["id"] = pessoa["id"]
        roteiro[f"/deputados/{pessoa['id']}"] = detalhe
    resumo, _ = executar(sessao, roteiro)
    assert resumo.completa
    consulta = select(Mandato.id, Mandato.em_exercicio, Mandato.fonte_id)
    antes = set(sessao.execute(consulta))
    assert len(antes) == 3 and all(linha.em_exercicio for linha in antes)
    fontes_antes = contar(sessao, Fonte)

    proxima = 3 if modo == "salto" else 2
    roteiro["/deputados"] = {
        "dados": pessoas[:1],
        "links": [
            {"rel": "next", "href": BASE + f"/deputados?pagina={proxima}"},
            {"rel": "last", "href": BASE + "/deputados?pagina=3"},
        ],
    }

    def interceptar(req):
        if req.url.path.endswith("/deputados") and "pagina" in req.url.params:
            return httpx2.Response(200, json={"dados": [pessoas[proxima - 1]], "links": []})

    resumo, chamadas = executar(sessao, roteiro, interceptar=interceptar, saida_esperada=1)
    assert not resumo.completa and resumo.erro
    assert resumo.parlamentares == resumo.mandatos == resumo.fontes == 0
    assert set(sessao.execute(consulta)) == antes
    assert contar(sessao, Fonte) == fontes_antes
    assert not any("/deputados/" in url or "/votacoes" in url for url in chamadas)


@pytest.mark.parametrize("modo", ["salto", "fim_antecipado"])
def test_votos_incompletos_com_lacuna_preservam_votacao(sessao, roteiro, modo):
    resumo, _ = executar(sessao, roteiro)
    assert resumo.completa and resumo.votos == 429
    consulta = select(Voto.parlamentar_id, Voto.valor, Voto.fonte_id)
    votos_antes = set(sessao.execute(consulta))
    consulta_votacao = select(Votacao.descricao, Votacao.fonte_id).where(
        Votacao.id_externo == "2236186-60"
    )
    votacao_antes = sessao.execute(consulta_votacao).one()
    roteiro["/votacoes/2236186-60"]["dados"]["descricao"] = "Descricao corrigida de teste"
    caminho = "/votacoes/2236186-60/votos"
    votos = roteiro[caminho]["dados"]
    proxima = 3 if modo == "salto" else 2
    roteiro[caminho] = {
        "dados": votos[:1],
        "links": [
            {"rel": "next", "href": BASE + caminho + f"?pagina={proxima}"},
            {"rel": "last", "href": BASE + caminho + "?pagina=3"},
        ],
    }

    def interceptar(req):
        if req.url.path.endswith(caminho) and "pagina" in req.url.params:
            return httpx2.Response(200, json={"dados": [votos[proxima - 1]], "links": []})

    resumo, _ = executar(sessao, roteiro, interceptar=interceptar, saida_esperada=1)
    assert not resumo.completa and resumo.falhas_votacoes == ["2236186-60"]
    assert resumo.votacoes == 1 and resumo.votos == 0
    assert set(sessao.execute(consulta)) == votos_antes
    assert sessao.execute(consulta_votacao).one() == votacao_antes
    assert (
        sessao.scalar(
            select(func.count())
            .select_from(Fonte)
            .where(Fonte.trecho == "Descricao corrigida de teste")
        )
        == 0
    )


def test_falha_na_recoleta_nao_apaga_votos_anteriores(sessao, roteiro):
    executar(sessao, roteiro)
    roteiro["/votacoes/2236186-60/votos"] = 403
    resumo, _ = executar(sessao, roteiro)
    assert not resumo.completa and contar(sessao, Voto) == 429


@pytest.mark.parametrize("status", [404, 410])
@pytest.mark.parametrize("sufixo", ["", "/votos"])
def test_votacao_indisponivel_na_fonte_nao_e_falha_da_execucao(sessao, roteiro, status, sufixo):
    roteiro["/votacoes/2637478-26" + sufixo] = status
    resumo, _ = executar(sessao, roteiro)
    assert resumo.completa and resumo.falhas_votacoes == []
    assert resumo.indisponiveis_na_fonte == ["2637478-26"]
    assert contar(sessao, Votacao) == 1


def test_tres_indisponiveis_na_fonte_nao_param_a_execucao(sessao, roteiro):
    modelo = roteiro["/votacoes"]["dados"][0]
    roteiro["/votacoes"]["dados"] = [dict(modelo, id=f"1-{i}") for i in range(1, 4)] + [modelo]
    for i in range(1, 4):
        roteiro[f"/votacoes/1-{i}"] = 404
    resumo, chamadas = executar(sessao, roteiro)
    assert resumo.completa and resumo.votacoes == 1
    assert resumo.indisponiveis_na_fonte == ["1-1", "1-2", "1-3"]
    assert any(x.endswith("/votacoes/2637478-26") for x in chamadas)


def test_proposicao_404_continua_sendo_falha_inesperada(sessao, roteiro):
    roteiro["/proposicoes/2637478"] = 404
    resumo, _ = executar(sessao, roteiro)
    assert not resumo.completa and resumo.falhas_votacoes == ["2637478-26"]
    assert resumo.indisponiveis_na_fonte == []


def test_quem_sai_da_lista_perde_exercicio_sem_perder_votos(sessao, roteiro):
    executar(sessao, roteiro)
    novo = deepcopy(roteiro["/deputados"]["dados"][0])
    novo.update(id=900001, nome="Pessoa inventada")
    roteiro["/deputados"]["dados"] = [novo]
    detalhe = deepcopy(roteiro["/deputados/178843"])
    detalhe["dados"]["id"] = 900001
    roteiro["/deputados/900001"] = detalhe
    resumo, _ = executar(sessao, roteiro)
    assert resumo.completa
    atuais = sessao.scalars(select(Mandato).where(Mandato.em_exercicio.is_(True))).all()
    assert len(atuais) == 1 and atuais[0].parlamentar.id_externo == 900001
    assert contar(sessao, Voto) == 429


def test_votos_malformados_nao_viram_lista_vazia(sessao, roteiro):
    executar(sessao, roteiro)
    roteiro["/votacoes/2236186-60/votos"] = {"dados": None, "links": []}
    resumo, _ = executar(sessao, roteiro)
    assert not resumo.completa and resumo.falhas_votacoes == ["2236186-60"]
    assert contar(sessao, Voto) == 429
