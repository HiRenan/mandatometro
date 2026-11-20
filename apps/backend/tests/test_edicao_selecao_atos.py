import json
from contextlib import nullcontext
from copy import deepcopy
from datetime import timedelta
from unittest.mock import Mock
from uuid import UUID

import httpx2
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from test_edicao_provedor import configuracao, mensagem
from test_edicao_revisao import abrir as abrir
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.api import edicoes
from mandatometro.api.app import app
from mandatometro.avisos.email import montar_email
from mandatometro.cli import main
from mandatometro.config import Config
from mandatometro.db.modelos import Ato, Edicao, Fonte, Parlamentar
from mandatometro.ia import cli, relevancia
from mandatometro.ia.provedor import abrir_redator
from mandatometro.ia.redacao import RespostaRedator
from mandatometro.ia.selecao import selecionar
from mandatometro.ia.servico import (
    PENDENTE_ATO,
    ErroEdicao,
    exportar,
    gerar,
    mostrar,
    publicar,
    revisar,
)

DOU = "destaques_dou"
SENADO = "legislacao_senado"
MOTIVO = "Mostra como serviços públicos chegam às comunidades."
ARGUMENTOS = ["edicao", "rascunho", "--inicio", str(INICIO), "--fim", str(FIM)]


@pytest.fixture
def gravar_ato(sessao):
    def gravar(identificador, *, origem=DOU, url_publica=True, **campos):
        ato = Ato(
            id=identificador,
            id_externo=f"externo-{identificador}",
            origem=origem,
            fonte=Fonte(
                url=f"https://www.in.gov.br/consulta/{identificador}",
                url_publica=f"https://www.in.gov.br/ato/{identificador}"
                if url_publica is True
                else url_publica,
                trecho="Trecho fictício reservado.",
            ),
            **{
                "tipo": "decreto",
                "titulo": "Norma fictícia",
                "ementa": "Organiza serviços públicos fictícios.",
                "orgao": "Órgão fictício",
                "secao": "DO1",
                "data_publicacao": INICIO,
                "data_assinatura": INICIO - timedelta(days=1),
                "numero": str(identificador),
                **campos,
            },
        )
        sessao.add(ato)
        sessao.flush()
        return ato

    return gravar


def _resposta(*posicoes, motivo=MOTIVO):
    return {"ordem": [{"posicao": posicao, "motivo": motivo} for posicao in posicoes]}


def _itens_atos(abrir, resumo):
    arquivo = exportar(abrir, resumo["edicao_id"])
    return [item for item in arquivo["itens"] if item["fatos"]["versao"] == 2]


def _ids_atos(abrir, resumo):
    return [item["fatos"]["ato_id"] for item in _itens_atos(abrir, resumo)]


def _sem_conteudo(saidas, *valores):
    if any(valor and valor in saida for valor in valores for saida in saidas):
        pytest.fail("Conteúdo editorial apareceu em uma saída indevida.", pytrace=False)


def test_rascunho_sem_provedor_aplica_ordem_teto_e_recorte(abrir, gravar_ato, monkeypatch, capsys):
    gravar_ato(9019, data_publicacao=FIM)
    gravar_ato(9018, data_publicacao=FIM)
    gravar_ato(9020)
    gravar_ato(9017, origem=SENADO, data_publicacao=FIM)
    gravar_ato(9016, origem=SENADO)
    gravar_ato(9021, origem=SENADO)
    gravar_ato(9001, data_publicacao=INICIO - timedelta(days=1))
    gravar_ato(9002, data_publicacao=FIM + timedelta(days=1))
    gravar_ato(9003, url_publica=None)
    gravar_ato(9004, url_publica="https://www.in.gov.br.example.com/ato")
    monkeypatch.setattr(cli, "sessao_do_banco", abrir)
    monkeypatch.setattr(cli, "config", lambda: Config(_env_file=None, llm_provider=" "))

    assert main(ARGUMENTOS) == 0
    saida = capsys.readouterr()
    resumo = json.loads(saida.out)
    assert saida.err == ""
    assert resumo["situacao"] == "rascunho_criado"
    assert resumo["atos"] == {
        "no_banco": 8,
        "sem_pagina_publica": 2,
        "retidos": [],
        "retidos_por_codigo": {},
        "duplicados": 0,
        "elegiveis": 6,
        "selecionados": 5,
        "cortados_pelo_teto": 1,
        "teto": 5,
        "origem_ordem": "regra",
        "codigo_fallback": "sem_provedor",
    }
    assert _ids_atos(abrir, resumo) == [9018, 9019, 9020, 9017, 9016]
    for ordem, item in enumerate(_itens_atos(abrir, resumo), 1):
        assert item["fatos"]["selecao"] == {
            "ordem": ordem,
            "teto": 5,
            "origem": "regra",
            "codigo_fallback": "sem_provedor",
        }
        assert item["revisado"] is False and item["explicacao"] == [PENDENTE_ATO]


