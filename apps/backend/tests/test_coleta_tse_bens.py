import csv
import json
from collections import Counter
from datetime import UTC, date, datetime
from decimal import Decimal
from functools import partial
from io import StringIO
from pathlib import Path
from zipfile import ZipFile

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.orm import Session

from mandatometro.api.app import app
from mandatometro.cli import main
from mandatometro.coleta import tse_bens
from mandatometro.coleta.tse_arquivos import ler_candidaturas
from mandatometro.db.modelos import (
    BemDeclarado,
    Candidatura,
    CandidaturaPatrimonio,
    Fonte,
    IpcaMensal,
    Mandato,
    Parlamentar,
)

FIXTURES = Path(__file__).parent / "fixtures" / "tse_bens"
OUTRO_CODIGO_2018 = "99029199"


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


def _alterar_linhas(pasta, nome, transformar):
    def reescrever(dados):
        leitor = csv.DictReader(StringIO(dados.decode("latin-1"), newline=""), delimiter=";")
        linhas = list(leitor)
        transformar(linhas)
        saida = StringIO(newline="")
        escritor = csv.DictWriter(saida, leitor.fieldnames, delimiter=";", quoting=csv.QUOTE_ALL)
        escritor.writeheader()
        escritor.writerows(linhas)
        return saida.getvalue().encode("latin-1")

    _alterar_zip(pasta, nome, reescrever)


def _registrar_ancora(sessao, fonte, pessoa, ano, externo, uf, cargo):
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
            parlamentar_id=pessoa,
            fonte=fonte,
        )
    )


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
    pessoas = []
    for i, (casa, uf) in enumerate(
        [("camara", "SP"), ("senado", "SC"), ("camara", "RJ"), ("senado", "RJ"), ("camara", "DF")]
    ):
        pessoa = Parlamentar(casa=casa, nome="Urna de Teste", id_externo=i + 1, fonte=fonte)
        sessao.add(
            Mandato(parlamentar=pessoa, legislatura=57, uf=uf, em_exercicio=i < 4, fonte=fonte)
        )
        pessoas.append(pessoa)
    sessao.flush()
    for i, ano, externo, uf, cargo in (
        (0, 2022, 41, "SP", 6),
        (1, 2022, 42, "SC", 5),
        (1, 2026, 52, "SC", 5),
        (2, 2022, 43, "RJ", 6),
        (3, 2026, 53, "RJ", 5),
    ):
        _registrar_ancora(sessao, fonte, pessoas[i].id, ano, externo, uf, cargo)
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


def _serie(sessao, pessoa):
    return set(
        sessao.execute(
            select(
                CandidaturaPatrimonio.ano,
                CandidaturaPatrimonio.id_externo,
                CandidaturaPatrimonio.fonte_candidatura_id,
                CandidaturaPatrimonio.fonte_bens_id,
                BemDeclarado.valor_centavos,
            )
            .outerjoin(BemDeclarado)
            .where(CandidaturaPatrimonio.parlamentar_id == pessoa)
        )
    )


def _eleicoes_2018(pessoa):
    with TestClient(app) as cliente:
        resposta = cliente.get(f"/parlamentares/{pessoa}/patrimonio")
    assert resposta.status_code == 200
    return [eleicao for eleicao in resposta.json()["eleicoes"] if eleicao["ano"] == 2018]


def _primeiro_turno_2018(linhas):
    linhas[0].update(CD_CARGO="3", DS_CARGO="Governador", NR_TURNO="1", DS_SIT_TOT_TURNO="2º TURNO")


def _adicionar_turno_em_outro_codigo(linhas, **mudancas):
    _primeiro_turno_2018(linhas)
    segundo = linhas[0] | {
        "CD_ELEICAO": OUTRO_CODIGO_2018,
        "NR_TURNO": "2",
        "DS_SIT_TOT_TURNO": "ELEITO",
    }
    linhas.append(segundo | mudancas)


