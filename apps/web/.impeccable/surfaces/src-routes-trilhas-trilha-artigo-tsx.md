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

## A #48: a letra grande no celular

- **O pedido:** com a letra do navegador a 200%, numa tela de 360 px, nenhuma página rola de lado, e o cabeçalho e os títulos cabem inteiros. Com a letra a 100%, nada muda, pixel a pixel.
- **As respostas do Renan (harden, 11/11/2026):**
  - as margens do celular: "Ficam em 20 px (Recomendado)";
  - o respiro do cabeçalho: "Espaço de hoje (Recomendado)";
  - os títulos e o nome: "Teto (Recomendado)".
- **O cabeçalho:** com a letra a 200%, a 360 px, o nome, o lema (em duas linhas) e os links ficam um embaixo do outro, com o respiro em px, e o nome cresce até encostar nas margens. Os links Início e Trilhas têm a área de toque de antes: 44,6 × 27 e 54,8 × 27 px com a letra a 100%, e 89,2 × 49 e 109,6 × 49 px a 200%.
- **Os títulos:** o da trilha cresce até "legislativo" encostar nas margens (82 px a 200%, e não 96 px); os dos artigos, até "comissões" (79 px, e não 80 px); e o da 404, até "encontrada" (74 px, e não 80 px). O de Trilhas já cabe e dobra.
- **O número:** com a tela abaixo de 18rem (a 360 px, com a letra acima de 125%), o número sai do lado do título. No artigo, fica em cima do título. Nas folhas da trilha e em "Nesta trilha", ele fica na coluna dele, e o título desce para a linha de baixo, longe do visto da folha lida.
- **O que fica:** com a letra grande, "comissões", no título da folha 3, e "parlamentares,", no resumo dela, passam um pouco do respiro de dentro da folha, sem chegar à margem da página.

## O visto no lugar do X (11/11/2026)

- **O pedido:** o Pedro sugeriu trocar o X em cima do número do artigo, e o Renan pediu outra forma de mostrar que a pessoa leu: "um X grande n faz sentido". O X lia como "errado" ou "cancelado", ainda mais num site com quiz, e tapava o número.
- **As opções, vistas no site de verdade:** o visto feito à mão, no canto do número; uma etiqueta "Lido" ao lado do número; e o número vazado, só com o contorno. O Renan escolheu "A · Visto (Recomendado)".
- **O que mudou:**
  - o visto fica no canto de cima, à direita, do número da folha, e o número continua legível;
  - na miniatura, ele fica por cima da borda do quadrado;
  - quando os quadradinhos quebram de linha, como nas trilhas de 8 artigos no celular, as linhas ficam a 12 px uma da outra, e não mais a 6 px, para o visto de um quadradinho de baixo não chegar ao de cima. O Renan escolheu "Linhas mais afastadas (Recomendado)";
  - ao lado de "Você leu este artigo.", ele fica no lugar do X;
  - a palavra "Lido" continua na linha de estado.
- **O traço:** um só, como o do professor no caderno, em tinta sobre um traço de papel mais largo, que o separa do algarismo e da borda. O desenho de 400 ms continua o único movimento dentro das páginas (a troca de uma página para outra tem o dela, a folha arrancada): a perna curta sai devagar e a longa vai num golpe só.
- **Não mudam:** o canto dobrado, as palavras de estado, o "Desmarcar" e o "Desfazer".

## A #76: a letra grande nas trilhas do PR #74

- **O pedido:** as trilhas do PR #74, do Pedro (3 trilhas e 22 artigos), trouxeram palavras mais largas que as da #48. Com a letra do navegador grande, a 360 px, 36 de 456 medidas rolavam de lado: "fundamentais?", "Constituição" e "constitucionalidade" não cabiam nos títulos, um endereço de fonte ("direitoshumanos.dpu.def.br") alargava a lista, e o botão "Continuar de onde parou" passava da tela com um título comprido.
- **As respostas do Renan (harden, 11/11/2026):**
  - a palavra que não cabe num título: "Teto menor (Recomendado)";
  - a palavra longa no texto e no resumo: "Sem hífen (Recomendado)";
  - o endereço da fonte: "Nos pontos (Recomendado)";
  - a letra a 100%, de 320 a 351 px: "Sim, número em cima (Recomendado)";
  - o botão "Continuar de onde parou" com a letra grande: "Seta no fim, respiro fixo (Recomendado)".
