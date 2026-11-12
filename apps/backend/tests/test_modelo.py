"""As regras do modelo, no banco: as chaves, os conjuntos e o que não pode faltar.

Os dados são inventados: nenhum CPF, nome ou e-mail de verdade.
"""

from datetime import date

import pytest
from sqlalchemy.exc import IntegrityError

from mandatometro.db.modelos import (
    Fonte,
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


def _nao_grava(sessao, *objetos) -> None:
    sessao.add_all(objetos)
    with pytest.raises(IntegrityError):
        sessao.flush()
    sessao.rollback()


# --- As chaves e o que não pode faltar ---


def test_o_mesmo_id_vale_nas_duas_casas(sessao):
    sessao.add_all([_parlamentar(5672, "camara"), _parlamentar(5672, "senado")])
    sessao.flush()


def test_o_id_nao_se_repete_na_mesma_casa(sessao):
    _nao_grava(sessao, _parlamentar(5672), _parlamentar(5672))


def test_a_casa_e_camara_ou_senado(sessao):
    _nao_grava(sessao, _parlamentar(1, "assembleia"))


def test_dado_coletado_sem_fonte_nao_grava(sessao):
    _nao_grava(sessao, Parlamentar(casa="camara", id_externo=1, nome="Parlamentar Inventado"))


def test_o_parlamentar_vota_uma_vez_por_votacao(sessao):
    votacao, parlamentar = _votacao(), _parlamentar()
    _nao_grava(
        sessao, _voto(votacao, parlamentar, "sim", "Sim"), _voto(votacao, parlamentar, "nao", "Não")
    )


def test_o_resultado_fica_no_conjunto(sessao):
    votacao = _votacao()
    votacao.resultado = "empatada"
    _nao_grava(sessao, votacao)


# --- O voto: o valor no conjunto e o código como a Casa publica ---


def test_o_voto_fica_no_conjunto(sessao):
    _nao_grava(sessao, _voto(_votacao(), _parlamentar(), "talvez", "Talvez"))


def test_so_o_nao_votou_fica_sem_o_codigo(sessao):
    votacao = _votacao()
    sessao.add(_voto(votacao, _parlamentar(1), "nao_votou", None))
    sessao.flush()

    _nao_grava(sessao, _voto(votacao, _parlamentar(2), "sim", None))


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
