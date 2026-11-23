from datetime import date, datetime
from typing import Annotated, Literal
from unicodedata import category

from pydantic import UUID4, BaseModel, ConfigDict, EmailStr, Field, field_validator

from mandatometro.avisos.inscricao import SituacaoInscricao
from mandatometro.ia.esquemas import Pendencia
from mandatometro.piloto import TOTAL_PERGUNTAS, Etapa, VersaoQuiz
from mandatometro.temas import TemaId
from mandatometro.tse_catalogos import MAXIMO_CENTAVOS


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


UrlVideoSessao = Annotated[
    str | None,
    Field(
        description="Endereço HTTPS do vídeo oficial da sessão inteira, "
        "ou nulo quando indisponível."
    ),
]


class TemaPublico(BaseModel):
    id: TemaId
    nome: str


class VotacaoPublica(BaseModel):
    id: int = Field(description="Id interno da votação gravado nos fatos da edição.")
    data: date
    resultado: Literal["aprovada", "rejeitada", "outro"]
    placar: PlacarPublico | None
    fontes: list[FontePublica]
    url_video: UrlVideoSessao
    temas: list[TemaPublico]


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


Casa = Literal["camara", "senado"]
UF = Literal[
    "AC",
    "AL",
    "AM",
    "AP",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MG",
    "MS",
    "MT",
    "PA",
    "PB",
    "PE",
    "PI",
    "PR",
    "RJ",
    "RN",
    "RO",
    "RR",
    "RS",
    "SC",
    "SE",
    "SP",
    "TO",
]


class ErroParlamentar(BaseModel):
    erro: Literal["dados_invalidos", "parlamentar_nao_encontrado", "servico_indisponivel"]


class ParlamentarPublico(BaseModel):
    id: int = Field(description="Id interno do parlamentar.")
    nome: str
    casa: Casa
    uf: str | None = Field(
        description="UF do mandato em exercício de maior legislatura. No detalhe, usa o "
        "mandato de maior legislatura se nenhum estiver em exercício. Nula sem mandato."
    )
    partido: str | None = Field(
        description="Sigla registrada no voto mais recente pela data da votação, com desempate "
        "pelo maior id interno da votação. Nula se o voto não informa partido ou se não há voto."
    )


class ListaParlamentares(BaseModel):
    parlamentares: list[ParlamentarPublico]


class MandatoPublico(BaseModel):
    legislatura: int
    uf: str
    condicao: str | None
    em_exercicio: bool


class ContagemVotosParlamentar(BaseModel):
    sim: int
    nao: int
    abstencao: int
    obstrucao: int
    presidente: int
    nao_votou: int
    outro: int


class FotoParlamentar(BaseModel):
    url: str
    credito: str


class DetalheParlamentar(ParlamentarPublico):
    foto: FotoParlamentar = Field(description="Endereço da foto oficial e crédito da Casa.")
    mandatos: list[MandatoPublico]
    contagem_votos: ContagemVotosParlamentar = Field(
        description="Contagem dos registros de voto deste parlamentar, por valor normalizado. "
        "Uma votação sem registro da pessoa fica fora da contagem."
    )


class CargoPatrimonio(BaseModel):
    codigo: int
    nome: str


class FontePatrimonio(BaseModel):
    url: str
    coletado_em: datetime


MesIpca = Annotated[str, Field(pattern=r"^[0-9]{4}-(0[1-9]|1[0-2])$")]
PercentualPatrimonio = Annotated[str, Field(pattern=r"^-?[0-9]+\.[0-9]$")]
ResultadoPatrimonio = Literal[
    "eleito",
    "eleito_por_qp",
    "eleito_por_media",
    "suplente",
    "nao_eleito",
    "sem_resultado",
    "outro",
]


class CorrecaoIpca(BaseModel):
    indice: Literal["IPCA"]
    mes_fim: MesIpca = Field(description="Último mês do IPCA disponível, incluído na correção.")
    fonte: FontePatrimonio = Field(description="Observação do IPCA do mês final no Banco Central.")


class VariacaoPatrimonio(BaseModel):
    ano_anterior: int
    diferenca_centavos: int = Field(description="Total corrigido atual menos o anterior.")
    percentual: PercentualPatrimonio | None = Field(
        description="Diferença percentual com uma casa. Nula se o total corrigido anterior "
        "for de R$ 50.000,00 ou menos."
    )


