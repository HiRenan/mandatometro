from typing import Literal
from unicodedata import category

from pydantic import UUID4, BaseModel, ConfigDict, EmailStr, Field, field_validator

from mandatometro.avisos.inscricao import SituacaoInscricao
from mandatometro.piloto import TOTAL_PERGUNTAS, Etapa, VersaoQuiz


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


class PedidoTentativaPiloto(BaseModel):
    model_config = ConfigDict(extra="forbid")

    participacao: UUID4 = Field(description="Código aleatório do piloto, sem relação com conta.")
    versao_quiz: VersaoQuiz
    etapa: Etapa
    acertos: int = Field(strict=True, ge=0, le=TOTAL_PERGUNTAS)


class ResultadoTentativaPiloto(BaseModel):
    situacao: Literal["recebida"]


class ErroPiloto(BaseModel):
    erro: Literal[
        "dados_invalidos",
        "corpo_muito_grande",
        "limite_de_tentativas",
        "servico_indisponivel",
        "piloto_encerrado",
    ]
