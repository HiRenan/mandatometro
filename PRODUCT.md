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

- **Trilhas:** artigos curtos e, se der tempo, vídeos curtos. A principal é a do processo legislativo, sobre como nasce uma lei. Ela tem um infográfico, um quiz de múltipla escolha no meio e outro no fim.
- **Newsletter semanal, o jornal legislativo:** todo domingo, o que o Congresso votou na semana e os destaques do Diário Oficial da União, em duas seções (ADR 0004), em linguagem simples e com o link oficial de cada item. A inscrição pede só o e-mail e já manda a última edição publicada. Cada edição também fica no site.

O projeto concorre na trilha Acesso à educação do Hack Brasil 2026. O regulamento (item 5.4) exige que o problema e o público estejam dentro dessa trilha. Aprender é a função principal do site. A entrega em 30/11/2026 pede repositório público, demo no ar e vídeo de até 3 minutos.

O sucesso se mede no piloto, com cerca de 50 pessoas (uma turma do Senai e o Instagram), pelo quanto elas acertam no quiz antes e depois da trilha. O porquê do MVP está no [ADR 0002](docs/adr/0002-mvp.md); o do login opcional, no [ADR 0003](docs/adr/0003-login-opcional.md); e o do Diário Oficial na newsletter, no [ADR 0004](docs/adr/0004-newsletter-do-dou.md). As fontes dos atos estão no [ADR 0005](docs/adr/0005-legislacao-federal-na-newsletter.md) e no [ADR 0006](docs/adr/0006-destaques-do-dou.md).

## Positioning

A política explicada em linguagem simples e de forma interativa, a partir de casos reais e recentes do Congresso. As trilhas ensinam as regras, e a newsletter mostra a semana no Congresso e os destaques do Diário Oficial. O lema: "o diário oficial político, simplificado".

## Operating Context

