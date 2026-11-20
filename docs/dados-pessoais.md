# Dados pessoais

O regulamento do hackathon (item 6.9) proíbe a demo de expor dados pessoais reais de terceiros.

## Parlamentares e candidatos

CPF, título de eleitor e data de nascimento de parlamentares e candidatos servem só para ligar registros entre bases e ficam no banco. A API, o front, os logs e os fixtures de teste identificam pessoas pelo id interno.

No MVP, a coleta descarta `cpf` e `dataNascimento` de `/deputados/{id}`. O banco ainda não tem colunas para eles. A ligação por CPF só entra com o TSE, depois do MVP (#12 e #13). Veja os [campos pessoais das fontes](dicionario-de-dados.md#campos-pessoais).

## Ausências e afastamentos

Motivo de ausência fica fora do banco, para a licença saúde não ser deduzida: toda ausência do Senado (AP, LS, MIS, NCom, LAP, LP e as que entrarem em `CODIGOS_DE_AUSENCIA`) entra como `nao_votou`, sem o código, igual às outras, e o motivo de afastamento do senador não é gravado. O voto só guarda os códigos de voto e de presença de `CODIGOS_GRAVADOS` em `valor_bruto`, o que o CHECK do banco garante, e um código novo entra como `outro`, sem o código. O banco guarda `P-NRV`, de quem estava presente. O log também não leva o código nem a pessoa, porque o log junto com o banco apontaria quem recebeu um código que pode ser de saúde: a coleta (#10 e #11) registra a votação e quantos códigos desconhecidos vieram nela, e quem for classificar o código o lê na fonte pública.

## Atos do Diário Oficial

Antes do modelo, o filtro retém atos da seção 2 e atos com rótulo de pessoal ou padrões de documento, como CPF e matrícula. No título e na ementa, procura palavras do vocabulário de atos de pessoal e sinais como duas ou mais palavras com inicial maiúscula compatíveis com um nome ou indicação de lista nominal. Um título ou uma ementa em caixa alta com termo do vocabulário também retém o ato. Só os atos elegíveis seguem para a seleção pelo modelo. O resumo do rascunho informa o id interno e o código de cada ato retido. Para um item que já está na edição, a revisão usa o número do item e o código. Testes e fixtures usam atos e dados pessoais inteiramente inventados.

O sinal de nome pode falhar com texto todo em minúsculas, nome de uma palavra só ou nome misturado ao de uma instituição. Vocabulário diferente e dados presentes apenas no inteiro teor ou no endereço da fonte também podem escapar do filtro. Um número de processo com 11 dígitos corridos pode ser retido pelo padrão de CPF. A revisão humana de cada item de ato, inclusive dos elegíveis, é a barreira antes da publicação.

O título e a ementa oficiais ficam na tabela `ato`. Confira o título, a explicação e o endereço da fonte no arquivo de revisão antes de decidir se exclui o item ou se o mantém com redação própria. O item 6.9 do regulamento do hackathon proíbe expor dados pessoais reais de terceiros na demo. [Revisão dos atos](newsletter.md#como-preparar-a-edição)

## Inscrição e conta

A newsletter pede só o e-mail, que fica no banco e só sai para o envio. Site, API, logs e fixtures de teste identificam a inscrição pelo id interno.

A conta é opcional e pede nome completo, e-mail e senha. Os dados da conta, incluindo os campos opcionais do cadastro, servem só à conta e ficam no banco: a API, os logs e os fixtures de teste não os levam, fora a resposta à própria pessoa. A senha nunca é guardada em texto puro e não sai do banco, nem na resposta à própria pessoa. Nos testes, os dados da conta são inventados.

O papel da conta (`comum` ou `administradora`) serve para controlar o acesso à revisão de edições. A API entrega esse campo exclusivamente à própria pessoa em `GET /contas/me`, com `Cache-Control: no-store`. O papel fica fora dos logs, dos e-mails, da API pública de edições e da medição do piloto. O CLI recebe o endereço da conta e usa mensagens fixas de resultado e de erro que omitem o endereço, inclusive quando os argumentos estão fora de ordem.

O progresso das trilhas guarda a referência da conta, o id de cada artigo lido e a data e hora em que foi marcado, para a pessoa continuar de onde parou em outro aparelho. A API entrega somente a lista de ids de artigos à própria pessoa, pela sessão e com `Cache-Control: no-store`. O progresso fica fora dos logs, dos e-mails, da API pública e da medição do piloto. Desmarcar ou recomeçar apaga as marcas correspondentes. Sair limpa a cópia do navegador. Excluir a conta apaga a cópia do navegador e todas as marcas no banco.

O outro aparelho atualiza a cópia do progresso ao abrir o site, restaurar uma página pelo histórico, navegar para outra página ou voltar à aba. Navegação e visibilidade compartilham um intervalo mínimo de 30 segundos entre releituras. O navegador guarda os ids dos artigos e chaves sorteadas localmente para distinguir a sessão e as ações pendentes de cada artigo. Os marcadores de ação são consumidos com a conclusão do envio e apagados ao limpar o progresso local. Com Web Locks, a união das marcas de visitante é feita uma vez entre as abas. As ações afetadas por falha temporária ficam em memória neste documento e podem ser perdidas ao fechá-lo. A API responde `503` se a espera de 3 segundos pela trava da conta se esgotar, com mensagem fixa e `Retry-After: 3`. [Armazenamento e sincronização](codigo-do-site.md#progresso-das-trilhas)

## Painel de revisão

A rota do painel entrega à administradora o mesmo arquivo de revisão do CLI, com os textos oficiais, e só a ela. O arquivo reúne o texto editorial, as confirmações, os fatos agregados e os trechos, descrições e endereços das fontes para conferência. Nos atos do Diário Oficial, a fonte aponta para o endereço oficial e o contexto indica o código de retenção quando aplicável. A demo usa dados fictícios.

E-mail, id de conta, id de inscrito e dados da sessão ficam fora das respostas. As respostas à administradora levam `Cache-Control: no-store`. As linhas de log do painel são fixas e os erros omitem o conteúdo dos pedidos e do rascunho. [Revisão pelo painel](newsletter.md#revisão-pelo-painel)

## Trilhas e piloto

Nenhum dado pessoal entra no texto publicado das trilhas. As trilhas não pedem dados pessoais. As respostas do quiz não identificam quem respondeu. O piloto segue o [contrato de medição](medicao-do-piloto.md#conteúdo-e-dados).

## Coleta dos destaques do Diário Oficial

A coleta admite apenas atos da seção 1, incluindo edições extras e suplementos. Atos de pessoal da seção 2 e atos da seção 3 entram na contagem de descartes. O banco guarda título e ementa para o fluxo editorial. Os campos `assina` e `cargo`, de quem assinou, e `texto`, o inteiro teor, ficam fora da gravação, dos logs, do resumo e dos erros. O uso editorial de atos que mencionam pessoas é tratado na #206. [Dicionário de dados](dicionario-de-dados.md#destaques-da-imprensa-nacional).
