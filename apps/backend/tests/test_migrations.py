"""As migrations sobem do zero, descem até o começo e batem com os modelos."""

from uuid import uuid4

import pytest
from sqlalchemy import Connection, Engine, inspect, text
from sqlalchemy.exc import IntegrityError

import mandatometro.db.modelos  # noqa: F401  (registra as tabelas no Base.metadata)
from mandatometro.db import Base

TABELAS_DO_MVP = {
    "conta",
    "credencial_conta",
    "artigo_lido",
    "aviso_conta",
    "limite_conta",
    "fonte",
    "parlamentar",
    "mandato",
    "candidatura",
    "candidatura_patrimonio",
    "bem_declarado",
    "ipca_mensal",
    "proposicao",
    "proposicao_tema",
    "video_sessao",
    "votacao",
    "votacao_proposicao",
    "voto",
    "ato",
    "edicao",
    "item_edicao",
    "inscrito",
    "limite_inscricao",
    "tentativa_piloto",
    "limite_piloto",
    "visita",
    "limite_visita",
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

    alembic("upgrade", "0012")
    tabelas_0012 = _tabelas(engine_de_teste)
    assert "video_sessao" in tabelas_0012
    assert "candidatura" not in tabelas_0012
    alembic("upgrade", "0013")
    assert _tabelas(engine_de_teste) == tabelas_0012 | {"candidatura"}
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


def _checks_padroes_e_tamanhos(conexao: Connection, schema: str) -> dict[str, set[tuple]]:
    """Os CHECKs, os valores padrão e o tamanho das colunas de texto de um schema, como o
    PostgreSQL os escreve."""
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
    # Só as colunas com tamanho, como o String(2) da UF. A alembic_version (varchar(32)) só existe
    # no schema das migrations.
    tamanhos = conexao.execute(
        text(
            "select table_name || '.' || column_name, character_maximum_length"
            " from information_schema.columns"
            " where table_schema = :schema and character_maximum_length is not null"
            " and table_name <> 'alembic_version'"
        ),
        {"schema": schema},
    )
    return {
        "checks": {tuple(linha) for linha in checks},
        "padroes": {tuple(linha) for linha in padroes},
        "tamanhos": {tuple(linha) for linha in tamanhos},
    }


def test_os_checks_os_valores_padrao_e_os_tamanhos_batem_com_os_modelos(engine_de_teste):
    # O alembic check não compara CHECK nem valor padrão: um valor novo em VALORES_DE_VOTO passaria
    # sem migration. Também não vê o String(2) da UF virar String só no modelo. Aqui o PostgreSQL
    # compara: cria as tabelas dos modelos num schema à parte e confere com as das migrations. O
    # rollback desfaz o schema.
    with engine_de_teste.connect() as conexao:
        das_migrations = _checks_padroes_e_tamanhos(conexao, "public")
        conexao.execute(text("create schema modelos"))
        conexao.execute(text("set local search_path to modelos"))
        Base.metadata.create_all(conexao)
        dos_modelos = _checks_padroes_e_tamanhos(conexao, "modelos")
        conexao.rollback()

    assert das_migrations["checks"]
    assert das_migrations["tamanhos"]
    assert das_migrations == dos_modelos


def test_fatos_e_artigo_sao_opcionais_e_preservam_item_antigo(engine_de_teste, alembic):
    alembic("downgrade", "0004")
    with engine_de_teste.begin() as c:
        fonte = c.execute(
            text(
                "insert into fonte (url) values ('https://www.camara.leg.br/exemplo') returning id"
            )
        ).scalar_one()
        edicao = c.execute(
            text(
                "insert into edicao (titulo, inicio, fim)"
                " values ('Edicao ficticia', '2026-11-09', '2026-11-15') returning id"
            )
        ).scalar_one()
        item = c.execute(
            text(
                "insert into item_edicao (edicao_id, ordem, titulo, texto, fonte_id)"
                " values (:edicao, 1, 'Item ficticio', 'Texto preservado', :fonte) returning id"
            ),
            {"edicao": edicao, "fonte": fonte},
        ).scalar_one()
    try:
        alembic("upgrade", "head")
        colunas = {c["name"]: c for c in inspect(engine_de_teste).get_columns("item_edicao")}
        assert str(colunas["fatos"]["type"]) == "JSONB"
        assert colunas["fatos"]["nullable"] and colunas["artigo_caminho"]["nullable"]
        with engine_de_teste.connect() as c:
            registro = c.execute(
                text("select texto, fatos, artigo_caminho from item_edicao where id=:id"),
                {"id": item},
            ).one()
            assert registro == ("Texto preservado", None, None)
        alembic("downgrade", "0004")
        assert "fatos" not in {
            c["name"] for c in inspect(engine_de_teste).get_columns("item_edicao")
        }
    finally:
        alembic("upgrade", "head")
        with engine_de_teste.begin() as c:
            c.execute(text("delete from edicao where id=:id"), {"id": edicao})
            c.execute(text("delete from fonte where id=:id"), {"id": fonte})


def test_ultima_edicao_preserva_inscrito_antigo_e_codigo_anterior(engine_de_teste, alembic):
    alembic("downgrade", "0006")
    with engine_de_teste.begin() as c:
        antes = c.execute(
            text(
                "insert into inscrito (email) values ('migracao@example.com')"
                " returning id, codigo_saida, inscrito_em"
            )
        ).one()
    try:
        alembic("upgrade", "head")
        colunas = {c["name"]: c for c in inspect(engine_de_teste).get_columns("inscrito")}
        assert colunas["ultima_edicao_enviada_id"]["nullable"]
        with engine_de_teste.begin() as c:
            depois = c.execute(
                text(
                    "select id, codigo_saida, inscrito_em, ultima_edicao_enviada_id"
                    " from inscrito where id=:id"
                ),
                {"id": antes.id},
            ).one()
            assert tuple(depois) == (*antes, None)
            # O INSERT do código anterior continua válido durante a troca de versões.
            assert (
                c.execute(
                    text(
                        "insert into inscrito (email) values ('versao-anterior@example.com')"
                        " returning ultima_edicao_enviada_id"
                    )
                ).scalar_one()
                is None
            )
        alembic("downgrade", "0006")
        assert "ultima_edicao_enviada_id" not in {
            c["name"] for c in inspect(engine_de_teste).get_columns("inscrito")
        }
        with engine_de_teste.connect() as c:
            assert (
                c.execute(
                    text("select id, codigo_saida, inscrito_em from inscrito where id=:id"),
                    {"id": antes.id},
                ).one()
                == antes
            )
    finally:
        alembic("upgrade", "head")
        with engine_de_teste.begin() as c:
            c.execute(
                text(
                    "delete from inscrito where email in"
                    " ('migracao@example.com', 'versao-anterior@example.com')"
                )
            )


def test_papel_preserva_conta_e_insert_da_versao_anterior(engine_de_teste, alembic):
    antiga, nova = uuid4(), uuid4()
    inserir = text(
        "insert into conta (id, email, nome, senha_hash, termo, aceite_em, criada_em)"
        " values (:id, :email, 'Conta de teste', 'hash-ficticio', 'teste', now(), now())"
    )
    alembic("downgrade", "0009")
    try:
        with engine_de_teste.begin() as c:
            c.execute(inserir, {"id": antiga, "email": f"{antiga.hex}@example.com"})
        alembic("upgrade", "head")
        colunas = {
            coluna["name"]: coluna for coluna in inspect(engine_de_teste).get_columns("conta")
        }
        assert "papel" in colunas
        assert not colunas["papel"]["nullable"]
        with engine_de_teste.begin() as c:
            c.execute(inserir, {"id": nova, "email": f"{nova.hex}@example.com"})
            papeis = c.execute(
                text("select id, papel from conta where id in (:antiga, :nova)"),
                {"antiga": antiga, "nova": nova},
            )
            assert {id_conta: papel for id_conta, papel in papeis} == {
                antiga: "comum",
                nova: "comum",
            }
            with pytest.raises(IntegrityError) as erro, c.begin_nested():
                c.execute(
                    text("update conta set papel = 'desconhecido' where id = :id"), {"id": nova}
                )
            assert erro.value.orig.diag.constraint_name == "ck_conta_papel"
            c.execute(
                text("update conta set papel = 'administradora' where id = :id"), {"id": nova}
            )

        alembic("downgrade", "0009")
        assert "papel" not in {
            coluna["name"] for coluna in inspect(engine_de_teste).get_columns("conta")
        }
        with engine_de_teste.connect() as c:
            assert set(
                c.execute(
                    text("select id from conta where id in (:antiga, :nova)"),
                    {"antiga": antiga, "nova": nova},
                ).scalars()
            ) == {antiga, nova}
    finally:
        alembic("upgrade", "head")
        with engine_de_teste.begin() as c:
            c.execute(
                text("delete from conta where id in (:antiga, :nova)"),
                {"antiga": antiga, "nova": nova},
            )


def test_migration_dos_temas_preserva_votacao_e_proposicao_antigas(engine_de_teste, alembic):
    url_fonte = "https://dadosabertos.camara.leg.br/exemplo-migration-0014"
    inserir_tema = text(
        "insert into proposicao_tema (proposicao_id, tema, fonte_id) values (:prop, :tema, :fonte)"
    )
    ler_vinculo = text(
        "select pv.proposicao_id, pv.votacao_id, p.fonte_id, v.fonte_id"
        " from votacao_proposicao pv"
        " join proposicao p on p.id = pv.proposicao_id"
        " join votacao v on v.id = pv.votacao_id where pv.votacao_id = :voto"
    )

    alembic("downgrade", "0014-1")
    try:
        with engine_de_teste.begin() as c:
            fonte = c.execute(
                text("insert into fonte (url) values (:url) returning id"), {"url": url_fonte}
            ).scalar_one()
            prop = c.execute(
                text(
                    "insert into proposicao (casa, id_externo, sigla, numero, ano, fonte_id)"
                    " values ('camara', 611014, 'PL', 1, 2026, :fonte) returning id"
                ),
                {"fonte": fonte},
            ).scalar_one()
            voto = c.execute(
                text(
                    "insert into votacao (casa, id_externo, data, descricao, resultado, fonte_id)"
                    " values ('camara', '611014-1', '2026-11-14', 'Votação fictícia.',"
                    " 'aprovada', :fonte) returning id"
                ),
                {"fonte": fonte},
            ).scalar_one()
            c.execute(
                text(
                    "insert into votacao_proposicao (proposicao_id, votacao_id)"
                    " values (:prop, :voto)"
                ),
                {"prop": prop, "voto": voto},
            )

        alembic("upgrade", "0014")
        with engine_de_teste.begin() as c:
            assert c.execute(ler_vinculo, {"voto": voto}).one() == (prop, voto, fonte, fonte)
            assert c.execute(text("select count(*) from proposicao_tema")).scalar_one() == 0
            c.execute(inserir_tema, {"prop": prop, "tema": "saude", "fonte": fonte})
            with pytest.raises(IntegrityError) as erro, c.begin_nested():
                c.execute(inserir_tema, {"prop": prop, "tema": "desconhecido", "fonte": fonte})
            assert erro.value.orig.diag.constraint_name == "ck_proposicao_tema_tema"

        alembic("downgrade", "0014-1")
        assert "proposicao_tema" not in _tabelas(engine_de_teste)
        with engine_de_teste.connect() as c:
            assert c.execute(ler_vinculo, {"voto": voto}).one() == (prop, voto, fonte, fonte)
    finally:
        alembic("upgrade", "head")
        with engine_de_teste.begin() as c:
            c.execute(text("delete from votacao where casa = 'camara' and id_externo = '611014-1'"))
            c.execute(text("delete from proposicao where casa = 'camara' and id_externo = 611014"))
            c.execute(text("delete from fonte where url = :url"), {"url": url_fonte})
