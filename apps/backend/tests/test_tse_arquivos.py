from collections import Counter
from io import BytesIO
from zipfile import ZipFile, ZipInfo

import httpx2
import pytest

from mandatometro.coleta import tse_arquivos as tse

MEMBRO = "consulta_cand_2022_BRASIL.csv"
CAMPOS = {"ID", "NOME"}
DADOS = '"ID";"NOME"\r\n"1";"Urna fictícia"\r\n'


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
        assert str(pedido.url) == tse.url_arquivo(2022)
        return httpx2.Response(200, headers={"content-length": "1"}, content=b"sete123")

    with (
        httpx2.Client(transport=httpx2.MockTransport(resposta)) as cliente,
        pytest.raises(tse.ArquivoInvalido, match="Download do ZIP acima do limite"),
        tse.abrir_zip(2022, None, cliente),
    ):
        pytest.fail("O limite deveria ser aplicado antes de abrir o ZIP.")
