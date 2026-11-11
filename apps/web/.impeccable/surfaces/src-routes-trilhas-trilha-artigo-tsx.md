---
version: 1
slug: "src-routes-trilhas-trilha-artigo-tsx"
primary_target: "src/routes/trilhas/$trilha/$artigo.tsx"
related_targets: ["src/routes/trilhas/index.tsx","src/routes/trilhas/$trilha/index.tsx"]
---

# Trilhas e artigos

**Modo:** Read. **Alvos:** `/trilhas`, `/trilhas/<trilha>` e `/trilhas/<trilha>/<artigo>`, mais o cabeçalho do site e a página de não encontrado. **Tarefas:** a #36, as páginas das trilhas e dos artigos, com o progresso salvo no navegador, pedida pelo Renan em 09/11/2026; a #38, o infográfico do caminho de um projeto de lei e o lado direito da trilha e da lista das trilhas em tela larga, decididos com o Renan em 10/11/2026; e a troca do X do lido pelo visto, decidida com o Renan em 11/11/2026.

## Job and audience

- **Quem lê:** eleitores de 20 a 40 anos, no celular e no computador, na mesma medida (`PRODUCT.md`).
- **O que a pessoa faz:**
  - entende, num artigo curto, um passo de como nasce uma lei;
  - confere a fonte oficial;
  - segue para o próximo ou volta outro dia de onde parou, sem conta.

## Outcome and proof

- **Logo de cara, no artigo** (Renan: "Onde está na trilha, Quanto tempo leva, Que tudo tem fonte"):
  - o número do artigo na trilha;
  - o tempo de leitura;
  - o aviso de que cada explicação tem a fonte oficial, listada no fim.
- **Lido** (Renan: "Ao chegar ao fim do texto"): o artigo conta como lido quando o fim do texto aparece na tela. A trilha e a lista mostram o lido depois de recarregar, sem login e sem rede.
- **Continuar:** o "continuar de onde parou" leva ao primeiro artigo não lido; com todos lidos, a trilha diz que terminou.

## Selected direction

- **A folhinha de parede,** a direção sorteada, escolhida pelo Renan na página de decisão em 09/11/2026 ("escolhi, o primeiro ali"). Ela concorreu com a Constituição grifada (a escolha do Impeccable), o manual com abas (desafiante competitivo) e o padrão da categoria.
- **As cores:** o Renan pediu "quero algo mais de cor voltado para Brasil sabe?" e "me proponha cores tbm". Entre ipê e mata, bandeira, fitas do Bonfim e pau-brasil, ele escolheu as fitas do Bonfim. O kraft e o vermelho de domingo da folhinha viraram a moldura preta e a tira de fitas.
- **O que fica errado** (Renan: "Site do governo, Coisa de criança, Jornal partidário"): burocracia e letra pequena, cor demais e tom infantil, manchete gritando e cor de partido.

## Scope and boundaries

- **Dentro:**
  - as três rotas;
  - o cabeçalho com o link Trilhas;
  - a página de não encontrado, com status 404;
  - o tema do site (`globals.css` e o `<html>`).
