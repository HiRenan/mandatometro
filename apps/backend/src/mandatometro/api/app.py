from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from pydantic import BaseModel

from mandatometro.config import config


def _id_da_operacao(rota: APIRoute) -> str:
    # O nome da função vira o operationId do OpenAPI e, dele, o nome das funções do cliente
    # TypeScript (health -> healthOptions).
    return rota.name


app = FastAPI(title="Mandatômetro", version="0.1.0", generate_unique_id_function=_id_da_operacao)
app.add_middleware(CORSMiddleware, allow_origins=[config().app_base_url])


class Saude(BaseModel):
    status: str


@app.get("/health", tags=["saude"])
def health() -> Saude:
    return Saude(status="ok")
