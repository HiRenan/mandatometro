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

## Modelo de dados

O banco guarda o que a coleta lê da Câmara e do Senado e o que a newsletter usa. Os modelos ficam em `apps/backend/src/mandatometro/db/modelos.py`, e cada mudança vira uma migration do Alembic.

- **Cada Casa tem os seus números:** parlamentar, proposição e votação se identificam pela Casa e pelo id que a Casa dá (`casa`, `id_externo`). A mesma matéria tem uma linha em cada Casa, ligadas por sigla, número e ano.
- **Fonte em tudo:** cada dado coletado e cada item da edição aponta para uma `fonte`, com o endereço e a data da coleta. Sem fonte, o banco não grava.
- **O partido fica no voto,** porque muda dentro do mandato. Os totais de uma votação se contam pelos votos.
- **Ausência sem motivo:** toda ausência do Senado (atividade parlamentar, licença saúde...) entra como `nao_votou`, sem o código, para a licença saúde ficar igual às outras. O voto só guarda os códigos de voto e de presença da lista `CODIGOS_GRAVADOS`, e o banco recusa os demais. Um código novo entra como `outro`, sem o código, e vai para o log sem a pessoa.
- **Quem assina** deixa só o e-mail, a data e o código do link de sair. Sair apaga a linha.

```mermaid
erDiagram
    parlamentar ||--o{ mandato : "tem"
    parlamentar ||--o{ voto : "dá"
    votacao ||--o{ voto : "recebe"
    votacao ||--o{ votacao_proposicao : "afeta"
    proposicao ||--o{ votacao_proposicao : "é afetada"
    edicao ||--o{ item_edicao : "tem"
    fonte ||--o{ parlamentar : "comprova"
    fonte ||--o{ mandato : "comprova"
    fonte ||--o{ proposicao : "comprova"
    fonte ||--o{ votacao : "comprova"
    fonte ||--o{ voto : "comprova"
    fonte ||--o{ item_edicao : "comprova"

    fonte {
        int id PK
        string url "o que a coleta leu"
        string url_publica "a página que o leitor abre"
        timestamptz coletado_em
        string trecho "o trecho literal, quando houver"
    }
    parlamentar {
        int id PK
        string casa UK "camara ou senado"
        int id_externo UK "o id na Casa"
        string nome
        int fonte_id FK
    }
    mandato {
        int id PK
        int parlamentar_id FK, UK
        int legislatura UK
        string uf
        string condicao "Titular, Suplente..."
        bool em_exercicio "na última coleta"
        int fonte_id FK
    }
    proposicao {
        int id PK
        string casa UK
        int id_externo UK "no Senado, o idProcesso"
        string sigla "sigla, número e ano ligam as Casas"
        int numero
        int ano
        string ementa
        string apelido
        string url_inteiro_teor
        int fonte_id FK
    }
    votacao {
        int id PK
        string casa UK
        string id_externo UK "2637478-26 ou 7109"
        date data
        string descricao
        string resultado "aprovada, rejeitada ou outro"
        string resultado_bruto "1, 0 ou A"
        int fonte_id FK
    }
    votacao_proposicao {
        int votacao_id PK, FK
        int proposicao_id PK, FK
    }
    voto {
        int votacao_id PK, FK
        int parlamentar_id PK, FK
        string valor "sim, nao, abstencao, obstrucao, presidente, nao_votou ou outro"
        string valor_bruto "o código da Casa, só os da lista"
        string partido "o do dia do voto"
        string uf "a do dia do voto"
        int fonte_id FK
    }
    edicao {
        int id PK
        string titulo
        date inicio "a semana coberta"
        date fim
        string estado "rascunho ou publicada"
        timestamptz publicada_em "só na publicada"
    }
    item_edicao {
        int id PK
        int edicao_id FK, UK
        int ordem UK
        string titulo
        string texto
        int fonte_id FK
    }
    inscrito {
        int id PK
        string email UK "em minúsculas"
        uuid codigo_saida UK "o link de sair"
        timestamptz inscrito_em
    }
```

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

**Testes de banco.** Os testes do modelo e das migrations rodam num banco à parte, terminado em `_teste`, porque apagam tudo nele a cada execução. Crie esse banco uma vez, com o banco do Docker no ar, e passe o endereço no `TEST_DATABASE_URL`, na linha do comando (ele não vem do `.env`):

```bash
docker compose exec db createdb -U mandatometro mandatometro_teste
TEST_DATABASE_URL=postgresql+psycopg://mandatometro:troque-esta-senha@localhost:5433/mandatometro_teste pnpm test
```

Sem a variável, o pytest pula os testes de banco e diz o motivo. No CI, que sobe o próprio banco, eles falham.

**No ar,** o site fica na Vercel, que monta a pasta `apps/web` a cada push, com a configuração de `apps/web/vercel.json`:

- a `main` vai para https://mandatometro.com.br; a `develop`, para o endereço do time; e cada PR ganha uma prévia;
- o build roda no Node 24, pelo `engines` de `apps/web/package.json`;
- o painel da Vercel não pede variáveis: o endereço do site (`APP_BASE_URL`) sai do ambiente da Vercel, com o domínio na `main` e o endereço da branch nas prévias, e as páginas fora da `main` pedem aos buscadores para não indexar (`X-Robots-Tag: noindex`);
- um artigo mal formado ou a falta da pasta da trilha da página inicial derruba o deploy, com o arquivo e o problema no log, e o site no ar continua na versão anterior.

Fora da Vercel, como no Docker, defina o `APP_BASE_URL` com o endereço do site antes do build: a prévia do link no WhatsApp e nas redes (`og:image`) leva o endereço completo da imagem, com ele na frente. Sem ele, vale o `http://localhost:3001`.

**Mudou o ícone ou a prévia do link?** Eles saem de `apps/web/imagens/icone.html` e `previa.html`. Rode `pnpm --filter web imagens`: o Edge ou o Chrome abre sem janela e grava o `favicon.ico`, o `apple-touch-icon.png` e o `previa.png` em `apps/web/public/` (`NAVEGADOR=<caminho>` escolhe outro navegador). Faça commit do HTML e das imagens. O mapa do fundo do site sai do `apps/web/imagens/mapa.mjs`: mude o roteiro e rode `pnpm --filter web mapa`, que grava o `apps/web/src/estilos/mapa.svg`.

**Mudou a API?** `pnpm generate:client` grava o `openapi.json` e gera de novo o cliente TypeScript. Faça commit dos dois.

**Migration nova,** em `apps/backend`, com o próximo número: `uv run alembic revision --autogenerate --rev-id 0004 -m "cria a tabela orientacao"`. O autogenerate não vê mudança de CHECK nem de valor padrão: um valor novo num conjunto, como o do voto, pede essa parte da migration escrita à mão, e o teste de migrations acusa o que faltar. `uv run alembic check` diz se algum modelo mudou sem migration. Mudou uma tabela? Atualize o diagrama em "Modelo de dados": um teste confere.

## Time

- Renan Mocelin
- Pedro Vinicius Meerholz
- Nathan Arrais

## Licença

[MIT](LICENSE)
