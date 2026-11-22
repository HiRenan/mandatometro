import json
from functools import partial
from pathlib import Path
from zipfile import ZipFile

import httpx2
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from mandatometro.cli import main
from mandatometro.coleta import tse
from mandatometro.coleta.tse_arquivos import abrir_zip, url_arquivo
from mandatometro.db.modelos import Candidatura, Fonte, LinkCandidatura, Mandato, Parlamentar

FIXTURES = Path(__file__).parent / "fixtures" / "tse"
PESSOAS = (
    ("camara", "Bia D Avelã", "SP", 57, "Titular", True),
    ("camara", "Luma Fictícia", "BA", 57, "Titular", True),
    ("camara", "Ciro Marco Fictício", "PR", 57, "Titular", True),
    ("camara", "Zito Fundo da Lua", "RJ", 57, "Titular", True),
    ("camara", "Nilo da Cerração", "DF", 57, "Titular", True),
    ("camara", "Ada Pouso da Chuva", "GO", 57, "Titular", True),
    ("camara", "Lina Mar Imaginário", "PE", 57, "Suplente", True),
    ("senado", "Sora Tela de Bruma", "SC", 57, "1º Suplente", True),
    ("senado", "Teo Candeeiro Azul", "AM", 56, "Titular", True),
    ("camara", "Iara Fictícia do Luar", "MG", 57, "Titular", False),
)


@pytest.fixture
def arquivos(tmp_path):
    for caminho in FIXTURES.glob("*.csv"):
        nome_zip = caminho.stem.removesuffix("_BRASIL") + ".zip"
        conteudo = caminho.read_bytes()
        assert conteudo.endswith(b"\r\n")
        with ZipFile(tmp_path / nome_zip, "w") as zipado:
            zipado.writestr(caminho.name, conteudo)
    return tmp_path


@pytest.fixture
def cadastro(sessao, monkeypatch):
    def pedido_inesperado(*args, **kwargs):
        pytest.fail("A coleta local tentou acessar a rede.")

    monkeypatch.setattr(httpx2.Client, "stream", pedido_inesperado)
    monkeypatch.setattr(
        tse,
        "sessao",
        partial(Session, bind=sessao.connection(), join_transaction_mode="create_savepoint"),
    )

    fonte = Fonte(url="https://cadastro.example/atual")
    sessao.add(fonte)
    sessao.flush()
    ids = {}
    for codigo, (casa, nome, uf, legislatura, condicao, ativo) in enumerate(PESSOAS, 1):
        pessoa = Parlamentar(casa=casa, id_externo=codigo, nome=nome, fonte=fonte)
        sessao.add(pessoa)
        sessao.flush()
        ids[nome] = pessoa.id
        sessao.add(
            Mandato(
                parlamentar_id=pessoa.id,
                legislatura=legislatura,
                uf=uf,
                condicao=condicao,
                em_exercicio=ativo,
                fonte=fonte,
            )
        )
    sessao.flush()
    return ids


def test_coleta_tse_liga_apenas_pares_unicos_e_registra_origens(
    arquivos,
    cadastro,
    sessao,
    capsys,
    caplog,
):
    assert main(["coleta", "tse", "--diretorio-zips", str(arquivos)]) == 0
    saida = capsys.readouterr()
    resumo = json.loads(saida.out)
    assert resumo["completa"]
    assert resumo["anos"]["2022"]["camara"] == {
        "ligados": 2,
        "sem_par": 2,
        "em_conflito": 2,
        "derrubados_pela_trava": 1,
    }
    assert resumo["anos"]["2022"]["senado"] == {
        "ligados": 1,
        "sem_par": 0,
        "em_conflito": 0,
        "derrubados_pela_trava": 1,
    }
    assert resumo["anos"]["2026"]["camara"] == {
        "ligados": 2,
        "sem_par": 3,
        "em_conflito": 2,
        "derrubados_pela_trava": 0,
    }
    assert resumo["anos"]["2026"]["senado"] == {
        "ligados": 0,
        "sem_par": 2,
        "em_conflito": 0,
        "derrubados_pela_trava": 0,
    }

    candidaturas = sessao.scalars(
        select(Candidatura).order_by(Candidatura.ano, Candidatura.id_externo)
    ).all()
    assert [(c.parlamentar_id, c.id_externo, c.cargo, c.uf, c.resultado) for c in candidaturas] == [
        (cadastro["Bia D Avelã"], 250009990001, 6, "SP", "eleito_por_qp"),
        (cadastro["Nilo da Cerração"], 250009990006, 6, "DF", "eleito_por_media"),
        (cadastro["Sora Tela de Bruma"], 250009990008, 9, "SC", "eleito"),
        (cadastro["Bia D Avelã"], 260009990001, 6, "MG", "nao_eleito"),
        (cadastro["Lina Mar Imaginário"], 260009990006, 6, "PE", "nao_eleito"),
    ]
    assert candidaturas[0].nome_urna == "BIA D'AVELÃ"
    assert candidaturas[0].partido == "FIC"
    assert candidaturas[0].numero == "01234"
    assert candidaturas[0].resultado_bruto == 2
    assert candidaturas[0].fonte.url.endswith("/consulta_cand_2022.zip")
    assert candidaturas[0].fonte.coletado_em.tzinfo is not None

    links = sessao.scalars(
        select(LinkCandidatura).order_by(LinkCandidatura.candidatura_id, LinkCandidatura.ordem)
    ).all()
    por_candidatura = {}
    for link in links:
        por_candidatura.setdefault(link.candidatura_id, []).append((link.ordem, link.url))
    assert por_candidatura == {
        candidaturas[0].id: [(1, "https://rede.example/figura-a"), (2, "https://urna.example/a")],
        candidaturas[3].id: [(1, "https://urna.example/b")],
        candidaturas[4].id: [(1, "https://urna.example/c")],
    }
    assert links[0].fonte.url.endswith("/rede_social_candidato_2022.zip")
    redes = resumo["anos"]["2022"]["arquivos"]["rede_social_candidato"]
    assert redes["descartes"] == {"linha_invalida": 1, "url_invalida": 1, "url_repetida": 1}
    assert not saida.err
    for pessoal in ("Avelã", "00000000101", "urna.example", "28/12/1984"):
        assert pessoal.casefold() not in (saida.out + caplog.text).casefold()
    assert {"cpf", "titulo_eleitor", "data_nascimento"}.isdisjoint(
        Candidatura.__table__.columns.keys()
    )


