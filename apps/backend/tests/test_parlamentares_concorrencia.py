from contextlib import contextmanager
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, event
from sqlalchemy.orm import Session

from mandatometro import db
from mandatometro.api.app import app
from mandatometro.coleta.persistencia import sincronizar_votos
from mandatometro.coleta.tipos import DadosVoto
from mandatometro.db.modelos import Fonte, Parlamentar, Votacao


@pytest.fixture(params=["camara", "senado"])
def coleta_entre_consultas(engine_de_teste, monkeypatch, request):
    banco = engine_de_teste
    monkeypatch.setattr(db, "engine", lambda: banco)
    with Session(banco) as cadastro, cadastro.begin():
        fonte = Fonte(url="https://example.com/votacao-ficticia")
        pessoas = [
            Parlamentar(casa=request.param, id_externo=930000 + i, nome=f"Pessoa {i}", fonte=fonte)
            for i in range(3)
        ]
        votacao = Votacao(
            casa=request.param,
            id_externo="93001",
            data=date(2026, 11, 24),
            descricao="Votação fictícia.",
            resultado="aprovada",
            fonte=fonte,
        )
        cadastro.add_all([*pessoas, votacao])
        cadastro.flush()
        ids = [p.id for p in pessoas]
        votacao_id, fonte_id = votacao.id, fonte.id

    def gravar(valor_da_pessoa):
        votos = [
            DadosVoto(parlamentar_id, valor, None, "PFA", None, fonte_id)
            for parlamentar_id, valor in zip(ids, (valor_da_pessoa, "sim", "sim"), strict=True)
            if valor is not None
        ]
        with Session(banco) as escrita, escrita.begin():
            sincronizar_votos(escrita, escrita.get(Votacao, votacao_id), votos)

    @contextmanager
    def intercalar(consulta, antes, depois):
        gravar(antes)

        # A segunda sessão confirma a coleta antes da próxima consulta da API.
        def coletar(_conexao, _cursor, sql, _parametros, _contexto, _lote):
            if consulta in sql:
                gravar(depois)

        event.listen(banco, "after_cursor_execute", coletar)
        try:
            yield
        finally:
            event.remove(banco, "after_cursor_execute", coletar)

    try:
        with TestClient(app) as cliente:
            yield cliente, f"/parlamentares/{ids[0]}", intercalar
    finally:
        with banco.begin() as conexao:
            conexao.execute(delete(Votacao).where(Votacao.id == votacao_id))
            conexao.execute(delete(Parlamentar).where(Parlamentar.id.in_(ids)))
            conexao.execute(delete(Fonte).where(Fonte.id == fonte_id))


def _total_e_votos(resposta):
    pagina = resposta.json()
    return pagina["total"], [
        (v["valor"], v["maioria_do_partido"], v["com_o_partido"]) for v in pagina["votos"]
    ]


@pytest.mark.parametrize(
    ("filtro", "antes", "depois"), [(False, "nao", "sim"), (True, "sim", "nao")]
)
def test_filtro_e_pagina_leem_os_mesmos_votos_durante_a_coleta(
    coleta_entre_consultas, filtro, antes, depois
):
    cliente, rota, intercalar = coleta_entre_consultas
    parametros = {"com_o_partido": filtro, "limite": 1}
    with intercalar("AS valor_colega", antes, depois):
        resposta = cliente.get(f"{rota}/votos", params=parametros)
    seguinte = cliente.get(f"{rota}/votos", params=parametros)

    assert resposta.status_code == seguinte.status_code == 200
    assert _total_e_votos(resposta) == (1, [(antes, "sim", filtro)])
    assert _total_e_votos(seguinte) == (0, [])


def test_total_e_pagina_sem_filtro_leem_os_mesmos_votos_durante_a_coleta(coleta_entre_consultas):
    cliente, rota, intercalar = coleta_entre_consultas
    with intercalar("SELECT count(*)", "nao", None):
        resposta = cliente.get(f"{rota}/votos")
    seguinte = cliente.get(f"{rota}/votos")

    assert resposta.status_code == seguinte.status_code == 200
    assert _total_e_votos(resposta) == (1, [("nao", "sim", False)])
    assert _total_e_votos(seguinte) == (0, [])


def test_contagens_do_detalhe_leem_os_mesmos_votos_durante_a_coleta(coleta_entre_consultas):
    cliente, rota, intercalar = coleta_entre_consultas
    with intercalar("GROUP BY voto.valor", "nao", "sim"):
        resposta = cliente.get(rota)
    seguinte = cliente.get(rota)

    assert resposta.status_code == seguinte.status_code == 200
    detalhe = resposta.json()
    assert detalhe["contagem_votos"]["nao"] == 1
    assert detalhe["com_o_partido"] == {"comparaveis": 1, "com_o_partido": 0, "contra": 1}
    atualizado = seguinte.json()
    assert atualizado["contagem_votos"]["sim"] == 1
    assert atualizado["com_o_partido"] == {"comparaveis": 1, "com_o_partido": 1, "contra": 0}
