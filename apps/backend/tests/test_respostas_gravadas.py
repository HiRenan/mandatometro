"""As respostas gravadas da Câmara e do Senado (tests/fixtures) cabem no modelo.

Não é o conector (#10 e #11): o teste só mostra que cada dado tem onde ficar, com as armadilhas que
a revisão do dicionário de dados confirmou na API. As asserções usam ids, não nomes. O CPF e a data
de nascimento do deputado, fictícios na resposta gravada, não entram no modelo. O último teste
confere que os motivos de afastamento da lista de senadores gravada são fictícios.
"""

import json
from collections import Counter
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import func, select

from mandatometro.db.modelos import (
    Fonte,
    Mandato,
    Parlamentar,
    Proposicao,
    Votacao,
    Voto,
    normalizar_resultado,
    normalizar_voto,
)

FIXTURES = Path(__file__).parent / "fixtures"
CAMARA = "https://dadosabertos.camara.leg.br/api/v2"
SENADO = "https://legis.senado.leg.br/dadosabertos"
# A data da coleta das respostas gravadas, do README de tests/fixtures.
COLETADO_EM = datetime.fromisoformat("2026-11-11T12:00:00-03:00")


def _ler(caminho: str):
    return json.loads((FIXTURES / caminho).read_text(encoding="utf-8"))


def _fonte(url: str) -> Fonte:
    return Fonte(url=url, coletado_em=COLETADO_EM)


def _proposicao_da_camara(item: dict, fonte: Fonte) -> Proposicao:
    return Proposicao(
        casa="camara",
        id_externo=item["id"],
        sigla=item["siglaTipo"],
        numero=item["numero"],
        ano=item["ano"],
        ementa=item["ementa"],
        fonte=fonte,
    )


def _gravar_camara(sessao) -> None:
    # Uma votação nominal: o /votos só traz quem votou (429 de 513). A resposta gravada não tem o
    # detalhe desta votação, então a data sai do registro dos votos e a descrição é de teste.
    fonte_dos_votos = _fonte(f"{CAMARA}/votacoes/2236186-60/votos")
    resultado, resultado_bruto = normalizar_resultado(None)
    nominal = Votacao(
        casa="camara",
        id_externo="2236186-60",
        data=date(2026, 10, 14),
        descricao="(a resposta gravada não traz o detalhe desta votação)",
        resultado=resultado,
        resultado_bruto=resultado_bruto,
        fonte=fonte_dos_votos,
    )
    deputados: dict[int, Parlamentar] = {}
    for item in _ler("camara/votacao-2236186-60-votos.json")["dados"]:
        deputado = item["deputado_"]
        deputados[deputado["id"]] = Parlamentar(
            casa="camara", id_externo=deputado["id"], nome=deputado["nome"], fonte=fonte_dos_votos
        )
        valor, valor_bruto = normalizar_voto(item["tipoVoto"])
        nominal.votos.append(
            Voto(
                parlamentar=deputados[deputado["id"]],
                valor=valor,
                valor_bruto=valor_bruto,
                partido=deputado["siglaPartido"],
                uf=deputado["siglaUf"],
                fonte=fonte_dos_votos,
            )
        )
    sessao.add(nominal)

    # O mandato do deputado, do ultimoStatus do detalhe. O partido fica no voto.
    detalhe = _ler("camara/deputado-178843.json")["dados"]
    status = detalhe["ultimoStatus"]
    sessao.add(
        Mandato(
            parlamentar=deputados[detalhe["id"]],
            legislatura=status["idLegislatura"],
            uf=status["siglaUf"],
            condicao=status["condicaoEleitoral"],
            em_exercicio=status["situacao"] == "Exercício",
            fonte=_fonte(f"{CAMARA}/deputados/178843"),
        )
    )

    # As 27 votações do plenário na semana de 03 a 07/11/2026.
    fonte_da_semana = _fonte(
        f"{CAMARA}/votacoes?idOrgao=180&dataInicio=2026-11-03&dataFim=2026-11-07"
        "&itens=100&ordem=DESC&ordenarPor=dataHoraRegistro"
    )
    semana: dict[str, Votacao] = {}
    for item in _ler("camara/votacoes-plenario-2026-11-03_2026-11-07.json")["dados"]:
        resultado, resultado_bruto = normalizar_resultado(item["aprovacao"])
        semana[item["id"]] = Votacao(
            casa="camara",
            id_externo=item["id"],
            data=date.fromisoformat(item["data"]),
            descricao=item["descricao"],
            resultado=resultado,
            resultado_bruto=resultado_bruto,
            fonte=fonte_da_semana,
        )
    sessao.add_all(semana.values())

    # A proposição votada vem no proposicoesAfetadas do detalhe, e não no prefixo do id.
    fonte_do_detalhe = _fonte(f"{CAMARA}/votacoes/2637478-26")
    detalhe_da_votacao = _ler("camara/votacao-2637478-26.json")["dados"]
    votacao = semana["2637478-26"]
    for afetada in detalhe_da_votacao["proposicoesAfetadas"]:
        votacao.proposicoes.append(_proposicao_da_camara(afetada, fonte_do_detalhe))
    votacao.proposicoes[0].url_inteiro_teor = _ler("camara/proposicao-2637478.json")["dados"][
        "urlInteiroTeor"
    ]
    # A amostra não tem votação com duas proposições afetadas. Para mostrar que o modelo aceita a
    # lista, a votação ganha também o requerimento que está no objetosPossiveis da mesma resposta.
    requerimento = next(
        objeto for objeto in detalhe_da_votacao["objetosPossiveis"] if objeto["siglaTipo"] == "REQ"
    )
    votacao.proposicoes.append(_proposicao_da_camara(requerimento, fonte_do_detalhe))


