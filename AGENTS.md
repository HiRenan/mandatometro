# AGENTS.md

Contexto e convenções do Mandatômetro para agentes de código (Claude Code, Codex e Devin) e para o time. É a fonte única: o `CLAUDE.md` só importa este arquivo.

## Produto

O Mandatômetro é um site de educação política para eleitores em geral. O problema que ele resolve: a maioria das pessoas não sabe como o Congresso funciona nem o que seus representantes fazem lá. Lema: o diário oficial político, simplificado.

- **Aprender política:** o site ensina com casos reais, em linguagem simples. Vai ser gamificado, para as pessoas usarem e voltarem; a mecânica do jogo está em definição.
- **Os dados de cada parlamentar:** o que deputados federais e senadores prometeram na campanha, o que fizeram no mandato (proposições e votos) e como evoluiu o patrimônio que declararam ao TSE, com o cruzamento entre promessas e atos e o resumo por e-mail. Essa análise dos dados públicos (Câmara, Senado e TSE) é o destaque do projeto e o material de estudo do site.
- **Trilha:** Acesso à educação. O regulamento do hackathon (item 5.4) exige que o problema e o público estejam dentro da trilha, por isso aprender é a função principal do site.
- **Escopo do MVP:** deputados federais e senadores do Brasil todo, com Santa Catarina como amostra para testar cada etapa primeiro. Presidente, governadores, assembleias, prefeitos e vereadores ficam para depois.
- **Prazo:** projeto do Hack Brasil 2026, com entrega em 30/11/2026 (repositório público, demo no ar e vídeo de até 3 minutos). Prefira a solução simples que chega na demo.

## Ferramentas parceiras

- **Firecrawl** lê as páginas web: sites de campanha e notícias.
- **Resend** manda todos os e-mails.
- **Devin** pode pegar as issues com o label `devin`, com PR neste repositório.

As APIs oficiais e os arquivos de dados abertos (Câmara, Senado e TSE) são lidos direto, por HTTP.

## Arquitetura

1. **Coleta em lote, agendada:** APIs da Câmara e do Senado todo dia; arquivos do TSE e Firecrawl com menos frequência, para poupar créditos. O site só lê o banco: a coleta roda em jobs, fora do caminho das requisições de usuário.
2. **PostgreSQL com pgvector** guarda tudo, inclusive os embeddings.
3. **LLM** extrai as promessas e liga cada promessa aos atos.
4. **FastAPI** expõe os dados, **React** mostra e **Resend** manda a confirmação de inscrição, o resumo semanal e os alertas.

## Estrutura e stack

Monorepo com pnpm e Turborepo. O porquê de cada escolha está no [ADR 0001](docs/adr/0001-stack.md).

