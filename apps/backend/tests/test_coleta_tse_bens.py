import json
from functools import partial
from pathlib import Path
from zipfile import ZipFile

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from mandatometro.api.app import app
from mandatometro.cli import main
from mandatometro.coleta import tse_bens
from mandatometro.db.modelos import (
    BemDeclarado,
    Candidatura,
    CandidaturaPatrimonio,
    Fonte,
    Parlamentar,
)

FIXTURES = Path(__file__).parent / "fixtures" / "tse_bens"


@pytest.fixture
def arquivos(tmp_path, monkeypatch):
    def sem_rede(*args, **kwargs):
        pytest.fail("A coleta local tentou acessar a rede.")

    monkeypatch.setattr(httpx2.Client, "stream", sem_rede)
    for caminho in FIXTURES.glob("*.csv"):
        with ZipFile(tmp_path / (caminho.stem.removesuffix("_BRASIL") + ".zip"), "w") as zip_:
            zip_.write(caminho, caminho.name)
    return tmp_path


def _alterar_zip(pasta, nome, transformar):
    caminho = pasta / f"{nome}.zip"
    membro = f"{nome}_BRASIL.csv"
    with ZipFile(caminho) as zip_:
        dados = zip_.read(membro)
    alterados = transformar(dados)
    assert dados != alterados
    with ZipFile(caminho, "w") as zip_:
        zip_.writestr(membro, alterados)


@pytest.fixture
def parlamentares(sessao, monkeypatch):
    conexao = sessao.connection()
    monkeypatch.setattr(
        tse_bens,
        "sessao",
        partial(Session, bind=conexao, join_transaction_mode="create_savepoint"),
    )
    monkeypatch.setattr("mandatometro.db.engine", lambda: conexao)
    fonte = Fonte(url="https://cadastro.example/ancoras")
    pessoas = [
        Parlamentar(casa="camara", nome=f"Parlamentar Inventado {n}", id_externo=n, fonte=fonte)
        for n in range(1, 6)
    ]
    sessao.add_all(pessoas)
    sessao.flush()
    for i, ano, externo, uf, cargo in (
        (0, 2022, 41, "SP", 6),
        (1, 2022, 42, "SC", 5),
        (1, 2026, 52, "SC", 5),
        (2, 2022, 43, "RJ", 6),
        (3, 2026, 53, "RJ", 7),
    ):
        sessao.add(
            Candidatura(
                ano=ano,
                codigo_eleicao=ano,
                id_externo=externo,
                cargo=cargo,
                uf=uf,
                partido="FIC",
                numero="001",
                nome_urna="Urna Inventada",
                resultado="eleito",
                resultado_bruto=1,
                parlamentar_id=pessoas[i].id,
                fonte=fonte,
            )
        )
    sessao.flush()
    return [p.id for p in pessoas]


def _carregar(arquivos, capsys, *, completa=True):
    assert main(["coleta", "bens-tse", "--diretorio-zips", str(arquivos)]) == (0 if completa else 1)
    saida = capsys.readouterr()
    assert not saida.err
    resumo = json.loads(saida.out)
    assert resumo["completa"] is completa
    return resumo


def _bens(sessao):
    return set(
        sessao.execute(
            select(
                CandidaturaPatrimonio.ano,
                CandidaturaPatrimonio.parlamentar_id,
                BemDeclarado.tipo,
                BemDeclarado.valor_centavos,
            ).join(BemDeclarado)
        )
    )


