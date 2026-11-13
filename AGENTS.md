# AGENTS.md

Contexto e convenções do Mandatômetro para agentes de código (Claude Code, Codex e Devin) e para o time. É a fonte única: o `CLAUDE.md` só importa este arquivo.

## Produto

O Mandatômetro é um site que ensina como funciona a política brasileira, a partir do que o Congresso está votando. Público: eleitores, principalmente de 20 a 40 anos. Problema: falta aos eleitores conhecimento sobre o sistema político brasileiro. Lema: o diário oficial político, simplificado.

- **Trilhas:** artigos curtos com infográficos, um quiz de múltipla escolha no meio e outro no fim. A primeira é a do processo legislativo. Não tem login: o navegador guarda os artigos lidos.
- **Newsletter semanal (o jornal legislativo):** todo domingo, o que o Congresso votou na semana, em linguagem simples. A inscrição pede só o e-mail e já manda a última edição, e cada edição também fica no site.
- **Fora do MVP:** pontos, ranking e certificado saíram. As páginas de cada parlamentar (promessas × atos e patrimônio declarado ao TSE), o login, o "fake ou fato" e o jogo das comissões ficam no marco "Depois do MVP".
- **Piloto:** cerca de 50 pessoas (uma turma do Senai e o Instagram) fazem a trilha antes da entrega, e o quiz mede quanto elas acertam antes e depois.
- **Dados:** Câmara e Senado, com deputados federais e senadores do Brasil todo e Santa Catarina como amostra para testar cada etapa primeiro.
- **Trilha do hackathon:** Acesso à educação. O regulamento (item 5.4) exige que o problema e o público estejam dentro da trilha, por isso aprender é a função principal do site.
- **Prazo:** projeto do Hack Brasil 2026, com entrega em 30/11/2026 (repositório público, demo no ar e vídeo de até 3 minutos). Prefira a solução simples que chega na demo.

O porquê do MVP está no [ADR 0002](docs/adr/0002-mvp.md).

## Ferramentas parceiras

