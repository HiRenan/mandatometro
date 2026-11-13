"""As migrations sobem do zero, descem até o começo e batem com os modelos."""

from sqlalchemy import Connection, Engine, inspect, text

import mandatometro.db.modelos  # noqa: F401  (registra as tabelas no Base.metadata)
from mandatometro.db import Base

TABELAS_DO_MVP = {
    "fonte",
    "parlamentar",
    "mandato",
    "proposicao",
    "votacao",
    "votacao_proposicao",
    "voto",
    "edicao",
    "item_edicao",
    "inscrito",
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


def _checks_e_padroes(conexao: Connection, schema: str) -> dict[str, set[tuple[str, str]]]:
    """Os CHECKs e os valores padrão das tabelas de um schema, como o PostgreSQL os escreve."""
    checks = conexao.execute(
        text(
            "select c.conname, pg_get_constraintdef(c.oid) from pg_constraint c"
            " join pg_namespace n on n.oid = c.connamespace"
            " where n.nspname = :schema and c.contype = 'c'"
        ),
        {"schema": schema},
    )
    # Fora os contadores dos ids (nextval), que levam o nome do schema.
    padroes = conexao.execute(
        text(
            "select table_name || '.' || column_name, column_default"
            " from information_schema.columns"
            " where table_schema = :schema and column_default not like 'nextval(%'"
        ),
        {"schema": schema},
    )
    return {
        "checks": {tuple(linha) for linha in checks},
        "padroes": {tuple(linha) for linha in padroes},
    }


def test_os_checks_e_os_valores_padrao_batem_com_os_modelos(engine_de_teste):
    # O alembic check não compara CHECK nem valor padrão: um valor novo em VALORES_DE_VOTO passaria
    # sem migration. Aqui o PostgreSQL compara: cria as tabelas dos modelos num schema à parte e
    # confere com as das migrations. O rollback desfaz o schema.
    with engine_de_teste.connect() as conexao:
        das_migrations = _checks_e_padroes(conexao, "public")
        conexao.execute(text("create schema modelos"))
        conexao.execute(text("set local search_path to modelos"))
        Base.metadata.create_all(conexao)
        dos_modelos = _checks_e_padroes(conexao, "modelos")
        conexao.rollback()

    assert das_migrations["checks"]
    assert das_migrations == dos_modelos
