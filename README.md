# Mandatômetro

**A política brasileira de perto.**

O Mandatômetro ensina como funciona a política brasileira com trilhas de leitura e exemplos do que o Congresso vota.

> Projeto da trilha **Acesso à educação** do [Hack Brasil 2026](https://hackbrasil.com).
>
> [Demo do Mandatômetro](https://mandatometro.com.br) · [Site de desenvolvimento](https://dev.mandatometro.com.br) (`develop`)

<!-- A preencher pelo Renan: link do vídeo de apresentação de até três minutos. -->

## O problema

As pesquisas apontam dificuldade para identificar quem representa o eleitor no Congresso e pouco conhecimento sobre emendas parlamentares. [Pesquisas e fontes](docs/problema.md#destaques)

- **68%** dos entrevistados não citam o nome de nenhum deputado federal em exercício e **75%** não citam o nome de nenhum senador. [Datafolha, 17 e 18/06/2026](docs/problema.md#68-não-sabem-citar-um-único-deputado-federal)
- Entre os eleitores de 20 anos ou mais, **85%** lembram em quem votaram para presidente em 2022 e **67%** não lembram em quem votaram para deputado federal naquele ano. [Datafolha, 17 e 18/06/2026](docs/problema.md#o-eleitor-lembra-o-voto-para-presidente-mas-não-o-do-congresso)
- **87%** de quem já ouviu falar em emendas parlamentares dizem saber pouco ou nada sobre elas. [DataSenado, 18/11 a 14/12/2021](docs/problema.md#87-sabem-pouco-ou-nada-sobre-emendas-parlamentares)

O DataSenado encontrou uma associação entre maior escolaridade e maior apoio à democracia. [DataSenado, junho de 2024](docs/problema.md#2-confiança-e-democracia)

Na trilha **Acesso à educação**, o Mandatômetro se propõe a ensinar como o Congresso funciona a eleitores, principalmente de 20 a 40 anos. [Como isso virou produto](docs/problema.md#como-isso-virou-produto) · [Recorte do público](docs/problema.md#4-o-recorte-de-20-a-40-anos)

## O que ele faz

- **[Trilhas](https://mandatometro.com.br/trilhas).** Artigos curtos explicam a Constituição, os Três Poderes, os direitos e deveres e o processo legislativo, com fontes oficiais. Na trilha do processo legislativo, um infográfico mostra como uma ideia vira lei, com um quiz no meio e outro no fim. [Trilha do processo legislativo](https://mandatometro.com.br/trilhas/processo-legislativo)
- **[Newsletter semanal](https://mandatometro.com.br/edicoes).** As edições podem reunir votações do Congresso e destaques do Diário Oficial da União, com explicações e fontes oficiais. A inscrição pede só o e-mail e tenta enviar a última edição publicada, quando disponível. [Inscrever-se](https://mandatometro.com.br/#newsletter)
- **[Jogos](https://mandatometro.com.br/jogos).** No Jogo das Comissões, você decide o próximo passo do projeto que virou a Lei 15.100/2025, sobre o uso de celular nas escolas. A cada decisão, o jogo mostra o que aconteceu e indica a fonte oficial. [Jogo das Comissões](https://mandatometro.com.br/jogos/comissoes) · [Roteiro e fontes](docs/jogo-das-comissoes.md)
- **[Parlamentares](https://mandatometro.com.br/parlamentares).** Escolha uma UF no mapa para ver deputados federais e senadores em exercício, com as fotos disponíveis creditadas às Casas. A ficha reúne partido, mandatos, votos registrados e, quando publicados pelas Casas, profissão e escolaridade. Em **Com o partido**, veja quando o parlamentar votou com a maioria dos colegas de partido e quando divergiu. Cada divergência tem um link para conferir os votos do partido naquela votação. [Exemplo de ficha](https://mandatometro.com.br/parlamentares/362-ana-paula-lima)
- **[Patrimônio declarado ao TSE](https://mandatometro.com.br/parlamentares/362-ana-paula-lima#patrimonio).** A ficha mostra o patrimônio declarado em cada eleição com dados e o resultado quando disponível. Você pode ver o total declarado ou o valor em reais de hoje, corrigido pelo IPCA até o último mês disponível na série.
- **[Votações e temas](https://mandatometro.com.br/votacoes/47).** A página reúne o placar geral e por partido, a lista nominal com filtros de UF e partido e o vídeo oficial da sessão inteira, conforme os dados disponíveis. A API associa os temas das proposições às votações e permite filtrar por tema o histórico de votos de um parlamentar. [Conversão dos temas](docs/dicionario-de-dados.md#temas-das-proposições-e-das-votações)
- **[Busca](https://mandatometro.com.br).** Use a lupa do cabeçalho, Ctrl+K ou ⌘K para procurar nas trilhas, nos artigos e nas edições recentes. A busca aceita o começo das palavras com ou sem acento e roda no navegador.
- **[Conta opcional](https://mandatometro.com.br/cadastro).** As trilhas, os jogos e a inscrição na newsletter são abertos. O navegador guarda os artigos lidos e a conta permite continuar em outro aparelho. [Meu perfil](https://mandatometro.com.br/perfil)
- **[Painel da administradora](https://mandatometro.com.br/painel).** A administradora revisa os textos e as fontes antes de publicar a edição semanal. A página de números reúne dados agregados de visitas, contas, leituras, newsletter, piloto e coletas. [Números do site](https://mandatometro.com.br/painel/numeros)

O histórico das decisões de produto está nos ADRs. [MVP](docs/adr/0002-mvp.md) · [Conta opcional](docs/adr/0003-login-opcional.md)

## Piloto

O piloto compara os acertos no mesmo quiz antes e depois da trilha do processo legislativo. Um código aleatório liga as duas etapas, e o relatório calcula as médias de acertos das participações que completaram ambas. [Medição do piloto](docs/medicao-do-piloto.md#relatório-para-o-time)

<!-- A preencher pelo Renan: incluir os números de produção que forem usados na entrega, com fonte e data de corte. -->

## Fontes

- **Trilhas.** As explicações citam leis, regimentos e páginas oficiais da Câmara, do Senado e do TSE.
- **Câmara e Senado.** Os dados abertos fornecem proposições, votações, votos, mandatos e biografias oficiais. As fotos e os vídeos vêm dos canais oficiais das Casas. [Câmara](https://dadosabertos.camara.leg.br/) · [Senado](https://legis.senado.leg.br/dadosabertos/) · [Vídeos das sessões](docs/dicionario-de-dados.md#vídeos-das-sessões)
- **TSE.** Os arquivos de dados abertos fornecem candidaturas, resultados eleitorais e bens declarados nas eleições gerais. [Portal de Dados Abertos do TSE](https://dadosabertos.tse.jus.br/) · [Regras do patrimônio declarado](docs/dicionario-de-dados.md#bens-declarados-ao-tse)
- **IPCA.** A correção do patrimônio usa a série 433 de variações mensais publicada pelo Banco Central. [Fonte e cálculo](docs/dicionario-de-dados.md#ipca-mensal)
- **Diário Oficial.** A lista de legislação federal do Senado fornece decretos, leis e medidas provisórias. A página de destaques da Imprensa Nacional acrescenta portarias e outros atos de ministérios. [Legislação federal](https://legis.senado.leg.br/dadosabertos/legislacao/lista?tipo=LEI&ano=2026) · [Destaques do Diário Oficial](https://www.in.gov.br/servicos/diario-oficial-da-uniao/destaques-do-diario-oficial-da-uniao)

## Ferramentas parceiras

| Ferramenta | Uso no Mandatômetro |
|---|---|
| [Resend](https://resend.com/) | Envia a newsletter de domingo, a última edição após a inscrição e os avisos de confirmação, recuperação e exclusão de conta |
| [Firecrawl](https://www.firecrawl.dev/) | Obtém o HTML da página de destaques do Diário Oficial e de sua paginação na coleta de sábado. [ADR 0006](docs/adr/0006-destaques-do-dou.md) |
| [Devin](https://devin.ai/) | O guia de contribuição prevê delegar tarefas e identificar os PRs resultantes com o rótulo `devin`. [Convenções do repositório](AGENTS.md#conventions) |

<!-- A preencher pelo Renan: confirmar se houve PRs do Devin e acrescentar os links. A consulta de PRs com o rótulo devin retornou vazia em 23/11/2026. -->

## Stack

O site usa TypeScript, React e TanStack Start. O backend usa Python 3.13, FastAPI e SQLAlchemy, com Alembic para migrations no PostgreSQL. O Turborepo roda as tarefas do monorepo, e o Docker Compose sobe o ambiente local com PostgreSQL 17 e pgvector.

O cliente TypeScript é gerado com hey-api a partir do contrato OpenAPI da API. [Contrato OpenAPI](apps/backend/openapi.json) · [ADR da stack](docs/adr/0001-stack.md)

Os estilos, as fontes e a configuração do shadcn/ui em `packages/ui/` e o `tsconfig` base em `packages/config/` partiram do Better-T-Stack.

## Arquitetura

```mermaid
flowchart TD
    fontes["Câmara, Senado, TSE, IPCA e DOU"] --> tarefas["GitHub Actions · CLI do backend"]
    tarefas <--> banco[(PostgreSQL no Neon)]
    banco <--> api["FastAPI · Vercel"]
    api <--> site["TanStack Start · Vercel"]
    tarefas --> email["E-mail via Resend"]
    api --> email
```

O site e a API ficam em projetos separados na Vercel. O servidor do site consulta a API FastAPI e entrega o HTML das páginas de edições, parlamentares e votações. Artigos e quizzes vêm de arquivos Markdown do repositório. [Hospedagem](docs/hospedagem.md) · [Conteúdo das trilhas](docs/conteudo-das-trilhas.md)

As coletas e a preparação da edição rodam pelo CLI do backend, fora dos pedidos ao site. No GitHub Actions, a coleta diária atualiza os dados da Câmara e do Senado quando ativada. As cargas de TSE, IPCA e biografias têm disparo manual. [CLI](apps/backend/src/mandatometro/cli.py) · [Tarefas na hospedagem](docs/hospedagem.md#como-as-tarefas-funcionam)

A agenda de sábado coleta a legislação federal pelo Senado e os destaques do Diário Oficial via Firecrawl, depois roda `edicao rascunho` com os dados já gravados. O código seleciona as votações por regras fixas. Com um modelo de linguagem configurado, a IA redige os itens elegíveis de votações e sugere a ordem dos atos do DOU. Em `/painel`, uma administradora confere as fontes, completa a redação dos atos e publica pela API. [Código do rascunho](apps/backend/src/mandatometro/ia/servico.py) · [Revisão](docs/newsletter.md#revisão-pelo-painel)

A API registra inscrições, contas, progresso de leitura, contagens de visita e tentativas do piloto no PostgreSQL. O envio de domingo, quando a agenda está ativa, usa `edicao enviar` para mandar pelo Resend a edição publicada naquela semana. Os avisos de conta que ficam pendentes podem ser retomados pelo workflow de avisos. [Envio e leitura pública](docs/newsletter.md#newsletter-envio-e-leitura-pública) · [Cadastro de contas](#cadastro-de-contas)

O workflow de migrations aplica `alembic upgrade head` no banco do ambiente escolhido. [Migrations na hospedagem](docs/hospedagem.md#como-as-tarefas-funcionam)

## Modelo de dados

O banco guarda os dados da Câmara, do Senado e do TSE, a série mensal do IPCA e os atos do Diário Oficial. Também guarda as edições, as inscrições, as contas com o progresso das trilhas, as contagens de visita e as tentativas do piloto. Um teste compara as tabelas, colunas e ligações do diagrama com os modelos do SQLAlchemy. [Modelos](apps/backend/src/mandatometro/db/modelos.py) · [Teste do diagrama](apps/backend/tests/test_diagrama.py)

- **Cada Casa tem os seus números:** parlamentar, proposição e votação se identificam pela Casa e pelo id que a Casa dá (`casa`, `id_externo`). Quando a mesma matéria aparece nas duas Casas, cada uma tem o seu registro. A numeração única de 2019 em diante permite relacioná-los por sigla, número e ano.
- **Atos do Diário Oficial** se identificam por `origem` e `id_externo`. A seleção semanal usa a data de publicação.
- **Candidaturas do TSE** se identificam por ano, código da eleição e `SQ_CANDIDATO`. A coleta grava os pares únicos ligados a parlamentares em exercício.
- **Patrimônio declarado ao TSE** liga as eleições gerais ao parlamentar pela candidatura já confirmada. No histórico, a chave inclui a UF da eleição. Os bens ficam em centavos nominais, somados por candidatura e tipo.
- **Fontes.** Votações, votos, atos e registros do patrimônio têm referências em `fonte`, com o endereço e a data da coleta. Cada item da edição aponta para a fonte usada na revisão.
- **O partido fica no voto,** porque muda dentro do mandato. Os totais das nominais se contam pelos votos. Nas secretas do Senado, a coleta guarda matéria, votação e resultado, sem votos individuais; o banco não guarda os totais nem a modalidade. Ausência de votos no banco não significa zero votos na sessão nem identifica, sozinha, uma votação secreta.
- **Ausência sem motivo:** toda ausência reconhecida do Senado (`AP`, `LS`, `MIS`, `NCom`, `LAP` e `LP`, em `CODIGOS_DE_AUSENCIA`) entra como `nao_votou`, sem o código, para a licença saúde ficar igual às outras. O voto só guarda os códigos de voto e de presença da lista `CODIGOS_GRAVADOS`, e o banco recusa os demais. Um código ainda não classificado, como `NA`, entra como `outro`, sem o código, e o log não leva o código nem a pessoa: a coleta registra só a votação e quantos códigos desconhecidos vieram nela.
- **Quem assina** deixa o e-mail, a data e o código do link de sair; a última edição aceita permite retomar um envio. Sair apaga a linha e esse marcador.
- **Medição do piloto:** cada conclusão guarda apenas código aleatório, versão do quiz, etapa e total de acertos. Não tem ligação com conta ou newsletter; não guarda turma, data nem hora da tentativa.
- **Visitas** guardam a contagem por página pública e dia de Brasília. A cota do contador tem só o minuto e a quantidade, sem vínculo com quem visita.
- **Opiniões** guardam a data, a nota opcional, as partes usadas e o texto, sem vínculo com uma conta. A cota separada tem só o minuto e a quantidade.

```mermaid
erDiagram
    conta ||--o{ credencial_conta : "autoriza"
    conta ||--o{ artigo_lido : "guarda"
    conta |o--o{ aviso_conta : "gera"
    conta {
        uuid id PK
        string email UK
        string nome
        string senha_hash
        string genero
        string autodescricao
        string estado
        date nascimento
        string termo
        timestamptz aceite_em
        timestamptz criada_em
        timestamptz confirmada_em
        string papel "comum ou administradora"
    }
    credencial_conta {
        string resumo PK
        uuid conta_id FK
        string finalidade
        timestamptz expira
    }
    artigo_lido {
        uuid conta_id PK,FK
        string artigo_id PK
        timestamptz marcado_em
    }
    aviso_conta {
        uuid id PK
        uuid conta_id FK
        bytes conteudo
        timestamptz proxima
        timestamptz expira
    }
    limite_conta {
        string chave PK
        int minuto
        int tentativas
    }
    parlamentar ||--o{ mandato : "tem"
    parlamentar ||--o| biografia_parlamentar : "tem"
    parlamentar ||--o{ candidatura : "disputou"
    parlamentar ||--o{ candidatura_patrimonio : "disputou"
    candidatura_patrimonio ||--o{ bem_declarado : "soma por tipo"
    parlamentar ||--o{ voto : "dá"
    votacao ||--o{ voto : "recebe"
    video_sessao |o--o{ votacao : "registra"
    votacao ||--o{ votacao_proposicao : "afeta"
    proposicao ||--o{ votacao_proposicao : "é afetada"
    proposicao ||--o{ proposicao_tema : "tem"
    edicao ||--o{ item_edicao : "tem"
    edicao |o--o{ inscrito : "última aceita"
    fonte ||--o{ parlamentar : "comprova"
    fonte |o--o{ biografia_parlamentar : "comprova profissões e escolaridade"
    fonte ||--o{ partido : "comprova o nome"
    fonte ||--o{ mandato : "comprova"
    fonte ||--o{ candidatura : "comprova"
    fonte ||--o{ candidatura_patrimonio : "comprova candidatura e bens"
    fonte ||--o{ ipca_mensal : "comprova o índice"
    fonte ||--o{ proposicao : "comprova"
    fonte ||--o{ proposicao_tema : "classifica"
    fonte ||--o{ votacao : "comprova"
    fonte ||--o{ video_sessao : "comprova"
    fonte ||--o{ voto : "comprova"
    fonte ||--o{ ato : "comprova"
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
    biografia_parlamentar {
        int parlamentar_id PK,FK
        text[] profissoes
        string escolaridade
        int fonte_profissoes_id FK
        int fonte_escolaridade_id FK
    }
    partido {
        string sigla PK
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
    candidatura {
        int id PK
        smallint ano UK
        int codigo_eleicao UK
        bigint id_externo UK "SQ_CANDIDATO"
        smallint cargo "código do TSE"
        string uf
        string partido
        string numero
        string nome_urna
        string resultado
        smallint resultado_bruto
        int parlamentar_id FK
        int fonte_id FK
    }
    candidatura_patrimonio {
        int id PK
        smallint ano UK
        int codigo_eleicao UK
        string uf UK
        bigint id_externo UK "SQ_CANDIDATO"
        smallint cargo "código do TSE"
        string resultado "opcional, do último turno"
        text resultado_bruto "opcional, para texto desconhecido"
        int parlamentar_id FK,UK
        int fonte_candidatura_id FK
        int fonte_bens_id FK
    }
    bem_declarado {
        int candidatura_id PK,FK
        int tipo PK "código do tipo de bem do TSE"
        bigint valor_centavos "nominal, agregado por tipo"
    }
    ipca_mensal {
        date mes PK "primeiro dia do mês"
        numeric variacao_percentual "variação mensal em %"
        int fonte_id FK
    }
    proposicao {
        int id PK
        string casa UK
        int id_externo UK "no Senado, o idProcesso"
        string sigla "com número e ano, permite relacionar matérias das duas Casas"
        int numero
        int ano
        string ementa
        string apelido
        string url_inteiro_teor
        int fonte_id FK
    }
    proposicao_tema {
        int proposicao_id PK, FK
        string tema PK
        int fonte_id FK
    }
    votacao {
        int id PK
        string casa UK
        string id_externo UK "2637478-26 ou 7109"
        date data
        string descricao
        string resultado "aprovada, rejeitada ou outro"
        string resultado_bruto "código publicado pela Casa"
        int fonte_id FK
        int video_sessao_id FK "anulável"
    }
    video_sessao {
        int id PK
        string casa UK
        int id_externo UK "evento da Câmara ou encontro do Senado"
        string url_video "endereço oficial no YouTube ou nulo"
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
    ato {
        int id PK
        string origem UK
        string id_externo UK
        string tipo "decreto, lei, medida_provisoria ou outro"
        string titulo
        string ementa
        date data_publicacao
        date data_assinatura
        string secao
        string orgao
        string numero
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
        jsonb fatos "fotografia editorial sem dados individuais"
        string artigo_caminho "artigo permitido da trilha"
    }
    inscrito {
        int id PK
        string email UK "em minúsculas"
        uuid codigo_saida UK "o link de sair"
        timestamptz inscrito_em
        int ultima_edicao_enviada_id FK "opcional, sem histórico de entrega"
    }
    limite_inscricao {
        timestamptz janela PK "o minuto da cota global"
        int quantidade "tentativas admitidas, sem identificar pessoas"
    }
    tentativa_piloto {
        uuid participacao PK "código sorteado no navegador"
        string versao_quiz PK
        string etapa PK "antes ou depois"
        smallint acertos "de 0 a 12"
    }
    limite_piloto {
        timestamptz janela PK "o minuto da cota global do piloto"
        int quantidade "tentativas admitidas, sem identificar pessoas"
    }
    visita {
        date dia PK "dia em Brasília"
        string caminho PK "página pública"
        bigint quantidade "páginas vistas"
    }
    limite_visita {
        timestamptz janela PK "o minuto da cota global de visitas"
        int quantidade "visitas admitidas"
    }
    opiniao {
        int id PK
        timestamptz criada_em
        smallint nota "opcional, de 1 a 5"
        text[] partes "partes distintas do site, pode ficar vazia"
        text texto "de 1 a 2.000 caracteres"
    }
    limite_opiniao {
        timestamptz janela PK "o minuto da cota global de opiniões"
        int quantidade "opiniões admitidas"
    }
```

## Como rodar

### Requisitos

Instale o [Docker](https://www.docker.com/) para subir os serviços. Para desenvolver e rodar as checagens no computador, instale também o [Node.js](https://nodejs.org/) 24, o [pnpm](https://pnpm.io/) e o [uv](https://docs.astral.sh/uv/). O pnpm usa a versão do `packageManager` no `package.json`, e o uv usa o Python 3.13.

Na raiz do repositório, copie o arquivo de exemplo para configurar o ambiente local. Preencha as chaves das integrações que for usar.

```bash
cp .env.example .env
```

### Tudo no Docker

`docker compose up --build` sobe o banco, a API e o site. O site fica em http://localhost:3001 e a API em http://localhost:8000, com a documentação em http://localhost:8000/docs. A API aplica as migrations ao subir.

O navegador e o servidor do site precisam alcançar o mesmo `API_URL`. No Compose, configure um endereço acessível também de dentro do contêiner `web` para abrir as páginas que leem dados no servidor. No fluxo de desenvolvimento abaixo, site e API rodam no computador e usam o endereço padrão `http://localhost:8000` para a API.

### Desenvolvimento

Rode na raiz para desenvolver com recarga automática.

```bash
pnpm install --frozen-lockfile
docker compose up -d db         # só o banco, na porta 5433
pnpm --filter backend migrate   # aplica as migrations
pnpm dev                        # site na porta 3001 e API na 8000
```

Com o banco vazio, as trilhas e o jogo já abrem. Para carregar parlamentares e votações na instalação local, rode as [coletas das duas Casas](#coletas) com o `DATABASE_URL` desse banco.

**Build do site.** `pnpm check-types` roda `vite build` antes do `tsc` e regrava o `.output`. Para trocar o endereço padrão da API, passe `API_URL` no ambiente de `pnpm dev`, `pnpm check-types` e `pnpm build`. Para abrir um build local, rode `node .output/server/index.mjs` em `apps/web`, onde o servidor encontra o `.env.schema` e o CLI do varlock nas dependências instaladas.

**Ícone, prévia do link e azulejos da margem.** [Como editar e gerar as imagens](docs/codigo-do-site.md#css-e-imagens).

**Cliente da API.** `pnpm generate:client`. Veja o [contrato da API](AGENTS.md#conventions).

**Migration nova.** Em `apps/backend`, use `uv run alembic heads` para descobrir a última revisão e escolha o próximo número. Um exemplo depois da `0019` é `uv run alembic revision --autogenerate --rev-id 0020 -m "cria a tabela orientacao"`. `uv run alembic check` compara os modelos com o banco local com as migrations aplicadas. [Convenções de migrations](AGENTS.md#conventions)

### Checagens

Rode na raiz do repositório.

```bash
pnpm lint          # Biome no TypeScript e Ruff no Python
pnpm check-types   # tipos do site
pnpm test          # pytest e Vitest
pnpm build         # build do site, que confere o conteúdo das trilhas
```

`pnpm check` aplica as correções automáticas do Biome. No Python, rode `uv run ruff format` e `uv run ruff check --fix` em `apps/backend`.

Em `apps/backend`, rode `uv run pytest tests/test_diagrama.py` para comparar o diagrama do README com os modelos. Esse teste usa apenas os arquivos do repositório.

Para rodar os testes online, execute `uv run pytest -m online` em `apps/backend`. A suíte padrão e o CI executam apenas os testes offline.

**Testes de banco.** Crie um banco de teste uma vez, com o banco do Docker no ar, e passe o endereço no `TEST_DATABASE_URL`:

```bash
docker compose exec db createdb -U mandatometro mandatometro_teste
TEST_DATABASE_URL=postgresql+psycopg://mandatometro:troque-esta-senha@localhost:5433/mandatometro_teste pnpm test
```

Veja as [regras para os testes de banco](AGENTS.md#tests).

**Medição do piloto.** [Contrato, relatório agregado e roteiro de encerramento](docs/medicao-do-piloto.md).

### Cadastro de contas

O GitHub Actions processa a fila de produção no workflow **Retomar avisos de conta**, com agenda de cinco em cinco minutos quando `AVISOS_CONTA_ATIVOS` vale `true` e os segredos do ambiente `producao` estão configurados. Ele lê os avisos cifrados e abre o destinatário e a mensagem para o envio pelo Resend.

Aplique as migrations da API até a revisão atual antes de abrir `/cadastro`. O termo de consentimento fica na página `/termo` do site, e a versão dele, a data do texto, fica em `VERSAO_DO_TERMO`, no `apps/web/src/lib/termo.ts`. Na API, configure `CONTA_TERMO_VERSAO` com essa mesma versão (hoje `2026-11-20`) e `CONTA_TERMO_URL` com o endereço do termo no site do ambiente: `http://localhost:3001/termo` na sua máquina, `https://dev.mandatometro.com.br/termo` no desenvolvimento e `https://mandatometro.com.br/termo` na produção. O cadastro compara a versão que a API devolve com a da página e fica fechado quando elas diferem. Para `CONTA_CHAVE`, gere uma chave privada com `uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` em `apps/backend`. Guarde-a nos segredos da API e do processo de entrega. O envio usa `RESEND_FROM` e `RESEND_API_KEY`. A API usa `APP_BASE_URL` para montar os links. [Abrir o cadastro de contas](docs/hospedagem.md#abrir-o-cadastro-de-contas)

Ao trocar a versão, publique primeiro a API com a nova `CONTA_TERMO_VERSAO`. O cadastro fica fechado para quem o abre no site antigo, e a API recusa o envio das abas já abertas com a versão antiga. Publique depois o site com o termo e a versão novos para reabrir o cadastro. [Quando o texto do termo mudar](docs/hospedagem.md#quando-o-texto-do-termo-mudar)

A API tenta entregar os avisos depois do commit. O destinatário e a mensagem ficam cifrados na fila até o processamento apagar o aviso. Com **Retomar avisos de conta** ligado, o endereço do comprovante vencido sai na rodada seguinte ao vencimento se ela alcançar o aviso, e a agenda do GitHub pode atrasar. Sem o workflow, a fila roda no próximo cadastro, reenvio, pedido de recuperação ou exclusão, ou numa execução manual de `uv run python -m mandatometro.contas` em `apps/backend` com o mesmo banco e segredos. A primeira rodada que processar o comprovante vencido apaga o endereço.

Em `/login`, quem já confirmou o e-mail entra com a senha e segue para `/perfil`. A sessão dura sete dias a partir do login. A API guarda o SHA-256 do segredo aleatório em `credencial_conta`. O navegador recebe o cookie `sessao_conta` com `HttpOnly`, `SameSite=Lax`, caminho `/` e `Secure` em HTTPS. **Sair** encerra a sessão atual. Redefinir a senha encerra todas as sessões da conta.

Ao entrar, os artigos lidos como visitante se juntam aos da conta. Com Web Locks, as abas compartilham a fila de pedidos e importam as marcas de visitante uma vez. Em navegadores sem Web Locks, cada aba tem sua própria fila. O outro aparelho lê o progresso ao abrir o site, ao restaurar uma página pelo histórico, ao navegar para outra página ou ao voltar à aba. Navegação e visibilidade compartilham um intervalo mínimo de 30 segundos entre releituras no mesmo documento. [Progresso das trilhas](docs/codigo-do-site.md#progresso-das-trilhas)

Marcar, desmarcar, recomeçar e desfazer atualizam a tela na hora e gravam na conta em segundo plano. Após falha de rede, prazo esgotado, `429` ou `5xx`, as ações pendentes ficam em memória até uma nova ação ou releitura no mesmo documento. Fechar ou recarregar a página pode perder essas ações. Lotes recusados por `409` ou `422` são descartados e a releitura acerta a tela com o que a conta guardou. **Sair** limpa as marcas deste navegador. Excluir a conta também apaga as marcas em `artigo_lido`, por exclusão em cascata.

`GET /contas/progresso` devolve `{"lidos": [...]}` da sessão atual. `POST /contas/progresso` aceita as listas opcionais `marcar` e `desmarcar` e devolve os ids após a alteração. Cada id segue o formato `trilha/slug` e tem até 128 caracteres. O servidor aceita até 256 ids somados por pedido e até 256 marcas por conta. O POST aceita até 64 KiB de corpo em JSON UTF-8 e responde `413` acima desse tamanho. Nas duas rotas de progresso, cada espera pela trava da conta tem prazo de 3 segundos. Quando vence, a API devolve `503` com `Retry-After: 3`.

Toda conta nasce com o papel `comum`. Quem opera o banco pode [conceder ou revogar o papel de administradora](docs/hospedagem.md#conceder-e-revogar-o-papel-de-administradora) pelo CLI depois da confirmação do e-mail. Com o papel, o `/perfil` mostra os links "Revisar a edição da semana", que leva à revisão em `/painel`, e "Ver os números do site", que leva aos números em `/painel/numeros`. [Revisão pelo painel](docs/newsletter.md#revisão-pelo-painel)

### Consulta de parlamentares

- `GET /parlamentares` lista todos os parlamentares em exercício por nome, com a URL e o crédito da foto oficial. Os filtros opcionais `uf` e `casa` aceitam a sigla da UF em maiúsculas e os valores `camara` ou `senado`, respectivamente.
- `GET /parlamentares/{id}` usa o id interno e acrescenta os mandatos, a contagem de votos registrados por valor, o nome oficial da sigla do partido e a biografia coletada da Casa. O nome do partido e a biografia podem ser nulos.
- `GET /parlamentares/{id}/patrimonio` devolve a série por eleição, com o total declarado, o resultado eleitoral e o total corrigido quando houver cobertura do IPCA. A resposta informa as fontes do TSE e do índice.
- `GET /parlamentares/{id}/votos` devolve `votos`, `total`, `limite` e `deslocamento`, da votação mais recente para a mais antiga. O limite padrão é 20, com máximo de 100. Cada voto traz as proposições afetadas. O campo `url_oficial` usa o endereço público da fonte, com o endereço da coleta como reserva, e é nulo se a fonte estiver sem endereço. O parâmetro `tema` filtra os votos antes da paginação.
- `GET /votacoes/{id}` mostra os votos de uma votação por nome de parlamentar, com a sigla do partido e a UF no dia do voto. O placar geral e o de cada partido contam esses registros nas sete categorias. `url_video` traz o endereço oficial da sessão inteira no YouTube ou nulo. Use o `votacao_id` do histórico ou o `id` de cada votação nos fatos da edição publicada.
- `GET /temas` lista o catálogo. As votações trazem os temas das proposições afetadas no detalhe, no histórico dos parlamentares e nos fatos das edições publicadas.

O partido no cadastro do parlamentar vem do voto mais recente pela data da votação e pode ser nulo. O histórico e a contagem consideram só os registros de voto da pessoa. Uma votação sem votos individuais gravados devolve as listas de votos e partidos vazias e as sete contagens zeradas. [OpenAPI](apps/backend/openapi.json)

### Coletas

**Coleta das duas Casas.** Com as migrations aplicadas e `DATABASE_URL` apontando explicitamente para o banco que deve receber os dados, rode os comandos abaixo em `apps/backend`. As datas incluem o primeiro e o último dia: informe `--inicio` e `--fim` juntos, no formato `AAAA-MM-DD`, ou nenhum dos dois. Sem datas, valem os sete dias completos anteriores, no fuso de Brasília.

Repetir o período atualiza os registros pelas mesmas chaves, inclusive votos corrigidos, sem duplicar parlamentar, mandato, proposição, votação ou voto. Cada rodada cria novas fontes com URL, data da coleta e trecho quando aplicável; as anteriores permanecem, inclusive quando deixam de ser referenciadas.

O resumo final é uma linha JSON com contagens confirmadas, chamadas HTTP (incluindo robots e retries), tentativas extras, duração, falhas e `indisponiveis_na_fonte`. Os códigos de saída são:

- **0:** coleta concluída para os registros disponíveis. Um recurso apontado pela fonte que responda 404/410 entra em `indisponiveis_na_fonte`, sem contar como queda da API. Confira também essa lista: saída 0 não significa que a fonte publicou todos os detalhes;
- **1:** coleta parcial ou interrompida. Uma votação que falha mantém a versão anterior e não impede as seguintes; seus ids aparecem em `falhas_votacoes`. Três votações consecutivas com falha interrompem a execução. Falhas no cadastro entram em `falhas_parlamentares`. As listagens principais são obrigatórias, e uma lista atual inválida não altera quem está em exercício;
- **2:** argumentos inválidos, antes de acessar a rede ou o banco.

As [regras da coleta e da saída dos jobs](docs/dicionario-de-dados.md#regras-que-valem-para-as-duas-apis) valem para os dois conectores.

**Biografias e partidos.** Depois de aplicar a migration `0019` e cadastrar os parlamentares pelas coletas do Congresso, rode `uv run mandatometro coleta biografias` em `apps/backend` com o `DATABASE_URL` do banco de destino. O comando lê a profissão e a escolaridade publicadas pelas Casas e os nomes dos partidos nos catálogos oficiais. A saída 1 indica carga parcial ou interrompida. Uma falha isolada preserva a biografia anterior e a coleta segue com as outras pessoas. [Fontes da biografia](docs/dicionario-de-dados.md#biografia-oficial-e-nome-do-partido) · [Workflow](docs/hospedagem.md#coletar-biografias-parlamentares)

**Coleta da Câmara.**

```bash
uv run mandatometro coleta camara --inicio 2026-11-09 --fim 2026-11-15
uv run mandatometro coleta camara
```

O comando divide consultas que atravessam a virada do ano, percorre todas as páginas e grava as votações do plenário, as proposições afetadas, os votos publicados e os deputados em exercício com seus mandatos. Consulta os detalhes dos deputados a cada execução para atualizar a condição do mandato. Quem aparece num voto antigo e não está em exercício hoje também ganha cadastro, a partir daquele voto, sem inferir a condição do mandato.

As fontes de proposição apontam para a ficha de tramitação e as de votação, quando há `idEvento`, para a página da sessão que apresenta o passo a passo daquela votação. No resumo da Câmara, `parlamentares` e `mandatos` contam o cadastro atual processado mais os registros históricos criados; `proposicoes` conta as distintas processadas naquela execução, e `votacoes`/`votos`, as unidades confirmadas.

Detalhe ou votos indisponíveis deixam a votação fora daquela rodada, sem inventar dados a partir da lista. Falha no detalhe de deputado preserva a condição anterior ou deixa `None` quando ele é novo. Lista atual de deputados incompleta interrompe sem reconciliar o exercício.

**Coleta do Senado.**

```bash
uv run mandatometro coleta senado --inicio 2026-11-09 --fim 2026-11-15
uv run mandatometro coleta senado
```

O comando coleta as votações publicadas de acordo com as [regras do endpoint do Senado](docs/dicionario-de-dados.md#votacao--a-votação-e-os-votos-numa-chamada).

Se o histórico de um votante fora da lista atual falhar, seus votos ficam gravados, o mandato não é inventado e `falhas_parlamentares` conta o parlamentar uma vez. Processo indisponível entra no resumo pelo caminho com seu id (por exemplo, `/processo/9006525`), e a votação é pulada. A [saída das coletas](docs/dicionario-de-dados.md#pegadinhas-e-saída-da-coleta) descreve como consultar históricos indisponíveis.

**Preenchimento de vídeos das sessões.** A coleta das duas Casas consulta uma vez por sessão das votações gravadas e registra o vídeo oficial disponível. Para preencher os vídeos de votações antigas, use os comandos abaixo com o período desejado. O modo atualiza o vínculo do vídeo e usa uma fonte própria, preservando os dados e as referências da revisão da edição.

```bash
uv run mandatometro coleta camara --somente-videos --inicio 2026-11-13 --fim 2026-11-20
uv run mandatometro coleta senado --somente-videos --inicio 2026-11-13 --fim 2026-11-20
```

A coleta normal renova as fontes editoriais mesmo quando o único dado novo é o vídeo. Para um rascunho pronto para publicar, use `--somente-videos` para conservar a revisão.

O resumo inclui as contagens em `videos`. Consulte [vídeos das sessões](docs/dicionario-de-dados.md#vídeos-das-sessões) e o [preenchimento em hospedagem](docs/hospedagem.md#preencher-vídeos-das-sessões).

**Preencher temas de votações já gravadas.** Em `apps/backend`, com as migrations aplicadas e `DATABASE_URL` explícito, use a janela das votações que quer cobrir.

```bash
uv run mandatometro coleta camara --somente-temas --inicio 2026-11-13 --fim 2026-11-20
uv run mandatometro coleta senado --somente-temas --inicio 2026-11-13 --fim 2026-11-20
```

Os comandos consultam as proposições ainda sem tema que estão ligadas a votações salvas no período e gravam só os temas oficiais convertidos e suas fontes. A coleta normal também preenche temas. Confira `temas` no resumo de cada Casa. Falha de consulta ou gravação temática dá saída 1 no modo `--somente-temas` e fica no resumo da coleta normal, preservando a votação e os temas já gravados. [Regras de conversão](docs/dicionario-de-dados.md#temas-das-proposições-e-das-votações) · [Preenchimento na hospedagem](docs/hospedagem.md#preencher-temas-de-votações-já-coletadas)

**Coleta de atos da legislação federal.** Em `apps/backend`, aplique as migrations e passe `DATABASE_URL` com o banco de destino.

```bash
uv run mandatometro coleta legislacao --inicio 2026-11-12 --fim 2026-11-18
uv run mandatometro coleta legislacao
```

O comando grava decretos, leis e medidas provisórias pela data de publicação no DOU. Sem datas, coleta os sete dias completos anteriores, no fuso de Brasília. Repetir o período atualiza os atos da mesma origem. O resumo JSON conta gravações e descartes por motivo. A [origem dos campos e a regra do período](docs/dicionario-de-dados.md#atos-do-diário-oficial) estão no dicionário.

A busca de candidatos começa dez dias corridos antes do período para abranger intervalos entre a assinatura e a publicação, como o de um feriado prolongado. Uma norma publicada no período pode ficar de fora se tiver sido assinada mais de dez dias antes do início.

**Coleta dos destaques do Diário Oficial.** Em `apps/backend`, use o banco de destino em `DATABASE_URL`, com as migrations aplicadas, e configure o segredo `FIRECRAWL_API_KEY`.

```bash
uv run mandatometro coleta destaques --inicio 2026-11-13 --fim 2026-11-19
uv run mandatometro coleta destaques
```

O comando grava os destaques da seção 1 pela data de publicação, incluindo portarias. Passe as duas datas ou use os sete dias completos anteriores no fuso de Brasília. Quando a coleta roda, o resumo é uma linha JSON com gravações, descartes e falhas. Saída 1 sinaliza falha ou coleta incompleta. O comando confere a conexão com o banco antes de pedir a primeira página. Se o banco não responder, o resumo traz o erro e zero chamadas. Sem a chave ou com datas inválidas, o comando imprime uma linha de texto fixo e sai com código 2. [Campos e paginação](docs/dicionario-de-dados.md#destaques-da-imprensa-nacional).

**Coleta do TSE.** Em `apps/backend`, use `DATABASE_URL` para o banco de destino com a migration `0013` aplicada e os mandatos em exercício carregados.

```bash
uv run mandatometro coleta tse
uv run mandatometro coleta tse --diretorio-zips /caminho/dos/zips
```

O primeiro comando baixa os dois ZIPs oficiais de candidaturas de 2022 e 2026. O segundo lê as cópias da pasta indicada. A carga repete as mesmas chaves e acrescenta uma observação de fonte por arquivo a cada execução completa. O resumo JSON mostra, por Casa e ano, os pares ligados, sem par, em conflito e descartados por incompatibilidade com o mandato. Em 2026, `outro_cargo` conta as candidaturas à outra Casa alcançadas pelo CPF da âncora de 2022 quando a ligação está livre de conflito. Se uma leitura falhar, a execução tenta a outra e retorna 1 sem gravar candidaturas ou fontes. Consulte os [campos do TSE](docs/dicionario-de-dados.md#candidaturas-do-tse) e o [disparo manual na hospedagem](docs/hospedagem.md#coletar-o-tse).

**Bens declarados ao TSE.** Depois de aplicar as migrations até `head` e carregar as candidaturas, rode em `apps/backend` com o `DATABASE_URL` do mesmo banco.

```bash
uv run mandatometro coleta bens-tse
uv run mandatometro coleta bens-tse --diretorio-zips /caminho/dos/zips
```

A carga de bens usa os ZIPs `consulta_cand` e `bem_candidato` das seis eleições gerais de 2006 a 2026. O resumo JSON mostra as contagens por ano e a saída 1 indica falha na carga. A série guarda os totais nominais e os resultados eleitorais disponíveis. [Campos e regras dos bens](docs/dicionario-de-dados.md#bens-declarados-ao-tse)

**Coleta do IPCA.** Em `apps/backend`, aplique as migrations e passe `DATABASE_URL` para o banco de destino.

```bash
uv run mandatometro coleta ipca
```

O comando atualiza a série mensal do Banco Central desde janeiro de 2006. O resumo JSON mostra quantos meses foram gravados e até que mês. Saída 1 indica falha e preserva a carga anterior. A rota de patrimônio usa a série gravada para acrescentar o total corrigido de cada eleição. [Fonte e cálculo](docs/dicionario-de-dados.md#ipca-mensal) · [Disparo na hospedagem](docs/hospedagem.md#coletar-o-ipca)

### Edição semanal

A agenda de sábado coleta a legislação e os destaques do Diário Oficial e prepara o rascunho às 04h47 de Brasília quando `AGENDA_SABADO_ATIVA` vale `true`. [Ativação e recuperação](docs/hospedagem.md#ativar-e-recuperar-a-agenda-de-sábado).

`uv run mandatometro edicao rascunho` prepara manualmente as votações e os atos do Diário Oficial coletados. Use `--teto-atos N` para ajustar o limite de atos, que começa em cinco. [Como preparar, revisar e publicar a edição](docs/newsletter.md#newsletter-rascunho-e-revisão).

### Newsletter

[Inscrição e saída](docs/newsletter.md#newsletter-inscrição-e-saída) e [envio e leitura pública das edições](docs/newsletter.md#newsletter-envio-e-leitura-pública).

### Hospedagem

[Configuração do site, da API e das tarefas](docs/hospedagem.md).

**Coleta e migrations na hospedagem.** [Ativação, agendamento e recuperação](docs/hospedagem.md#como-as-tarefas-funcionam).

## Time

- [Renan Mocelin](https://github.com/HiRenan)
  <!-- A preencher pelo Renan: LinkedIn de Renan Mocelin e confirmação do GitHub. -->
- [Pedro Vinicius Meerholz](https://github.com/PedroMeerholz)
  <!-- A preencher pelo Renan: LinkedIn de Pedro Vinicius Meerholz e confirmação do GitHub. -->
- [Nathan Arrais](https://github.com/nathan-arrais)
  <!-- A preencher pelo Renan: LinkedIn de Nathan Arrais e confirmação do GitHub. -->

## Licença

[MIT](LICENSE)
