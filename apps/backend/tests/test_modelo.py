"""As regras do modelo, no banco: as chaves, os conjuntos e o que não pode faltar.

Os dados são inventados: nenhum CPF, nome ou e-mail de verdade.
"""

from datetime import UTC, date, datetime
from uuid import UUID

import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from mandatometro.db.modelos import (
    Edicao,
    Fonte,
    Inscrito,
    ItemEdicao,
    Parlamentar,
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


def _votacao() -> Votacao:
    return Votacao(
        casa="camara",
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


def test_o_mesmo_id_vale_nas_duas_casas(sessao):
    sessao.add_all([_parlamentar(5672, "camara"), _parlamentar(5672, "senado")])
    sessao.flush()


def test_o_id_nao_se_repete_na_mesma_casa(sessao):
    _nao_grava(
        sessao, _parlamentar(5672), _parlamentar(5672), regra="uq_parlamentar_casa_id_externo"
    )


def test_a_casa_e_camara_ou_senado(sessao):
    _nao_grava(sessao, _parlamentar(1, "assembleia"), regra="ck_parlamentar_casa")


def test_dado_coletado_sem_fonte_nao_grava(sessao):
    _nao_grava(
        sessao,
        Parlamentar(casa="camara", id_externo=1, nome="Parlamentar Inventado"),
        regra='"fonte_id"',
    )


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


# --- O voto: o valor no conjunto e o código como a Casa publica ---


def test_o_voto_fica_no_conjunto(sessao):
    _nao_grava(
        sessao, _voto(_votacao(), _parlamentar(), "talvez", "Talvez"), regra='"ck_voto_valor"'
    )


def test_so_o_nao_votou_fica_sem_o_codigo(sessao):
    votacao = _votacao()
    sessao.add(_voto(votacao, _parlamentar(1), "nao_votou", None))
    sessao.flush()

    _nao_grava(sessao, _voto(votacao, _parlamentar(2), "sim", None), regra="ck_voto_valor_bruto")


@pytest.mark.parametrize(
    ("bruto", "esperado"),
    [
        ("Sim", ("sim", "Sim")),
        ("Não", ("nao", "Não")),
        ("Abstenção", ("abstencao", "Abstenção")),
        ("Obstrução", ("obstrucao", "Obstrução")),
        ("Artigo 17", ("presidente", "Artigo 17")),
        ("Presidente (art. 51 RISF)", ("presidente", "Presidente (art. 51 RISF)")),
        ("P-NRV", ("nao_votou", "P-NRV")),
        ("AP", ("nao_votou", "AP")),
        # Licença saúde é dado de saúde: entra só como não votou, sem o código.
        ("LS", ("nao_votou", None)),
        # Um código que ainda não está na tabela não quebra a coleta.
        ("XYZ", ("outro", "XYZ")),
    ],
)
def test_normalizar_voto(bruto, esperado):
    assert normalizar_voto(bruto) == esperado


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
