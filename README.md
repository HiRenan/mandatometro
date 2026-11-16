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

Cada explicação leva a fonte oficial: a lei, o regimento ou a página da Câmara, do Senado ou do TSE. Não precisa de conta: as trilhas são abertas, e a newsletter pede só o e-mail. A conta é opcional e guarda o progresso no perfil, para ele passar de um aparelho para outro.

**Depois do MVP:** a página de cada deputado federal e senador, com o que prometeu na campanha, o que fez no mandato e o patrimônio que declarou ao TSE. Também ficam para depois o "fake ou fato" e o jogo das comissões, em que a pessoa acompanha um projeto real e decide como se fosse parlamentar.

O porquê dessas escolhas está no [ADR 0002](docs/adr/0002-mvp.md) e no [ADR 0003](docs/adr/0003-login-opcional.md).

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

O banco guarda o que a coleta lê da Câmara e do Senado, o que a newsletter usa e a medição do piloto. Os modelos ficam em `apps/backend/src/mandatometro/db/modelos.py`, e cada mudança vira uma migration do Alembic.

- **Cada Casa tem os seus números:** parlamentar, proposição e votação se identificam pela Casa e pelo id que a Casa dá (`casa`, `id_externo`). A mesma matéria tem uma linha em cada Casa, ligadas por sigla, número e ano.
- **Fonte em tudo:** cada dado coletado e cada item da edição aponta para uma `fonte`, com o endereço e a data da coleta. Sem fonte, o banco não grava.
- **O partido fica no voto,** porque muda dentro do mandato. Os totais das nominais se contam pelos votos. Nas secretas do Senado, a coleta guarda matéria, votação e resultado, sem votos individuais; o banco não guarda os totais nem a modalidade. Ausência de votos no banco não significa zero votos na sessão nem identifica, sozinha, uma votação secreta.
- **Ausência sem motivo:** toda ausência reconhecida do Senado (`AP`, `LS`, `MIS`, `NCom`, `LAP` e `LP`, em `CODIGOS_DE_AUSENCIA`) entra como `nao_votou`, sem o código, para a licença saúde ficar igual às outras. O voto só guarda os códigos de voto e de presença da lista `CODIGOS_GRAVADOS`, e o banco recusa os demais. Um código ainda não classificado, como `NA`, entra como `outro`, sem o código, e o log não leva o código nem a pessoa: a coleta registra só a votação e quantos códigos desconhecidos vieram nela.
- **Quem assina** deixa o e-mail, a data e o código do link de sair; a última edição aceita permite retomar um envio. Sair apaga a linha e esse marcador.
- **Medição do piloto:** cada conclusão guarda apenas código aleatório, versão do quiz, etapa e total de acertos. Não tem ligação com conta ou newsletter; não guarda turma, data nem hora da tentativa.