def test_carga_em_varios_anos_prova_identidade_e_agrega_por_tipo(
    arquivos,
    parlamentares,
    sessao,
    capsys,
    caplog,
):
    primeiro, segundo, terceiro, quarto, _ = parlamentares
    resumo = _carregar(arquivos, capsys)
    assert resumo["ancoras"]["em_conflito_na_ligacao"] == 2
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
        assert resposta.json()["correcao_ipca"] is None
        eleicoes = resposta.json()["eleicoes"]
        assert [e["ano"] for e in eleicoes] == [2006, 2010, 2018, 2022, 2026]
        assert eleicoes[1]["uf"] == "BR"
        assert eleicoes[-1]["cargo"] == {"codigo": 5, "nome": "Senador"}
        assert eleicoes[-1]["uf"] == "RS"
        assert eleicoes[-1]["total_centavos"] == 10030
        assert eleicoes[-1]["fonte"]["url"].endswith("/bem_candidato_2026.zip")
        assert eleicoes[-1]["fonte"]["coletado_em"].endswith("Z")
        assert eleicoes[-1]["mes_inicio"] == "2026-10"
        assert all(e["total_corrigido_centavos"] is None for e in eleicoes)
        eleicoes = cliente.get(f"/parlamentares/{segundo}/patrimonio").json()["eleicoes"]
        assert [(e["ano"], e["total_centavos"]) for e in eleicoes] == [
            (2006, 6030),
            (2014, None),
            (2018, 717),
            (2022, 0),
            (2026, None),
        ]
        assert cliente.get(f"/parlamentares/{terceiro}/patrimonio").json() == {
            "eleicoes": [],
            "correcao_ipca": None,
        }
        ausente = cliente.get("/parlamentares/2147483647/patrimonio")
        assert ausente.status_code == 404
        assert ausente.json() == {"erro": "parlamentar_nao_encontrado"}


def test_patrimonio_corrige_outubro_inclusive_e_exige_o_intervalo_completo(
    arquivos, parlamentares, sessao, capsys
):
    _carregar(arquivos, capsys)
    primeiro, segundo, terceiro, *_ = parlamentares
    inicio = date(2022, 10, 1)
    fim = date(2026, 10, 1)
    fonte = Fonte(url="https://ipca.example/serie", coletado_em=datetime(2026, 11, 22, tzinfo=UTC))
    taxas = {inicio: Decimal("10.00"), fim: Decimal("-5.00")}
    sessao.add_all(
        IpcaMensal(mes=mes, variacao_percentual=taxas.get(mes, Decimal("0.00")), fonte=fonte)
        for ano in range(inicio.year, fim.year + 1)
        for mes_do_ano in range(1, 13)
        if inicio <= (mes := date(ano, mes_do_ano, 1)) <= fim
    )
    sessao.flush()

    with TestClient(app) as cliente:
        rota = f"/parlamentares/{primeiro}/patrimonio"
        patrimonio = cliente.get(rota).json()
        correcao = {
            "indice": "IPCA",
            "mes_fim": "2026-10",
            "fonte": {"url": fonte.url, "coletado_em": "2026-11-22T00:00:00Z"},
        }
        assert patrimonio["correcao_ipca"] == correcao
        assert cliente.get(f"/parlamentares/{terceiro}/patrimonio").json() == {
            "eleicoes": [],
            "correcao_ipca": correcao,
        }
        assert [
            (e["ano"], e["mes_inicio"], e["total_centavos"], e["total_corrigido_centavos"])
            for e in patrimonio["eleicoes"][-2:]
        ] == [(2022, "2022-10", 444, 464), (2026, "2026-10", 10030, 9529)]
        outros = cliente.get(f"/parlamentares/{segundo}/patrimonio").json()["eleicoes"]
        assert [(e["total_centavos"], e["total_corrigido_centavos"]) for e in outros[-2:]] == [
            (0, 0),
            (None, None),
        ]

        sessao.execute(delete(IpcaMensal).where(IpcaMensal.mes == date(2024, 1, 1)))
        eleicoes = cliente.get(rota).json()["eleicoes"]
        assert [e["total_corrigido_centavos"] for e in eleicoes[-2:]] == [None, 9529]

        sessao.execute(delete(IpcaMensal).where(IpcaMensal.mes == fim))
        patrimonio = cliente.get(rota).json()
        assert patrimonio["correcao_ipca"]["mes_fim"] == "2026-09"
        assert patrimonio["eleicoes"][-1]["total_corrigido_centavos"] is None


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
    ("texto", "resultado"),
    [
        ("ELEITO", "eleito"),
        ("ELEITO POR QP", "eleito_por_qp"),
        ("ELEITO POR MÉDIA", "eleito_por_media"),
        ("MÉDIA", "eleito_por_media"),
        ("SUPLENTE", "suplente"),
        ("NÃO ELEITO", "nao_eleito"),
        ("#NULO", "sem_resultado"),
        ("#NULO#", "sem_resultado"),
        ("2º TURNO", "sem_resultado"),
        ("CASSADO COM RECURSO", "sem_resultado"),
        ("INDEFERIDO COM RECURSO", "sem_resultado"),
        ("REGISTRO NEGADO ANTES DA ELEIÇÃO", "sem_resultado"),
        ("REGISTRO NEGADO APÓS A ELEIÇÃO", "sem_resultado"),
        ("RENÚNCIA/FALECIMENTO COM SUBSTITUIÇÃO", "sem_resultado"),
        ("RENÚNCIA/FALECIMENTO/CASSAÇÃO ANTES DA ELEIÇÃO", "sem_resultado"),
        ("RENÚNCIA/FALECIMENTO/CASSAÇÃO APÓS A ELEIÇÃO", "sem_resultado"),
        ("SUBSTITUÍDO", "sem_resultado"),
        ("SITUAÇÃO FICTÍCIA DE AUDITORIA ", "outro"),
    ],
)
def test_resultado_da_serie_usa_texto_do_tse(
    arquivos, parlamentares, sessao, capsys, texto, resultado
):
    def trocar(linhas):
        linhas[0].update(NR_TURNO="1", DS_SIT_TOT_TURNO=texto, CD_SIT_TOT_TURNO="123")

    _alterar_linhas(arquivos, "consulta_cand_2010", trocar)
    _carregar(arquivos, capsys)
    eleicao = CandidaturaPatrimonio
    bruto = sessao.execute(
        select(eleicao.resultado_bruto).where(
            eleicao.ano == 2010, eleicao.parlamentar_id == parlamentares[0]
        )
    ).scalar_one()
    assert bruto == (texto if resultado == "outro" else None)

    with TestClient(app) as cliente:
        resposta = cliente.get(f"/parlamentares/{parlamentares[0]}/patrimonio")
        assert resposta.status_code == 200
        item = next(e for e in resposta.json()["eleicoes"] if e["ano"] == 2010)
    assert item["resultado"] == resultado
    assert "resultado_bruto" not in item