- **Firecrawl** lê páginas e PDFs. No MVP, está em teste para o inteiro teor das proposições votadas e as notícias da Câmara e do Senado (#9); depois, lê os sites de campanha.
- **Resend** manda todos os e-mails.
- **Devin** pode pegar as issues com o label `devin`, com PR neste repositório.

As APIs oficiais e os arquivos de dados abertos (Câmara, Senado e TSE) são lidos direto, por HTTP.

## Arquitetura

1. **Coleta em lote, agendada:** as APIs da Câmara e do Senado, todo dia. O site só lê o banco: a coleta roda em jobs, fora do caminho das requisições de usuário.
2. **PostgreSQL com pgvector** guarda tudo.
3. **LLM** escreve o rascunho da edição semanal com as votações da semana, e uma pessoa do time revisa antes de publicar.
4. **FastAPI** expõe os dados, o **site** mostra as trilhas e as edições, e o **Resend** manda a última edição para quem se inscreve e a edição nova todo domingo.

## Estrutura e stack

Monorepo com pnpm e Turborepo. O porquê de cada escolha está no [ADR 0001](docs/adr/0001-stack.md).

- `apps/backend/`: Python 3.13 com uv, num pacote só (`src/mandatometro`): FastAPI, SQLAlchemy 2 com Alembic, psycopg 3, pgvector, Ruff e pytest. Módulos `db` (modelos e sessão), `coleta`, `ia`, `avisos` (e-mails) e `api`. Coleta e IA entram como subcomandos de `cli.py` e gravam no banco; a API só lê o banco e recebe inscrições. O `package.json` só repassa as tarefas do Turborepo para o uv.
- `apps/web/`: TanStack Start (React com SSR), Tailwind e shadcn/ui, gerado pelo Better-T-Stack. As variáveis do site ficam em `.env.schema` (varlock), e as marcadas `@public` entram no bundle do navegador. Código que só roda no servidor fica em arquivos `*.server.ts`, e o build falha se o navegador importar um deles; os loaders chegam a esse código por `createServerFn`, em arquivos `*.functions.ts`.
- `apps/web/conteudo/`: os textos das trilhas, em Markdown, com uma pasta por trilha e um arquivo por artigo. O formato e como conferir estão em [docs/conteudo-das-trilhas.md](docs/conteudo-das-trilhas.md); um teste do Vitest lê a pasta, e o CI falha se um artigo estiver mal formado.
- `apps/web/imagens/`: o HTML do ícone da aba e da prévia do link. O `pnpm --filter web imagens` grava o `favicon.ico`, o `apple-touch-icon.png` e o `previa.png` em `apps/web/public/`. Para mudar uma imagem, mude o HTML e gere de novo, sem editar o PNG.
- `packages/ui/` (componentes shadcn/ui) e `packages/config/` (tsconfig base): gerados pelo Better-T-Stack.
- `docker-compose.yml`: serviços `db` (imagem `pgvector/pgvector:pg17`), `api` e `web`. O banco atende na porta 5433 do computador, para não brigar com um PostgreSQL instalado na 5432.
- `docs/`: decisões do time em `docs/adr/`, o formato do conteúdo das trilhas e o dicionário de dados (issue #4).
- `PRODUCT.md` e `DESIGN.md`, na raiz: o produto (público, voz e princípios) e o visual do site (cores, fontes e componentes), escritos com o Impeccable.
- **Hospedagem:** o site vai para a Vercel, que monta a pasta `apps/web` com o `apps/web/vercel.json`: a `main` publica em mandatometro.com.br, a `develop` no endereço do time, e cada PR ganha uma prévia. A configuração fica no repositório, sem variável no painel. O build da Vercel grava as variáveis do site na função, em texto puro (`ssrInjectMode: "resolved-env"`, no `vite.config.ts`), porque a função não tem o CLI do varlock nem o `.env.schema`: por isso o `buildCommand` fixa o `NODE_ENV=production`, e uma variável sensível no site pede antes o `@encryptInjectedEnv` do varlock.
- **Contrato da API:** o cliente TypeScript em `apps/web/src/client/` sai do `apps/backend/openapi.json`. Mudou a API, rode `pnpm generate:client` e faça commit dos dois; o CI falha se um deles ficar desatualizado.
- **Migrations:** numeradas em sequência (`--rev-id 0002`, `0003`...), com a mensagem sem acento, porque ela vira o nome do arquivo.

Os comandos de instalação, teste e lint ficam no README, seção "Como rodar". Quem mudar um comando atualiza lá.

## Regras de conteúdo

O produto fala de pessoas reais. Estas regras valem para a interface, as trilhas, o quiz, a newsletter, a API e os prompts do LLM.

- **Fonte em tudo:** cada afirmação sobre um político ou uma votação leva o link oficial, a data da coleta e, quando vier de texto, o trecho literal. O que não tem fonte fica fora do banco e da newsletter.
- **Tom neutro:** o texto descreve o que o dado mostra e deixa o julgamento para o leitor.
- **Trilhas, quiz e newsletter:** neutros e apartidários, com os mesmos critérios para todos os partidos e parlamentares. Cada explicação de como o Congresso e as eleições funcionam leva a fonte oficial (lei, regimento ou página da Câmara, do Senado ou do TSE). O quiz pergunta sobre fatos e regras e nunca dá nota a político ou partido.
- **Domínios das fontes das trilhas:** o validador aceita `gov.br`, `leg.br`, `jus.br`, `mp.br` e `def.br`. As referências planejadas do Ministério Público e da Defensoria Pública usam os dois últimos; mantenha esses links oficiais ao escrever os artigos.
- **Promessas e patrimônio (depois do MVP):** a ligação entre promessa e ato tem um destes status: `ato a favor`, `ato contra` ou `nenhum ato encontrado`. Deputado e senador não são obrigados a entregar proposta ao TSE (só prefeito, governador e presidente): sem promessa, escreva "Não encontramos promessas públicas nas fontes consultadas" e liste as fontes. O patrimônio se chama "patrimônio declarado ao TSE", vem corrigido pelo IPCA, com o aviso de que o valor declarado costuma ser o de compra, e aparece só nos anos em que a pessoa concorreu, em tom descritivo.
- **Dados pessoais:** CPF, título de eleitor e data de nascimento servem só para ligar registros entre bases e ficam no banco. A API, o front, os logs e os fixtures de teste identificam pessoas pelo id interno. O e-mail de quem se inscreve segue a mesma regra, e as respostas do quiz não identificam quem respondeu. O regulamento do hackathon (item 6.9) também proíbe a demo de expor dados pessoais reais de terceiros.

## Fontes de dados

Endpoints, campos, chaves de ligação e exemplos reais de cada fonte estão em [docs/dicionario-de-dados.md](docs/dicionario-de-dados.md), com as respostas gravadas em `apps/backend/tests/fixtures/`. O TSE entra depois do MVP (#12 e #13). Regras que valem para todas:

- Toda chamada externa tem timeout e nova tentativa com backoff. A API da Câmara devolve 504 de vez em quando.
- O User-Agent identifica o projeto (`mandatometro (Hack Brasil 2026)`), e a coleta respeita o robots.txt dos sites.
- As respostas da Câmara e do Senado são UTF-8, e a Câmara não declara o charset no `content-type`: decodifique explicitamente como UTF-8, ou os acentos embaralham no Windows.
- **No Senado, data vai com hífen:** `dataInicio=2026-11-03`. No formato `20261103`, a API devolve HTTP 400.
- **No Senado, `/processo?id={id}` ignora o filtro** e responde HTTP 200 com uma lista arbitrária de matérias, em vez de erro. Use sempre o id no caminho, `/processo/{id}`. A forma com query string vem com o `ementa` do primeiro nível preenchido, o que faz um conector errado parecer funcionar; em `/processo/{id}`, esse `ementa` vem `null` e a ementa de verdade está em `conteudo.ementa`.
- **Os totais do Senado não são confiáveis:** em `/votacao`, `totalVotosSim`, `totalVotosNao` e `totalVotosAbstencao` vieram `null` nas quatro votações testadas em 11/11/2026, com os 81 votos presentes. Conte a lista `votos`.
- A referência do Programa Cidadania Fiscal da Receita Federal no planejamento pode redirecionar para autenticação. Em 11/11/2026, o trecho explicativo foi consultado no índice de busca da própria URL; não trate a tela de login como conteúdo da fonte e confira o acesso público antes de publicar o artigo 3.5.
- O normas.leg.br, onde os artigos das trilhas citam a Constituição, monta a página no navegador: o `curl` do link não traz o texto. Para conferir por HTTP, peça a norma inteira em `https://normas.leg.br/api/public/normas?urn=<urn>&tipo_documento=maior-detalhe`, com a URN sem o `!art61` do fim (com ele, a resposta só repete a URN). Cada dispositivo vem num `hasPart`, com a URN em `legislationIdentifier` e as versões em `workExample`; o texto em vigor é o `text` da versão com a `legislationDate` mais recente.
- Os CSVs do TSE vêm em latin-1, separados por `;`, um por UF dentro de cada ZIP.
- A mesma pessoa se liga entre eleições do TSE pelo CPF. Em 2024 o CPF vem vazio e em 2012 falta em parte das linhas: nesses anos, use o título de eleitor e confira a data de nascimento.

## Segredos

As chaves (Firecrawl, Resend, Devin e LLM) ficam só no `.env` local, criado a partir do `.env.example`, e nos secrets da hospedagem. Código, issues, PRs e logs citam a chave pelo nome da variável. Variável nova entra no `.env.example` com valor vazio e um comentário.

## Como trabalhar

- **Branches:** todo PR vai para a `develop`, que é a branch padrão do GitHub. A `main` só recebe merge da `develop`, quando ela estiver estável, como antes da demo e da entrega: cada merge nela publica o site no domínio.
- **Uma issue por PR.** Branch `tipo/NN-descricao` criado a partir da `develop` (ex.: `feat/10-conector-camara`); commits no padrão Conventional Commits, em português (ex.: `feat(camara): conector de proposições`).
- **Descrição do PR:** o que mudou, como testar e `Closes #NN`. PR do Devin leva o label `devin`.
- **Sem assinatura de IA:** commits e PRs levam só o conteúdo do trabalho, sem linha de autoria de ferramenta de IA, como "Generated with Claude Code" ou `Co-Authored-By` de um agente. No Claude Code, o `.claude/settings.json` já desliga essa assinatura.
- **Testes de unidade rodam offline,** com respostas reais gravadas em `tests/fixtures/`, com CPF e título de eleitor trocados por valores fictícios. Testes que usam a rede levam o marcador `online` e ficam fora do CI.
- **Nomes do domínio em português, sem acento:** `parlamentar`, `mandato`, `candidatura`, `proposicao`, `votacao`, `voto`, `promessa`, `ligacao`, `bem_declarado`, `fonte`, `inscrito`, `trilha`, `artigo` e `edicao`. Texto para o usuário em pt-BR.
- **Ao terminar:** se mudou como rodar, atualize o README; se surgiu uma convenção ou uma pegadinha de fonte, atualize este arquivo.