- **Os títulos:** a 360 px, com a letra a 200%, o da trilha cresce até "Constituição" encostar nas margens (66 px, e não 82 px), e o do artigo, até "fundamentais?" (56 px, e não 79 px). O título da folha, o de cada trilha em `/trilhas` e os intertítulos do texto ganharam o mesmo teto: 34, 63 e 40 px. Um teste avisa quem escreve uma palavra mais larga que o teto.
- **O número:** sai do lado do título com a tela abaixo de 22rem (a 360 px, com a letra acima de 16 px). Com a letra a 100%, o desenho muda só de 320 a 351 px, onde "fundamentais?" já se partia ou passava da caixa.
- **As fontes:** o domínio quebra antes de um ponto, e a lista não alarga mais a página. Os pontos só viram lugar de quebra com a tela abaixo de 20rem; dali para cima, o endereço vai inteiro, e com a letra a 100% nada muda.
- **O botão "Continuar":** com a tela abaixo de 20rem, a seta vem logo depois da última palavra, e o respiro dos lados fica em 18 px. Com a letra a 100%, o botão não muda.
- **O que fica:** a 360 px, com a letra até 150%, nenhuma palavra se parte. A 200%, cerca de 2 por página se partem sem hífen, onde a caixa é estreita: nos títulos de "Nesta trilha", nos resumos, nas fontes e no texto de 3 artigos.

## A #87: a coluna estreita das folhas com a letra grande

- **O pedido:** com a letra a 200%, a 360 px, a fita e os recuos da folha cresciam com a letra e ocupavam 116 dos 320 px. O título da folha ficava com 34 px, menor que o resumo (36 px), e as palavras se partiam em pedaços nos resumos ("responsabili / dades") e nos títulos de "Nesta trilha" ("Constituiçã / o?"). Na entrega da #76, o Renan respondeu: "Abrir tarefa nova (Recomendado)".
- **A resposta do Renan (harden, 12/11/2026):** como a folha ganha largura com a letra grande: "Folha em px (Recomendado)". As outras opções eram "Em px, até a margem", que levava o texto até a borda da folha e mudava a letra a 100% de 320 a 351 px, e "A fita cresce", que deixava em px só o vão depois da fita e o respiro da direita.
- **O que mudou:** com a letra grande, a fita (12 px, com o V de 18 px), o recuo do texto (26 px) e o respiro da direita (20 px na trilha, mais os 12 px do título; 32 px em "Nesta trilha") ficam com os px da letra normal, e só o texto e o número crescem. A 360 px, com a letra a 200%, o título da folha vai de 34 para 44 px, e a coluna do resumo, de 228 para 274 px. Nas 4 trilhas (com o primeiro artigo lido) e nos 25 artigos, as palavras partidas nas folhas caem de 72 para 6 a 200%, e de 6 para 0 a 175%. As 6 que sobram estão nos resumos: "responsabilidades" e "compartilhadas.", mais largas que a linha. O "·" de "Continue daqui ·" volta para dentro da linha de estado.
- **Não mudam:** a letra a 100%, em nenhuma largura (os valores em px são os mesmos de antes); o canto dobrado, de 30 por 32 px; o número e o visto, que crescem com a letra; o comprimento da fita, que cresce junto do número; e os vãos de cima e de baixo, em rem.

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
- **O momento:** quando o fim do texto aparece na tela, o visto é desenhado de uma vez, num traço de 400 ms, no canto do número da folha em "Nesta trilha" e ao lado de "Você leu este artigo", que surge junto. Com o movimento reduzido, o visto aparece sem animação. É o único movimento dentro das páginas (a troca de uma página para outra tem o dela, a folha arrancada).

FIRST VIEWPORT:
- **No computador, de cima para baixo:**
  - o cartão preto com Mandatômetro, o lema, Início e Trilhas;
  - a tira de fitas;
  - o caminho Trilhas / Processo legislativo.
- **Abaixo, em três colunas:**
  - à esquerda, o número do artigo gigante, com "de 3 artigos" sublinhado na cor da fita e o miúdo (trilha, leitura, fontes);
  - no centro, o título condensado, o resumo, a linha com o tempo e o aviso das fontes, e o texto, a cerca de 64 caracteres;
  - à direita, "Nesta trilha": as folhas em ordem, cada uma com a sua fita, o visto no lido e "Você está aqui" de canto dobrado.
- **No celular:** o número encolhe para o lado do título, e "Nesta trilha" desce para depois das fontes. Com a letra grande, o número fica em cima do título.
- **Na trilha, no computador:** à esquerda, o título, o resumo, a linha de meta, o progresso, o "Continuar" e as folhas; à direita, na altura do título, "O caminho de um projeto de lei", com os cinco passos ligados pela linha.

FORM: a folhinha de arrancar das padarias, a 5ª da lista ordenada, com a paleta das fitas do Bonfim. seed:0b322b8c4550df91

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
