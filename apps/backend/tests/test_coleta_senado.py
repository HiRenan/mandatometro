"""O conector usa respostas gravadas e confirma cada votação de forma independente."""

import copy
import json
from collections import Counter
from datetime import date
from pathlib import Path

import httpx2
import pytest
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from mandatometro.coleta.cli import mostrar_resumo
from mandatometro.coleta.http import ClienteHttp
from mandatometro.coleta.senado import coletar
from mandatometro.db.modelos import Fonte, Mandato, Parlamentar, Proposicao, Votacao, Voto

FIXTURES = Path(__file__).parent / "fixtures/senado"
INICIO, FIM = date(2026, 11, 3), date(2026, 11, 7)
BASE = "https://legis.senado.leg.br/dadosabertos"


def ler(nome):
    return json.loads((FIXTURES / nome).read_text(encoding="utf-8"))


@pytest.fixture
def respostas():
    return {
        "/senador/lista/atual.json": ler("senador-lista-atual.json"),
        "/votacao": ler("votacao-2026-11-03_2026-11-07.json"),
        "/processo/9006525": ler("processo-9006525.json"),
        "/senador/5672/mandatos.json": ler("senador-5672-mandatos.json"),
        "/senador/4525/mandatos.json": ler("senador-4525-mandatos.json"),
    }


@pytest.fixture
def executar(sessao, respostas):
    def rodar(inicio=INICIO, fim=FIM):
        requisicoes = []

        def atender(req):
            requisicoes.append(req)
            assert req.headers["accept"] in ("application/json", "text/plain")
            if req.url.path == "/robots.txt":
                return httpx2.Response(403)
            caminho = req.url.path.removeprefix("/dadosabertos")
            assert caminho in respostas, f"Consulta inesperada: {caminho}"
            dado = respostas[caminho]
            if isinstance(dado, int):
                return httpx2.Response(dado)
            if callable(dado):
                dado = dado(req)
            return httpx2.Response(200, json=dado)

        conexao = sessao.connection()
        with (
            httpx2.Client(transport=httpx2.MockTransport(atender)) as transporte,
            ClienteHttp(BASE, cliente=transporte, intervalo=0, tentativas=1) as http,
        ):
            resumo = coletar(
                inicio,
                fim,
                http=http,
                abrir_sessao=lambda: Session(
                    bind=conexao, join_transaction_mode="create_savepoint"
                ),
            )
        sessao.expire_all()
        return resumo, requisicoes

    return rodar


def total(sessao, modelo):
    return sessao.scalar(select(func.count()).select_from(modelo))


def fontes_por_id(sessao):
    consulta = select(Fonte.id, Fonte.coletado_em, Fonte.trecho).order_by(Fonte.id)
    return {f.id: (f.coletado_em, f.trecho) for f in sessao.execute(consulta)}


def test_semana_real_usa_um_processo_sem_detalhes_dos_81_senadores(sessao, executar):
    resumo, requisicoes = executar()
    assert resumo.completa
    assert (resumo.parlamentares, resumo.mandatos, resumo.proposicoes) == (81, 81, 1)
    assert (resumo.votacoes, resumo.votos, resumo.fontes, resumo.chamadas) == (4, 324, 10, 4)
    assert [r.url.path for r in requisicoes] == [
        "/robots.txt",
        "/dadosabertos/senador/lista/atual.json",
        "/dadosabertos/votacao",
        "/dadosabertos/processo/9006525",
    ]
    assert dict(requisicoes[2].url.params) == {"dataInicio": "2026-11-03", "dataFim": "2026-11-07"}
    assert Counter(sessao.scalars(select(Mandato.legislatura))) == {56: 54, 57: 27}
    assert sorted(sessao.scalars(select(Votacao.id_externo))) == ["7109", "7110", "7111", "7112"]
    assert total(sessao, Voto) == 324
    materia = sessao.scalars(select(Proposicao)).one()
    assert (materia.id_externo, materia.sigla, materia.numero, materia.ano) == (
        9006525,
        "PEC",
        18,
        2025,
    )
    assert materia.ementa
    assert materia.url_inteiro_teor.startswith("https://")
    assert materia.fonte.trecho == materia.ementa
    assert materia.fonte.url_publica.endswith("/materia/172997")
    for votacao in sessao.scalars(select(Votacao)):
        assert votacao.fonte.trecho == votacao.descricao
        assert votacao.fonte.url_publica.endswith(
            f"/materia/172997/votacoes#votacao_{votacao.id_externo}"
        )
        assert {v.fonte.trecho for v in votacao.votos} == {None}
        assert {v.fonte.url for v in votacao.votos} == {votacao.fonte.url}


