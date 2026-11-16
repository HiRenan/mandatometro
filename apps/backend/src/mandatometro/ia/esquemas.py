"""Fotografia editorial: somente fatos agregados, nunca cadastro ou texto da fonte."""

import json
from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

Id = Annotated[int, Field(gt=0)]
Contagem = Annotated[int, Field(ge=0)]
Pendencia = Literal["redacao", "revisao", "cobertura", "artigo"]


class Estrito(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Placar(Estrito):
    sim: Contagem = 0
    nao: Contagem = 0
    abstencao: Contagem = 0
    obstrucao: Contagem = 0
    presidente: Contagem = 0


class FatoVotacao(Estrito):
    id: Id
    data: date
    resultado: Literal["aprovada", "rejeitada", "outro"]
    placar: Placar | None
    fontes: Annotated[list[Id], Field(min_length=1)]


class Fatos(Estrito):
    versao: Literal[1] = 1
    proposicoes: Annotated[list[Id], Field(min_length=1)]
    votacoes: Annotated[list[FatoVotacao], Field(min_length=1)]
    fontes: Annotated[list[Id], Field(min_length=1)]
    origem: Literal["codigo", "modelo", "revisao"] = "codigo"
    pendencias: list[Pendencia] = Field(default_factory=lambda: ["revisao", "cobertura"])

    @classmethod
    def ler(cls, valor: dict) -> "Fatos":
        # JSONB devolve datas como texto: a validação JSON estrita aceita o ISO da própria gravação.
        return cls.model_validate_json(json.dumps(valor))


class Redacao(Estrito):
    titulo: Annotated[str, Field(min_length=1, max_length=140)]
    explicacao: Annotated[list[str], Field(min_length=1, max_length=4)]
