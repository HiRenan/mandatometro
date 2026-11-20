import json

from mandatometro.cli import main


def test_openapi_grava_o_esquema_da_api(tmp_path):
    caminho = tmp_path / "openapi.json"

    assert main(["openapi", str(caminho)]) == 0

    esquema = json.loads(caminho.read_text(encoding="utf-8"))
    assert esquema["paths"]["/health"]["get"]["operationId"] == "health"
    modelos = esquema["components"]["schemas"]
    perfil = modelos["PerfilConta"]
    assert perfil["properties"]["papel"]["enum"] == ["comum", "administradora"]
    assert "papel" in perfil["required"]
    assert {
        nome for nome, modelo in modelos.items() if "papel" in modelo.get("properties", {})
    } == {"PerfilConta"}
    resposta_perfil = esquema["paths"]["/contas/me"]["get"]["responses"]["200"]
    assert resposta_perfil["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/PerfilConta"
    }