def test_repetir_preserva_ids_fontes_e_corrige_remove_votos(sessao, executar, respostas):
    executar()
    ids = set(sessao.execute(select(Votacao.id, Votacao.id_externo)))
    fontes_antes = fontes_por_id(sessao)
    votos = respostas["/votacao"][0]["votos"]
    removido = votos.pop()["codigoParlamentar"]
    votos[0]["siglaVotoParlamentar"] = "Abstenção"
    resumo, _ = executar()
    assert resumo.completa
    assert (total(sessao, Parlamentar), total(sessao, Mandato), total(sessao, Proposicao)) == (
        81,
        81,
        1,
    )
    assert (total(sessao, Votacao), total(sessao, Voto), total(sessao, Fonte)) == (4, 323, 20)
    assert set(sessao.execute(select(Votacao.id, Votacao.id_externo))) == ids
    fontes_depois = fontes_por_id(sessao)
    fontes_divergentes = [
        id_fonte for id_fonte, dados in fontes_antes.items() if fontes_depois.get(id_fonte) != dados
    ]
    assert not fontes_divergentes
    quantidade_novas = len(fontes_depois.keys() - fontes_antes.keys())
    assert quantidade_novas == 10
    v = sessao.scalars(select(Votacao).where(Votacao.id_externo == "7109")).one()
    por_id = {voto.parlamentar.id_externo: voto.valor for voto in v.votos}
    assert removido not in por_id
    assert por_id[votos[0]["codigoParlamentar"]] == "abstencao"


def lista(respostas):
    return respostas["/senador/lista/atual.json"]["ListaParlamentarEmExercicio"]["Parlamentares"][
        "Parlamentar"
    ]


def test_sai_da_lista_desativa_senado_mas_preserva_camara(sessao, executar, respostas):
    executar()
    fonte = sessao.scalars(select(Fonte)).first()
    dep = Parlamentar(casa="camara", id_externo=5672, nome="Pessoa inventada", fonte=fonte)
    mandato_camara = Mandato(
        parlamentar=dep, legislatura=57, uf="SC", condicao="Titular", em_exercicio=True, fonte=fonte
    )
    sessao.add(mandato_camara)
    sessao.flush()
    lista(respostas)[:] = [
        item
        for item in lista(respostas)
        if item["IdentificacaoParlamentar"]["CodigoParlamentar"] != "5672"
    ]
    resumo, requisicoes = executar()
    assert resumo.completa
    assert sum(r.url.path.endswith("/5672/mandatos.json") for r in requisicoes) == 1
    mandatos = dict(
        sessao.execute(
            select(Parlamentar.casa, Mandato.em_exercicio)
            .join(Mandato)
            .where(Parlamentar.id_externo == 5672)
        ).all()
    )
    assert mandatos == {"camara": True, "senado": False}


def test_quem_esta_na_lista_atual_nao_pede_historico_nem_para_voto_antigo(executar, respostas):
    for v in respostas["/votacao"]:
        v["dataSessao"] = "2010-11-03"
    resumo, requisicoes = executar(date(2010, 11, 1), date(2010, 11, 7))
    assert resumo.completa
    assert not any("mandatos.json" in r.url.path for r in requisicoes)