def test_teto_dos_atos_e_independente_da_selecao_das_votacoes(
    abrir, dados, gravar_ato, monkeypatch, capsys
):
    for votacao in range(10, 40, 10):
        dados(votacao, valores=("sim",))
    for ato in range(9001, 9004):
        gravar_ato(ato)
    with abrir() as sessao:
        selecao_votacoes = selecionar(sessao, INICIO, FIM, teto=2)
    monkeypatch.setattr(cli, "sessao_do_banco", abrir)
    monkeypatch.setattr(cli, "config", lambda: Config(_env_file=None, llm_provider=""))

    assert main([*ARGUMENTOS, "--teto", "2", "--teto-atos", "1"]) == 0
    resumo = json.loads(capsys.readouterr().out)
    arquivo = exportar(abrir, resumo["edicao_id"])
    assert [item["fatos"]["versao"] for item in arquivo["itens"]] == [1, 1, 2]
    assert [item["fatos"]["votacoes"] for item in arquivo["itens"][:2]] == [
        item.fatos.model_dump(mode="json")["votacoes"] for item in selecao_votacoes.itens
    ]
    assert resumo["selecionadas"] == selecao_votacoes.resumo.selecionadas
    assert resumo["cortadas_pelo_teto"] == selecao_votacoes.resumo.cortadas_pelo_teto
    assert resumo["atos"]["teto"] == 1 and resumo["atos"]["cortados_pelo_teto"] == 2
    assert _ids_atos(abrir, resumo) == [9001]


@pytest.mark.parametrize("valor", ["0", "-1"])
def test_teto_de_atos_invalido_antes_do_banco(monkeypatch, capsys, valor):
    monkeypatch.setattr(cli, "sessao_do_banco", Mock(side_effect=AssertionError))
    monkeypatch.setattr(cli, "abrir_redator", Mock(side_effect=AssertionError))
    assert main([*ARGUMENTOS, "--teto-atos", valor]) == 2
    saida = capsys.readouterr()
    assert "erro" in json.loads(saida.out) and saida.err == ""
    cli.sessao_do_banco.assert_not_called()
    cli.abrir_redator.assert_not_called()


@pytest.mark.parametrize("valor", [0, -1, True])
def test_servico_recusa_teto_de_atos_invalido_antes_do_banco(valor):
    abrir = Mock(side_effect=AssertionError)
    with pytest.raises(ValueError):
        gerar(abrir, INICIO, FIM, teto_atos=valor)
    abrir.assert_not_called()


def test_duplicata_clara_prefere_destaque_e_preserva_a_outra_fonte(abrir, gravar_ato, sessao):
    dou = gravar_ato(9002, numero="1234")
    senado = gravar_ato(9001, origem=SENADO, numero="01.234", data_publicacao=FIM)
    resumo = gerar(abrir, INICIO, FIM)

    assert resumo["atos"]["duplicados"] == 1
    [item] = _itens_atos(abrir, resumo)
    assert item["fatos"]["ato_id"] == dou.id and item["fatos"]["fontes"] == [dou.fonte_id]
    assert sessao.get(Ato, senado.id).fonte_id == senado.fonte_id
    assert sessao.get(Fonte, senado.fonte_id) is not None


def test_duplicata_sem_pagina_publica_deixa_a_fonte_oficial_disponivel(abrir, gravar_ato):
    dou = gravar_ato(9002, numero="1234", url_publica=None)
    senado = gravar_ato(9001, origem=SENADO, numero=dou.numero)
    resumo = gerar(abrir, INICIO, FIM)

    assert resumo["atos"]["sem_pagina_publica"] == 1
    assert resumo["atos"]["duplicados"] == 0
    assert _ids_atos(abrir, resumo) == [senado.id]