@pytest.mark.parametrize("codigo_distinto", [False, True])
def test_recoleta_grava_resultado_do_ultimo_turno_na_mesma_candidatura(
    arquivos, parlamentares, sessao, capsys, codigo_distinto
):
    _carregar(arquivos, capsys)
    eleicao = CandidaturaPatrimonio
    consulta = select(eleicao).where(
        eleicao.ano == 2010, eleicao.parlamentar_id == parlamentares[0]
    )
    antes = sessao.scalars(consulta).one()
    id_anterior, codigo_anterior = antes.id, antes.codigo_eleicao
    bens = _bens(sessao)

    def novo_turno(linhas):
        primeiro = linhas[0]
        primeiro.update(NR_TURNO="1", DS_SIT_TOT_TURNO="2º TURNO")
        ultimo = primeiro | {"NR_TURNO": "2", "DS_SIT_TOT_TURNO": "ELEITO"}
        if codigo_distinto:
            ultimo["CD_ELEICAO"] = str(codigo_anterior + 1)
        linhas.insert(0, ultimo)

    _alterar_linhas(arquivos, "consulta_cand_2010", novo_turno)
    _carregar(arquivos, capsys)
    atual = sessao.scalars(consulta.execution_options(populate_existing=True)).one()
    assert (atual.id, atual.codigo_eleicao, atual.resultado) == (
        id_anterior,
        codigo_anterior,
        "eleito",
    )
    assert _bens(sessao) == bens