def test_repeticao_mantem_ids_e_falha_de_arquivos_preserva_os_dados(
    arquivos,
    cadastro,
    sessao,
    capsys,
):
    argumentos = ["coleta", "tse", "--diretorio-zips", str(arquivos)]
    assert main(argumentos) == 0
    ids = set(sessao.scalars(select(Candidatura.id)))
    assert main(argumentos) == 0
    assert set(sessao.scalars(select(Candidatura.id))) == ids
    assert sessao.scalar(select(func.count()).select_from(LinkCandidatura)) == 4
    fontes = (
        select(func.count()).select_from(Fonte).where(Fonte.url.like("https://cdn.tse.jus.br/%"))
    )
    assert sessao.scalar(fontes) == 8
    capsys.readouterr()

    (arquivos / "consulta_cand_2026.zip").unlink()
    (arquivos / "rede_social_candidato_2022.zip").write_bytes(b"arquivo ficticio corrompido")
    assert main(argumentos) == 1
    resumo = json.loads(capsys.readouterr().out)
    assert not resumo["completa"]
    assert resumo["anos"]["2026"]["arquivos"]["consulta_cand"]["falhas"] == {"ausente": 1}
    assert resumo["anos"]["2022"]["arquivos"]["rede_social_candidato"]["falhas"] == {"invalido": 1}
    assert resumo["anos"]["2026"]["arquivos"]["rede_social_candidato"]["gravados"] == 2
    assert ids.issubset(sessao.scalars(select(Candidatura.id)))
    assert sessao.scalar(select(func.count()).select_from(LinkCandidatura)) == 4
    assert sessao.scalar(fontes) == 10


def test_endereco_reordenado_num_arquivo_com_linha_quebrada_nao_duplica(
    arquivos,
    cadastro,
    sessao,
):
    argumentos = ["coleta", "tse", "--diretorio-zips", str(arquivos)]
    assert main(argumentos) == 0
    _alterar_csv(
        arquivos / "rede_social_candidato_2022.zip",
        b';"1";"rede.example/figura-a"',
        b';"7";"rede.example/figura-a"',
    )
    assert main(argumentos) == 0
    assert sessao.scalars(
        select(LinkCandidatura.ordem).where(LinkCandidatura.url == "https://rede.example/figura-a")
    ).all() == [7]


def _alterar_csv(path, antes, depois):
    membro = f"{path.stem}_BRASIL.csv"
    with ZipFile(path) as arquivo:
        dados = arquivo.read(membro)
    assert antes in dados
    with ZipFile(path, "w") as arquivo:
        arquivo.writestr(membro, dados.replace(antes, depois, 1))


def test_cpf_nos_dois_anos_confirma_par_com_resultado_incompativel(
    arquivos,
    cadastro,
    sessao,
    capsys,
):
    _alterar_csv(
        arquivos / "consulta_cand_2022.zip",
        b';"2";"ELEITO POR QP"\r\n',
        b';"4";"N\xc3O ELEITO"\r\n',
    )
    argumentos = ["coleta", "tse", "--diretorio-zips", str(arquivos)]
    assert main(argumentos) == 0
    candidaturas = select(Candidatura).where(Candidatura.parlamentar_id == cadastro["Bia D Avelã"])
    assert sorted(c.ano for c in sessao.scalars(candidaturas)) == [2022, 2026]
    capsys.readouterr()

    _alterar_csv(arquivos / "consulta_cand_2026.zip", b'"00000000101"', b'"00000000999"')
    assert main(argumentos) == 0
    assert sessao.scalars(candidaturas).all() == []
    resumo = json.loads(capsys.readouterr().out)
    assert resumo["anos"]["2022"]["camara"]["derrubados_pela_trava"] == 2


def test_download_le_o_zip_do_tse_com_transporte_local(arquivos):
    def devolver_zip(pedido):
        assert pedido.method == "GET"
        assert str(pedido.url) == url_arquivo("consulta_cand", 2022)
        return httpx2.Response(200, content=(arquivos / "consulta_cand_2022.zip").read_bytes())

    with (
        httpx2.Client(transport=httpx2.MockTransport(devolver_zip)) as cliente,
        abrir_zip("consulta_cand", 2022, None, cliente) as arquivo,
    ):
        assert arquivo.namelist() == ["consulta_cand_2022_BRASIL.csv"]
