import asyncio
import json
from copy import deepcopy
from datetime import timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from test_edicao_atos import ato as ato
from test_edicao_revisao import abrir as abrir
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro import db
from mandatometro.api import contas
from mandatometro.api.app import app
from mandatometro.avisos.resend import Resend
from mandatometro.config import config
from mandatometro.db.modelos import Ato, Conta, CredencialConta, Edicao, Fonte, ItemEdicao
from mandatometro.ia import servico
from mandatometro.ia.selecao import ItemAtoBase

RASCUNHO = "/painel/edicoes/rascunho"
INEXISTENTE = "/rota-inexistente"
ORIGEM = config().app_base_url
LIMITE = 2 * 1024 * 1024
MARCADOR = "entrada.editorial@example.com"


def _revisao(edicao_id):
    return f"/painel/edicoes/{edicao_id}/revisao"


def _publicacao(edicao_id):
    return f"/painel/edicoes/{edicao_id}/publicar"


def _status(resposta, codigo):
    assert resposta.status_code == codigo
    assert resposta.headers["cache-control"] == "no-store"
    return resposta.json()


def _erro(resposta, codigo, mensagem):
    assert _status(resposta, codigo) == {"detail": mensagem}


def _mesma_resposta(resposta, inexistente):
    assert resposta.status_code == inexistente.status_code
    assert resposta.content == inexistente.content
    assert sorted(resposta.headers.raw) == sorted(inexistente.headers.raw)


@pytest.fixture
def cliente(abrir, monkeypatch):
    monkeypatch.setattr(db, "sessao", abrir)
    monkeypatch.setattr(contas, "sessao", abrir)
    monkeypatch.setattr(config(), "conta_chave", None)
    return TestClient(app)


@pytest.fixture
def credencial(sessao):
    def criar(papel="administradora", *, vencida=False, finalidade="sessao"):
        token = uuid4().hex
        instante = contas.agora()
        conta = Conta(
            id=uuid4(),
            nome="Pessoa Fictícia",
            email=f"{token}@example.com",
            senha_hash="hash-ficticio",
            termo="teste",
            aceite_em=instante,
            criada_em=instante,
            confirmada_em=instante,
            papel=papel,
        )
        sessao.add(conta)
        sessao.flush()
        sessao.add(
            CredencialConta(
                conta_id=conta.id,
                resumo=contas.resumo(token),
                finalidade=finalidade,
                expira=instante + timedelta(days=-1 if vencida else 1),
            )
        )
        sessao.flush()
        return conta, f"sessao_conta={token}"

    return criar


@pytest.fixture
def admin(credencial):
    _, cookie = credencial()
    return {"Cookie": cookie, "Origin": ORIGEM}


@pytest.fixture
def edicao_id(abrir, dados):
    dados(10, valores=("sim", "abstencao", "nao_votou"))
    return servico.gerar(abrir, INICIO, FIM)["edicao_id"]


@pytest.fixture
def edicao_com_atos(ato, edicao_id, sessao):
    retido = Ato(
        origem="coleta_exemplo",
        id_externo="ato-retido-exemplo",
        tipo="decreto",
        titulo="Nomeia Bibiana Inventada para o cargo de teste.",
        ementa="Ementa reservada fictícia.",
        orgao="Órgão reservado fictício.",
        data_publicacao=ato.data_publicacao,
        fonte=Fonte(
            url="https://www.senado.leg.br/dados/ato-retido-exemplo",
            url_publica="https://www.in.gov.br/ato-retido-exemplo",
            coletado_em=ato.fonte.coletado_em,
            trecho="Trecho reservado fictício.",
        ),
    )
    sessao.add(retido)
    sessao.flush()
    sessao.expire_all()
    edicao = sessao.get(Edicao, edicao_id)
    fatos = ItemAtoBase.de_ato(retido).fatos
    fatos.privacidade_confirmada = False
    edicao.itens.append(
        ItemEdicao(
            ordem=len(edicao.itens) + 1,
            titulo="Ato do Diário Oficial",
            texto=servico.PENDENTE_ATO,
            fonte=retido.fonte,
            fatos=fatos.model_dump(mode="json"),
        )
    )
    sessao.flush()
    return edicao.id, retido