def _gravar_senado(sessao) -> None:
    # Os 81 senadores em exercício. Na lista, o código vem como texto ("5672").
    fonte_da_lista = _fonte(f"{SENADO}/senador/lista/atual.json")
    lista = _ler("senado/senador-lista-atual.json")
    for item in lista["ListaParlamentarEmExercicio"]["Parlamentares"]["Parlamentar"]:
        identificacao, mandato = item["IdentificacaoParlamentar"], item["Mandato"]
        senador = Parlamentar(
            casa="senado",
            id_externo=int(identificacao["CodigoParlamentar"]),
            nome=identificacao["NomeParlamentar"],
            fonte=fonte_da_lista,
        )
        sessao.add(
            Mandato(
                parlamentar=senador,
                legislatura=int(mandato["PrimeiraLegislaturaDoMandato"]["NumeroLegislatura"]),
                uf=mandato["UfParlamentar"],
                condicao=mandato["DescricaoParticipacao"],
                em_exercicio=True,
                fonte=fonte_da_lista,
            )
        )
    sessao.flush()

    # A matéria: a ementa está em conteudo.ementa, e o processo não traz o campo ementa.
    processo = _ler("senado/processo-9006525.json")
    pec = Proposicao(
        casa="senado",
        id_externo=processo["id"],
        sigla=processo["sigla"],
        numero=int(processo["numero"]),
        ano=processo["ano"],
        ementa=processo["conteudo"]["ementa"],
        apelido=processo["apelido"],
        url_inteiro_teor=processo["documento"]["url"],
        fonte=_fonte(f"{SENADO}/processo/9006525"),
    )

    # No /votacao, o código vem como número (5672) e acha o senador gravado a partir do texto.
    senadores = {
        senador.id_externo: senador
        for senador in sessao.scalars(select(Parlamentar).where(Parlamentar.casa == "senado"))
    }
    fonte_das_votacoes = _fonte(f"{SENADO}/votacao?dataInicio=2026-11-03&dataFim=2026-11-07")
    for item in _ler("senado/votacao-2026-11-03_2026-11-07.json"):
        assert item["idProcesso"] == pec.id_externo
        resultado, resultado_bruto = normalizar_resultado(item["resultadoVotacao"])
        votacao = Votacao(
            casa="senado",
            id_externo=str(item["codigoSessaoVotacao"]),
            data=date.fromisoformat(item["dataSessao"]),
            descricao=item["descricaoVotacao"],
            resultado=resultado,
            resultado_bruto=resultado_bruto,
            fonte=fonte_das_votacoes,
            proposicoes=[pec],
        )
        for voto in item["votos"]:
            valor, valor_bruto = normalizar_voto(voto["siglaVotoParlamentar"])
            votacao.votos.append(
                Voto(
                    parlamentar=senadores[voto["codigoParlamentar"]],
                    valor=valor,
                    valor_bruto=valor_bruto,
                    partido=voto["siglaPartidoParlamentar"],
                    uf=voto["siglaUFParlamentar"],
                    fonte=fonte_das_votacoes,
                )
            )
        sessao.add(votacao)


def _parlamentares_por_casa(sessao) -> dict[str, int]:
    consulta = select(Parlamentar.casa, func.count()).group_by(Parlamentar.casa)
    return dict(sessao.execute(consulta).all())


def _votos(sessao, casa: str, coluna) -> Counter:
    consulta = select(coluna, func.count()).join(Votacao).where(Votacao.casa == casa)
    return Counter(dict(sessao.execute(consulta.group_by(coluna)).all()))


def test_os_ids_das_duas_casas_ficam_no_mesmo_modelo(sessao):
    _gravar_camara(sessao)
    _gravar_senado(sessao)
    sessao.flush()

    # Os 429 deputados que votaram (o 178843 entre eles) e os 81 senadores, sem duplicar ninguém.
    assert _parlamentares_por_casa(sessao) == {"camara": 429, "senado": 81}