def test_recoleta_le_declaracao_do_outro_codigo_do_par(arquivos, parlamentares, sessao, capsys):
    pessoa = parlamentares[0]
    _alterar_linhas(arquivos, "consulta_cand_2018", _primeiro_turno_2018)
    _carregar(arquivos, capsys)
    (antes,) = _eleicoes_2018(pessoa)
    assert antes["total_centavos"] == 350
    eleicao = CandidaturaPatrimonio
    consulta = select(eleicao.id, eleicao.codigo_eleicao).where(
        eleicao.ano == 2018, eleicao.parlamentar_id == pessoa
    )
    chave_publicada = sessao.execute(consulta).one()

    _alterar_linhas(arquivos, "consulta_cand_2018", _adicionar_turno_em_outro_codigo)
    _alterar_linhas(
        arquivos,
        "bem_candidato_2018",
        lambda linhas: linhas[0].update(CD_ELEICAO=OUTRO_CODIGO_2018),
    )
    _carregar(arquivos, capsys)
    (atual,) = _eleicoes_2018(pessoa)
    assert sessao.execute(consulta).one() == chave_publicada
    assert atual["resultado"] == "eleito"
    assert atual["total_centavos"] == antes["total_centavos"]

    _alterar_zip(arquivos, "bem_candidato_2018", lambda dados: dados.replace(b'"3,50"', b'"7,94"'))
    _carregar(arquivos, capsys)
    (atualizado,) = _eleicoes_2018(pessoa)
    assert sessao.execute(consulta).one() == chave_publicada
    assert atualizado["total_centavos"] == 794


def test_declaracoes_em_dois_codigos_do_par_ficam_em_conflito(arquivos, parlamentares, capsys):
    def bens(linhas):
        linhas.append(
            linhas[0]
            | {
                "CD_ELEICAO": OUTRO_CODIGO_2018,
                "NR_ORDEM_BEM_CANDIDATO": "99",
                "VR_BEM_CANDIDATO": "1234,56",
            }
        )

    _alterar_linhas(arquivos, "consulta_cand_2018", _adicionar_turno_em_outro_codigo)
    _alterar_linhas(arquivos, "bem_candidato_2018", bens)
    resumo = _carregar(arquivos, capsys)
    assert _eleicoes_2018(parlamentares[0]) == []
    assert resumo["anos"]["2018"]["em_conflito"] == 1


@pytest.mark.parametrize("com_segundo_turno", [False, True], ids=["so-primeiro", "com-segundo"])
def test_chaves_concorrentes_no_mesmo_turno_ficam_em_conflito(
    arquivos, parlamentares, capsys, com_segundo_turno
):
    def candidaturas(linhas):
        _primeiro_turno_2018(linhas)
        primeiro = linhas[0]
        if com_segundo_turno:
            linhas.append(primeiro | {"NR_TURNO": "2", "DS_SIT_TOT_TURNO": "ELEITO"})
        linhas.append(
            primeiro
            | {
                "CD_ELEICAO": OUTRO_CODIGO_2018,
                "DS_SIT_TOT_TURNO": "#NULO",
                "NM_CANDIDATO": "Ficha Sintética de Teste",
                "NM_URNA_CANDIDATO": "Urna Sintética de Teste",
            }
        )

    def bens(linhas):
        linhas[0].update(CD_ELEICAO=OUTRO_CODIGO_2018, VR_BEM_CANDIDATO="1234,56")

    _alterar_linhas(arquivos, "consulta_cand_2018", candidaturas)
    _alterar_linhas(arquivos, "bem_candidato_2018", bens)
    resumo = _carregar(arquivos, capsys)
    assert _eleicoes_2018(parlamentares[0]) == []
    assert resumo["anos"]["2018"]["cpf_repetido"] == 1


@pytest.mark.parametrize(
    ("campo", "valor"),
    [("SG_UF", "DF"), ("SQ_CANDIDATO", "90029199"), ("CD_CARGO", "8")],
    ids=["uf", "sequencia", "cargo"],
)
def test_turnos_com_uf_sequencia_ou_cargo_distintos_ficam_em_conflito(
    arquivos, parlamentares, capsys, campo, valor
):
    _alterar_linhas(
        arquivos,
        "consulta_cand_2018",
        lambda linhas: _adicionar_turno_em_outro_codigo(linhas, **{campo: valor}),
    )
    resumo = _carregar(arquivos, capsys)
    assert _eleicoes_2018(parlamentares[0]) == []
    assert resumo["anos"]["2018"]["cpf_repetido"] == 1


