# Dados pessoais

O regulamento do hackathon (item 6.9) proíbe a demo de expor dados pessoais reais de terceiros.

## Parlamentares e candidatos

Desde a decisão de 21/11/2026, CPF, título de eleitor e data de nascimento de parlamentares e candidatos servem só para ligar registros entre bases e ficam apenas na memória durante a carga, quando necessários. O conector do TSE usa o CPF para confirmar a ligação entre eleições. A coleta da Câmara descarta `cpf` e `dataNascimento` de `/deputados/{id}`.

A API, o front, os logs e os fixtures de teste identificam pessoas pelo id interno.

A API do detalhe devolve o endereço da foto oficial com o crédito da Casa. O endereço é derivado do código oficial já cadastrado. A foto e seu endereço ficam fora do banco, e o navegador de quem visita pede o arquivo diretamente à Casa. [Foto oficial no dicionário de dados](dicionario-de-dados.md#foto-oficial-do-parlamentar)

O banco recebe candidaturas com par único entre os parlamentares em exercício, ligadas pelo id interno. A carga guarda o nome de urna para essas candidaturas. Nome civil, documentos, nascimento e demais dados de cadastro ficam fora da tabela de candidaturas. Os resumos e logs trazem contagens, e as fixtures do TSE usam dados inventados. Veja os [campos pessoais das fontes](dicionario-de-dados.md#campos-pessoais).

A carga de bens refaz a ligação de 2022 e 2026 em memória, com nome de urna e nome civil, para confirmar as âncoras. Ela usa só o CPF para ligar as outras eleições e conferir a identidade do histórico gravado. O CPF e os nomes do CSV ficam na memória da execução. O banco recebe a chave oficial da candidatura, o código de cargo, a UF, as fontes e o total nominal por código de bem. A carga descarta a descrição livre de cada bem e usa rótulos fixos no código. A API entrega o total por eleição com a fonte. Logs e resumos trazem apenas contagens e códigos de falha. [Bens declarados ao TSE](dicionario-de-dados.md#bens-declarados-ao-tse)

## Ausências e afastamentos

Motivo de ausência fica fora do banco, para a licença saúde não ser deduzida: toda ausência do Senado (AP, LS, MIS, NCom, LAP, LP e as que entrarem em `CODIGOS_DE_AUSENCIA`) entra como `nao_votou`, sem o código, igual às outras, e o motivo de afastamento do senador não é gravado. O voto só guarda os códigos de voto e de presença de `CODIGOS_GRAVADOS` em `valor_bruto`, o que o CHECK do banco garante, e um código novo entra como `outro`, sem o código. O banco guarda `P-NRV`, de quem estava presente. O log também não leva o código nem a pessoa, porque o log junto com o banco apontaria quem recebeu um código que pode ser de saúde: a coleta (#10 e #11) registra a votação e quantos códigos desconhecidos vieram nela, e quem for classificar o código o lê na fonte pública.

A API usa o valor normalizado (`voto.valor`) no histórico e na contagem de votos do parlamentar, na lista nominal da votação e nos placares. Na lista nominal, cada voto traz o id interno e o nome do parlamentar, com o partido e a UF registrados no dia do voto.

## Atos do Diário Oficial

Antes do modelo, o filtro retém atos da seção 2 e atos com rótulo de pessoal ou padrões de documento, como CPF e matrícula. No título e na ementa, procura palavras do vocabulário de atos de pessoal e sinais como duas ou mais palavras com inicial maiúscula compatíveis com um nome ou indicação de lista nominal. Um título ou uma ementa em caixa alta com termo do vocabulário também retém o ato. Só os atos elegíveis seguem para a seleção pelo modelo. O resumo do rascunho informa o id interno e o código de cada ato retido. Para um item que já está na edição, a revisão usa o número do item e o código. Testes e fixtures usam atos e dados pessoais inteiramente inventados.

O sinal de nome pode falhar com texto todo em minúsculas, nome de uma palavra só ou nome misturado ao de uma instituição. Vocabulário diferente e dados presentes apenas no inteiro teor ou no endereço da fonte também podem escapar do filtro. Um número de processo com 11 dígitos corridos pode ser retido pelo padrão de CPF. A revisão humana de cada item de ato, inclusive dos elegíveis, é a barreira antes da publicação.

O título e a ementa oficiais ficam na tabela `ato`. Confira o título, a explicação e o endereço da fonte no arquivo de revisão antes de decidir se exclui o item ou se o mantém com redação própria. O item 6.9 do regulamento do hackathon proíbe expor dados pessoais reais de terceiros na demo. [Revisão dos atos](newsletter.md#como-preparar-a-edição)

## Inscrição e conta

A newsletter pede só o e-mail, que fica no banco e só sai para o envio. Site, API, logs e fixtures de teste identificam a inscrição pelo id interno.

A conta é opcional e pede nome completo, e-mail e senha. Os dados opcionais incluem a autodescrição, quando a pessoa escolhe descrever o seu gênero. Os dados da conta ficam no banco. A senha é guardada na forma de um hash, e a API entrega somente o nome, o papel e o progresso à própria pessoa. Os registros de erro omitem o nome, o e-mail, a senha e os dados opcionais. Os registros de acesso podem registrar dados do pedido, como o IP. Nos testes, os dados da conta são inventados.

A Vercel hospeda o site e a API, o Neon hospeda o banco e o Resend recebe o destinatário e a mensagem para entregar os avisos da conta. O GitHub Actions lê os avisos cifrados da fila e decifra o endereço e a mensagem para enviá-los ao Resend ao rodar **Retomar avisos de conta**. [Abrir o cadastro de contas](hospedagem.md#abrir-o-cadastro-de-contas)

O termo de consentimento, na página `/termo` do site, conta as regras desta seção a quem cria a conta: quando uma delas mudar, mude também o texto e a versão do termo, como em [Quando o texto do termo mudar](hospedagem.md#quando-o-texto-do-termo-mudar).

O papel da conta (`comum` ou `administradora`) serve para controlar o acesso à revisão de edições. A API entrega esse campo exclusivamente à própria pessoa em `GET /contas/me`, com `Cache-Control: no-store`. O papel fica fora dos logs, dos e-mails, da API pública de edições e da medição do piloto. O CLI recebe o endereço da conta e usa mensagens fixas de resultado e de erro que omitem o endereço, inclusive quando os argumentos estão fora de ordem.

O progresso das trilhas guarda a referência da conta, o id de cada artigo lido e a data e hora em que foi marcado, para a pessoa continuar de onde parou em outro aparelho. A API entrega somente a lista de ids de artigos à própria pessoa, pela sessão e com `Cache-Control: no-store`. O progresso fica fora dos logs, dos e-mails, da API pública e da medição do piloto. Desmarcar ou recomeçar apaga as marcas correspondentes. Sair limpa a cópia do navegador. Excluir a conta apaga a cópia do navegador e todas as marcas no banco.

O outro aparelho atualiza a cópia do progresso ao abrir o site, restaurar uma página pelo histórico, navegar para outra página ou voltar à aba. Navegação e visibilidade compartilham um intervalo mínimo de 30 segundos entre releituras. O navegador guarda os ids dos artigos e chaves sorteadas localmente para distinguir a sessão e as ações pendentes de cada artigo. Os marcadores de ação são consumidos com a conclusão do envio e apagados ao limpar o progresso local. Com Web Locks, a união das marcas de visitante é feita uma vez entre as abas. As ações afetadas por falha temporária ficam em memória neste documento e podem ser perdidas ao fechá-lo. A API responde `503` se a espera de 3 segundos pela trava da conta se esgotar, com mensagem fixa e `Retry-After: 3`. [Armazenamento e sincronização](codigo-do-site.md#progresso-das-trilhas)

## Painel de revisão

A rota do painel entrega à administradora o mesmo arquivo de revisão do CLI, com os textos oficiais, e só a ela. O arquivo reúne o texto editorial, as confirmações, os fatos agregados e os trechos, descrições e endereços das fontes para conferência. Nos atos do Diário Oficial, a fonte aponta para o endereço oficial e o contexto indica o código de retenção quando aplicável. A demo usa dados fictícios.

E-mail, id de conta, id de inscrito e dados da sessão ficam fora das respostas. As respostas à administradora levam `Cache-Control: no-store`. As linhas de log do painel são fixas e os erros omitem o conteúdo dos pedidos e do rascunho. [Revisão pelo painel](newsletter.md#revisão-pelo-painel)

A tela `/painel` guarda o rascunho só na memória da página, e nada dele vai para o console, o endereço, o armazenamento do navegador, o HTML do servidor ou os logs do site. Quando a API do painel responde com a recusa de acesso (`401` ou `404`), o rascunho e os ajustes locais saem da tela na hora, enquanto a guarda verifica a sessão e o papel da conta. [O painel no código do site](codigo-do-site.md#painel-de-revisão)

## Trilhas e piloto

Nenhum dado pessoal entra no texto publicado das trilhas. As trilhas não pedem dados pessoais. As respostas do quiz não identificam quem respondeu. O piloto segue o [contrato de medição](medicao-do-piloto.md#conteúdo-e-dados).

## Coleta dos destaques do Diário Oficial

A coleta admite apenas atos da seção 1, incluindo edições extras e suplementos. Atos de pessoal da seção 2 e atos da seção 3 entram na contagem de descartes. O banco guarda título e ementa para o fluxo editorial. Os campos `assina` e `cargo`, de quem assinou, e `texto`, o inteiro teor, ficam fora da gravação, dos logs, do resumo e dos erros. O uso editorial de atos que mencionam pessoas é tratado na #206. [Dicionário de dados](dicionario-de-dados.md#destaques-da-imprensa-nacional).