@pytest.mark.parametrize(
    "caso",
    [
        "sem-assinatura",
        "assinatura-diferente",
        "numero-ausente",
        "numero-invalido",
        "tipo",
        "lei-complementar",
        "outro",
        "ambiguo",
    ],
)
def test_duplicata_incerta_preserva_as_linhas(abrir, gravar_ato, caso):
    dou, senado = {"numero": "1234"}, {"numero": "1234"}
    if caso == "sem-assinatura":
        senado["data_assinatura"] = None
    elif caso == "assinatura-diferente":
        senado["data_assinatura"] = INICIO - timedelta(days=2)
    elif caso == "numero-ausente":
        dou["numero"] = None
    elif caso == "numero-invalido":
        dou["numero"] = senado["numero"] = "12.34"
    elif caso == "tipo":
        dou["tipo"] = "lei"
    elif caso == "lei-complementar":
        dou.update(tipo="lei", titulo="Lei complementar fictícia")
        senado.update(tipo="lei", titulo="Lei fictícia")
    elif caso == "outro":
        dou["tipo"] = senado["tipo"] = "outro"
    elif caso == "ambiguo":
        gravar_ato(9003, **dou)
    gravar_ato(9001, **dou)
    gravar_ato(9002, origem=SENADO, **senado)
    resumo = gerar(abrir, INICIO, FIM)

    assert resumo["atos"]["duplicados"] == 0
    assert set(_ids_atos(abrir, resumo)) == (
        {9001, 9002, 9003} if caso == "ambiguo" else {9001, 9002}
    )


@pytest.mark.parametrize(
    ("titulo_dou", "slug", "titulo_senado", "urn", "duplicados"),
    [
        pytest.param(
            "Destaque fictício",
            "lei-complementar-n-1234",
            "Lei ordinária fictícia",
            "lei",
            0,
            id="complementar-no-link-do-destaque",
        ),
        pytest.param(
            "Lei nº 1.234",
            None,
            "Norma fictícia",
            "lei.complementar",
            0,
            id="complementar-no-link-do-senado",
        ),
        pytest.param(
            "Destaque fictício",
            "lei-complementar-n-1234",
            "Norma fictícia",
            "lei.complementar",
            1,
            id="complementares-nos-links",
        ),
        pytest.param(
            "Destaque fictício",
            "lei-n-1234",
            "Norma fictícia",
            "lei",
            1,
            id="ordinarias-nos-links",
        ),
        pytest.param(
            "Lei nº 1.234",
            None,
            "Lei ordinária fictícia",
            None,
            1,
            id="ordinarias-nos-titulos",
        ),
        pytest.param(
            "Destaque fictício",
            None,
            "Lei ordinária fictícia",
            "lei",
            0,
            id="uma-sem-subtipo",
        ),
        pytest.param(
            "Lei ilustra a questão",
            None,
            "Norma fictícia",
            None,
            0,
            id="nenhuma-com-subtipo",
        ),
        pytest.param(
            "Lei ordinária fictícia",
            "lei-complementar-n-1234",
            "Lei nº 1.234",
            "lei",
            0,
            id="titulo-e-link-divergentes",
        ),
    ],
)
def test_subtipos_de_lei_por_titulo_e_endereco(
    abrir, gravar_ato, titulo_dou, slug, titulo_senado, urn, duplicados
):
    assinatura = INICIO - timedelta(days=1)
    gravar_ato(
        9001,
        tipo="lei",
        titulo=titulo_dou,
        numero="1234",
        url_publica=f"https://www.in.gov.br/web/dou/-/{slug}-99990007" if slug else True,
    )
    gravar_ato(
        9002,
        origem=SENADO,
        tipo="lei",
        titulo=titulo_senado,
        numero="1234",
        url_publica=f"https://normas.leg.br/?urn=urn:lex:br:federal:{urn}:{assinatura};1234"
        if urn
        else True,
    )
    resumo = gerar(abrir, INICIO, FIM)

    assert resumo["atos"]["duplicados"] == duplicados
    assert _ids_atos(abrir, resumo) == ([9001] if duplicados else [9001, 9002])


