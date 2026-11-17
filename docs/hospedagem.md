# API, banco e coleta no ar

O Renan faz os passos abaixo depois de este PR entrar na `develop`. A API terá um projeto próprio na Vercel; o site continua no projeto atual. Cada ambiente terá seu próprio projeto Neon Free. Nenhuma conta, banco remoto ou publicação é criada pelo código deste PR.

| Ambiente | Site | API | Banco e ambiente no GitHub |
| --- | --- | --- | --- |
| Desenvolvimento (`develop`) | `https://dev.mandatometro.com.br` | `https://api-dev.mandatometro.com.br` | `desenvolvimento`, só dados de teste e da coleta pública |
| Produção (`main`) | `https://mandatometro.com.br` | `https://api.mandatometro.com.br` | `producao`, inscrições reais |

**Região: São Paulo nos três recursos.** A configuração da API fixa `gru1`; ao criar cada banco, escolha **AWS South America (São Paulo), `aws-sa-east-1`**. O Hobby permite uma região, e o Neon oferece PostgreSQL nessa região. A região do banco é escolhida na criação. [Vercel: regiões](https://vercel.com/docs/regions), [limite do Hobby](https://vercel.com/docs/functions/configuring-functions/region#limits), [Neon: regiões](https://neon.com/docs/introduction/regions).

Copie as URLs do banco e as chaves somente entre os campos de segredo dos painéis. Elas não vão para o projeto do site, conversas, issues ou PRs.

## 1. Desenvolvimento — 10 passos, cerca de 30–45 minutos

O tempo é uma estimativa; confirmação de conta, DNS e filas de publicação podem levar mais.

Para publicar uma branch pelo painel, use **Deployments → Create Deployment** (pode estar no menu de três pontos), informe `develop` ou `main` e confirme a branch se a Vercel pedir. [Publicação a partir de uma branch](https://vercel.com/docs/git#creating-a-deployment-from-a-git-reference).

1. **Vercel → Add New → Project → Import**, no repositório `HiRenan/mandatometro`. Nome: `mandatometro-api`. Em **Root Directory → Edit**, escolha `apps/backend`. Confira **Framework Preset: FastAPI**, sem comando de build do site, e clique **Deploy**. A primeira tentativa é marcada como Production; ainda não coloque dados de produção nela. Ela pode falhar: o banco ainda não foi configurado e a `main` ainda precisa receber os arquivos deste PR. **Confira:** o painel mostra a raiz do backend e FastAPI. [Importação de monorepo](https://vercel.com/docs/monorepos), [regra da primeira publicação](https://vercel.com/docs/deployments/environments#first-deployment).

2. **Projeto da API → Settings → Environments → Production → Branch Tracking:** defina `main` e salve. A `develop` fica em Preview. **Confira:** Production acompanha `main`, mesmo que a primeira tentativa tenha vindo da `develop`. A `main` precisa receber este trabalho antes da etapa de produção.

3. **Vercel → Marketplace → Neon → Install:** crie o recurso `mandatometro-desenvolvimento`, plano **Free**, região **São Paulo**. Deixe desligados os serviços opcionais de autenticação e tempo real. **Confira:** Free e a região escolhida; em **Open in Neon**, anote a versão do PostgreSQL exibida. O ambiente local e o CI usam 17; a versão entregue pela integração será conferida também ao aplicar as migrations. [Telas da integração](https://neon.com/docs/guides/vercel-managed-integration).

4. **Storage → mandatometro-desenvolvimento → Connect Project:** escolha somente `mandatometro-api` e o ambiente **Preview**. Deixe desmarcada a criação automática de um banco por publicação; não use prefixo nas variáveis. Clique **Connect**. **Confira:** `DATABASE_URL` e `DATABASE_URL_UNPOOLED` aparecem para Preview na API; o projeto do site não está conectado.

5. **API → Settings → Environment Variables → Add:** cadastre `APP_BASE_URL=https://dev.mandatometro.com.br` e `API_URL=https://api-dev.mandatometro.com.br`, ambos em **Preview**, filtrados para a branch **develop**. Não cadastre chave do Resend neste ambiente. **Confira:** os dois endereços usam HTTPS, sem barra no fim, e não atingem Production.

6. **GitHub → repositório → Settings → Environments → New environment:** crie `desenvolvimento`. Em **Deployment branches and tags**, escolha as branches selecionadas e acrescente somente `develop`. Em **Environment secrets → Add environment secret**, cadastre `DATABASE_URL` (URL com pool) e `DATABASE_URL_UNPOOLED` (URL direta) do banco de desenvolvimento. Copie os valores da integração; o endereço com pool tem `-pooler` no servidor. **Confira:** os dois segredos estão neste ambiente, não em um segredo geral do repositório. Não adicione aprovador obrigatório para cada execução.

7. **GitHub → Actions → Migrar banco → Run workflow:** escolha **Branch: develop** e clique **Run workflow**. Este primeiro disparo é necessário porque criar o banco depois do merge não dispara um novo push. Depois, mudanças em `apps/backend/migrations/**` aplicam as migrations automaticamente. **Confira:** o passo **Aplicar as migrations** foi executado e terminou com “Migration concluída até head”; só uma execução verde, com esse passo pulado, não prova que as tabelas existem. [Disparo manual](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

8. **GitHub → Actions → Coletar Congresso → Run workflow:** escolha **develop** e deixe as duas datas vazias. **Confira:** os jobs da Câmara e do Senado terminaram; cada um mostra o commit usado e uma linha JSON com `completa: true`. Leia também `indisponiveis_na_fonte`: itens sem detalhe na fonte podem existir mesmo com saída 0. Repetir a mesma janela atualiza os registros; acrescentar novas fontes é esperado.

9. **API → Settings → Domains → Add:** adicione `api-dev.mandatometro.com.br`, ligue a **Preview / develop** e salve. No painel do seu provedor DNS, crie o CNAME `api-dev` com o destino que a Vercel mostrar; acrescente TXT somente se ela pedir. Depois, **Settings → Deployment Protection → Deployment Protection Exceptions → Add**, e adicione só `api-dev.mandatometro.com.br`, como foi feito com o endereço do site do time. Em **Deployments → Create Deployment**, selecione `develop` para uma publicação nova com as variáveis. **Confira:** HTTPS válido e `/health` respondendo `{"status":"ok"}` sem login da Vercel. Na publicação, confira Python 3.13, função em `gru1` e pacote abaixo de 500 MB. [Domínios](https://vercel.com/docs/domains/working-with-domains/add-a-domain), [exceção no Hobby](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/deployment-protection-exceptions).

10. **Projeto do site → Settings → Environment Variables → Add:** cadastre `API_URL=https://api-dev.mandatometro.com.br` só em **Preview**, filtrado para **develop**. Faça uma nova publicação da `develop` em **Deployments → Create Deployment**. **Confira:** a folha da newsletter aparece em `dev.mandatometro.com.br`; inscreva `piloto@example.com`. Sem edição publicada, a resposta é `aguardando_edicao`; com edição e sem Resend, pode ser `envio_indisponivel`, com a inscrição gravada. Repita depois de mais de cinco minutos sem uso para conferir a resposta fria dentro dos 20 segundos que o site espera. Uma prévia comum de PR continua sem a folha. `/health` sozinho não testa o banco.

## 2. Produção — 7 passos, cerca de 20–35 minutos

Comece depois de conferir a inscrição de teste no ambiente anterior. A publicação da `develop` na `main` é uma decisão do Renan com a Atena.

1. **Vercel → Storage / Marketplace:** repita a criação do banco com o nome `mandatometro-producao`, **Free**, **São Paulo**. Em **Connect Project**, conecte somente à API e somente a **Production**, sem bancos automáticos por publicação. **Confira:** é outro projeto Neon, com outras credenciais; não é uma cópia do banco de desenvolvimento.

2. **GitHub → Settings → Environments → New environment:** crie `producao`. Permita **main e develop** em **Deployment branches and tags**: a agenda nasce na `develop`, mesmo quando o código executado vem da `main`. Cadastre os dois secrets `DATABASE_URL` e `DATABASE_URL_UNPOOLED` do banco de produção. **Confira:** são os valores desse segundo banco; não adicione aprovação humana obrigatória, que pararia a coleta diária.

3. **API → Settings → Environment Variables → Add:** em **Production**, cadastre `APP_BASE_URL=https://mandatometro.com.br` e `API_URL=https://api.mandatometro.com.br`. Para envio real, o Renan acrescenta `RESEND_API_KEY` e `RESEND_FROM`, com o remetente verificado. **Settings → Domains → Add:** adicione `api.mandatometro.com.br` a **Production** e crie o CNAME `api` no provedor DNS, usando o valor mostrado pela Vercel. **Confira:** HTTPS válido; banco e Resend não aparecem nas variáveis do site.

   `PILOTO_ATIVO` fica desligado por padrão; o Renan define `true` nas variáveis da **API** e faz nova publicação quando aprovar as decisões da [medição do piloto](medicao-do-piloto.md), com a migration aplicada e a tela integrada.

4. **GitHub → PR da develop para main:** Renan e Atena publicam a versão aprovada. **Não pule este passo:** em 16/11/2026, a `main` em `2b1bcea` ainda não tinha os conectores. A mudança de migrations no push aciona **Migrar banco** para produção. Se não houve mudança nesses arquivos, ou se a execução anterior pulou por falta do segredo, use **Actions → Migrar banco → Run workflow → main** uma vez. **Confira:** migration aplicada e publicação da API pronta. Mantenha a folha de produção oculta até concluir; publicação e migration são processos separados.

5. **GitHub → Actions → Coletar Congresso → Run workflow → main:** deixe as datas vazias para carregar os sete dias completos anteriores. **Confira:** resumo das duas Casas, commit publicado na `main` e ausência de falhas. Não copie a edição de prova do banco local. A edição real precisa do preparo e da revisão da #22; só a coleta não a publica.

6. **Projeto do site → Settings → Environment Variables → Add:** cadastre `API_URL=https://api.mandatometro.com.br` somente em **Production**. Faça uma publicação nova da `main`. **Confira:** folha visível no domínio público, inscrição gravada e saída funcionando pelo clique de confirmação. O Renan usa um endereço que controla para testar envio real, sem registrá-lo no relato. `aguardando_edicao` é esperado até existir uma edição revisada e publicada.

7. **GitHub → Settings → Secrets and variables → Actions → Variables → New repository variable:** crie `COLETAS_ATIVAS` com valor **true**. Só faça isso depois da primeira carga de produção bem-sucedida. **Confira no próximo dia:** **Coletar Congresso** executou as duas Casas, mostrou os commits da `main` e terminou sem falhas. Para pausar a agenda, mude o valor para `false`; o disparo manual continua disponível. A #23 permanece aberta até a ativação completa, inclusive o envio dominical da #39.

## Como as tarefas funcionam

| Tarefa | Quando | Código e banco |
| --- | --- | --- |
| Coleta diária | 03h17 de Brasília (`17 6 * * *` UTC), se `COLETAS_ATIVAS=true` | YAML da `develop`, checkout da `main`, banco `producao` |
| Coleta manual | Botão Run workflow | `develop` → `desenvolvimento`; `main` → `producao` |
| Envio dominical | 10h37 de Brasília (`37 13 * * 0` UTC), se `ENVIOS_ATIVOS=true` | YAML da `develop`, checkout da `main`, banco `producao` |
| Envio/ensaio manual | Botão Run workflow, com ID opcional, limite e simulação | `develop` → `desenvolvimento`; `main` → `producao` |
| Migration automática | Push em `develop` ou `main` que muda `apps/backend/migrations/**` | Commit do push, banco da mesma branch, URL direta |
| Migration de reserva | Botão Run workflow | Commit e banco da branch escolhida |

Sem o secret da URL direta, a migration no push mostra um aviso e pula antes de instalar dependências. Um disparo manual sem segredo falha, para não parecer que criou tabelas. A coleta diária fica pulada enquanto a variável não for `true`; depois de ligada, uma configuração ausente ou coleta parcial falha. Não há credenciais de produção nos testes de PR.

As duas Casas rodam uma por vez, com até 30 minutos cada, e a segunda é tentada mesmo se a primeira falhar. Coleta e migration compartilham a fila `banco-producao` ou `banco-desenvolvimento`, sem cancelar quem já começou. `queue: max` preserva até 100 execuções pendentes; não há garantia de ordem pelo horário do push. Falha ou cancelamento pede conferir o último sucesso e, se necessário, disparar a migration de reserva. O cron pode atrasar ou ser descartado; em repositório público, fica inativo após 60 dias sem atividade. [Concorrência](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency), [agendamento](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Para recuperar uma lacuna maior, preencha **inicio e fim juntos**, em `AAAA-MM-DD`, no disparo manual da coleta. Sem datas, valem os sete dias completos anteriores em Brasília. As migrations precisam funcionar com o código antigo e o novo: o deploy da Vercel não espera o Actions. Não há migration na importação, no build ou na requisição da API.

O rascunho da #22 tem lugar proposto no domingo às **06h37**, depois da coleta, e continua manual. O envio dominical está preparado para **10h37**, depois da revisão e publicação humanas; Renan confirma o horário antes de ativar. Coleta, migration e envio usam a mesma fila por banco, `queue: max` e `cancel-in-progress: false`. A rodada dura no máximo 30 minutos. [Fila do Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).

## Ativar e recuperar o envio de domingo

1. Depois da migration `0007` e da publicação da API nova, confira `GET /edicoes` e `GET /edicoes/{id}` com uma edição revisada. Não use a edição local de prova em produção. O envio antigo da inscrição não grava o marcador: ative a agenda somente depois de toda a API usar a versão nova. Se já houve envios reais antes da migration, concilie-os antes de iniciar a primeira rodada; marcador nulo não prova ausência de envio anterior.
2. No **GitHub → Settings → Environments → producao**, mantenha o secret `DATABASE_URL` com pool e cadastre `RESEND_API_KEY` em **Environment secrets**. Em **Environment variables**, cadastre `RESEND_FROM` (nome visível “Mandatômetro” e endereço do domínio verificado), `APP_BASE_URL=https://mandatometro.com.br` e `API_URL=https://api.mandatometro.com.br`. São as mesmas configurações usadas na API, mas precisam existir também no GitHub. Não coloque chave no ambiente de desenvolvimento nem no site.
3. Em **Actions → Enviar edição → Run workflow → main**, informe o ID publicado e mantenha **simular** marcado. Confira id e contagens. Ensaio não chama o provedor nem grava o marcador; ele não comprova saldo na conta. O ensaio em `develop` usa somente o banco de desenvolvimento.
4. Renan confere domínio, remetente, saldo e funcionamento dos links com um endereço sob seu controle, sem incluí-lo em relatos. O assunto é o título publicado e o corpo é o mesmo da inscrição; o cabeçalho RFC 8058 usa o POST da API. Aceitação pelo provedor não comprova entrega.
5. Em **Settings → Secrets and variables → Actions → Variables**, crie **`ENVIOS_ATIVOS=true`** somente quando quiser ativar os envios de domingo. Ela é independente de `COLETAS_ATIVAS`. Ausente, vazia ou diferente de `true`, deixa a agenda de envio desligada; o botão manual continua disponível. Para pausar, mude só essa variável para `false`.

O cron considera apenas edições publicadas desde a segunda-feira corrente, à meia-noite de Brasília; sem uma nova, termina com zero envios. Publicação depois do horário ou cron perdido exige **Run workflow**. No envio real manual, desmarque **simular**; ID vazio usa a última publicada. Informe sempre o mesmo ID para retomar uma rodada parcial. `--limite`/campo **limite** limita a rodada, sem reservar saldo para inscrições futuras.

No Free, os 100 envios diários e 3.000 mensais são compartilhados com as inscrições. A cota diária reinicia à meia-noite UTC (21h de Brasília); retome depois dessa virada, por exemplo no dia seguinte. Cota mensal esgotada requer aguardar o novo período ou uma decisão sobre o plano. Com 150 inscritos, o gratuito pode exigir mais de um dia; o código não faz upgrade nem retoma sozinho. [Preços](https://resend.com/pricing), [janelas e erros de quota](https://resend.com/docs/api-reference/rate-limit).

Sucessos confirmados ficam em `inscrito.ultima_edicao_enviada_id`; quem já recebeu essa edição ou uma mais nova é pulado. Chave inválida, inclusive mal formada, domínio inválido, campo obrigatório ausente ou quota interrompem a rodada na primeira falha. Uma ou duas recusas individuais e o 409 concorrente deixam os demais seguir. **Três recusas seguidas param a rodada**, sinal de erro na chave ou no remetente: confira `RESEND_API_KEY` e `RESEND_FROM` e rode de novo pelo mesmo ID. Outro resultado zera a sequência de recusas; os não tentados continuam pendentes.

O resumo só contém id da edição e contagens; não copie logs do provedor para o repositório. Se o processo cair depois do aceite e antes do commit, repetir a mesma chave/corpo evita duplicação por 24 horas; depois desse prazo, há o risco aceito de duplicar aquela mensagem. [Idempotência](https://resend.com/docs/dashboard/emails/idempotency-keys).

Não há webhook de entrega: devoluções, caixa cheia e reclamações posteriores à aceitação são acompanhadas por Renan no Resend, com a supressão automática do provedor. Em uma reversão de versão, desligue `ENVIOS_ATIVOS` antes; não remova a coluna enquanto existir código que a leia.

## Configuração e limites

O `apps/backend/vercel.json` fixa o preset **FastAPI**, a região e 30 segundos por chamada; `app.py` exporta a aplicação. O `package.json` do backend só encaminha tarefas locais para o uv: não é a entrada da função. O detector oficial reconhece FastAPI em `pyproject.toml`, e o preset usa o runtime Python. No primeiro deploy, a tela deve mostrar **FastAPI**, não TanStack Start nem um servidor Node; os registros do build devem mostrar Python 3.13 e a instalação com uv/`uv.lock`. A instalação do pacote com `src/` e o tamanho final só se confirmam nesse build. [Preset oficial](https://github.com/vercel/vercel/blob/main/packages/frameworks/src/frameworks.ts), [FastAPI](https://vercel.com/docs/frameworks/backend/fastapi), [runtime Python](https://vercel.com/docs/functions/runtimes/python).

Na Vercel, o backend exige `DATABASE_URL`, usa a URL com pool do Neon e `NullPool` no SQLAlchemy, sem reter conexão ociosa na função. A conexão tem limite de 5 segundos; a preparação automática de consultas fica desligada. A cota de inscrição continua em transação própria no PostgreSQL, compartilhada entre instâncias. Coletas usam a URL com pool; migrations usam a direta. [Pool do Neon](https://neon.com/docs/connect/connection-pooling), [SQLAlchemy](https://docs.sqlalchemy.org/en/21/core/pooling.html).

O `.env.schema` do site mantém `API_URL` vazio por padrão na Vercel. Só os valores cadastrados nos passos acima ativam a folha, num **novo build**. O `apps/web/vercel.json` continua com `NODE_ENV=production pnpm run build`. O CORS permite só o `APP_BASE_URL` de cada API; não libera todos os endereços de PR. A configuração resolvida do site fica em texto puro na função: segredos do banco e do Resend ficam fora desse projeto. [Variáveis por branch](https://vercel.com/docs/deployments/environments), [varlock](https://varlock.dev/integrations/vite/#ssr-code-injection).

| Serviço gratuito | Limites a acompanhar em Usage | Ao atingir a cota |
| --- | --- | --- |
| Vercel Hobby | Python: 500 MB; função até 300 s (a nossa pede 30 s). Site e API compartilham 4 h de CPU ativa, 360 GB-h e 1 milhão de invocações/mês | Pode suspender os deployments; não há upgrade autorizado |
| Cada projeto Neon Free | 1 GB, 100 CU-h/mês, 5 GB de saída/mês; pausa após 5 min sem uso | Compute/transferência esgotados suspendem conexões; armazenamento cheio impede operações que aumentam o espaço |
| GitHub Actions | Runner Ubuntu padrão gratuito neste repositório público; limite geral de 6 h por job | Nossos tetos de 30 min para coleta/envio e 10 min para migration interrompem tarefas travadas |

O Neon estima despertar em centenas de milissegundos, sem garantia da resposta completa ao navegador. Não mantenha um ping para impedir a pausa. A medição local de 09–15/11 deu 824 KiB nas tabelas da coleta e cerca de 100 MiB/ano pela extrapolação com recoletas; aquela semana não tinha votos individuais da Câmara. Confira o uso real antes de ampliar a carga. [Hobby](https://vercel.com/docs/plans/hobby), [excedentes da Vercel](https://vercel.com/docs/functions/usage-and-pricing), [Neon Free](https://neon.com/docs/introduction/plans), [pausa](https://neon.com/docs/introduction/scale-to-zero), [Actions: cobrança](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [limites](https://docs.github.com/en/actions/reference/limits).

## O que a hospedagem registra

A documentação da Vercel informa que os Runtime Logs incluem o caminho concreto do pedido (`requestPath`), método, horário, status, parâmetros de consulta e mensagens da função. A rota da API `/newsletter/saida/{codigo_saida}` põe o código no caminho; o link do site `/newsletter/sair?codigo=...` o põe na consulta. A retenção documentada para consulta desses logs no **Hobby é de uma hora**; esse prazo não é uma garantia sobre toda retenção interna do provedor. Desligar o access log do Uvicorn não controla esse registro da plataforma. [Runtime Logs: campos e retenção](https://vercel.com/docs/logs/runtime).

O contrato de saída permanece igual. Nossos logs continuam sem e-mail, corpo, código de saída ou exceção bruta; o Dockerfile mantém `--no-access-log` no Uvicorn. Este documento registra o comportamento da plataforma, sem alterar as regras do `AGENTS.md`.

Fontes oficiais consultadas em **16/11/2026**. Publicação real, DNS, banco remoto, logs da conta e execução da agenda precisam ser conferidos pelo Renan; os testes locais não os substituem.