def test_leitura_sem_rascunho_mesmo_com_edicao_publicada(cliente, admin, sessao):
    sessao.add(
        Edicao(
            titulo="Edição publicada fictícia",
            inicio=INICIO,
            fim=FIM,
            estado="publicada",
            publicada_em=contas.agora(),
        )
    )
    sessao.flush()
    assert _status(cliente.get(RASCUNHO, headers=admin), 200) is None


def test_leitura_equivale_a_exportar_votacao_e_atos(cliente, admin, abrir, edicao_com_atos, sessao):
    id_, retido = edicao_com_atos
    sessao.add_all(
        [
            Edicao(titulo="Rascunho antigo", inicio=INICIO, fim=FIM - timedelta(days=1)),
            Edicao(
                titulo="Publicação mais recente",
                inicio=INICIO,
                fim=FIM + timedelta(days=1),
                estado="publicada",
                publicada_em=contas.agora(),
            ),
        ]
    )
    sessao.flush()

    resposta = cliente.get(RASCUNHO, headers=admin)
    arquivo = _status(resposta, 200)
    assert arquivo == servico.exportar(abrir, id_)
    assert resposta.headers["access-control-allow-origin"] == ORIGEM
    assert resposta.headers["access-control-allow-credentials"] == "true"
    assert [item["fatos"]["versao"] for item in arquivo["itens"]] == [1, 2, 2]
    votacao, ato_elegivel, ato_retido = arquivo["itens"]
    assert votacao["contexto"]["votacoes"][0]["descricao"] == "Aprovado o projeto."
    assert votacao["fatos"]["votacoes"][0]["placar"]["sim"] == 1
    assert ato_elegivel["contexto"] == {}
    assert ato_retido["contexto"]["motivo_retencao"] == "ato_de_pessoal"
    assert ato_retido["privacidade_confirmada"] is False
    assert ato_retido["fontes"][0]["url_publica"] == retido.fonte.url_publica
    assert ato_retido["fontes"][0]["trecho"] is None
    assert retido.titulo not in resposta.text and retido.ementa not in resposta.text


def test_salva_texto_e_confirmacoes_e_recusa_arquivo_antigo(cliente, admin, abrir, edicao_id):
    original = servico.exportar(abrir, edicao_id)
    editado = pronto(deepcopy(original))
    editado["titulo"] = "Jornal legislativo da semana"
    editado["itens"][0]["explicacao"] = ["O projeto organiza um serviço público."]
    caminho = _revisao(edicao_id)

    assert _status(cliente.post(caminho, headers=admin, json=editado), 200) == {
        "situacao": "revisao_salva",
        "edicao_id": edicao_id,
        "itens": 1,
        "pendencias": [],
        "avisos": [],
    }
    atual = servico.exportar(abrir, edicao_id)
    assert atual["titulo"] == editado["titulo"]
    assert atual["cobertura_confirmada"] is True
    assert atual["itens"][0]["explicacao"] == editado["itens"][0]["explicacao"]
    assert atual["itens"][0]["revisado"] and atual["itens"][0]["artigo_confirmado"]
    assert atual["versao_rascunho"] != original["versao_rascunho"]
    _erro(
        cliente.post(caminho, headers=admin, json=original),
        409,
        "Esse arquivo é antigo ou de outra edição. Exporte o rascunho atual.",
    )
    assert servico.exportar(abrir, edicao_id) == atual