@pytest.mark.parametrize("origem_retida", [DOU, SENADO])
def test_retencao_de_uma_duplicata_impede_o_uso_da_outra(abrir, gravar_ato, sessao, origem_retida):
    for identificador, origem in [(9001, DOU), (9002, SENADO)]:
        gravar_ato(
            identificador,
            origem=origem,
            numero="4321",
            secao="DO2" if origem == origem_retida else "DO1",
        )
    redator = Mock()
    resumo = gerar(abrir, INICIO, FIM, redator=redator)

    assert resumo["situacao"] == "sem_itens_elegiveis"
    assert resumo["atos"]["retidos"] == [
        {"id": 9001, "codigo": "secao_de_pessoal"},
        {"id": 9002, "codigo": "secao_de_pessoal"},
    ]
    assert resumo["atos"]["retidos_por_codigo"] == {"secao_de_pessoal": 2}
    assert sessao.scalar(select(Edicao.id)) is None
    assert not redator.mock_calls


@pytest.mark.parametrize(
    ("origem_retida", "codigo", "publicacao"),
    [
        (DOU, "secao_de_pessoal", INICIO - timedelta(days=1)),
        (SENADO, "documento_pessoal", INICIO - timedelta(days=1)),
        (SENADO, "documento_pessoal", FIM + timedelta(days=1)),
    ],
    ids=["secao-na-vespera", "documento-na-publicacao-original", "documento-depois"],
)
def test_retencao_de_um_par_alcanca_outros_periodos(
    abrir, gravar_ato, sessao, origem_retida, codigo, publicacao
):
    outra_origem = SENADO if origem_retida == DOU else DOU
    dentro = gravar_ato(9002, origem=outra_origem, numero="4321")
    gravar_ato(
        9001,
        origem=origem_retida,
        numero="04.321",
        data_publicacao=publicacao,
        secao="DO2" if origem_retida == DOU else None,
        ementa=dentro.ementa if origem_retida == DOU else "CPF fictício 000.000.000-00.",
    )
    gravar_ato(9003, origem=origem_retida, numero="4321", data_publicacao=FIM + timedelta(days=3))
    redator = Mock()
    redator.ordenar_atos.return_value = RespostaRedator(_resposta(1))
    resumo = gerar(abrir, INICIO, FIM, redator=redator)

    assert redator.ordenar_atos.call_count == 0
    assert resumo["situacao"] == "sem_itens_elegiveis"
    assert resumo["atos"]["no_banco"] == 1
    assert resumo["atos"]["retidos"] == [{"id": id_, "codigo": codigo} for id_ in (9001, 9002)]
    assert resumo["atos"]["retidos_por_codigo"] == {codigo: 2}
    assert sessao.scalar(select(Edicao.id)) is None


def test_ato_de_outro_periodo_so_conta_para_retencao(abrir, gravar_ato):
    gravar_ato(9001, numero="4321", data_publicacao=INICIO - timedelta(days=1))
    gravar_ato(9002, origem=SENADO, numero="4321")
    gravar_ato(
        9003, origem=SENADO, numero="4321", secao="DO2", data_publicacao=FIM + timedelta(days=1)
    )
    resumo = gerar(abrir, INICIO, FIM)

    assert resumo["atos"]["no_banco"] == 1
    assert resumo["atos"]["retidos"] == []
    assert resumo["atos"]["duplicados"] == 0
    assert _ids_atos(abrir, resumo) == [9002]


def test_retencao_de_outro_periodo_bloqueia_o_par_inteiro_no_periodo(abrir, gravar_ato):
    gravar_ato(9001, numero="4321")
    gravar_ato(9002, origem=SENADO, numero="4321")
    gravar_ato(9003, numero="4321", secao="DO2", data_publicacao=INICIO - timedelta(days=1))
    redator = Mock()
    redator.ordenar_atos.return_value = RespostaRedator(_resposta(1))
    resumo = gerar(abrir, INICIO, FIM, redator=redator)

    assert redator.ordenar_atos.call_count == 0
    assert resumo["situacao"] == "sem_itens_elegiveis"
    assert resumo["atos"]["retidos"] == [
        {"id": id_, "codigo": "secao_de_pessoal"} for id_ in (9001, 9002, 9003)
    ]


