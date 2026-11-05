# ADR 0001: stack do Mandatômetro

- **Data:** 05/11/2026
- **Status:** aceita

## Contexto

O Mandatômetro tem três partes: coletar dados públicos (APIs da Câmara e do Senado, arquivos do TSE e sites lidos pelo Firecrawl), usar um LLM para extrair promessas e ligá-las aos atos, e mostrar tudo num site público, com o conteúdo educativo e o jogo. O miolo é dado e IA. As páginas são públicas e precisam aparecer no Google e ter prévia de link no WhatsApp. Na reunião de 31/10, o time escolheu FastAPI, PostgreSQL e React. O prazo é 30/11, e o regulamento só aceita boilerplate aberto e público (item 6.2).

## Decisão

- **Backend em Python 3.13, num pacote só** (`apps/backend`, pacote `mandatometro`, dependências com uv): coleta, IA, e-mails (Resend) e a API em FastAPI, com SQLAlchemy 2, Alembic, psycopg 3, Ruff e pytest.
- **A regra de negócio fica fora do HTTP.** Coleta e IA rodam pela linha de comando (`mandatometro ...`), à mão ou agendadas, e gravam no banco. A API só lê o banco e recebe inscrições.
- **Banco PostgreSQL com pgvector,** sem serviço vetorial à parte.
- **Front em TypeScript com TanStack Start** (React com SSR), gerado pelo Better-T-Stack, com Tailwind, shadcn/ui, Biome e Turborepo.
- **Contrato pelo OpenAPI:** o FastAPI publica o esquema em `apps/backend/openapi.json`, e o cliente TypeScript sai dele com hey-api e TanStack Query, em `apps/web/src/client`.
- **Um repositório só:** o Turborepo roda as tarefas dos dois lados (o `package.json` do backend chama o uv), e o Docker Compose sobe banco, API e site.

## Consequências

- São duas linguagens: dois gerenciadores (pnpm e uv), dois linters (Biome e Ruff) e dois jobs no CI.
- Mudou a API, gera o cliente de novo (`pnpm generate:client`) e faz commit do `openapi.json` e do cliente. O CI falha se um dos dois ficar desatualizado.
- O navegador chama a API direto, então a API libera o CORS para o endereço do site (`APP_BASE_URL`).
- Descartamos o TypeScript de ponta a ponta (por exemplo, Hono e Drizzle): ele mudaria a decisão de 31/10 e levaria a coleta e a IA para TypeScript.
