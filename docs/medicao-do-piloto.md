# Medição do piloto

O backend recebe o total de acertos no quiz final do processo legislativo, antes e depois da trilha. O resultado serve ao piloto da [#40](https://github.com/HiRenan/mandatometro/issues/40), como parte da [#92](https://github.com/HiRenan/mandatometro/issues/92). A tela continua sem nota ou ranking. A medição é independente de conta, progresso e newsletter.

## Decisões pendentes e ativação

**O piloto começa desligado.** O Renan decide a guarda e a eventual necessidade de distinguir turmas. Para a tela, ele escolheu em 16/11/2026, na #92, o mesmo código nas duas etapas e o piloto para quem tem 18 anos ou mais (veja "A tela do piloto"). Esta versão guarda só o total de acertos, sem turma, dia ou horário da tentativa, e o backend funciona com as duas escolhas de ligação:

- **Com ligação (a escolha da tela):** a tela sorteia um UUIDv4 por participação e usa o mesmo nas duas etapas. O relatório conta os pares e calcula a diferença média entre as etapas desses mesmos códigos.
- **Sem ligação:** a tela sorteia um UUIDv4 para cada etapa e preserva esse código nos reenvios daquela etapa. O relatório mostra médias independentes e zero pares. A união dos códigos não representa pessoas únicas.

Mesmo com ligação, trocar de navegador pode contar a mesma pessoa duas vezes; reutilizar um navegador pode misturar pessoas. O UUID não deriva de nome, e-mail, conta ou identificação do aparelho, mas sua existência não garante anonimato jurídico. Os arts. 5º, 12 e 14 da [LGPD](https://www2.camara.leg.br/legin/fed/lei/2018/lei-13709-14-agosto-2018-787077-normaatualizada-pl.pdf), o [estudo de anonimização da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/documentos-tecnicos-orientativos/estudo_tecnico_sobre_anonimizacao_de_dados_na_lgpd___analise_juridica.pdf/@@display-file/file) e o [Enunciado nº 1/2023](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-divulga-enunciado-sobre-o-tratamento-de-dados-pessoais-de-criancas-e-adolescentes/Enunciado1ANPD.pdf/@@display-file/file) exigem considerar identificabilidade e melhor interesse no contexto. A geração automática não é uma dispensa dessas regras. A página do piloto diz que ele é para quem tem 18 anos ou mais, sem perguntar a idade, e quem tem menos faz o quiz final sem envio. A orientação da #40 para menores continua com o Renan e o responsável pelo piloto; não pedir idade ou dados de responsáveis para contorná-la. Fontes consultadas em 16/11/2026.

Com a tela integrada e as decisões que faltam tomadas, o Renan define `PILOTO_ATIVO=true` na hospedagem. Vazio ou ausente significa `false`. A configuração é lida ao iniciar o processo: uma mudança exige sua reaplicação/reinício na hospedagem. Não existe fechamento automático por data. `PILOTO_LIMITE_POR_MINUTO` vazio usa 120, separadamente da newsletter. A leitura do relatório continua disponível com a coleta desligada. A tela só envia quando o build do site tem o `API_URL`, que a Vercel ativa só em Production e no Preview da `develop` ([docs/hospedagem.md](hospedagem.md)).

## Conteúdo e dados

`processo-legislativo-final-v1` corresponde às **12 perguntas**, duas por artigo, de `apps/web/conteudo/trilhas/processo-legislativo/quiz-final.md`, revisão `3510ff23ec3cfe987029ab3fb0fe04f2c3a1d604`, presente na base `78304ba`. A tela só deve enviar essa versão para esse conjunto congelado. Mudança de enunciado, opções ou gabarito exige uma nova versão combinada entre conteúdo, API e cliente; versões diferentes nunca formam pares. O `lib/piloto-versao.test.ts` falha quando elas mudam. As perguntas não recebem ids nesta etapa, pois não há análise por pergunta.

| Tabela | Campos | Regra |
| --- | --- | --- |
| `tentativa_piloto` | `participacao` UUID; `versao_quiz` texto até 40 caracteres; `etapa` `antes`/`depois`; `acertos` inteiro de 0 a 12 | Chave primária composta pelos três primeiros campos; nenhuma FK de conta ou cadastro. |
| `limite_piloto` | `janela` minuto com fuso; `quantidade` inteiro positivo | Cota global, sem relação com a tentativa; cada pedido remove janelas anteriores à atual e à precedente. |

Não há data da tentativa, origem, nome, e-mail, IP, cabeçalho, idade, opção escolhida, texto livre ou histórico de treino. A primeira conclusão confirmada de cada etapa prevalece: o `ON CONFLICT DO NOTHING` trata reenvios concorrentes e também um segundo total válido diferente. Códigos iguais em versões diferentes são independentes. O banco valida etapa e intervalo dos acertos, além da validação HTTP.

A API aceita `depois` sem `antes`, pois entregas podem chegar fora de ordem. O relatório o conta como somente depois até receber o antes correspondente. Não se registra horário para provar a ordem real. Uma tentativa incompleta fica só no navegador; o backend recebe a conclusão e não comprova quantas perguntas foram efetivamente respondidas.

## Contrato HTTP

`POST /piloto/tentativas`, `Content-Type: application/json`, sem autenticação. Operação gerada: `registrar_tentativa_piloto`. Exemplo com identificador inventado:

```json
{
  "participacao": "b9d2fdc3-c198-433b-836d-b381de5a49d9",
  "versao_quiz": "processo-legislativo-final-v1",
  "etapa": "antes",
  "acertos": 7
}
```

São exatamente esses quatro campos. O código deve ser UUIDv4; `acertos` deve ser inteiro JSON entre 0 e 12, sem coerção de string, decimal ou booleano. O limite do corpo é 2 KiB reais, somando os chunks, independentemente de `Content-Length`.

| HTTP | Corpo | Ação da tela |
| --- | --- | --- |
| 200 | `{"situacao":"recebida"}` | Marcar a conclusão enviada; novo e repetido têm a mesma resposta, sem total ou indicação de existência anterior. |
| 410 | `{"erro":"piloto_encerrado"}` | Encerrar pendências de envio; o quiz continua disponível. |
| 413 | `{"erro":"corpo_muito_grande"}` | Corrigir o pedido; não repetir automaticamente. |
| 422 | `{"erro":"dados_invalidos"}` | Corrigir corpo/versão/tipo de conteúdo; a resposta não repete a entrada. |
| 429 | `{"erro":"limite_de_tentativas"}` | Reenviar o mesmo pedido depois dos segundos de `Retry-After`. |
| 503 | `{"erro":"servico_indisponivel"}` | Resultado da gravação não confirmado; reenviar o mesmo pedido. |

Uma falha de rede também permite reenvio da mesma chave e corpo. A cota usa o relógio do PostgreSQL, em transação própria antes do parsing: pedidos inválidos, grandes e repetidos consomem cota, mesmo se a gravação falhar depois. Quando desligado, a rota retorna 410 antes de ler o corpo ou acessar o banco. Rejeições por cota não incrementam o contador. A rota não disponibiliza leitura individual, estatística pública ou exclusão pública.

CORS aceita apenas `APP_BASE_URL` e expõe `Retry-After`; não autentica quem envia. As respostas levam `Cache-Control: no-store` e `Referrer-Policy: no-referrer`. Corpos, códigos, cabeçalhos e exceções brutas não entram nos logs. **O UUID vai somente no corpo, nunca no caminho ou na query string:** a hospedagem da #23 registra o caminho dos pedidos e não seu corpo. Verificar também proxies, monitoramento e logs do banco antes de ativar; não acrescentar captura de payloads para depurar o piloto.

## A tela do piloto

A tela é da #92: `apps/web/src/lib/piloto.ts` guarda o piloto no navegador, `lib/envio-do-piloto.ts` faz o pedido, `lib/reenvio-do-piloto.ts` cuida das tentativas, e `components/piloto.tsx` mostra as duas etapas. O visual está no [DESIGN.md](../DESIGN.md), em "O piloto". O Renan escolheu em 16/11/2026 a página só pelo endereço, o mesmo código nas duas etapas, o antes sem a resposta certa, o piloto para quem tem 18 anos ou mais e o "Começar como outra pessoa" sem desfazer.

- **O antes** fica em `/piloto`, fora do menu e dos buscadores: as 12 perguntas, uma por vez, sem a resposta certa. O "Começar" sorteia o código com `crypto.randomUUID()`; fora de página segura, ele sai do `getRandomValues`, com os bits da versão 4. **O depois** é o quiz final da trilha, para quem fez o antes no mesmo navegador, e vale a primeira resposta de cada pergunta. Quem não fez o antes, como os jurados, faz o quiz final sem envio.
- **O envio** sai quando a pessoa responde à 12ª pergunta, pelo cliente de `apps/web/src/client/`, com o mesmo código nas duas etapas, só no corpo. O navegador guarda o corpo até a resposta. Cada aba manda um pedido por vez, relido do navegador na hora de sair, e a resposta só vale para o pedido que ainda está guardado: assim, duas abas não se atrapalham. A tela espera cada pedido por até 20 segundos.
- **Cada resposta:** o 200 marca a etapa como recebida; com o depois recebido, o navegador apaga o código e as etapas e guarda só que participou. O 410 apaga o código e as pendências e guarda que o piloto está encerrado. O 413 e o 422 apagam a pendência, sem nova tentativa. O 429 espera os segundos do `Retry-After`, ou um minuto. O 503, as outras respostas e o pedido sem resposta tentam de novo em 5, 15, 30 e 60 segundos, depois a cada minuto; com o aparelho sem internet (o `navigator.onLine` falso), também quando ela volta. As tentativas só acontecem com a página do piloto ou o quiz final aberto, e a pendência sai de novo na volta a uma delas. A tela diz cada resultado numa linha, com o "Tentar de novo" quando não houve resposta, e nunca mostra o total de acertos.
- **O 410 fica no navegador.** Depois dele, a tela não envia mais nada, e a página do piloto diz que ele não está recebendo respostas, até o "Começar como outra pessoa". Para testar a página antes de ligar o `PILOTO_ATIVO`, use uma janela anônima, ou o "Começar como outra pessoa" depois de ligar.
- **Sem API ou armazenamento,** o quiz educativo continua funcionando, e nada de medição é fabricado. Sem o `API_URL` no build, a página do piloto diz que ele não funciona naquele endereço, e o quiz final não envia nada. Sem o localStorage, o piloto vale até a pessoa sair da página, e o código se perde com ela.

**Computador compartilhado.** A orientação da #40 é abrir uma janela anônima por pessoa e fechá-la ao terminar, mantendo a mesma janela entre as etapas; a página do piloto diz isso numa nota. "Recomeçar a trilha" e "Recomeçar o quiz" não bastam para trocar de pessoa. O "Começar como outra pessoa", na página do piloto, apaga os artigos lidos, as respostas dos quizzes, com as tentativas anteriores que o "Desfazer" recupera, o código e as pendências de envio, sem desfazer. Um pedido da pessoa anterior que ainda espera a API não vale para a próxima. Outra aba aberta recebe a mudança pelo evento `storage` e não recupera a participação anterior.

## Relatório para o time

Em `apps/backend`, com `DATABASE_URL` explícito para o banco escolhido, executar:

```text
uv run mandatometro piloto resultado --versao processo-legislativo-final-v1
```

O comando imprime uma linha JSON e não devolve UUIDs ou linhas individuais:

- `tentativas`: conclusões gravadas em cada etapa e sua soma, excluindo reenvios e treinos;
- `participacoes`: códigos por etapa, união, pares e os que têm somente antes/depois. Na mesma etapa, tentativas e códigos têm contagens iguais. Sem ligação, a união soma as duas etapas, sem representar pessoas únicas;
- `medias`: denominador, média de acertos e percentual por etapa;
- `pares`: denominador comum, médias antes/depois desses mesmos códigos e diferença média em acertos e pontos percentuais; o percentual usa 12 perguntas, sem arredondamento intermediário.

As contagens e somas vêm de uma única consulta agregada, para não misturar momentos de gravação. `situacao` explica as médias: `sem_respostas` para zero; `amostra_pequena` abaixo de 5; `disponivel` quando podem sair; `protecao_de_subgrupo` quando a média global junto à dos pares permitiria deduzir o resultado de 1 a 4 participações restantes. Nesses casos, médias e diferenças ficam `null`, sem apagar observações. O limiar é uma proteção técnica, não prova legal de anonimato. Publicar um relatório final revisado, evitando sucessivas versões que permitam deduzir quem respondeu por último.

Qualquer pessoa pode inventar um total ou novos códigos; a cota não resolve fraude nem confirma pessoas. Ensaiar em banco separado, ativar só na rodada combinada, confrontar contagens com a participação esperada e declarar limitações no README/vídeo. Se houver contaminação, encerrar e rever a rodada, sem tentar identificar participantes ou excluir seletivamente respostas ruins. Ganho pareado e diferença de médias globais são medidas distintas; repetição das perguntas e abandono limitam a interpretação e não demonstram causalidade.

## Encerramento e exclusão

**Proposta pendente do Renan: excluir em 01/12/2026**, após a entrega de 30/11, conservando apenas o relatório agregado aprovado. Essa data não está no código e não é argumento do comando. A execução operacional é explícita:

1. Desligar `PILOTO_ATIVO` em todas as instâncias e reaplicar a configuração; confirmar 410 e esperar os pedidos já iniciados terminarem. O CLI deve usar a mesma configuração da hospedagem: desligar só no terminal não desliga os servidores.
2. Salvar e revisar o relatório agregado, sem exportar linhas individuais.
3. Executar no banco certo, com a URL na linha do comando:

   ```text
   uv run mandatometro piloto apagar --versao processo-legislativo-final-v1 --confirmar
   ```

O comando recusa se o seu `PILOTO_ATIVO` estiver ligado ou se faltar `--confirmar`. Apaga a versão indicada e todas as janelas da cota do piloto em uma transação, preservando outras versões e a newsletter. Repeti-lo imprime zero; a saída contém apenas `tentativas_apagadas` e `janelas_apagadas`. Nenhum fechamento por calendário impede reativação: manter a coleta desligada depois da exclusão e descartar pendências da tela para evitar recriação. Reveja a rodada e as pendências da tela antes de reativar.

A limpeza final remove as janelas que tenham sobrado sem tráfego. A tela não tem data no código: o código e as pendências saem com o depois recebido, com o 410 e com o "Começar como outra pessoa". Com o `PILOTO_ATIVO` desligado, o navegador que ainda tentar enviar recebe o 410 e apaga o que guardava. Na data que o Renan aprovar, um PR pequeno tira a página do piloto e a parte do piloto do quiz final e apaga, de quem abrir o site, a chave do piloto e as respostas do antes. A #23 precisa confirmar a retenção/eliminação de backups; se uma cópia for restaurada, reaplicar a exclusão antes de reabrir a API. Os arts. 15–16 da LGPD tratam do encerramento da finalidade e da eliminação.

Os comandos saem com 0 quando concluem, 1 em falha do banco ou exclusão recusada por piloto ativo, e 2 em argumentos inválidos ou confirmação ausente. Erros não imprimem exceções do banco.
