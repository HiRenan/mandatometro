from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from mandatometro import db
from mandatometro.api.app import app
from mandatometro.db.modelos import Edicao, Fonte, Parlamentar, Votacao

ROTA = "/visitas"
INSTANTE = datetime(2026, 11, 23, 2, 59, 50, tzinfo=UTC)


@pytest.fixture
def ambiente(engine_de_teste, relogio_db, monkeypatch):
    banco = engine_de_teste
    monkeypatch.setattr(db, "engine", lambda: banco)
    relogio_db[0] = INSTANTE
    try:
        with TestClient(app, follow_redirects=False) as cliente:
            yield cliente, banco, relogio_db
    finally:
        with banco.begin() as conexao:
            conexao.execute(text("TRUNCATE edicao, fonte CASCADE"))
            if conexao.scalar(text("SELECT to_regclass('visita')")):
                conexao.execute(text("TRUNCATE visita, limite_visita"))


def _visitas(banco):
    with banco.connect() as conexao:
        return conexao.execute(
            text("SELECT dia::text, caminho, quantidade FROM visita ORDER BY dia, caminho")
        ).all()


def _cota(banco):
    with banco.connect() as conexao:
        return conexao.execute(text("SELECT quantidade FROM limite_visita ORDER BY janela")).all()


def _post(cliente, caminho, **opcoes):
    return cliente.post(ROTA, json={"caminho": caminho}, **opcoes)


def _sem_corpo(resposta, codigo):
    assert resposta.status_code == codigo
    assert resposta.content == b""
    assert resposta.headers["cache-control"] == "no-store"
    assert "set-cookie" not in resposta.headers


def test_conta_por_caminho_e_vira_o_dia_em_brasilia(ambiente):
    cliente, banco, relogio = ambiente
    with ThreadPoolExecutor(max_workers=2) as processos:
        for resposta in processos.map(lambda _: _post(cliente, "/"), range(2)):
            _sem_corpo(resposta, 204)
    _sem_corpo(_post(cliente, "/trilhas/"), 204)
    _sem_corpo(_post(cliente, "/opiniao"), 204)
    relogio[0] += timedelta(seconds=10)
    _sem_corpo(_post(cliente, "/", headers={"Cookie": "sessao_conta=exemplo"}), 204)
    assert _visitas(banco) == [
        ("2026-11-22", "/", 2),
        ("2026-11-22", "/opiniao", 1),
        ("2026-11-22", "/trilhas", 1),
        ("2026-11-23", "/", 1),
    ]


def test_conta_item_publico_pelo_id_e_conteudo_do_catalogo(ambiente):
    cliente, banco, _ = ambiente
    with db.sessao() as sessao, sessao.begin():
        fonte = Fonte(url="https://example.com/fonte-ficticia")
        dia = INSTANTE.date()
        sessao.add_all(
            [
                Parlamentar(
                    id=123, casa="camara", id_externo=123, nome="Nome Fictício", fonte=fonte
                ),
                Parlamentar(
                    id=789, casa="senado", id_externo=789, nome="Nome de Exemplo", fonte=fonte
                ),
                Edicao(
                    id=455,
                    titulo="Publicada",
                    inicio=dia,
                    fim=dia,
                    estado="publicada",
                    publicada_em=INSTANTE,
                ),
                Edicao(id=456, titulo="Rascunho", inicio=dia, fim=dia),
                Votacao(
                    id=900,
                    casa="camara",
                    id_externo="100-1",
                    fonte=fonte,
                    data=dia,
                    descricao="Votação fictícia",
                    resultado="aprovada",
                ),
            ]
        )
    for caminho in (
        "/parlamentares/123",
        "/parlamentares/123-texto-injetado",
        "/parlamentares/789",
        "/parlamentares/999",
        "/edicoes/455",
        "/edicoes/456",
        "/votacoes/900",
        "/trilhas/processo-legislativo/onde-o-projeto-comeca",
        "/trilhas/processo-legislativo/quiz-final",
        "/jogos/comissoes",
    ):
        _sem_corpo(_post(cliente, caminho), 204)
    assert _visitas(banco) == [
        ("2026-11-22", "/edicoes/455", 1),
        ("2026-11-22", "/jogos/comissoes", 1),
        ("2026-11-22", "/parlamentares/123", 2),
        ("2026-11-22", "/parlamentares/789", 1),
        ("2026-11-22", "/trilhas/processo-legislativo/onde-o-projeto-comeca", 1),
        ("2026-11-22", "/trilhas/processo-legislativo/quiz-final", 1),
        ("2026-11-22", "/votacoes/900", 1),
    ]


