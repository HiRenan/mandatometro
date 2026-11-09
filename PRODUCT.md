# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Eleitores,** principalmente de 20 a 40 anos, a quem falta conhecimento sobre o sistema político brasileiro: como nasce uma lei, quem decide o quê e como o Congresso vota (ADR 0002).
- **Onde leem:** no celular e no computador, na mesma medida (Renan, 09/11/2026). O piloto tem os dois casos: quem chega por um link do Instagram ou do WhatsApp e uma turma do Senai, numa aula.
- **O que vêm fazer:** entender, num artigo curto, um passo de como a política funciona, conferir a fonte oficial e voltar depois de onde pararam, sem criar conta.
- **O júri do Hack Brasil 2026** também usa o site: avalia a demo, o vídeo de até 3 minutos e o repositório. Um jurado que se inscreve na newsletter no meio da semana já recebe a última edição (ADR 0002).

## Product Purpose

O Mandatômetro ensina como funciona a política brasileira, em linguagem simples e de forma interativa, a partir do que o Congresso vota (Renan, 09/11/2026). Ele tem duas partes:

- **Trilhas:** artigos curtos com infográficos e, se der tempo, vídeos curtos, com um quiz de múltipla escolha no meio e outro no fim. A primeira, e a principal, é a do processo legislativo: como nasce uma lei.
- **Newsletter semanal, o jornal legislativo:** todo domingo, o que o Congresso votou na semana, em linguagem simples e com o link oficial de cada item. Cada edição também fica no site.

O projeto concorre na trilha Acesso à educação do Hack Brasil 2026, com entrega em 30/11/2026: aprender é a função principal do site. O sucesso se mede no piloto, com cerca de 50 pessoas, pelo quanto elas acertam no quiz antes e depois da trilha.

## Positioning

A política explicada em linguagem simples e de forma interativa, a partir de casos reais e recentes do Congresso, com a fonte oficial em cada explicação: a lei, o regimento ou a página da Câmara, do Senado ou do TSE. As trilhas ensinam as regras, e a newsletter mostra o Congresso da semana. O lema: "o diário oficial político, simplificado".

## Operating Context

- **Sem conta:** o navegador guarda os artigos lidos, e o progresso não passa de um aparelho para outro.
- **Os textos das trilhas ficam em Markdown no repositório.** Mudar um texto vira um PR, que também é a revisão do conteúdo.
- **A edição da semana sai da coleta diária da Câmara e do Senado.** O LLM escreve o rascunho, e uma pessoa do time revisa antes de publicar. Os e-mails saem pelo Resend.
- **As páginas aparecem no Google e têm prévia de link no WhatsApp** (ADR 0001).

## Capabilities and Constraints

- **MVP:** as trilhas (artigos, infográfico e quiz), a newsletter semanal com as edições no site e a inscrição só com o e-mail.
- **Sem login no MVP.** O login está planejado para depois (#30). Também ficam para depois:
  - as páginas de cada parlamentar, com as promessas, os atos e o patrimônio declarado ao TSE;
  - o "fake ou fato";
  - o jogo das comissões.
- **Sem pontos, ranking nem certificado.** O quiz mostra a resposta certa e a fonte, sem nota.
- **Dados pessoais:**
  - as trilhas não pedem nada;
  - a newsletter pede só o e-mail, que fica no banco e nunca aparece no site, na API nem nos logs;
  - as respostas do quiz não identificam quem respondeu.
- **Fonte em tudo:** cada afirmação sobre um político ou uma votação leva o link oficial, a data da coleta e, quando vier de texto, o trecho literal. O que não tem fonte fica fora do site e da newsletter.
- **Neutro e apartidário:** o texto descreve o que o dado mostra e deixa o julgamento para o leitor, com os mesmos critérios para todos os partidos e parlamentares. O quiz pergunta sobre fatos e regras e nunca dá nota a político ou partido.
- **Termos:** trilha, artigo, quiz, edição, inscrito, proposição, votação e parlamentar. O texto para o usuário é em pt-BR.

## Brand Commitments

- **Nome:** Mandatômetro, com acento.
- **Lema:** "o diário oficial político, simplificado".
- **Voz de professor paciente:** explica passo a passo, trata a pessoa por "você" e dá o exemplo antes da regra, sem perder o tom neutro (Renan, 09/11/2026).
- **Logo:** ainda não existe; o time vai fazer depois (Renan, 09/11/2026). Nenhuma tela inventa um logo.

## Evidence on Hand

- **Os textos das trilhas ainda não existem.** Os tópicos saem na #31, e os artigos e as perguntas do quiz, na #34. Até lá, o site usa artigos de exemplo, com a fonte oficial real.
- **A pesquisa sobre o que o eleitor sabe de política ainda está na #33.** Nenhuma tela afirma números sobre o eleitor sem essa fonte.
- **O piloto ainda não aconteceu (#40).** Não há depoimentos, números de uso nem resultados para mostrar.

## Product Principles

1. **Aprender vem primeiro:** cada tela ajuda a pessoa a entender um passo da política, e o resto serve a isso.
2. **Tudo conferível:** nenhuma explicação sem a fonte oficial.
3. **Sem lado:** os mesmos critérios para todos, e quem tira a conclusão é o leitor.
4. **Simples de verdade:** linguagem do dia a dia, artigos curtos, sem conta e sem barreira de entrada.
5. **Interativo para fixar:** o quiz, o infográfico e o progresso existem para a pessoa aprender, nunca para pontuar.

## Accessibility & Inclusion

- **Celular e computador:** o site é legível no celular, a partir de 360 px de largura, e no computador.
- **Teclado e leitor de tela:** títulos em ordem, links com nome e foco visível.
- **Infográficos:** têm o texto acessível para leitor de tela (#38).
