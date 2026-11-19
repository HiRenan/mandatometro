"""Fotografia editorial: somente fatos agregados, nunca cadastro ou texto da fonte."""

import json
from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

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

    @staticmethod
    def ler(valor: dict) -> "FatosItem":
        # JSONB devolve datas como texto: a validação JSON estrita aceita o ISO da própria gravação.
        return _FATOS_ITEM.validate_json(json.dumps(valor))


class FatosAto(Estrito):
    versao: Literal[2]
    ato_id: Id
    data_publicacao: date
    fontes: Annotated[list[Id], Field(min_length=1)]
    hash_ato: Annotated[str, Field(pattern=r"^[0-9a-f]{64}$")]
    origem: Literal["codigo", "modelo", "revisao"] = "codigo"
    pendencias: list[Pendencia] = Field(default_factory=lambda: ["revisao", "cobertura"])
    privacidade_confirmada: bool | None = Field(
        default=None, exclude_if=lambda valor: valor is None
    )


FatosItem = Fatos | FatosAto
_FATOS_ITEM = TypeAdapter(FatosItem)


class Redacao(Estrito):
    titulo: Annotated[str, Field(min_length=1, max_length=140)]
    explicacao: Annotated[list[str], Field(min_length=1, max_length=4)]
