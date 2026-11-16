from copy import deepcopy

import pytest
from test_edicao_revisao import abrir as abrir
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados
from test_email import CODIGO

from mandatometro.avisos.email import montar_email
from mandatometro.db.modelos import Edicao, Fonte
from mandatometro.ia.artigos import BASE, CATALOGO, sugerir
from mandatometro.ia.selecao import selecionar
from mandatometro.ia.servico import ErroEdicao, exportar, gerar, mostrar, publicar, revisar

NOVOS = {
    BASE + "o-plenario-vota-o-projeto": "O Plenário vota o projeto",
    BASE + "a-outra-casa-revisa-o-projeto": "A outra Casa revisa o projeto",
    BASE + "o-presidente-sanciona-ou-veta": "O presidente sanciona ou veta",
}


@pytest.mark.parametrize(
    "siglas,esperado",
    [
        (("PL",), BASE + "o-plenario-vota-o-projeto"),
        (("PLP",), BASE + "o-plenario-vota-o-projeto"),
        (("PL", "PLP"), BASE + "o-plenario-vota-o-projeto"),
        (("PL", "MPV"), None),
        (("PEC",), None),
        (("REQ",), None),
    ],
)
def test_sugestao_pela_forma_do_ato(sessao, dados, siglas, esperado):
    proposicoes = [dados(10 + n, sigla=s).proposicoes[0] for n, s in enumerate(siglas)]
    dados(20, proposicoes=proposicoes)
    item = selecionar(sessao, INICIO, FIM).itens[0]
    assert sugerir(item) == esperado


def test_recurso_conclusivo_continua_sugerindo_comissoes(sessao, dados):
    dados(10, descricao="Aprovado o recurso contra decisão conclusiva de comissão.")
    item = selecionar(sessao, INICIO, FIM).itens[0]
    assert sugerir(item) == BASE + "o-projeto-passa-pelas-comissoes"


@pytest.mark.parametrize("caminho,titulo", NOVOS.items())
def test_artigos_novos_no_arquivo_na_revisao_na_previa_e_no_email(
    abrir, dados, sessao, caminho, titulo
):
    dados(10)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = pronto(exportar(abrir, edicao_id))
    assert arquivo["artigos_disponiveis"][caminho] == titulo
    assert arquivo["itens"][0]["artigo_caminho"] == BASE + "o-plenario-vota-o-projeto"
    arquivo["itens"][0]["artigo_caminho"] = caminho
    assert revisar(abrir, edicao_id, arquivo)["pendencias"] == []
    assert exportar(abrir, edicao_id)["itens"][0]["artigo_caminho"] == caminho
    publicar(abrir, edicao_id)
    previa = mostrar(abrir, edicao_id, app_base_url="https://app.example.com")
    sessao.expire_all()
    edicao = sessao.get(Edicao, edicao_id)
    fontes = {
        fonte_id: sessao.get(Fonte, fonte_id)
        for item in edicao.itens
        for fonte_id in item.fatos["fontes"]
    }
    mensagem = montar_email(
        edicao,
        CODIGO,
        app_base_url="https://app.example.com",
        api_url="https://api.example.com",
        fontes=fontes,
    )
    assert previa in mensagem.texto
    assert titulo in previa and titulo in mensagem.html
    assert "https://app.example.com" + caminho in previa
    assert "https://app.example.com" + caminho in mensagem.html


def test_arquivo_com_catalogo_antigo_recusado_sem_alterar_rascunho(abrir, dados):
    dados(10)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    atual = exportar(abrir, edicao_id)
    assert len(atual["artigos_disponiveis"]) == 6
    antigo = pronto(deepcopy(atual))
    antigo["artigos_disponiveis"] = {c: t for c, t in CATALOGO.items() if c not in NOVOS}
    with pytest.raises(ErroEdicao, match="catálogo"):
        revisar(abrir, edicao_id, antigo)
    assert exportar(abrir, edicao_id) == atual