@pytest.mark.parametrize("campo", ["fatos", "fontes", "contexto"])
def test_recusa_editar_campo_de_consulta(cliente, admin, abrir, edicao_id, campo):
    original = servico.exportar(abrir, edicao_id)
    arquivo = pronto(deepcopy(original))
    arquivo["itens"][0][campo] = [] if campo == "fontes" else {}
    _erro(
        cliente.post(_revisao(edicao_id), headers=admin, json=arquivo),
        422,
        f"Item 1: o campo {campo} é de consulta e não pode mudar. "
        "Exporte o rascunho novamente e refaça os ajustes.",
    )
    assert servico.exportar(abrir, edicao_id) == original


@pytest.mark.parametrize("decisao", ["excluir", "confirmar"])
def test_revisao_exige_decisao_para_ato_retido(cliente, admin, abrir, edicao_com_atos, decisao):
    id_, _ = edicao_com_atos
    original = servico.exportar(abrir, id_)
    arquivo = pronto(deepcopy(original))
    item_retido = arquivo["itens"][-1]
    caminho = _revisao(id_)
    prefixo = "Item 3 (ato_de_pessoal)."
    _erro(
        cliente.post(caminho, headers=admin, json=arquivo),
        422,
        f"{prefixo} Marque privacidade_confirmada ou use excluir com motivo_exclusao.",
    )
    if decisao == "excluir":
        item_retido["excluir"] = True
        _erro(
            cliente.post(caminho, headers=admin, json=arquivo),
            422,
            f"{prefixo} Preencha o campo motivo_exclusao.",
        )
        item_retido["motivo_exclusao"] = "Decisão editorial fictícia."
    else:
        item_retido["privacidade_confirmada"] = True
    assert servico.exportar(abrir, id_) == original

    resultado = _status(cliente.post(caminho, headers=admin, json=arquivo), 200)
    assert resultado["pendencias"] == []
    assert resultado["itens"] == (2 if decisao == "excluir" else 3)
    atual = servico.exportar(abrir, id_)
    if decisao == "excluir":
        assert len(atual["itens"]) == 2
        assert resultado["avisos"] == []
    else:
        assert atual["itens"][-1]["privacidade_confirmada"] is True
        assert resultado["avisos"] == [f"{prefixo} {servico.AVISO_ATO_RETIDO}"]


def test_publicar_recusa_ato_retido_sem_confirmacao(cliente, admin, edicao_com_atos, sessao):
    id_, _ = edicao_com_atos
    # Os primeiros itens já estão prontos em um rascunho que ainda contém o ato retido.
    edicao = sessao.get(Edicao, id_)
    for item in edicao.itens[:-1]:
        item.fatos = {**item.fatos, "pendencias": []}
        item.texto = "Explicação fictícia conferida."
    sessao.flush()
    _erro(
        cliente.post(_publicacao(id_), headers=admin),
        422,
        "Item 3 (ato_de_pessoal). Marque privacidade_confirmada ou "
        "use excluir com motivo_exclusao.",
    )


def test_publicar_exige_revisao_e_repetir_preserva_publicacao(
    cliente, admin, abrir, edicao_id, sessao, monkeypatch
):
    async def enviar(*args, **kwargs):
        pytest.fail("Publicar não envia e-mail.", pytrace=False)

    monkeypatch.setattr(Resend, "enviar", enviar)
    publicar = _publicacao(edicao_id)
    revisao = _revisao(edicao_id)
    arquivo = pronto(servico.exportar(abrir, edicao_id))
    arquivo["cobertura_confirmada"] = False
    assert _status(cliente.post(revisao, headers=admin, json=arquivo), 200)["pendencias"] == [
        "cobertura"
    ]
    _erro(
        cliente.post(publicar, headers=admin),
        422,
        "Item 1: há pendência de cobertura. Exporte e revise.",
    )
    arquivo = servico.exportar(abrir, edicao_id)
    arquivo["cobertura_confirmada"] = True
    assert _status(cliente.post(revisao, headers=admin, json=arquivo), 200)["pendencias"] == []
    assert _status(cliente.post(publicar, headers=admin), 200) == {
        "situacao": "publicada",
        "edicao_id": edicao_id,
    }
    publicada_em = sessao.scalar(select(Edicao.publicada_em).where(Edicao.id == edicao_id))
    assert publicada_em is not None
    assert _status(cliente.post(publicar, headers=admin), 200) == {
        "situacao": "ja_publicada",
        "edicao_id": edicao_id,
    }
    assert sessao.scalar(select(Edicao.publicada_em).where(Edicao.id == edicao_id)) == publicada_em
    _erro(
        cliente.post(revisao, headers=admin, json=arquivo),
        409,
        "A edição publicada não pode ser revisada.",
    )
    assert _status(cliente.get(RASCUNHO, headers=admin), 200) is None


