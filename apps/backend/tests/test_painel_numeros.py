from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from mandatometro import db
from mandatometro.api import contas
from mandatometro.api.app import app
from mandatometro.db.modelos import (
    ArtigoLido,
    Ato,
    BemDeclarado,
    CandidaturaPatrimonio,
    Conta,
    CredencialConta,
    Edicao,
    Fonte,
    Inscrito,
    IpcaMensal,
    Mandato,
    Parlamentar,
    Proposicao,
    ProposicaoTema,
    TentativaPiloto,
    VideoSessao,
    Votacao,
    Voto,
)
from mandatometro.piloto import VERSAO_QUIZ

ROTA = "/painel/numeros"
RASCUNHO = "/painel/edicoes/rascunho"
HOJE = datetime(2026, 11, 23, 14, tzinfo=UTC)
ANTES_DA_VIRADA = datetime(2026, 11, 9, 2, 59, tzinfo=UTC)
DEPOIS_DA_VIRADA = ANTES_DA_VIRADA + timedelta(minutes=1)
ARTIGOS_PROCESSO = (
    "quem-pode-propor-uma-lei",
    "onde-o-projeto-comeca",
    "o-projeto-passa-pelas-comissoes",
    "o-plenario-vota-o-projeto",
    "a-outra-casa-revisa-o-projeto",
    "o-presidente-sanciona-ou-veta",
)


@pytest.fixture
def cliente(engine_de_teste, relogio_db, monkeypatch):
    banco = engine_de_teste
    relogio_db[0] = HOJE
    monkeypatch.setattr(db, "engine", lambda: banco)
    monkeypatch.setattr(contas, "agora", lambda: HOJE)
    try:
        with TestClient(app, follow_redirects=False) as cliente:
            yield cliente
    finally:
        with banco.begin() as conexao:
            conexao.execute(
                text("TRUNCATE conta, inscrito, edicao, fonte, tentativa_piloto CASCADE")
            )
            if conexao.scalar(text("SELECT to_regclass('visita')")):
                conexao.execute(text("TRUNCATE visita"))


def _conta(criada, *, confirmada=True, **dados):
    id_ = uuid4()
    return Conta(
        id=id_,
        email=f"{id_.hex}@example.com",
        nome="Pessoa Fictícia",
        senha_hash="hash-ficticio",
        criada_em=criada,
        aceite_em=criada,
        confirmada_em=criada if confirmada else None,
        termo="teste",
        **dados,
    )


def _sessao(sessao, conta, aberta=HOJE, *, finalidade="sessao"):
    token = uuid4().hex
    sessao.add(
        CredencialConta(
            conta_id=conta.id,
            resumo=contas.resumo(token),
            expira=aberta + contas.VALIDADE_SESSAO,
            finalidade=finalidade,
        )
    )
    return {"Cookie": f"sessao_conta={token}"}


@pytest.fixture
def admin(cliente):
    with db.sessao() as sessao, sessao.begin():
        conta = _conta(HOJE, papel="administradora")
        sessao.add(conta)
        sessao.flush()
        return _sessao(sessao, conta)


def _numeros(cliente, admin):
    resposta = cliente.get(ROTA, headers=admin)
    assert resposta.status_code == 200
    assert resposta.headers["cache-control"] == "no-store"
    return resposta.json()


def test_usa_a_mesma_guarda_do_painel_e_autoriza_administradora(cliente, admin):
    with db.sessao() as sessao, sessao.begin():
        comum = _conta(HOJE)
        sessao.add(comum)
        sessao.flush()
        cookie_comum = _sessao(sessao, comum)

    for cabecalho in ({}, cookie_comum, {"Cookie": "sessao_conta=invalida"}):
        resposta = cliente.get(ROTA, headers=cabecalho)
        antiga = cliente.get(RASCUNHO, headers=cabecalho)
        assert antiga.status_code == resposta.status_code == 404
        assert resposta.content == antiga.content
        assert sorted(resposta.headers.raw) == sorted(antiga.headers.raw)
    assert cliente.get(RASCUNHO, headers=admin).status_code == 200
    assert set(_numeros(cliente, admin)) == {
        "pessoas",
        "uso",
        "visitas",
        "newsletter",
        "piloto",
        "sistema",
    }


