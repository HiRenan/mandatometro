"""Dados já normalizados e contagens da execução, sem payloads pessoais."""

from dataclasses import dataclass, field
from datetime import date


@dataclass(frozen=True)
class DadosVoto:
    parlamentar_id: int
    valor: str
    valor_bruto: str | None
    partido: str | None
    uf: str | None
    fonte_id: int


@dataclass
class ResumoColeta:
    casa: str
    inicio: date
    fim: date
    parlamentares: int = 0
    mandatos: int = 0
    proposicoes: int = 0
    votacoes: int = 0
    votos: int = 0
    fontes: int = 0
    chamadas: int = 0
    tentativas_extras: int = 0
    duracao_s: float = 0
    completa: bool = True
    falhas_votacoes: list[str] = field(default_factory=list)
    indisponiveis_na_fonte: list[str] = field(default_factory=list)
    falhas_parlamentares: int = 0
    sem_proposicao: int = 0
    codigos_desconhecidos: int = 0
    erro: str | None = None


@dataclass
class ResumoAtos:
    origem: str
    inicio: date
    fim: date
    atos: int = 0
    descartes: dict[str, int] = field(default_factory=dict)
    chamadas: int = 0
    tentativas_extras: int = 0
    duracao_s: float = 0
    completa: bool = True
    erro: str | None = None
