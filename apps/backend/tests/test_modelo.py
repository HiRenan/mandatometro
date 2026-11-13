"""As regras do modelo, no banco: as chaves, os conjuntos e o que não pode faltar.

Os dados são inventados: nenhum CPF, nome ou e-mail de verdade.
"""

import logging
from datetime import UTC, date, datetime
from uuid import UUID

import pytest
from sqlalchemy import delete, null, select
from sqlalchemy.exc import IntegrityError

from mandatometro.db.modelos import (
    CODIGOS_GRAVADOS,
    Edicao,
    Fonte,
    Inscrito,
    ItemEdicao,
    Mandato,
    Parlamentar,
    Proposicao,
    Votacao,
    Voto,
    normalizar_resultado,
    normalizar_voto,
)


def _fonte() -> Fonte:
    return Fonte(url="https://dadosabertos.camara.leg.br/api/v2/votacoes/1-1/votos")


def _parlamentar(id_externo: int = 1, casa: str = "camara") -> Parlamentar:
    return Parlamentar(
        casa=casa, id_externo=id_externo, nome="Parlamentar Inventado", fonte=_fonte()
    )


def _mandato(parlamentar: Parlamentar) -> Mandato:
    return Mandato(
        parlamentar=parlamentar, legislatura=57, uf="SC", em_exercicio=True, fonte=_fonte()
    )


def _proposicao(id_externo: int = 1, casa: str = "camara") -> Proposicao:
    return Proposicao(
        casa=casa, id_externo=id_externo, sigla="PL", numero=1, ano=2026, fonte=_fonte()
    )


def _votacao(casa: str = "camara") -> Votacao:
    return Votacao(
        casa=casa,
        id_externo="1-1",
        data=date(2026, 11, 5),
        descricao="Aprovado o projeto de exemplo.",
        resultado="aprovada",
        resultado_bruto="1",
        fonte=_fonte(),
    )


def _voto(votacao: Votacao, parlamentar: Parlamentar, valor: str, valor_bruto: str | None) -> Voto:
    return Voto(
        votacao=votacao,
        parlamentar=parlamentar,
        valor=valor,
        valor_bruto=valor_bruto,
        partido="PARTIDO",
        uf="SC",
        fonte=votacao.fonte,
    )


def _nao_grava(sessao, *objetos, regra: str) -> None:
    """O banco recusa os objetos, pela regra (constraint ou coluna) que o teste nomeia."""
    sessao.add_all(objetos)
    with pytest.raises(IntegrityError, match=regra):
        sessao.flush()
    sessao.rollback()


# --- As chaves e o que não pode faltar ---

# Parlamentar, proposição e votação se identificam pela Casa e pelo id que a Casa dá: é a chave do
# upsert da coleta (#10 e #11).
CADA_CASA_TEM_OS_SEUS_NUMEROS = pytest.mark.parametrize(
    "criar", [_parlamentar, _proposicao, _votacao], ids=["parlamentar", "proposicao", "votacao"]
)


@CADA_CASA_TEM_OS_SEUS_NUMEROS
def test_o_mesmo_id_vale_nas_duas_casas(sessao, criar):
    sessao.add_all([criar(casa="camara"), criar(casa="senado")])
    sessao.flush()


@CADA_CASA_TEM_OS_SEUS_NUMEROS
def test_o_id_nao_se_repete_na_mesma_casa(sessao, criar):
    dado = criar()
    _nao_grava(sessao, dado, criar(), regra=f"uq_{dado.__tablename__}_casa_id_externo")


@CADA_CASA_TEM_OS_SEUS_NUMEROS
def test_a_casa_e_camara_ou_senado(sessao, criar):
    dado = criar(casa="assembleia")
    _nao_grava(sessao, dado, regra=f"ck_{dado.__tablename__}_casa")


def test_o_parlamentar_tem_um_mandato_por_legislatura(sessao):
    parlamentar = _parlamentar()
    _nao_grava(
        sessao,
        _mandato(parlamentar),
        _mandato(parlamentar),
        regra="uq_mandato_parlamentar_id_legislatura",
    )


@pytest.mark.parametrize("campo", ["url", "coletado_em"])
def test_a_fonte_tem_o_endereco_e_a_data_da_coleta(sessao, campo):
    # O null(), e não o None: a coletado_em tem valor padrão, e o ORM tiraria o None do INSERT.
    fonte = _fonte()
    setattr(fonte, campo, null())
    _nao_grava(sessao, fonte, regra=f'"{campo}" of relation "fonte"')


