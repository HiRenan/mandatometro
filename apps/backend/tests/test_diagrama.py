"""O diagrama do README, em "Modelo de dados", bate com os modelos: tabelas, colunas e ligações."""

import re
from pathlib import Path

import mandatometro.db.modelos  # noqa: F401  (registra as tabelas no Base.metadata)
from mandatometro.db import Base

README = Path(__file__).resolve().parents[3] / "README.md"


def _diagrama() -> str:
    texto = README.read_text(encoding="utf-8")
    bloco = re.search(r"```mermaid\nerDiagram\n(.*?)```", texto, re.DOTALL)
    assert bloco, "O README perdeu o diagrama do modelo (o bloco mermaid com erDiagram)."
    return bloco.group(1)


def test_o_diagrama_tem_as_tabelas_e_as_colunas_dos_modelos():
    entidades = re.findall(r"^ *(\w+) \{\n(.*?)^ *\}", _diagrama(), re.DOTALL | re.MULTILINE)
    no_diagrama = {
        tabela: {linha.split()[1] for linha in corpo.splitlines()} for tabela, corpo in entidades
    }
    nos_modelos = {
        tabela.name: set(tabela.columns.keys()) for tabela in Base.metadata.sorted_tables
    }
    assert no_diagrama == nos_modelos


def test_o_diagrama_tem_as_ligacoes_dos_modelos():
    no_diagrama = set(re.findall(r"^ *(\w+) \S+ (\w+) :", _diagrama(), re.MULTILINE))
    nos_modelos = {
        (chave.column.table.name, tabela.name)
        for tabela in Base.metadata.sorted_tables
        for chave in tabela.foreign_keys
    }
    assert no_diagrama == nos_modelos
