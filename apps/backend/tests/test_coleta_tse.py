import csv
import json
from functools import partial
from io import StringIO
from itertools import count
from pathlib import Path
from traceback import format_exception
from zipfile import ZipFile

import httpx2
import pytest
from sqlalchemy import func, select, text
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
def cadastrar_parlamentar(sessao, monkeypatch):
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
    codigos = count(1)

    def cadastrar(casa, nome, uf, legislatura=57, condicao="Titular", ativo=True):
        pessoa = Parlamentar(casa=casa, id_externo=next(codigos), nome=nome, fonte=fonte)
        sessao.add(pessoa)
        sessao.flush()
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
        return pessoa.id

    return cadastrar


@pytest.fixture
def cadastro(cadastrar_parlamentar):
    return {dados[1]: cadastrar_parlamentar(*dados) for dados in PESSOAS}


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
        "ligados": 1,
        "sem_par": 2,
        "em_conflito": 3,
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
        candidaturas[2].id: [(1, "https://urna.example/b")],
        candidaturas[3].id: [(1, "https://urna.example/c")],
    }
    assert links[0].fonte.url.endswith("/rede_social_candidato_2022.zip")
    redes = resumo["anos"]["2022"]["arquivos"]["rede_social_candidato"]
    assert redes["descartes"] == {"linha_invalida": 1, "url_esquema_invalido": 1, "url_repetida": 1}
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
    campos = select(Candidatura.id, Candidatura.parlamentar_id, Candidatura.fonte_id)
    candidaturas = set(sessao.execute(campos))
    capsys.readouterr()

    (arquivos / "consulta_cand_2026.zip").unlink()
    (arquivos / "rede_social_candidato_2022.zip").write_bytes(b"arquivo ficticio corrompido")
    assert main(argumentos) == 1
    resumo = json.loads(capsys.readouterr().out)
    assert not resumo["completa"]
    assert resumo["anos"]["2026"]["arquivos"]["consulta_cand"]["falhas"] == {"ausente": 1}
    assert resumo["anos"]["2022"]["arquivos"]["consulta_cand"]["falhas"] == {
        "candidaturas_incompletas": 1
    }
    assert resumo["anos"]["2022"]["arquivos"]["rede_social_candidato"]["falhas"] == {"invalido": 1}
    assert resumo["anos"]["2026"]["arquivos"]["rede_social_candidato"]["gravados"] == 2
    assert set(sessao.execute(campos)) == candidaturas
    assert sessao.scalar(select(func.count()).select_from(LinkCandidatura)) == 4
    assert sessao.scalar(fontes) == 9


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


def test_cpf_nos_dois_anos_nao_substitui_a_trava_do_mandato(
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


def _gravar_fixture(pasta, tipo, ano, linhas):
    nome = f"{tipo}_{ano}_BRASIL.csv"
    with (FIXTURES / nome).open(encoding="latin-1", newline="") as origem:
        campos = next(csv.reader(origem, delimiter=";"))
    texto = StringIO(newline="")
    autor = csv.writer(texto, delimiter=";", quoting=csv.QUOTE_ALL)
    autor.writerow(campos)
    for linha in linhas:
        if isinstance(linha, str):
            texto.write(linha + "\r\n")
        else:
            autor.writerow([linha.get(campo, "#NE") for campo in campos])
    with ZipFile(pasta / f"{tipo}_{ano}.zip", "w") as arquivo:
        arquivo.writestr(nome, texto.getvalue().encode("latin-1"))


def _candidatura(ano, id_, nome, *, uf="SP", cargo=6, cpf="", resultado=1):
    return {
        "ANO_ELEICAO": ano,
        "CD_ELEICAO": 4230 + ano,
        "SQ_CANDIDATO": id_,
        "SG_UF": uf,
        "CD_CARGO": cargo,
        "SG_PARTIDO": "FIC",
        "NM_URNA_CANDIDATO": nome,
        "NM_CANDIDATO": "Civil de teste",
        "NR_CANDIDATO": "00100",
        "NR_CPF_CANDIDATO": cpf,
        "CD_SIT_TOT_TURNO": resultado,
    }


def _rede(ano, id_, url):
    return {
        "AA_ELEICAO": ano,
        "CD_ELEICAO": 4230 + ano,
        "SQ_CANDIDATO": id_,
        "SG_UF": "SP",
        "NR_ORDEM_REDE_SOCIAL": 1,
        "DS_URL": url,
    }


def _carregar(arquivos, capsys, *, completa=True):
    assert main(["coleta", "tse", "--diretorio-zips", str(arquivos)]) == (0 if completa else 1)
    saida = capsys.readouterr()
    assert not saida.err
    return json.loads(saida.out)["anos"]


def test_busca_nominal_exige_uf_e_cargo_e_grava_o_codigo_da_eleicao(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    cadastrar_parlamentar("camara", "Urna QA Fora da UF", "SP")
    cadastrar_parlamentar("camara", "Urna QA Cargo Sete", "SP")
    suplente = cadastrar_parlamentar("senado", "Urna QA Segundo Suplente", "SP")
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2022,
        [
            _candidatura(2022, 1, "Urna QA Fora da UF", uf="MG"),
            _candidatura(2022, 2, "Urna QA Cargo Sete", cargo=7),
            _candidatura(2022, 3, "Urna QA Segundo Suplente", cargo=10, resultado=5),
        ],
    )
    resumo = _carregar(arquivos, capsys)["2022"]
    assert resumo["camara"]["sem_par"] == 2 and resumo["senado"]["ligados"] == 1
    assert sessao.execute(
        select(Candidatura.parlamentar_id, Candidatura.codigo_eleicao, Candidatura.id_externo)
    ).all() == [(suplente, 6252, 3)]


def test_candidatura_disputada_e_dois_pares_do_mesmo_parlamentar_ficam_em_conflito(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    dois = cadastrar_parlamentar("camara", "Urna QA Dois Mandatos", "SP")
    cadastrar_parlamentar("camara", "Urna QA Disputada", "SP")
    cadastrar_parlamentar("camara", "Urna QA Disputada", "SP")
    parlamentar = sessao.get(Parlamentar, dois)
    sessao.add(
        Mandato(
            parlamentar_id=dois,
            legislatura=56,
            uf="MG",
            em_exercicio=True,
            condicao="Titular",
            fonte_id=parlamentar.fonte_id,
        )
    )
    sessao.flush()
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2022,
        [
            _candidatura(2022, 1, "Urna QA Disputada"),
            _candidatura(2022, 2, "Urna QA Dois Mandatos"),
            _candidatura(2022, 3, "Urna QA Dois Mandatos", uf="MG"),
        ],
    )
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2026,
        [
            _candidatura(2026, 4, "Urna QA Dois Mandatos", uf="MG"),
        ],
    )
    resumo = _carregar(arquivos, capsys)
    assert resumo["2022"]["camara"]["em_conflito"] == 3
    assert resumo["2026"]["camara"]["ligados"] == 1
    assert sessao.execute(select(Candidatura.parlamentar_id, Candidatura.id_externo)).all() == [
        (dois, 4)
    ]


