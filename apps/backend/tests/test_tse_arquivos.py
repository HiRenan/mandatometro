from collections import Counter
from io import BytesIO
from zipfile import ZipFile, ZipInfo

import httpx2
import pytest

from mandatometro.coleta import tse_arquivos as tse

MEMBRO = "consulta_cand_2022_BRASIL.csv"
CAMPOS = {"ID", "NOME"}
DADOS = '"ID";"NOME"\r\n"1";"Urna fictícia"\r\n'


@pytest.mark.parametrize(
    ("entrada", "esperada"),
    [
        ("perfil.example/campanha", "https://perfil.example/campanha"),
        ("//perfil.example/campanha", "https://perfil.example/campanha"),
        ("http://perfil.example/1234567", "http://perfil.example/1234567"),
        (
            "https://usuario:senha@PERFIL.EXAMPLE:8000/campanha;dado=teste?dado=teste#teste",
            "https://perfil.example/campanha",
        ),
    ],
)
def test_url_conserva_apenas_esquema_host_e_caminho(entrada, esperada):
    assert tse._url_declarada(entrada) == esperada


@pytest.mark.parametrize(
    ("entrada", "motivo"),
    [
        ("ftp://perfil.example/campanha", "esquema_invalido"),
        ("contato@perfil.example", "email_avulso"),
        ("mailto:contato@perfil.example", "esquema_invalido"),
        ("https://perfil.example/contato@perfil.example", "caminho_arroba"),
        ("https://perfil.example/contato%252540perfil.example", "caminho_arroba"),
        ("https://perfil.example/Rua%2520Inventada", "caminho_espaco"),
        ("https://perfil.example/Rua Inventada", "caminho_espaco"),
        ("https://perfil.example/12345678", "caminho_digitos"),
        ("https://perfil.example/%2531%2532%2533%2534%2535%2536%2537%2538", "caminho_digitos"),
        ("https://./campanha", "host_invalido"),
        ("https://perfil..example/campanha", "host_invalido"),
        ("https://-perfil.example/campanha", "host_invalido"),
        ("https://[perfil.example/campanha", "host_invalido"),
        ("https://wa.me/campanha", "mensagens_por_telefone"),
        ("https://conversa.wa.me/campanha", "mensagens_por_telefone"),
        ("https://whatsapp.com/campanha", "mensagens_por_telefone"),
        ("https://conversa.whatsapp.com/campanha", "mensagens_por_telefone"),
    ],
)
def test_url_recusada_tem_motivo_fixo_sem_o_valor(entrada, motivo):
    with pytest.raises(tse.UrlInvalida, match=f"^{motivo}$") as erro:
        tse._url_declarada(entrada)
    assert erro.value.__context__ is None


def _zip_em_memoria(dados):
    temporario = BytesIO()
    with ZipFile(temporario, "w") as arquivo:
        arquivo.writestr(MEMBRO, dados)
    return ZipFile(temporario)


@pytest.mark.parametrize("codificacao", ["utf-8", "utf-8-sig", "utf-16", "utf-16-le"])
def test_csv_com_codificacao_errada_e_invalido(codificacao):
    with (
        _zip_em_memoria(DADOS.encode(codificacao)) as arquivo,
        pytest.raises(tse.ArquivoInvalido, match="latin-1"),
    ):
        list(tse._linhas(arquivo, MEMBRO, CAMPOS, Counter()))


def test_csv_latin_1_tem_uma_linha_e_falha_se_o_registro_final_foi_truncado():
    dados = DADOS.encode("latin-1")
    with _zip_em_memoria(dados) as arquivo:
        assert list(tse._linhas(arquivo, MEMBRO, CAMPOS, Counter())) == [
            {"ID": "1", "NOME": "Urna fictícia"}
        ]
    with (
        _zip_em_memoria(dados + b'"2";"registro truncado') as arquivo,
        pytest.raises(tse.ArquivoInvalido, match="Registro CSV truncado"),
    ):
        list(tse._linhas(arquivo, MEMBRO, CAMPOS, Counter()))


def test_membro_acima_do_limite_declarado_e_recusado(monkeypatch):
    monkeypatch.setattr(tse, "LIMITE_MEMBRO", 16)
    with (
        _zip_em_memoria(DADOS.encode("latin-1")) as arquivo,
        pytest.raises(tse.ArquivoInvalido, match="Membro do ZIP acima do limite"),
    ):
        list(tse._linhas(arquivo, MEMBRO, CAMPOS, Counter()))


def test_limite_do_membro_conta_os_bytes_lidos_alem_da_metadata(monkeypatch):
    class Arquivo:
        def getinfo(self, membro):
            return ZipInfo(membro)

        def open(self, _info):
            return BytesIO(DADOS.encode("latin-1"))

    monkeypatch.setattr(tse, "LIMITE_MEMBRO", 16)
    with pytest.raises(tse.ArquivoInvalido, match="Membro do ZIP acima do limite"):
        list(tse._linhas(Arquivo(), MEMBRO, CAMPOS, Counter()))


def test_limite_do_download_conta_os_bytes_da_resposta(monkeypatch):
    monkeypatch.setattr(tse, "LIMITE_DOWNLOAD", 6)

    def resposta(pedido):
        assert str(pedido.url) == tse.url_arquivo(tse.CANDIDATURAS, 2022)
        return httpx2.Response(200, headers={"content-length": "1"}, content=b"sete123")

    with (
        httpx2.Client(transport=httpx2.MockTransport(resposta)) as cliente,
        pytest.raises(tse.ArquivoInvalido, match="Download do ZIP acima do limite"),
        tse.abrir_zip(tse.CANDIDATURAS, 2022, None, cliente),
    ):
        pytest.fail("O limite deveria ser aplicado antes de abrir o ZIP.")