def test_pessoas_separadas_e_semanas_de_brasilia_com_lacunas(cliente, admin):
    with db.sessao() as sessao, sessao.begin():
        conta = _conta(ANTES_DA_VIRADA)
        sessao.add_all(
            [
                conta,
                _conta(DEPOIS_DA_VIRADA, confirmada=False),
                Inscrito(email=conta.email, inscrito_em=ANTES_DA_VIRADA),
                Inscrito(email="outro@example.com", inscrito_em=DEPOIS_DA_VIRADA),
            ]
        )

    assert _numeros(cliente, admin)["pessoas"] == {
        "contas": {
            "total": 3,
            "confirmadas": 2,
            "novas_por_semana": [
                {"semana": "2026-11-02", "total": 1},
                {"semana": "2026-11-09", "total": 1},
                {"semana": "2026-11-16", "total": 0},
                {"semana": "2026-11-23", "total": 1},
            ],
        },
        "inscritos": {
            "total": 2,
            "novos_por_semana": [
                {"semana": "2026-11-02", "total": 1},
                {"semana": "2026-11-09", "total": 1},
                {"semana": "2026-11-16", "total": 0},
                {"semana": "2026-11-23", "total": 0},
            ],
        },
    }


def test_leituras_por_trilha_e_conclusao_exigem_o_catalogo_publico(cliente, admin):
    with db.sessao() as sessao, sessao.begin():
        completou = _conta(ANTES_DA_VIRADA)
        parcial = _conta(ANTES_DA_VIRADA)
        sessao.add_all([completou, parcial])
        sessao.flush()
        sessao.add_all(
            ArtigoLido(conta_id=completou.id, artigo_id=f"processo-legislativo/{artigo}")
            for artigo in ARTIGOS_PROCESSO
        )
        sessao.add_all(
            [
                ArtigoLido(
                    conta_id=parcial.id, artigo_id="processo-legislativo/onde-o-projeto-comeca"
                ),
                ArtigoLido(conta_id=parcial.id, artigo_id="processo-legislativo/texto-injetado"),
                ArtigoLido(conta_id=parcial.id, artigo_id="trilha-injetada/texto-injetado"),
            ]
        )

    uso = _numeros(cliente, admin)["uso"]
    assert {item["trilha"]: item["total"] for item in uso["artigos_lidos_por_trilha"]} == {
        "constituicao-brasileira": 0,
        "direitos-e-deveres": 0,
        "processo-legislativo": 7,
        "tres-poderes": 0,
    }
    assert {item["trilha"]: item["total"] for item in uso["trilhas_concluidas"]} == {
        "constituicao-brasileira": 0,
        "direitos-e-deveres": 0,
        "processo-legislativo": 1,
        "tres-poderes": 0,
    }