@pytest.mark.parametrize(
    ("caminho", "agente"),
    [
        ("/desconhecida", "Mozilla/5.0"),
        ("/trilhas/inventada", "Mozilla/5.0"),
        ("/trilhas/processo-legislativo/texto-injetado", "Mozilla/5.0"),
        ("/parlamentares/0123", "Mozilla/5.0"),
        ("/parlamentares/9999999999", "Mozilla/5.0"),
        ("/trilhas?email=inventado@example.com", "Mozilla/5.0"),
        ("/trilhas%3Femail", "Mozilla/5.0"),
        ("/trilhas#sumario", "Mozilla/5.0"),
        ("https://example.com/trilhas", "Mozilla/5.0"),
        ("//", "Mozilla/5.0"),
        ("/painel", "Mozilla/5.0"),
        ("/login", "Mozilla/5.0"),
        ("/perfil", "Mozilla/5.0"),
        ("/cadastro/confirmar", "Mozilla/5.0"),
        ("/newsletter/sair", "Mozilla/5.0"),
        ("/", "Mozilla/5.0 (compatible; Googlebot/2.1)"),
        ("/", "facebookexternalhit/1.1"),
        ("/", "DuckDuckBot/1.1"),
        ("/", "curl/8.0"),
    ],
)
def test_ignora_caminho_que_nao_e_publico_query_e_robo(ambiente, caminho, agente):
    cliente, banco, _ = ambiente
    _sem_corpo(_post(cliente, caminho, headers={"User-Agent": agente}), 204)
    assert _visitas(banco) == []
    assert _cota(banco) == []


@pytest.mark.parametrize(
    "corpo",
    [
        b'{"caminho":"/","email":"inventado@example.com"}',
        b'{"caminho":12}',
        b'{"caminho":',
        b'{"caminho":"/"}' + b" " * 2048,
    ],
)
def test_ignora_corpo_invalido_e_nao_o_repete(ambiente, corpo):
    cliente, banco, _ = ambiente
    resposta = cliente.post(ROTA, content=corpo, headers={"Content-Type": "application/json"})
    _sem_corpo(resposta, 204)
    assert _visitas(banco) == []
    assert _cota(banco) == []


def test_cota_global_rejeita_outro_caminho_e_reabre_no_minuto_seguinte(ambiente):
    cliente, banco, relogio = ambiente
    with banco.begin() as conexao:
        conexao.execute(
            text("INSERT INTO limite_visita (janela, quantidade) VALUES (:janela, 599)"),
            {"janela": INSTANTE.replace(second=0)},
        )
    _sem_corpo(_post(cliente, "/"), 204)
    resposta = _post(cliente, "/jogos", headers={"User-Agent": "outro navegador"})
    _sem_corpo(resposta, 429)
    assert resposta.headers["retry-after"] == "10"
    assert _visitas(banco) == [("2026-11-22", "/", 1)]
    assert _cota(banco) == [(600,)]
    relogio[0] += timedelta(seconds=10)
    _sem_corpo(_post(cliente, "/jogos"), 204)
    assert _visitas(banco) == [("2026-11-22", "/", 1), ("2026-11-23", "/jogos", 1)]
    assert _cota(banco) == [(600,), (1,)]


def test_falha_do_banco_tem_resposta_e_log_fixos(monkeypatch, caplog):
    def falhar():
        raise SQLAlchemyError("inventado@example.com")

    monkeypatch.setattr(db, "engine", falhar)
    _sem_corpo(_post(TestClient(app), "/"), 503)
    assert "Banco indisponível no contador de visitas." in caplog.text
    assert "inventado@example.com" not in caplog.text


def test_openapi_da_visita_documenta_o_corpo_e_respostas_sem_conteudo():
    operacao = app.openapi()["paths"][ROTA]["post"]
    assert operacao["operationId"] == "registrar_visita"
    esquema = operacao["requestBody"]["content"]["application/json"]["schema"]
    assert esquema["required"] == ["caminho"]
    assert set(esquema["properties"]) == {"caminho"}
    assert set(operacao["responses"]) == {"204", "429", "503"}
    assert "Retry-After" in operacao["responses"]["429"]["headers"]
    assert all("content" not in resposta for resposta in operacao["responses"].values())
    assert not operacao.get("parameters")


