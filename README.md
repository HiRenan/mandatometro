# Mandatômetro

**O diário oficial político, simplificado.** Um site que ensina como funciona a política brasileira, em linguagem simples e a partir do que o Congresso está votando.

> Em construção no [Hack Brasil 2026](https://hackbrasil.com), de 4 a 30 de novembro de 2026. A demo vai ficar em mandatometro.com.br.
>
> Trilha: Acesso à educação.

## O problema

Falta aos eleitores conhecimento sobre o sistema político brasileiro: como nasce uma lei, quem decide o quê e como o Congresso vota. O Mandatômetro é para eleitores, principalmente de 20 a 40 anos.

## O que ele faz

- **Trilhas:** artigos curtos e infográficos que explicam com casos reais como funciona a política, com um quiz no meio e outro no fim. A primeira é a do processo legislativo: como nasce uma lei.
- **Newsletter semanal:** o jornal legislativo chega todo domingo com o que o Congresso votou na semana, explicado em linguagem simples. Quem se inscreve recebe na hora a última edição, e todas ficam no site.

Cada explicação leva a fonte oficial: a lei, o regimento ou a página da Câmara, do Senado ou do TSE. Não precisa de conta: as trilhas são abertas, e a newsletter pede só o e-mail.

**Depois do MVP:** a página de cada deputado federal e senador, com o que prometeu na campanha, o que fez no mandato e o patrimônio que declarou ao TSE. Também ficam para depois o "fake ou fato" e o jogo das comissões, em que a pessoa acompanha um projeto real e decide como se fosse parlamentar.

O porquê dessas escolhas está no [ADR 0002](docs/adr/0002-mvp.md).

## Fontes

Só dados públicos, sempre com link para a origem:

- [Dados Abertos da Câmara dos Deputados](https://dadosabertos.camara.leg.br/) e [do Senado Federal](https://legis.senado.leg.br/dadosabertos/): votações, proposições e parlamentares, para a newsletter
- Leis, regimentos e páginas oficiais da Câmara, do Senado e do TSE, para as trilhas
- Depois do MVP: o [Portal de Dados Abertos do TSE](https://dadosabertos.tse.jus.br/) (candidaturas e bens declarados) e os sites de campanha

## Ferramentas parceiras

| Ferramenta | Uso no Mandatômetro |
|---|---|
| [Resend](https://resend.com/) | A newsletter de domingo e a última edição para quem se inscreve |
| [Firecrawl](https://www.firecrawl.dev/) | Em teste: ler o inteiro teor das proposições votadas e as notícias da Câmara e do Senado, para a edição da semana |
| [Devin](https://devin.ai/) | Conectores de dados e testes, com PRs neste repositório (label `devin`) |

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
pnpm test          # pytest e Vitest
pnpm build         # build do site, que confere o conteúdo das trilhas
```

`pnpm check` corrige a formatação do TypeScript. No Python, rode `uv run ruff format` e `uv run ruff check --fix` em `apps/backend`.

**No ar,** o site fica na Vercel, que monta a pasta `apps/web` a cada push, com a configuração de `apps/web/vercel.json`:

- a `main` vai para https://mandatometro.com.br; a `develop`, para o endereço do time; e cada PR ganha uma prévia;
- o build roda no Node 24, pelo `engines` de `apps/web/package.json`;
- o painel da Vercel não pede variáveis: o endereço do site (`APP_BASE_URL`) sai do ambiente da Vercel, com o domínio na `main` e o endereço da branch nas prévias, e as páginas fora da `main` pedem aos buscadores para não indexar (`X-Robots-Tag: noindex`);
- um artigo mal formado derruba o deploy, com o arquivo e o problema no log, e o site no ar continua na versão anterior.

Fora da Vercel, como no Docker, defina o `APP_BASE_URL` com o endereço do site antes do build: a prévia do link no WhatsApp e nas redes (`og:image`) leva o endereço completo da imagem, com ele na frente. Sem ele, vale o `http://localhost:3001`.

**Mudou o ícone ou a prévia do link?** Eles saem de `apps/web/imagens/icone.html` e `previa.html`. Rode `pnpm --filter web imagens`: o Edge ou o Chrome abre sem janela e grava o `favicon.ico`, o `apple-touch-icon.png` e o `previa.png` em `apps/web/public/` (`NAVEGADOR=<caminho>` escolhe outro navegador). Faça commit do HTML e das imagens.

**Mudou a API?** `pnpm generate:client` grava o `openapi.json` e gera de novo o cliente TypeScript. Faça commit dos dois.

**Migration nova,** em `apps/backend`, com o próximo número: `uv run alembic revision --autogenerate --rev-id 0002 -m "cria tabela parlamentar"`.

## Time

- Renan Mocelin
- Pedro Vinicius Meerholz
- Nathan Arrais

## Licença

[MIT](LICENSE)