@pytest.mark.parametrize("cargo_duplicado", [6, 5])
def test_cpf_duplicado_em_qualquer_casa_do_recorte_invalida_os_dois_anos(
    arquivos, sessao, cadastrar_parlamentar, capsys, cargo_duplicado
):
    cadastrar_parlamentar("camara", "Urna QA Com Par", "SP")
    cpf = "00000000901"
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2022,
        [
            _candidatura(2022, 1, "Urna QA Com Par", cpf=cpf),
            _candidatura(2022, 2, "Urna QA Terceira Pessoa", cpf=cpf, cargo=cargo_duplicado),
        ],
    )
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2026,
        [
            _candidatura(2026, 3, "Urna QA Outro Estado", uf="MG", cpf=cpf),
        ],
    )
    resumo = _carregar(arquivos, capsys)
    assert [resumo[str(ano)]["camara"]["em_conflito"] for ano in (2022, 2026)] == [1, 1]
    assert sessao.scalars(select(Candidatura.id)).all() == []


def test_cpf_em_2026_sozinho_nao_busca_uma_candidatura_em_2022(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    pessoa = cadastrar_parlamentar("camara", "Urna QA Com Par", "SP")
    cpf = "00000000901"
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2022,
        [
            _candidatura(2022, 1, "Urna QA Outro Estado", uf="MG", cpf=cpf),
        ],
    )
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2026,
        [
            _candidatura(2026, 2, "Urna QA Com Par", cpf=cpf),
        ],
    )
    resumo = _carregar(arquivos, capsys)
    assert resumo["2022"]["camara"]["sem_par"] == 1
    assert resumo["2026"]["camara"]["ligados"] == 1
    assert sessao.execute(select(Candidatura.parlamentar_id, Candidatura.id_externo)).all() == [
        (pessoa, 2)
    ]


def test_cpf_que_contradiz_par_nominal_sem_documento_invalida_os_dois_anos(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    cadastrar_parlamentar("camara", "Urna QA Com Par", "SP")
    cpf = "00000000901"
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2022,
        [
            _candidatura(2022, 1, "Urna QA Com Par"),
            _candidatura(2022, 2, "Urna QA Outro Estado", uf="MG", cpf=cpf),
        ],
    )
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2026,
        [
            _candidatura(2026, 3, "Urna QA Com Par", cpf=cpf),
        ],
    )
    resumo = _carregar(arquivos, capsys)
    assert [resumo[str(ano)]["camara"]["em_conflito"] for ano in (2022, 2026)] == [1, 1]
    assert sessao.scalars(select(Candidatura.id)).all() == []