def _rotas_estaticas(pasta: Path) -> set[str]:
    rotas = set()
    for arquivo in pasta.rglob("*"):
        eh_arquivo = arquivo.is_file()
        if (eh_arquivo and arquivo.stem.endswith("__virtual")) or any(
            caractere in arquivo.name for caractere in "[]{}"
        ):
            raise AssertionError(
                f"{arquivo.relative_to(pasta).as_posix()} usa uma convenção desconhecida. "
                "O coletor de rotas precisa aprender essa convenção antes de a página "
                "entrar na contagem."
            )
        if not eh_arquivo or arquivo.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
            continue
        partes = arquivo.relative_to(pasta).with_suffix("").parts
        if any(parte.startswith(("-", ".")) for parte in partes):
            continue
        # No TanStack, pontos aninham rotas e layouts com _ inicial não ganham caminho.
        segmentos = "/".join(partes).removesuffix(".lazy").replace(".", "/").split("/")
        if segmentos[-1] == "route":
            segmentos.pop()
        if not segmentos or segmentos[-1].startswith("_"):
            continue
        if segmentos[-1] == "index":
            segmentos.pop()
        caminho = "/".join(
            segmento.removesuffix("_")
            for segmento in segmentos
            if not (
                segmento.startswith("_") or (segmento.startswith("(") and segmento.endswith(")"))
            )
        )
        if "$" not in caminho:
            rotas.add(f"/{caminho}")
    return rotas


@pytest.mark.parametrize("nome", ["ajuda/__virtual.ts", "[index].tsx", "{-$pagina}.tsx"])
def test_coletor_de_rotas_rejeita_convencao_desconhecida(tmp_path, nome):
    arquivo = tmp_path / nome
    arquivo.parent.mkdir(parents=True, exist_ok=True)
    arquivo.touch()

    with pytest.raises(AssertionError, match="O coletor de rotas precisa aprender") as erro:
        _rotas_estaticas(tmp_path)

    assert nome in str(erro.value)


def test_catalogo_de_visitas_e_leituras_acompanha_o_conteudo_do_site():
    from mandatometro.paginas_publicas import ARTIGOS_POR_TRILHA, CAMINHOS_PUBLICOS

    site = Path(__file__).resolve().parents[2] / "web"
    conteudo = site / "conteudo"
    trilhas = {
        arquivo.parent.name: arquivo.parent for arquivo in conteudo.glob("trilhas/*/trilha.md")
    }
    especiais = {"infografico", "quiz", "quiz-final", "trilha"}
    artigos = {
        trilha: {arquivo.stem for arquivo in pasta.glob("*.md")} - especiais
        for trilha, pasta in trilhas.items()
    }
    assert {trilha: set(slugs) for trilha, slugs in ARTIGOS_POR_TRILHA.items()} == artigos
    rotas_de_trilhas = {
        f"/trilhas/{trilha}/{arquivo.stem}"
        for trilha, pasta in trilhas.items()
        for arquivo in pasta.glob("*.md")
        if arquivo.stem not in {"trilha", "infografico"}
    } | {f"/trilhas/{trilha}" for trilha in trilhas}
    rotas_de_jogos = {
        f"/jogos/{arquivo.parent.name}" for arquivo in conteudo.glob("jogo/*/jogo.md")
    }
    rotas_estaticas = _rotas_estaticas(site / "src" / "routes")
    excluidas = {
        "/cadastro",
        "/cadastro/confirmar",
        "/cadastro/excluir",
        "/cadastro/recuperar",
        "/cadastro/redefinir",
        "/cadastro/reenvio",
        "/login",
        "/newsletter/sair",
        "/painel",
        "/painel/numeros",
        "/painel/opinioes",
        "/perfil",
    }
    assert excluidas <= rotas_estaticas
    assert excluidas.isdisjoint(CAMINHOS_PUBLICOS)
    rotas_publicas = (rotas_estaticas - excluidas) | rotas_de_trilhas | rotas_de_jogos
    assert rotas_publicas == CAMINHOS_PUBLICOS


def test_dicionario_descreve_o_envio_de_visitas_pela_integracao_do_site():
    dicionario = Path(__file__).resolve().parents[3] / "docs" / "dicionario-de-dados.md"
    paragrafos = dicionario.read_text(encoding="utf-8").split("\n\n")
    integracao = next(
        paragrafo for paragrafo in paragrafos if paragrafo.startswith("`POST /visitas`")
    )
    assert "#298" in integracao
    assert "`pathname`" in integracao
    assert '`credentials: "omit"`' in integracao
