from fastapi import FastAPI
from fastapi.routing import APIRoute
from pydantic import BaseModel

from mandatometro.api.newsletter import router as newsletter


def _id_da_operacao(rota: APIRoute) -> str:
    # O nome da função vira o operationId do OpenAPI e, dele, o nome das funções do cliente
    # TypeScript (health -> healthOptions).
    return rota.name


app = FastAPI(title="Mandatômetro", version="0.1.0", generate_unique_id_function=_id_da_operacao)
app.include_router(newsletter)


class Saude(BaseModel):
    status: str


@app.get("/health", tags=["saude"])
def health() -> Saude:
    return Saude(status="ok")
