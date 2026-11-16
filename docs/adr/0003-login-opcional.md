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
- **A regra desses dados fica no [`AGENTS.md`](../../AGENTS.md),** em "Dados pessoais". Eles servem só à conta e ficam no banco. A API, os logs e os fixtures de teste não os levam, fora a resposta à própria pessoa. A senha nunca é guardada em texto puro e não sai do banco, nem na resposta à própria pessoa. Nos testes, os dados da conta são inventados.
- **Na demo,** o login e o perfil não podem expor dados pessoais reais de terceiros (regulamento do hackathon, item 6.9).
- **O banco recebe mais do que as inscrições.** O [ADR 0001](0001-stack.md) diz que a API só lê o banco e recebe inscrições. Com a conta, o banco guarda também as contas e o progresso no perfil.
- **Nada pede conta,** e o princípio "Simples de verdade" do [`PRODUCT.md`](../../PRODUCT.md) continua: sem barreira de entrada. O piloto (#40) não pede nome nem e-mail, e com o login opcional ele roda sem conta.

## Em aberto

Fica para o time decidir:

- Para que servem os campos opcionais (gênero, estado e data de nascimento)? Sem uso definido, o mais simples é não pedir.
- Como a pessoa apaga a conta e os dados dela?
- O cadastro confirma o e-mail? Como a senha é recuperada?
- Com a pessoa logada, as respostas do quiz continuam sem identificar quem respondeu? Hoje a regra é essa, e a medição do piloto (#92) conta com ela.
