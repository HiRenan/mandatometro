"""Fotografia editorial com fatos agregados e campos de revisão."""

import json
from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

Id = Annotated[int, Field(gt=0)]
Contagem = Annotated[int, Field(ge=0)]
Pendencia = Literal["redacao", "revisao", "cobertura", "artigo"]
OrigemSelecaoAto = Literal["modelo", "regra"]
CodigoFallbackSelecao = Literal[
    "sem_provedor",
    "recusa_provedor",
    "resposta_interrompida",
    "falha_provedor",
    "tempo_esgotado",
    "resposta_invalida",
]
LIMITE_MOTIVO_ATO = 160
MotivoSelecaoAto = Annotated[str, Field(min_length=1, max_length=LIMITE_MOTIVO_ATO)]


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


class SelecaoAto(Estrito):
    ordem: Id
    teto: Id
    origem: OrigemSelecaoAto
    motivo: MotivoSelecaoAto | None = Field(
        default=None, repr=False, exclude_if=lambda valor: valor is None
    )
    codigo_fallback: CodigoFallbackSelecao | None = Field(
        default=None, exclude_if=lambda valor: valor is None
    )


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
    selecao: SelecaoAto | None = Field(default=None, exclude_if=lambda valor: valor is None)


FatosItem = Fatos | FatosAto
_FATOS_ITEM = TypeAdapter(FatosItem)


class Redacao(Estrito):
    titulo: Annotated[str, Field(min_length=1, max_length=140)]
    explicacao: Annotated[list[str], Field(min_length=1, max_length=4)]


class AtoClassificado(Estrito):
    posicao: Id
    motivo: MotivoSelecaoAto = Field(repr=False)


class OrdemAtos(Estrito):
    ordem: Annotated[list[AtoClassificado], Field(min_length=1)]