@pytest.mark.parametrize("historico", ["valido", "falha", "sem_correspondencia"])
def test_votante_fora_da_lista_preserva_votacao_se_historico_falhar(
    sessao, executar, respostas, historico
):
    votos = respostas["/votacao"]
    for v in votos:
        v["dataSessao"] = "2022-11-03"
        v["votos"].append(
            {
                "codigoParlamentar": 4525,
                "nomeParlamentar": "Pessoa de teste",
                "siglaPartidoParlamentar": "TESTE",
                "siglaUFParlamentar": "AL",
                "siglaVotoParlamentar": "Sim",
            }
        )
    if historico == "falha":
        respostas["/senador/4525/mandatos.json"] = 503
    if historico == "sem_correspondencia":
        for v in votos:
            v["dataSessao"] = "1990-11-03"
    ano = 1990 if historico == "sem_correspondencia" else 2022
    resumo, requisicoes = executar(date(ano, 11, 1), date(ano, 11, 7))
    assert (resumo.votacoes, resumo.votos, resumo.parlamentares) == (4, 328, 82)
    assert sum(r.url.path.endswith("/4525/mandatos.json") for r in requisicoes) == 1
    assert resumo.falhas_votacoes == []
    assert resumo.falhas_parlamentares == (0 if historico == "valido" else 1)
    assert resumo.completa == (historico == "valido")
    mandatos = sessao.execute(
        select(Mandato.legislatura, Mandato.em_exercicio)
        .join(Parlamentar)
        .where(Parlamentar.id_externo == 4525)
    ).all()
    assert mandatos == ([(55, False)] if historico == "valido" else [])


def test_historico_ambiguo_nao_inventa_mandato(sessao, executar, respostas):
    lista(respostas)[:] = [
        p for p in lista(respostas) if p["IdentificacaoParlamentar"]["CodigoParlamentar"] != "5672"
    ]
    d = respostas["/senador/5672/mandatos.json"]["MandatoParlamentar"]["Parlamentar"]
    m = d["Mandatos"]["Mandato"]
    d["Mandatos"]["Mandato"] = [m, copy.deepcopy(m)]
    resumo, _ = executar()
    assert resumo.votacoes == 4
    assert resumo.falhas_parlamentares == 1
    assert not resumo.completa
    assert (
        sessao.scalar(
            select(func.count())
            .select_from(Mandato)
            .join(Parlamentar)
            .where(Parlamentar.id_externo == 5672)
        )
        == 0
    )


@pytest.mark.parametrize("lista_ruim", [[], None, [{"IdentificacaoParlamentar": {}}]])
def test_lista_atual_invalida_nao_desativa_nem_apaga_dados(sessao, executar, respostas, lista_ruim):
    executar()
    consulta = select(Mandato.id, Mandato.em_exercicio, Mandato.fonte_id)
    mandatos_antes = set(sessao.execute(consulta))
    respostas["/senador/lista/atual.json"]["ListaParlamentarEmExercicio"]["Parlamentares"][
        "Parlamentar"
    ] = lista_ruim
    resumo, requisicoes = executar()
    assert not resumo.completa
    assert resumo.votacoes == 0
    assert len(requisicoes) == 2
    mandatos_depois = set(sessao.execute(consulta))
    mandatos_divergentes = {mandato.id for mandato in mandatos_antes ^ mandatos_depois}
    assert not mandatos_divergentes


def test_periodo_vazio_e_sessao_conjunta_nao_criam_ausencias(sessao, executar, respostas):
    for v in respostas["/votacao"]:
        v["casaSessao"] = "CN"
    resumo, _ = executar()
    assert resumo.completa
    assert (resumo.parlamentares, resumo.votacoes, resumo.votos) == (81, 0, 0)
    respostas["/votacao"] = []
    resumo, requisicoes = executar()
    assert resumo.completa
    assert len(requisicoes) == 3
    assert total(sessao, Votacao) == 0


