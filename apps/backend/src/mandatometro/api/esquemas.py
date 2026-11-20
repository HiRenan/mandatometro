from datetime import date, datetime
from typing import Annotated, Literal
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


class FatosAtoPublicos(BaseModel):
    # A lista vazia permite que a página atual leia o item e mostre suas fontes.
    votacoes: Annotated[list[VotacaoPublica], Field(max_length=0)]
    data_publicacao: date


class ArtigoDaEdicao(BaseModel):
    titulo: str
    caminho: str


class ItemPublico(BaseModel):
    ordem: int
    tipo: Literal["votacao", "ato"]
    titulo: str
    texto: str
    fatos: FatosPublicos | FatosAtoPublicos | None
    fontes: list[FontePublica]
    artigo: ArtigoDaEdicao | None


class EdicaoPublica(ResumoEdicao):
    itens: list[ItemPublico]


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
