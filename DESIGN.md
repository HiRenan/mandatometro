---
name: Mandatômetro
description: o diário oficial político, simplificado
colors:
  papel: "#ffffff"
  tinta: "#161616"
  tinta-suave: "#4a4a4a"
  reticula: "#ededed"
  fita-verde: "#00a650"
  fita-amarela: "#ffd200"
  fita-azul: "#0067b1"
  fita-rosa: "#e6007e"
  fita-vermelha: "#e30613"
typography:
  numeral:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "22.5rem"
    fontWeight: 900
    lineHeight: 0.78
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
    fontVariation: "'wdth' 62"
  headline:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "4.75rem"
    fontWeight: 850
    lineHeight: 0.96
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 72"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.05
    fontVariation: "'wdth' 75"
  title-sm:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    lineHeight: 1.05
    fontVariation: "'wdth' 75"
  wordmark:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 68"
  lead:
    fontFamily: "Literata Variable, ui-serif, Georgia, serif"
    fontSize: "1.5625rem"
    fontWeight: 500
    lineHeight: 1.4
  body:
    fontFamily: "Literata Variable, ui-serif, Georgia, serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.375
  label-sm:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.375
rounded:
  none: "0px"
spacing:
  margem-celular: "20px"
  margem-tela: "64px"
  recuo-da-fita: "26px"
  folha-vertical: "24px"
  bloco: "40px"
  secao: "48px"
  pagina-fim: "80px"
  largura-maxima: "1440px"
components:
  moldura:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    typography: "{typography.wordmark}"
    height: "96px"
  tira-de-fitas:
    height: "18px"
  botao-continuar:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.none}"
    padding: "12px 20px"
  folha-da-lista:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    padding: "24px 40px 24px 26px"
  fita:
    width: "12px"
    height: "112px"
  fita-nesta-trilha:
    width: "12px"
    height: "56px"
  fita-curta:
    width: "12px"
    height: "24px"
  folha-miniatura:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    size: "44px"
  no-do-passo:
    backgroundColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    size: "14px"
  no-do-desvio:
    backgroundColor: "{colors.papel}"
    rounded: "{rounded.none}"
    size: "14px"
  acao-de-texto:
    textColor: "{colors.tinta}"
    typography: "{typography.label}"
  texto-do-artigo:
    textColor: "{colors.tinta}"
    typography: "{typography.body}"
    width: "64ch"
  pagina-de-erro:
    textColor: "{colors.tinta}"
    typography: "{typography.headline}"
---

# Design System: Mandatômetro

## Overview

**Creative North Star: "A folhinha de parede"**

A trilha é uma folhinha de arrancar, dessas de padaria. Cada artigo é uma folha do bloco: o número grande diz onde a pessoa está, a folha lida leva um X riscado à mão e a folha onde ela parou tem o canto dobrado. O site é papel branco e tinta preta. A cor fica na moldura: o cartão preto do cabeçalho, com o nome e o lema, e logo abaixo, no lugar do picote, a tira das fitas do Bonfim, que o Renan escolheu para ter "mais de cor voltado para Brasil".

A página é de leitura, com folga. Os números e os títulos usam um grotesco condensado bem preto (Archivo), como os algarismos das folhinhas, e o texto corrido usa uma serifa de leitura (Literata). Tudo é chapado: sem sombra, sem degradê suave, sem canto arredondado, sem card em volta dos itens. O estado aparece como marca no papel e em palavras ("Lido", "Você está aqui", "Continue daqui", "Você leu 1 de 3"), nunca como barra de progresso ou pontuação.

O que ficaria errado, nas palavras do Renan: "Site do governo, Coisa de criança, Jornal partidário". Ou seja: burocracia e letra pequena, cor demais e tom infantil, manchete gritando e cor de partido. O logo ainda não existe; até ele chegar, o nome em texto faz o papel da marca.

