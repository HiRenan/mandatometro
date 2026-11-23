"""Contrato dos números do painel, restrito a agregados e rótulos públicos."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

from mandatometro.piloto import VersaoQuiz


class TotalSemanal(BaseModel):
    semana: date
    total: int


class ContasPainel(BaseModel):
    total: int
    confirmadas: int
    novas_por_semana: list[TotalSemanal]


class InscritosPainel(BaseModel):
    total: int
    novos_por_semana: list[TotalSemanal]


class PessoasPainel(BaseModel):
    contas: ContasPainel
    inscritos: InscritosPainel


class TotalTrilha(BaseModel):
    trilha: str
    total: int


class UsoPainel(BaseModel):
    artigos_lidos_por_trilha: list[TotalTrilha]
    trilhas_concluidas: list[TotalTrilha]
    contas_ativas_por_semana: list[TotalSemanal]
    contas_que_voltaram: int


class TotalDiario(BaseModel):
    dia: date
    total: int


class TotalPagina(BaseModel):
    caminho: str
    total: int


class VisitasPainel(BaseModel):
    por_dia: list[TotalDiario]
    paginas_mais_vistas: list[TotalPagina]


class NewsletterPainel(BaseModel):
    edicoes_publicadas: int
    inscritos_com_a_ultima_edicao: int | None
    ultima_publicada_em: datetime | None


SituacaoPiloto = Literal["sem_respostas", "amostra_pequena", "disponivel", "protecao_de_subgrupo"]


class TentativasPainel(BaseModel):
    antes: int
    depois: int
    total: int


class ParticipacoesPainel(TentativasPainel):
    pareadas: int
    somente_antes: int
    somente_depois: int


class MediaPiloto(BaseModel):
    acertos: float | None
    percentual: float | None


class MediaEtapa(MediaPiloto):
    quantidade: int
    situacao: SituacaoPiloto


class MediasPiloto(BaseModel):
    antes: MediaEtapa
    depois: MediaEtapa


class ParesPiloto(BaseModel):
    quantidade: int
    antes: MediaPiloto
    depois: MediaPiloto
    diferenca_acertos: float | None
    diferenca_pontos_percentuais: float | None
    situacao: SituacaoPiloto


class PilotoPainel(BaseModel):
    versao_quiz: VersaoQuiz
    total_perguntas: int
    tentativas: TentativasPainel
    participacoes: ParticipacoesPainel
    medias: MediasPiloto
    pares: ParesPiloto


class UltimasColetas(BaseModel):
    camara: datetime | None
    senado: datetime | None
    diario_oficial: datetime | None
    tse: datetime | None
    banco_central: datetime | None


class SistemaPainel(BaseModel):
    parlamentares: int
    mandatos: int
    proposicoes: int
    votacoes: int
    votos: int
    atos: int
    videos: int
    proposicoes_com_tema: int
    bens: int
    meses_ipca: int
    ultimas_coletas: UltimasColetas


class NumerosPainel(BaseModel):
    pessoas: PessoasPainel
    uso: UsoPainel
    visitas: VisitasPainel
    newsletter: NewsletterPainel
    piloto: PilotoPainel
    sistema: SistemaPainel