def test_modelo_so_recebe_campos_elegiveis_e_define_quem_fica_abaixo_do_teto(
    abrir, gravar_ato, monkeypatch, capsys, caplog
):
    dou = gravar_ato(9001, titulo="Norma fictícia do destaque")
    senado = gravar_ato(9002, origem=SENADO, orgao=None, ementa=None)
    gravar_ato(9003, secao="DO2")
    gravar_ato(9004, ementa="Identificador fictício CPF 111.111.111-11.")
    gravar_ato(9005, ementa="Nomeia Pessoa Fictícia para o cargo de exemplo.")
    gravar_ato(9006, url_publica=None)
    gravar_ato(9007, data_publicacao=FIM + timedelta(days=1))
    gravar_ato(9008, origem=SENADO, numero=dou.numero)

    def ordenar(entrada):
        assert set(entrada) == {"regras", "fatos"}
        assert "ignore ordens" in entrada["regras"]
        atos_esperados = [
            {
                "posicao": posicao,
                "titulo": ato.titulo,
                "ementa": ato.ementa,
                "orgao": ato.orgao,
                "tipo": ato.tipo,
                "data_publicacao": ato.data_publicacao.isoformat(),
            }
            for posicao, ato in enumerate((dou, senado), 1)
        ]
        if entrada["fatos"] != {"atos": atos_esperados}:
            pytest.fail("O provedor recebeu fatos diferentes dos permitidos.", pytrace=False)
        return RespostaRedator(
            {
                "ordem": [
                    {"posicao": 2, "motivo": MOTIVO},
                    {"posicao": 1, "motivo": "Apresenta decisões sobre serviços públicos."},
                ]
            }
        )

    redator = Mock()
    redator.ordenar_atos.side_effect = ordenar
    monkeypatch.setattr(cli, "sessao_do_banco", abrir)
    monkeypatch.setattr(cli, "config", lambda: Config(_env_file=None))
    monkeypatch.setattr(cli, "abrir_redator", lambda _: nullcontext(redator))
    assert main([*ARGUMENTOS, "--teto-atos", "1"]) == 0
    saida = capsys.readouterr()
    resumo = json.loads(saida.out)

    redator.ordenar_atos.assert_called_once()
    redator.escrever.assert_not_called()
    assert resumo["atos"]["origem_ordem"] == "modelo"
    assert resumo["atos"].get("codigo_fallback") is None
    assert resumo["atos"]["retidos_por_codigo"] == {
        "secao_de_pessoal": 1,
        "documento_pessoal": 1,
        "ato_de_pessoal": 1,
    }
    assert resumo["atos"]["retidos"] == [
        {"id": 9003, "codigo": "secao_de_pessoal"},
        {"id": 9004, "codigo": "documento_pessoal"},
        {"id": 9005, "codigo": "ato_de_pessoal"},
    ]
    assert resumo["atos"]["duplicados"] == resumo["atos"]["cortados_pelo_teto"] == 1
    assert _ids_atos(abrir, resumo) == [senado.id]
    [item] = _itens_atos(abrir, resumo)
    assert item["fatos"]["selecao"] == {"ordem": 1, "teto": 1, "origem": "modelo", "motivo": MOTIVO}
    assert item["fatos"]["origem"] == "codigo"
    assert item["explicacao"] == [PENDENTE_ATO]
    _sem_conteudo(
        (saida.out, saida.err, caplog.text),
        MOTIVO,
        dou.titulo,
        dou.ementa,
        "Pessoa Fictícia",
        "111.111.111-11",
    )