def test_atividade_e_retorno_contam_contas_distintas_e_so_login_ou_leitura(cliente, admin):
    with db.sessao() as sessao, sessao.begin():
        por_leitura = _conta(ANTES_DA_VIRADA - timedelta(hours=1))
        por_sessao = _conta(ANTES_DA_VIRADA)
        mesma_semana = _conta(DEPOIS_DA_VIRADA)
        sem_atividade = _conta(ANTES_DA_VIRADA)
        sessao.add_all([por_leitura, por_sessao, mesma_semana, sem_atividade])
        sessao.flush()
        _sessao(sessao, por_leitura, ANTES_DA_VIRADA)
        _sessao(sessao, por_sessao, HOJE)
        _sessao(sessao, por_sessao, HOJE)
        _sessao(sessao, mesma_semana, DEPOIS_DA_VIRADA)
        _sessao(sessao, sem_atividade, HOJE - timedelta(days=6), finalidade="recuperacao")
        for conta, data, artigo in (
            (por_leitura, ANTES_DA_VIRADA, ARTIGOS_PROCESSO[0]),
            (por_leitura, DEPOIS_DA_VIRADA, ARTIGOS_PROCESSO[1]),
            (por_leitura, HOJE, ARTIGOS_PROCESSO[2]),
            (mesma_semana, DEPOIS_DA_VIRADA, ARTIGOS_PROCESSO[0]),
        ):
            sessao.add(
                ArtigoLido(
                    conta_id=conta.id,
                    artigo_id=f"processo-legislativo/{artigo}",
                    marcado_em=data,
                )
            )

    uso = _numeros(cliente, admin)["uso"]
    assert uso["contas_ativas_por_semana"] == [
        {"semana": "2026-11-02", "total": 1},
        {"semana": "2026-11-09", "total": 2},
        {"semana": "2026-11-16", "total": 0},
        {"semana": "2026-11-23", "total": 3},
    ]
    assert uso["contas_que_voltaram"] == 2


def test_visitas_completam_30_dias_e_ranqueiam_so_o_periodo(cliente, admin):
    hoje = HOJE.date()
    caminhos = [
        "/",
        "/edicoes",
        "/jogos",
        "/jogos/comissoes",
        "/parlamentares",
        "/piloto",
        "/termo",
        "/trilhas",
        "/trilhas/constituicao-brasileira",
        "/trilhas/direitos-e-deveres",
        "/trilhas/processo-legislativo",
    ]
    linhas = [(hoje, caminho, 1) for caminho in caminhos]
    linhas += [
        (hoje - timedelta(days=29), "/trilhas", 3),
        (hoje - timedelta(days=30), "/trilhas/tres-poderes", 80),
        (hoje + timedelta(days=1), "/trilhas/tres-poderes", 90),
    ]
    with db.engine().begin() as conexao:
        conexao.execute(
            text("INSERT INTO visita (dia, caminho, quantidade) VALUES (:dia, :caminho, :n)"),
            [{"dia": dia, "caminho": caminho, "n": n} for dia, caminho, n in linhas],
        )
    visitas = _numeros(cliente, admin)["visitas"]
    assert visitas["por_dia"] == [
        {"dia": (hoje - timedelta(days=i)).isoformat(), "total": {29: 3, 0: 11}.get(i, 0)}
        for i in range(29, -1, -1)
    ]
    assert visitas["paginas_mais_vistas"] == [
        {"caminho": "/trilhas", "total": 4},
        *[{"caminho": caminho, "total": 1} for caminho in caminhos if caminho != "/trilhas"][:9],
    ]


def test_newsletter_sem_edicao_e_com_envio_da_ultima_publicada(cliente, admin):
    vazio = _numeros(cliente, admin)
    assert vazio["newsletter"] == {
        "edicoes_publicadas": 0,
        "inscritos_com_a_ultima_edicao": None,
        "ultima_publicada_em": None,
    }
    assert vazio["pessoas"]["inscritos"]["novos_por_semana"] == []
    with db.sessao() as sessao, sessao.begin():
        dia = HOJE.date()
        sessao.add_all(
            [
                Edicao(
                    id=91,
                    titulo="Antiga",
                    inicio=dia,
                    fim=dia,
                    publicada_em=HOJE,
                    estado="publicada",
                ),
                Edicao(
                    id=92, titulo="Nova", inicio=dia, fim=dia, publicada_em=HOJE, estado="publicada"
                ),
                Edicao(id=93, titulo="Rascunho", inicio=dia, fim=dia),
            ]
        )
        sessao.flush()
        for ordem, id_ in enumerate((91, 92, 92, None)):
            sessao.add(Inscrito(email=f"inscrito{ordem}@example.com", ultima_edicao_enviada_id=id_))
    newsletter = _numeros(cliente, admin)["newsletter"]
    assert newsletter["edicoes_publicadas"] == 2
    assert newsletter["inscritos_com_a_ultima_edicao"] == 2
    assert datetime.fromisoformat(newsletter["ultima_publicada_em"]) == HOJE


