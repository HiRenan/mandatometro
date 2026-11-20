"""Aceitação, retomada e concorrência com PostgreSQL real e provedor fictício."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from mandatometro.avisos import envio
from mandatometro.avisos.inscricao import enviar_ultima_edicao, preparar_inscricao, sair
from mandatometro.avisos.resend import EnvioIndisponivel
from mandatometro.db.modelos import Edicao, Fonte, Inscrito, ItemEdicao


@pytest.fixture
def banco_envio(engine_de_teste):
    edicoes, inscritos = [], []
    with Session(engine_de_teste, expire_on_commit=False) as sessao, sessao.begin():
        fonte = Fonte(
            url="https://www.camara.leg.br/ficticia",
            coletado_em=datetime(2026, 11, 14, tzinfo=UTC),
        )
        sessao.add(fonte)

    def publicar(dias=0):
        with Session(engine_de_teste, expire_on_commit=False) as sessao, sessao.begin():
            edicao = Edicao(
                titulo="Edição de teste",
                inicio=date(2026, 11, 9),
                fim=date(2026, 11, 15),
                estado="publicada",
                publicada_em=datetime(2026, 11, 15, tzinfo=UTC) + timedelta(days=dias),
                itens=[
                    ItemEdicao(ordem=1, titulo="Item", texto="Texto fictício.", fonte_id=fonte.id)
                ],
            )
            sessao.add(edicao)
            sessao.flush()
            edicoes.append(edicao.id)
        return edicao

    def inscrever():
        with Session(engine_de_teste, expire_on_commit=False) as sessao, sessao.begin():
            inscrito = Inscrito(email=f"pessoa{len(inscritos)}@example.com")
            sessao.add(inscrito)
            sessao.flush()
            inscritos.append(inscrito.id)
        return inscrito

    yield engine_de_teste, publicar, inscrever
    with engine_de_teste.begin() as conexao:
        conexao.execute(delete(Inscrito).where(Inscrito.id.in_(inscritos)))
        conexao.execute(delete(ItemEdicao).where(ItemEdicao.edicao_id.in_(edicoes)))
        conexao.execute(delete(Edicao).where(Edicao.id.in_(edicoes)))
        conexao.execute(delete(Fonte).where(Fonte.id == fonte.id))


class ProvedorFicticio:
    configurado = True

    def __init__(self, ao_enviar=None):
        self.chamadas = []
        self.aceitacoes = set()
        self.ao_enviar = ao_enviar

    async def enviar(self, destinatario, mensagem, idempotencia):
        self.chamadas.append((idempotencia, mensagem))
        self.aceitacoes.add(idempotencia)
        if self.ao_enviar:
            self.ao_enviar()


def rodar(banco, provedor, **kwargs):
    async def sem_espera(_):
        pass

    return asyncio.run(
        envio.enviar_edicao(
            banco,
            provedor,
            app_base_url="https://site.example.com",
            api_url="https://api.example.com",
            dormir=sem_espera,
            **kwargs,
        )
    )


def test_marcador_so_avanca_por_publicacao_inclusive_concorrente(banco_envio):
    banco, publicar, inscrever = banco_envio
    recente = publicar(dias=7)
    antiga_com_id_maior = publicar()
    inscrito = inscrever()
    alvos = [recente, antiga_com_id_maior] * 5
    with ThreadPoolExecutor(max_workers=4) as executor:
        list(executor.map(lambda e: envio._confirmar(banco, inscrito.id, e), alvos))
    with Session(banco) as sessao:
        assert sessao.get(Inscrito, inscrito.id).ultima_edicao_enviada_id == recente.id
    assert envio._destinatario(banco, inscrito.id, antiga_com_id_maior).atualizado
    empate = publicar(dias=7)
    envio._confirmar(banco, inscrito.id, empate)
    envio._confirmar(banco, inscrito.id, recente)
    with Session(banco) as sessao:
        assert sessao.get(Inscrito, inscrito.id).ultima_edicao_enviada_id == empate.id


def test_percorre_mais_de_uma_pagina_sem_repetir_e_fixa_entradas(banco_envio):
    banco, publicar, inscrever = banco_envio
    edicao = publicar()
    for _ in range(105):
        inscrever()
    novos = []

    def entrar():
        if not novos:
            novos.append(inscrever())

    provedor = ProvedorFicticio(entrar)
    resumo, codigo = rodar(banco, provedor)
    assert codigo == 0 and resumo["aceitos_nesta_execucao"] == 105
    assert len(provedor.aceitacoes) == 105
    with Session(banco) as sessao:
        assert sessao.get(Inscrito, novos[0].id).ultima_edicao_enviada_id is None
    resumo, codigo = rodar(banco, provedor, edicao_id=edicao.id)
    assert codigo == 0 and resumo["aceitos_nesta_execucao"] == 1
    assert len(provedor.aceitacoes) == 106
    assert rodar(banco, provedor)[0]["aceitos_nesta_execucao"] == 0


def test_saida_antes_do_http_pula_e_saida_em_voo_nao_recria(banco_envio):
    banco, publicar, inscrever = banco_envio
    publicar()
    primeiro, segundo = inscrever(), inscrever()

    def sair_durante_envio():
        sair(banco, primeiro.codigo_saida)
        sair(banco, segundo.codigo_saida)

    provedor = ProvedorFicticio(sair_durante_envio)
    resumo, codigo = rodar(banco, provedor)
    assert codigo == 0 and resumo["aceitos_nesta_execucao"] == 1
    assert resumo["removidos"] == 1 and len(provedor.chamadas) == 1
    with Session(banco) as sessao:
        assert sessao.scalar(select(Inscrito.id)) is None


def test_queda_entre_aceite_e_commit_repete_chave_e_corpo(banco_envio, monkeypatch, caplog):
    banco, publicar, inscrever = banco_envio
    edicao = publicar()
    inscrito = inscrever()
    confirmar = envio._confirmar

    def falhar(*_):
        raise OperationalError("SQL", {}, Exception("pessoa@example.com"))

    monkeypatch.setattr(envio, "_confirmar", falhar)
    provedor = ProvedorFicticio()
    resumo, codigo = rodar(banco, provedor)
    assert codigo == 1 and resumo["faltam"] == 1
    with Session(banco) as sessao:
        assert sessao.get(Inscrito, inscrito.id).ultima_edicao_enviada_id is None
    monkeypatch.setattr(envio, "_confirmar", confirmar)
    assert rodar(banco, provedor)[1] == 0
    assert len(provedor.chamadas) == 2 and len(provedor.aceitacoes) == 1
    assert provedor.chamadas[0] == provedor.chamadas[1]
    assert provedor.chamadas[0][0] == f"inscricao/{inscrito.id}/edicao/{edicao.id}"
    assert "pessoa@example.com" not in caplog.text


def test_simular_nao_muda_inscrito_e_desde_nao_reenvia_antiga(banco_envio):
    banco, publicar, inscrever = banco_envio
    publicar()
    inscrito = inscrever()
    provedor = ProvedorFicticio()
    resumo, codigo = rodar(banco, provedor, simular=True)
    assert codigo == 0 and resumo["faltam"] == 1
    assert not provedor.chamadas
    with Session(banco) as sessao:
        assert sessao.get(Inscrito, inscrito.id).ultima_edicao_enviada_id is None
    resumo, codigo = rodar(banco, provedor, publicada_desde=datetime(2026, 11, 16, tzinfo=UTC))
    assert codigo == 0 and resumo["edicao_id"] is None
    assert not provedor.chamadas


def test_inscricao_durante_comando_usa_mesma_chave_corpo_e_marco(banco_envio):
    banco, publicar, inscrever = banco_envio
    edicao, inscrito = publicar(), inscrever()
    preparada = preparar_inscricao(banco, inscrito.email)

    async def concorrer():
        entrou, liberar = asyncio.Event(), asyncio.Event()

        class Concorrente(ProvedorFicticio):
            async def enviar(self, destinatario, mensagem, idempotencia):
                self.chamadas.append((idempotencia, mensagem))
                if entrou.is_set():
                    raise EnvioIndisponivel("concorrente")
                entrou.set()
                await liberar.wait()
                self.aceitacoes.add(idempotencia)

        provedor = Concorrente()
        opcoes = {"app_base_url": "https://site.example.com", "api_url": "https://api.example.com"}
        tarefa = asyncio.create_task(envio.enviar_edicao(banco, provedor, **opcoes))
        try:
            await asyncio.wait_for(entrou.wait(), timeout=5)
            assert (
                await enviar_ultima_edicao(preparada, provedor, banco=banco, **opcoes)
                == "envio_indisponivel"
            )
        finally:
            liberar.set()
        resumo, codigo = await tarefa
        assert codigo == 0 and resumo["faltam"] == 0
        assert provedor.chamadas[0] == provedor.chamadas[1]
        assert len(provedor.aceitacoes) == 1
        # Mesmo depois da janela de idempotência, o marcador dispensa outro HTTP.
        assert (
            await enviar_ultima_edicao(preparada, provedor, banco=banco, **opcoes)
            == "edicao_enviada"
        )
        assert len(provedor.chamadas) == 2

    asyncio.run(concorrer())
    with Session(banco) as sessao:
        assert sessao.get(Inscrito, inscrito.id).ultima_edicao_enviada_id == edicao.id
