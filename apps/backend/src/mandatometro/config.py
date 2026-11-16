"""Configuração lida das variáveis de ambiente.

Os nomes e os valores de exemplo ficam no .env.example, na raiz do repositório. Rodando a partir
de apps/backend, como fazem o turbo e o Alembic, o .env da raiz também é lido. Valor vazio conta
como ausente. Fora da Vercel vale o padrão do Docker Compose; nela, o banco é obrigatório.
"""

from functools import lru_cache
from typing import Self

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import make_url
from sqlalchemy.exc import ArgumentError


class Config(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="../../.env", env_ignore_empty=True, extra="ignore", hide_input_in_errors=True
    )

    # A própria plataforma define VERCEL=1; fora dela, mantemos o pool do CLI/Compose.
    vercel: bool = False
    database_url: str = (
        "postgresql+psycopg://mandatometro:troque-esta-senha@localhost:5433/mandatometro"
    )
    # A API libera o CORS para este endereço; o e-mail usa no link para sair.
    app_base_url: str = "http://localhost:3001"
    # Endereço da API visto pelo navegador e usado no cabeçalho List-Unsubscribe.
    api_url: str = "http://localhost:8000"
    resend_api_key: SecretStr | None = None
    resend_from: str | None = None
    newsletter_limite_por_minuto: int = Field(default=30, gt=0)
    piloto_ativo: bool = False
    piloto_limite_por_minuto: int = Field(default=120, gt=0)
    llm_provider: str | None = None
    llm_model: str | None = None
    llm_api_key: SecretStr | None = None

    @model_validator(mode="after")
    def banco_da_vercel(self) -> Self:
        if self.vercel:
            if "database_url" not in self.model_fields_set or not self.database_url.strip():
                raise ValueError("Defina DATABASE_URL na Vercel; o banco local não é usado lá.")
            try:
                url = make_url(self.database_url)
            except (ArgumentError, ValueError):
                raise ValueError("DATABASE_URL precisa ser uma URL PostgreSQL válida.") from None
            if (
                url.drivername not in {"postgresql", "postgresql+psycopg"}
                or not url.host
                or not url.database
            ):
                raise ValueError("DATABASE_URL precisa indicar o servidor e o banco PostgreSQL.")
        return self


@lru_cache
def config() -> Config:
    return Config()