def test_piloto_preserva_as_contagens_e_a_supressao_da_media(cliente, admin):
    def inserir(sessao, participacao, etapa, acertos):
        sessao.add(
            TentativaPiloto(
                participacao=participacao, etapa=etapa, acertos=acertos, versao_quiz=VERSAO_QUIZ
            )
        )

    with db.sessao() as sessao, sessao.begin():
        inserir(sessao, uuid4(), "antes", 1)
    pequeno = _numeros(cliente, admin)["piloto"]
    assert pequeno["medias"]["antes"] == {
        "quantidade": 1,
        "acertos": None,
        "percentual": None,
        "situacao": "amostra_pequena",
    }
    assert pequeno["pares"]["diferenca_acertos"] is None
    with db.sessao() as sessao, sessao.begin():
        for _ in range(5):
            par = uuid4()
            inserir(sessao, par, "antes", 5)
            inserir(sessao, par, "depois", 8)
    piloto = _numeros(cliente, admin)["piloto"]
    assert piloto["tentativas"] == {"antes": 6, "depois": 5, "total": 11}
    assert piloto["participacoes"]["pareadas"] == 5
    assert piloto["medias"]["antes"] == {
        "quantidade": 6,
        "acertos": None,
        "percentual": None,
        "situacao": "protecao_de_subgrupo",
    }
    assert piloto["medias"]["depois"]["acertos"] == 8
    assert piloto["pares"]["diferenca_acertos"] == 3
    assert piloto["pares"]["diferenca_pontos_percentuais"] == 25


def test_sistema_conta_as_tabelas_e_classifica_datas_pelo_dominio_oficial(cliente, admin):
    dia = HOJE.date()
    coleta_antiga = HOJE - timedelta(days=1)
    coleta_senado = HOJE - timedelta(days=2)
    with db.sessao() as sessao, sessao.begin():
        fonte = Fonte(url="https://dadosabertos.camara.leg.br/dado", coletado_em=HOJE)
        senado = Fonte(url="https://legis.senado.leg.br/dado", coletado_em=coleta_senado)
        tse = Fonte(url="https://cdn.tse.jus.br/arquivo", coletado_em=HOJE)
        bcb = Fonte(url="https://api.bcb.gov.br/serie", coletado_em=HOJE)
        deputado = Parlamentar(casa="camara", id_externo=12, nome="Nome Fictício", fonte=fonte)
        projeto = Proposicao(
            casa="camara", id_externo=123, sigla="PL", numero=123, ano=2026, fonte=fonte
        )
        video = VideoSessao(
            casa="camara",
            id_externo=10,
            url_video="https://www.youtube.com/watch?v=Exemplo1234",
            fonte=fonte,
        )
        votacao = Votacao(
            casa="camara",
            id_externo="123-1",
            data=dia,
            descricao="Votação fictícia",
            resultado="aprovada",
            fonte=fonte,
            video_sessao=video,
        )
        sessao.add(deputado)
        sessao.flush()
        bem = CandidaturaPatrimonio(
            ano=2022,
            codigo_eleicao=481,
            uf="PR",
            id_externo=123,
            cargo=6,
            parlamentar_id=deputado.id,
            fonte_candidatura=tse,
            fonte_bens=tse,
        )
        sessao.add_all(
            [
                projeto,
                votacao,
                bem,
                senado,
                VideoSessao(casa="camara", id_externo=11, fonte=fonte),
                Fonte(url="https://www.camara.leg.br/anterior", coletado_em=coleta_antiga),
                Fonte(
                    url="https://camara.leg.br.example.com/falsa",
                    coletado_em=HOJE + timedelta(days=1),
                ),
                Fonte(url="https://legis.senado.leg.br@example.com/falsa", coletado_em=HOJE),
                Mandato(
                    parlamentar=deputado, legislatura=57, uf="PR", em_exercicio=True, fonte=fonte
                ),
                Voto(votacao=votacao, parlamentar=deputado, valor="sim", fonte=fonte),
                Ato(
                    origem="exemplo",
                    id_externo="ato-ficticio",
                    tipo="lei",
                    titulo="Ato fictício",
                    data_publicacao=dia,
                    fonte=senado,
                ),
                IpcaMensal(mes=dia.replace(day=1), variacao_percentual=Decimal("0.12"), fonte=bcb),
            ]
        )
        sessao.flush()
        sessao.add_all(
            [
                ProposicaoTema(proposicao_id=projeto.id, tema="saude", fonte_id=fonte.id),
                ProposicaoTema(proposicao_id=projeto.id, tema="educacao", fonte_id=fonte.id),
                BemDeclarado(candidatura_id=bem.id, tipo=1, valor_centavos=10),
            ]
        )

    sistema = _numeros(cliente, admin)["sistema"]
    assert sistema.pop("ultimas_coletas") == {
        "camara": HOJE.isoformat().replace("+00:00", "Z"),
        "senado": coleta_senado.isoformat().replace("+00:00", "Z"),
        "diario_oficial": None,
        "tse": HOJE.isoformat().replace("+00:00", "Z"),
        "banco_central": HOJE.isoformat().replace("+00:00", "Z"),
    }
    assert sistema == dict.fromkeys(
        [
            "parlamentares",
            "mandatos",
            "proposicoes",
            "votacoes",
            "votos",
            "atos",
            "videos",
            "proposicoes_com_tema",
            "bens",
            "meses_ipca",
        ],
        1,
    )


