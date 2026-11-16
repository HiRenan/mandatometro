"""O conector inteiro contra respostas gravadas, num banco isolado, sem rede."""

import json
from copy import deepcopy
from datetime import date
from pathlib import Path

import httpx2
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

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
    dados["/votacoes"] = {
        "dados": [deepcopy(dados[f"/votacoes/{i}"]["dados"]) for i in ("2637478-26", "2236186-60")],
        "links": [],
    }
    return dados


def executar(sessao, roteiro, *, inicio=INICIO, fim=FIM, interceptar=None):
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
        resumo = coletar(
            inicio,
            fim,
            http=http,
            criar_sessao=lambda: Session(bind=conexao, join_transaction_mode="create_savepoint"),
        )
    sessao.expire_all()
    return resumo, caminhos


def contar(sessao, modelo):
    return sessao.scalar(select(func.count()).select_from(modelo))


def test_coleta_nominal_simbolica_e_repete_sem_duplicar(sessao, roteiro):
    primeiro, chamadas = executar(sessao, roteiro)
    assert primeiro.completa
    assert (primeiro.votacoes, primeiro.proposicoes, primeiro.votos) == (2, 2, 429)
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


def test_paginacao_e_divisao_na_virada_do_ano(sessao, roteiro):
    periodos = []
    paginas = []

    def interceptar(req):
        if req.url.path.endswith("/votacoes"):
            periodos.append((req.url.params["dataInicio"], req.url.params["dataFim"]))
            paginas.append(req.url.params.get("pagina", "1"))
            links = []
            if "pagina" not in req.url.params:
                links = [{"rel": "next", "href": str(req.url.copy_set_param("pagina", 2))}]
            return httpx2.Response(200, json={"dados": [], "links": links})

    resumo, _ = executar(
        sessao, roteiro, inicio=date(2025, 12, 30), fim=date(2026, 1, 2), interceptar=interceptar
    )
    assert resumo.completa and resumo.votacoes == 0
    assert set(periodos) == {("2025-12-30", "2025-12-31"), ("2026-01-01", "2026-01-02")}
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
