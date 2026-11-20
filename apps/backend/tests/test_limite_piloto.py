"""Cota real compartilhada, sem identificadores e independente da gravação."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError

from mandatometro.db.modelos import LimiteInscricao, LimitePiloto
from mandatometro.piloto.limite import LimiteAtingido, consumir_cota

AGORA = datetime(2026, 11, 20, 14, 0, 12, tzinfo=UTC)


@pytest.fixture
def banco(engine_de_teste):
    def limpar():
        with engine_de_teste.begin() as conexao:
            conexao.execute(delete(LimitePiloto))

    limpar()
    yield engine_de_teste
    limpar()


def test_cota_commita_mesmo_se_transacao_externa_desfizer(banco):
    with banco.connect() as conexao:
        transacao = conexao.begin()
        consumir_cota(banco, 1, agora=AGORA)
        transacao.rollback()
    with pytest.raises(LimiteAtingido) as erro:
        consumir_cota(banco, 1, agora=AGORA)
    assert erro.value.tentar_em == 48
    with banco.connect() as conexao:
        assert conexao.scalar(select(LimitePiloto.quantidade)) == 1


def test_cota_concorrente_tem_um_teto_global(banco):
    def tentar(_):
        try:
            consumir_cota(banco, 7, agora=AGORA)
            return True
        except LimiteAtingido:
            return False

    with ThreadPoolExecutor(max_workers=8) as executor:
        assert sum(executor.map(tentar, range(35))) == 7


def test_virada_da_janela_libera_cota_e_remove_passado(banco):
    consumir_cota(banco, 1, agora=AGORA - timedelta(minutes=3))
    consumir_cota(banco, 1, agora=AGORA)
    consumir_cota(banco, 1, agora=AGORA + timedelta(minutes=1))
    with banco.connect() as conexao:
        assert set(conexao.scalars(select(LimitePiloto.janela))) == {
            AGORA.replace(second=0),
            (AGORA + timedelta(minutes=1)).replace(second=0),
        }


def test_retry_after_arredonda_para_cima(banco):
    agora = AGORA.replace(second=59, microsecond=900_000)
    consumir_cota(banco, 1, agora=agora)
    with pytest.raises(LimiteAtingido) as erro:
        consumir_cota(banco, 1, agora=agora)
    assert erro.value.tentar_em == 1


def test_relogio_do_banco_e_cota_independente_da_newsletter(banco):
    consulta = select(LimiteInscricao)
    minuto_do_banco = select(func.date_trunc("minute", func.clock_timestamp()))
    with banco.connect() as conexao:
        inscricoes_antes = set(conexao.execute(consulta))
        inicio = conexao.scalar(minuto_do_banco)
    consumir_cota(banco, 120)
    with banco.connect() as conexao:
        fim = conexao.scalar(minuto_do_banco)
        janela = conexao.scalars(select(LimitePiloto.janela)).one()
        inscricoes_depois = set(conexao.execute(consulta))
    assert inicio <= janela <= fim
    assert inscricoes_depois == inscricoes_antes


@pytest.mark.parametrize("segundo,quantidade", [(0, 0), (0, -1), (1, 1)])
def test_checks_no_banco(banco, segundo, quantidade):
    with pytest.raises(IntegrityError), banco.begin() as conexao:
        conexao.execute(
            LimitePiloto.__table__.insert().values(
                janela=AGORA.replace(second=segundo),
                quantidade=quantidade,
            )
        )
