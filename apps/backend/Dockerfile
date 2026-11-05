FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /uvx /bin/

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
	UV_LINK_MODE=copy \
	UV_PYTHON_DOWNLOADS=0 \
	PATH="/app/.venv/bin:$PATH"

# Dependências antes do código, para o cache do Docker sobreviver às mudanças no código.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev --no-install-project

COPY . .
RUN --mount=type=cache,target=/root/.cache/uv uv sync --locked --no-dev

EXPOSE 8000
# Aplica as migrations pendentes e sobe a API.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn mandatometro.api.app:app --host 0.0.0.0 --port 8000"]