**Key Characteristics:**
- Papel branco, tinta preta, e a cor só na moldura e nas fitas.
- O número da folha em tamanho de cartaz, num condensado de peso 900.
- Texto corrido em serifa, a cerca de 64 caracteres por linha.
- Estado como marca no papel: X no lido, canto dobrado onde a pessoa está ou parou.
- Linhas de 2 px em tinta: cheias entre as partes, tracejadas (o picote) entre as folhas. No infográfico da trilha, a cheia é o caminho completo, e a tracejada, o que pode mudar o caminho.
- Um único movimento: o X desenhado em 400 ms quando a pessoa chega ao fim do texto.

## Colors

Duas tintas sobre papel e cinco fitas do Bonfim que só aparecem como faixa de cor, nunca como fundo de texto.

### Primary
- **Tinta** (`tinta`): todo o texto, as linhas, o X, o contorno do canto dobrado, o cartão do cabeçalho e o botão "Continuar". É também a `--primary`, a `--border` e a `--input` do shadcn, e a `theme-color` do navegador no celular.

### Secondary
- **As fitas do Bonfim**, na ordem fixa: **Verde** (`fita-verde`), **Amarela** (`fita-amarela`), **Azul** (`fita-azul`), **Rosa** (`fita-rosa`) e **Vermelha** (`fita-vermelha`). Aparecem na tira abaixo do cartão preto, na fita pendurada de cada folha, na fita curta ao lado de cada artigo no infográfico da trilha e no sublinhado grosso de "de 3 artigos" ao lado do número do artigo. Também ocupam `--chart-1` a `--chart-5`, na mesma ordem.
- A **Azul** é a cor do foco (`--ring`) e do cursor de texto. A **Amarela** é a seleção de texto (com tinta por cima), o foco dentro do cartão preto e o sublinhado de hover nos links do cabeçalho. A **Vermelha** é a `--destructive`.

### Neutral
- **Papel** (`papel`): o fundo de tudo, o texto dentro do cartão preto e o branco que separa cada grupo de cinco cores na tira.
- **Tinta suave** (`tinta-suave`): só a linha secundária das fontes: "camara.leg.br, consultada em…", no artigo, e "consultadas em…", embaixo das fontes de cada passo do infográfico. Não serve para texto principal.
- **Retícula** (`reticula`): reservada para as superfícies `muted`, `secondary` e `accent` do shadcn. Nenhuma página das trilhas usa.

### Named Rules
**A Regra da Cor na Moldura.** A cor fica na moldura e nas fitas. O texto é sempre tinta no papel (ou papel no cartão preto), e nenhum texto fica em cima de uma cor de fita.

**A Regra da Fita pela Ordem.** Cada artigo ganha a sua fita pela posição na trilha: 1 verde, 2 amarela, 3 azul, 4 rosa, 5 vermelha, e depois recomeça (`corDaFita`). Ninguém escolhe fita por assunto, partido ou humor.

