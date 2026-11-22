import csv
import json
from functools import partial
from io import StringIO
from itertools import count
from pathlib import Path
from zipfile import ZipFile

import httpx2
import pytest
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from mandatometro.cli import main
from mandatometro.coleta import tse
from mandatometro.coleta.tse_arquivos import abrir_zip, url_arquivo
from mandatometro.db.modelos import Candidatura, Fonte, Mandato, Parlamentar

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
        "outro_cargo": 0,
    }
    assert resumo["anos"]["2022"]["senado"] == {
        "ligados": 1,
        "sem_par": 0,
        "em_conflito": 0,
        "derrubados_pela_trava": 1,
        "outro_cargo": 0,
    }
    assert resumo["anos"]["2026"]["camara"] == {
        "ligados": 2,
        "sem_par": 2,
        "em_conflito": 3,
        "derrubados_pela_trava": 0,
        "outro_cargo": 0,
    }
    assert resumo["anos"]["2026"]["senado"] == {
        "ligados": 0,
        "sem_par": 2,
        "em_conflito": 0,
        "derrubados_pela_trava": 0,
        "outro_cargo": 0,
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

    assert not saida.err
    for pessoal in ("Avelã", "00000000101", "28/12/1984"):
        assert pessoal.casefold() not in (saida.out + caplog.text).casefold()
    assert {"cpf", "titulo_eleitor", "data_nascimento"}.isdisjoint(
        Candidatura.__table__.columns.keys()
    )


def test_repeticao_mantem_ids_e_registra_nova_fonte_por_arquivo(arquivos, cadastro, sessao, capsys):
    gravadas = select(Candidatura.id, Candidatura.parlamentar_id, Candidatura.id_externo)
    primeira = _carregar(arquivos, capsys)
    candidaturas = set(sessao.execute(gravadas))
    fontes = (
        select(func.count()).select_from(Fonte).where(Fonte.url.like("https://cdn.tse.jus.br/%"))
    )
    assert sessao.scalar(fontes) == 2
    assert _carregar(arquivos, capsys) == primeira
    assert set(sessao.execute(gravadas)) == candidaturas
    assert sessao.scalar(fontes) == 4


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
        assert str(pedido.url) == url_arquivo(2022)
        return httpx2.Response(200, content=(arquivos / "consulta_cand_2022.zip").read_bytes())

    with (
        httpx2.Client(transport=httpx2.MockTransport(devolver_zip)) as cliente,
        abrir_zip(2022, None, cliente) as arquivo,
    ):
        assert arquivo.namelist() == ["consulta_cand_2022_BRASIL.csv"]


def _gravar_fixture(pasta, ano, linhas):
    nome = f"consulta_cand_{ano}_BRASIL.csv"
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
    with ZipFile(pasta / f"consulta_cand_{ano}.zip", "w") as arquivo:
        arquivo.writestr(nome, texto.getvalue().encode("latin-1"))


def _candidatura(
    ano, id_, nome, *, uf="SP", cargo=6, nome_civil="Civil de teste", cpf="", resultado=1
):
    return {
        "ANO_ELEICAO": ano,
        "CD_ELEICAO": 4230 + ano,
        "SQ_CANDIDATO": id_,
        "SG_UF": uf,
        "CD_CARGO": cargo,
        "SG_PARTIDO": "FIC",
        "NM_URNA_CANDIDATO": nome,
        "NM_CANDIDATO": nome_civil,
        "NR_CANDIDATO": "00100",
        "NR_CPF_CANDIDATO": cpf,
        "CD_SIT_TOT_TURNO": resultado,
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
        2022,
        [
            _candidatura(2022, 1, "Urna QA Disputada"),
            _candidatura(2022, 2, "Urna QA Dois Mandatos"),
            _candidatura(2022, 3, "Urna QA Dois Mandatos", uf="MG"),
        ],
    )
    _gravar_fixture(
        arquivos,
        2026,
        [
            _candidatura(2026, 4, "Urna QA Dois Mandatos", uf="MG"),
        ],
    )
    resumo = _carregar(arquivos, capsys)
    assert resumo["2022"]["camara"]["em_conflito"] == 3
    assert resumo["2026"]["camara"]["em_conflito"] == 3
    assert sessao.scalars(select(Candidatura.id)).all() == []


@pytest.mark.parametrize(("ano_duplicado", "cargo_duplicado"), [(2022, 6), (2022, 5), (2026, 5)])
def test_cpf_duplicado_em_qualquer_casa_do_recorte_invalida_os_dois_anos(
    arquivos, sessao, cadastrar_parlamentar, capsys, ano_duplicado, cargo_duplicado
):
    cadastrar_parlamentar("camara", "Urna QA Com Par", "SP")
    cpf = "00000000901"
    candidaturas = {
        2022: [_candidatura(2022, 1, "Urna QA Com Par", cpf=cpf)],
        2026: [_candidatura(2026, 3, "Urna QA Outro Estado", uf="MG", cpf=cpf)],
    }
    candidaturas[ano_duplicado].append(
        _candidatura(ano_duplicado, 2, "Urna QA Terceira Pessoa", cpf=cpf, cargo=cargo_duplicado)
    )
    for ano, linhas in candidaturas.items():
        _gravar_fixture(arquivos, ano, linhas)
    resumo = _carregar(arquivos, capsys)
    assert [resumo[str(ano)]["camara"]["em_conflito"] for ano in (2022, 2026)] == [1, 1]
    assert resumo["2026"]["camara"]["outro_cargo"] == 0
    assert sessao.scalars(select(Candidatura.id)).all() == []


def test_outro_cargo_em_2026_preserva_o_vinculo_compativel_de_2022(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    pessoa = cadastrar_parlamentar("camara", "Urna QA Com Par", "SP")
    cpf = "00000000901"
    _gravar_fixture(arquivos, 2022, [_candidatura(2022, 1, "Urna QA Com Par", cpf=cpf)])
    _gravar_fixture(arquivos, 2026, [_candidatura(2026, 2, "Urna QA Senado", cargo=5, cpf=cpf)])

    resumo = _carregar(arquivos, capsys)
    assert resumo["2022"]["camara"]["ligados"] == 1
    assert resumo["2022"]["camara"]["outro_cargo"] == 0
    assert resumo["2026"]["camara"] == {
        "ligados": 0,
        "sem_par": 0,
        "em_conflito": 0,
        "derrubados_pela_trava": 0,
        "outro_cargo": 1,
    }
    gravadas = select(Candidatura.ano, Candidatura.parlamentar_id, Candidatura.id_externo)
    assert sessao.execute(gravadas).all() == [(2022, pessoa, 1)]


def test_outro_cargo_em_disputa_com_titular_da_outra_casa_invalida_os_dois_anos(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    nome_camara = "Urna QA Câmara"
    nome_senado = "Urna QA Senado"
    cadastrar_parlamentar("camara", nome_camara, "SP")
    cadastrar_parlamentar("senado", nome_senado, "SP", legislatura=56)
    cpf = "00000000901"
    _gravar_fixture(
        arquivos, 2022, [_candidatura(2022, 1, nome_camara, nome_civil=nome_senado, cpf=cpf)]
    )
    _gravar_fixture(arquivos, 2026, [_candidatura(2026, 2, nome_senado, cargo=5, cpf=cpf)])

    resumo = _carregar(arquivos, capsys)
    for ano in ("2022", "2026"):
        assert resumo[ano]["camara"]["em_conflito"] == 1
        assert resumo[ano]["senado"]["em_conflito"] == 1
    assert resumo["2026"]["camara"]["outro_cargo"] == 0
    assert sessao.scalars(select(Candidatura.id)).all() == []


@pytest.mark.parametrize("legislatura", [56, 57])
def test_cpf_reivindicado_por_cadeias_diferentes_derruba_ambas(
    arquivos, sessao, cadastrar_parlamentar, capsys, legislatura
):
    nome_2022 = "Urna QA Primeira Cadeia"
    nome_2026 = "Urna QA Segunda Cadeia"
    cadastrar_parlamentar("senado", nome_2022, "SP", legislatura=legislatura)
    cadastrar_parlamentar("senado", nome_2026, "MG")
    cpf = "00000000901"
    _gravar_fixture(arquivos, 2022, [_candidatura(2022, 1, nome_2022, cargo=5, cpf=cpf)])
    _gravar_fixture(arquivos, 2026, [_candidatura(2026, 2, nome_2026, uf="MG", cargo=5, cpf=cpf)])

    # Cada titular tem um par nominal em um ano e chega ao outro par pelo mesmo CPF.
    # O mandato iniciado em 2019 impede o vínculo de 2022, mas participa da disputa.
    resumo = _carregar(arquivos, capsys)
    assert [resumo[str(ano)]["senado"]["em_conflito"] for ano in (2022, 2026)] == [2, 2]
    assert sessao.scalars(select(Candidatura.id)).all() == []


def test_cpf_em_2026_sozinho_nao_busca_uma_candidatura_em_2022(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    pessoa = cadastrar_parlamentar("camara", "Urna QA Com Par", "SP")
    cpf = "00000000901"
    _gravar_fixture(
        arquivos,
        2022,
        [
            _candidatura(2022, 1, "Urna QA Outro Estado", uf="MG", cpf=cpf),
        ],
    )
    _gravar_fixture(
        arquivos,
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
        2022,
        [
            _candidatura(2022, 1, "Urna QA Com Par"),
            _candidatura(2022, 2, "Urna QA Outro Estado", uf="MG", cpf=cpf),
        ],
    )
    _gravar_fixture(
        arquivos,
        2026,
        [
            _candidatura(2026, 3, "Urna QA Com Par", cpf=cpf),
        ],
    )
    resumo = _carregar(arquivos, capsys)
    assert [resumo[str(ano)]["camara"]["em_conflito"] for ano in (2022, 2026)] == [1, 1]
    assert sessao.scalars(select(Candidatura.id)).all() == []


def test_cpf_que_alcanca_candidatura_incompativel_de_2022_invalida_a_pessoa_inteira(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    cadastrar_parlamentar("senado", "Urna QA Com Par", "SP", legislatura=56)
    cpf = "00000000901"
    _gravar_fixture(
        arquivos,
        2022,
        [
            _candidatura(2022, 1, "Urna QA Outro Estado", uf="MG", cargo=5, cpf=cpf, resultado=4),
        ],
    )
    _gravar_fixture(
        arquivos,
        2026,
        [
            _candidatura(2026, 2, "Urna QA Com Par", cargo=5, cpf=cpf),
        ],
    )
    resumo = _carregar(arquivos, capsys)
    assert [resumo[str(ano)]["senado"]["em_conflito"] for ano in (2022, 2026)] == [1, 1]
    assert resumo["2026"]["senado"]["outro_cargo"] == 0
    assert sessao.scalars(select(Candidatura.id)).all() == []


def test_recoleta_preserva_candidatura_de_quem_saiu_mesmo_com_novo_homonimo(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    nome = "Urna QA Titulares"
    anterior = cadastrar_parlamentar("camara", nome, "SP")
    atual = cadastrar_parlamentar("camara", nome, "SP", ativo=False)
    _gravar_fixture(arquivos, 2022, [_candidatura(2022, 1, nome)])
    _carregar(arquivos, capsys)
    campos = select(Candidatura.id, Candidatura.parlamentar_id, Candidatura.fonte_id)
    vinculo = sessao.execute(campos).one()
    assert vinculo.parlamentar_id == anterior

    for mandato in sessao.scalars(select(Mandato)):
        mandato.em_exercicio = mandato.parlamentar_id == atual
    sessao.flush()
    resumo = _carregar(arquivos, capsys)
    assert [resumo[str(ano)]["camara"]["em_conflito"] for ano in (2022, 2026)] == [1, 1]
    assert sessao.execute(campos).one() == vinculo


def test_titular_divergente_da_ancora_bloqueia_nova_candidatura_alcancada_em_2026(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    nome = "Urna QA Âncora Histórica"
    anterior = cadastrar_parlamentar("camara", nome, "SP")
    novo = cadastrar_parlamentar("camara", nome, "SP", ativo=False)
    cpf = "00000000901"
    _gravar_fixture(arquivos, 2022, [_candidatura(2022, 1, nome, cpf=cpf)])
    _gravar_fixture(arquivos, 2026, [_candidatura(2026, 3, "Urna QA Sem Par", uf="AM")])
    _carregar(arquivos, capsys)
    campos = select(
        Candidatura.ano, Candidatura.id_externo, Candidatura.parlamentar_id, Candidatura.fonte_id
    )
    vinculo = sessao.execute(campos).one()
    assert (vinculo.ano, vinculo.id_externo, vinculo.parlamentar_id) == (2022, 1, anterior)

    for mandato in sessao.scalars(select(Mandato)):
        mandato.em_exercicio = mandato.parlamentar_id == novo
    sessao.flush()
    _gravar_fixture(
        arquivos, 2026, [_candidatura(2026, 2, "Urna QA Em Outra UF", uf="MG", cpf=cpf)]
    )

    resumo = _carregar(arquivos, capsys)
    assert [resumo[str(ano)]["camara"]["em_conflito"] for ano in (2022, 2026)] == [1, 1]
    assert resumo["2026"]["camara"]["ligados"] == 0
    assert sessao.execute(campos).one() == vinculo


@pytest.mark.parametrize(("presente", "faltante"), [(2022, 2026), (2026, 2022)])
def test_sem_os_dois_arquivos_de_candidaturas_nao_grava_em_banco_sem_vinculos(
    arquivos, sessao, cadastrar_parlamentar, capsys, presente, faltante
):
    nome = "Urna QA Em Carga Parcial"
    cadastrar_parlamentar("camara", nome, "SP")
    _gravar_fixture(arquivos, presente, [_candidatura(presente, 1, nome)])
    (arquivos / f"consulta_cand_{faltante}.zip").unlink()
    fontes = sessao.scalars(select(Fonte.id)).all()

    resumo = _carregar(arquivos, capsys, completa=False)
    assert resumo[str(faltante)]["arquivos"]["consulta_cand"]["falhas"] == {"ausente": 1}
    assert resumo[str(presente)]["arquivos"]["consulta_cand"]["falhas"] == {
        "candidaturas_incompletas": 1
    }
    assert sessao.scalars(select(Candidatura.id)).all() == []
    assert sessao.scalars(select(Fonte.id)).all() == fontes


def test_carga_parcial_preserva_candidaturas_e_fontes_existentes(
    arquivos, cadastro, sessao, capsys
):
    _carregar(arquivos, capsys)
    fichas = select(*Candidatura.__table__.columns).order_by(Candidatura.id)
    origens = select(*Fonte.__table__.columns).order_by(Fonte.id)
    candidaturas, fontes = sessao.execute(fichas).all(), sessao.execute(origens).all()
    _alterar_csv(arquivos / "consulta_cand_2022.zip", b';"01234";', b';"00001";')
    (arquivos / "consulta_cand_2026.zip").write_bytes(b"arquivo ficticio corrompido")

    resumo = _carregar(arquivos, capsys, completa=False)
    assert resumo["2026"]["arquivos"]["consulta_cand"]["falhas"] == {"invalido": 1}
    assert resumo["2022"]["arquivos"]["consulta_cand"]["falhas"] == {"candidaturas_incompletas": 1}
    assert resumo["2022"]["camara"]["ligados"] == resumo["2026"]["camara"]["ligados"] == 0
    assert sessao.execute(fichas).all() == candidaturas
    assert sessao.execute(origens).all() == fontes


def test_recusa_na_gravacao_do_segundo_ano_reverte_os_dois_anos(arquivos, cadastro, sessao, capsys):
    fontes = sessao.scalars(select(Fonte.id)).all()
    sessao.execute(text("alter table candidatura add check (ano <> 2026)"))
    resumo = _carregar(arquivos, capsys, completa=False)
    for ano in ("2022", "2026"):
        arquivo = resumo[ano]["arquivos"]["consulta_cand"]
        assert arquivo["falhas"] == {"gravacao": 1}
        assert arquivo["gravados"] == arquivo["fontes"] == 0
    assert sessao.scalars(select(Candidatura.id)).all() == []
    assert sessao.scalars(select(Fonte.id)).all() == fontes


def test_aspas_quebradas_recuperaveis_contam_e_arquivo_segue(
    arquivos, sessao, cadastrar_parlamentar, capsys
):
    cadastrar_parlamentar("camara", "Urna QA CSV", "SP")
    _gravar_fixture(
        arquivos,
        2022,
        [
            '"campo fechado"seguido de texto',
            _candidatura(2022, 1, "Urna QA CSV"),
        ],
    )
    resumo = _carregar(arquivos, capsys)
    assert resumo["2022"]["arquivos"]["consulta_cand"]["descartes"] == {"linha_invalida": 1}
    assert sessao.scalars(select(Candidatura.id_externo)).all() == [1]