- **Conta opcional:** o login, o cadastro com o termo de consentimento e o progresso no perfil fazem parte do MVP (#109 a #112). Dá para ler as trilhas, responder aos quizzes e assinar a newsletter sem conta. Sem ela, o navegador guarda os artigos lidos; com ela, o progresso fica no perfil e passa de um aparelho para outro.
- **Cadastro:** os dados demográficos opcionais servem para entender o público. Confirmação e recuperação usam links com o token no fragmento e uma ação explícita na página. A exclusão exige sessão e senha atual e gera um comprovante via Resend. O contrato de sessão está no [README, em "Cadastro de contas"](README.md#cadastro-de-contas).
- **Dados:** Câmara e Senado, com deputados federais e senadores do Brasil todo e Santa Catarina como amostra para testar cada etapa primeiro.
- **Textos das trilhas.** Cada mudança em Markdown vira um PR, que também é a revisão do conteúdo. O formato está no [guia de conteúdo das trilhas](docs/conteudo-das-trilhas.md).
- **Edição da semana.** As votações vêm da coleta diária da Câmara e do Senado. Os atos vêm da legislação federal nos dados abertos do Senado (ADR 0005) e dos destaques do Diário Oficial (ADR 0006). A agenda de sábado prepara o rascunho.
- **Revisão da edição.** No painel (`/painel`), quem tem uma conta administradora confere os itens e as fontes, ajusta os textos e publica a edição. O [guia da newsletter](docs/newsletter.md) descreve a redação, a revisão e o envio.
- **As páginas aparecem no Google e têm prévia de link no WhatsApp** (ADR 0001).

## Capabilities and Constraints

- **MVP:** as trilhas (artigos, infográfico e quiz), a newsletter semanal com as edições no site, a conta opcional e as páginas dos parlamentares e das votações: os deputados e os senadores de cada estado, como cada um votou, o patrimônio que cada um declarou ao TSE e quem votou como em cada votação (Renan, 21/11/2026), e a foto oficial de cada um, com o crédito da Casa (Renan, 22/11/2026).
- **Depois do MVP:**
  - nas páginas de cada parlamentar, as promessas e os atos;
  - o "fake ou fato";
  - o jogo das comissões.
- **Sem pontos, ranking nem certificado.** O quiz mostra a resposta certa e a fonte, sem nota.
- O produto fala de pessoas reais. Estas regras valem para a interface, as trilhas, o quiz, a newsletter, a API e os prompts do LLM.
- **Fonte em tudo:** cada afirmação sobre um político ou uma votação leva o link oficial, a data da coleta e, quando vier de texto, o trecho literal. O que não tem fonte fica fora do banco, do site e da newsletter.
- **Neutro e apartidário:** o texto descreve o que o dado mostra e deixa o julgamento para o leitor, com os mesmos critérios para todos os partidos e parlamentares. Cada explicação leva a fonte oficial (lei, regimento ou página da Câmara, do Senado ou do TSE). O quiz pergunta sobre fatos e regras e nunca dá nota a político ou partido.
- **Promessas e patrimônio:** a ligação entre promessa e ato tem um destes status: `ato a favor`, `ato contra` ou `nenhum ato encontrado`. Deputado e senador não são obrigados a entregar proposta ao TSE (só prefeito, governador e presidente): sem promessa, escreva "Não encontramos promessas públicas nas fontes consultadas" e liste as fontes. O patrimônio se chama "patrimônio declarado ao TSE" e vem primeiro pelo valor declarado, com a escolha de ver cada total corrigido pelo IPCA, em reais de hoje (Renan, 23/11/2026). Ele traz o aviso de que o valor declarado costuma ser o de compra e aparece só nos anos em que a pessoa concorreu, em tom descritivo. Cada eleição também diz o resultado e a diferença para a anterior em reais de hoje, com o percentual só quando a anterior passa de R$ 50 mil e o aviso de que a diferença, sozinha, não diz por quê (Renan, 22/11/2026).
- **Dados pessoais.** A coleta, a conta, a newsletter e o quiz seguem as regras de [dados pessoais](docs/dados-pessoais.md).
- **Termos:** trilha, artigo, quiz, edição, inscrito, proposição, votação e parlamentar. O texto para o usuário é em pt-BR.

## Brand Commitments

- **Nome:** Mandatômetro, com acento.
- **Lema:** "o diário oficial político, simplificado".
- **Voz de professor paciente:** explica passo a passo, trata a pessoa por "você" e dá o exemplo antes da regra, sem perder o tom neutro (Renan, 09/11/2026).
- **Logo:** ainda não existe; o time vai fazer depois (Renan, 09/11/2026). Nenhuma tela inventa um logo.

## Evidence on Hand

- **O site tem quatro trilhas e 28 artigos.** Os textos ficam em Markdown na pasta `apps/web/conteudo/trilhas/`.
- **A pesquisa sobre o que o eleitor sabe de política está no `docs/problema.md`.** Nenhuma tela afirma números sobre o eleitor sem essa fonte.
- **O piloto ainda não aconteceu (#40).** Não há depoimentos, números de uso nem resultados para mostrar.

## Product Principles

1. **Aprender vem primeiro:** cada tela ajuda a pessoa a entender um passo da política, e o resto serve a isso.
2. **Tudo conferível:** nenhuma explicação sem a fonte oficial.
3. **Sem lado:** os mesmos critérios para todos, e quem tira a conclusão é o leitor.
4. **Simples de verdade:** linguagem do dia a dia, artigos curtos e sem barreira de entrada: nada pede conta.
5. **Interativo para fixar:** o quiz, o infográfico e o progresso existem para a pessoa aprender, nunca para pontuar.

## Accessibility & Inclusion

- **Celular e computador:** o site é legível no celular, a partir de 360 px de largura, e no computador.
- **Teclado e leitor de tela:** títulos em ordem, links com nome e foco visível.
- **Infográficos:** têm o texto acessível para leitor de tela (#38).