def test_os_votos_nominais_da_camara(sessao):
    _gravar_camara(sessao)
    sessao.flush()

    assert _votos(sessao, "camara", Voto.valor_bruto) == {"Sim": 252, "Não": 176, "Artigo 17": 1}
    assert _votos(sessao, "camara", Voto.valor) == {"sim": 252, "nao": 176, "presidente": 1}
    mandato = sessao.scalars(select(Mandato).join(Parlamentar)).one()
    assert (mandato.parlamentar.id_externo, mandato.legislatura, mandato.em_exercicio) == (
        178843,
        57,
        True,
    )


def test_as_votacoes_da_semana_na_camara(sessao):
    _gravar_camara(sessao)
    sessao.flush()

    resultados = select(Votacao.resultado, func.count()).where(
        Votacao.casa == "camara", Votacao.data >= date(2026, 11, 3)
    )
    assert dict(sessao.execute(resultados.group_by(Votacao.resultado)).all()) == {
        "aprovada": 24,
        "rejeitada": 3,
    }

    votacao = sessao.scalars(select(Votacao).where(Votacao.id_externo == "2637478-26")).one()
    assert sorted((p.sigla, p.numero, p.ano) for p in votacao.proposicoes) == [
        ("PL", 3507, 2026),
        ("REQ", 3721, 2026),
    ]


def test_os_votos_do_senado(sessao):
    _gravar_senado(sessao)
    sessao.flush()

    # Os seis códigos da amostra. O AP ("atividade parlamentar") entra sem o código, como toda
    # ausência, para a licença saúde ficar igual a ela; o P-NRV, de quem estava presente, fica.
    assert _votos(sessao, "senado", Voto.valor_bruto) == {
        "Sim": 253,
        "Não": 36,
        "P-NRV": 26,
        "Presidente (art. 51 RISF)": 4,
        None: 4,
        "Abstenção": 1,
    }
    assert _votos(sessao, "senado", Voto.valor) == {
        "sim": 253,
        "nao": 36,
        "nao_votou": 30,
        "presidente": 4,
        "abstencao": 1,
    }
    # Os totais do Senado vêm null: o total se conta pelos votos, 81 em cada votação.
    votacoes = sessao.scalars(select(Votacao).where(Votacao.casa == "senado")).all()
    assert sorted(v.id_externo for v in votacoes) == ["7109", "7110", "7111", "7112"]
    assert {(len(v.votos), v.resultado, v.resultado_bruto) for v in votacoes} == {
        (81, "aprovada", "A")
    }
    assert {p.id_externo for v in votacoes for p in v.proposicoes} == {9006525}


def test_a_mesma_materia_tem_uma_linha_em_cada_casa(sessao):
    _gravar_senado(sessao)
    # O processo do Senado traz a identificação da matéria na Câmara ("00018"), mas não o id da
    # Câmara: o 2500080 foi conferido na API pela revisão do PR #79.
    processo = _ler("senado/processo-9006525.json")
    na_camara = next(o for o in processo["outrosNumeros"] if o["casaIdentificadora"] == "CD")
    sessao.add(
        Proposicao(
            casa="camara",
            id_externo=2500080,
            sigla=na_camara["sigla"],
            numero=int(na_camara["numero"]),
            ano=na_camara["ano"],
            fonte=_fonte(f"{CAMARA}/proposicoes/2500080"),
        )
    )
    sessao.flush()

    mesma_materia = (
        select(Proposicao.casa, Proposicao.id_externo)
        .where(Proposicao.sigla == "PEC", Proposicao.numero == 18, Proposicao.ano == 2025)
        .order_by(Proposicao.casa)
    )
    assert sessao.execute(mesma_materia).all() == [("camara", 2500080), ("senado", 9006525)]


def _valores(dado, chave: str) -> list:
    """Os valores de uma chave em qualquer nível da resposta gravada, em objetos e listas."""
    if isinstance(dado, dict):
        proprio = [dado[chave]] if chave in dado else []
        return proprio + [valor for filho in dado.values() for valor in _valores(filho, chave)]
    if isinstance(dado, list):
        return [valor for filho in dado for valor in _valores(filho, chave)]
    return []


def test_os_motivos_de_afastamento_dos_senadores_sao_ficticios():
    # Um motivo de afastamento pode ser de saúde: na lista gravada, todos levam o mesmo valor
    # fictício (README de tests/fixtures). Gravou a lista de novo? Refaça a troca.
    lista = _ler("senado/senador-lista-atual.json")
    siglas = _valores(lista, "SiglaCausaAfastamento")
    descricoes = _valores(lista, "DescricaoCausaAfastamento")
    assert siglas and descricoes, "a lista gravada não tem os campos do motivo de afastamento"
    assert set(siglas) == {"XXX"}
    assert set(descricoes) == {"Motivo fictício"}