def test_carga_em_varios_anos_prova_identidade_e_agrega_por_tipo(
    arquivos,
    parlamentares,
    sessao,
    capsys,
    caplog,
):
    primeiro, segundo, terceiro, quarto, _ = parlamentares
    resumo = _carregar(arquivos, capsys)
    assert resumo["ancoras"]["em_conflito"] == 2
    assert resumo["anos"]["2010"]["candidaturas"]["sem_cpf"] == 1
    assert resumo["anos"]["2014"]["em_conflito"] == 1
    assert resumo["anos"]["2026"]["bens"]["tipo_desconhecido"] == 1
    assert not sessao.scalar(
        select(func.count())
        .select_from(CandidaturaPatrimonio)
        .where(CandidaturaPatrimonio.parlamentar_id.in_([terceiro, quarto]))
    )
    assert sessao.scalar(select(func.count()).select_from(Candidatura)) == 5
    assert _bens(sessao) == {
        (2006, primeiro, 99, 1016),
        (2006, segundo, 99, 6030),
        (2010, primeiro, 11, 2002),
        (2018, primeiro, 11, 350),
        (2018, segundo, 11, 717),
        (2022, primeiro, 11, 444),
        (2022, segundo, 11, 0),
        (2026, primeiro, 11, 10010),
        (2026, primeiro, 9999, 20),
    }
    assert not any(
        valor in json.dumps(resumo) + caplog.text
        for valor in (
            "00000000001",
            "Urna de Teste",
            "Civil Inventado",
            "ROTULO DE TESTE",
            "100,10",
        )
    )


def test_patrimonio_publico_distingue_total_zero_de_ausencia(
    arquivos,
    parlamentares,
    capsys,
):
    _carregar(arquivos, capsys)
    primeiro, segundo, terceiro, *_ = parlamentares
    with TestClient(app) as cliente:
        resposta = cliente.get(f"/parlamentares/{primeiro}/patrimonio")
        assert resposta.status_code == 200
        eleicoes = resposta.json()["eleicoes"]
        assert [e["ano"] for e in eleicoes] == [2006, 2010, 2018, 2022, 2026]
        assert eleicoes[1]["uf"] == "BR"
        assert eleicoes[-1]["cargo"] == {"codigo": 5, "nome": "Senador"}
        assert eleicoes[-1]["uf"] == "RS"
        assert eleicoes[-1]["total_centavos"] == 10030
        assert eleicoes[-1]["fonte"]["url"].endswith("/bem_candidato_2026.zip")
        assert eleicoes[-1]["fonte"]["coletado_em"].endswith("Z")
        assert set(eleicoes[-1]) == {"ano", "cargo", "uf", "total_centavos", "fonte"}
        eleicoes = cliente.get(f"/parlamentares/{segundo}/patrimonio").json()["eleicoes"]
        assert [(e["ano"], e["total_centavos"]) for e in eleicoes] == [
            (2006, 6030),
            (2014, None),
            (2018, 717),
            (2022, 0),
            (2026, None),
        ]
        assert cliente.get(f"/parlamentares/{terceiro}/patrimonio").json() == {"eleicoes": []}
        ausente = cliente.get("/parlamentares/2147483647/patrimonio")
        assert ausente.status_code == 404
        assert ausente.json() == {"erro": "parlamentar_nao_encontrado"}


def test_repetir_atualiza_os_totais_sem_duplicar(arquivos, parlamentares, sessao, capsys):
    _carregar(arquivos, capsys)
    ids = set(sessao.scalars(select(CandidaturaPatrimonio.id)))
    antes = _bens(sessao)
    _alterar_zip(arquivos, "bem_candidato_2006", lambda b: b.replace(b'"10,15"', b'"42,15"'))
    _carregar(arquivos, capsys)
    assert set(sessao.scalars(select(CandidaturaPatrimonio.id))) == ids
    assert _bens(sessao) == antes - {(2006, parlamentares[0], 99, 1016)} | {
        (2006, parlamentares[0], 99, 4216)
    }


@pytest.mark.parametrize(
    ("valor", "contagem"),
    [(b"", "valor_vazio"), (b"-1,00", "valor_negativo"), (b"1.999,00", "valor_malformado")],
)
def test_declaracao_com_valor_invalido_conserva_o_total_anterior(
    arquivos,
    parlamentares,
    sessao,
    capsys,
    valor,
    contagem,
):
    _carregar(arquivos, capsys)
    antes = _bens(sessao)
    _alterar_zip(
        arquivos, "bem_candidato_2018", lambda b: b.replace(b'"3,50"', b'"' + valor + b'"')
    )
    resumo = _carregar(arquivos, capsys)
    assert resumo["anos"]["2018"]["bens"][contagem] == 1
    assert _bens(sessao) == antes


