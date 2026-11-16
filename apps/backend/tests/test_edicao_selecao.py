from datetime import UTC, date, datetime

import pytest

from mandatometro.db.modelos import Fonte, Parlamentar, Proposicao, Votacao, Voto
from mandatometro.ia.selecao import selecionar

INICIO, FIM = date(2026, 11, 9), date(2026, 11, 15)


@pytest.fixture
def dados(sessao):
    def criar(
        numero,
        *,
        casa="camara",
        dia=10,
        sigla="PL",
        descricao="Aprovado o projeto.",
        ementa="Organiza um serviço público fictício.",
        publica=True,
        ficha=True,
        proposicoes=None,
        resultado="aprovada",
        valores=(),
    ):
        fonte = Fonte(
            url=f"https://dadosabertos.camara.leg.br/api/v2/votacoes/{numero}-1",
            url_publica=f"https://www.camara.leg.br/evento-legislativo/{numero}"
            if publica
            else None,
            coletado_em=datetime(2026, 11, 16, tzinfo=UTC),
            trecho=descricao,
        )
        if proposicoes is None:
            fonte_p = Fonte(
                url=f"https://dadosabertos.camara.leg.br/api/v2/proposicoes/{numero}",
                url_publica=(
                    f"https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao={numero}"
                    if ficha
                    else None
                ),
                coletado_em=fonte.coletado_em,
                trecho=ementa,
            )
            proposicoes = [
                Proposicao(
                    casa=casa,
                    id_externo=numero,
                    sigla=sigla,
                    numero=numero,
                    ano=2026,
                    ementa=ementa,
                    fonte=fonte_p,
                )
            ]
        votacao = Votacao(
            casa=casa,
            id_externo=f"{numero}-1" if casa == "camara" else str(numero),
            data=date(2026, 11, dia),
            descricao=descricao,
            resultado=resultado,
            fonte=fonte,
            proposicoes=proposicoes,
        )
        sessao.add(votacao)
        sessao.flush()
        for indice, valor in enumerate(valores):
            pessoa = Parlamentar(
                casa=casa,
                id_externo=numero * 100 + indice,
                nome=f"Pessoa Inventada {numero} {indice}",
                fonte=fonte,
            )
            sessao.add(pessoa)
            sessao.flush()
            sessao.add(Voto(votacao=votacao, parlamentar=pessoa, valor=valor, fonte=fonte))
        sessao.flush()
        return votacao

    return criar


def test_placar_tem_prioridade_e_teto_lista_as_votacoes_cortadas(sessao, dados):
    recente = dados(10, dia=15)
    nominal = dados(20, casa="senado", dia=9, valores=("sim", "presidente", "nao_votou"))
    selecao = selecionar(sessao, INICIO, FIM, teto=1)
    assert [v.id for v in selecao.itens[0].votacoes] == [nominal.id]
    assert selecao.resumo.cortadas_pelo_teto == [f"camara:{recente.id_externo}"]
    placar = selecao.itens[0].fatos.votacoes[0].placar
    assert placar.sim == 1 and placar.presidente == 1 and placar.nao == 0
    assert "nao_votou" not in selecao.itens[0].fatos.model_dump_json()


def test_une_grupos_conectados_sem_usar_prefixo_da_votacao(sessao, dados):
    a, b = dados(10), dados(20)
    req = dados(30, sigla="REQ")
    ligacao = dados(40, proposicoes=[*a.proposicoes, *b.proposicoes, *req.proposicoes])
    # O requerimento isolado agora também afeta a matéria; não ganha notícia duplicada.
    req.proposicoes = [*req.proposicoes, *a.proposicoes]
    sessao.flush()
    selecao = selecionar(sessao, INICIO, FIM)
    assert len(selecao.itens) == 1
    item = selecao.itens[0]
    assert {v.id for v in item.votacoes} == {a.id, b.id, req.id, ligacao.id}
    assert {p.id for p in item.proposicoes} == {a.proposicoes[0].id, b.proposicoes[0].id}


def test_sem_proposicao_sai_mesmo_com_pagina_e_sem_publica_sai_com_motivo(sessao, dados):
    solta = dados(10, proposicoes=[])
    sem_pagina = dados(20, publica=False, ficha=False)
    ficha = dados(30, publica=False)
    selecao = selecionar(sessao, INICIO, FIM)
    assert selecao.resumo.sem_proposicao == [f"camara:{solta.id_externo}"]
    assert selecao.resumo.sem_pagina_publica == [f"camara:{sem_pagina.id_externo}"]
    assert selecao.itens[0].principal.id == ficha.proposicoes[0].fonte_id
    assert ficha.fonte_id in selecao.itens[0].fatos.fontes


def test_casas_separadas_datas_inclusivas_e_resultado_outro(sessao, dados):
    dados(10, dia=8)
    dados(11, dia=16)
    dados(12, dia=9, resultado="outro")
    dados(12, casa="senado", dia=15)
    selecao = selecionar(sessao, INICIO, FIM)
    assert len(selecao.itens) == 2
    assert selecao.itens[1].fatos.votacoes[0].resultado == "outro"
    assert all(v.placar is None for i in selecao.itens for v in i.fatos.votacoes)


def test_assunto_pessoal_so_conta_sem_expor_id_ou_texto(sessao, dados):
    dados(10, descricao="Concedida licença a parlamentar para tratamento de saúde.")
    dados(20, ementa="Autoriza afastamento de parlamentar.")
    dados(30, ementa="Aprimora o atendimento de saúde pública.")
    selecao = selecionar(sessao, INICIO, FIM)
    assert selecao.resumo.assunto_pessoal == 2
    assert len(selecao.itens) == 1
    assert selecao.resumo.sem_proposicao == []
    assert selecao.resumo.sem_pagina_publica == []
    assert selecao.resumo.cortadas_pelo_teto == []


def test_fatos_nao_guardam_pessoa_texto_livre_ou_ausencia(sessao, dados):
    dados(10, valores=("sim", "nao", "abstencao", "obstrucao", "presidente", "outro"))
    item = selecionar(sessao, INICIO, FIM).itens[0]
    fato = item.fatos.model_dump(mode="json")
    assert set(fato) == {"versao", "proposicoes", "votacoes", "fontes", "origem", "pendencias"}
    assert set(fato["votacoes"][0]) == {"id", "data", "resultado", "placar", "fontes"}
    assert set(fato["votacoes"][0]["placar"]) == {
        "sim",
        "nao",
        "abstencao",
        "obstrucao",
        "presidente",
    }
    texto = item.fatos.model_dump_json()
    for proibido in ("Pessoa", "parlamentar", "partido", "nao_votou", "descricao", "ementa"):
        assert proibido not in texto


def test_vazia_e_teto_invalido(sessao):
    assert selecionar(sessao, INICIO, FIM).itens == []
    with pytest.raises(ValueError):
        selecionar(sessao, INICIO, FIM, teto=0)