def test_cpf_que_alcanca_candidatura_incompativel_invalida_a_pessoa_inteira(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    cadastrar_parlamentar("senado", "Urna QA Com Par", "SP", legislatura=56)
    cpf = "00000000901"
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2022,
        [
            _candidatura(2022, 1, "Urna QA Outro Estado", uf="MG", cargo=5, cpf=cpf, resultado=4),
        ],
    )
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2026,
        [
            _candidatura(2026, 2, "Urna QA Com Par", cargo=5, cpf=cpf),
        ],
    )
    resumo = _carregar(arquivos, capsys)
    assert [resumo[str(ano)]["senado"]["em_conflito"] for ano in (2022, 2026)] == [1, 1]
    assert sessao.scalars(select(Candidatura.id)).all() == []


def test_recoleta_preserva_candidatura_de_quem_saiu_mesmo_com_novo_homonimo(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    nome = "Urna QA Titulares"
    anterior = cadastrar_parlamentar("camara", nome, "SP")
    atual = cadastrar_parlamentar("camara", nome, "SP", ativo=False)
    _gravar_fixture(arquivos, "consulta_cand", 2022, [_candidatura(2022, 1, nome)])
    _gravar_fixture(
        arquivos,
        "rede_social_candidato",
        2022,
        [
            _rede(2022, 1, "https://perfil.example/a"),
        ],
    )
    _carregar(arquivos, capsys)
    campos = select(Candidatura.id, Candidatura.parlamentar_id, Candidatura.fonte_id)
    vinculo = sessao.execute(campos).one()
    link = sessao.execute(select(LinkCandidatura.candidatura_id, LinkCandidatura.fonte_id)).one()
    assert vinculo.parlamentar_id == anterior

    for mandato in sessao.scalars(select(Mandato)):
        mandato.em_exercicio = mandato.parlamentar_id == atual
    sessao.flush()
    resumo = _carregar(arquivos, capsys)
    assert resumo["2022"]["camara"]["em_conflito"] == 1
    assert sessao.execute(campos).one() == vinculo
    assert (
        sessao.execute(select(LinkCandidatura.candidatura_id, LinkCandidatura.fonte_id)).one()
        == link
    )


def test_sem_os_dois_arquivos_de_candidaturas_o_par_valido_fica_sem_gravacao(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    cadastrar_parlamentar("camara", "Urna QA Em Carga Parcial", "SP")
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2022,
        [
            _candidatura(2022, 1, "Urna QA Em Carga Parcial"),
        ],
    )
    (arquivos / "consulta_cand_2026.zip").unlink()
    resumo = _carregar(arquivos, capsys, completa=False)
    assert resumo["2022"]["arquivos"]["consulta_cand"]["falhas"] == {"candidaturas_incompletas": 1}
    assert sessao.scalars(select(Candidatura.id)).all() == []


def test_aspas_quebradas_recuperaveis_contam_e_arquivo_segue(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    cadastrar_parlamentar("camara", "Urna QA CSV", "SP")
    _gravar_fixture(
        arquivos,
        "consulta_cand",
        2022,
        [
            '"campo fechado"seguido de texto',
            _candidatura(2022, 1, "Urna QA CSV"),
        ],
    )
    resumo = _carregar(arquivos, capsys)
    assert resumo["2022"]["arquivos"]["consulta_cand"]["descartes"] == {"linha_invalida": 1}
    assert sessao.scalars(select(Candidatura.id_externo)).all() == [1]


def test_falha_de_gravacao_dos_links_oculta_url_e_links_do_outro_ano_seguem(
    arquivos, cadastro, sessao, capsys, caplog, monkeypatch
):
    url_lida = "https://teste.example/privacidade-da-gravacao?origem=qa.example"
    url_limpa = "https://teste.example/privacidade-da-gravacao"
    _gravar_fixture(
        arquivos,
        "rede_social_candidato",
        2022,
        [
            {
                **_rede(2022, 250009990001, url_lida),
                "CD_ELEICAO": 546,
            }
        ],
    )
    sessao.execute(
        text("alter table link_candidatura add check (url not like '%/privacidade-da-gravacao')")
    )
    rastros = []
    registrar = tse.ResumoArquivo.registrar_falha

    def observar(self, erro):
        assert erro.__context__ is None
        rastros.extend(format_exception(erro))
        registrar(self, erro)

    monkeypatch.setattr(tse.ResumoArquivo, "registrar_falha", observar)
    resumo = _carregar(arquivos, capsys, completa=False)
    assert resumo["2022"]["arquivos"]["rede_social_candidato"]["falhas"] == {"gravacao": 1}
    assert resumo["2022"]["camara"]["ligados"] == 1
    assert resumo["2026"]["camara"]["ligados"] == 2
    assert resumo["2026"]["arquivos"]["rede_social_candidato"]["gravados"] == 2
    assert rastros
    for valor in (url_lida, url_limpa):
        assert valor not in (json.dumps(resumo) + caplog.text + "".join(rastros))