- **Fora, sem marcador nem esboço:**
  - o quiz (#37), que vai entrar na coluna da esquerda da trilha, depois da 3ª folha e no fim;
  - a página inicial (#35), a inscrição (#21) e as edições (#39);
  - o login (#30) e a API.

## A #38: o caminho e o lado direito

- **O pedido:** a issue #38 pede um infográfico com o caminho de um projeto de lei (apresentação, comissões, plenário, a outra Casa, sanção ou veto), com a fonte, dentro da trilha. O Renan juntou a isso o vazio da tela larga: "ficou muito espaço no lado direito em aberto, como se não tivesse nada".
- **As respostas do Renan (shape, 10/11/2026):**
  - onde o infográfico entra: "Ao lado das folhas (Recomendado)";
  - quanto detalhe: "5 passos e os desvios (Recomendado)";
  - o lado direito de /trilhas: "As folhas de cada trilha (Recomendado)".
- **A trilha, a partir de 1024 px:** duas colunas. À esquerda, o título, o resumo, o progresso, o "Continuar" e as folhas, como antes; à direita, na altura do título, "O caminho de um projeto de lei", numa coluna de 21rem (24rem a partir de 1280 px e 28rem a partir de 1440 px). Abaixo de 1024 px, o caminho vem depois das folhas, que é também a ordem do HTML. Uma trilha sem `infografico.md` fica com uma coluna só.
- **O caminho:** os passos em pé, sem número, para não confundir com o número das folhas. Uma linha cheia de 2 px liga os quadradinhos de tinta de cada passo; os desvios começam com "Se" e saem da linha por um traço tracejado até um quadradinho vazado: a linha cheia é o caminho completo; a tracejada, o que pode mudar o caminho. No último passo, a linha desce só até o último desvio. Cada passo tem o texto em serifa, os artigos da trilha que o explicam (com a fita curta da folha, de V raso) e as fontes, com a data da consulta embaixo delas. Tudo é texto numa lista ordenada, e as listas têm `role="list"`; a linha e os quadradinhos são desenho, fora do leitor de tela. Os links dos artigos e das fontes têm 45,4 px de área de toque em cada linha, e o anel de foco contorna o texto, com papel entre ele e a linha vizinha (as fontes têm entrelinha de 1.75). Nas cores forçadas do Windows, a linha e os quadradinhos cheios ficam na cor do texto. Sem movimento.
- **A lista das trilhas, a partir de 1024 px:** cada trilha ganha, à direita, as folhas dela (a fita, o número, o título, o visto no lido e o "Lido · 2 min"), com as fitas penduradas da linha que abre a trilha. As folhas em miniatura ficam só abaixo de 1024 px, e a frase do progresso continua à esquerda.
- **Não mudam:** o artigo e o celular da lista das trilhas.
- **A correção da revisão do Argos (10/11/2026),** nas respostas do Renan:
  - a legenda e o desvio das comissões: "Texto do Argos (Recomendado)". A legenda chama a linha cheia de caminho completo, e o desvio das comissões diz que a maioria dos projetos da Câmara não vai ao plenário;
  - os ajustes pequenos (alto contraste, listas no Safari, área de toque e foco dos links, e a leitura que recusa repetição): "Sim, junto (Recomendado)";
  - o tamanho do caminho e a saída no fim do caminho no celular: "Deixar para depois (Recomendado)";
  - o salto de 1024 a 1280 px: "Aceitar e registrar (Recomendado)".
- **Limitação aceita no plano:** numa tela larga, o caminho fica mais alto que as três folhas (2.252 px contra 1.076 px a 1440 px, depois da correção da revisão). A coluna da esquerda cresce com o quiz e com novos artigos.

## O visto no lugar do X (11/11/2026)

- **O pedido:** o Pedro sugeriu trocar o X em cima do número do artigo, e o Renan pediu outra forma de mostrar que a pessoa leu: "um X grande n faz sentido". O X lia como "errado" ou "cancelado", ainda mais num site com quiz, e tapava o número.
- **As opções, vistas no site de verdade:** o visto feito à mão, no canto do número; uma etiqueta "Lido" ao lado do número; e o número vazado, só com o contorno. O Renan escolheu "A · Visto (Recomendado)".
- **O que mudou:**
  - o visto fica no canto de cima, à direita, do número da folha, e o número continua legível;
  - na miniatura, ele fica por cima da borda do quadrado;
  - ao lado de "Você leu este artigo.", ele fica no lugar do X;
  - a palavra "Lido" continua na linha de estado.
- **O traço:** um só, como o do professor no caderno, em tinta sobre um traço de papel mais largo, que o separa do algarismo e da borda. O desenho de 400 ms continua o único movimento das páginas: a perna curta sai devagar e a longa vai num golpe só.
- **Não mudam:** o canto dobrado, as palavras de estado, o "Desmarcar" e o "Desfazer".

## States and copy

- **Progresso:**
  - antes da hidratação, a página não sabe o progresso e mostra a trilha como nova;
  - depois, "Você leu 1 de 3", "Continuar de onde parou" e "Você terminou a trilha";
  - de 1024 a 1280 px, quando o "Recomeçar a trilha" aparece, ele não cabe ao lado do botão e quebra a linha, e a lista das folhas desce até 40 px (68 px a 1024 px com dois artigos lidos). O Renan aceitou esse salto em 10/11/2026.
- **No artigo:** o "Você leu este artigo" aparece ao chegar ao fim do texto. A navegação traz o anterior e o próximo, e no último, a volta à trilha.

## Unresolved decisions

- **A domingueira das edições (#39):** a cor e o lugar dos domingos ficam para a issue das edições.
- **O logo:** vem depois. Até lá, o nome em texto faz o papel da marca.
- **O tamanho do caminho e a saída no celular:** o caminho tem mais palavras que um artigo e não se vê inteiro de uma olhada, e no celular ele termina sem uma ação para seguir na trilha. Os dois ficam para depois do piloto, por decisão do Renan (10/11/2026).

## Direction contract

THESIS: A trilha é uma folhinha de parede. Cada artigo é uma folha do bloco: o número grande diz onde a pessoa está, e a folha lida leva um visto feito à mão, como o do professor no caderno. Recusa o site educativo de cards arredondados com barra de progresso.

OWN-WORLD:
- **Papel e tinta:** papel branco e tinta preta.
- **A moldura:** o cartão da folhinha é uma faixa preta com o nome e o lema. Logo abaixo, no lugar do picote, vem a tira das fitas do Bonfim: verde #00A650, amarelo #FFD200, azul #0067B1, rosa #E6007E e vermelho #E30613. Cada artigo tem a sua fita, pela ordem.
- **A letra:** numerais e títulos num grotesco condensado bem preto (Archivo); o texto corrido numa serifa de leitura (Literata).
- **As regras que vieram dos desafiantes:**
  - tintas chapadas, sem degradê nem sombra (cartaz);
  - uma grade de etiqueta só (caixas de tênis);
  - estado escrito em palavras (ciclorama);
  - nada de cards em volta dos itens (tela de demo);
  - estado é marca no papel: o visto no lido e canto dobrado onde parou (mesa de corte).

STORY:
- **O caminho:** a pessoa vê onde está, quanto tempo leva e que tudo tem fonte. Lê até o fim, segue para a próxima folha ou volta outro dia de onde parou.
- **O momento:** quando o fim do texto aparece na tela, o visto é desenhado de uma vez, num traço de 400 ms, no canto do número da folha em "Nesta trilha" e ao lado de "Você leu este artigo", que surge junto. Com o movimento reduzido, o visto aparece sem animação. É o único movimento das páginas.

FIRST VIEWPORT:
- **No computador, de cima para baixo:**
  - o cartão preto com Mandatômetro, o lema, Início e Trilhas;
  - a tira de fitas;
  - o caminho Trilhas / Processo legislativo.
- **Abaixo, em três colunas:**
  - à esquerda, o número do artigo gigante, com "de 3 artigos" sublinhado na cor da fita e o miúdo (trilha, leitura, fontes);
  - no centro, o título condensado, o resumo, a linha com o tempo e o aviso das fontes, e o texto, a cerca de 64 caracteres;
  - à direita, "Nesta trilha": as folhas em ordem, cada uma com a sua fita, o visto no lido e "Você está aqui" de canto dobrado.
- **No celular:** o número encolhe para o lado do título, e "Nesta trilha" desce para depois das fontes.
- **Na trilha, no computador:** à esquerda, o título, o resumo, a linha de meta, o progresso, o "Continuar" e as folhas; à direita, na altura do título, "O caminho de um projeto de lei", com os cinco passos ligados pela linha.

FORM: a folhinha de arrancar das padarias, a 5ª da lista ordenada, com a paleta das fitas do Bonfim. seed:0b322b8c4550df91

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