**A Regra do Domingo em Aberto.** O vermelho de domingo das edições ainda não foi decidido (issue #39). Até lá, a vermelha é só a quinta fita, não marca dia nenhum.

## Typography

**Display Font:** Archivo Variable, eixo de largura (com ui-sans-serif, system-ui)
**Body Font:** Literata Variable, eixo de tamanho óptico, com itálico (com ui-serif, Georgia)

As duas são servidas pelo próprio site, pelo `@fontsource-variable`. Os arquivos latinos das duas (a Literata sem o itálico) são pré-carregados no `<head>`, para o texto não pular quando elas chegam; a página inicial, que ainda não usa a serifa, só pré-carrega o Archivo.

**Character:** o Archivo, apertado no eixo de largura e no peso máximo, faz o algarismo e o título de folhinha; a Literata, calma e de leitura longa, faz o professor paciente falar. O condensado nunca vai para o texto corrido, e a serifa nunca vai para o número.

### Hierarchy
- **Numeral** (900, largura 62%, altura de linha 0.78, algarismos tabulares): o número da folha. No artigo, a partir de 1440 px, fica sozinho na coluna da esquerda a 22.5rem (15rem a partir de dois dígitos); abaixo disso, vai para o lado do título a 7.5rem (10rem no md). Na lista da trilha, 5.5rem a 8rem; em "Nesta trilha" e nas folhas da lista das trilhas (a partir de 1024 px), 4rem; nas folhas em miniatura (abaixo de 1024 px), 1.75rem; na página 404, 7rem a 13rem.
- **Headline** (850, largura 72%, altura 0.96): o título da página (artigo, trilha, Trilhas, 404 e erro), de 2.5rem no celular a 4.75rem, com no máximo 12 caracteres de largura no artigo.
- **Title** (800, largura 75%, altura 1.05): o título de cada folha na lista, "Nesta trilha", "Fontes oficiais", "O caminho de um projeto de lei", os intertítulos do texto e os nomes do anterior e do próximo, de 1.5rem a 2.75rem. A exceção com nome é o **Title pequeno** (`title-sm`), a 1.375rem: o título de cada passo do infográfico, que fica numa coluna estreita, abaixo do título do infográfico.
- **Wordmark** (900, largura 68%): o nome Mandatômetro no cartão preto, 2rem no celular e 2.75rem no md. É texto, não logo.
- **Lead** (Literata 500, altura 1.4): o resumo do artigo e a descrição da trilha, de 1.25rem a 1.5625rem, com no máximo 40 a 44 caracteres de largura.
- **Body** (Literata 400): o texto do artigo, a no máximo 64 caracteres; 1.0625rem com altura 1.6 no celular e 1.1875rem com altura 1.65 a partir de 1024 px. No infográfico, em todas as larguras, o resumo e o texto de cada passo ficam em 1.0625rem (altura 1.375 no resumo e 1.55 no passo), e os desvios em 1rem, com altura 1.5.
- **Label** (Archivo 600 a 800): a linha de leitura e fontes, o caminho, os estados ("Lido", "Você está aqui") e, no infográfico, a legenda, os links dos artigos e as fontes de cada passo, de 0.875rem a 1.25rem. Sem caixa alta e sem espaçamento largo.

### Named Rules
**A Regra das Duas Letras.** Condensado para número, título e rótulo; serifa para o que se lê de verdade. Nenhuma terceira família.

**A Regra do Número de Cartaz.** O número da folha é o maior elemento da página e diz onde a pessoa está. Nada disputa esse tamanho.

## Layout

A página tem no máximo 1440 px, com margens de 20 px no celular e 64 px a partir do md. Os títulos têm as linhas equilibradas e os parágrafos evitam palavra sozinha na última linha.

- **Artigo:** a partir de 1440 px (o breakpoint `folha`), três colunas: o número (até 248 px), o texto (até 700 px) e "Nesta trilha" (15rem ou mais), com 48 px entre elas. De 1024 a 1440 px, duas colunas: o número sobe para o lado do título e "Nesta trilha" fica à direita, fixa ao rolar. Abaixo de 1024 px, uma coluna, e "Nesta trilha" desce para depois das fontes.
- **Trilha:** abaixo de 1024 px, uma coluna de até 56rem, com as folhas empilhadas e, depois delas, o infográfico. A partir de 1024 px, duas colunas: à esquerda, a mesma coluna de até 56rem (o título, o resumo, a linha de meta, o progresso, o "Continuar" e as folhas); à direita, o infográfico, que começa na altura do título. A coluna da direita tem 21rem a 1024 px, 24rem a partir de 1280 px e 28rem a partir de 1440 px, com 32, 40 e 48 px entre as duas. A ordem do HTML é a mesma em todas as larguras: primeiro as folhas, depois o infográfico. Uma trilha sem `infografico.md` fica com uma coluna só. O número da folha fica numa coluna própria (7rem) a partir do md; no celular, vai para o lado do título e o resumo usa a largura toda.
- **Lista das trilhas:** a abertura (o título, a frase e o aviso do navegador) fica em até 56rem, e a lista usa a moldura inteira. A partir de 1024 px, cada trilha tem duas colunas, com as mesmas larguras da trilha: à esquerda, o título, a descrição e o progresso em palavras; à direita, as folhas dela, com as fitas penduradas da linha que abre a trilha. Abaixo de 1024 px, cada trilha mostra as folhas em miniatura.
- **Ritmo:** cerca de 24 px dentro de cada folha, 40 a 48 px entre os blocos da página e 80 px no fim. O conteúdo da folha fica recuado 26 px para dar lugar à fita.
- **Linha de meta:** o tempo de leitura e o aviso das fontes ficam numa faixa entre duas linhas de 2 px, logo abaixo do resumo, em todas as larguras.
- **O progresso chega depois:** o navegador só sabe o que a pessoa leu quando a página termina de carregar. Por isso, a linha do progresso na trilha (acima do "Continuar"), a da lista das trilhas no celular e o aviso de lido no fim do artigo têm a altura reservada desde o HTML do servidor. Quando o progresso aparece, essas linhas e o botão "Continuar" não mudam de lugar. A 360 px, numa trilha pela metade, a lista abaixo do botão pode descer: o rótulo "Continuar de onde parou" traz o título do artigo e ocupa mais linhas, e o "Recomeçar a trilha" entra embaixo do botão. O Renan aceitou esse salto.

## Elevation & Depth

O sistema é chapado. Não há sombra em nenhum elemento, nem degradê suave: a profundidade vem só da tinta. O papel é um plano; o que parece dobra (o canto dobrado) é desenhado com um contorno de 2 px, não com sombra.

### Named Rules
**A Regra da Tinta Chapada.** Sem sombra e sem degradê suave. A tira de fitas é feita com faixas de borda dura (48 px cada, com 12 px de papel a cada cinco), e é esse o único uso permitido de gradiente: listras de cor chapada.

## Shapes

Tudo é reto: raio zero (`--radius: 0`). As formas vêm do papel:

- **Linhas:** 2 px em tinta. Cheias para fechar seções (o topo das listas, a faixa de meta, "Fontes oficiais", o anterior e o próximo); tracejadas, como picote, entre uma folha e outra. No infográfico, a linha cheia liga os passos, e um traço tracejado leva a cada desvio.
- **A fita:** 12 px de largura, pendurada da borda de cima da folha, com a ponta cortada em V de 18 px (1,5 vez a largura), para ler como ponta de fita e não como seta.
- **A fita curta:** ao lado do link de um artigo no infográfico, 12 por 24 px, com um V raso de 8 px: com 24 px de altura, o V de 18 px viraria ponta de seta.
- **Os quadradinhos do infográfico:** 14 px, retos. O cheio, em tinta, marca cada passo; o vazado, com contorno de 2 px em tinta e miolo de papel, marca cada desvio.
- **O canto dobrado:** o canto de cima à direita é cortado até o papel (30 por 32 px) e a aba é um triângulo com contorno de 2 px em tinta, sem preenchimento e sem sombra.
- **O X:** dois traços levemente curvos, de ponta redonda, em tinta, um pouco maiores que o algarismo (1,1 em) e centrados nele.

## Components

### Moldura (cabeçalho)
- **Caráter:** o cartão preto da folhinha.
- **Forma:** faixa de tinta na largura toda, com pelo menos 96 px de altura no md; o nome e o lema à esquerda, Início e Trilhas à direita.
- **Navegação:** links em papel, sem sublinhado, com uma barra de 4 px embaixo: amarela no hover e papel na seção atual. "Trilhas" fica marcado na lista das trilhas, em cada trilha e em cada artigo; o `aria-current="page"` só vai no link da própria página.
- **Foco:** o anel de foco fica amarelo dentro do cartão. O "Pular para o conteúdo" aparece no foco, em tinta sobre papel.
- **Tira de fitas:** logo abaixo, 18 px de altura, as cinco fitas em sequência.

### Botão "Continuar"
- **Forma:** bloco reto de tinta, texto em papel, 12 por 20 px de respiro, 1.125rem em negrito, com a seta à direita.
- **Hover:** o texto ganha sublinhado; a cor não muda.
- É a única ação em bloco das páginas. Os outros links e as ações em texto são sublinhados.

### Links
- Sublinhado de 2 px, afastado 0,2 em do texto, em tinta. Títulos que são links ficam sem sublinhado e ganham sublinhado no hover.
- **Foco:** contorno de 3 px na azul, afastado 3 px.

### Ações em texto
- **Quais:** "Desmarcar", embaixo de "Você leu este artigo."; "Recomeçar a trilha", ao lado do "Continuar" (embaixo dele no celular), quando a pessoa já leu algum artigo da trilha; "Desfazer"; e "Tentar de novo", na página de erro.
- **Forma:** um botão com cara de link (`.acao-de-texto`): Archivo 600 a 1.0625rem, sublinhado de 2 px afastado 0,2 em, em tinta. Um `::before` com `inset: -0.6875rem -0.25rem` soma 11 px em cima e embaixo da linha de 23,4 px: a área de toque fica com 45,4 px de altura, sem mudar o espaço que o texto ocupa, e o anel de foco fica justo no texto, como nos links.
- **Depois da ação:** a frase de estado diz o que aconteceu ("Você desmarcou o artigo.", "Você recomeçou a trilha."), e o mesmo botão vira "Desfazer", com o foco nele. O "Desfazer" vale até a pessoa sair da página. Não há caixa de confirmação.
- **Leitor de tela:** o que aconteceu é anunciado por uma região `role="status"` escondida, que já vem vazia no HTML do servidor e se apaga depois de 7 s (`useAviso`). A frase na tela não é região viva, e por isso não é anunciada a cada visita.

### Folha (item da lista)
- **Caráter:** uma folha do bloco, sem card em volta.
- **Forma:** a fita na esquerda, o número, o título condensado, o resumo em serifa e a linha de estado ("Lido · 2 min · 2 fontes oficiais"). Separada da próxima por picote.
- **Estados:** lida leva o X sobre o número e a palavra "Lido"; onde a pessoa parou leva o canto dobrado e "Continue daqui"; no artigo aberto, "Nesta trilha" mostra o canto dobrado e "Você está aqui".
- **As folhas pequenas:** "Nesta trilha", no artigo, e as folhas de cada trilha na lista das trilhas, a partir de 1024 px, são a mesma lista: a fita de 56 px, o número a 4rem, o título em Archivo 700 a 1.0625rem e o estado ("Lido · 2 min") a 0.875rem. Na lista das trilhas não há "Você está aqui".

### Folha em miniatura (lista das trilhas)
- Só abaixo de 1024 px: quadrados de 44 px com borda de 2 px em tinta e o número em condensado; os lidos levam o X por cima. Ao lado (no celular, na linha de baixo), o estado em palavras: "Você leu 1 de 3." ou "Você terminou a trilha." A partir de 1024 px, os quadrados dão lugar às folhas da trilha, à direita, e a frase do estado continua à esquerda.

### Infográfico
- **Onde:** na página da trilha, quando a trilha tem um `infografico.md`. A partir de 1024 px, na coluna da direita, começando na altura do título; abaixo disso, depois das folhas.
- **Forma:** o título ("O caminho de um projeto de lei") em Title a 1.625rem, sobre uma linha cheia de 2 px; o resumo em Literata a 1.0625rem; e a legenda em Archivo 600 a 0.9375rem: "A linha cheia é o caminho completo; a tracejada, o que pode mudar o caminho." Os passos vêm numa lista ordenada, em pé e sem número, para não confundir com o número das folhas, com 36 px entre um e outro.
- **O passo:** o quadradinho cheio de 14 px na altura do título e a linha cheia de 2 px até o passo seguinte. Embaixo do título (Title pequeno, a 1.375rem), o texto em Literata a 1.0625rem, os desvios, os artigos da trilha que explicam o passo e as fontes.
- **O desvio:** começa com "Se" e sai da linha por um traço tracejado de 2 px até o quadradinho vazado, com o texto em Literata a 1rem. No último passo, a linha desce só até o último desvio, e só quando há desvio.
- **Os artigos:** "Artigo 3: O projeto passa pelas comissões", em Archivo 600 a 0.9375rem, como link, com a fita curta da folha ao lado, na cor da posição do artigo.
- **As fontes:** uma linha por passo, "Fonte:" ou "Fontes:", com o título de cada fonte como link em negrito, separados por " · ". Embaixo, a data da consulta em tinta suave: "consultadas em 10 de novembro de 2026", ou "consultadas entre … e …" quando as datas são diferentes.
- **Leitor de tela:** tudo é texto de verdade, com um `h3` em cada passo. A linha, os quadradinhos e as fitas são desenho e ficam fora do leitor de tela; o sentido está nas palavras.
- **Movimento:** nenhum.

### O X da folha lida (assinatura)
- Traço de 6 (no viewBox de 60) em tinta, ponta redonda.
- **Movimento:** quando o fim do texto aparece na tela, cada traço é desenhado em 200 ms, o segundo depois do primeiro (400 ms ao todo), com `cubic-bezier(0.16, 1, 0.3, 1)`. Ao mesmo tempo surge "Você leu este artigo.", com o "Desmarcar" embaixo. Com o movimento reduzido, o X aparece pronto. É o único movimento das páginas: o "Desmarcar" apaga o X sem animação, e o "Desfazer" o devolve já pronto.

### Fontes oficiais
- Lista numerada abaixo de uma linha cheia: o número em negrito numa coluna de 1.75rem, o título da fonte como link em negrito e, embaixo, o domínio e a data da consulta em tinta suave.

### Anterior e próximo
- Dois blocos lado a lado a partir do md, cada um abaixo de uma linha cheia: o rótulo com a seta e o título da folha em condensado. No último artigo, o da direita volta para a trilha.

### Caminho
- "Trilhas / Processo legislativo", em Archivo 600, com os links sublinhados e a página atual sem link.

### Página de erro
- **Quando:** a página pedida não chega, porque a rede caiu numa navegação, o pedido dos dados foi bloqueado ou o servidor deu erro (500). Vale para todas as rotas (`defaultErrorComponent`) e aparece dentro do site, embaixo da moldura, com o `lang="pt-BR"`.
- **Forma:** a irmã da página 404, sem o número. O título "A página não carregou" em Headline, uma frase em Literata ("Pode ser a sua internet ou uma falha no site. Os artigos que você já leu continuam marcados.") e, na mesma linha, "Tentar de novo" (uma ação em texto, no tamanho e no peso do link ao lado) e "Ver as trilhas". Sem ícone de alerta e sem cor: o erro é dito em palavras, em tinta no papel.
- **Tentar de novo:** pede a página de novo, sem recarregar (`router.invalidate()`). Enquanto o pedido não volta, aparece o aviso de carregando das navegações. Se der certo, a página pedida abre com o foco no título. Se falhar de novo, aparece "Ainda não deu. Confira a internet ou espere um pouco e tente de novo.", o foco fica no botão e a frase é anunciada pela região `role="status"` (`useAviso`).
- **Título da aba:** "Erro ao carregar a página · Mandatômetro". A tela não mostra a mensagem técnica nem a pilha do erro.

## Do's and Don'ts

### Do:
- **Do** manter o texto em tinta sobre papel (ou papel sobre o cartão preto), em qualquer tamanho.
- **Do** dar a cada artigo a fita da sua posição, pela ordem verde, amarela, azul, rosa, vermelha.
- **Do** escrever o estado em palavras e marcar no papel: X no lido, canto dobrado onde a pessoa está ou parou.
- **Do** separar as folhas com picote (linha tracejada de 2 px) e fechar as seções com linha cheia de 2 px.
- **Do** desenhar o caminho completo com linha cheia e o que pode mudar o caminho com linha tracejada, e dizer os dois em palavras.
- **Do** usar o foco de 3 px na azul, afastado 3 px, e a amarela dentro do cartão preto.
- **Do** respeitar o movimento reduzido: o X aparece sem animação.
- **Do** oferecer "Desfazer" logo depois de apagar uma marca, em vez de pedir confirmação antes.

### Don't:
- **Don't** fazer "site do governo": burocracia e letra pequena.
- **Don't** fazer "coisa de criança": cor demais e tom infantil.
- **Don't** fazer "jornal partidário": manchete gritando e cor de partido. As fitas são as cinco juntas, pela ordem; nenhuma delas representa um lado.
- **Don't** pôr texto em cima de uma cor de fita.
- **Don't** usar card arredondado em volta dos itens nem barra de progresso; o progresso é o X e as palavras.
- **Don't** usar sombra, canto arredondado ou degradê suave.
- **Don't** inventar um logo; até o time fazer o dele, o nome em texto é a marca.
- **Don't** usar a vermelha como cor de domingo antes da decisão da issue #39.
- **Don't** animar nada além do X.
