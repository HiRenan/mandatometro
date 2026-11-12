---
version: 1
slug: "src-routes-index-tsx"
primary_target: "src/routes/index.tsx"
related_targets: ["src/routes/__root.tsx","src/components/rodape.tsx"]
---

# Página inicial

**Modo:** Persuade. **Alvos:** `/` (a página inicial), o rodapé de todas as páginas, o ícone da aba e a prévia do link. **Tarefa:** a #35, decidida com o Renan em 10/11/2026.

## Job and audience

- **Quem chega:** quem vota, de 20 a 40 anos, por um link do WhatsApp ou do Instagram, na aula do Senai ou no júri do Hack Brasil (`PRODUCT.md`).
- **O que a pessoa faz:** em poucas linhas, entende o que é o Mandatômetro e para quem ele é, vê o caminho inteiro de uma lei e começa a trilha.
- **Sucesso:** a pessoa abre o primeiro artigo, pelo botão ou por uma parada do caminho.

## Outcome and proof

- **O texto** (Renan: "Um passo de cada vez (Recomendado)"):
  - o h1, um só: "Entenda a política brasileira, um passo de cada vez.";
  - a abertura, em Literata: "O Mandatômetro explica como funciona a política no Brasil, em artigos curtos e em linguagem simples. A trilha do processo legislativo mostra como uma ideia vira lei." (na #75, Renan: "Diz o nome (Recomendado)");
  - para quem, na letra da nota de `/trilhas`: "É para quem vota e quer entender o que acontece depois do voto. Cada explicação traz a fonte oficial, e você não precisa criar conta."
- **A prova:** o próprio caminho de um projeto de lei, com as cinco paradas e os artigos que explicam cada uma. As paradas sem artigo (Plenário e Sanção ou veto) levam ao passo delas no infográfico da trilha, com o texto e as fontes ("Ler este passo na trilha"). Nada de número inventado, depoimento ou logo de parceiro.
- **O botão,** o bloco de tinta com a seta, o mesmo "Continuar" da trilha: "Começar a trilha" leva ao 1º artigo, "Continuar a trilha" ao primeiro não lido e "Ver a trilha" à página da trilha. Acima dele, uma linha diz o tamanho da trilha ("3 artigos · 6 min de leitura") ou o progresso.

## Selected direction

- **O caminho de uma lei** (Renan: "O caminho de uma lei (Recomendado)"), a estrutura que o sorteio pôs na frente, contra a folha 1 e o cartão da folhinha.
- **A newsletter:** "Não fala (Recomendado)". A página não promete o que ainda não existe.
- **O rodapé:** "O projeto e o Hack Brasil (Recomendado), O código no GitHub (Recomendado), As fontes (Recomendado)", em "Cartão preto, como o cabeçalho (Recomendado)".
- **A frase do rodapé,** na correção depois da revisão (Renan, 10/11/2026: "\"foi feito para o\" (Recomendado)"): "O Mandatômetro foi feito para o Hack Brasil 2026, na trilha Acesso à educação."
- **O botão no celular,** na mesma correção (Renan: "Botão mais acima (Recomendado)"): abaixo de 768 px, o "para quem" vem depois do botão, para o botão caber na primeira tela; a partir do md, a ordem não muda. O leitor de tela e o Tab seguem a ordem da tela em cada largura.
- **O ícone e a prévia:** "O M no cartão preto (Recomendado)". O M é a letra do nome, não um logo, e troca quando o logo vier.
- **Detalhes aprovados com o plano:**
  - de 1280 px para cima, o título fica à esquerda, e o texto e o botão à direita;
  - embaixo do caminho, a frase "A linha mostra o caminho completo. Os desvios, como a comissão que decide sem o plenário, estão na trilha, com as fontes oficiais.", com o link "Ver o caminho na trilha" para `/trilhas/processo-legislativo#caminho`. Sem ela, a linha cheia sugere que todo projeto passa pelo plenário;
  - a aba: "Mandatômetro · o diário oficial político, simplificado"; o título da prévia: "Mandatômetro: entenda a política brasileira, um passo de cada vez"; a descrição: "Entenda a política brasileira, um passo de cada vez, em artigos curtos e em linguagem simples, com a fonte oficial em cada explicação.";
  - quem terminou a trilha vê "Você terminou a trilha." e o botão "Ver a trilha".

## Scope and boundaries

- **Dentro:**
  - a rota `/`;
  - o rodapé, no `Documento` do `__root.tsx`, em todas as páginas, inclusive a 404 e a de erro;
  - o ícone da aba (`favicon.ico` e `apple-touch-icon.png`) e a prévia do link (`previa.png` e as tags do Open Graph e do Twitter);
  - as duas fontes pré-carregadas em todas as rotas.
- **Fora, sem marcador nem esboço:** a última edição e o campo de inscrição (#21 e #39), o quiz (#37), o logo, o sitemap, o deploy e o domínio (#23 e #32), e a página de erro (#45).
- **Não muda:** as páginas das trilhas, a não ser pelo rodapé e por três detalhes que não aparecem na leitura: o título de cada passo do infográfico tem um id (`passo-plenario`) e 32 px de respiro na rolagem, para a página inicial levar até ele; o botão "Continuar" tem uma borda que só aparece nas cores forçadas; e, depois de uma navegação para um endereço com trecho (`#caminho`), o foco vai para o trecho.

## A #48: a letra grande no celular

- **O pedido:** com a letra do navegador a 200%, numa tela de 360 px, nenhuma página rola de lado, e o cabeçalho, o título e o nome do rodapé cabem inteiros. Com a letra a 100%, nada muda, pixel a pixel.
- **As respostas do Renan (harden, 11/11/2026):**
  - as margens do celular: "Ficam em 20 px (Recomendado)";
  - o respiro do cabeçalho: "Espaço de hoje (Recomendado)";
  - os títulos e o nome: "Teto (Recomendado)";
  - os dois achados do anel de foco da revisão do PR #47 (10 e 11/11/2026): "Junto na #48 (Recomendado)".
- **Nesta página:** o h1 cresce com a letra até "brasileira," encostar nas margens. A 360 px com a letra a 200%, ele fica com 84 px (o dobro seria 88 px). A abertura e o resto do texto dobram.
- **No rodapé:** o nome tem o teto do nome do cabeçalho (57 px, e não 64 px, a 360 px com a letra a 200%), e a grade de dentro tem uma coluna que não alarga abaixo do lg.
- **O foco:** o "Ver o caminho na trilha" e o link do GitHub ficam com o anel de antes. Um link novo com a mesma classe e sem o `span` fica com o anel no próprio link. Nas cores forçadas, o anel dos links do caminho sai na cor de destaque do sistema.

## A #75: a página inicial volta à trilha do processo legislativo

- **O pedido:** o PR #74 trouxe três trilhas e pôs a do processo legislativo em 4º lugar em `/trilhas`. A página inicial, que pegava a primeira trilha da lista, passou a mostrar "A Constituição", sem o caminho. Ela volta a ser a do PR #47, e `/trilhas` fica na ordem do conteúdo.
- **As respostas do Renan (11/11/2026):**
  - a frase da abertura: "Diz o nome (Recomendado)". "A primeira trilha mostra como uma ideia vira lei." passou a "A trilha do processo legislativo mostra como uma ideia vira lei.", que não fala de ordem;
  - como a página sabe a trilha: "Pelo nome da pasta (Recomendado)". Ela procura a trilha `processo-legislativo` em qualquer posição da lista, e um teste falha se a pasta mudar de nome ou se a trilha perder o infográfico.
- **Nesta página, só a frase muda.** Ela ocupa uma linha a mais nas telas de até uns 430 px e perto de 1280 px, e o que vem embaixo desce uma linha. A 360 × 640, o botão desce 27,5 px, para 558 a 610 px, e continua inteiro na tela. Nas outras larguras medidas (de 480 a 1279 px e de 1300 a 1920 px), nada sai do lugar.

## A #76: o botão com a letra grande

- **O pedido:** com a letra a 200%, a 360 px, o "Continuar de onde parou" da trilha passava da tela quando trazia um título com "fundamentais?", das trilhas do PR #74. O botão desta página é o mesmo (`BOTAO_CONTINUAR`).
- **A resposta do Renan (harden, 11/11/2026):** "Seta no fim, respiro fixo (Recomendado)".
- **Nesta página:** com a tela abaixo de 20rem (a 360 px, com a letra acima de 18 px), a seta vem logo depois da última palavra, o respiro dos lados fica em 18 px, e as linhas ficam equilibradas: a 200%, "Começar / a trilha →", com a mesma altura de antes. Entre a palavra e a seta vai um espaço, e não uma margem: quando a seta desce sozinha, ela começa alinhada com o texto. Com a letra a 100%, o botão não muda, de 320 a 1920 px.

## States and copy

- **Antes da hidratação:** a página não sabe o progresso. Mostra "3 artigos · 6 min de leitura" acima de "Começar a trilha". A linha tem a altura reservada desde o HTML do servidor.
- **Depois:** sem progresso, nada muda. Com progresso, a frase dele entra no lugar do tamanho da trilha: "Você leu 1 de 3." com "Continuar a trilha"; "Você terminou a trilha." com "Ver a trilha". O botão não sai do lugar.
- **O caminho não guarda estado:** o progresso fica só na abertura, como no infográfico da trilha.
- **Sem a API:** a página não chama a API no navegador. O conteúdo vem dos arquivos Markdown, pelo loader.

## Unresolved decisions

- **O logo:** até ele chegar, o M do nome faz o papel do ícone, e o nome em texto faz o papel da marca.
- **A newsletter na página inicial:** entra com a #21 e a #39, quando a inscrição existir.

## Direction contract

THESIS: A página inicial mostra numa linha o caminho de uma lei, e cada parada leva à folha que a explica. Recusa o arranjo padrão da categoria: o herói com título, subtítulo e botão sobre uma fileira de três cards de "como funciona".

OWN-WORLD: a folhinha de parede do resto do site. Papel branco e tinta preta; em cima, o cartão preto com o nome e o lema e a tira das fitas do Bonfim; embaixo, o rodapé como a moldura de baixo, com a tira em cima. Títulos no grotesco condensado bem preto (Archivo), a abertura na Literata. O caminho é uma linha cheia de 2 px com quadradinhos de tinta de 14 px, e cada artigo leva a fita curta da sua cor. Sem card, sombra, degradê ou ícone decorativo.

STORY: a pessoa entende o que é o site e para quem, vê o caminho de um projeto de lei de ponta a ponta, acredita que cada passo tem uma folha curta com a fonte oficial e começa a trilha pelo botão ou por uma parada do caminho.

FIRST VIEWPORT: a 1440 × 900, de cima para baixo: o cartão preto e a tira; a abertura em duas colunas, com o h1 condensado à esquerda e, à direita, a abertura em Literata, o para quem, a linha do tamanho da trilha ou do progresso e o botão de tinta; depois, o título do caminho sobre a linha de 2 px, de lado a lado, com os cinco quadradinhos e os títulos dos passos. No celular, abaixo de 768 px, uma coluna: o h1, a abertura, a linha do tamanho da trilha ou do progresso, o botão (inteiro na tela a 360 × 640), o para quem e o caminho em pé.

FORM: o caminho de uma lei, a 3ª da lista ordenada de sete estruturas. seed:3e419800a0c98966

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
