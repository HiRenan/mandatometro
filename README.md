# Mandatômetro

**A política brasileira de perto.** Um site que ensina como funciona a política brasileira, em linguagem simples e a partir do que o Congresso está votando.

> Projeto da trilha **Acesso à educação** do [Hack Brasil 2026](https://hackbrasil.com).
>
> [Site público de produção](https://mandatometro.com.br) (`main`) · [Site de desenvolvimento](https://dev.mandatometro.com.br) (`develop`)

## O problema

As pesquisas mostram que muitas pessoas têm dificuldade para citar quem as representa no Congresso. Também indicam que as emendas parlamentares são pouco conhecidas. [Pesquisas e fontes](docs/problema.md#destaques)

- **68%** dos entrevistados não citam o nome de nenhum deputado federal em exercício e **75%** não citam o nome de nenhum senador (Datafolha, 17–18/06/2026).
- Entre os eleitores de 20 anos ou mais, **85%** lembram em quem votaram para presidente em 2022 e **67%** não lembram em quem votaram para deputado federal naquele ano (Datafolha, 17–18/06/2026).
- **87%** de quem já ouviu falar em emendas parlamentares dizem saber pouco ou nada sobre elas (DataSenado, 18/11 a 14/12/2021).

O DataSenado encontrou mais apoio à democracia entre pessoas com mais escolaridade. Essa relação ajuda a explicar a escolha da trilha **Acesso à educação**, com a proposta de ensinar como o Congresso funciona. O Mandatômetro é para eleitores, principalmente de 20 a 40 anos.

## O que ele faz

- **Trilhas.** Artigos curtos explicam como a política funciona com exemplos reais. Na trilha do processo legislativo, um infográfico mostra como uma ideia vira lei. Há um quiz no meio e outro no fim.
- **Newsletter semanal.** O jornal legislativo pode reunir o que o Congresso votou na semana e os destaques do Diário Oficial da União. Cada item traz uma explicação simples e a fonte oficial. As edições publicadas ficam no site e o envio semanal é programado para domingo. Se já houver uma edição publicada, o sistema tenta enviá-la logo depois da inscrição. [Diário Oficial na newsletter](docs/adr/0004-newsletter-do-dou.md)
- **Jogo das Comissões.** Em `/jogos/comissoes`, pela lista de `/jogos`, cinco cenas contam a tramitação real do projeto que virou a Lei 15.100/2025, a do celular na escola. Em cada cena você decide o próximo passo e depois vê o que aconteceu de verdade, com o link da fonte oficial. O jogo fica fora da trilha, e o fim do quiz final leva até ele. [Roteiro e regras](docs/jogo-das-comissoes.md)
- **Busca.** Use Ctrl+K ou a busca no alto da página para procurar nas trilhas, nos artigos e nas edições publicadas mais recentes. Você pode digitar só o começo da palavra, com ou sem acento. A busca ignora maiúsculas, funciona sem IA e mantém no navegador o que você digita.

As trilhas são abertas e a newsletter pede só o e-mail. O navegador guarda os artigos lidos. Se você criar uma conta, o progresso também fica no perfil para continuar em outro aparelho.

**Depois do MVP:** a página de cada deputado federal e senador, com o que prometeu na campanha, o que fez no mandato e o patrimônio que declarou ao TSE. O "fake ou fato" também fica para depois.

O porquê dessas escolhas está no [ADR 0002](docs/adr/0002-mvp.md) e no [ADR 0003](docs/adr/0003-login-opcional.md).

## Fontes

- **Trilhas.** As explicações citam leis, regimentos e páginas oficiais da Câmara, do Senado e do TSE.
- **Votações.** Os dados abertos da Câmara e do Senado fornecem votações, proposições e parlamentares. [Câmara](https://dadosabertos.camara.leg.br/) · [Senado](https://legis.senado.leg.br/dadosabertos/)
- **Diário Oficial.** A lista de legislação federal do Senado fornece decretos, leis e medidas provisórias. A página de destaques da Imprensa Nacional acrescenta portarias e outros atos de ministérios. [Legislação federal](https://legis.senado.leg.br/dadosabertos/legislacao/lista?tipo=LEI&ano=2026) · [Destaques do Diário Oficial](https://www.in.gov.br/servicos/diario-oficial-da-uniao/destaques-do-diario-oficial-da-uniao)
- **Depois do MVP.** A coleta de candidaturas e bens declarados ao TSE e a leitura dos sites de campanha ficam para essa etapa. [Portal de Dados Abertos do TSE](https://dadosabertos.tse.jus.br/)

## Ferramentas parceiras

| Ferramenta | Uso no Mandatômetro |
|---|---|
| [Resend](https://resend.com/) | Todos os e-mails, incluindo a newsletter de domingo, a última edição para quem se inscreve e os avisos de conta |
| [Firecrawl](https://www.firecrawl.dev/) | Lê a página de destaques do Diário Oficial na coleta de sábado. A leitura do inteiro teor das proposições e das notícias da Câmara e do Senado segue em teste na #9. O teste com sites de campanha fica para depois do MVP |
| [Devin](https://devin.ai/) | Conectores de dados e testes, com PRs neste repositório |

## Stack

O site usa TypeScript, React e TanStack Start. O backend usa Python 3.13, FastAPI e SQLAlchemy. O banco é PostgreSQL com pgvector. O Turborepo roda as tarefas do repositório e o Docker Compose sobe os serviços localmente.

O porquê de cada escolha está no [ADR 0001](docs/adr/0001-stack.md).

- `packages/ui/` (estilos, fontes e configuração do shadcn/ui) e `packages/config/` (tsconfig base) partiram do Better-T-Stack.

## Arquitetura

```mermaid
flowchart TD
    fontes["Fontes oficiais"] --> coleta["Coletas e rascunho"]
    coleta <--> banco[(PostgreSQL)]
    banco <--> api["API"]
    api <--> site["Site e /painel"]
    banco <--> envios["Envios agendados"]
    envios --> email["E-mail via Resend"]
    api --> email
```

O GitHub Actions roda as coletas e o rascunho fora dos pedidos ao site. A coleta diária usa `coleta camara` e `coleta senado` e grava no PostgreSQL. A agenda de sábado roda `coleta legislacao` nos dados abertos do Senado, `coleta destaques` na página da Imprensa Nacional via Firecrawl e `edicao rascunho`, nessa ordem.

O comando de rascunho lê os dados já gravados e salva a edição no banco. Quando configurado, o modelo de linguagem sugere a ordem dos atos do Diário Oficial e escreve o texto das votações elegíveis. Em `/painel`, uma administradora confere os itens e as fontes, completa os textos pendentes e publica pela API.

A API entrega ao site as edições publicadas, os parlamentares e os votos gravados pela coleta. Também registra inscrições, contas, progresso das trilhas e tentativas do piloto. As trilhas vêm de arquivos do site. Na hospedagem, o site e a API ficam na Vercel e o PostgreSQL fica no Neon.

Quando a agenda de domingo está ativa, `edicao enviar` usa o Resend para mandar a edição publicada naquela semana. O Resend também envia a edição mais recente na inscrição, quando disponível, e os avisos de conta. O workflow de avisos retoma pendências com `python -m mandatometro.contas`. O de migrations atualiza o banco com `alembic upgrade head`.

[Horários e ativação das tarefas](docs/hospedagem.md#como-as-tarefas-funcionam) · [Revisão da edição](docs/newsletter.md#revisão-pelo-painel)

## Modelo de dados

O banco guarda os dados da Câmara, do Senado e do TSE, os atos do Diário Oficial, as edições da newsletter, a medição do piloto e as contas com o progresso das trilhas. Os modelos ficam em `apps/backend/src/mandatometro/db/modelos.py`, e cada mudança vira uma migration do Alembic.

- **Cada Casa tem os seus números:** parlamentar, proposição e votação se identificam pela Casa e pelo id que a Casa dá (`casa`, `id_externo`). Quando a mesma matéria aparece nas duas Casas, cada uma tem o seu registro. A numeração única de 2019 em diante permite relacioná-los por sigla, número e ano.
- **Atos do Diário Oficial** se identificam por `origem` e `id_externo`. A seleção semanal usa a data de publicação.
- **Candidaturas do TSE** se identificam por ano, código da eleição e `SQ_CANDIDATO`. A coleta grava os pares únicos ligados a parlamentares em exercício.
- **Patrimônio declarado ao TSE** liga as eleições gerais ao parlamentar pela candidatura já confirmada. No histórico, a chave inclui a UF da eleição. Os bens ficam em centavos nominais, somados por candidatura e tipo.
- **Fonte em tudo:** cada dado coletado e cada item da edição aponta para uma `fonte`, com o endereço e a data da coleta. Sem fonte, o banco não grava.
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

Na raiz do repositório, copie o arquivo de exemplo para configurar o ambiente local.

```bash
cp .env.example .env   # preencha as chaves; o .env fica fora do Git
```

### Tudo no Docker

`docker compose up --build` sobe o banco, a API e o site. O site fica em http://localhost:3001 e a API em http://localhost:8000, com a documentação em http://localhost:8000/docs. A API aplica as migrations ao subir.

### Desenvolvimento

Rode na raiz para desenvolver com recarga automática.

```bash
pnpm install
docker compose up -d db         # só o banco, na porta 5433
pnpm --filter backend migrate   # aplica as migrations
pnpm dev                        # site na porta 3001 e API na 8000
```

**O build do site no PC:** o `pnpm check-types` do site roda um `vite build` antes do `tsc` e regrava o `.output`. O `API_URL` vai na linha dele também, como no `pnpm build` e no `pnpm dev`, senão o build leva o `http://localhost:8000` que o `.env.schema` dá fora da Vercel. Uma cópia do `.output` sobe com a pasta `apps/web` como diretório de trabalho: na partida, o servidor chama o CLI do varlock, que ele procura no `node_modules/.bin` a partir dessa pasta, e lê o `.env.schema` dali. Em 18/11/2026, com a cópia fora do repositório, da raiz ele subiu sem ler o `.env.schema`, com o aviso "No .env files found" do varlock (o CLI também está no `node_modules/.bin` da raiz), e de uma pasta fora do repositório não subiu ("'varlock' não é reconhecido como um comando interno ou externo", no Windows).

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

`pnpm check` corrige a formatação do TypeScript. No Python, rode `uv run ruff format` e `uv run ruff check --fix` em `apps/backend`.

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
- `GET /parlamentares/{id}/votos` devolve `votos`, `total`, `limite` e `deslocamento`, da votação mais recente para a mais antiga. O limite padrão é 20, com máximo de 100. Cada voto traz as proposições afetadas. O campo `url_oficial` usa o endereço público da fonte, com o endereço da coleta como reserva, e é nulo se a fonte estiver sem endereço.
- `GET /votacoes/{id}` mostra os votos de uma votação por nome de parlamentar, com a sigla do partido e a UF no dia do voto. O placar geral e o de cada partido contam esses registros nas sete categorias. `url_video` traz o endereço oficial da sessão inteira no YouTube ou nulo. Use o `votacao_id` do histórico ou o `id` de cada votação nos fatos da edição publicada.

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

A carga de bens usa os ZIPs `consulta_cand` e `bem_candidato` das seis eleições gerais de 2006 a 2026. O resumo JSON mostra as contagens por ano e a saída 1 indica falha na carga. A API entrega o patrimônio nominal de cada eleição em `GET /parlamentares/{id}/patrimonio`. A série usa `null` quando o total está indisponível. [Campos e regras dos bens](docs/dicionario-de-dados.md#bens-declarados-ao-tse)

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
- [Pedro Vinicius Meerholz](https://github.com/PedroMeerholz)
- [Nathan Arrais](https://github.com/nathan-arrais)

## Licença

[MIT](LICENSE)