@pytest.mark.parametrize(
    ("resposta", "codigo"),
    [
        pytest.param(RespostaRedator(_resposta(2, 1), "refusal"), "recusa_provedor", id="recusa"),
        pytest.param(
            RespostaRedator(_resposta(2, 1), "max_tokens"), "resposta_interrompida", id="corte"
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1), "desconhecido"),
            "resposta_interrompida",
            id="outra-parada",
        ),
        pytest.param(RuntimeError("Detalhe reservado fictício."), "falha_provedor", id="falha"),
        pytest.param(TimeoutError("Detalhe reservado fictício."), "tempo_esgotado", id="timeout"),
        pytest.param(None, "resposta_invalida", id="retorno-inesperado"),
        pytest.param(RespostaRedator({}), "resposta_invalida", id="vazio"),
        pytest.param(RespostaRedator(_resposta(2)), "resposta_invalida", id="faltou-ato"),
        pytest.param(
            RespostaRedator(_resposta(2, 9)), "resposta_invalida", id="indice-desconhecido"
        ),
        pytest.param(RespostaRedator(_resposta(2, 2)), "resposta_invalida", id="indice-repetido"),
        pytest.param(
            RespostaRedator(_resposta(2, 1, 1)), "resposta_invalida", id="indice-excedente"
        ),
        pytest.param(RespostaRedator(_resposta(2, "1")), "resposta_invalida", id="indice-texto"),
        pytest.param(
            RespostaRedator(_resposta(2, True)), "resposta_invalida", id="indice-booleano"
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1) | {"extra": None}),
            "resposta_invalida",
            id="campo-extra",
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1, motivo="Vagas ².")), "resposta_invalida", id="algarismo"
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1, motivo="Veja https://example.com.")),
            "resposta_invalida",
            id="url",
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1, motivo="Veja exemplo.com.")),
            "resposta_invalida",
            id="dominio",
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1, motivo="<b>Serviços</b>")),
            "resposta_invalida",
            id="html",
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1, motivo="Cita Pessoa Inventada.")),
            "resposta_invalida",
            id="nome-proprio",
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1, motivo="Cita pessoa cadastrada.")),
            "resposta_invalida",
            id="nome-cadastrado",
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1, motivo="Cita o partido fictício.")),
            "resposta_invalida",
            id="partido",
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1, motivo="XYZ apoia a norma.")),
            "resposta_invalida",
            id="sigla",
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1, motivo="a" * 161)), "resposta_invalida", id="longo"
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1, motivo="   ")), "resposta_invalida", id="branco"
        ),
        pytest.param(
            RespostaRedator(_resposta(2, 1, motivo="Linha\x00 inválida.")),
            "resposta_invalida",
            id="controle",
        ),
    ],
)
def test_resposta_inutilizavel_rejeita_a_ordem_inteira_e_grava_codigo(
    abrir, gravar_ato, sessao, caplog, capsys, monkeypatch, resposta, codigo
):
    dou = gravar_ato(9001)
    gravar_ato(9002, origem=SENADO, data_publicacao=FIM)
    sessao.add(
        Parlamentar(casa="camara", id_externo=9000, nome="Pessoa Cadastrada", fonte=dou.fonte)
    )
    sessao.flush()
    redator = Mock()
    if isinstance(resposta, Exception):
        redator.ordenar_atos.side_effect = resposta
    else:
        redator.ordenar_atos.return_value = resposta
    monkeypatch.setattr(cli, "sessao_do_banco", abrir)
    monkeypatch.setattr(cli, "config", lambda: Config(_env_file=None))
    monkeypatch.setattr(cli, "abrir_redator", lambda _: nullcontext(redator))

    assert main(ARGUMENTOS) == 0
    saida = capsys.readouterr()
    resumo = json.loads(saida.out)
    assert _ids_atos(abrir, resumo) == [9001, 9002]
    assert resumo["atos"]["origem_ordem"] == "regra" and resumo["atos"]["codigo_fallback"] == codigo
    for item in _itens_atos(abrir, resumo):
        assert item["fatos"]["selecao"]["codigo_fallback"] == codigo
        assert "motivo" not in item["fatos"]["selecao"] and item["revisado"] is False
    _sem_conteudo((saida.out, saida.err, caplog.text), MOTIVO, "Detalhe reservado fictício.")


@pytest.mark.parametrize(
    ("motivo", "aceito"),
    [
        pytest.param("Cita pessoa  cadastrada.", False, id="nome-com-espaco-duplo"),
        pytest.param("Cita a zqx.", False, id="sigla-cadastrada-em-minusculas"),
        pytest.param("Cita a zqxativa.", True, id="sigla-no-meio-de-uma-palavra"),
        pytest.param("Cita a alianca  civica ficticia.", False, id="nome-do-registro-por-extenso"),
        pytest.param("Explica como pode mudar.", True, id="pode-como-verbo"),
        pytest.param("Mostra como a União atua.", True, id="uniao-em-caixa-de-titulo"),
        pytest.param("Explica como a gestão sonha.", True, id="sigla-comum-cadastrada-como-verbo"),
        pytest.param("Cita a SONHA.", False, id="sigla-comum-cadastrada-em-maiusculas"),
    ],
)
def test_conferencia_de_identificacao_no_motivo(
    abrir, dados, gravar_ato, sessao, monkeypatch, motivo, aceito
):
    # Usa siglas e nomes inventados para reproduzir as mesmas regras do cadastro e do TSE.
    monkeypatch.setattr(
        relevancia, "_NOMES_PARTIDOS_TSE", ("Aliança Cívica Fictícia",), raising=False
    )
    palavras_comuns = getattr(relevancia, "_SIGLAS_QUE_SAO_PALAVRAS", set())
    monkeypatch.setattr(
        relevancia, "_SIGLAS_QUE_SAO_PALAVRAS", palavras_comuns | {"sonha"}, raising=False
    )
    votacao = dados(10, dia=8, valores=("sim", "nao"))
    for voto, sigla in zip(votacao.votos, ("ZQX", "SONHA"), strict=True):
        voto.partido = sigla
    votacao.votos[0].parlamentar.nome = "Pessoa   Cadastráda"
    sessao.flush()
    gravar_ato(9001)
    gravar_ato(9002, origem=SENADO)
    redator = Mock()
    redator.ordenar_atos.return_value = RespostaRedator(
        {"ordem": [{"posicao": 2, "motivo": MOTIVO}, {"posicao": 1, "motivo": motivo}]}
    )
    resumo = gerar(abrir, INICIO, FIM, teto_atos=1, redator=redator)

    assert resumo["atos"]["codigo_fallback"] == (None if aceito else "resposta_invalida")
    assert resumo["atos"]["origem_ordem"] == ("modelo" if aceito else "regra")
    [item] = _itens_atos(abrir, resumo)
    assert item["fatos"]["ato_id"] == (9002 if aceito else 9001)
    assert ("motivo" in item["fatos"]["selecao"]) is aceito