def test_turno_com_cpf_sem_ancora_fica_fora_da_juncao(arquivos, parlamentares, capsys):
    _alterar_linhas(
        arquivos,
        "consulta_cand_2018",
        lambda linhas: _adicionar_turno_em_outro_codigo(linhas, NR_CPF_CANDIDATO="00000000019"),
    )
    _carregar(arquivos, capsys)
    (eleicao,) = _eleicoes_2018(parlamentares[0])
    assert eleicao["resultado"] == "sem_resultado"
    assert eleicao["total_centavos"] == 350


def test_recoleta_atualiza_resultado_quando_o_total_anterior_e_preservado(
    arquivos, parlamentares, sessao, capsys
):
    _carregar(arquivos, capsys)
    eleicao = CandidaturaPatrimonio
    consulta = select(eleicao).where(
        eleicao.ano == 2018, eleicao.parlamentar_id == parlamentares[0]
    )
    fonte_bens = sessao.scalars(consulta).one().fonte_bens_id
    bens = _bens(sessao)

    def trocar_resultado(linhas):
        linhas[0].update(NR_TURNO="1", DS_SIT_TOT_TURNO="NÃO ELEITO")

    _alterar_linhas(arquivos, "consulta_cand_2018", trocar_resultado)
    _alterar_zip(arquivos, "bem_candidato_2018", lambda b: b.replace(b'"3,50"', b'"ERRO"'))
    _carregar(arquivos, capsys)
    atual = sessao.scalars(consulta.execution_options(populate_existing=True)).one()
    assert atual.resultado == "nao_eleito"
    assert atual.fonte_bens_id == fonte_bens
    assert _bens(sessao) == bens


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


@pytest.mark.parametrize(
    ("tipo", "terminador"),
    [
        pytest.param(None, b"", id="arquivo-ausente"),
        pytest.param("bem_candidato", b"", id="bens-truncados-no-fim"),
        pytest.param("consulta_cand", b"", id="candidaturas-truncadas-no-fim"),
        pytest.param("bem_candidato", b"\r\n", id="linha-curta-com-quebra"),
    ],
)
def test_arquivo_incompleto_preserva_fontes_e_totais(
    arquivos,
    parlamentares,
    sessao,
    capsys,
    tipo,
    terminador,
):
    _carregar(arquivos, capsys)
    antes = _bens(sessao)
    fontes = sessao.scalar(select(func.count()).select_from(Fonte))
    if tipo is None:
        (arquivos / "bem_candidato_2018.zip").unlink()
        resumo = _carregar(arquivos, capsys, completa=False)
        assert resumo["anos"]["2018"]["bens"]["falhas"] == {"ausente": 1}
    else:
        _alterar_zip(arquivos, f"{tipo}_2018", lambda b: b[:-2].rsplit(b";", 1)[0] + terminador)
        resumo = _carregar(arquivos, capsys, completa=False)
        arquivo = resumo["anos"]["2018"]["bens" if tipo == "bem_candidato" else "candidaturas"]
        assert arquivo["falhas"] == {"invalido": 1}
        assert arquivo.get("linha_invalida", 0) == int(bool(terminador))
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
    assert resumo["ancoras"]["em_conflito_na_cadeia"] >= 2
    assert (
        sessao.scalar(
            select(CandidaturaPatrimonio.parlamentar_id).where(
                CandidaturaPatrimonio.ano == 2006,
                CandidaturaPatrimonio.uf == "SC",
            )
        )
        == outro
    )
    assert not sessao.scalar(
        select(func.count())
        .select_from(CandidaturaPatrimonio)
        .where(CandidaturaPatrimonio.parlamentar_id == primeiro)
    )


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
    assert resumo["ancoras"]["em_conflito_na_ligacao"] == 3
    assert (
        sessao.scalar(
            select(func.count())
            .select_from(CandidaturaPatrimonio)
            .where(CandidaturaPatrimonio.parlamentar_id == parlamentares[1])
        )
        == 0
    )


def test_ancora_sem_par_atual_ainda_veta_cpf_divergente(arquivos, parlamentares, sessao, capsys):
    def trocar(linhas):
        linhas[1].update(
            NM_URNA_CANDIDATO="Urna de Outra Pessoa Inventada",
            NM_CANDIDATO="Civil de Outra Pessoa Inventada",
            NR_CPF_CANDIDATO="00000000004",
        )

    _alterar_linhas(arquivos, "consulta_cand_2026", trocar)
    resumo = _carregar(arquivos, capsys)
    assert resumo["ancoras"]["em_conflito"] == 1
    assert not _serie(sessao, parlamentares[1])