def test_secreta_sem_votos_nao_guarda_totais_em_texto(sessao, executar, respostas):
    v = respostas["/votacao"][0]
    respostas["/votacao"] = [v]
    v["votacaoSecreta"] = "S"
    v["votos"] = None
    v["totalVotosSim"], v["totalVotosNao"] = 61, 12
    resumo, _ = executar()
    assert resumo.completa
    assert (resumo.votacoes, resumo.votos) == (1, 0)
    gravada = sessao.scalars(select(Votacao)).one()
    assert gravada.descricao == v["descricaoVotacao"]
    assert gravada.resultado == "aprovada"


def test_null_nominal_nao_apaga_votos_e_outras_unidades_seguem(sessao, executar, respostas):
    executar()
    antes = sessao.execute(
        select(Votacao.id, Votacao.fonte_id).where(Votacao.id_externo == "7109")
    ).one()
    respostas["/votacao"][0]["votos"] = None
    resumo, _ = executar()
    assert not resumo.completa
    assert resumo.falhas_votacoes == ["7109"]
    assert resumo.votacoes == 3
    assert total(sessao, Voto) == 324
    assert (
        sessao.execute(
            select(Votacao.id, Votacao.fonte_id).where(Votacao.id_externo == "7109")
        ).one()
        == antes
    )


def test_tres_falhas_seguidas_param_e_sucesso_reinicia_sequencia(executar, respostas):
    for v in respostas["/votacao"][:3]:
        v["idProcesso"] = 999
    respostas["/processo/999"] = 503
    resumo, _ = executar()
    assert resumo.falhas_votacoes == ["7109", "7110", "7111"]
    assert resumo.votacoes == 0
    respostas["/votacao"][1]["idProcesso"] = 9006525
    resumo, _ = executar()
    assert resumo.falhas_votacoes == ["7109", "7111"]
    assert resumo.votacoes == 2


def test_erro_no_banco_desfaz_unidade_sem_expor_parametros(
    sessao, executar, respostas, monkeypatch, caplog
):
    from sqlalchemy.exc import IntegrityError

    from mandatometro.coleta import senado

    gravar = senado.sincronizar_votos

    def falhar(sessao, votacao, votos):
        if votacao.id_externo == "7110":
            raise IntegrityError("SQL PRIVADO", {}, Exception("PESSOA E CODIGO PRIVADOS"))
        return gravar(sessao, votacao, votos)

    monkeypatch.setattr(senado, "sincronizar_votos", falhar)
    resumo, _ = executar()
    assert resumo.falhas_votacoes == ["7110"]
    assert (total(sessao, Votacao), total(sessao, Voto)) == (3, 243)
    assert "PRIVADO" not in caplog.text
    assert "PRIVADO" not in str(resumo)


def test_ausencias_e_desconhecidos_nao_vazam_em_fontes_ou_log(sessao, executar, respostas, caplog):
    respostas["/votacao"] = [respostas["/votacao"][0]]
    v = respostas["/votacao"][0]
    v["votos"] = [
        {
            "codigoParlamentar": i,
            "nomeParlamentar": f"Pessoa ficticia {i}",
            "siglaPartidoParlamentar": "TESTE",
            "siglaUFParlamentar": "SC",
            "siglaVotoParlamentar": codigo,
        }
        for i, codigo in enumerate(["AP", "ls", "ZZ_PRIVADO", "Sim"], 990001)
    ]
    for i in range(990001, 990005):
        respostas[f"/senador/{i}/mandatos.json"] = 503
    resumo, _ = executar()
    assert resumo.codigos_desconhecidos == 1
    assert resumo.falhas_parlamentares == 4
    assert Counter(sessao.execute(select(Voto.valor, Voto.valor_bruto))) == {
        ("nao_votou", None): 2,
        ("outro", None): 1,
        ("sim", "Sim"): 1,
    }
    assert "ZZ_PRIVADO" not in caplog.text
    assert "99000" not in caplog.text
    assert "Pessoa ficticia" not in caplog.text
    assert "7109" in caplog.text
    assert all("ZZ_PRIVADO" not in (t or "") for t in sessao.scalars(select(Fonte.trecho)))