class EleicaoPatrimonio(BaseModel):
    ano: int
    cargo: CargoPatrimonio
    uf: UF | Literal["BR"] = Field(description="UF da eleição ou BR para eleição nacional.")
    total_centavos: int | None = Field(
        ge=0,
        le=MAXIMO_CENTAVOS,
        description="Total nominal declarado ao TSE, em centavos de real. Nulo sem total.",
    )
    fonte: FontePatrimonio
    mes_inicio: MesIpca = Field(description="Outubro do ano da eleição, incluído na correção.")
    total_corrigido_centavos: int | None = Field(
        ge=0,
        le=MAXIMO_CENTAVOS,
        description="Total em centavos corrigido pelo IPCA. Nulo sem total, sem cobertura "
        "completa do período ou acima do limite de centavos da API.",
    )
    resultado: ResultadoPatrimonio | None = Field(
        description="Resultado final do TSE, do último turno. Nulo até a coleta do resultado."
    )
    fator_ipca: Annotated[str, Field(pattern=r"^[0-9]+\.[0-9]{4}$")] | None = Field(
        description="Fator de correção com quatro casas. Nulo sem cobertura completa do período."
    )
    alta_ipca_percentual: PercentualPatrimonio | None = Field(
        description="Variação dos preços pelo IPCA com uma casa. Nula sem cobertura completa."
    )
    variacao: VariacaoPatrimonio | None = Field(
        description="Comparação com a eleição anterior com total corrigido. "
        "Nula quando um dos dois totais corrigidos falta."
    )


class PatrimonioParlamentar(BaseModel):
    eleicoes: list[EleicaoPatrimonio]
    correcao_ipca: CorrecaoIpca | None = Field(description="Nula sem a série do IPCA no banco.")


class ProposicaoAfetada(BaseModel):
    sigla: str
    numero: int
    ano: int
    ementa: str | None


ValorVoto = Literal["sim", "nao", "abstencao", "obstrucao", "presidente", "nao_votou", "outro"]


class DadosVotacao(BaseModel):
    data: date
    descricao: str
    resultado: Literal["aprovada", "rejeitada", "outro"]
    proposicoes: list[ProposicaoAfetada]
    temas: list[TemaPublico]
    url_oficial: str | None = Field(
        description="Página oficial da votação, com o endereço da coleta como reserva. "
        "Nula se a fonte estiver sem endereço."
    )
    coletado_em: datetime = Field(description="Data e hora de coleta da fonte da votação.")


class VotoParlamentar(DadosVotacao):
    votacao_id: int = Field(description="Id interno da votação.")
    valor: ValorVoto


class ListaVotosParlamentar(BaseModel):
    votos: list[VotoParlamentar]
    total: int
    limite: int
    deslocamento: int


class ErroVotacao(BaseModel):
    erro: Literal["dados_invalidos", "votacao_nao_encontrada", "servico_indisponivel"]


class VotoNominal(BaseModel):
    parlamentar_id: int = Field(description="Id interno do parlamentar.")
    nome: str
    partido: str | None = Field(description="Sigla do partido no dia do voto.")
    uf: str | None = Field(description="UF registrada no dia do voto.")
    valor: ValorVoto


class PlacarPorPartido(BaseModel):
    partido: str | None = Field(description="Sigla do dia do voto, nula no grupo sem partido.")
    placar: ContagemVotosParlamentar


class DetalheVotacao(DadosVotacao):
    id: int = Field(description="Id interno da votação.")
    casa: Casa
    url_video: UrlVideoSessao
    placar: ContagemVotosParlamentar = Field(description="Contagem dos votos individuais gravados.")
    placar_por_partido: list[PlacarPorPartido] = Field(
        description="Um placar por sigla presente nos votos. O grupo sem partido vem por último."
    )
    votos: list[VotoNominal] = Field(
        description="Lista completa em ordem de nome, com desempate pelo id interno do parlamentar."
    )


class ErroPainel(BaseModel):
    detail: str


class ResultadoRevisao(BaseModel):
    situacao: Literal["revisao_salva"]
    edicao_id: int
    itens: int
    pendencias: list[Pendencia]
    avisos: list[str]


class ResultadoPublicacao(BaseModel):
    situacao: Literal["publicada", "ja_publicada"]
    edicao_id: int


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
