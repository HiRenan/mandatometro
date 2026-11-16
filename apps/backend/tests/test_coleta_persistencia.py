"""Idempotência, fontes e transações da base compartilhada pelas duas Casas."""

from datetime import UTC, date, datetime

import pytest
from sqlalchemy import func, select

from mandatometro.coleta.http import Resposta
from mandatometro.coleta.persistencia import (
    reconciliar_exercicio,
    registrar_fonte,
    salvar_mandato,
    salvar_parlamentar,
    salvar_proposicao,
    salvar_votacao,
    sincronizar_votos,
)
from mandatometro.coleta.tipos import DadosVoto
from mandatometro.db.modelos import Fonte, Mandato, Parlamentar, Proposicao, Votacao, Voto


def fonte(sessao):
    return registrar_fonte(sessao, Resposta("https://exemplo.leg.br/votos", datetime.now(UTC), {}))


def parlamentar(sessao, fonte, casa="camara", id_externo=1):
    return salvar_parlamentar(
        sessao, casa=casa, id_externo=id_externo, nome="Pessoa inventada", fonte=fonte
    )


def proposicao(sessao, fonte, id_externo=1):
    return salvar_proposicao(
        sessao,
        casa="camara",
        id_externo=id_externo,
        sigla="PL",
        numero=id_externo,
        ano=2026,
        ementa="Ementa de exemplo",
        apelido=None,
        url_inteiro_teor=None,
        fonte=fonte,
    )


def votacao(sessao, fonte, proposicoes):
    return salvar_votacao(
        sessao,
        casa="camara",
        id_externo="1-1",
        data=date(2026, 11, 5),
        descricao="Votação de exemplo",
        resultado="aprovada",
        resultado_bruto="1",
        fonte=fonte,
        proposicoes=proposicoes,
    )


def test_repetir_atualiza_sem_duplicar_e_preserva_fontes(sessao):
    f1 = fonte(sessao)
    p1 = parlamentar(sessao, f1)
    pr1 = proposicao(sessao, f1)
    v1 = votacao(sessao, f1, [pr1])
    sincronizar_votos(sessao, v1, [DadosVoto(p1.id, "sim", "Sim", "TESTE", "SC", f1.id)])
    ids = p1.id, pr1.id, v1.id
    f2 = fonte(sessao)
    p2 = parlamentar(sessao, f2)
    pr2 = proposicao(sessao, f2)
    v2 = votacao(sessao, f2, [pr2])
    sincronizar_votos(sessao, v2, [DadosVoto(p2.id, "nao", "Não", "TESTE", "SC", f2.id)])
    assert (p2.id, pr2.id, v2.id) == ids
    for modelo in (Parlamentar, Proposicao, Votacao, Voto):
        assert sessao.scalar(select(func.count()).select_from(modelo)) == 1
    assert sessao.scalar(select(func.count()).select_from(Fonte)) == 2
    assert sessao.scalars(select(Voto)).one().valor == "nao"
    assert f1.coletado_em < f2.coletado_em


def test_relacoes_e_votos_sao_reconciliados_com_a_lista_completa(sessao):
    f = fonte(sessao)
    p = parlamentar(sessao, f)
    a, b = proposicao(sessao, f), proposicao(sessao, f, 2)
    v = votacao(sessao, f, [a, b])
    sincronizar_votos(sessao, v, [DadosVoto(p.id, "sim", "Sim", None, "SC", f.id)])
    votacao(sessao, f, [b])
    sincronizar_votos(sessao, v, [])
    assert [x.id for x in v.proposicoes] == [b.id]
    assert v.votos == []


def test_reconciliacao_respeita_casa_e_primeira_legislatura_do_senado(sessao):
    f = fonte(sessao)
    dep = parlamentar(sessao, f)
    sen = parlamentar(sessao, f, "senado")
    for pessoa, legislatura in ((dep, 57), (sen, 54), (sen, 56)):
        salvar_mandato(
            sessao,
            parlamentar_id=pessoa.id,
            legislatura=legislatura,
            uf="SC",
            condicao="Titular",
            em_exercicio=True,
            fonte=f,
        )
    # Mandato 56/57 do Senado ainda atual: não há comparação com a legislatura da Câmara.
    reconciliar_exercicio(sessao, casa="senado", atuais={(sen.id, 56)}, fonte=f)
    estados = {
        (m.parlamentar_id, m.legislatura): m.em_exercicio for m in sessao.scalars(select(Mandato))
    }
    assert estados == {(dep.id, 57): True, (sen.id, 54): False, (sen.id, 56): True}


def test_rollback_preserva_votacao_e_votos_anteriores(sessao):
    f = fonte(sessao)
    p = parlamentar(sessao, f)
    v = votacao(sessao, f, [])
    sincronizar_votos(sessao, v, [DadosVoto(p.id, "sim", "Sim", None, "SC", f.id)])
    with pytest.raises(RuntimeError), sessao.begin_nested():
        f2 = fonte(sessao)
        votacao(sessao, f2, [])
        sincronizar_votos(sessao, v, [])
        raise RuntimeError("falha da unidade")
    sessao.expire_all()
    assert v.fonte_id == f.id
    assert v.votos[0].valor == "sim"
    assert sessao.scalar(select(func.count()).select_from(Fonte)) == 1