@pytest.mark.parametrize(
    "criar",
    [
        _parlamentar,
        lambda: _mandato(_parlamentar()),
        _proposicao,
        _votacao,
        lambda: _voto(_votacao(), _parlamentar(), "sim", "Sim"),
    ],
    ids=["parlamentar", "mandato", "proposicao", "votacao", "voto"],
)
def test_dado_coletado_sem_fonte_nao_grava(sessao, criar):
    dado = criar()
    dado.fonte = None
    _nao_grava(sessao, dado, regra=f'"fonte_id" of relation "{dado.__tablename__}"')


def test_o_parlamentar_vota_uma_vez_por_votacao(sessao):
    votacao, parlamentar = _votacao(), _parlamentar()
    _nao_grava(
        sessao,
        _voto(votacao, parlamentar, "sim", "Sim"),
        _voto(votacao, parlamentar, "nao", "Não"),
        regra="pk_voto",
    )


def test_o_resultado_fica_no_conjunto(sessao):
    votacao = _votacao()
    votacao.resultado = "empatada"
    _nao_grava(sessao, votacao, regra="ck_votacao_resultado")


# --- O voto: o valor no conjunto e, só dos códigos da lista, o código como a Casa publica ---


def test_o_voto_fica_no_conjunto(sessao):
    _nao_grava(sessao, _voto(_votacao(), _parlamentar(), "talvez", "Sim"), regra='"ck_voto_valor"')


def test_a_licenca_saude_fica_igual_a_outra_ausencia(sessao):
    # Decisão do Renan (12/11/2026): nenhuma consulta separa a licença saúde de outra ausência.
    votacao = _votacao()
    for numero, codigo in enumerate(["LS", "AP"], start=1):
        sessao.add(_voto(votacao, _parlamentar(numero), *normalizar_voto(codigo)))
    sessao.flush()

    colunas = [coluna for coluna in Voto.__table__.columns if coluna.name != "parlamentar_id"]
    licenca_saude, atividade_parlamentar = sessao.execute(select(*colunas)).all()
    assert licenca_saude == atividade_parlamentar


def test_o_banco_guarda_os_codigos_da_lista(sessao):
    votacao = _votacao()
    for numero, codigo in enumerate(CODIGOS_GRAVADOS, start=1):
        sessao.add(_voto(votacao, _parlamentar(numero), *normalizar_voto(codigo)))
    sessao.flush()


@pytest.mark.parametrize("codigo", ["LS", "AP", "XYZ"])
def test_o_banco_recusa_codigo_fora_da_lista(sessao, codigo):
    # Nem um conector que pule o normalizar_voto grava a ausência ou um código novo cru.
    _nao_grava(
        sessao,
        _voto(_votacao(), _parlamentar(), "nao_votou", codigo),
        regra="ck_voto_valor_bruto",
    )


@pytest.mark.parametrize(
    ("bruto", "esperado"),
    [
        ("Sim", ("sim", "Sim")),
        ("Não", ("nao", "Não")),
        ("Abstenção", ("abstencao", "Abstenção")),
        ("Obstrução", ("obstrucao", "Obstrução")),
        ("Artigo 17", ("presidente", "Artigo 17")),
        ("Presidente (art. 51 RISF)", ("presidente", "Presidente (art. 51 RISF)")),
        # Presente, não registrou voto: o código fica, e a presença continua separada da ausência.
        ("P-NRV", ("nao_votou", "P-NRV")),
        # As ausências entram sem o código: a licença saúde fica igual à atividade parlamentar.
        ("AP", ("nao_votou", None)),
        ("LS", ("nao_votou", None)),
        # O espaço em volta sai: o Senado manda as siglas com espaço nos exercícios ("LS ", "LP ").
        ("LS ", ("nao_votou", None)),
        (" Sim", ("sim", "Sim")),
        # A ausência vale com qualquer caixa: um "ls" não vira outro, que a separaria das outras.
        ("ls", ("nao_votou", None)),
        ("Ls ", ("nao_votou", None)),
        # Um código novo pode ser outro motivo pessoal: entra como outro, sem o código.
        ("XYZ", ("outro", None)),
    ],
)
def test_normalizar_voto(bruto, esperado):
    assert normalizar_voto(bruto) == esperado


def test_o_aviso_do_codigo_novo_nao_leva_o_codigo(caplog):
    # O código no log, junto com o banco, apontaria quem o recebeu, e um código novo pode ser de
    # saúde. O registro inteiro fica sem ele: a mensagem, os argumentos e qualquer campo extra.
    # Em DEBUG, o teste vê todos os níveis: um registro a mais em INFO, com o código, falha.
    with caplog.at_level(logging.DEBUG, logger="mandatometro.db.modelos"):
        normalizar_voto("LSX")
    assert [registro.getMessage() for registro in caplog.records] == [
        "Código de voto desconhecido. Entra como outro, sem o código."
    ]
    assert "LSX" not in repr(vars(caplog.records[0]))


