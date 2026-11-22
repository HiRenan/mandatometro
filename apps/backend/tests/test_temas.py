import json
from pathlib import Path

import pytest

from mandatometro.temas import tema_da_camara, tema_do_senado

FIXTURES = Path(__file__).parent / "fixtures/temas"


def test_conversao_de_todo_o_catalogo_da_camara():
    catalogo = json.loads((FIXTURES / "catalogo-camara.json").read_text(encoding="utf-8"))
    assert len({item["cod"] for item in catalogo}) == 32
    for item in catalogo:
        assert tema_da_camara(int(item["cod"])) == item["tema"], item["nome"]
    assert tema_da_camara(999999) is None


def test_conversao_de_toda_a_hierarquia_do_senado():
    catalogo = json.loads((FIXTURES / "catalogo-senado.json").read_text(encoding="utf-8"))
    assert len({item["codigo"] for item in catalogo}) == 179
    for item in catalogo:
        caminho = item["descricaoHierarquia"]
        assert tema_do_senado(caminho) == item["tema"], caminho


@pytest.mark.parametrize(
    "caminho",
    [
        "Política Social",
        "Política Social / Proteção Social",
        "Política Social / Saúde de outro catálogo",
        "Jurídico / Processo / Nova classificação",
        "Nova raiz / Saúde",
    ],
)
def test_classificacao_sem_caminho_reconhecido_nao_ganha_tema(caminho):
    assert tema_do_senado(caminho) is None
