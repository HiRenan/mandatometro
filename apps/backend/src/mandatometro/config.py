"""Configuração lida das variáveis de ambiente.

Os nomes e os valores de exemplo ficam no .env.example, na raiz do repositório. Rodando a partir
de apps/backend, como fazem o turbo e o Alembic, o .env da raiz também é lido. Valor vazio conta
como ausente, e aí vale o padrão, que é o do Docker Compose local.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file="../../.env", env_ignore_empty=True, extra="ignore")

    database_url: str = (
        "postgresql+psycopg://mandatometro:troque-esta-senha@localhost:5433/mandatometro"
    )
    # Endereço do site: a API libera o CORS para ele.
    app_base_url: str = "http://localhost:3001"


@lru_cache
def config() -> Config:
    return Config()
