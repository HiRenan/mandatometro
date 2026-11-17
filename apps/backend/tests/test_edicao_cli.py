import json
from pathlib import Path

import pytest
from test_edicao_revisao import abrir as abrir
from test_edicao_revisao import pronto
from test_edicao_selecao import FIM, INICIO
from test_edicao_selecao import dados as dados

from mandatometro.cli import main
from mandatometro.config import Config
from mandatometro.ia import cli
from mandatometro.ia.artigos import CATALOGO
from mandatometro.ia.servico import exportar, gerar


@pytest.mark.parametrize(
    "args",
    [
        ["--inicio", "2026-11-09"],
        ["--teto", "0"],
        ["--teto", "-1"],
        ["--inicio", "2026-11-15", "--fim", "2026-11-09"],
    ],
)
def test_argumentos_invalidos_antes_de_abrir_banco(monkeypatch, args):
    monkeypatch.setattr(cli, "sessao_do_banco", lambda: pytest.fail("Não deve abrir banco."))
    assert main(["edicao", "rascunho", *args]) == 2


def test_cli_do_rascunho_a_publicacao_sem_rede(monkeypatch, abrir, dados, tmp_path, capsys):
    dados(10)
    monkeypatch.setattr(cli, "sessao_do_banco", abrir)
    assert (
        main(["edicao", "rascunho", "--inicio", "2026-11-09", "--fim", "2026-11-15", "--teto", "1"])
        == 0
    )
    edicao_id = str(json.loads(capsys.readouterr().out)["edicao_id"])
    caminho = tmp_path / "revisao.json"
    assert main(["edicao", "exportar", edicao_id, "--arquivo", str(caminho)]) == 0
    capsys.readouterr()
    conteudo = caminho.read_text("utf-8")
    assert "Redação" in conteudo and "\\u00e7" not in conteudo
    assert main(["edicao", "exportar", edicao_id, "--arquivo", str(caminho)]) == 1
    capsys.readouterr()
    caminho.write_text(json.dumps(pronto(json.loads(conteudo)), ensure_ascii=False), "utf-8")
    assert main(["edicao", "revisar", edicao_id, "--arquivo", str(caminho)]) == 0
    capsys.readouterr()
    caminho.unlink()
    assert main(["edicao", "publicar", edicao_id]) == 0
    capsys.readouterr()
    assert main(["edicao", "mostrar", edicao_id]) == 0
    assert "A proposta organiza" in capsys.readouterr().out


def test_arquivo_invalido_nao_repete_conteudo(monkeypatch, tmp_path, capsys):
    caminho = tmp_path / "erro.json"
    caminho.write_text("segredo-ficticio", encoding="utf-8")
    monkeypatch.setattr(cli, "sessao_do_banco", lambda: pytest.fail("Não deve abrir banco."))
    assert main(["edicao", "revisar", "1", "--arquivo", str(caminho)]) == 1
    assert "segredo-ficticio" not in capsys.readouterr().out


@pytest.mark.parametrize(
    ("campo", "prefixo", "nome_campo"),
    [
        ("edicao", "Edição", "título"),
        ("item", "Item 2", "título"),
        ("explicacao", "Item 2", "explicação"),
    ],
)
def test_revisar_recusa_acento_quebrado_sem_alterar_banco(
    monkeypatch, abrir, dados, tmp_path, capsys, campo, prefixo, nome_campo
):
    dados(10)
    dados(20)
    monkeypatch.setattr(cli, "sessao_do_banco", abrir)
    edicao_id = gerar(abrir, INICIO, FIM)["edicao_id"]
    antes = exportar(abrir, edicao_id)
    arquivo = pronto(exportar(abrir, edicao_id))
    if campo == "edicao":
        alvo, chave = arquivo, "titulo"
    elif campo == "item":
        alvo, chave = arquivo["itens"][1], "titulo"
    else:
        alvo, chave = arquivo["itens"][1]["explicacao"], 1
    alvo[chave] = "A gest?o fictícia organiza o serviço."
    caminho = tmp_path / "revisao.json"
    caminho.write_text(json.dumps(arquivo, ensure_ascii=False), encoding="utf-8")

    assert main(["edicao", "revisar", str(edicao_id), "--arquivo", str(caminho)]) == 1
    saida = capsys.readouterr()
    assert saida.err == ""
    assert json.loads(saida.out) == {
        "erro": (
            f'{prefixo}: o campo {nome_campo} tem acentos quebrados, como "?" ou "Ã£" '
            "no lugar de uma letra. Confira os acentos e salve o arquivo em UTF-8."
        )
    }
    assert exportar(abrir, edicao_id) == antes

    corrigido = "A gestão fictícia organiza o serviço."
    alvo[chave] = corrigido
    caminho.write_text(json.dumps(arquivo, ensure_ascii=False), encoding="utf-8")
    assert main(["edicao", "revisar", str(edicao_id), "--arquivo", str(caminho)]) == 0
    assert json.loads(capsys.readouterr().out)["situacao"] == "revisao_salva"
    salvo = exportar(abrir, edicao_id)
    if campo == "edicao":
        assert salvo["titulo"] == corrigido
    elif campo == "item":
        assert salvo["itens"][1]["titulo"] == corrigido
    else:
        assert salvo["itens"][1]["explicacao"][1] == corrigido


def test_chave_tem_repr_protegida_e_catalogo_so_tem_artigos_existentes():
    configuracao = Config(_env_file=None, llm_api_key="chave-ficticia")
    assert "chave-ficticia" not in repr(configuracao)
    raiz = Path(__file__).resolve().parents[3] / "apps/web/conteudo"
    assert len(CATALOGO) == 6
    for caminho, titulo in CATALOGO.items():
        artigo = raiz / (caminho.lstrip("/") + ".md")
        assert f"titulo: {titulo}" in artigo.read_text("utf-8").splitlines()