def test_mais_de_um_ano_divide_em_janelas_sem_lacuna(executar, respostas):
    respostas["/votacao"] = []
    resumo, requisicoes = executar(date(2024, 1, 1), date(2025, 1, 1))
    assert resumo.completa
    periodos = [dict(r.url.params) for r in requisicoes if r.url.path.endswith("/votacao")]
    assert periodos == [
        {"dataInicio": "2024-01-01", "dataFim": "2024-12-30"},
        {"dataInicio": "2024-12-31", "dataFim": "2025-01-01"},
    ]


def test_listagem_de_votacoes_malformada_e_falha(executar, respostas):
    respostas["/votacao"] = {"erro": "NAO LOGAR"}
    resumo, _ = executar()
    assert not resumo.completa
    assert resumo.votacoes == 0
    assert "NAO LOGAR" not in (resumo.erro or "")


def test_processo_de_outro_id_nao_entra_no_banco(sessao, executar, respostas):
    respostas["/processo/9006525"]["id"] = 1
    resumo, _ = executar()
    assert not resumo.completa
    assert total(sessao, Proposicao) == 0
    assert total(sessao, Votacao) == 0


def test_votacoes_duplicadas_contraditorias_preservam_a_versao_anterior(
    sessao, executar, respostas
):
    executar()
    anterior = sessao.execute(
        select(Votacao.descricao, Votacao.fonte_id).where(Votacao.id_externo == "7109")
    ).one()
    primeiro = respostas["/votacao"][0]
    primeiro["descricaoVotacao"] = "Primeira versao nova"
    repetido = copy.deepcopy(primeiro)
    repetido["descricaoVotacao"] = "Segunda versao nova"
    respostas["/votacao"].append(repetido)
    resumo, _ = executar()
    assert not resumo.completa
    assert resumo.falhas_votacoes == ["7109"]
    assert resumo.votacoes == 3
    assert (
        sessao.execute(
            select(Votacao.descricao, Votacao.fonte_id).where(Votacao.id_externo == "7109")
        ).one()
        == anterior
    )


def test_lista_atual_com_id_duplicado_preserva_exercicio(sessao, executar, respostas):
    executar()
    lista(respostas).append(copy.deepcopy(lista(respostas)[0]))
    resumo, _ = executar()
    assert not resumo.completa
    assert total(sessao, Fonte) == 10
    assert set(sessao.scalars(select(Mandato.em_exercicio))) == {True}


def test_json_sem_motivo_de_ausencia_na_fonte_do_historico(sessao, executar, respostas):
    lista(respostas)[:] = [
        p for p in lista(respostas) if p["IdentificacaoParlamentar"]["CodigoParlamentar"] != "5672"
    ]
    resumo, _ = executar()
    assert resumo.completa
    fontes = sessao.scalars(select(Fonte).where(Fonte.url.endswith("/5672/mandatos.json"))).all()
    assert len(fontes) == 1
    assert fontes[0].trecho is None


@pytest.mark.parametrize("status", [404, 410])
def test_processo_indisponivel_pula_sem_falhar_nem_parar_na_terceira(
    sessao, executar, respostas, status
):
    for v in respostas["/votacao"][:3]:
        v["idProcesso"] = 999
    respostas["/processo/999"] = status
    resumo, requisicoes = executar()
    assert resumo.completa
    assert resumo.falhas_votacoes == []
    assert resumo.indisponiveis_na_fonte == ["/processo/999"]
    assert (resumo.votacoes, resumo.votos) == (1, 81)
    assert total(sessao, Proposicao) == 1
    assert sum(r.url.path.endswith("/processo/999") for r in requisicoes) == 1


