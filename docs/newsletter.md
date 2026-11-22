# Newsletter

## Newsletter: rascunho e revisão

O rascunho reúne as votações do Congresso e os atos do Diário Oficial da União. [ADR 0004](adr/0004-newsletter-do-dou.md)

- O comando `edicao` lê do banco as votações e os atos já coletados. O subcomando `rascunho` chama o redator quando configurado, fora da transação. A revisão usa só o banco e o arquivo da pessoa que revisa. O subcomando `enviar` chama o Resend. O código escolhe as matérias e agrupa os vínculos explícitos dentro de cada Casa, unindo os grupos que se conectam. Preserva data, resultado, placar por votação e fontes. A aprovação de ato procedimental não vira aprovação do projeto. Grupos com placar vêm antes; depois valem data mais recente, Casa e menor id externo da proposição principal. Teto padrão de oito itens de votação, com `--teto`. O resumo lista ids e contagens de votações sem proposição, sem página pública e cortadas pelo teto. O item aponta para a fonte da votação mais recente do grupo (desempate pelo id externo numérico). Sem página pública nessa fonte, a ficha pública de uma proposição ligada à votação pode substituí-la. Uma votação sem proposição ligada ou sem nenhuma dessas páginas fica fora. Não se deduz o vínculo pelo prefixo do id da votação.
- `item_edicao.fatos` é JSONB versionado, opcional para itens antigos. A versão 1 aceita só ids de proposições/votações/fontes, data, resultado, totais permitidos, origem (`codigo`, `modelo` ou `revisao`) e pendências. A confirmação da cobertura é única para a edição e fica registrada pela presença ou ausência da pendência `cobertura` nos itens. Nunca guarda texto livre da fonte, pessoa, partido, voto individual ou ausência. Sim, Não, Abstenções e Obstruções são contados por votação; Presidência fica à parte, e ausência e valores não classificados ficam fora. Sem placar, informe a indisponibilidade, sem inferir modalidade ou zero. `outro` sinaliza resultado não classificado e não vira aprovação. A edição publicada conserva a fotografia dos fatos e as fontes daquela coleta. A explicação em `item_edicao.texto` é texto puro e `artigo_caminho` é opcional.
- O item de ato do Diário Oficial usa a versão 2, com `ato_id`, `data_publicacao`, `fontes`, `hash_ato` e os mesmos campos editoriais. O hash registra mudanças nos demais campos da linha de `ato`, onde ficam o título e a ementa oficiais. A conferência busca o ato pelo id e compara os fatos e a fonte corrente com os do rascunho. Uma coleta que grave outra fonte exige refazer e revisar o rascunho, mesmo que preserve o id do ato e o conteúdo oficial. A edição publicada conserva a fonte da revisão. A revisão aceita os números do campo `numero`, do título, da ementa e das datas de publicação e assinatura do ato, além dos números das datas da edição.
- O redator recebe só a ementa, a descrição e os fatos permitidos. O prompt pede tom impessoal e neutro e trata textos oficiais como dados, nunca instruções. Título e explicação do modelo não podem conter algarismos, URL ou HTML. Tratamento parlamentar, nome do cadastro com duas palavras ou mais ou padrão de partido/UF retêm **o campo inteiro**; se qualquer campo for retido, o item não chama o provedor. Nome de uma palavra isolada não basta. A alternativa manual não copia a descrição retida.
- Licença, afastamento ou saúde, incluindo as flexões de internar, hospitalizar, adoecer, adoentar e convalescer, além de atendimento médico, excluem o ato quando ligados a parlamentar na mesma frase, com até seis palavras entre termo e sinal. Os adjetivos `interna` e `internas` ficam fora dos termos; `interna-se` continua reconhecido. Quebra de linha vale como espaço; ponto só encerra após palavra de cinco letras ou mais, e `!` e `?` sempre encerram. Requerimento sem essa ligação só sai por licença ou afastamento e sem outra proposição numerada, citada por sigla ou por extenso, inclusive no plural e com o nome da Casa. Artigo de regimento ou lei não conta; saúde sozinha não basta. O nome da Casa não é ligação. Por privacidade, saem a regra geral de licença das próprias parlamentares e a emenda sobre licenciamento ambiental com nome de parlamentar a até seis palavras do termo, na mesma frase. O ato excluído fica fora da edição e do arquivo, com só a quantidade no resumo; a revisão aplica o mesmo filtro, sem emprestar siglas da fonte ao texto humano.
- A rede de segurança usa a lista do filtro e uma lista adicional própria: hospital, hospitais, hospitalar, hospitalares; médico, médica, médicos, médicas; operado, operada, operados, operadas. Operação não entra. Essa lista mais larga pede conferência sem excluir políticas públicas sobre hospitais e programas de saúde; `TERMO_PESSOAL` e as regras de ligação do filtro não mudam. A rede retém todo item elegível com termo de qualquer lista em descrição ou ementa ligada, inclusive de proposição fora das principais: não chama o redator, usa texto do código e redação pendente com motivo `termo_pessoal`. A seleção, a ordem e o teto não mudam. O resumo conta `itens_com_termo_pessoal`; `contexto.avisos` no arquivo e os avisos do `revisar` pedem conferir se é de uma pessoa e, se for, usar `excluir: true`. O aviso é de consulta, sem trecho oficial no resumo; a confirmação individual continua necessária para publicar.
- A rede de segurança do Diário Oficial verifica tipo, título, ementa, seção e órgão. Retém a seção 2 (`secao_de_pessoal`) e padrões de documentos pessoais, como CPF, matrícula, RG, título de eleitor, passaporte e CNH (`documento_pessoal`). Para `ato_de_pessoal`, cruza palavras do título e da ementa com sinais de nome. Entre os sinais estão duas ou mais palavras com inicial maiúscula fora de expressões institucionais, inclusive ligadas por partículas como `de` e `da`, e indicações de lista nominal. Sem esses sinais, o contexto pode liberar ocorrências sobre concurso, carreira, previdência, lei sancionada e outros assuntos gerais. Um título ou uma ementa em caixa alta com termo da lista retém o ato. O sinal de nome pode falhar com texto em minúsculas, nome de uma palavra só ou nome misturado ao de uma instituição. Atos retidos ficam fora do novo rascunho. Para um ato já gravado na edição, a prévia e o arquivo de revisão sinalizam o número do item e o código do motivo. [Dados pessoais](dados-pessoais.md#atos-do-diário-oficial)
- O vocabulário de atos de pessoal inclui nomeação, exoneração, designação e dispensa de função, aposentadoria, pensão, reforma, promoção, demissão, cassação, penalidade, sanção, cessão, remoção, redistribuição, naturalização, extradição, expulsão, condecoração e título honorífico. Também cobre as formas individuais de torna sem efeito, declara vago, vacância, posse, reconduz e recondução, afasta e afastamento, licença de servidor, readapta, reintegra, reverte, aproveitamento, disponibilidade, substituto eventual, afastamento do País, concessão de medalha, admissão em ordem, indulto, perda de nacionalidade e anistia. Palavras ambíguas como posse, licença e indulto pedem sinal de pessoa ou forma individual em texto de caixa mista.
- `LLM_PROVIDER=anthropic` liga o SDK síncrono com `LLM_MODEL` e `LLM_API_KEY` locais. Provedor vazio ou só com espaços mantém a redação manual. Provedor desconhecido ou configuração Anthropic incompleta dá saída 2 antes do banco. Falha ao abrir o cliente dá saída 1 com mensagem fixa. Ctrl+C no rascunho dá saída 130, com a linha `{"erro": "Rascunho interrompido."}` em stdout e stderr vazio. Cada item de votação liberado faz uma chamada, com timeout de 60 segundos por tentativa e uma nova tentativa para falhas transitórias. Em `end_turn`, o adaptador ignora os blocos declarados `thinking` e `redacted_thinking` e exige que reste um único bloco declarado `text` com JSON válido. Recusa, corte, falha ou formato inválido deixam a redação pendente. Nunca registrar prompt, resposta, chave ou exceção bruta. O resumo conta os textos do modelo e os pendentes por motivo.

### Seleção dos atos

O `rascunho` inclui atos com uma página pública oficial e data de publicação dentro do período informado, incluindo as duas datas. Os atos entram depois das votações, com seu próprio teto de cinco por padrão. Use `--teto-atos N` para mudar esse limite.

O comando considera duplicata um par único no período entre as duas origens com o mesmo tipo, número positivo normalizado e data completa de assinatura. A comparação remove zeros à esquerda e pontos de milhar. Para leis, as duas linhas precisam indicar o mesmo subtipo, ordinária ou complementar, pelo título ou pelo endereço oficial do ato. Subtipo ausente ou divergente, tipos sem identificação precisa, dados ausentes e chaves com mais de uma linha da mesma origem preservam os candidatos. Se as duas linhas podem entrar, fica a dos destaques, com o link do Diário Oficial. A outra linha e sua fonte permanecem na coleta. Se apenas uma tem página pública, ela é candidata.

A retenção vale para a norma reconhecida nas duas origens, inclusive quando as datas de publicação estão em períodos diferentes. Se uma linha for retida, as linhas correspondentes ficam fora do modelo e do rascunho. Publicações fora do período só participam da conferência de privacidade.

O resumo JSON em `atos` mostra quantos ficaram sem página pública, quantos foram deduplicados, quantos eram elegíveis e quantos ficaram abaixo do teto. `retidos` lista o id interno e o código de cada retenção, inclusive as linhas de fora do período que acionaram o bloqueio. `retidos_por_codigo` traz as contagens. Consulte o id no banco editorial autorizado para conferir um descarte.

Com provedor, uma chamada ordena todos os candidatos pela relevância para quem está aprendendo como funciona a política brasileira. Cada ato leva uma posição temporária, título, ementa, órgão, tipo e data de publicação. O prompt manda tratar texto oficial como dado. A resposta precisa listar todas as posições exatamente uma vez, em ordem de relevância. Cada motivo tem até 160 caracteres, em texto simples. A validação recusa texto vazio, controles, algarismos e sinais de URL ou HTML.

A conferência de identificação compara os nomes do cadastro de parlamentares sem distinguir caixa, acento ou sequências de espaços. Também recusa tratamentos parlamentares, maiúsculas internas que sinalizem identificação, o padrão de sigla com UF e a palavra `partido` e suas flexões. Siglas registradas em `voto.partido` são procuradas como palavras inteiras em qualquer caixa. As que também são palavras comuns entram nessa guarda quando aparecem todas em maiúsculas. São elas agir, avante, cidadania, democrata, missão, mobiliza, novo, pode, rede, republicanos, solidariedade e união.

A conferência também recusa os nomes do registro do TSE com mais de uma palavra e sem o termo `partido`. A consulta de 19/11/2026 encontrou Democracia Cristã, Mobilização Nacional, Movimento Democrático Brasileiro, Rede Sustentabilidade, Unidade Popular e União Brasil. A pessoa que revisa confere o idioma do motivo, os nomes de pessoas fora do cadastro e se uma palavra comum está sendo usada como sigla ou nome de partido de uma só palavra. [Registro do TSE](https://www.tse.jus.br/partidos/partidos-politicos/partidos-registrados-no-tse)

Se faltar provedor ou a sugestão falhar, entram primeiro os destaques, depois os demais. Em cada grupo vale a publicação mais recente e, no empate, o menor id interno. O resumo registra a origem da ordem e o código aplicável.

| Código | Situação |
| --- | --- |
| `sem_provedor` | Provedor vazio ou sem configuração de provedor. |
| `recusa_provedor` | O modelo recusou a chamada. |
| `resposta_interrompida` | Houve corte ou outra parada diferente de `end_turn`. |
| `falha_provedor` | A chamada falhou. |
| `tempo_esgotado` | O provedor esgotou o tempo da chamada. |
| `resposta_invalida` | O formato, as posições ou qualquer motivo falharam na validação. A ordem inteira segue pela regra. |

O arquivo de revisão mostra `fatos.selecao` como consulta. O campo guarda a ordem sugerida entre os atos, a origem da ordem, o teto e o motivo validado ou o código da ordem por regra. A pessoa pode mudar a posição do item ou excluí-lo. A seleção fica pendente de revisão e a explicação nasce pendente de redação. A sugestão é interna à revisão.

### Revisão pelo painel

A revisão também se faz no site, em `/painel`, por quem entrou com uma conta administradora (a #207). A entrada é o link "Revisar a edição da semana", no `/perfil`, que só a administradora vê. A conta comum vê "Página não encontrada". Use o workflow da agenda ou o CLI para gerar ou refazer o rascunho. O CLI também permite mudar a ordem dos itens e enviar a edição.

**Pela tela:**

1. Entre com a conta administradora e abra "Revisar a edição da semana", no `/perfil`. A tela carrega o rascunho mais recente. Sem rascunho, ela diz "Não há rascunho para revisar.".
2. Confira nos resumos das coletas que as votações e os atos da semana chegaram e marque "Confirmo a cobertura da semana". Ajuste o título da edição, se quiser.
3. Em cada item, leia os avisos e os textos oficiais, que ficam acima dos campos. Na votação, eles são a proposição, o quadro de cada votação e as fontes, com o trecho. No ato, são a data e a fonte. As fontes abrem em outra aba e a revisão fica aberta na aba atual. Ajuste o título e a explicação, com uma linha em branco entre os parágrafos, até 12. Se um artigo da trilha explicar o assunto, escolha-o e confirme. Marque "Confirmo a revisão deste item".
4. Num ato retido pelo filtro de pessoal, abra o texto oficial na outra aba. Se ele tratar de uma pessoa, marque "Tirar este item da edição" e escreva o motivo. Se não tratar, marque "Conferi a privacidade, e o ato fica na edição". O item tirado sai do rascunho ao salvar e não volta pela tela. Para trazê-lo de volta, refaça o rascunho pelo CLI.
5. Use "Salvar a revisão". O pé da tela diz o que falta para publicar, e o índice "Itens da edição" mostra o estado de cada item. Quando uma recusa aponta um item ou o título da edição, a mensagem aparece ali. As demais recusas, como um arquivo grande demais (`413`) ou um erro no servidor (`500`), aparecem no pé. "Há outra gravação em andamento. Tente de novo." pede só outra tentativa, e as alterações continuam na tela.
6. Quando o pé disser "A edição está pronta para publicar.", use "Publicar a edição" e confirme em "Publicar agora". A edição fica pública na hora. Ela só entra no envio automático de domingo se for publicada antes da rodada (veja "Como preparar a edição").

A tela relê o rascunho depois de salvar. Se ele mudar enquanto você revisa (`409`), por outra aba ou pelo CLI, a tela carrega a versão atual e mantém os campos alterados que ainda cabem nela. Se um item alterado saiu da edição, ou se um ato deixou de pedir uma confirmação de privacidade que você alterou, o aviso no pé informa o que ficou de fora e em quantos itens. Confira a versão atual e salve de novo. Se a edição foi publicada ou trocada nesse meio-tempo, o que não foi salvo fica de fora.

Com alterações por salvar, a tela avisa antes de sair da página. O rascunho fica só na memória da página. Se você fechar a aba, se a sessão cair ou se a conta perder o papel de administradora durante a revisão, o que não foi salvo se perde.

**Pela API,** que é o que a tela usa: a sessão é conferida a cada pedido, e a API exige a origem do site para salvar ou publicar.

1. Leia o rascunho mais recente em `GET /painel/edicoes/rascunho`. A resposta é o mesmo arquivo de `edicao exportar` ou `null` quando não há rascunho.
2. Confira as fontes e os avisos, edite os textos, confirme os itens ou marque a exclusão com motivo. Envie o arquivo inteiro em `POST /painel/edicoes/{id}/revisao`, com o id e a versão que leu. Valem as regras de `edicao revisar`, inclusive para campos de consulta e a confirmação de privacidade de atos retidos. Após salvar, carregue o rascunho de novo para obter a versão atual.
3. Com a revisão salva e as pendências resolvidas, use `POST /painel/edicoes/{id}/publicar` sem corpo. Valem as regras de `edicao publicar`. O workflow de domingo envia a edição publicada.

### Como preparar a edição

A agenda de sábado prepara o rascunho com as votações e os atos dos sete dias completos anteriores ao sábado. Uma pessoa do time revisa e publica a edição, inclusive quando o modelo escreveu o texto. Para entrar no envio automático de domingo, publique a edição na semana do envio em Brasília, entre a segunda-feira à meia-noite e o horário da rodada. [Agenda e recuperação](hospedagem.md#ativar-e-recuperar-a-agenda-de-sábado).

**Preparação do ambiente.** Peça ao time a URL autorizada do banco com as migrations aplicadas e os resumos das coletas das duas Casas, da legislação federal e dos destaques do Diário Oficial. Confira servidor, porta e nome do banco antes de usar. Abra um terminal PowerShell na raiz do repositório pelo Orca, entre na pasta abaixo e substitua o valor de exemplo pela URL recebida. A variável vale nesse terminal. Configure-a novamente se abrir outro.

```powershell
Set-Location .\apps\backend
uv sync --frozen
$env:DATABASE_URL = 'COLE_A_URL_AUTORIZADA_PELO_TIME'
```

**Redação com IA.** No `.env` local da raiz, defina `LLM_PROVIDER=anthropic`, `LLM_MODEL=claude-opus-5-5` e `LLM_API_KEY`. Crie a chave no Claude Console para um único workspace do time e guarde-a no computador de quem roda o rascunho. [Chaves de API no Claude Console](https://platform.claude.com/settings/keys) · [Seleção de workspace](https://platform.claude.com/docs/en/manage-claude/authentication#select-a-workspace)

O resumo do rascunho traz `textos_do_modelo`, `textos_do_codigo` (itens para redação manual) e `motivos_texto_do_codigo`, com a contagem por motivo. Um item filtrado, uma recusa, um corte ou uma resposta inválida segue para a pessoa que revisa. Se o Ctrl+C chegar enquanto o adaptador repõe `ANTHROPIC_LOG` e `ANTHROPIC_CUSTOM_HEADERS`, a reposição pode ficar incompleta no processo do rascunho. No Windows, uma variável herdada com valor vazio que o adaptador chegou a retirar volta vazia ao `os.environ` do Python e fica ausente do ambiente nativo herdado pelos novos processos. Os itens só são gravados ao final, então você pode repetir o comando depois. Repetir o comando para um rascunho existente dá contagens de redação zeradas.

Prepare uma pasta **fora do repositório**, por exemplo `$HOME\Documents\mandatometro-revisoes`. No PowerShell, `$HOME` é sua pasta de usuário; crie a pasta de revisões pelo explorador de arquivos se ela ainda não existir. O JSON contém descrições e trechos oficiais para consulta: ele e a prévia ficam fora de commits e logs. Os comandos seguintes usam essa pasta e são executados no mesmo terminal, em `apps/backend`.

**Rotina de toda semana.** Uma pessoa opera por vez.

1. Leia os resumos da agenda, inclusive as lacunas e exclusões. Use o `edicao_id` do passo de rascunho nos comandos abaixo, no lugar de `1`. Para gerar à mão com os dados já coletados, informe as datas da edição como no exemplo. Sem datas, o CLI usa os sete dias completos anteriores à execução.

   ```powershell
   uv run mandatometro edicao rascunho --inicio 2026-11-14 --fim 2026-11-20 --teto 8 --teto-atos 5
   ```

2. Exporte para a pasta externa preparada acima. Escolha um nome novo por edição ou rodada de revisão; a exportação recusa sobrescrever arquivos.

   ```powershell
   uv run mandatometro edicao exportar 1 --arquivo "$HOME\Documents\mandatometro-revisoes\edicao-2026-11-20.json"
   ```

3. Abra o JSON no editor e salve em UTF-8. Confira os fatos e as fontes de cada item, substitua a redação pendente e confirme a revisão e o artigo escolhido. Se um item falar da licença, do afastamento ou da saúde de um parlamentar, exclua-o com `excluir: true` e preencha `motivo_exclusao`. O aviso em `contexto.avisos` indica esses termos no texto oficial: confira se tratam de uma pessoa ou de política pública antes de confirmar o item. Confirme a cobertura uma única vez, depois de ler os resumos das duas coletas e conhecer suas lacunas: o banco não certifica a cobertura de todo o Congresso.

   Para cada ato do Diário Oficial, leia a fonte oficial no arquivo, confira a sugestão de ordem e escreva o título e a explicação. Marque `revisado: true` depois de conferir o texto e o endereço da fonte. Use os resumos das coletas e da seleção para confirmar a cobertura da edição.

   Se um item de ato já gravado vier com `contexto.motivo_retencao`, use o link do arquivo para conferir o ato. Para excluí-lo, marque `excluir: true` e preencha `motivo_exclusao` sem nomes, documentos ou trechos oficiais. Para mantê-lo, escreva a explicação e marque `privacidade_confirmada: true` no item, além da confirmação de revisão. O `revisar` recusa a importação sem uma dessas decisões e indica o item, o código e o campo. O `publicar` exige a confirmação gravada para cada ato retido que ficou no rascunho. Exporte novamente um rascunho antigo para conferir os avisos. A edição pública mostra os fatos do ato e a fonte oficial.

   O `revisar` recusa acentos e pontuação quebrados no título da edição e no título e na explicação dos itens mantidos, antes de gravar. No Windows PowerShell 5.1, texto com acento passado por pipe a outro programa perde os acentos, e um arquivo lido e gravado pelo PowerShell pode trocar `ã` por `Ã£`, `É` por `Ã‰` ou `—` por `â€”`. Edite o JSON num editor ou num script que leia e grave em UTF-8. A regra também recusa alguns finais válidos com `Ã` ou `Â` junto da pontuação, como `“IRMÃ”` e `AMANHÃ…`: nesses casos, use aspas retas ou três pontos.

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

4. Importe a revisão. O comando rejeita fatos alterados e salva as confirmações. Se houver erro, corrija o campo indicado e repita; o rascunho anterior fica preservado. Depois de uma atualização, um arquivo exportado antes pode ser recusado: exporte novamente e refaça os ajustes.

   ```powershell
   uv run mandatometro edicao revisar 1 --arquivo "$HOME\Documents\mandatometro-revisoes\edicao-2026-11-20.json"
   ```

5. Leia a prévia, com fatos, fontes e link da trilha, no formato de texto do e-mail. Enquanto falta a confirmação válida de privacidade de um ato retido, a prévia mostra “Fonte oficial disponível no arquivo de revisão.” no lugar do endereço. Com a confirmação gravada e os dados conferidos, o endereço volta à prévia. O `mostrar` exibe a fotografia gravada do rascunho e verifica a retenção no ato atual. Exportação, revisão e publicação exigem que a fotografia corresponda aos dados atuais. Mantenha a saída fora do log do job. A prévia admite `APP_BASE_URL` local. O envio real exige HTTPS.

   ```powershell
   uv run mandatometro edicao mostrar 1
   ```

6. Com a revisão concluída e nenhuma pendência, publique. O comando lê a revisão salva no banco, sem receber arquivo. A publicação é definitiva e não envia o e-mail.

   ```powershell
   uv run mandatometro edicao publicar 1
   ```

No arquivo, edite o título da edição, os títulos e a lista `explicacao` de cada item. Pode reordenar a lista de itens; para retirar um, marque `excluir: true` e escreva `motivo_exclusao`, mantendo ao menos um item. Não remova linhas nem altere ids, datas, `fatos`, `fontes`, `contexto` ou o catálogo. Números inseridos pela pessoa precisam aparecer nos fatos ou textos oficiais daquele item; a verificação não substitui a leitura do significado de cada número.

Escolha `artigo_caminho` entre os seis artigos do catálogo e marque `artigo_confirmado: true`, ou use `null` quando nenhum se aplicar. A sugestão depende da forma do ato: recurso contra decisão conclusiva aponta para comissões, e grupo só de PL/PLP aponta para Plenário; os demais ficam sem sugestão. Os artigos sobre revisão pela outra Casa e sanção ou veto também podem ser escolhidos na revisão. Um arquivo com catálogo antigo precisa ser exportado novamente. O `revisar` aplica o mesmo filtro de assunto pessoal ao título e aos parágrafos humanos, sem usar as siglas da fonte, e avisa apenas o número do item se o texto puder identificar parlamentar ou partido. Tirar só o marcador de redação não basta para confirmar a revisão.

A prévia e o e-mail compartilham `formatar_edicao`, que escapa o texto, acrescenta fatos, fontes e link da trilha. Reutilize `formatar_edicao`/`montar_email` e carregue as fontes pelos ids de `fatos.fontes`, além da fonte principal. Renderizar apenas `texto` perderia os blocos factuais. Item antigo sem os novos campos continua válido.

Repetir o rascunho no mesmo período retorna a edição existente sem sobrescrever ajustes. Para recompor o rascunho, use `--refazer` no CLI ou marque **refazer** no **Run workflow** da agenda de sábado. A agenda só aplica a opção quando as duas coletas da rodada terminam com código 0. Refazer descarta a revisão já salva e invalida os arquivos exportados. Use a opção também se a coleta mudou os dados usados. Depois de salvar uma revisão, exporte outro arquivo para fazer novos ajustes. Edição publicada permanece intocada, inclusive ao repetir geração ou publicação. Mais de uma edição no período é erro a resolver. [Recuperação pela agenda](hospedagem.md#recuperar-a-coleta-dos-destaques).

O banco serializa as gravações sobre a mesma edição antes de conferir o estado e a versão. A espera pela trava da edição tem limite de três segundos, aplicado à transação. Se o prazo vencer, a transação é desfeita. A API responde com HTTP 503 ao salvar ou publicar. O CLI termina com saída 1. Ambos mostram “Há outra gravação em andamento. Tente de novo.”

Sem votações e sem atos no banco para o período, retorna `sem_votacoes_no_banco`. Se houver dados e todos ficarem fora da seleção, retorna `sem_itens_elegiveis`. Ao refazer um rascunho, uma seleção vazia preserva a revisão existente. A saída é **0** para operação concluída, inclusive redação pendente, repetição sem efeito e período sem itens. Falha operacional ou revisão/publicação recusada dá **1**. Argumentos ou configuração do redator inválidos dão **2**. Exceto a prévia e os erros de sintaxe do comando, a saída é JSON com ids, contagens e mensagens sem conteúdo de fonte ou exceção bruta. Erros de sintaxe, como `publicar --arquivo`, imprimem o texto de uso e o erro em stderr, com saída **2**, sem JSON.

Com `TEST_DATABASE_URL` explícito, rode `uv run pytest`. Os testes do adaptador usam o SDK instalado pelo uv, transporte simulado e dados inventados. Funcionam offline.

## Newsletter: inscrição e saída

Depois das migrations, envie `POST /newsletter/inscricoes` com JSON contendo só `email`. Libere o CORS só para `APP_BASE_URL`, conforme o [ADR 0001](adr/0001-stack.md). Use GET e POST, aceite `Content-Type` e exponha `Retry-After`. No site, a folha da newsletter, no fim da página inicial, chama a rota pelo cliente gerado, em `lib/newsletter.ts`. Ela só aparece quando o build tem o `API_URL`, vazio por padrão na Vercel e ativado por ambiente conforme [docs/hospedagem.md](hospedagem.md).

Depois de confirmar a inscrição no banco, a API responde 200 com `situacao`. Uma inscrição nova ou repetida recebe as mesmas respostas, sem revelar se o endereço já estava na lista.

| HTTP | Corpo | Significado |
| --- | --- | --- |
| 200 | `{"situacao":"edicao_enviada"}` | Inscrição gravada. O Resend aceitou o envio da última edição publicada, sem confirmar a entrega na caixa postal. |
| 200 | `{"situacao":"aguardando_edicao"}` | Inscrição gravada, sem edição publicada para enviar. |
| 200 | `{"situacao":"envio_indisponivel"}` | Inscrição gravada, mas o envio não foi confirmado. A pessoa pode tentar novamente. |
| 422 | `{"erro":"dados_invalidos"}` | Corpo ou e-mail inválido. A resposta não repete os dados recebidos. |
| 429 | `{"erro":"limite_de_inscricoes"}` | Cota global esgotada. `Retry-After` informa quantos segundos esperar. |
| 503 | `{"erro":"servico_indisponivel"}` | Gravação não confirmada no banco. |

O limite padrão é **30 tentativas por minuto fixo**. Para mudá-lo, defina `NEWSLETTER_LIMITE_POR_MINUTO`. Conte as tentativas em `limite_inscricao`, só com `janela` e `quantidade`. Não guarde IP, e-mail ou hash de pessoa. Aplique a cota antes de validar o JSON, em transação própria. Inclui tentativas repetidas, inválidas e cujo envio falhou. A saída fica fora dessa cota. As chamadas seguintes limpam as janelas antigas.

`POST /newsletter/saida/{codigo_saida}` apaga a inscrição e responde 200 vazio, inclusive para código desconhecido ou já removido. Não lê nem exige corpo. O programa de e-mail usa essa rota com os cabeçalhos da RFC 8058. GET e HEAD só redirecionam para `/newsletter/sair?codigo=...` no site. Essa página só manda o POST no clique em "Confirmar a saída", para os leitores automáticos de links não cancelarem a inscrição. Ela não tem loader e fica fora dos buscadores, do Referer e do cache.

**Formulário do React 19:** a função do `action` não espera a API. Ela confere o dado e dispara o pedido. Uma função `async` ali prende à espera dela as outras transições, inclusive a troca de página do TanStack Router, que roda num `startTransition`: um link tocado durante o envio só abriria depois da resposta. Enquanto o pedido espera, o botão fica com o `aria-disabled`, que guarda o foco, e não com o `disabled`.

Não registre e-mail, corpo, código de saída ou exceção bruta. As mensagens de validação, SQL e Resend podem conter dados pessoais. Na produção, desligue o access log do Uvicorn com `--no-access-log`, como faz o Dockerfile. Esse log incluiria IP e código de saída. Não registre cabeçalhos ou URLs de saída nos logs da hospedagem. O log do `pnpm dev` fica ligado. No desenvolvimento, use só dados fictícios.

Monte o e-mail em `avisos/email.py` e envie por `avisos/resend.py`. O envio faz até três tentativas dentro de 8 segundos no total, com tempo limite e espera entre elas. Inscrição e envio semanal compartilham a montagem, a chave de idempotência e a confirmação no banco, em `avisos/envio.py`. Use endereços públicos HTTPS em `APP_BASE_URL` e `API_URL` para os links de um envio real.

Para enviar de verdade, configure `RESEND_API_KEY` e `RESEND_FROM`. O remetente de exemplo só envia para o dono da conta. Troque-o por um endereço do domínio verificado `mandatometro.com.br`. Prepare uma edição `publicada`, com seus itens e fontes oficiais. Sem chave ou com configuração de envio inválida, a inscrição continua gravada e a API responde `envio_indisponivel`. Sem edição, responde `aguardando_edicao`.

**Para ver a tela no computador,** com o banco e as migrations, `pnpm dev` sobe a API na 8000 e o site na 3001, com o `API_URL` em `http://localhost:8000`. A folha da newsletter fica no fim da página inicial. Sem a chave do Resend, a inscrição responde `aguardando_edicao`, e, com uma edição `publicada` no banco, `envio_indisponivel`. Para abrir a página de sair, use o link da API, `http://localhost:8000/newsletter/saida/<codigo>`, com o `codigo_saida` de um inscrito fictício. O navegador vai para `/newsletter/sair?codigo=<codigo>`, e o botão apaga a inscrição. As edições ficam em `http://localhost:3001/edicoes`: sem edição `publicada` no banco, a lista diz que a primeira ainda não saiu.

Os testes da newsletter usam o banco de teste e chamadas HTTP simuladas, sem chave nem e-mail real. Em `apps/backend`, com `TEST_DATABASE_URL` explícito, rode `uv run pytest tests/test_inscricao.py tests/test_limite_inscricao.py tests/test_email.py tests/test_resend.py`.

## Newsletter: envio e leitura pública

- `edicao enviar [ID] [--simular] [--limite N] [--publicada-desde AAAA-MM-DD]` usa somente edição publicada; sem ID, fixa a última por `(publicada_em, id)`. Simular não usa chave, rede nem escrita. O `--limite N` limita os destinatários tentados (`--limite 30` tenta até 30 destinatários). `--publicada-desde 2026-11-16` só aceita edição publicada desde meia-noite dessa data em Brasília. A saída é JSON só com contagens e o id da edição: 0 concluído/sem edição/simulação, 1 parcial, edição indisponível, cota ou falha operacional, 2 argumentos ou configuração inválidos.
- O único estado do envio no inscrito é `ultima_edicao_enviada_id`, a última aceitação pelo Resend, nunca confirmação de entrega. A atualização condicional só avança pela ordem de publicação. A reinscrição devolve as mesmas situações e não reenvia uma edição já aceita, mesmo depois de 24 horas. Sair apaga a linha e esse estado; não há histórico de entrega por pessoa.
- A mesma chave `inscricao/{id}/edicao/{id}` e o mesmo corpo cobrem concorrência e a queda entre aceite e commit por 24 horas. **Limite aceito:** se houver queda nesse intervalo entre aceite e commit e a retomada ocorrer depois de 24 horas, a pessoa pode receber a edição duas vezes; priorizamos tentar enviar de novo. Não acrescentar estado de tentativa, bloqueio permanente ou histórico para eliminar esse risco. [Idempotência do Resend](https://resend.com/docs/dashboard/emails/idempotency-keys).
- Enviar em sequência, um destinatário novo por segundo, com o orçamento, backoff e `Retry-After` do adaptador. Quota diária/mensal, chave inválida (inclusive mal formada), domínio inválido ou campo obrigatório ausente param a rodada na primeira falha. Uma ou duas recusas individuais e o 409 concorrente deixam os demais seguir; três recusas seguidas param como falha geral, contando as três em `recusados` e uma em `falhas_gerais`, com saída 1. Isso sinaliza erro na chave ou no remetente: conferir `RESEND_API_KEY` e `RESEND_FROM` e retomar pelo mesmo ID. Qualquer resultado que não seja recusa individual zera a sequência. Os pendentes ficam para a retomada, inclusive os não tentados. Recusas não ficam no banco; as supressões do Resend continuam valendo. Reconsultar o inscrito antes do HTTP e não recriar quem saiu. Quem sai antes da verificação do destinatário é pulado. Uma mensagem já aceita ou em voo pode chegar depois da saída.
- Os registros do Actions são públicos: `scripts/tarefas.py` suprime o logging durante o envio e restaura o estado anterior no fim, inclusive em falha. Só sai o JSON de contagens/id; nem logs do HTTP, banco ou provedor podem publicar destinatário, código de saída, corpo ou exceção bruta.

### Envio da edição publicada

**Envio da edição publicada.** Em `apps/backend`, com `DATABASE_URL` autorizado e migrations aplicadas, confira primeiro sem enviar nem gravar:

```powershell
uv run mandatometro edicao enviar --simular
uv run mandatometro edicao enviar 1 --simular
```

Para o envio real, com Resend e os endereços HTTPS configurados, use `uv run mandatometro edicao enviar 1`. Uma edição anterior não é reenviada a quem já recebeu uma mais recente. O conteúdo, o assunto e os links são iguais aos da inscrição.

A prévia de `edicao mostrar` e o e-mail, em texto e HTML, usam a mesma ordem de leitura. Se houver votações e atos, sai primeiro **O que o Congresso votou**, depois **O que saiu no Diário Oficial**. Dentro de cada seção vale a ordem salva na revisão. A edição só com votações segue direto para os itens, como as edições antigas. A edição só com atos abre com o título do Diário Oficial. Cada item leva a fonte oficial e a data da coleta.

O JSON mostra `edicao_id`, `aceitos_nesta_execucao`, `ja_atualizados` no início e `faltam` ao final, além das contagens de falhas, sem identificar pessoas. A rodada fixa o maior id de inscrição inicial: quem entra depois recebe pela inscrição e, se ela falhar, entra numa próxima rodada. Banco indisponível na contagem final omite `faltam` e sinaliza `contagem_indisponivel`, sem inventar um total.

O [guia de hospedagem](hospedagem.md#ativar-e-recuperar-o-envio-de-domingo) descreve a agenda, o disparo manual e a retomada depois da renovação da cota.

### Leitura pública das edições

**Leitura pública das edições.** `GET /edicoes?limite=20&deslocamento=0` retorna `{edicoes, total, limite, deslocamento}` (limite de 1 a 100), da publicação mais recente para a mais antiga, com desempate por id decrescente. Cada resumo traz `id`, `titulo`, `inicio`, `fim` e `publicada_em`. `GET /edicoes/{id}` acrescenta os itens na ordem editorial, com `ordem`, `tipo`, `titulo`, `texto` puro, `fatos`, `fontes` e `artigo`. O `tipo` vale `ato` para os fatos de um ato do Diário Oficial e `votacao` para os demais itens, inclusive aqueles gravados antes dos fatos por votação.

Nos fatos públicos, cada votação traz seu id interno (`id`), data, resultado, placar ou nulo e suas fontes. O id vem da fotografia gravada no item e permite consultar a lista nominal em `GET /votacoes/{id}`. Se a votação sair do banco, essa consulta responde 404 e a edição continua abrindo com o id e o placar publicados. Os ids de item, proposição e fonte ficam fora dessa resposta pública.

Cada fonte traz `url`, `coletado_em` e `trecho` ou nulo; o artigo traz `titulo` e `caminho` do catálogo ou é nulo. Placar nulo significa indisponível, não zero nem modalidade; presidência fica separada. O legado continua com fatos/artigo nulos. Rascunho e inexistente respondem o mesmo 404; dados inválidos, 422; banco ou fotografia inválida, 503, sem conteúdo parcial. A API não devolve a origem do texto, pendências de revisão, versão interna nem estado de envio. O id da edição serve à navegação. Carregue também as fontes de `fatos.fontes`.

Pelo id de cada votação, a API acrescenta `temas` com os identificadores e nomes atuais do catálogo. O texto, os fatos e as fontes vêm da fotografia publicada. Uma votação sem tema ou removida do banco tem `temas: []`. O comando `--somente-temas` grava associações e fontes temáticas à parte, por isso o rascunho revisado pode seguir para publicação depois do preenchimento. [Conversão dos temas](dicionario-de-dados.md#temas-das-proposições-e-das-votações)

Os fatos públicos de um ato trazem `data_publicacao` e `votacoes: []`. A primeira fonte é a página oficial registrada em `fonte.url_publica`. O trecho vem nulo para atos na API e fica fora da prévia e do e-mail. O motivo da seleção e a origem da ordem ficam na revisão.

No site, `/edicoes` lista as publicadas, 20 por página (`?pagina=2`), e `/edicoes/<id>` agrupa os itens pelo `tipo`, com a mesma ordem e os mesmos títulos da prévia e do e-mail. O índice e a folha numeram os itens pela ordem de leitura. Os links usam `item-N`, com o `N` da ordem gravada na revisão. O servidor do site lê a API pelas funções de `apps/web/src/lib/edicoes/` e manda a página pronta no HTML. Sem o `API_URL` no build, as duas páginas dizem que as edições não aparecem naquele endereço, e o cabeçalho e a página inicial não falam delas. Com a API fora do ar, sem resposta em 8 segundos ou com uma resposta de outra forma, o site mostra a página de erro, com HTTP 500, e registra só uma linha fixa, com o motivo curto (`[edicoes] A leitura das edições na API falhou: http-503.`). O 404 e o 422 da API e a página depois da última dão a página não encontrada. O "Fonte oficial" de cada item é o primeiro endereço que a API manda.