def test_revisao_exige_explicacao_e_confirmacao_e_preserva_a_sugestao(
    abrir, gravar_ato, sessao, monkeypatch
):
    for identificador in (9001, 9002, 9003):
        gravar_ato(identificador)
    redator = Mock()
    redator.ordenar_atos.return_value = RespostaRedator(_resposta(3, 1, 2))
    resumo = gerar(abrir, INICIO, FIM, redator=redator)
    edicao_id = resumo["edicao_id"]
    assert _ids_atos(abrir, resumo) == [9003, 9001, 9002]
    with pytest.raises(ErroEdicao, match="pendência"):
        publicar(abrir, edicao_id)
    arquivo = exportar(abrir, edicao_id)
    todos = arquivo["itens"]
    if any(item["fatos"]["selecao"]["motivo"] != MOTIVO for item in todos):
        pytest.fail("Sugestão ausente na revisão.", pytrace=False)
    sem_explicacao = deepcopy(arquivo)
    sem_explicacao["itens"][0]["revisado"] = True
    with pytest.raises(ErroEdicao, match="escreva a explicação"):
        revisar(abrir, edicao_id, sem_explicacao)
    pronto(arquivo)
    consulta_editada = deepcopy(arquivo)
    consulta_editada["itens"][0]["fatos"]["selecao"]["motivo"] = "Alteração fictícia."
    with pytest.raises(ErroEdicao, match="campo fatos é de consulta"):
        revisar(abrir, edicao_id, consulta_editada)

    todos[0]["revisado"] = False
    todos[1].update(excluir=True, motivo_exclusao="Decisão editorial fictícia.")
    todos.reverse()
    assert revisar(abrir, edicao_id, arquivo)["pendencias"] == ["revisao"]
    with pytest.raises(ErroEdicao, match="pendência de revisao"):
        publicar(abrir, edicao_id)
    atual = exportar(abrir, edicao_id)
    assert [item["fatos"]["selecao"]["ordem"] for item in atual["itens"]] == [3, 1]
    assert [item["fatos"]["origem"] for item in atual["itens"]] == ["revisao", "revisao"]
    atual["itens"][1]["revisado"] = True
    assert revisar(abrir, edicao_id, atual)["pendencias"] == []
    assert publicar(abrir, edicao_id)["situacao"] == "publicada"

    monkeypatch.setattr(edicoes, "sessao_do_banco", abrir)
    monkeypatch.setattr(edicoes, "config", lambda: Config(_env_file=None))
    resposta = TestClient(app).get(f"/edicoes/{edicao_id}")
    assert resposta.status_code == 200
    assert [item["ordem"] for item in resposta.json()["itens"]] == [1, 2]
    assert [item["tipo"] for item in resposta.json()["itens"]] == ["ato", "ato"]
    assert all(
        item["fatos"] == {"votacoes": [], "data_publicacao": str(INICIO)}
        for item in resposta.json()["itens"]
    )
    previa = mostrar(abrir, edicao_id, app_base_url="https://example.com")
    edicao = sessao.get(Edicao, edicao_id)
    fontes = {item.fonte_id: item.fonte for item in edicao.itens}
    email = montar_email(
        edicao,
        UUID(int=0),
        app_base_url="https://example.com",
        api_url="https://api.example.com",
        fontes=fontes,
    )
    _sem_conteudo(
        (resposta.text, previa, email.texto, email.html), MOTIVO, "modelo", '"origem"', '"selecao"'
    )