@pytest.mark.parametrize(
    ("bruto", "esperado"),
    [
        (1, ("aprovada", "1")),
        (0, ("rejeitada", "0")),
        ("A", ("aprovada", "A")),
        ("Z", ("outro", "Z")),
        (None, ("outro", None)),
    ],
)
def test_normalizar_resultado(bruto, esperado):
    assert normalizar_resultado(bruto) == esperado


# --- A edição da semana e os itens ---


def _edicao(**campos) -> Edicao:
    semana = {"titulo": "Edição de exemplo", "inicio": date(2026, 11, 2), "fim": date(2026, 11, 8)}
    return Edicao(**(semana | campos))


def _item(edicao: Edicao, ordem: int, fonte: Fonte | None) -> ItemEdicao:
    return ItemEdicao(
        edicao=edicao, ordem=ordem, titulo=f"Item {ordem}", texto="Texto de exemplo.", fonte=fonte
    )


def test_a_edicao_nasce_rascunho(sessao):
    edicao = _edicao()
    sessao.add(edicao)
    sessao.flush()
    assert (edicao.estado, edicao.publicada_em) == ("rascunho", None)


def test_o_estado_e_rascunho_ou_publicada(sessao):
    _nao_grava(sessao, _edicao(estado="revisada"), regra="ck_edicao_estado")


def test_so_a_edicao_publicada_tem_data_de_publicacao(sessao):
    publicada_em = datetime(2026, 11, 8, 12, tzinfo=UTC)
    sessao.add(_edicao(estado="publicada", publicada_em=publicada_em))
    sessao.flush()

    _nao_grava(sessao, _edicao(estado="publicada"), regra="ck_edicao_publicada_em")
    _nao_grava(sessao, _edicao(publicada_em=publicada_em), regra="ck_edicao_publicada_em")


def test_a_semana_da_edicao_nao_termina_antes_de_comecar(sessao):
    _nao_grava(
        sessao, _edicao(inicio=date(2026, 11, 8), fim=date(2026, 11, 2)), regra="ck_edicao_periodo"
    )


def test_item_da_edicao_sem_fonte_nao_grava(sessao):
    _nao_grava(sessao, _item(_edicao(), 1, fonte=None), regra='"fonte_id"')


def test_os_itens_vem_na_ordem_e_ela_nao_se_repete(sessao):
    edicao, fonte = _edicao(), _fonte()
    sessao.add_all([_item(edicao, 2, fonte), _item(edicao, 1, fonte)])
    sessao.flush()
    sessao.expire(edicao)
    assert [item.ordem for item in edicao.itens] == [1, 2]

    _nao_grava(sessao, _item(edicao, 1, fonte), regra="uq_item_edicao_edicao_id_ordem")


def test_apagar_a_edicao_apaga_os_itens(sessao):
    edicao = _edicao()
    sessao.add(_item(edicao, 1, _fonte()))
    sessao.flush()

    # Pelo banco (ON DELETE CASCADE), e não pela sessão, que apagaria os itens por conta própria.
    sessao.execute(delete(Edicao).where(Edicao.id == edicao.id))
    assert sessao.scalars(select(ItemEdicao)).all() == []


# --- Quem assina a newsletter ---


def test_o_inscrito_guarda_so_o_minimo():
    # A inscrição pede só o e-mail (AGENTS.md). Coluna nova aqui é dado pessoal novo: decida antes.
    assert set(Inscrito.__table__.columns.keys()) == {"id", "email", "codigo_saida", "inscrito_em"}


def test_o_email_nao_se_repete(sessao):
    _nao_grava(
        sessao,
        Inscrito(email="pessoa@example.com"),
        Inscrito(email="pessoa@example.com"),
        regra="uq_inscrito_email",
    )


def test_o_email_fica_em_minusculas(sessao):
    _nao_grava(sessao, Inscrito(email="Pessoa@example.com"), regra="ck_inscrito_email_minusculo")


def test_o_codigo_de_saida_vem_do_banco_e_nao_se_repete(sessao):
    primeira, segunda = Inscrito(email="pessoa1@example.com"), Inscrito(email="pessoa2@example.com")
    sessao.add_all([primeira, segunda])
    sessao.flush()
    assert isinstance(primeira.codigo_saida, UUID)
    assert primeira.codigo_saida != segunda.codigo_saida

    _nao_grava(
        sessao,
        Inscrito(email="pessoa3@example.com", codigo_saida=primeira.codigo_saida),
        regra="uq_inscrito_codigo_saida",
    )


def test_sair_apaga_a_linha(sessao):
    inscrito = Inscrito(email="pessoa@example.com")
    sessao.add(inscrito)
    sessao.flush()

    sessao.execute(delete(Inscrito).where(Inscrito.codigo_saida == inscrito.codigo_saida))
    assert sessao.scalars(select(Inscrito)).all() == []
