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
