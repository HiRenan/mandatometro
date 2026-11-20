# Mandatômetro

**O diário oficial político, simplificado.** Um site que ensina como funciona a política brasileira, em linguagem simples e a partir do que o Congresso está votando.

> Em construção no [Hack Brasil 2026](https://hackbrasil.com), de 4 a 30 de novembro de 2026. A demo vai ficar em mandatometro.com.br.
>
> Trilha: Acesso à educação.

## O problema

Falta aos eleitores conhecimento sobre o sistema político brasileiro: como nasce uma lei, quem decide o quê e como o Congresso vota. O Mandatômetro é para eleitores, principalmente de 20 a 40 anos.

## O que ele faz

- **Trilhas:** artigos curtos e infográficos que explicam com casos reais como funciona a política, com um quiz no meio e outro no fim. A primeira é a do processo legislativo: como nasce uma lei.
- **Newsletter semanal:** o jornal legislativo chega todo domingo com o que o Congresso votou na semana, explicado em linguagem simples. Quem se inscreve recebe na hora a última edição, e todas ficam no site. A conta administradora revisa e publica cada edição no painel do site, em `/painel`. Em construção: uma segunda seção, com os destaques do Diário Oficial da União ([ADR 0004](docs/adr/0004-newsletter-do-dou.md)).
- **Busca:** o Ctrl+K, ou a barra no alto de qualquer página, procura nas trilhas, nos artigos e nas edições publicadas, sem IA. A busca não liga para acento nem para maiúscula e acha a palavra pelo começo. O que a pessoa digita fica no navegador.

Cada explicação leva a fonte oficial: a lei, o regimento ou a página da Câmara, do Senado ou do TSE. Não precisa de conta: as trilhas são abertas, e a newsletter pede só o e-mail. A conta é opcional e guarda o progresso no perfil, para ele passar de um aparelho para outro.

**Depois do MVP:** a página de cada deputado federal e senador, com o que prometeu na campanha, o que fez no mandato e o patrimônio que declarou ao TSE. Também ficam para depois o "fake ou fato" e o jogo das comissões, em que a pessoa acompanha um projeto real e decide como se fosse parlamentar.

O porquê dessas escolhas está no [ADR 0002](docs/adr/0002-mvp.md) e no [ADR 0003](docs/adr/0003-login-opcional.md).

## Fontes

Só dados públicos, sempre com link para a origem:

- Para a newsletter, os dados abertos da Câmara e do Senado fornecem votações, proposições e parlamentares. A lista de legislação federal do Senado fornece decretos, leis e medidas provisórias publicados no Diário Oficial da União. [Câmara](https://dadosabertos.camara.leg.br/) · [Senado](https://legis.senado.leg.br/dadosabertos/) · [Lista de legislação federal](https://legis.senado.leg.br/dadosabertos/legislacao/lista?tipo=LEI&ano=2026)
- Leis, regimentos e páginas oficiais da Câmara, do Senado e do TSE, para as trilhas
- Depois do MVP: o [Portal de Dados Abertos do TSE](https://dadosabertos.tse.jus.br/) (candidaturas e bens declarados) e os sites de campanha

As APIs oficiais e os arquivos de dados abertos da Câmara, do Senado e do TSE são lidos direto, por HTTP.

## Ferramentas parceiras

| Ferramenta | Uso no Mandatômetro |
|---|---|
| [Resend](https://resend.com/) | Todos os e-mails, incluindo a newsletter de domingo, a última edição para quem se inscreve e os avisos de conta |
| [Firecrawl](https://www.firecrawl.dev/) | Em teste: ler o inteiro teor das proposições votadas e as notícias da Câmara e do Senado, para a edição da semana (#9). Depois do MVP, ler os sites de campanha |
| [Devin](https://devin.ai/) | Conectores de dados e testes, com PRs neste repositório |

## Stack

FastAPI · PostgreSQL com pgvector · TanStack Start (React) · Turborepo · Docker Compose

O porquê de cada escolha está no [ADR 0001](docs/adr/0001-stack.md).

- `packages/ui/` (componentes shadcn/ui) e `packages/config/` (tsconfig base): gerados pelo Better-T-Stack.

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

A API entrega ao site as edições publicadas e registra inscrições, contas, progresso das trilhas e tentativas do piloto. As trilhas vêm de arquivos do site. Na hospedagem, o site e a API ficam na Vercel e o PostgreSQL fica no Neon.

Quando a agenda de domingo está ativa, `edicao enviar` usa o Resend para mandar a edição publicada naquela semana. O Resend também envia a edição mais recente na inscrição, quando disponível, e os avisos de conta. O workflow de avisos retoma pendências com `python -m mandatometro.contas`. O de migrations atualiza o banco com `alembic upgrade head`.

[Horários e ativação das tarefas](docs/hospedagem.md#como-as-tarefas-funcionam) · [Revisão da edição](docs/newsletter.md#revisão-pelo-painel)

## Modelo de dados

O banco guarda os dados da Câmara e do Senado, os atos do Diário Oficial, as edições da newsletter, a medição do piloto e as contas com o progresso das trilhas. Os modelos ficam em `apps/backend/src/mandatometro/db/modelos.py`, e cada mudança vira uma migration do Alembic.

- **Cada Casa tem os seus números:** parlamentar, proposição e votação se identificam pela Casa e pelo id que a Casa dá (`casa`, `id_externo`). Quando a mesma matéria aparece nas duas Casas, cada uma tem o seu registro. A numeração única de 2019 em diante permite relacioná-los por sigla, número e ano.
- **Atos do Diário Oficial** se identificam por `origem` e `id_externo`. A seleção semanal usa a data de publicação.
- **Fonte em tudo:** cada dado coletado e cada item da edição aponta para uma `fonte`, com o endereço e a data da coleta. Sem fonte, o banco não grava.
- **O partido fica no voto,** porque muda dentro do mandato. Os totais das nominais se contam pelos votos. Nas secretas do Senado, a coleta guarda matéria, votação e resultado, sem votos individuais; o banco não guarda os totais nem a modalidade. Ausência de votos no banco não significa zero votos na sessão nem identifica, sozinha, uma votação secreta.
- **Ausência sem motivo:** toda ausência reconhecida do Senado (`AP`, `LS`, `MIS`, `NCom`, `LAP` e `LP`, em `CODIGOS_DE_AUSENCIA`) entra como `nao_votou`, sem o código, para a licença saúde ficar igual às outras. O voto só guarda os códigos de voto e de presença da lista `CODIGOS_GRAVADOS`, e o banco recusa os demais. Um código ainda não classificado, como `NA`, entra como `outro`, sem o código, e o log não leva o código nem a pessoa: a coleta registra só a votação e quantos códigos desconhecidos vieram nela.
- **Quem assina** deixa o e-mail, a data e o código do link de sair; a última edição aceita permite retomar um envio. Sair apaga a linha e esse marcador.
- **Medição do piloto:** cada conclusão guarda apenas código aleatório, versão do quiz, etapa e total de acertos. Não tem ligação com conta ou newsletter; não guarda turma, data nem hora da tentativa.

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
    parlamentar ||--o{ voto : "dá"
    votacao ||--o{ voto : "recebe"
    votacao ||--o{ votacao_proposicao : "afeta"
    proposicao ||--o{ votacao_proposicao : "é afetada"
    edicao ||--o{ item_edicao : "tem"
    edicao |o--o{ inscrito : "última aceita"
    fonte ||--o{ parlamentar : "comprova"
    fonte ||--o{ mandato : "comprova"
    fonte ||--o{ proposicao : "comprova"
    fonte ||--o{ votacao : "comprova"
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
        string sigla "com número e ano, permite relacionar matérias das duas Casas"
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
        string resultado_bruto "código publicado pela Casa"
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
```

## Como rodar

### Cadastro de contas

O workflow **Retomar avisos de conta** processa a fila de produção a cada cinco minutos quando a variável de repositório `AVISOS_CONTA_ATIVOS` vale `true` e os segredos do ambiente `producao` estão configurados.

Aplique as migrations da API até a revisão atual antes de abrir `/cadastro`. Configure `CONTA_TERMO_VERSAO` e `CONTA_TERMO_URL` com a versão e o endereço do termo apresentado ao público. Em desenvolvimento, use uma versão identificada como teste. Para `CONTA_CHAVE`, gere uma chave privada com `uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` em `apps/backend`. Guarde-a nos segredos da API e do processo de entrega. O envio usa `RESEND_FROM`, `RESEND_API_KEY` e `APP_BASE_URL`.

A API tenta entregar os avisos depois do commit. Para processar retentativas independentemente de novas requisições, execute periodicamente (a cada cinco minutos) `uv run python -m mandatometro.contas` em `apps/backend` com o mesmo banco e segredos. O destinatário e o link ficam criptografados na fila até o aceite do provedor ou o fim da validade.

Em `/login`, quem já confirmou o e-mail entra com a senha e segue para `/perfil`. A sessão dura sete dias a partir do login. A API guarda o SHA-256 do segredo aleatório em `credencial_conta`. O navegador recebe o cookie `sessao_conta` com `HttpOnly`, `SameSite=Lax`, caminho `/` e `Secure` em HTTPS. **Sair** encerra a sessão atual. Redefinir a senha encerra todas as sessões da conta.

Ao entrar, os artigos lidos como visitante se juntam aos da conta. Com Web Locks, as abas compartilham a fila de pedidos e importam as marcas de visitante uma vez. Em navegadores sem Web Locks, cada aba tem sua própria fila. O outro aparelho lê o progresso ao abrir o site, ao restaurar uma página pelo histórico, ao navegar para outra página ou ao voltar à aba. Navegação e visibilidade compartilham um intervalo mínimo de 30 segundos entre releituras no mesmo documento. [Progresso das trilhas](docs/codigo-do-site.md#progresso-das-trilhas)

Marcar, desmarcar, recomeçar e desfazer atualizam a tela na hora e gravam na conta em segundo plano. Após falha de rede, prazo esgotado, `429` ou `5xx`, as ações pendentes ficam em memória até uma nova ação ou releitura no mesmo documento. Fechar ou recarregar a página pode perder essas ações. Lotes recusados por `409` ou `422` são descartados e a releitura acerta a tela com o que a conta guardou. **Sair** limpa as marcas deste navegador. Excluir a conta também apaga as marcas em `artigo_lido`, por exclusão em cascata.

`GET /contas/progresso` devolve `{"lidos": [...]}` da sessão atual. `POST /contas/progresso` aceita as listas opcionais `marcar` e `desmarcar` e devolve os ids após a alteração. Cada id segue o formato `trilha/slug` e tem até 128 caracteres. O servidor aceita até 256 ids somados por pedido e até 256 marcas por conta. O POST aceita até 64 KiB de corpo em JSON UTF-8 e responde `413` acima desse tamanho. Nas duas rotas de progresso, cada espera pela trava da conta tem prazo de 3 segundos. Quando vence, a API devolve `503` com `Retry-After: 3`.

Toda conta nasce com o papel `comum`. Quem opera o banco pode [conceder ou revogar o papel de administradora](docs/hospedagem.md#conceder-e-revogar-o-papel-de-administradora) pelo CLI depois da confirmação do e-mail. Com o papel, o `/perfil` mostra o link "Revisar a edição da semana", que leva à revisão em `/painel`. [Revisão pelo painel](docs/newsletter.md#revisão-pelo-painel)

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

**O build do site no PC:** o `pnpm check-types` do site roda um `vite build` antes do `tsc` e regrava o `.output`. O `API_URL` vai na linha dele também, como no `pnpm build` e no `pnpm dev`, senão o build leva o `http://localhost:8000` que o `.env.schema` dá fora da Vercel. Uma cópia do `.output` sobe com a pasta `apps/web` como diretório de trabalho: na partida, o servidor chama o CLI do varlock, que ele procura no `node_modules/.bin` a partir dessa pasta, e lê o `.env.schema` dali. Em 18/11/2026, com a cópia fora do repositório, da raiz ele subiu sem ler o `.env.schema`, com o aviso "No .env files found" do varlock (o CLI também está no `node_modules/.bin` da raiz), e de uma pasta fora do repositório não subiu ("'varlock' não é reconhecido como um comando interno ou externo", no Windows).

**Coleta das duas Casas.** Com as migrations aplicadas e `DATABASE_URL` apontando explicitamente para o banco que deve receber os dados, rode os comandos abaixo em `apps/backend`. As datas incluem o primeiro e o último dia: informe `--inicio` e `--fim` juntos, no formato `AAAA-MM-DD`, ou nenhum dos dois. Sem datas, valem os sete dias completos anteriores, no fuso de Brasília.

Repetir o período atualiza os registros pelas mesmas chaves, inclusive votos corrigidos, sem duplicar parlamentar, mandato, proposição, votação ou voto. Cada rodada cria novas fontes com URL, data da coleta e trecho quando aplicável; as anteriores permanecem, inclusive quando deixam de ser referenciadas.

O resumo final é uma linha JSON com contagens confirmadas, chamadas HTTP (incluindo robots e retries), tentativas extras, duração, falhas e `indisponiveis_na_fonte`. Os códigos de saída são:

- **0:** coleta concluída para os registros disponíveis. Um recurso apontado pela fonte que responda 404/410 entra em `indisponiveis_na_fonte`, sem contar como queda da API. Confira também essa lista: saída 0 não significa que a fonte publicou todos os detalhes;
- **1:** coleta parcial ou interrompida. Uma votação que falha mantém a versão anterior e não impede as seguintes; seus ids aparecem em `falhas_votacoes`. Três votações consecutivas com falha interrompem a execução. Falhas no cadastro entram em `falhas_parlamentares`. As listagens principais são obrigatórias, e uma lista atual inválida não altera quem está em exercício;
- **2:** argumentos inválidos, antes de acessar a rede ou o banco.

As [regras da coleta e da saída dos jobs](docs/dicionario-de-dados.md#regras-que-valem-para-as-duas-apis) valem para os dois conectores.

**Coleta e migrations na hospedagem.** [Ativação, agendamento e recuperação](docs/hospedagem.md#como-as-tarefas-funcionam).

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

**Edição semanal.** A agenda de sábado coleta a legislação e os destaques do Diário Oficial e prepara o rascunho às 04h47 de Brasília quando `AGENDA_SABADO_ATIVA` vale `true`. [Ativação e recuperação](docs/hospedagem.md#ativar-e-recuperar-a-agenda-de-sábado).

`uv run mandatometro edicao rascunho` prepara manualmente as votações e os atos do Diário Oficial coletados. Use `--teto-atos N` para ajustar o limite de atos, que começa em cinco. [Como preparar, revisar e publicar a edição](docs/newsletter.md#newsletter-rascunho-e-revisão).

**Checagens,** as mesmas do CI:

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

**Newsletter.** [Inscrição e saída](docs/newsletter.md#newsletter-inscrição-e-saída) e [envio e leitura pública das edições](docs/newsletter.md#newsletter-envio-e-leitura-pública).

**No ar.** [Configuração do site, da API e das tarefas](docs/hospedagem.md).

**Ícone, prévia do link e mapa.** [Como editar e gerar as imagens](docs/codigo-do-site.md#css-e-imagens).

**Cliente da API.** `pnpm generate:client`. Veja o [contrato da API](AGENTS.md#conventions).

**Migration nova.** Em `apps/backend`, `uv run alembic revision --autogenerate --rev-id 0010 -m "cria a tabela orientacao"` é um exemplo. `uv run alembic check` diz se algum modelo mudou sem migration. Veja as [convenções de migrations](AGENTS.md#conventions).

## Time

- Renan Mocelin
- Pedro Vinicius Meerholz
- Nathan Arrais

## Licença

[MIT](LICENSE)