@pytest.mark.parametrize("status", [404, 410])
@pytest.mark.parametrize(
    "falhas,confirmadas", [((), 4), (("7109",), 3), (("7109", "7110", "7111"), 0)]
)
def test_historico_indisponivel_preserva_votos_e_so_identifica_parlamentar_confirmado(
    sessao, executar, respostas, status, falhas, confirmadas, monkeypatch, capsys, caplog
):
    from sqlalchemy.exc import IntegrityError

    from mandatometro.coleta import senado

    lista(respostas)[:] = [
        p for p in lista(respostas) if p["IdentificacaoParlamentar"]["CodigoParlamentar"] != "5672"
    ]
    codigo = 990001
    for votacao in respostas["/votacao"]:
        for voto in votacao["votos"]:
            if voto["codigoParlamentar"] == 5672:
                voto.update(codigoParlamentar=codigo, nomeParlamentar="Pessoa ficticia")
    caminho = f"/senador/{codigo}/mandatos.json"
    respostas[caminho] = status
    gravar = senado.sincronizar_votos

    def falhar(sessao, votacao, votos):
        if votacao.id_externo in falhas:
            raise IntegrityError("SQL PRIVADO", {}, Exception("PESSOA E CODIGO PRIVADOS"))
        return gravar(sessao, votacao, votos)

    monkeypatch.setattr(senado, "sincronizar_votos", falhar)
    resumo, requisicoes = executar()
    assert resumo.completa == (not falhas)
    assert resumo.falhas_parlamentares == 0
    assert resumo.falhas_votacoes == list(falhas)
    interno = sessao.scalar(
        select(Parlamentar.id).where(Parlamentar.casa == "senado", Parlamentar.id_externo == codigo)
    )
    assert (interno is not None) == (confirmadas > 0)
    assert resumo.indisponiveis_na_fonte == (
        [f"mandatos:parlamentar_id={interno}"] if confirmadas else []
    )
    assert (resumo.votacoes, resumo.votos, resumo.mandatos) == (confirmadas, confirmadas * 81, 80)
    assert total(sessao, Parlamentar) == (81 if confirmadas else 80)
    assert sum(r.url.path.endswith(caminho) for r in requisicoes) == 1
    mostrar_resumo(resumo)
    saida = capsys.readouterr()
    texto = saida.out + saida.err + caplog.text
    assert str(codigo) not in texto
    assert "Pessoa ficticia" not in texto
    assert "PRIVADO" not in texto


def test_404_na_listagem_principal_continua_sendo_falha(executar, respostas):
    respostas["/senador/lista/atual.json"] = 404
    resumo, _ = executar()
    assert not resumo.completa
    assert resumo.indisponiveis_na_fonte == []


def test_secreta_real_com_votou_e_ausencias_nao_gera_votos_nem_desconhecidos(
    sessao, executar, respostas, caplog
):
    respostas["/votacao"] = ler("votacao-secreta-7081.json")
    respostas["/processo/9026396"] = ler("processo-9026396.json")
    original = respostas["/votacao"][0]
    assert len(original["votos"]) == 81
    assert sum(v["siglaVotoParlamentar"] == "Votou" for v in original["votos"]) == 77
    assert original["totalVotosNao"] == 42
    resumo, requisicoes = executar(date(2026, 4, 29), date(2026, 4, 29))
    assert resumo.completa
    assert (resumo.votacoes, resumo.votos, resumo.codigos_desconhecidos) == (1, 0, 0)
    assert total(sessao, Voto) == 0
    gravada = sessao.scalars(select(Votacao)).one()
    assert (gravada.id_externo, gravada.resultado, gravada.resultado_bruto) == (
        "7081",
        "rejeitada",
        "R",
    )
    assert gravada.descricao == original["descricaoVotacao"]
    assert len(requisicoes) == 4
    assert "desconhecido" not in caplog.text
