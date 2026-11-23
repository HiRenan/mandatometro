from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from pydantic import BaseModel

from mandatometro.api.congresso import temas_publicos
from mandatometro.api.contas import router as contas
from mandatometro.api.edicoes import router as edicoes
from mandatometro.api.esquemas import TemaPublico
from mandatometro.api.newsletter import router as newsletter
from mandatometro.api.painel import AcessoPainel, router_numeros
from mandatometro.api.painel import router as painel
from mandatometro.api.parlamentares import router as parlamentares
from mandatometro.api.piloto import router as piloto
from mandatometro.api.visitas import router as visitas
from mandatometro.api.votacoes import router as votacoes
from mandatometro.config import config
from mandatometro.temas import TEMAS


def _id_da_operacao(rota: APIRoute) -> str:
    # O nome da função vira o operationId do OpenAPI e, dele, o nome das funções do cliente
    # TypeScript (health -> healthOptions).
    return rota.name


app = FastAPI(title="Mandatômetro", version="0.1.0", generate_unique_id_function=_id_da_operacao)
app.add_middleware(AcessoPainel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[config().app_base_url],
    allow_methods=["GET", "POST", "DELETE"],
    allow_credentials=True,
    allow_headers=["Content-Type"],
    expose_headers=["Retry-After"],
)
app.include_router(newsletter)
app.include_router(contas)
app.include_router(edicoes)
app.include_router(painel)
app.include_router(router_numeros)
app.include_router(parlamentares)
app.include_router(piloto)
app.include_router(votacoes)
app.include_router(visitas)


class Saude(BaseModel):
    status: str


@app.get("/health", tags=["saude"])
def health() -> Saude:
    return Saude(status="ok")


@app.get("/temas", tags=["temas"], summary="Listar os temas do Mandatômetro")
def listar_temas() -> list[TemaPublico]:
    return temas_publicos(TEMAS)
