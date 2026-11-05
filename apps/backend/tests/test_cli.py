import json

from mandatometro.cli import main


def test_openapi_grava_o_esquema_da_api(tmp_path):
    caminho = tmp_path / "openapi.json"

    assert main(["openapi", str(caminho)]) == 0

    esquema = json.loads(caminho.read_text(encoding="utf-8"))
    assert esquema["paths"]["/health"]["get"]["operationId"] == "health"
