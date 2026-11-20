# ADR 0003: o login entra no MVP e é opcional

- **Data:** 16/11/2026
- **Status:** aceita

## Contexto

O [ADR 0002](0002-mvp.md), de 08/11, deixou o login para depois do MVP. Sem ele, o navegador guarda os artigos lidos, e o progresso não passa de um aparelho para outro. O ADR dizia que o login voltaria se o piloto mostrasse que isso faz falta (#30).

Em 15/11/2026, o Renan confirmou o que o time tinha combinado: o login (#109), o cadastro (#110), o progresso no perfil (#111) e o termo de consentimento (#112) entram no MVP. Em 16/11, ele decidiu que o login é opcional.

## Decisão

- **O login entra no MVP e é opcional.** Sem conta, tudo continua funcionando: ler as trilhas, responder o quiz e assinar a newsletter. O navegador guarda os artigos lidos, como hoje.
- **A conta serve para guardar o progresso no perfil,** para ele passar de um aparelho para outro (#111). É a falta que o ADR 0002 apontava, e quem não quer conta continua com o progresso no navegador.
- **O cadastro pede nome completo, e-mail e senha** (#110). Gênero, estado e data de nascimento são opcionais.
- **O cadastro tem um termo de consentimento** (#112).

## Consequências

- **A conta traz dado pessoal novo.** Até aqui, o banco só guardava, de quem usa o site, o e-mail de quem assina a newsletter. Com a conta, ele guarda também o nome, o e-mail, a senha e os campos opcionais de quem se cadastra, e o progresso no perfil fica ligado a essa pessoa.
- **A regra desses dados** cobre o que a API entrega à própria pessoa e o que os serviços usam para manter a conta. Os registros de erro omitem os dados da conta, e os de acesso podem registrar o IP do pedido. A senha é guardada na forma de um hash. Nos testes, os dados da conta são inventados. [Inscrição e conta](../dados-pessoais.md#inscrição-e-conta)
- **Na demo,** o login e o perfil não podem expor dados pessoais reais de terceiros (regulamento do hackathon, item 6.9).
- **O banco recebe mais do que as inscrições.** O [ADR 0001](0001-stack.md) diz que a API só lê o banco e recebe inscrições. Com a conta, o banco guarda também as contas e o progresso no perfil.
- **Nada pede conta,** e o princípio "Simples de verdade" do [`PRODUCT.md`](../../PRODUCT.md) continua: sem barreira de entrada. O piloto (#40) não pede nome nem e-mail, e com o login opcional ele roda sem conta.

## Decisões da #110

Gênero, estado e nascimento são opcionais e servem para entender o público. O cadastro aceita todas as idades. A pessoa aceita a versão vigente do termo. Assinar a newsletter é uma escolha separada.

O Resend envia os links de confirmação e recuperação. Abrir um link mostra a tela da operação. A pessoa confirma o e-mail ou define a nova senha no formulário. Redefinir a senha encerra as sessões.

Para excluir a conta, a pessoa entra e confirma a senha atual. A exclusão remove as credenciais e o progresso associado e gera um comprovante por e-mail. A inscrição na newsletter é independente. O quiz continua anônimo.

## Decisões da #112

Em 20/11/2026, o Renan decidiu que a conta é para quem tem 12 anos ou mais, no lugar de "O cadastro aceita todas as idades", da #110. Para quem tem menos de 12, a LGPD pede a autorização de quem é responsável (art. 14, § 1º), e o site não tem como recebê-la. A caixa de aceite do cadastro diz "Tenho 12 anos ou mais e li e aceito o termo de consentimento.". A API não muda, e o site não confere a data de nascimento.

O termo fica na página pública `/termo`. A rota serve o texto sem loader nem pedido à API e abre sem conta e sem JavaScript. No navegador com API configurada e sessão anotada, a moldura consulta o progresso da conta, como nas outras páginas. O rodapé de todas as páginas leva até ela. Quem responde pelos dados das contas é o Renan, pelo time, e o contato do termo é o `contato@mandatometro.com.br`.

A versão do termo é a data do texto e fica em `VERSAO_DO_TERMO`, em `apps/web/src/lib/termo.ts`. Na troca de versão, a API recebe a nova `CONTA_TERMO_VERSAO` e é publicada primeiro. O cadastro fica fechado para novas abas, e a API recusa a versão antiga com `409` se uma aba já aberta tentar enviar. O cadastro reabre com a publicação do site com o texto e a versão novos. [Quando o texto do termo mudar](../hospedagem.md#quando-o-texto-do-termo-mudar)