def test_edicao_inexistente_tem_erro_editorial(cliente, admin, abrir, edicao_id):
    faltante = edicao_id + 1
    mensagem = "Não encontramos essa edição. Confira o número informado."
    arquivo = servico.exportar(abrir, edicao_id)
    _erro(cliente.post(_revisao(faltante), headers=admin, json=arquivo), 404, mensagem)
    _erro(cliente.post(_publicacao(faltante), headers=admin), 404, mensagem)


@pytest.mark.parametrize(
    "autenticacao", ["ausente", "inventada", "vencida", "comum", "revogada", "recuperacao"]
)
def test_nao_administradora_recebe_o_mesmo_que_rota_inexistente(
    cliente, credencial, sessao, edicao_id, abrir, autenticacao
):
    cabecalhos = {"Origin": ORIGEM, "Content-Type": "application/json"}
    if autenticacao == "inventada":
        cabecalhos["Cookie"] = "sessao_conta=inventada"
    elif autenticacao != "ausente":
        conta, cabecalhos["Cookie"] = credencial(
            "comum" if autenticacao == "comum" else "administradora",
            vencida=autenticacao == "vencida",
            finalidade="recuperacao" if autenticacao == "recuperacao" else "sessao",
        )
        if autenticacao == "revogada":
            assert _status(cliente.get(RASCUNHO, headers=cabecalhos), 200)["edicao_id"] == edicao_id
            conta.papel = "comum"
            sessao.flush()

    original = servico.exportar(abrir, edicao_id)
    casos = [
        ("GET", RASCUNHO, b""),
        ("POST", _revisao(edicao_id), json.dumps(pronto(deepcopy(original))).encode()),
        ("POST", _revisao(edicao_id), b"{"),
        ("POST", _revisao(edicao_id), b""),
        ("POST", _revisao(edicao_id), b" " * (LIMITE + 1)),
        ("POST", _revisao(edicao_id + 1), b"{}"),
        ("POST", _revisao("invalido"), b"{}"),
        ("POST", _publicacao(edicao_id), b""),
        ("POST", _publicacao(edicao_id + 1), b""),
        ("POST", _publicacao("invalido"), b""),
        ("HEAD", RASCUNHO, b""),
        ("OPTIONS", _revisao(edicao_id), b""),
        ("POST", RASCUNHO, b"{"),
        ("DELETE", _publicacao(edicao_id), b""),
        ("GET", f"{RASCUNHO}/", b""),
        ("POST", "/painel/rota-inexistente", b"{"),
        ("GET", "/painel", b""),
    ]
    for metodo, caminho, corpo in casos:
        resposta = cliente.request(metodo, caminho, content=corpo, headers=cabecalhos)
        controle = cliente.request(metodo, INEXISTENTE, content=corpo, headers=cabecalhos)
        assert controle.status_code == 404
        _mesma_resposta(resposta, controle)
    assert servico.exportar(abrir, edicao_id) == original


def test_preflight_cors_independe_do_caminho():
    cliente = TestClient(app)
    for origem, codigo in ((ORIGEM, 200), ("https://outro.example.com", 400)):
        cabecalhos = {
            "Origin": origem,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        }
        controle = cliente.options(INEXISTENTE, headers=cabecalhos)
        assert controle.status_code == codigo
        _mesma_resposta(cliente.options(_revisao(1), headers=cabecalhos), controle)