def test_repetir_preserva_revisao_e_refazer_substitui_so_rascunho(abrir, gravar_ato):
    gravar_ato(9001)
    gravar_ato(9002)
    redator = Mock()
    redator.ordenar_atos.return_value = RespostaRedator(_resposta(2, 1))
    resumo = gerar(abrir, INICIO, FIM, redator=redator)
    edicao_id = resumo["edicao_id"]
    revisar(abrir, edicao_id, pronto(exportar(abrir, edicao_id)))
    atual = exportar(abrir, edicao_id)
    gravar_ato(9003, data_publicacao=FIM)

    repetido = gerar(abrir, INICIO, FIM, teto_atos=1, redator=redator)
    assert repetido["situacao"] == "rascunho_existente" and repetido["edicao_id"] == edicao_id
    assert exportar(abrir, edicao_id) == atual
    redator.ordenar_atos.assert_called_once()
    refeito = gerar(abrir, INICIO, FIM, teto_atos=1, refazer=True)
    assert refeito["situacao"] == "rascunho_refeito" and refeito["edicao_id"] == edicao_id
    assert _ids_atos(abrir, refeito) == [9003]
    with pytest.raises(ErroEdicao, match="antigo"):
        revisar(abrir, edicao_id, atual)
    revisar(abrir, edicao_id, pronto(exportar(abrir, edicao_id)))
    publicar(abrir, edicao_id)
    assert gerar(abrir, INICIO, FIM, refazer=True, redator=redator)["situacao"] == "ja_publicada"
    redator.ordenar_atos.assert_called_once()


@pytest.mark.parametrize("remover", [False, True], ids=["alterado", "removido"])
def test_conferencia_detecta_ato_alterado_depois_do_rascunho(abrir, gravar_ato, sessao, remover):
    ato = gravar_ato(9001)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = exportar(abrir, edicao_id)
    if remover:
        sessao.delete(ato)
    else:
        ato.ementa = "Nova ementa fictícia."
    sessao.flush()
    for operacao, args in ((exportar, ()), (revisar, (arquivo,)), (publicar, ())):
        with pytest.raises(ErroEdicao, match="dados usados mudaram"):
            operacao(abrir, edicao_id, *args)


def test_coleta_durante_chamada_do_modelo_impede_gravacao(abrir, gravar_ato, sessao):
    ato = gravar_ato(9001)

    def ordenar(_):
        ato.ementa = "Nova ementa fictícia."
        sessao.flush()
        return RespostaRedator(_resposta(1))

    redator = Mock()
    redator.ordenar_atos.side_effect = ordenar
    with pytest.raises(ErroEdicao, match="dados usados mudaram"):
        gerar(abrir, INICIO, FIM, redator=redator)
    assert sessao.scalar(select(Edicao.id)) is None


def test_mesmo_adaptador_anthropic_pede_formato_estruturado_da_ordem():
    pedidos = []

    def responder(pedido):
        pedidos.append(json.loads(pedido.content))
        return mensagem({"type": "text", "text": json.dumps(_resposta(1))})

    with abrir_redator(configuracao(), transporte=httpx2.MockTransport(responder)) as redator:
        resposta = redator.ordenar_atos({"regras": "Regra fictícia.", "fatos": {"atos": []}})
    [pedido] = pedidos
    formato = pedido["output_config"]["format"]
    assert formato["type"] == "json_schema"
    assert set(formato["schema"]["properties"]) == {"ordem"}
    assert resposta.motivo_parada == "end_turn" and resposta.conteudo == _resposta(1)


def test_timeout_do_sdk_vira_codigo_de_selecao(abrir, gravar_ato, monkeypatch):
    gravar_ato(9001)
    responder = Mock(side_effect=httpx2.ReadTimeout("Detalhe reservado fictício."))
    monkeypatch.setattr("time.sleep", Mock())
    with abrir_redator(configuracao(), transporte=httpx2.MockTransport(responder)) as redator:
        resumo = gerar(abrir, INICIO, FIM, redator=redator)
    assert responder.call_count == 2
    assert resumo["atos"]["codigo_fallback"] == "tempo_esgotado"
