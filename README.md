# Mandatômetro

**Aprenda política com dados reais.** Um site de educação política, gamificado, que põe lado a lado o que deputados federais e senadores prometeram na campanha e o que fizeram no mandato, com a fonte de cada informação.

> Em construção no [Hack Brasil 2026](https://hackbrasil.com), de 4 a 30 de novembro de 2026.
>
> Trilha: Acesso à educação.

## O que ele faz

### Aprender política

A maioria das pessoas não sabe como o Congresso funciona nem o que seus representantes fazem lá. O Mandatômetro ensina as duas coisas com casos reais.

- **Material de estudo:** os dados de cada parlamentar, logo abaixo, explicados em linguagem simples e com a fonte.
- **Jogo (em definição):** o site vai ser gamificado, para as pessoas usarem e voltarem.

### Os dados de cada parlamentar

- **Atuação:** proposições de autoria e votos nominais de cada parlamentar, direto das APIs da Câmara e do Senado.
- **Promessas × atuação:** um LLM extrai as promessas de campanha de sites e notícias e procura os atos ligados a cada uma, com o trecho e o link da fonte.
- **Patrimônio declarado:** a evolução dos bens declarados ao TSE a cada eleição, corrigida pela inflação.
- **Seguir por e-mail:** resumo semanal e alertas sobre quem você acompanha.

O MVP cobre deputados federais e senadores do Brasil todo e começa por Santa Catarina.

## Fontes

Só dados públicos, sempre com link para a origem:

- [Dados Abertos da Câmara dos Deputados](https://dadosabertos.camara.leg.br/)
- [Dados Abertos do Senado Federal](https://legis.senado.leg.br/dadosabertos/)
- [Portal de Dados Abertos do TSE](https://dadosabertos.tse.jus.br/): candidaturas, sites e redes declarados e bens
- Sites de campanha e notícias, lidos com o Firecrawl

Deputados e senadores não são obrigados a registrar propostas no TSE. Quando não encontramos promessas de alguém, mostramos quais fontes consultamos.

## Ferramentas parceiras

| Ferramenta | Uso no Mandatômetro |
|---|---|
| [Firecrawl](https://www.firecrawl.dev/) | Coleta em lote dos sites de campanha e das notícias; o change tracking avisa quando uma promessa muda ou some |
| [Resend](https://resend.com/) | Confirmação de inscrição, resumo semanal e alertas |
| [Devin](https://devin.ai/) | Conectores de dados, API e testes, com PRs neste repositório (label `devin`) |

## Stack

FastAPI · PostgreSQL com pgvector · TanStack Start (React) · Turborepo · Docker Compose

O porquê de cada escolha está no [ADR 0001](docs/adr/0001-stack.md).

## Como rodar

Precisa de [Node.js](https://nodejs.org/) 24, [pnpm](https://pnpm.io/) (ele mesmo troca para a versão do `packageManager`, no `package.json`), [uv](https://docs.astral.sh/uv/) (ele instala o Python 3.13) e [Docker](https://www.docker.com/).

```bash
cp .env.example .env   # preencha as chaves; o .env fica fora do Git
pnpm install
```

**Tudo no Docker:** `docker compose up --build` sobe o banco, a API e o site. O site fica em http://localhost:3001 e a API em http://localhost:8000, com a documentação em http://localhost:8000/docs. A API aplica as migrations ao subir.

**Desenvolvimento,** com recarga automática:

```bash
docker compose up -d db         # só o banco, na porta 5433
pnpm --filter backend migrate   # aplica as migrations
pnpm dev                        # site na porta 3001 e API na 8000
```

**Checagens,** as mesmas do CI:

```bash
pnpm lint          # Biome no TypeScript e Ruff no Python
pnpm check-types   # tipos do site
pnpm test          # pytest
pnpm build         # build do site
```

`pnpm check` corrige a formatação do TypeScript. No Python, rode `uv run ruff format` e `uv run ruff check --fix` em `apps/backend`.

**Mudou a API?** `pnpm generate:client` grava o `openapi.json` e gera de novo o cliente TypeScript. Faça commit dos dois.

**Migration nova,** em `apps/backend`, com o próximo número: `uv run alembic revision --autogenerate --rev-id 0002 -m "cria tabela parlamentar"`.

## Time

- Renan Mocelin
- Pedro Vinicius Meerholz
- Nathan Arrais

## Licença

[MIT](LICENSE)