def test_recusa_do_historico_na_ligacao_veta_ate_ancora_que_o_tse_atualizaria(
    arquivos, parlamentares, sessao, capsys
):
    primeiro = parlamentares[0]
    ficha = {}

    def guardar(linhas):
        ficha.update(linhas.pop(0))

    _alterar_linhas(arquivos, "consulta_cand_2026", guardar)
    _carregar(arquivos, capsys)
    antes = _serie(sessao, primeiro)
    assert any(r[0] == 2022 for r in antes)

    _registrar_ancora(
        sessao, Fonte(url="https://cadastro.example/antiga"), primeiro, 2026, 99, "SP", 6
    )
    sessao.flush()
    ficha.update(SG_UF="SP", CD_CARGO="6")
    _alterar_linhas(arquivos, "consulta_cand_2026", lambda linhas: linhas.append(ficha))
    _alterar_zip(arquivos, "bem_candidato_2022", lambda b: b.replace(b'"4,44"', b'"8,88"'))
    resumo = _carregar(arquivos, capsys)
    assert resumo["ancoras"]["em_conflito_na_ligacao"] == 3
    assert _serie(sessao, primeiro) == antes


def test_ancora_renomeada_para_outra_pessoa_preserva_a_serie(
    arquivos, parlamentares, sessao, capsys
):
    primeiro = parlamentares[0]
    _carregar(arquivos, capsys)
    antes = _serie(sessao, primeiro)

    def trocar(linhas):
        linhas[0].update(
            NM_URNA_CANDIDATO="Urna de Outra Pessoa Inventada",
            NM_CANDIDATO="Civil de Outra Pessoa Inventada",
            NR_CPF_CANDIDATO="00000000004",
        )

    _alterar_linhas(arquivos, "consulta_cand_2022", trocar)
    _alterar_zip(arquivos, "bem_candidato_2022", lambda b: b.replace(b'"4,44"', b'"8,88"'))
    resumo = _carregar(arquivos, capsys)
    assert resumo["ancoras"]["sem_ancora_valida"] == 3
    assert _serie(sessao, primeiro) == antes


def test_bens_respeitam_disputa_com_senador_sem_ancora(arquivos, parlamentares, sessao, capsys):
    fonte = Fonte(url="https://cadastro.example/senado")
    senador = Parlamentar(casa="senado", nome="Urna de Teste", id_externo=99, fonte=fonte)
    sessao.add(
        Mandato(parlamentar=senador, legislatura=57, uf="RS", em_exercicio=True, fonte=fonte)
    )
    sessao.flush()
    resumo = _carregar(arquivos, capsys)
    assert resumo["ancoras"]["em_conflito_na_ligacao"] == 3
    assert not _serie(sessao, parlamentares[0])
    assert not _serie(sessao, senador.id)
    assert sessao.scalar(select(func.count()).select_from(Candidatura)) == 5


def test_fora_do_exercicio_preserva_a_serie_ate_voltar(arquivos, parlamentares, sessao, capsys):
    primeiro = parlamentares[0]
    _carregar(arquivos, capsys)
    antes = _serie(sessao, primeiro)
    mandato = sessao.scalar(select(Mandato).where(Mandato.parlamentar_id == primeiro))
    mandato.em_exercicio = False
    sessao.flush()
    _alterar_zip(arquivos, "bem_candidato_2006", lambda b: b.replace(b'"10,15"', b'"42,15"'))
    resumo = _carregar(arquivos, capsys)
    assert resumo["ancoras"]["sem_ancora_valida"] == 3
    assert _serie(sessao, primeiro) == antes
    mandato.em_exercicio = True
    sessao.flush()
    _carregar(arquivos, capsys)
    assert (2006, primeiro, 99, 4216) in _bens(sessao)


