"""As migrations sobem do zero, descem até o começo e batem com os modelos."""

from sqlalchemy import Engine, inspect, text

TABELAS_DO_MVP = {
    "fonte",
    "parlamentar",
    "mandato",
    "proposicao",
    "votacao",
    "votacao_proposicao",
    "voto",
}


def _tabelas(engine: Engine) -> set[str]:
    # A alembic_version fica no banco depois do downgrade, vazia: é do próprio Alembic.
    return set(inspect(engine).get_table_names()) - {"alembic_version"}


def _tem_a_extensao_vector(engine: Engine) -> bool:
    with engine.connect() as conexao:
        consulta = text("select 1 from pg_extension where extname = 'vector'")
        return conexao.execute(consulta).first() is not None


def test_as_migrations_sobem_do_zero_descem_e_batem_com_os_modelos(engine_de_teste, alembic):
    alembic("downgrade", "base")
    assert _tabelas(engine_de_teste) == set()
    assert not _tem_a_extensao_vector(engine_de_teste)

    alembic("upgrade", "head")
    assert _tabelas(engine_de_teste) == TABELAS_DO_MVP
    assert _tem_a_extensao_vector(engine_de_teste)
    # O mesmo que `alembic check`: falha se um modelo mudou sem migration.
    alembic("check")

    alembic("downgrade", "base")
    assert _tabelas(engine_de_teste) == set()
    assert not _tem_a_extensao_vector(engine_de_teste)

    # Deixa o banco pronto para os outros testes.
    alembic("upgrade", "head")