def test_numeros_excluem_dados_e_textos_pessoais_mesmo_preenchidos(cliente, admin):
    with db.sessao() as sessao, sessao.begin():
        pessoa = _conta(
            ANTES_DA_VIRADA,
            genero="outro",
            estado="AC",
            nascimento=datetime(1987, 1, 13).date(),
            autodescricao="Descrição fictícia de privacidade",
        )
        participante = uuid4()
        sessao.add_all(
            [
                pessoa,
                Inscrito(email=pessoa.email),
                Fonte(
                    url="https://dadosabertos.camara.leg.br/trecho-ficticio",
                    trecho="Trecho reservado",
                    coletado_em=HOJE,
                ),
                TentativaPiloto(
                    participacao=participante, etapa="antes", acertos=12, versao_quiz=VERSAO_QUIZ
                ),
            ]
        )
        sessao.flush()
        email, conta_id = pessoa.email, str(pessoa.id)
        sessao.add(ArtigoLido(conta_id=pessoa.id, artigo_id="slug-injetado/texto-injetado"))

    resposta = cliente.get(ROTA, headers=admin)
    assert resposta.status_code == 200
    for marcador in (
        "nome",
        "email",
        "genero",
        "estado",
        "nascimento",
        "autodescricao",
        "conta_id",
        "artigo_id",
        "url",
        "trecho",
        "sessao_conta",
        "senha_hash",
    ):
        assert f'"{marcador}"' not in resposta.text
    for valor in (
        "Pessoa Fictícia",
        email,
        conta_id,
        str(participante),
        "1987-01-13",
        "Descrição fictícia",
        "Trecho reservado",
        "trecho-ficticio",
        "slug-injetado",
        "texto-injetado",
        '"AC"',
        '"outro"',
    ):
        assert valor not in resposta.text


def test_openapi_dos_numeros_documenta_so_a_operacao_nova_e_a_guarda_existente():
    operacao = app.openapi()["paths"][ROTA]["get"]
    assert operacao["operationId"] == "consultar_numeros_painel"
    assert set(operacao["responses"]) == {"200", "404", "500"}
    assert operacao["responses"]["200"]["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/NumerosPainel"
    }