def test_mudanca_no_exercicio_durante_a_leitura_cancela_a_gravacao(
    arquivos, parlamentares, sessao, capsys, monkeypatch
):
    _carregar(arquivos, capsys)
    antes = _bens(sessao)
    fontes = sessao.scalar(select(func.count()).select_from(Fonte))
    ler_bens = tse_bens.ler_bens

    def ler(arquivo, ano, contagens, *, chaves):
        if ano == 2006:
            sessao.execute(
                update(Mandato)
                .where(Mandato.parlamentar_id == parlamentares[0])
                .values(em_exercicio=False)
            )
        return ler_bens(arquivo, ano, contagens, chaves=chaves)

    monkeypatch.setattr(tse_bens, "ler_bens", ler)
    resumo = _carregar(arquivos, capsys, completa=False)
    assert resumo["falhas"] == {"invalido": 1}
    assert _bens(sessao) == antes
    assert sessao.scalar(select(func.count()).select_from(Fonte)) == fontes


def test_suplementar_nao_disputa_com_a_ordinaria_nem_vira_ancora(
    arquivos, parlamentares, sessao, capsys
):
    def suplementar(linhas):
        linhas[0].update(CD_TIPO_ELEICAO="1", CD_ELEICAO="9999")

    _alterar_linhas(arquivos, "consulta_cand_2014", suplementar)
    _alterar_linhas(arquivos, "bem_candidato_2014", suplementar)
    _alterar_linhas(arquivos, "consulta_cand_2026", suplementar)
    _alterar_linhas(arquivos, "bem_candidato_2026", suplementar)
    resumo = _carregar(arquivos, capsys)
    primeiro = parlamentares[0]
    assert resumo["anos"]["2014"]["candidaturas"]["fora_das_gerais"] == 1
    assert resumo["anos"]["2026"]["candidaturas"]["fora_das_gerais"] == 1
    assert (2014, primeiro, 11, 3001) in _bens(sessao)
    assert not any(r[0] == 2026 for r in _serie(sessao, primeiro))
    descartes = Counter()
    with ZipFile(arquivos / "consulta_cand_2026.zip") as zip_:
        lidas = ler_candidaturas(zip_, 2026, descartes)
    assert descartes["fora_das_gerais"] == 1
    assert {c.chave for c in lidas} == {(2026, 52), (2026, 53)}


@pytest.mark.parametrize(("ano", "tipo"), [(2006, "2"), (2018, "1"), (2026, "999")])
def test_ano_sem_ordinaria_invalida_a_carga(arquivos, parlamentares, sessao, capsys, ano, tipo):
    _carregar(arquivos, capsys)
    antes = _bens(sessao)
    fontes = sessao.scalar(select(func.count()).select_from(Fonte))

    def mudar_tipo(linhas):
        for linha in linhas:
            linha["CD_TIPO_ELEICAO"] = tipo

    _alterar_linhas(arquivos, f"consulta_cand_{ano}", mudar_tipo)
    resumo = _carregar(arquivos, capsys, completa=False)
    assert resumo["anos"][str(ano)]["candidaturas"]["fora_das_gerais"] > 0
    assert _bens(sessao) == antes
    assert sessao.scalar(select(func.count()).select_from(Fonte)) == fontes


def test_mesmo_sq_e_uf_em_outra_eleicao_fica_fora_da_soma(arquivos, parlamentares, sessao, capsys):
    def acrescentar(linhas):
        linhas.append(linhas[0] | {"CD_ELEICAO": "9999", "VR_BEM_CANDIDATO": "99,99"})

    _alterar_linhas(arquivos, "bem_candidato_2006", acrescentar)
    _carregar(arquivos, capsys)
    assert (2006, parlamentares[0], 99, 1016) in _bens(sessao)


def test_falha_no_ultimo_ano_desfaz_os_anos_anteriores(arquivos, parlamentares, sessao, capsys):
    fontes = sessao.scalar(select(func.count()).select_from(Fonte))
    sessao.execute(
        text(
            "ALTER TABLE candidatura_patrimonio ADD CONSTRAINT teste_ultimo_ano CHECK (ano <> 2026)"
        )
    )
    resumo = _carregar(arquivos, capsys, completa=False)
    assert resumo["falhas"] == {"gravacao": 1}
    assert not sessao.scalar(select(func.count()).select_from(CandidaturaPatrimonio))
    assert not _bens(sessao)
    assert sessao.scalar(select(func.count()).select_from(Fonte)) == fontes
    assert sessao.scalar(select(func.count()).select_from(Candidatura)) == 5
