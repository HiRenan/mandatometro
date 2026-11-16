from datetime import date, datetime
from typing import Literal
from unicodedata import category

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from mandatometro.avisos.inscricao import SituacaoInscricao


class PedidoInscricao(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(max_length=320, description="Somente o endereço de e-mail.")

    @field_validator("email", mode="before")
    @classmethod
    def apenas_endereco(cls, valor: object) -> str:
        if not isinstance(valor, str) or any(
            c in "<>" or category(c).startswith("C") for c in valor
        ):
            raise ValueError("Informe somente o endereço de e-mail.")
        return valor.strip()

    @field_validator("email")
    @classmethod
    def minusculas(cls, valor: str) -> str:
        return valor.lower()


class ResultadoInscricao(BaseModel):
    situacao: SituacaoInscricao


class ErroNewsletter(BaseModel):
    erro: Literal["dados_invalidos", "limite_de_inscricoes", "servico_indisponivel"]


class ErroEdicaoPublica(BaseModel):
    erro: Literal["dados_invalidos", "edicao_nao_encontrada", "servico_indisponivel"]


class ResumoEdicao(BaseModel):
    id: int
    titulo: str
    inicio: date
    fim: date
    publicada_em: datetime


class ListaEdicoes(BaseModel):
    edicoes: list[ResumoEdicao]
    total: int
    limite: int
    deslocamento: int


class FontePublica(BaseModel):
    url: str
    coletado_em: datetime
    trecho: str | None


class PlacarPublico(BaseModel):
    sim: int
    nao: int
    abstencao: int
    obstrucao: int
    presidente: int


class VotacaoPublica(BaseModel):
    data: date
    resultado: Literal["aprovada", "rejeitada", "outro"]
    placar: PlacarPublico | None
    fontes: list[FontePublica]


class FatosPublicos(BaseModel):
    votacoes: list[VotacaoPublica]


class ArtigoDaEdicao(BaseModel):
    titulo: str
    caminho: str


class ItemPublico(BaseModel):
    ordem: int
    titulo: str
    texto: str
    fatos: FatosPublicos | None
    fontes: list[FontePublica]
    artigo: ArtigoDaEdicao | None


class EdicaoPublica(ResumoEdicao):
    itens: list[ItemPublico]