@pytest.mark.parametrize("origem", [None, "https://outro.example.com"])
def test_mutacoes_exigem_origem_do_site_antes_do_corpo(cliente, admin, edicao_id, origem):
    cabecalhos = {"Cookie": admin["Cookie"], "Content-Type": "application/json"}
    if origem:
        cabecalhos["Origin"] = origem
    for caminho in (_revisao(edicao_id), _publicacao(edicao_id)):
        resposta = cliente.post(caminho, headers=cabecalhos, content=b"{")
        _erro(resposta, 403, "Origem inválida.")
        assert "access-control-allow-origin" not in resposta.headers


@pytest.mark.parametrize(
    "corpo",
    [b"", b'{"titulo":"entrada.editorial@example.com"', b'"\xff"', b"null", b"[]"],
    ids=["ausente", "json-quebrado", "utf8-invalido", "nulo", "lista"],
)
def test_json_invalido_tem_erro_sem_entrada(cliente, admin, edicao_id, corpo, caplog):
    cabecalhos = {**admin, "Content-Type": "application/json"}
    resposta = cliente.post(_revisao(edicao_id), headers=cabecalhos, content=corpo)
    detalhe = _status(resposta, 422)
    assert list(detalhe) == ["detail"] and isinstance(detalhe["detail"], str)
    assert MARCADOR not in resposta.text + caplog.text


def test_validacao_do_arquivo_vem_do_servico_sem_repetir_a_entrada(
    cliente, admin, abrir, edicao_id, caplog
):
    arquivo = servico.exportar(abrir, edicao_id)
    arquivo["itens"][0]["titulo"] = {"entrada": MARCADOR}
    resposta = cliente.post(_revisao(edicao_id), headers=admin, json=arquivo)
    _erro(resposta, 422, "Item 1: confira o campo título.")
    assert MARCADOR not in resposta.text + caplog.text
    _erro(
        cliente.post(_publicacao(MARCADOR), headers=admin),
        422,
        "Confira o formato do pedido.",
    )


@pytest.mark.parametrize("operacao", ["exportar", "revisar", "publicar"])
def test_excecao_inesperada_tem_erro_e_log_fixos(
    cliente, admin, edicao_id, caplog, monkeypatch, operacao
):
    def falhar(*args):
        raise OperationalError(f"SQL com {MARCADOR}", {}, RuntimeError(MARCADOR))

    monkeypatch.setattr(servico, operacao, falhar)
    if operacao == "exportar":
        resposta = cliente.get(RASCUNHO, headers=admin)
    elif operacao == "revisar":
        resposta = cliente.post(_revisao(edicao_id), headers=admin, json={"entrada": MARCADOR})
    else:
        resposta = cliente.post(_publicacao(edicao_id), headers=admin)
    _erro(resposta, 500, "Não foi possível concluir a operação do painel.")
    assert caplog.messages == ["Falha na operação do painel de revisão."]
    assert MARCADOR not in resposta.text + caplog.text


def _post_asgi(caminho, cabecalhos, blocos):
    async def executar():
        resposta = []

        async def receber():
            return {"type": "http.request", "body": next(blocos), "more_body": True}

        async def enviar(mensagem):
            resposta.append(mensagem)

        await app(
            {
                "type": "http",
                "asgi": {"version": "3.0"},
                "http_version": "1.1",
                "method": "POST",
                "scheme": "http",
                "path": caminho,
                "query_string": b"",
                "headers": [(k.lower().encode(), v.encode()) for k, v in cabecalhos.items()],
                "server": ("testserver", 80),
                "client": ("127.0.0.1", 1234),
                "root_path": "",
            },
            receber,
            enviar,
        )
        return resposta

    return asyncio.run(executar())


def test_guarda_nao_le_o_corpo_sem_sessao(monkeypatch):
    def abrir_banco():
        pytest.fail("Não deve abrir o banco sem cookie.", pytrace=False)

    monkeypatch.setattr(contas, "sessao", abrir_banco)
    cabecalhos = {"Content-Type": "application/json", "Content-Length": str(LIMITE + 1)}
    assert _post_asgi(_revisao(1), cabecalhos, iter(())) == _post_asgi(
        INEXISTENTE, cabecalhos, iter(())
    )