def test_declaracao_invalida_nova_fica_sem_total(arquivos, parlamentares, sessao, capsys):
    _alterar_zip(arquivos, "bem_candidato_2018", lambda b: b.replace(b'"3,50"', b'"ERRO"'))
    _carregar(arquivos, capsys)
    assert (2018, parlamentares[0], 11, 350) not in _bens(sessao)
    assert (
        sessao.scalar(
            select(CandidaturaPatrimonio).where(
                CandidaturaPatrimonio.ano == 2018,
                CandidaturaPatrimonio.parlamentar_id == parlamentares[0],
            )
        )
        is not None
    )


@pytest.mark.parametrize("falha", ["ausente", "bens_truncados", "candidaturas_truncadas"])
def test_arquivo_incompleto_preserva_fontes_e_totais(
    arquivos,
    parlamentares,
    sessao,
    capsys,
    falha,
):
    _carregar(arquivos, capsys)
    antes = _bens(sessao)
    fontes = sessao.scalar(select(func.count()).select_from(Fonte))
    if falha == "ausente":
        (arquivos / "bem_candidato_2018.zip").unlink()
    else:
        nome = "bem_candidato_2018" if falha == "bens_truncados" else "consulta_cand_2018"
        _alterar_zip(arquivos, nome, lambda b: b[:-2].rsplit(b";", 1)[0] + b"\r\n")
    _carregar(arquivos, capsys, completa=False)
    assert _bens(sessao) == antes
    assert sessao.scalar(select(func.count()).select_from(Fonte)) == fontes


def test_candidatura_ja_gravada_conserva_o_dono(arquivos, parlamentares, sessao, capsys):
    primeiro, *_, outro = parlamentares
    fonte = Fonte(url="https://origem.example/previa")
    sessao.add(
        CandidaturaPatrimonio(
            ano=2006,
            codigo_eleicao=2006,
            uf="SC",
            id_externo=1,
            cargo=6,
            parlamentar_id=outro,
            fonte_candidatura=fonte,
            fonte_bens=fonte,
        )
    )
    sessao.flush()
    resumo = _carregar(arquivos, capsys)
    assert resumo["anos"]["2006"]["em_conflito"] == 1
    assert (
        sessao.scalar(
            select(CandidaturaPatrimonio.parlamentar_id).where(
                CandidaturaPatrimonio.ano == 2006,
                CandidaturaPatrimonio.uf == "SC",
            )
        )
        == outro
    )
    assert (2010, primeiro, 11, 2002) in _bens(sessao)


def test_cpf_atual_precisa_confirmar_os_vinculos_persistidos(
    arquivos,
    parlamentares,
    sessao,
    capsys,
):
    _carregar(arquivos, capsys)
    id_ = parlamentares[0]
    antes = set(
        sessao.scalars(
            select(CandidaturaPatrimonio.ano).where(CandidaturaPatrimonio.parlamentar_id == id_)
        )
    )
    _alterar_zip(
        arquivos, "consulta_cand_2022", lambda b: b.replace(b"00000000001", b"00000000004")
    )
    _alterar_zip(
        arquivos, "consulta_cand_2014", lambda b: b.replace(b"00000000001", b"00000000004", 1)
    )
    resumo = _carregar(arquivos, capsys)
    assert resumo["ancoras"]["vinculos_nao_confirmados"] == 1
    assert (
        set(
            sessao.scalars(
                select(CandidaturaPatrimonio.ano).where(CandidaturaPatrimonio.parlamentar_id == id_)
            )
        )
        == antes
    )


def test_cpfs_diferentes_nas_ancoras_bloqueiam_a_pessoa(arquivos, parlamentares, sessao, capsys):
    _alterar_zip(
        arquivos, "consulta_cand_2026", lambda b: b.replace(b"00000000002", b"00000000004")
    )
    resumo = _carregar(arquivos, capsys)
    assert resumo["ancoras"]["em_conflito"] == 3
    assert (
        sessao.scalar(
            select(func.count())
            .select_from(CandidaturaPatrimonio)
            .where(CandidaturaPatrimonio.parlamentar_id == parlamentares[1])
        )
        == 0
    )