```mermaid
erDiagram
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

**Coleta das duas Casas.** Com as migrations aplicadas e `DATABASE_URL` apontando explicitamente para o banco que deve receber os dados, rode os comandos abaixo em `apps/backend`. As datas incluem o primeiro e o último dia: informe `--inicio` e `--fim` juntos, no formato `AAAA-MM-DD`, ou nenhum dos dois. Sem datas, valem os sete dias completos anteriores, no fuso de Brasília.

Repetir o período atualiza os registros pelas mesmas chaves, inclusive votos corrigidos, sem duplicar parlamentar, mandato, proposição, votação ou voto. Cada rodada cria novas fontes com URL, data da coleta e trecho quando aplicável; as anteriores permanecem, inclusive quando deixam de ser referenciadas.

O resumo final é uma linha JSON com contagens confirmadas, chamadas HTTP (incluindo robots e retries), tentativas extras, duração, falhas e `indisponiveis_na_fonte`. Os códigos de saída são:

- **0:** coleta concluída para os registros disponíveis. Um recurso apontado pela fonte que responda 404/410 entra em `indisponiveis_na_fonte`, sem contar como queda da API. Confira também essa lista: saída 0 não significa que a fonte publicou todos os detalhes;
- **1:** coleta parcial ou interrompida. Uma votação que falha mantém a versão anterior e não impede as seguintes; seus ids aparecem em `falhas_votacoes`. Três votações consecutivas com falha interrompem a execução. Falhas no cadastro entram em `falhas_parlamentares`. As listagens principais são obrigatórias, e uma lista atual inválida não altera quem está em exercício;
- **2:** argumentos inválidos, antes de acessar a rede ou o banco.

A coleta é sequencial, usa timeout, backoff e o User-Agent do projeto, e consulta o `robots.txt`. Os testes usam respostas gravadas e o banco de teste, sem rede; a coleta real exige executar o comando. Ela roda em lote, fora das requisições do site.

**Coleta e migrations na hospedagem.** O [passo a passo de ativação](docs/hospedagem.md) começa pelo desenvolvimento e depois passa à produção. O workflow **Coletar Congresso** roda às 03h17 de Brasília com o código da `main`, só depois de criar a variável de repositório `COLETAS_ATIVAS=true`. O botão **Run workflow** permite a primeira carga e a recuperação por datas: `develop` usa o banco de desenvolvimento, `main` usa o de produção. Cada Casa é tentada mesmo se a outra falhar.

**Migrar banco** aplica `alembic upgrade head` automaticamente no push que muda `apps/backend/migrations/**`, no banco correspondente à branch. Sem o secret `DATABASE_URL_UNPOOLED`, o push avisa e pula; um disparo manual sem segredo falha. O botão **Run workflow** serve para a primeira carga num banco recém-criado e para recuperação. As duas tarefas compartilham uma fila por banco. A migration fica fora da função e do build; mudanças de esquema precisam ser compatíveis com o código antigo e o novo, pois o deploy não espera o Actions.

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

O comando divide períodos maiores em janelas de até 365 dias e coleta as votações nominais e secretas publicadas em `/votacao`, só das sessões do Senado, os votos individuais disponíveis e os senadores em exercício. As simbólicas e as sessões conjuntas do Congresso ficam de fora. Votações secretas ficam sem votos individuais; o modelo não guarda seus totais nem permite identificar com segurança a modalidade apenas pela ausência de votos.

Se o histórico de um votante fora da lista atual falhar, seus votos ficam gravados, o mandato não é inventado e `falhas_parlamentares` conta o parlamentar uma vez. Recurso indisponível entra no resumo pelo caminho com seu id (por exemplo, `/processo/9006525`): sem o processo, a votação é pulada; sem o histórico, os votos são preservados.

**Edição semanal.** O comando usa só as votações já coletadas. Não coleta, não envia e-mail e não publica ao gerar. Sem datas, usa os sete dias completos anteriores, como a coleta. O provedor ainda não tem adaptador: todos os itens começam com redação manual pendente. As variáveis `LLM_PROVIDER`, `LLM_MODEL` e `LLM_API_KEY` estão preparadas para essa integração futura; preenchê-las ainda não liga um provedor.

**Preparação do ambiente.** Peça ao time a URL autorizada do banco com as migrations aplicadas e a coleta da semana, junto com os resumos das duas Casas. Confira servidor, porta e nome do banco antes de usar. Abra um terminal PowerShell na raiz do repositório pelo Orca, entre na pasta abaixo e substitua o valor de exemplo pela URL recebida. A variável vale nesse terminal; configure-a novamente se abrir outro.

```powershell
Set-Location .\apps\backend
uv sync --frozen
$env:DATABASE_URL = 'COLE_A_URL_AUTORIZADA_PELO_TIME'
```

Prepare uma pasta **fora do repositório**, por exemplo `$HOME\Documents\mandatometro-revisoes`. No PowerShell, `$HOME` é sua pasta de usuário; crie a pasta de revisões pelo explorador de arquivos se ela ainda não existir. O JSON contém descrições e trechos oficiais para consulta: ele e a prévia ficam fora de commits e logs. Os comandos seguintes usam essa pasta e são executados no mesmo terminal, em `apps/backend`.

**Rotina de toda semana.** Uma pessoa opera por vez.

1. Gere o rascunho com as datas da semana e leia o resumo, inclusive as exclusões. Anote o `edicao_id` retornado: nos comandos seguintes, substitua `1` por ele.

   ```powershell
   uv run mandatometro edicao rascunho --inicio 2026-11-09 --fim 2026-11-15 --teto 8
   ```

2. Exporte para a pasta externa preparada acima. Escolha um nome novo por edição ou rodada de revisão; a exportação recusa sobrescrever arquivos.

   ```powershell
   uv run mandatometro edicao exportar 1 --arquivo "$HOME\Documents\mandatometro-revisoes\edicao-2026-11-15.json"
   ```

3. Abra o JSON no editor e salve em UTF-8. Confira os fatos e as fontes de cada item, substitua a redação pendente e confirme a revisão e o artigo escolhido. Se um item falar da licença, do afastamento ou da saúde de um parlamentar, exclua-o com `excluir: true` e preencha `motivo_exclusao`. O aviso em `contexto.avisos` indica esses termos no texto oficial: confira se tratam de uma pessoa ou de política pública antes de confirmar o item. A `explicacao` é uma lista de parágrafos. Confirme a cobertura uma única vez, depois de ler os resumos das duas coletas e conhecer suas lacunas: o banco não certifica a cobertura de todo o Congresso.

   Este é um **recorte fictício dos campos editáveis**; mantenha os demais campos exportados, sem substituir o arquivo inteiro pelo exemplo:

   ```json
   {
     "titulo": "Jornal legislativo da semana",
     "cobertura_confirmada": true,
     "itens": [
       {
         "titulo": "Uma proposta para o serviço público",
         "explicacao": [
           "A proposta organiza um serviço público fictício.",
           "A explicação deste exemplo é inventada para mostrar o formato da revisão."
         ],
         "artigo_caminho": "/trilhas/processo-legislativo/o-plenario-vota-o-projeto",
         "revisado": true,
         "artigo_confirmado": true
       }
     ]
   }
   ```

4. Importe a revisão. O comando valida o arquivo e salva as confirmações. Se houver erro, corrija o campo indicado e repita; o rascunho anterior fica preservado. Se a revisão já foi salva, exporte um arquivo novo antes de fazer outros ajustes.

   ```powershell
   uv run mandatometro edicao revisar 1 --arquivo "$HOME\Documents\mandatometro-revisoes\edicao-2026-11-15.json"
   ```

5. Leia a prévia completa, com fatos, fontes e link da trilha, no formato de texto do e-mail. Não redirecione essa saída para o log do job. A prévia admite `APP_BASE_URL` local; envio real exige HTTPS.

   ```powershell
   uv run mandatometro edicao mostrar 1
   ```

6. Com a revisão concluída e nenhuma pendência, publique. O comando lê a revisão salva no banco, sem receber arquivo. A publicação é definitiva e não envia o e-mail.

   ```powershell
   uv run mandatometro edicao publicar 1
   ```

A seleção agrupa votações pelas proposições ligadas na fonte, unindo os grupos que se conectam, dentro da mesma Casa. Primeiro vêm os grupos com placar registrado; depois, os demais. Em cada parte, a ordem é data mais recente, Casa e menor id externo da proposição principal. O teto padrão é oito grupos, ajustável por `--teto N`. O resumo lista ids e quantidades de votações sem proposição, sem página pública e cortadas pelo teto. Não se deduz o vínculo pelo prefixo do id da votação.

Licença, afastamento ou saúde, incluindo as flexões de internar, hospitalizar, adoecer, adoentar e convalescer, além de atendimento médico, excluem o ato quando ligados a parlamentar na mesma frase, com até seis palavras entre termo e sinal. Os adjetivos `interna` e `internas` ficam fora dos termos; `interna-se` continua reconhecido. Quebra de linha vale como espaço; ponto só encerra a frase após palavra de cinco letras ou mais, enquanto `!` e `?` sempre encerram. Requerimento sem essa ligação só sai por licença ou afastamento e sem outra proposição numerada, citada por sigla ou por extenso, inclusive no plural e com o nome da Casa. Artigo de regimento ou lei não é proposição citada; saúde sozinha não basta. O nome da Casa não conta como ligação. Por privacidade, saem também a regra geral de licença das próprias parlamentares e a emenda sobre licenciamento ambiental com nome de parlamentar próximo do termo. Essas exclusões mostram **só a quantidade**, sem ids.

Se o item continua elegível e qualquer descrição ou ementa ligada tem termo dessa família, ele recebe redação pendente com motivo `termo_pessoal`, sem chamada ao redator. A ordem e o teto continuam iguais. O resumo conta esses itens em `itens_com_termo_pessoal`; o arquivo exportado e o `revisar` avisam item por item para conferir se há assunto pessoal e, se houver, usar `excluir: true`. A publicação exige a confirmação de cada item, inclusive os avisados.

O item aponta para a fonte da votação mais recente do grupo (desempate pelo id externo numérico); sem página pública nessa fonte, usa a ficha de uma proposição ligada àquela votação. Sem nenhuma dessas páginas, a votação sai. Todas as referências usadas ficam preservadas, com data da coleta e trecho quando disponível. O placar conta Sim, Não, Abstenções e Obstruções por votação, com Presidência à parte; ausência e valores não classificados ficam de fora. Sem placar gravado, o texto informa a indisponibilidade, sem concluir que foi votação secreta ou simbólica nem mostrar zero. O resultado `outro` informa que o resultado não está classificado. Aprovação de requerimento, recurso ou destaque não significa aprovação da proposta.

No arquivo, edite o título da edição, os títulos e a lista `explicacao` de cada item. Pode reordenar a lista de itens; para retirar um, marque `excluir: true` e escreva `motivo_exclusao`, mantendo ao menos um item. Não remova linhas nem altere ids, datas, `fatos`, `fontes`, `contexto` ou o catálogo. Números inseridos pela pessoa precisam aparecer nos fatos ou textos oficiais daquele item; a verificação não substitui a leitura do significado de cada número.

Escolha `artigo_caminho` entre os seis artigos do catálogo e marque `artigo_confirmado: true`, ou use `null` quando nenhum se aplicar. A sugestão depende da forma do ato: recurso contra decisão conclusiva aponta para comissões, e grupo só de PL/PLP aponta para Plenário; os demais ficam sem sugestão. Os artigos sobre revisão pela outra Casa e sanção ou veto também podem ser escolhidos na revisão. Um arquivo com catálogo antigo precisa ser exportado novamente. O `revisar` aplica o mesmo filtro de assunto pessoal ao título e aos parágrafos humanos, sem usar as siglas da fonte, e avisa apenas o número do item se o texto puder identificar parlamentar ou partido. Tirar só o marcador de redação não basta para confirmar a revisão.

Repetir o rascunho no mesmo período retorna a edição existente sem sobrescrever ajustes. `--refazer` recompõe **só um rascunho**, descarta a revisão anterior e invalida os arquivos exportados; use-o também se a coleta mudou os dados usados. Depois de salvar uma revisão, exporte outro arquivo para fazer novos ajustes. Edição publicada permanece intocada, inclusive ao repetir geração ou publicação. Mais de uma edição no período é erro a resolver. O fluxo prevê uma pessoa operando por vez, sem travas para execuções simultâneas.

Sem votação no banco, retorna `sem_votacoes_no_banco`; se todas saírem da seleção, `sem_itens_elegiveis`. Não cria uma edição vazia nem afirma que o Congresso não votou. Saídas: **0** para operação concluída, inclusive redação pendente, repetição sem efeito e período sem itens; **1** para falha operacional ou revisão/publicação recusada; **2** para argumentos inválidos. Exceto a prévia e os erros de sintaxe do comando, a saída é JSON com ids, contagens e mensagens sem conteúdo de fonte ou exceção bruta. Erros de sintaxe, como `publicar --arquivo`, imprimem o texto de uso e o erro em stderr, com saída **2**, sem JSON.

O contrato para os consumidores da edição é `item_edicao.texto` como explicação em texto puro, `artigo_caminho` opcional e `fatos` JSONB versionado, também opcional para itens antigos. A versão 1 guarda ids de proposições/votações/fontes, data, resultado, placar agregado, origem (`codigo`, `modelo` ou `revisao`) e pendências. A confirmação única da cobertura é persistida pela presença ou ausência da pendência `cobertura` nos itens. Os fatos publicados não são recalculados após uma coleta. Para a #39, reutilize `formatar_edicao`/`montar_email` e carregue as fontes pelos ids de `fatos.fontes`, além da fonte principal; renderizar apenas `texto` perderia os blocos factuais. Itens antigos, sem os novos campos, mantêm a apresentação anterior.

Os testes são offline, com redator falso e dados inventados: com `TEST_DATABASE_URL` explícito, rode `uv run pytest`. Não é necessário chave ou SDK de LLM.

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

**Medição do piloto.** `POST /piloto/tentativas` recebe apenas código aleatório, versão, etapa e total de acertos. `PILOTO_ATIVO` começa desligado (HTTP 410); o Renan o liga após decidir a ligação entre etapas, os menores e a guarda, com a tela integrada. A cota própria é de 120 pedidos por minuto, ajustável por `PILOTO_LIMITE_POR_MINUTO`.

Em `apps/backend`, com as migrations aplicadas e `DATABASE_URL` explícito para o banco escolhido, o time lê o resultado agregado e, depois de encerrar a coleta em todas as instâncias, apaga a medição:

```text
uv run mandatometro piloto resultado --versao processo-legislativo-final-v1
uv run mandatometro piloto apagar --versao processo-legislativo-final-v1 --confirmar
```

O relatório suprime médias de grupos pequenos e não imprime identificadores. A exclusão recusa `PILOTO_ATIVO=true`; não há data de fechamento automático. O [contrato e o roteiro de encerramento](docs/medicao-do-piloto.md) explicam as respostas HTTP, os reenvios, o computador compartilhado e as limitações da medição.

**Newsletter.** Depois das migrations, envie `POST /newsletter/inscricoes` com JSON contendo só `email`. A API libera o CORS só para `APP_BASE_URL`, conforme o [ADR 0001](docs/adr/0001-stack.md). Aceita GET e POST com `Content-Type` e expõe `Retry-After` ao navegador. No site, quem chama a rota é a folha da newsletter, no fim da página inicial, pelo cliente gerado (`apps/web/src/lib/newsletter.ts`). A folha só aparece quando o build do site tem o `API_URL`. Uma inscrição nova ou repetida recebe as mesmas respostas, sem revelar se o endereço já estava na lista:

| HTTP | Corpo | Significado |
| --- | --- | --- |
| 200 | `{"situacao":"edicao_enviada"}` | Inscrição gravada. O Resend aceitou o envio da última edição publicada, sem confirmar a entrega na caixa postal. |
| 200 | `{"situacao":"aguardando_edicao"}` | Inscrição gravada, sem edição publicada para enviar. |
| 200 | `{"situacao":"envio_indisponivel"}` | Inscrição gravada, mas o envio não foi confirmado. A pessoa pode tentar novamente. |
| 422 | `{"erro":"dados_invalidos"}` | Corpo ou e-mail inválido. A resposta não repete os dados recebidos. |
| 429 | `{"erro":"limite_de_inscricoes"}` | Cota global esgotada. `Retry-After` informa quantos segundos esperar. |
| 503 | `{"erro":"servico_indisponivel"}` | Gravação não confirmada no banco. |

O limite padrão é **30 tentativas por minuto fixo**. Para mudá-lo, defina `NEWSLETTER_LIMITE_POR_MINUTO`. A contagem fica no PostgreSQL, sem IP nem e-mail. Inclui tentativas repetidas, inválidas e cujo envio falhou. A saída fica fora dessa cota. As chamadas seguintes limpam as janelas antigas.

Para enviar de verdade, configure `RESEND_API_KEY`, `RESEND_FROM` e os endereços públicos **HTTPS** `APP_BASE_URL` (site) e `API_URL` (API). O remetente de exemplo só envia para o dono da conta. Troque-o por um endereço do domínio verificado `mandatometro.com.br`. Prepare uma edição `publicada`, com seus itens e fontes oficiais. Sem chave ou com configuração de envio inválida, a inscrição continua gravada e a API responde `envio_indisponivel`. Sem edição, responde `aguardando_edicao`.

O envio faz até três tentativas dentro de **8 segundos no total**, com tempo limite e espera entre elas. Inscrição e comando usam a mesma chave por par de inscrito/edição, sem e-mail nela, e gravam em `inscrito.ultima_edicao_enviada_id` a última edição aceita. Esse marcador só avança pela ordem de publicação: uma reinscrição não manda novamente a edição já aceita, mesmo depois de 24 horas. A [idempotência do Resend dura 24 horas](https://resend.com/docs/dashboard/emails/idempotency-keys): se o processo cair entre o aceite e o commit e só retomar depois desse prazo, pode haver duplicação; este é o limite aceito para o piloto. Não há histórico de entrega por pessoa nem recuperação automática de bounces.

**Envio da edição publicada.** Em `apps/backend`, com `DATABASE_URL` autorizado e migrations aplicadas, confira primeiro sem enviar nem gravar:

```powershell
uv run mandatometro edicao enviar --simular
uv run mandatometro edicao enviar 1 --simular
```

Para o envio real, depois de configurar o Resend e os dois endereços HTTPS, use `uv run mandatometro edicao enviar 1`; sem o número, ele fixa a última publicada. `--limite 30` tenta até 30 destinatários; `--publicada-desde 2026-11-16` só aceita edição publicada desde meia-noite dessa data em Brasília. Uma edição anterior não é reenviada a quem já recebeu uma mais recente. O conteúdo, o assunto e os links são iguais aos da inscrição.

O JSON mostra `edicao_id`, `aceitos_nesta_execucao`, `ja_atualizados` no início e `faltam` ao final, além das contagens de falhas, sem identificar pessoas. A rodada fixa o maior id de inscrição inicial: quem entra depois recebe pela inscrição e, se ela falhar, entra numa próxima rodada. Quem sai antes da verificação do destinatário é pulado; uma mensagem já aceita ou em voo pode chegar. Banco indisponível na contagem final omite `faltam` e sinaliza `contagem_indisponivel`, sem inventar um total.

As saídas são **0** para conclusão, nada a enviar ou simulação válida; **1** para parcial, edição indisponível, cota ou falha operacional; **2** para argumentos/configuração inválidos. O envio é sequencial, com intervalo mínimo de um segundo entre destinatários. Recusa individual e 409 concorrente não param os outros; chave/domínio inválido ou cota esgotada param a rodada. Recusas não são gravadas: uma retomada tenta de novo, e o Resend aplica sua lista de supressão. Aceitação não confirma entrega na caixa postal.

A [cota Free](https://resend.com/pricing) é de **100 e-mails/dia e 3.000/mês**, compartilhada com as inscrições e outros envios da conta. Com 30 inscritos e nenhum consumo anterior, cabem os 30; com 150, cabem até 100 e os restantes exigem outra rodada. As inscrições concorrentes podem diminuir esse saldo. A [cota diária reinicia à meia-noite UTC](https://resend.com/docs/api-reference/rate-limit), às 21h de Brasília; repetir o mesmo ID depois da renovação envia somente os pendentes. A cota mensal não se resolve no dia seguinte. Garantir todos no domingo acima de 100/dia exige decisão do Renan sobre o plano.

No Actions, **Enviar edição** roda domingo às 10h37 de Brasília, somente com `ENVIOS_ATIVOS=true`, usando `main` e produção. `COLETAS_ATIVAS` continua controlando só a coleta. Sem edição publicada desde a segunda-feira corrente, não envia a edição anterior. **Run workflow** permite escolher ID/limite e começa com a simulação marcada; desmarque-a somente para enviar. O manual também recupera uma publicação atrasada ou uma rodada parcial. Configuração e ativação estão em [docs/hospedagem.md](docs/hospedagem.md).

**Leitura pública das edições.** `GET /edicoes?limite=20&deslocamento=0` retorna `{edicoes, total, limite, deslocamento}` (limite de 1 a 100), da publicação mais recente para a mais antiga, com desempate por id decrescente. Cada resumo traz `id`, `titulo`, `inicio`, `fim` e `publicada_em`. `GET /edicoes/{id}` acrescenta os itens na ordem editorial, com `ordem`, `titulo`, `texto` puro, `fatos`, `fontes` e `artigo`.

Nos fatos públicos, cada votação traz data, resultado, placar ou nulo e suas fontes, sem ids internos. Cada fonte traz `url`, `coletado_em` e `trecho` ou nulo; o artigo traz `titulo` e `caminho` do catálogo ou é nulo. Placar nulo significa indisponível, não zero nem modalidade; presidência fica separada. O legado continua com fatos/artigo nulos. Rascunho e inexistente respondem o mesmo 404; dados inválidos, 422; banco ou fotografia inválida, 503, sem conteúdo parcial. A API não devolve a origem do texto, pendências de revisão nem estado de envio, e não recalcula a edição com dados novos.

`POST /newsletter/saida/{codigo_saida}` apaga a inscrição e responde 200 vazio, inclusive para código desconhecido ou já removido. Não lê nem exige corpo. O programa de e-mail usa essa rota com os cabeçalhos da RFC 8058. GET e HEAD só redirecionam para `/newsletter/sair?codigo=...` no site. Essa página só manda o POST no clique em "Confirmar a saída", para os leitores automáticos de links não cancelarem a inscrição. Ela não tem loader e fica fora dos buscadores, do Referer e do cache.

**Para ver a tela no computador,** com o banco e as migrations, `pnpm dev` sobe a API na 8000 e o site na 3001, com o `API_URL` em `http://localhost:8000`. A folha da newsletter fica no fim da página inicial. Sem a chave do Resend, a inscrição responde `aguardando_edicao`, e, com uma edição `publicada` no banco, `envio_indisponivel`. Para abrir a página de sair, use o link da API, `http://localhost:8000/newsletter/saida/<codigo>`, com o `codigo_saida` de um inscrito fictício. O navegador vai para `/newsletter/sair?codigo=<codigo>`, e o botão apaga a inscrição.

Os testes da newsletter usam o banco de teste e chamadas HTTP simuladas, sem chave nem e-mail real. Em `apps/backend`, com `TEST_DATABASE_URL` explícito, rode `uv run pytest tests/test_inscricao.py tests/test_limite_inscricao.py tests/test_email.py tests/test_resend.py`.

Na produção, desligue o access log do Uvicorn com `--no-access-log`, como faz o Dockerfile. Esse log incluiria IP e código de saída. Não registre corpo, cabeçalhos ou URLs de saída nos logs da hospedagem. O log do `pnpm dev` fica ligado: use só dados fictícios. Os logs da aplicação não guardam e-mail nem código de saída. Os erros da newsletter não repetem dados recebidos.

**No ar,** o site fica na Vercel, que monta a pasta `apps/web` a cada push, com a configuração de `apps/web/vercel.json`:

- a `main` vai para https://mandatometro.com.br; a `develop`, para o endereço do time; e cada PR ganha uma prévia;
- o build roda no Node 24, pelo `engines` de `apps/web/package.json`;
- o endereço do site (`APP_BASE_URL`) sai do ambiente da Vercel, com o domínio na `main` e o endereço da branch nas prévias, e as páginas fora da `main` pedem aos buscadores para não indexar (`X-Robots-Tag: noindex`);
- o `API_URL` fica vazio por padrão. Depois de validar a API, cadastre-o no painel em Production e no Preview só da `develop`, seguindo [docs/hospedagem.md](docs/hospedagem.md), e faça novo build. PRs continuam sem newsletter;
- um artigo mal formado ou a falta da pasta da trilha da página inicial derruba o deploy, com o arquivo e o problema no log, e o site no ar continua na versão anterior.

Fora da Vercel, como no Docker, defina o `APP_BASE_URL` com o endereço do site antes do build: a prévia do link no WhatsApp e nas redes (`og:image`) leva o endereço completo da imagem, com ele na frente. Sem ele, vale o `http://localhost:3001`.

**A API tem seu próprio projeto Vercel**, com raiz em `apps/backend`, preset FastAPI e região São Paulo. `app.py` exporta a aplicação existente; o `vercel.json` limita a chamada a 30 segundos. Na Vercel, `DATABASE_URL` é obrigatório e aponta para o pool do Neon; o SQLAlchemy usa `NullPool`, sem manter conexões ociosas na função. Fora dela, continua o pool local. Não conecte o banco ao projeto do site: a configuração resolvida do site é gravada em texto puro na função. O [guia de hospedagem](docs/hospedagem.md) cobre os dois bancos, os dois ambientes do GitHub, DNS, checagens e limites gratuitos.

**Mudou o ícone ou a prévia do link?** Eles saem de `apps/web/imagens/icone.html` e `previa.html`. Rode `pnpm --filter web imagens`: o Edge ou o Chrome abre sem janela e grava o `favicon.ico`, o `apple-touch-icon.png` e o `previa.png` em `apps/web/public/` (`NAVEGADOR=<caminho>` escolhe outro navegador). Faça commit do HTML e das imagens. O mapa do fundo do site sai do `apps/web/imagens/mapa.mjs`: mude o roteiro e rode `pnpm --filter web mapa`, que grava o `apps/web/src/estilos/mapa.svg`.

**Mudou a API?** `pnpm generate:client` grava o `openapi.json` e gera de novo o cliente TypeScript. Faça commit dos dois.

**Migration nova,** em `apps/backend`, com o próximo número: `uv run alembic revision --autogenerate --rev-id 0008 -m "cria a tabela orientacao"`. O autogenerate não vê mudança de CHECK nem de valor padrão: um valor novo num conjunto, como o do voto, pede essa parte da migration escrita à mão, e o teste de migrations acusa o que faltar. `uv run alembic check` diz se algum modelo mudou sem migration. Mudou uma tabela? Atualize o diagrama em "Modelo de dados": um teste confere.

## Time

- Renan Mocelin
- Pedro Vinicius Meerholz
- Nathan Arrais

## Licença

[MIT](LICENSE)
