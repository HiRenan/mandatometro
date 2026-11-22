# API, banco e coleta no ar

O Renan faz os passos abaixo depois de este PR entrar na `develop`. A API terá um projeto próprio na Vercel; o site continua no projeto atual. Cada ambiente terá seu próprio projeto Neon Free. Nenhuma conta, banco remoto ou publicação é criada pelo código deste PR.

| Ambiente | Site | API | Banco e ambiente no GitHub |
| --- | --- | --- | --- |
| Desenvolvimento (`develop`) | `https://dev.mandatometro.com.br` | `https://api-dev.mandatometro.com.br` | `desenvolvimento`, só dados de teste e da coleta pública |
| Produção (`main`) | `https://mandatometro.com.br` | `https://api.mandatometro.com.br` | `producao`, inscrições reais |

O projeto do site na Vercel monta `apps/web` com o `apps/web/vercel.json` a cada push. As branches da tabela publicam nos endereços indicados, e cada PR ganha uma prévia. O build usa o Node 24, pelo `engines` em `apps/web/package.json`. Um artigo mal formado ou a falta da pasta da trilha da página inicial derruba o deploy com o arquivo e o problema no log. O site no ar continua na versão anterior.

**Região: São Paulo nos três recursos.** A configuração da API fixa `gru1`; ao criar cada banco, escolha **AWS South America (São Paulo), `aws-sa-east-1`**. O Hobby permite uma região, e o Neon oferece PostgreSQL nessa região. A região do banco é escolhida na criação. [Vercel: regiões](https://vercel.com/docs/regions), [limite do Hobby](https://vercel.com/docs/functions/configuring-functions/region#limits), [Neon: regiões](https://neon.com/docs/introduction/regions).

Copie as URLs do banco e as chaves somente entre os campos de segredo dos painéis. Elas não vão para o projeto do site, conversas, issues ou PRs.

## 1. Desenvolvimento — 10 passos, cerca de 30–45 minutos

O tempo é uma estimativa; confirmação de conta, DNS e filas de publicação podem levar mais.

Para publicar uma branch pelo painel, use **Deployments → Deployments actions → Create Deployment**, informe `develop` ou `main` e confirme a branch se a Vercel pedir. [Publicação a partir de uma branch](https://vercel.com/docs/git#creating-a-deployment-from-a-git-reference).

1. **Vercel → Add New → Project → Import**, no repositório `HiRenan/mandatometro`. A Vercel detecta as duas aplicações e oferece o preset **Services**. Clique **Import backend as a project** e **Import single project**. Dê ao projeto o nome `mandatometro-api` e confirme **Root Directory** `apps/backend` e **Framework Preset** **FastAPI**. Clique **Deploy** e informe o código de verificação de identidade recebido por e-mail. A primeira tentativa é marcada como Production; ainda não coloque dados de produção nela. Ela pode falhar: o banco ainda não foi configurado e a `main` ainda precisa receber os arquivos deste PR. [Importação de monorepo](https://vercel.com/docs/monorepos), [regra da primeira publicação](https://vercel.com/docs/deployments/environments#first-deployment).

2. Em **Projeto da API → Settings → Environments → Production → Branch Tracking**, confira a seleção inicial `main`. A `develop` fica em Preview. A `main` precisa receber este trabalho antes da etapa de produção.

3. Em **Vercel → Marketplace → Neon → Install**, crie o recurso `mandatometro-desenvolvimento` no plano **Free**. Troque a região padrão, **Washington**, por **São Paulo**. Desligue **Auth**, que vem ligado, e deixe desligado o serviço opcional de tempo real. **Confira:** Free e a região escolhida; em **Open in Neon**, anote a versão do PostgreSQL exibida. O ambiente local e o CI usam 17; a versão entregue pela integração será conferida também ao aplicar as migrations. [Telas da integração](https://neon.com/docs/guides/vercel-managed-integration).

4. Em **Storage → mandatometro-desenvolvimento → Connect Project**, escolha `mandatometro-api` e ajuste a seleção inicial **Production, Preview** para apenas **Preview**. Deixe desmarcada a criação automática de um banco por publicação; não use prefixo nas variáveis. Clique **Connect**. **Confira:** `DATABASE_URL` e `DATABASE_URL_UNPOOLED` aparecem para Preview na API; o projeto do site não está conectado.

5. Em **API → Settings → Environment Variables → Add**, cadastre `APP_BASE_URL=https://dev.mandatometro.com.br` e `API_URL=https://api-dev.mandatometro.com.br` como **Config**. Em **Environments**, selecione **Preview Branches** e `develop`. Não cadastre chave do Resend neste ambiente. **Confira:** os dois endereços usam HTTPS, sem barra no fim, e não atingem Production.

6. Em **GitHub → repositório → Settings → Environments**, abra `desenvolvimento`, que já existe por causa dos workflows. Em **Deployment branches and tags**, escolha as branches selecionadas e acrescente somente `develop`. Em **Environment secrets → Add environment secret**, cadastre `DATABASE_URL` (URL com pool) e `DATABASE_URL_UNPOOLED` (URL direta) do banco de desenvolvimento. Copie os valores da integração; o endereço com pool tem `-pooler` no servidor. **Confira:** os dois segredos estão neste ambiente, não em um segredo geral do repositório. Não adicione aprovador obrigatório para cada execução.

7. **GitHub → Actions → Migrar banco → Run workflow:** escolha **Branch: develop** e clique **Run workflow**. Este primeiro disparo é necessário porque criar o banco depois do merge não dispara um novo push. Depois, mudanças em `apps/backend/migrations/**` aplicam as migrations automaticamente. **Confira:** o passo **Aplicar as migrations** foi executado e terminou com “Migration concluída até head”; só uma execução verde, com esse passo pulado, não prova que as tabelas existem. [Disparo manual](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

8. **GitHub → Actions → Coletar Congresso → Run workflow:** escolha **develop** e deixe as duas datas vazias. **Confira:** os jobs da Câmara e do Senado terminaram; cada um mostra o commit usado e uma linha JSON com `completa: true`. Leia também `indisponiveis_na_fonte`: itens sem detalhe na fonte podem existir mesmo com saída 0. Repetir a mesma janela atualiza os registros; acrescentar novas fontes é esperado.

9. Em **API → Settings → Domains → Add**, adicione `api-dev.mandatometro.com.br`. Selecione **Preview**, informe `develop` quando o painel pedir a branch e salve. No painel do seu provedor DNS, crie o CNAME `api-dev` com o destino que a Vercel mostrar; acrescente TXT somente se ela pedir. Depois, **Settings → Deployment Protection → Deployment Protection Exceptions → Add**, e adicione só `api-dev.mandatometro.com.br`, como foi feito com o endereço do site do time. Em **Deployments actions → Create Deployment**, selecione `develop` para uma publicação nova com as variáveis. **Confira:** HTTPS válido e `/health` respondendo `{"status":"ok"}` sem login da Vercel. Na publicação, confira Python 3.13, função em `gru1` e pacote abaixo de 500 MB. [Domínios](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [exceção no Hobby](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/deployment-protection-exceptions).

10. Em **Projeto do site → Settings → Environment Variables → Add**, cadastre `API_URL=https://api-dev.mandatometro.com.br` como **Config**. Em **Environments**, selecione **Preview Branches** e `develop`. Faça uma nova publicação da `develop` em **Deployments actions → Create Deployment**. **Confira:** a folha da newsletter aparece em `dev.mandatometro.com.br`; inscreva `piloto@example.com`. Sem edição publicada, a resposta é `aguardando_edicao`; com edição e sem Resend, pode ser `envio_indisponivel`, com a inscrição gravada. Repita depois de mais de cinco minutos sem uso para conferir a resposta fria dentro dos 20 segundos que o site espera. Uma prévia comum de PR continua sem a folha. `/health` sozinho não testa o banco.

## 2. Produção — 7 passos, cerca de 20–35 minutos

Comece depois de conferir a inscrição de teste no ambiente anterior. A publicação da `develop` na `main` é uma decisão do Renan com a Atena.

1. **Vercel → Storage / Marketplace:** repita a criação do banco com o nome `mandatometro-producao`, **Free**, **São Paulo**. Em **Connect Project**, escolha `mandatometro-api` e ajuste a seleção inicial **Production, Preview** para apenas **Production**, sem bancos automáticos por publicação. **Confira:** é outro projeto Neon, com outras credenciais; não é uma cópia do banco de desenvolvimento.

2. **GitHub → Settings → Environments → New environment:** crie `producao`. Permita **main e develop** em **Deployment branches and tags**: a agenda nasce na `develop`, mesmo quando o código executado vem da `main`. Cadastre os dois secrets `DATABASE_URL` e `DATABASE_URL_UNPOOLED` do banco de produção. **Confira:** são os valores desse segundo banco; não adicione aprovação humana obrigatória, que pararia a coleta diária.

3. **API → Settings → Environment Variables → Add:** em **Production**, cadastre `APP_BASE_URL=https://mandatometro.com.br` e `API_URL=https://api.mandatometro.com.br` como **Config**. Para envio real, o Renan cadastra `RESEND_API_KEY` como segredo e `RESEND_FROM` como **Config**, com o remetente verificado. **Settings → Domains → Add:** adicione `api.mandatometro.com.br` a **Production** e crie o CNAME `api` no provedor DNS, usando o valor mostrado pela Vercel. **Confira:** HTTPS válido; banco e Resend não aparecem nas variáveis do site.

   `PILOTO_ATIVO` fica desligado por padrão; o Renan define `true` como **Config** nas variáveis da **API** e faz nova publicação quando aprovar as decisões da [medição do piloto](medicao-do-piloto.md), com a migration aplicada e a tela integrada.

4. **GitHub → PR da develop para main:** Renan e Atena publicam a versão aprovada. **Não pule este passo:** em 16/11/2026, a `main` em `2b1bcea` ainda não tinha os conectores. A mudança de migrations no push aciona **Migrar banco** para produção. Se não houve mudança nesses arquivos, ou se a execução anterior pulou por falta do segredo, use **Actions → Migrar banco → Run workflow → main** uma vez. **Confira:** migration aplicada e publicação da API pronta. Mantenha a folha de produção oculta até concluir; publicação e migration são processos separados.

5. **GitHub → Actions → Coletar Congresso → Run workflow → main:** deixe as datas vazias para carregar os sete dias completos anteriores. **Confira:** resumo das duas Casas, commit publicado na `main` e ausência de falhas. Não copie a edição de prova do banco local. A edição real precisa do preparo e da revisão da #22; só a coleta não a publica.

6. **Projeto do site → Settings → Environment Variables → Add:** cadastre `API_URL=https://api.mandatometro.com.br` como **Config**, somente em **Production**. Faça uma publicação nova da `main`. **Confira:** folha visível no domínio público, inscrição gravada e saída funcionando pelo clique de confirmação. O Renan usa um endereço que controla para testar envio real, sem registrá-lo no relato. `aguardando_edicao` é esperado até existir uma edição revisada e publicada.

7. **GitHub → Settings → Secrets and variables → Actions → Variables → New repository variable:** crie `COLETAS_ATIVAS` com valor **true**. Só faça isso depois da primeira carga de produção bem-sucedida. **Confira no próximo dia:** **Coletar Congresso** executou as duas Casas, mostrou os commits da `main` e terminou sem falhas. Para pausar a agenda, mude o valor para `false`; o disparo manual continua disponível. A #23 permanece aberta até a ativação completa, inclusive o envio dominical da #39.

## Como as tarefas funcionam

| Tarefa | Quando | Código e banco |
| --- | --- | --- |
| Coleta diária | 03h17 de Brasília (`17 6 * * *` UTC), se `COLETAS_ATIVAS=true` | YAML da `develop`, checkout da `main`, banco `producao` |
| Coleta manual | Botão Run workflow | `develop` → `desenvolvimento`; `main` → `producao` |
| Agenda de sábado | 04h47 de Brasília (`47 7 * * 6` UTC), se `AGENDA_SABADO_ATIVA=true` | YAML da `develop`, checkout da `main`, banco `producao` |
| Preparo manual da edição | Botão Run workflow, com período opcional | Commit do disparo (`github.sha`). `develop` usa `desenvolvimento` e `main` usa `producao` |
| Envio dominical | 10h37 de Brasília (`37 13 * * 0` UTC), se `ENVIOS_ATIVOS=true` | YAML da `develop`, checkout da `main`, banco `producao` |
| Envio/ensaio manual | Botão Run workflow, com ID opcional, limite e simulação | `develop` → `desenvolvimento`; `main` → `producao` |
| Migration automática (`alembic upgrade head`) | Push em `develop` ou `main` que muda `apps/backend/migrations/**` | Commit do push, banco da mesma branch, URL direta |
| Migration de reserva | Botão Run workflow | Commit e banco da branch escolhida |

Sem o secret da URL direta, a migration no push mostra um aviso e pula antes de instalar dependências. Um disparo manual sem segredo falha, para não parecer que criou tabelas. A coleta diária fica pulada enquanto a variável não for `true`; depois de ligada, uma configuração ausente ou coleta parcial falha. Não há credenciais de produção nos testes de PR.

As duas Casas rodam uma por vez, com até 30 minutos cada, e a segunda é tentada mesmo se a primeira falhar. Coleta, agenda de sábado, migration e envio compartilham a fila `banco-producao` ou `banco-desenvolvimento`. `cancel-in-progress: false` deixa terminar quem já começou, e `queue: max` preserva até 100 execuções pendentes. A ordem pelo horário do push pode variar. Falha ou cancelamento pede conferir o último sucesso e, se necessário, disparar a migration de reserva. O cron pode atrasar ou ser descartado. Em repositório público, fica inativo após 60 dias sem atividade. [Concorrência](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency), [agendamento](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Para recuperar uma lacuna maior, preencha **inicio e fim juntos**, em `AAAA-MM-DD`, no disparo manual da coleta. Sem datas, valem os sete dias completos anteriores em Brasília. O deploy da Vercel não espera o Actions. Na hospedagem, siga as [convenções de migrations](../AGENTS.md#conventions). Não há migration na importação, no build ou na requisição da API.

## Preencher temas de votações já coletadas

Depois de confirmar a migration 0014 no ambiente, abra **Actions → Coletar Congresso → Run workflow**. Para produção, escolha **main**, marque **somente_temas** e informe a janela das votações já gravadas. Divida um histórico maior em janelas. Em cada Casa, acompanhe `temas` no resumo. Se `falhas_consulta` ou `falhas_gravacao` forem maiores que zero, repita a janela para as proposições pendentes. As datas vazias usam os sete dias completos anteriores em Brasília.

O modo usa as mesmas credenciais e a mesma fila da coleta e fica desmarcado por padrão. A agenda roda a coleta normal. O preenchimento grava temas e fontes temáticas à parte, o que preserva as revisões dos rascunhos. [Comando local](../README.md#como-rodar)

## Ativar e recuperar a agenda de sábado

**Preparar edição de sábado** coleta a legislação federal pelo Senado, coleta os destaques do Diário Oficial pelo Firecrawl e prepara o rascunho, nessa ordem e no mesmo banco. A rodada tem até 60 minutos. O horário de **04h47 de Brasília** reserva uma hora para a coleta das duas Casas, que começa às 03h17, mais 30 minutos de folga. Se a coleta diária ainda ocupar a fila, a agenda espera a sua vez.

Os três comandos usam os sete dias completos anteriores ao sábado, inclusive quando a fila atrasa a agenda até domingo. Em **21/11/2026**, o recorte vai de **14 a 20/11**, inclusive. A edição revisada deve ser publicada antes do envio de **22/11 às 10h37**. Nesse domingo o envio procura publicações desde **16/11 à meia-noite**, no fuso de Brasília, usando a data de publicação da edição.

Mantenha `AGENDA_SABADO_ATIVA` ausente ou com valor `false` durante os ensaios manuais. O YAML fica na `develop`, a branch padrão. O cron executa o código da `main` no ambiente `producao`. Cada disparo manual executa o commit da branch escolhida. [Agendamento](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

1. **Teste na develop.** Depois que o workflow estiver na `develop`, confirme as migrations no banco de desenvolvimento. Em **GitHub → Settings → Environments → desenvolvimento**, confira `DATABASE_URL` com pool e cadastre `FIRECRAWL_API_KEY` em **Environment secrets**. Em **Actions → Preparar edição de sábado → Run workflow**, escolha **develop**. Confira o commit da `develop` e os resumos da rodada no ambiente `desenvolvimento`. [Disparo manual](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
2. **Publique na main.** Depois do teste na `develop`, publique a versão com o workflow, `scripts/tarefas.py agenda` e os conectores na `main`.
3. **Teste na main.** Confirme as migrations no banco de produção. Em **Settings → Environments → producao**, configure `DATABASE_URL` com pool e `FIRECRAWL_API_KEY` em **Environment secrets**. Em **Run workflow**, escolha **main** e confira o commit da `main` e os resumos no ambiente `producao`.
4. **Ligue a agenda.** Depois de conferir o preparo em produção, em **Settings → Secrets and variables → Actions → Variables**, defina a variável de repositório **`AGENDA_SABADO_ATIVA`** com o valor **`true`** em minúsculas. Confira a próxima rodada agendada. Para pausar, mude o valor para `false`. `COLETAS_ATIVAS` e `ENVIOS_ATIVOS` controlam suas próprias agendas.

Para usar o redator, cadastre `LLM_API_KEY` em **Environment secrets** e `LLM_PROVIDER` e `LLM_MODEL` em **Environment variables**, no ambiente que vai rodar o preparo. Sem `LLM_API_KEY`, a ordem dos atos segue pela regra e os textos pendentes vão para a revisão humana.

No disparo manual, preencha **inicio** e **fim** juntos, em `AAAA-MM-DD`, ou deixe ambos vazios para os sete dias completos anteriores à execução em Brasília. Para recuperar a rodada de 21/11 em outro dia, informe `2026-11-14` e `2026-11-20`.

Confira o commit no passo **Registrar o código executado** e os três resumos JSON em **Coletar o Diário Oficial e preparar o rascunho**. Cada linha traz `etapa` e `codigo`. Nas coletas, confira `completa`, o período, as gravações e os descartes. No rascunho, confira `situacao`, `edicao_id` e a seleção em `atos`. Com itens e sem provedor, `atos.origem_ordem: regra` e `atos.codigo_fallback: sem_provedor` são esperados.

**Recuperação da rodada.** Se o cron faltar ou falhar, use **Run workflow** com as duas datas da rodada que quer recuperar. A agenda tenta o rascunho mesmo após uma falha de coleta e fica vermelha se qualquer etapa retornar erro. As gravações já confirmadas ficam no banco. Se aparecer apenas `falhas_gerais`, confirme o commit executado e a configuração do ambiente selecionado.

- **Banco ou período.** Se aparecer um `erro` antes das etapas, confira `DATABASE_URL` no ambiente escolhido e preencha as duas datas na ordem correta.
- **Legislação.** Se `completa` vier como `false`, leia `erro` e `descartes`. Confira a disponibilidade dos dados abertos do Senado ou as migrations e a conexão do banco, conforme a mensagem, e repita o período.
- **Destaques.** Se o resumo informar chave ausente ou recusada, confira `FIRECRAWL_API_KEY`. Para falha do Firecrawl, confira o serviço e a cota da conta. Se o banco não responder antes da coleta, confira a conexão. Nesse caso, `chamadas` é zero. Para falha de gravação, confira também as migrations. Se o limite de páginas deixar a coleta incompleta, leve a lacuna à revisão ao conferir a cobertura. [Referência da coleta](dicionario-de-dados.md#destaques-da-imprensa-nacional).
- **Rascunho.** Confira a conexão e as migrations em falhas do banco. Se a configuração do redator estiver incompleta, ajuste-a ou use a ordem por regra sem a chave. Se sair `sem_votacoes_no_banco` ou `sem_itens_elegiveis`, confira o período e os descartes. Essas situações terminam com código 0 e sem um novo ID.

Com **refazer** desmarcado, `rascunho_existente` devolve o mesmo `edicao_id` e preserva a revisão gravada. Uma edição publicada retorna `ja_publicada` com o mesmo ID e permanece intacta.

### Recuperar a coleta dos destaques

1. Corrija a causa indicada no resumo da etapa `destaques`.
2. Em **Actions → Preparar edição de sábado → Run workflow**, escolha a branch que usou o banco da rodada original (**main** para recuperar o cron). Preencha **inicio** e **fim** com as mesmas datas e marque **refazer**. A opção vem desmarcada. Refazer descarta a revisão já salva daquele rascunho.
3. Confira se `legislacao` e `destaques` terminaram com `codigo` igual a `0`. Se uma coleta falhar de novo, a rodada fica vermelha e o resumo do rascunho registra `"refazer_ignorado": "coleta_incompleta"`. Corrija a falha e repita com as mesmas datas.
4. Se a agenda retornar `rascunho_refeito` ou `rascunho_criado`, use o `edicao_id` para exportar um novo arquivo, revisar e publicar antes do envio de domingo. [Como preparar a edição](newsletter.md#como-preparar-a-edição).

## Abrir o cadastro de contas

O cadastro fica fechado enquanto a API não tem `CONTA_CHAVE`, `CONTA_TERMO_VERSAO` e `CONTA_TERMO_URL`: o `GET /contas/termo` responde `503`, e o `/cadastro` mostra "O cadastro está indisponível no momento.". Ele também fica fechado quando a versão da API não é a da página do termo, a `VERSAO_DO_TERMO` do `apps/web/src/lib/termo.ts` (hoje `2026-11-20`). Faça os passos primeiro no desenvolvimento e depois na produção, quando a `main` já tiver a página `/termo`.

| Na API | Desenvolvimento | Produção |
| --- | --- | --- |
| Ambiente na Vercel | Preview, branch `develop` | Production |
| `CONTA_TERMO_URL` | `https://dev.mandatometro.com.br/termo` | `https://mandatometro.com.br/termo` |
| `CONTA_TERMO_VERSAO` | a `VERSAO_DO_TERMO` da `develop` | a `VERSAO_DO_TERMO` da `main` |
| `CONTA_CHAVE` | uma chave só deste ambiente | outra chave, só da produção |

1. **O contato do termo.** Mande um e-mail de teste para `contato@mandatometro.com.br` e confira se ele chega. O termo dá esse endereço a quem quer ver, corrigir ou apagar os próprios dados: abra o cadastro só com ele recebendo.
2. **As migrations.** Em **GitHub → Actions → Migrar banco**, confira que a última execução na branch do ambiente aplicou até a `0011`. As contas vêm da `0008`, o papel, da `0010`, e o progresso, da `0011`. **Confira:** o passo **Aplicar as migrations** terminou com "Migration concluída até head".
3. **A chave.** Num terminal local, em `apps/backend`, gere a chave com `uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. Em **API → Settings → Environment Variables → Add**, cadastre-a como segredo, com o nome `CONTA_CHAVE`, no ambiente da tabela. Na produção, cadastre a mesma chave também em **GitHub → Settings → Environments → producao → Environment secrets**, para o workflow **Retomar avisos de conta**: com outra chave, ele não abre os avisos que a API deixou na fila. **Confira:** a chave não está no projeto do site, em conversas, issues ou PRs.
4. **O termo.** No mesmo lugar, cadastre `CONTA_TERMO_URL` e `CONTA_TERMO_VERSAO` como **Config**, com os valores da tabela. Copie a versão do `apps/web/src/lib/termo.ts` da branch publicada no ambiente. **Confira:** o `APP_BASE_URL` da API é o endereço do site do ambiente, sem barra no fim. A API monta os links dos e-mails com ele, e entrar, sair e excluir a conta só funcionam a partir desse endereço.
5. **Os e-mails.** A API manda pelo Resend o link que confirma o cadastro, o de troca de senha e o comprovante da exclusão. Na produção, `RESEND_API_KEY` (segredo) e `RESEND_FROM` (**Config**) já entram na API no passo 3 da produção e no GitHub no envio de domingo: confira se estão nos dois. No desenvolvimento, o passo 5 deixa a API sem a chave do Resend. Assim, o cadastro abre, mas o e-mail de confirmação não sai, e a conta nova não chega a entrar. Sem uma conta confirmada, esse ambiente também fica sem administradora para o painel. Pôr a chave do Resend na API do desenvolvimento liga também o e-mail de inscrição da newsletter dele: a decisão é do Renan.
6. **A fila dos avisos, só na produção.** Em **Settings → Secrets and variables → Actions → Variables**, crie `AVISOS_CONTA_ATIVOS` com o valor `true`. O GitHub Actions roda o workflow **Retomar avisos de conta**, agendado de cinco em cinco minutos. Ele lê os avisos cifrados do banco, decifra o endereço e a mensagem e os encaminha ao Resend. Usa os segredos `DATABASE_URL`, `CONTA_CHAVE` e `RESEND_API_KEY` e a variável `RESEND_FROM` do ambiente `producao`. Confira se a próxima execução agendada termina verde.
7. **Publique a API.** Em **API → Deployments actions → Create Deployment**, publique a branch do ambiente (`develop` ou `main`): as variáveis novas só valem numa publicação nova. **Confira:** `GET /contas/termo`, na API do ambiente, devolve a versão e o endereço da tabela, como `{"versao":"2026-11-20","url":"https://mandatometro.com.br/termo"}`.
8. **O cadastro.** Abra `/cadastro` no site do ambiente. **Confira:** a caixa diz "Tenho 12 anos ou mais e li e aceito o termo de consentimento.", o link abre o termo em outra aba, e o botão **Criar conta** fica ligado. Se aparecer "O cadastro está indisponível no momento.", compare a versão do `GET /contas/termo` com a data que a página `/termo` mostra.
9. **Uma conta de teste, só na produção.** Com um endereço que o Renan controla, crie uma conta, confirme pelo e-mail, entre e veja o nome em `/perfil`. Depois, exclua a conta em **Meu perfil → Excluir conta** e confira o comprovante. O endereço não vai para relatos, issues ou PRs.

O endereço e a mensagem do comprovante de exclusão ficam cifrados na fila. Quando o Resend aceita o envio, o processamento apaga o aviso. Depois das 24 horas de validade, **Retomar avisos de conta** apaga o aviso vencido na rodada seguinte, se ela o alcançar. A agenda do GitHub pode atrasar. Cada rodada trata até 20 avisos pela ordem do horário da próxima tentativa. Sem o workflow, a fila roda na próxima vez que a API concluir um cadastro, reenvio, pedido de recuperação ou exclusão, ou em uma execução manual de `uv run python -m mandatometro.contas` em `apps/backend` com a configuração do ambiente. O endereço vencido sai na primeira rodada que processar esse aviso.

## Quando o texto do termo mudar

1. **Prepare o PR.** No mesmo PR, mude o texto em `apps/web/src/components/pagina-do-termo.tsx` e a `VERSAO_DO_TERMO` em `apps/web/src/lib/termo.ts`, com a data do texto novo em `AAAA-MM-DD`. Se o tempo de leitura mudar, o teste do componente mostra o número novo para `MINUTOS_DE_LEITURA`. Confira cada frase nova contra o código e as regras de dados pessoais. Deixe o merge para o passo 3. [Inscrição e conta](dados-pessoais.md#inscrição-e-conta)
2. **Publique a API primeiro.** Troque `CONTA_TERMO_VERSAO` pela data nova na API do ambiente, publique a API e confira se `GET /contas/termo` devolve a versão nova no domínio do ambiente. Enquanto o site ainda mostra o termo antigo, quem abre `/cadastro` vê "O cadastro está indisponível no momento." e o formulário fica fechado. Se uma aba que já estava aberta tentar enviar a versão antiga, o `POST /contas` devolve `409` com "Leia a versão atual do termo.". A tela mostra "O termo mudou. Recarregue a página para ler a versão atual.".
3. **Publique o site.** Com a API já respondendo pela versão nova, faça o merge que publica o site do ambiente, na `develop` para desenvolvimento ou na `main` para produção. Confira a versão nova na faixa e na parte 9 de `/termo`, igual à do `GET /contas/termo`. Em `/cadastro`, o link do termo e o botão **Criar conta** voltam a funcionar.
4. **As contas que já existem** continuam com a versão que aceitaram, guardada no banco. O site não avisa essas pessoas. Quando a mudança toca a finalidade dos dados, a forma e a duração do uso, quem responde por eles ou com quem são compartilhados, a LGPD pede que elas sejam avisadas, com destaque para o que mudou (art. 8º, § 6º, e art. 9º, § 2º). Esse aviso ainda não existe no código: como fazê-lo é uma decisão do Renan.

## Conceder e revogar o papel de administradora

1. Confira se o workflow **Migrar banco** aplicou a revisão `0010` no ambiente escolhido e se a API desse ambiente já lê o papel. A pessoa que vai receber o papel cria a conta e confirma o e-mail nesse ambiente.
2. Em um terminal local privado, entre em `apps/backend` de uma cópia do código com o comando `conta` e rode `uv sync --frozen`. Use a URL autorizada com permissão de escrita e confira o servidor e o banco. No Bash, leia os valores no terminal e passe `DATABASE_URL` na linha do comando:

   ```bash
   IFS= read -rs -p 'URL do banco: ' url_banco
   printf '\n'
   IFS= read -rs -p 'E-mail da conta confirmada: ' email_conta
   printf '\n'
   DATABASE_URL="$url_banco" uv run mandatometro conta promover --email="$email_conta"
   ```

3. A mensagem `Conta promovida a administradora.` com saída `0` confirma a gravação. Para retirar o papel, use `DATABASE_URL="$url_banco" uv run mandatometro conta revogar --email="$email_conta"`. Ao acabar, limpe os valores com `unset url_banco email_conta`.

Execute as duas operações somente à mão. Os registros do GitHub Actions são públicos. O e-mail e a URL ficam no terminal privado. A mudança de papel vale na requisição seguinte, inclusive para sessões já abertas. Se a última administradora excluir a própria conta, o ambiente fica sem administradoras até que uma conta confirmada seja promovida pelo CLI.

## Ativar e recuperar o envio de domingo

1. Depois da migration `0007` e da publicação da API nova, confira `GET /edicoes` e `GET /edicoes/{id}` com uma edição revisada. Não use a edição local de prova em produção. O envio antigo da inscrição não grava o marcador: ative a agenda somente depois de toda a API usar a versão nova. Se já houve envios reais antes da migration, concilie-os antes de iniciar a primeira rodada; marcador nulo não prova ausência de envio anterior.
2. No **GitHub → Settings → Environments → producao**, mantenha o secret `DATABASE_URL` com pool e cadastre `RESEND_API_KEY` em **Environment secrets**. Em **Environment variables**, cadastre `RESEND_FROM` (nome visível “Mandatômetro” e endereço do domínio verificado), `APP_BASE_URL=https://mandatometro.com.br` e `API_URL=https://api.mandatometro.com.br`. São as mesmas configurações usadas na API, mas precisam existir também no GitHub. Não coloque chave no ambiente de desenvolvimento nem no site.
3. Em **Actions → Enviar edição → Run workflow → main**, informe o ID publicado e mantenha **simular** marcado. Confira id e contagens. Ensaio não chama o provedor nem grava o marcador; ele não comprova saldo na conta. O ensaio em `develop` usa somente o banco de desenvolvimento.
4. Renan confere domínio, remetente, saldo e funcionamento dos links com um endereço sob seu controle, sem incluí-lo em relatos. O assunto é o título publicado e o corpo é o mesmo da inscrição; o cabeçalho RFC 8058 usa o POST da API. Aceitação pelo provedor não comprova entrega.
5. Em **Settings → Secrets and variables → Actions → Variables**, crie **`ENVIOS_ATIVOS=true`** somente quando quiser ativar os envios de domingo. Ela é independente de `COLETAS_ATIVAS`. Ausente, vazia ou diferente de `true`, deixa a agenda de envio desligada; o botão manual continua disponível. Para pausar, mude só essa variável para `false`.

O cron considera apenas edições publicadas desde a segunda-feira corrente, à meia-noite de Brasília; sem uma nova, termina com zero envios. Publicação depois do horário ou cron perdido exige **Run workflow**. No envio real manual, desmarque **simular**; ID vazio usa a última publicada. Informe sempre o mesmo ID para retomar uma rodada parcial. `--limite`/campo **limite** limita a rodada, sem reservar saldo para inscrições futuras.

No Free, os 100 envios diários e 3.000 mensais são compartilhados com as inscrições e outros envios da conta. Com 30 inscritos e nenhum consumo anterior, cabem os 30; com 150, cabem até 100 e os restantes exigem outra rodada. As inscrições concorrentes podem diminuir esse saldo. A cota diária reinicia à meia-noite UTC (21h de Brasília); retome depois dessa virada, por exemplo no dia seguinte. Cota mensal esgotada requer aguardar o novo período ou uma decisão sobre o plano. Garantir todos no domingo acima de 100 por dia exige decisão do Renan sobre o plano. O código não faz upgrade nem retoma sozinho. [Preços](https://resend.com/pricing), [janelas e erros de quota](https://resend.com/docs/api-reference/rate-limit).

O [guia da newsletter](newsletter.md#newsletter-envio-e-leitura-pública) explica o estado de envio, as falhas, o resumo e o risco de duplicação na retomada. Mantenha logs do provedor fora do repositório.

Não há webhook de entrega nem recuperação automática de bounces. Devoluções, caixa cheia e reclamações posteriores à aceitação são acompanhadas por Renan no Resend, com a supressão automática do provedor. Em uma reversão de versão, desligue `ENVIOS_ATIVOS` antes; não remova a coluna enquanto existir código que a leia.

## Configuração e limites

O `apps/backend/vercel.json` fixa o preset **FastAPI**, a região e 30 segundos por chamada. O preset usa o runtime Python, `app.py` exporta a aplicação e `.python-version` fixa o Python 3.13. [FastAPI](https://vercel.com/docs/frameworks/backend/fastapi), [runtime Python](https://vercel.com/docs/functions/runtimes/python).

O `package.json` inclui o backend no workspace do pnpm. Na primeira publicação, a detecção do monorepo escolheu a instalação pelo pnpm e executou `turbo run build` com escopo `backend`. O `turbo.json` do backend herda as tarefas da raiz e ajusta `test`. Como os scripts do `package.json` não incluem `build`, o Turbo terminou com zero tarefas. O deploy ficou **Ready**, embora `app.py` falhasse ao importar `mandatometro` de `src/`. [Monorepos na Vercel](https://vercel.com/docs/monorepos), [Turborepo na Vercel](https://vercel.com/docs/monorepos/turborepo).

O `installCommand` em `apps/backend/vercel.json` manda rodar `uv sync --active --locked --no-dev --no-editable` no ambiente virtual que a Vercel prepara para a função. O uv usa `pyproject.toml` e `uv.lock` para instalar as dependências de produção e o próprio pacote com `uv_build`. A instalação sem modo editável coloca `mandatometro` no ambiente que entra no bundle da função. Confira a execução do comando nos registros do build e a importação com `GET /health` na prévia. [Comando de instalação](https://vercel.com/docs/project-configuration/vercel-json#installcommand), [uv na Vercel](https://vercel.com/i/uv-python-package-manager), [empacotamento com uv](https://docs.astral.sh/uv/concepts/projects/config/#build-systems).

Com `VERCEL=1`, o backend exige `DATABASE_URL`, usa a URL com pool do Neon e `NullPool` no SQLAlchemy, sem reter conexão ociosa na função. Fora da Vercel, continua o pool local. A conexão tem limite de 5 segundos; a preparação automática de consultas fica desligada. A cota de inscrição continua em transação própria no PostgreSQL, compartilhada entre instâncias. Coletas usam a URL com pool; migrations usam a direta. [Pool do Neon](https://neon.com/docs/connect/connection-pooling), [SQLAlchemy](https://docs.sqlalchemy.org/en/21/core/pooling.html).

O `.env.schema` do site mantém `API_URL` vazio por padrão na Vercel. Só os valores cadastrados nos passos acima, em Production e no Preview da `develop`, ativam a folha e a leitura das edições num **novo build**. As prévias dos PRs ficam sem newsletter. O `APP_BASE_URL` do site vem do ambiente da Vercel, com o domínio na `main` e o endereço da branch nas prévias. Fora da `main`, as páginas pedem que buscadores não indexem (`X-Robots-Tag: noindex`).

O `vite.config.ts` usa `ssrInjectMode: "resolved-env"` para gravar as variáveis do site em texto puro na função. A função não tem o CLI do varlock nem o `.env.schema`. Por isso, o `buildCommand` no `apps/web/vercel.json` é `NODE_ENV=production pnpm run build`. Segredos do banco e do Resend ficam fora do projeto do site. Uma variável sensível no site pede antes o `@encryptInjectedEnv` do varlock. [Variáveis por branch](https://vercel.com/docs/deployments/environments), [varlock](https://varlock.dev/integrations/vite/#ssr-code-injection).

Fora da Vercel, como no Docker, defina o `APP_BASE_URL` com o endereço do site antes do build: a prévia do link no WhatsApp e nas redes (`og:image`) leva o endereço completo da imagem, com ele na frente. Sem ele, vale o `http://localhost:3001`.

| Serviço gratuito | Limites a acompanhar em Usage | Ao atingir a cota |
| --- | --- | --- |
| Vercel Hobby | Python: 500 MB; função até 300 s (a nossa pede 30 s). Site e API compartilham 4 h de CPU ativa, 360 GB-h e 1 milhão de invocações/mês | Pode suspender os deployments; não há upgrade autorizado |
| Cada projeto Neon Free | 1 GB, 100 CU-h/mês, 5 GB de saída/mês; pausa após 5 min sem uso | Compute/transferência esgotados suspendem conexões; armazenamento cheio impede operações que aumentam o espaço |
| GitHub Actions | Runner Ubuntu padrão gratuito neste repositório público; limite geral de 6 h por job | Os tetos são de 30 min para coleta diária e envio, 60 min para a agenda de sábado e 10 min para migration |

O Neon estima despertar em centenas de milissegundos, sem garantia da resposta completa ao navegador. Não mantenha um ping para impedir a pausa. A medição local de 09–15/11 deu 824 KiB nas tabelas da coleta e cerca de 100 MiB/ano pela extrapolação com recoletas; aquela semana não tinha votos individuais da Câmara. Confira o uso real antes de ampliar a carga. [Hobby](https://vercel.com/docs/plans/hobby), [excedentes da Vercel](https://vercel.com/docs/functions/usage-and-pricing), [Neon Free](https://neon.com/docs/introduction/plans), [pausa](https://neon.com/docs/introduction/scale-to-zero), [Actions: cobrança](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [limites](https://docs.github.com/en/actions/reference/limits).

## O que a hospedagem registra

A documentação da Vercel informa que os Runtime Logs incluem o caminho concreto do pedido (`requestPath`), método, horário, status, parâmetros de consulta e mensagens da função. A rota da API `/newsletter/saida/{codigo_saida}` põe o código no caminho; o link do site `/newsletter/sair?codigo=...` o põe na consulta. A retenção documentada para consulta desses logs no **Hobby é de uma hora**; esse prazo não é uma garantia sobre toda retenção interna do provedor. Desligar o access log do Uvicorn não controla esse registro da plataforma. [Runtime Logs: campos e retenção](https://vercel.com/docs/logs/runtime).

As regras dos logs da aplicação e o contrato de saída estão em [Newsletter: inscrição e saída](newsletter.md#newsletter-inscrição-e-saída).

Fontes oficiais consultadas em **16/11/2026**. Publicação real, DNS, banco remoto, logs da conta e execução da agenda precisam ser conferidos pelo Renan; os testes locais não os substituem.