@pytest.mark.parametrize("comprimento", [None, "1", str(LIMITE + 1)])
def test_limite_precede_json_e_nao_depende_do_content_length(
    cliente, admin, edicao_id, comprimento, monkeypatch
):
    def revisar(*args):
        pytest.fail("O corpo excedente não deve chegar ao serviço.", pytrace=False)

    monkeypatch.setattr(servico, "revisar", revisar)
    cabecalhos = {**admin, "Content-Type": "application/json"}
    if comprimento is not None:
        cabecalhos["Content-Length"] = comprimento
    blocos = (b"{" * LIMITE, b" ") if comprimento != str(LIMITE + 1) else ()
    inicio, corpo = _post_asgi(_revisao(edicao_id), cabecalhos, iter(blocos))
    assert inicio["status"] == 413
    assert (b"cache-control", b"no-store") in inicio["headers"]
    assert json.loads(corpo["body"]) == {"detail": "O corpo da revisão excede o limite de 2 MiB."}


def test_limite_aceita_revisao_de_treze_itens(cliente, admin, abrir, dados, sessao, ato):
    for numero in range(1, 9):
        dados(numero)
    for numero in range(1, 5):
        sessao.add(
            Ato(
                origem=ato.origem,
                id_externo=f"ato-ficticio-{numero}",
                tipo=ato.tipo,
                titulo=ato.titulo,
                ementa=ato.ementa,
                data_publicacao=ato.data_publicacao,
                fonte=ato.fonte,
            )
        )
    sessao.flush()
    edicao_id = servico.gerar(abrir, INICIO, FIM)["edicao_id"]
    arquivo = pronto(servico.exportar(abrir, edicao_id))
    assert len(arquivo["itens"]) == 13
    corpo = json.dumps(arquivo, ensure_ascii=False).encode()
    assert len(corpo) < LIMITE // 2
    cabecalhos = {**admin, "Content-Type": "application/json"}
    resposta = cliente.post(_revisao(edicao_id), headers=cabecalhos, content=corpo.ljust(LIMITE))
    assert _status(resposta, 200)["itens"] == 13


def test_openapi_declara_as_tres_operacoes_e_seus_modelos():
    contrato = app.openapi()
    caminhos = contrato["paths"]
    painel = {
        caminho: operacoes
        for caminho, operacoes in caminhos.items()
        if caminho.startswith("/painel")
    }
    assert {c: set(o) for c, o in painel.items()} == {
        RASCUNHO: {"get"},
        _revisao("{id}"): {"post"},
        _publicacao("{id}"): {"post"},
    }
    leitura = painel[RASCUNHO]["get"]
    revisao = painel[_revisao("{id}")]["post"]
    publicacao = painel[_publicacao("{id}")]["post"]
    assert publicacao.get("requestBody") is None
    schema = revisao["requestBody"]["content"]["application/json"]["schema"]
    modelo_arquivo = contrato["components"]["schemas"]["ArquivoRevisao"]
    assert schema["properties"] == modelo_arquivo["properties"]
    assert schema["required"] == modelo_arquivo["required"]
    respostas = leitura["responses"]["200"]["content"]["application/json"]["schema"]["anyOf"]
    assert {"type": "null"} in respostas
    for operacao, modelo in [(revisao, "ResultadoRevisao"), (publicacao, "ResultadoPublicacao")]:
        respostas = operacao["responses"]
        assert respostas["200"]["content"]["application/json"]["schema"] == {
            "$ref": f"#/components/schemas/{modelo}"
        }
        for codigo in ("403", "404", "422", "500"):
            assert respostas[codigo]["content"]["application/json"]["schema"] == {
                "$ref": "#/components/schemas/ErroPainel"
            }
