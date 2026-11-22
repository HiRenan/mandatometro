import json
from contextlib import contextmanager, nullcontext
from pathlib import Path

import httpx2
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.cli import main
from mandatometro.coleta import camara, senado
from mandatometro.coleta.http import ClienteHttp
from mandatometro.db.modelos import Fonte, Proposicao, ProposicaoTema

FIXTURES = Path(__file__).parent / "fixtures/temas"


def _ler(nome):
    return json.loads((FIXTURES / nome).read_text(encoding="utf-8"))


@pytest.fixture
def abrir(sessao):
    conexao = sessao.connection()
    return lambda: Session(bind=conexao, join_transaction_mode="create_savepoint")


@contextmanager
def _cliente(base, respostas):
    chamadas = []
    prefixo = httpx2.URL(base).path

    def atender(req):
        if req.url.path == "/robots.txt":
            return httpx2.Response(404)
        caminho = req.url.path.removeprefix(prefixo)
        chamadas.append(caminho)
        resposta = respostas[caminho]
        if isinstance(resposta, int):
            return httpx2.Response(resposta)
        return httpx2.Response(200, json=resposta)

    with (
        httpx2.Client(transport=httpx2.MockTransport(atender)) as transporte,
        ClienteHttp(base, cliente=transporte, intervalo=0, tentativas=1) as http,
    ):
        yield http, chamadas


def _roteiro_camara():
    temas = _ler("respostas-camara.json")
    deputado = {"id": 1, "nome": "Pessoa Inventada", "siglaUf": "DF", "idLegislatura": 57}
    status = {**deputado, "situacao": "Exercício", "condicaoEleitoral": "Titular"}
    roteiro = {
        "/deputados": {"dados": [deputado], "links": []},
        "/deputados/1": {"dados": {"id": 1, "ultimoStatus": status}},
        "/votacoes": {"dados": [], "links": []},
    }
    for id_externo, proposicoes in [("100-1", [101, 102, 103, 104]), ("100-2", [101])]:
        votacao = {
            "id": id_externo,
            "data": INICIO.isoformat(),
            "idOrgao": 180,
            "siglaOrgao": "PLEN",
            "descricao": "Votação fictícia.",
            "aprovacao": 1,
            "proposicoesAfetadas": [{"id": p} for p in proposicoes],
        }
        roteiro["/votacoes"]["dados"].append(votacao)
        roteiro[f"/votacoes/{id_externo}"] = {"dados": votacao}
        roteiro[f"/votacoes/{id_externo}/votos"] = {"dados": [], "links": []}
    for codigo in range(101, 105):
        roteiro[f"/proposicoes/{codigo}"] = {
            "dados": {
                "id": codigo,
                "siglaTipo": "PL",
                "numero": codigo,
                "ano": 2026,
                "ementa": "Ementa fictícia.",
                "urlInteiroTeor": None,
            }
        }
    roteiro.update(
        {
            "/proposicoes/101/temas": temas["multiplos"],
            "/proposicoes/102/temas": temas["vazia"],
            "/proposicoes/103/temas": temas["desconhecida"],
            "/proposicoes/104/temas": 503,
        }
    )
    return roteiro


def _temas_gravados(sessao):
    return sessao.execute(
        select(Proposicao.id_externo, ProposicaoTema.tema, ProposicaoTema.fonte_id)
        .join(ProposicaoTema)
        .order_by(Proposicao.id_externo, ProposicaoTema.tema)
    ).all()


