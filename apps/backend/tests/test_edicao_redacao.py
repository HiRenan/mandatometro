import json

import pytest
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.ia.privacidade import identificacao
from mandatometro.ia.redacao import RespostaRedator, redigir
from mandatometro.ia.selecao import selecionar


class Falso:
    def __init__(self, conteudo=None, motivo="end_turn", erro=False):
        self.conteudo = conteudo or {
            "titulo": "Proposta em análise",
            "explicacao": ["Explicação impessoal."],
        }
        self.motivo, self.erro, self.entradas = motivo, erro, []

    def escrever(self, entrada):
        self.entradas.append(entrada)
        if self.erro:
            raise RuntimeError("Mensagem de erro que não deve sair.")
        return RespostaRedator(self.conteudo, self.motivo)


@pytest.mark.parametrize(
    "texto",
    [
        "Dep. Pessoa",
        "Deputada fictícia",
        "Sen. Pessoa",
        "Senadora fictícia",
        "ABC-SC",
        "ABC / DF",
        "PÉSSOA INVENTADA",
    ],
)
def test_retencao_por_tratamento_nome_composto_ou_partido_uf(texto):
    assert identificacao(texto, ["Pessoa Inventada"])


def test_nome_de_uma_palavra_nao_retem_palavra_comum():
    assert not identificacao("Proposta sobre o Campo.", ["Campo"])
    assert not identificacao("O Senado votou a proposta.", [])


def test_entrada_so_tem_textos_publicos_e_agregados(sessao, dados):
    dados(10, valores=("sim", "nao", "presidente", "nao_votou", "outro"))
    selecao = selecionar(sessao, INICIO, FIM)
    falso = Falso()
    gerado = redigir(selecao.itens[0], selecao.nomes, falso)
    assert gerado.origem == "modelo"
    assert len(falso.entradas) == 1
    entrada = json.dumps(falso.entradas[0], ensure_ascii=False)
    assert all(nome not in entrada for nome in selecao.nomes)
    for proibido in ("parlamentar_id", "partido", "nao_votou", "inscrito", "valor_bruto"):
        assert proibido not in json.dumps(falso.entradas[0]["fatos"])


@pytest.mark.parametrize("campo", ["descricao", "ementa"])
def test_texto_identificador_retido_inteiro_sem_chamada_ou_copia(sessao, dados, campo):
    dados(10, valores=("sim",), **{campo: "Ato de Pessoa Inventada 10 0 e uma oração impessoal."})
    selecao = selecionar(sessao, INICIO, FIM)
    falso = Falso()
    gerado = redigir(selecao.itens[0], selecao.nomes, falso)
    assert gerado.origem == "codigo" and gerado.motivo == "texto_retido"
    assert not falso.entradas
    assert "oração impessoal" not in gerado.texto
    assert all(nome not in gerado.texto for nome in selecao.nomes)


@pytest.mark.parametrize("motivo", ["refusal", "max_tokens", "tool_use"])
def test_recusa_e_corte_usam_codigo_sem_segunda_chamada(sessao, dados, motivo):
    dados(10)
    selecao = selecionar(sessao, INICIO, FIM)
    falso = Falso(motivo=motivo)
    assert redigir(selecao.itens[0], selecao.nomes, falso).origem == "codigo"
    assert len(falso.entradas) == 1


@pytest.mark.parametrize(
    "conteudo",
    [
        {"titulo": "Proposta 1", "explicacao": ["Explicação."]},
        {"titulo": "Proposta", "explicacao": ["Recebeu ٢ votos."]},
        {"titulo": "Proposta", "explicacao": ["https://exemplo.com"]},
        {"titulo": "Proposta", "explicacao": ["<b>Texto</b>"]},
        {"titulo": "Proposta", "explicacao": "Texto"},
        {"titulo": "Proposta", "explicacao": ["Texto"], "resultado": "aprovada"},
        {"titulo": "  ", "explicacao": ["Texto"]},
    ],
)
def test_resposta_invalida_nao_entra_no_item(sessao, dados, conteudo):
    dados(10)
    selecao = selecionar(sessao, INICIO, FIM)
    assert redigir(selecao.itens[0], selecao.nomes, Falso(conteudo)).origem == "codigo"


def test_sem_provedor_e_excecao_nao_impedem_o_rascunho(sessao, dados, caplog):
    dados(10)
    selecao = selecionar(sessao, INICIO, FIM)
    assert redigir(selecao.itens[0], selecao.nomes, None).motivo == "sem_provedor"
    assert redigir(selecao.itens[0], selecao.nomes, Falso(erro=True)).motivo == "falha_provedor"
    assert "Mensagem de erro" not in caplog.text


def test_adaptador_sem_resposta_estruturada_usa_codigo(sessao, dados):
    class SemResposta:
        def escrever(self, entrada):
            return None

    dados(10)
    selecao = selecionar(sessao, INICIO, FIM)
    assert redigir(selecao.itens[0], selecao.nomes, SemResposta()).motivo == "resposta_invalida"
