"""A cota é compartilhada entre conexões, inclusive quando a inscrição falha."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from mandatometro.avisos.limite import LimiteAtingido, consumir_cota

AGORA = datetime(2026, 11, 16, 14, 0, 12, tzinfo=UTC)


@pytest.fixture
def banco(engine_de_teste):
    with engine_de_teste.begin() as conexao:
        conexao.execute(text("delete from limite_inscricao"))
    yield engine_de_teste
    with engine_de_teste.begin() as conexao:
        conexao.execute(text("delete from limite_inscricao"))


def test_o_limite_so_guarda_minuto_e_quantidade(banco):
    assert {c["name"] for c in inspect(banco).get_columns("limite_inscricao")} == {
        "janela",
        "quantidade",
    }
    consumir_cota(banco, 2, agora=AGORA)
    consumir_cota(banco, 2, agora=AGORA)
    with pytest.raises(LimiteAtingido) as erro:
        consumir_cota(banco, 2, agora=AGORA)
    assert erro.value.tentar_em == 48
    with banco.connect() as conexao:
        assert conexao.execute(text("select quantidade from limite_inscricao")).scalar_one() == 2


def test_a_cota_nao_depende_da_transacao_da_inscricao(banco):
    with banco.connect() as conexao:
        transacao = conexao.begin()
        consumir_cota(banco, 1, agora=AGORA)
        transacao.rollback()
    with pytest.raises(LimiteAtingido):
        consumir_cota(banco, 1, agora=AGORA)


def test_virar_o_minuto_libera_a_cota_e_limpa_janelas_antigas(banco):
    consumir_cota(banco, 1, agora=AGORA - timedelta(minutes=3))
    consumir_cota(banco, 1, agora=AGORA)
    consumir_cota(banco, 1, agora=AGORA + timedelta(minutes=1))
    with banco.connect() as conexao:
        assert conexao.execute(text("select count(*) from limite_inscricao")).scalar_one() == 2


def test_conexoes_concorrentes_respeitam_o_mesmo_teto(banco):
    def tentar(_):
        try:
            consumir_cota(banco, 7, agora=AGORA)
            return True
        except LimiteAtingido:
            return False

    with ThreadPoolExecutor(max_workers=8) as executor:
        assert sum(executor.map(tentar, range(35))) == 7


def test_retry_after_arredonda_para_cima(banco):
    agora = AGORA.replace(second=59, microsecond=900_000)
    consumir_cota(banco, 1, agora=agora)
    with pytest.raises(LimiteAtingido) as erro:
        consumir_cota(banco, 1, agora=agora)
    assert erro.value.tentar_em == 1


def test_o_relogio_real_vem_do_banco(banco):
    consumir_cota(banco, 30)
    with banco.connect() as conexao:
        assert conexao.execute(
            text("select janela = date_trunc('minute', now()) from limite_inscricao")
        ).scalar_one()


@pytest.mark.parametrize(("segundo", "quantidade"), [(0, 0), (0, -1), (1, 1)])
def test_banco_recusa_contagem_invalida_e_janela_fora_do_minuto(banco, segundo, quantidade):
    with pytest.raises(IntegrityError), banco.begin() as conexao:
        conexao.execute(
            text("insert into limite_inscricao (janela, quantidade) values (:janela, :quantidade)"),
            {"janela": AGORA.replace(second=segundo), "quantidade": quantidade},
        )