def test_coleta_resolve_temas_distintos_e_preserva_votacoes_e_fontes(sessao, abrir):
    roteiro = _roteiro_camara()

    def coletar():
        with _cliente(camara.BASE, roteiro) as (http, chamadas):
            resumo = camara.coletar(INICIO, FIM, http=http, criar_sessao=abrir)
        assert resumo.completa and resumo.votacoes == 2
        assert chamadas.count("/proposicoes/101/temas") == 1
        return resumo

    resumo = coletar()
    assert resumo.temas.proposicoes_com_tema == 1
    assert resumo.temas.proposicoes_sem_classificacao == 1
    assert resumo.temas.classificacoes_sem_tema == 1
    assert resumo.temas.falhas_consulta == 1
    gravados = _temas_gravados(sessao)
    assert [(codigo, tema) for codigo, tema, _ in gravados] == [
        (101, "ciencia_tecnologia"),
        (101, "saude"),
    ]
    fonte_id = gravados[0].fonte_id
    assert {linha.fonte_id for linha in gravados} == {fonte_id}
    fonte = sessao.get(Fonte, fonte_id)
    assert fonte.url == f"{camara.BASE}/proposicoes/101/temas"
    assert fonte.trecho is None
    assert fonte_id != sessao.scalar(
        select(Proposicao.fonte_id).where(Proposicao.id_externo == 101)
    )

    roteiro["/proposicoes/101/temas"]["dados"].reverse()
    coletar()
    assert _temas_gravados(sessao) == gravados
    roteiro["/proposicoes/101/temas"] = 410
    assert coletar().temas.falhas_consulta == 2
    assert _temas_gravados(sessao) == gravados

    roteiro["/proposicoes/101/temas"] = {"dados": None}
    assert coletar().temas.falhas_consulta == 2
    assert _temas_gravados(sessao) == gravados

    roteiro["/proposicoes/101/temas"] = roteiro["/proposicoes/102/temas"]
    assert coletar().temas.proposicoes_sem_classificacao == 2
    assert _temas_gravados(sessao) == []


@pytest.mark.parametrize(
    "modulo, caminho, resposta, temas, sem_tema",
    [
        (camara, "/proposicoes/101/temas", "camara", {"saude", "ciencia_tecnologia"}, 0),
        (senado, "/processo/101", "senado", {"saude", "previdencia_assistencia"}, 1),
    ],
)
def test_cli_so_preenche_temas_na_janela(
    dados, sessao, abrir, monkeypatch, capsys, modulo, caminho, resposta, temas, sem_tema
):
    voto = dados(101, casa=resposta)
    repetida = dados(103, casa=resposta, proposicoes=voto.proposicoes)
    anterior = dados(104, casa=resposta, dia=8)
    fonte_voto, fonte_repetida, fonte_anterior = (
        voto.fonte_id,
        repetida.fonte_id,
        anterior.fonte_id,
    )
    fonte_prop = voto.proposicoes[0].fonte_id
    payload = (
        _ler("respostas-camara.json")["multiplos"]
        if modulo is camara
        else _ler("processo-senado.json")
    )
    args = [
        "coleta",
        resposta,
        "--somente-temas",
        "--inicio",
        INICIO.isoformat(),
        "--fim",
        FIM.isoformat(),
    ]
    monkeypatch.setattr(modulo, "sessao_do_banco" if modulo is camara else "sessao", abrir)
    with _cliente(modulo.BASE, {caminho: payload}) as (http, chamadas):
        monkeypatch.setattr(modulo, "ClienteHttp", lambda _: nullcontext(http))
        assert main(args) == 0
        assert chamadas == [caminho]
        resumo = json.loads(capsys.readouterr().out)
        assert resumo["fontes"] == 1
        assert resumo["temas"]["proposicoes_com_tema"] == 1
        assert resumo["temas"]["classificacoes_sem_tema"] == sem_tema
        assert main(args) == 0
        assert chamadas == [caminho]

    sessao.expire_all()
    assert (voto.fonte_id, repetida.fonte_id, anterior.fonte_id) == (
        fonte_voto,
        fonte_repetida,
        fonte_anterior,
    )
    assert voto.proposicoes[0].fonte_id == fonte_prop
    gravados = _temas_gravados(sessao)
    assert {linha.id_externo for linha in gravados} == {101}
    assert {linha.tema for linha in gravados} == temas
    ids_fontes = {linha.fonte_id for linha in gravados}
    assert len(ids_fontes) == 1
    fonte = sessao.get(Fonte, ids_fontes.pop())
    assert fonte.url == modulo.BASE + caminho
    assert fonte.trecho is None