- `apps/backend/`: Python 3.13 com uv, num pacote só (`src/mandatometro`): FastAPI, SQLAlchemy 2 com Alembic, psycopg 3, pgvector, Ruff e pytest. Módulos `db` (modelos e sessão), `coleta`, `ia`, `avisos` (e-mails) e `api`. Coleta e IA entram como subcomandos de `cli.py` e gravam no banco; a API só lê o banco e recebe inscrições. O `package.json` só repassa as tarefas do Turborepo para o uv.
- `apps/web/`: TanStack Start (React com SSR), Tailwind e shadcn/ui, gerado pelo Better-T-Stack. As variáveis do site ficam em `.env.schema` (varlock), e as marcadas `@public` entram no bundle do navegador.
- `packages/ui/` (componentes shadcn/ui) e `packages/config/` (tsconfig base): gerados pelo Better-T-Stack.
- `docker-compose.yml`: serviços `db` (imagem `pgvector/pgvector:pg17`), `api` e `web`. O banco atende na porta 5433 do computador, para não brigar com um PostgreSQL instalado na 5432.
- `docs/`: decisões do time em `docs/adr/` e o dicionário de dados (issue #4).
- **Contrato da API:** o cliente TypeScript em `apps/web/src/client/` sai do `apps/backend/openapi.json`. Mudou a API, rode `pnpm generate:client` e faça commit dos dois; o CI falha se um deles ficar desatualizado.
- **Migrations:** numeradas em sequência (`--rev-id 0002`, `0003`...), com a mensagem sem acento, porque ela vira o nome do arquivo.

Os comandos de instalação, teste e lint ficam no README, seção "Como rodar". Quem mudar um comando atualiza lá.

## Regras de conteúdo

O produto fala de pessoas reais. Estas regras valem para a interface, o conteúdo educativo, o jogo, os e-mails, a API e os prompts do LLM.

- **Fonte em tudo:** cada afirmação sobre um político leva o link oficial, a data da coleta e, quando vier de texto, o trecho literal. Promessa ou ligação sem fonte fica fora do banco.
- **Status neutro:** a ligação entre promessa e ato tem um destes status: `ato a favor`, `ato contra` ou `nenhum ato encontrado`. O texto descreve o que o dado mostra e deixa o julgamento para o leitor.
- **Conteúdo educativo e jogo:** neutros e apartidários, com os mesmos critérios para todos os partidos e parlamentares. Cada explicação de como o Congresso e as eleições funcionam leva a fonte oficial (lei, regimento ou página da Câmara, do Senado ou do TSE). O jogo, ainda em definição, premia o que a pessoa aprende sobre os fatos e nunca dá nota a político ou partido.
- **Sem promessas:** deputado e senador não são obrigados a entregar proposta ao TSE (só prefeito, governador e presidente). Quando não houver promessa, escreva "Não encontramos promessas públicas nas fontes consultadas" e liste as fontes.
- **Patrimônio:** chame de "patrimônio declarado ao TSE", corrija pelo IPCA e avise que o valor declarado costuma ser o de compra. Mostre só os anos em que a pessoa concorreu, em tom descritivo.
- **Dados pessoais:** CPF, título de eleitor e data de nascimento servem só para ligar registros entre bases e ficam no banco. A API, o front, os logs e os fixtures de teste identificam pessoas pelo id interno. O e-mail de quem se inscreve segue a mesma regra. O regulamento do hackathon (item 6.9) também proíbe a demo de expor dados pessoais reais de terceiros.

## Fontes de dados

Endpoints, campos e exemplos de cada fonte estão na issue do conector (#10 a #13) e, depois da #4, no dicionário de dados em `docs/`. Regras que valem para todas:

- Toda chamada externa tem timeout e nova tentativa com backoff. A API da Câmara devolve 504 de vez em quando.
- O User-Agent identifica o projeto (`mandatometro (Hack Brasil 2026)`), e a coleta respeita o robots.txt dos sites.
- Os CSVs do TSE vêm em latin-1, separados por `;`, um por UF dentro de cada ZIP.
- A mesma pessoa se liga entre eleições do TSE pelo CPF. Em 2024 o CPF vem vazio e em 2012 falta em parte das linhas: nesses anos, use o título de eleitor e confira a data de nascimento.

## Segredos

As chaves (Firecrawl, Resend, Devin e LLM) ficam só no `.env` local, criado a partir do `.env.example`, e nos secrets da hospedagem. Código, issues, PRs e logs citam a chave pelo nome da variável. Variável nova entra no `.env.example` com valor vazio e um comentário.

## Como trabalhar

- **Branches:** todo PR vai para a `develop`, que é a branch padrão do GitHub. A `main` só recebe merge da `develop`, quando ela estiver estável, como antes da demo e da entrega.
- **Uma issue por PR.** Branch `tipo/NN-descricao` criado a partir da `develop` (ex.: `feat/10-conector-camara`); commits no padrão Conventional Commits, em português (ex.: `feat(camara): conector de proposições`).
- **Descrição do PR:** o que mudou, como testar e `Closes #NN`. PR do Devin leva o label `devin`.
- **Sem assinatura de IA:** commits e PRs levam só o conteúdo do trabalho, sem linha de autoria de ferramenta de IA, como "Generated with Claude Code" ou `Co-Authored-By` de um agente. No Claude Code, o `.claude/settings.json` já desliga essa assinatura.
- **Testes de unidade rodam offline,** com respostas reais gravadas em `tests/fixtures/`, com CPF e título de eleitor trocados por valores fictícios. Testes que usam a rede levam o marcador `online` e ficam fora do CI.
- **Nomes do domínio em português, sem acento:** `parlamentar`, `mandato`, `candidatura`, `proposicao`, `votacao`, `voto`, `promessa`, `ligacao`, `bem_declarado`, `fonte` e `inscrito`. Texto para o usuário em pt-BR.
- **Ao terminar:** se mudou como rodar, atualize o README; se surgiu uma convenção ou uma pegadinha de fonte, atualize este arquivo.
