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
  title-md:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.625rem"
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
  rodape:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    typography: "{typography.wordmark}"
  pagina-inicial:
    textColor: "{colors.tinta}"
    typography: "{typography.headline}"
    width: "{spacing.largura-maxima}"
  caminho-em-linha:
    textColor: "{colors.tinta}"
    typography: "{typography.title-sm}"
  no-da-parada:
    backgroundColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    size: "14px"
---

# Design System: Mandatômetro

## Overview

**Creative North Star: "A folhinha de parede"**

A trilha é uma folhinha de arrancar, dessas de padaria. Cada artigo é uma folha do bloco: o número grande diz onde a pessoa está, a folha lida leva um X riscado à mão e a folha onde ela parou tem o canto dobrado. O site é papel branco e tinta preta. A cor fica na moldura: o cartão preto do cabeçalho, com o nome e o lema, e logo abaixo, no lugar do picote, a tira das fitas do Bonfim, que o Renan escolheu para ter "mais de cor voltado para Brasil". Embaixo, o rodapé fecha a folhinha com o mesmo cartão preto, e a tira vai em cima dele.

A página é de leitura, com folga. Os números e os títulos usam um grotesco condensado bem preto (Archivo), como os algarismos das folhinhas, e o texto corrido usa uma serifa de leitura (Literata). Tudo é chapado: sem sombra, sem degradê suave, sem canto arredondado, sem card em volta dos itens. O estado aparece como marca no papel e em palavras ("Lido", "Você está aqui", "Continue daqui", "Você leu 1 de 3"), nunca como barra de progresso ou pontuação.

O que ficaria errado, nas palavras do Renan: "Site do governo, Coisa de criança, Jornal partidário". Ou seja: burocracia e letra pequena, cor demais e tom infantil, manchete gritando e cor de partido. O logo ainda não existe; até ele chegar, o nome em texto faz o papel da marca, e o M do nome, o do ícone da aba.

**Key Characteristics:**
- Papel branco, tinta preta, e a cor só na moldura e nas fitas.
- O número da folha em tamanho de cartaz, num condensado de peso 900.
- Texto corrido em serifa, a cerca de 64 caracteres por linha.
- Estado como marca no papel: X no lido, canto dobrado onde a pessoa está ou parou.
- Linhas de 2 px em tinta: cheias entre as partes, tracejadas (o picote) entre as folhas. No infográfico da trilha, a cheia é o caminho completo, e a tracejada, o que pode mudar o caminho; no caminho da página inicial, só a cheia.
- Um único movimento: o X desenhado em 400 ms quando a pessoa chega ao fim do texto.

## Colors

Duas tintas sobre papel e cinco fitas do Bonfim que só aparecem como faixa de cor, nunca como fundo de texto.

### Primary
- **Tinta** (`tinta`): todo o texto, as linhas, o X, o contorno do canto dobrado, o cartão do cabeçalho e o do rodapé, os quadradinhos dos caminhos e o botão "Continuar". É também a `--primary`, a `--border` e a `--input` do shadcn, e a `theme-color` do navegador no celular.

### Secondary
- **As fitas do Bonfim**, na ordem fixa: **Verde** (`fita-verde`), **Amarela** (`fita-amarela`), **Azul** (`fita-azul`), **Rosa** (`fita-rosa`) e **Vermelha** (`fita-vermelha`). Aparecem na tira abaixo do cartão preto do cabeçalho e acima do cartão do rodapé, no ícone da aba e na prévia do link, na fita pendurada de cada folha, na fita curta ao lado de cada artigo no infográfico da trilha e no caminho da página inicial, e no sublinhado grosso de "de 3 artigos" ao lado do número do artigo. Também ocupam `--chart-1` a `--chart-5`, na mesma ordem.
- A **Azul** é a cor do foco (`--ring`) e do cursor de texto. A **Amarela** é a seleção de texto (com tinta por cima), o foco dentro do cartão preto (no cabeçalho e no rodapé) e o sublinhado de hover nos links do cabeçalho. A **Vermelha** é a `--destructive`.

### Neutral
- **Papel** (`papel`): o fundo de tudo, o texto dentro do cartão preto (o do cabeçalho e o do rodapé) e o branco que separa cada grupo de cinco cores na tira.
- **Tinta suave** (`tinta-suave`): só a linha secundária das fontes: "camara.leg.br, consultada em…", no artigo, e "consultadas em…", embaixo das fontes de cada passo do infográfico. Não serve para texto principal.
- **Retícula** (`reticula`): reservada para as superfícies `muted`, `secondary` e `accent` do shadcn. Nenhuma página das trilhas usa.

### Named Rules
**A Regra da Cor na Moldura.** A cor fica na moldura e nas fitas. O texto é sempre tinta no papel (ou papel no cartão preto), e nenhum texto fica em cima de uma cor de fita.

**A Regra da Fita pela Ordem.** Cada artigo ganha a sua fita pela posição na trilha: 1 verde, 2 amarela, 3 azul, 4 rosa, 5 vermelha, e depois recomeça (`corDaFita`). Ninguém escolhe fita por assunto, partido ou humor.

**A Regra do Domingo em Aberto.** O vermelho de domingo das edições ainda não foi decidido (issue #39). Até lá, a vermelha é só a quinta fita, não marca dia nenhum.

## Typography

**Display Font:** Archivo Variable, eixo de largura (com ui-sans-serif, system-ui)
**Body Font:** Literata Variable, eixo de tamanho óptico, com itálico (com ui-serif, Georgia)

As duas são servidas pelo próprio site, pelo `@fontsource-variable`. Os arquivos latinos das duas (a Literata sem o itálico) são pré-carregados no `<head>` de todas as páginas, para o texto não pular quando elas chegam.

**Character:** o Archivo, apertado no eixo de largura e no peso máximo, faz o algarismo e o título de folhinha; a Literata, calma e de leitura longa, faz o professor paciente falar. O condensado nunca vai para o texto corrido, e a serifa nunca vai para o número.

### Hierarchy
- **Numeral** (900, largura 62%, altura de linha 0.78, algarismos tabulares): o número da folha. No artigo, a partir de 1440 px, fica sozinho na coluna da esquerda a 22.5rem (15rem a partir de dois dígitos); abaixo disso, vai para o lado do título a 7.5rem (10rem no md). Na lista da trilha, 5.5rem a 8rem; em "Nesta trilha" e nas folhas da lista das trilhas (a partir de 1024 px), 4rem; nas folhas em miniatura (abaixo de 1024 px), 1.75rem; na página 404, 7rem a 13rem. Com a letra grande no celular, o número sai do lado do título (veja "A letra grande", no Layout).
- **Headline** (850, largura 72%, altura 0.96): o título da página (artigo, trilha, Trilhas, 404 e erro), de 2.5rem no celular a 4.75rem, com no máximo 12 caracteres de largura no artigo. Na página inicial, 2.75rem no celular e 4.75rem a partir do md. **O teto:** com a letra grande no celular, o título cresce com a letra até a palavra mais comprida dele encostar nas margens, e para aí. O tamanho é `min(o do celular, (100vw − 40 px) ÷ a largura da palavra)` (a classe `.letra-com-teto`), com a largura medida no navegador, em em: "brasileira," (3.8) na página inicial, "legislativo" (3.9) na trilha, "comissões" (4.06) no artigo e "encontrada" (4.33) na 404. Com a letra a 100%, o teto não age a partir de 320 px, e a partir do md vale o tamanho do md. Uma palavra que não caiba nem assim quebra sem hífen (`overflow-wrap: break-word`), como reserva. Os títulos de Trilhas e da página de erro já cabem e ficam sem o teto. O Renan escolheu, em 11/11/2026: "Teto (Recomendado)".
- **Title** (800, largura 75%, altura 1.05): o título de cada folha na lista, "Nesta trilha", "Fontes oficiais", "O caminho de um projeto de lei", os intertítulos do texto e os nomes do anterior e do próximo, de 1.5rem a 2.75rem. Dois tamanhos têm nome na escala: o **Title médio** (`title-md`), a 1.625rem, em "Nesta trilha" e "O caminho de um projeto de lei", e também em "Fontes oficiais" abaixo de 1280 px e nos intertítulos do texto abaixo de 1024 px; e o **Title pequeno** (`title-sm`), a 1.375rem, no título de cada passo do infográfico, que fica numa coluna estreita, abaixo do título do infográfico, e no título de cada parada do caminho da página inicial. Na página inicial, "O caminho de um projeto de lei" vai de 2rem no celular a 2.75rem no md.
- **Wordmark** (900, largura 68%): o nome Mandatômetro no cartão preto do cabeçalho e no do rodapé, 2rem no celular e 2.75rem no md. É texto, não logo. Os dois usam a mesma classe (`NOME_DO_SITE`), com o teto dos títulos e a largura do nome (5.62 em): com a letra grande no celular, o nome cresce até encostar nas margens, e com a letra a 100% o teto não age a partir de 320 px.
- **Lead** (Literata 500, altura 1.4): o resumo do artigo, a descrição da trilha e a abertura da página inicial, de 1.25rem a 1.5625rem, com no máximo 40 a 44 caracteres de largura. Na página inicial, a abertura volta a 1.375rem a partir de 1280 px, quando fica na coluna da direita; o resumo do caminho, em Literata 400, vai de 1.125rem a 1.25rem.
- **Body** (Literata 400): o texto do artigo, a no máximo 64 caracteres; 1.0625rem com altura 1.6 no celular e 1.1875rem com altura 1.65 a partir de 1024 px. No infográfico, em todas as larguras, o resumo e o texto de cada passo ficam em 1.0625rem (altura 1.375 no resumo e 1.55 no passo), e os desvios em 1rem, com altura 1.5.
- **Label** (Archivo 600 a 800): a linha de leitura e fontes, o caminho, os estados ("Lido", "Você está aqui", "Você leu 1 de 3.", "3 artigos · 6 min de leitura") e, no infográfico e no caminho da página inicial, a legenda, os links dos artigos e as fontes de cada passo, de 0.875rem a 1.25rem. Sem caixa alta e sem espaçamento largo. As notas curtas da página inicial e do rodapé (o "para quem", a frase dos desvios e as três linhas do rodapé) ficam em Archivo 400 a 1.0625rem.

### Named Rules
**A Regra das Duas Letras.** Condensado para número, título e rótulo; serifa para o que se lê de verdade. Nenhuma terceira família.

**A Regra do Número de Cartaz.** O número da folha é o maior elemento da página e diz onde a pessoa está. Nada disputa esse tamanho.

## Layout

A página tem no máximo 1440 px, com margens de 20 px no celular e 64 px a partir do md. Os títulos têm as linhas equilibradas e os parágrafos evitam palavra sozinha na última linha.

- **A letra grande:** quem aumenta a letra do navegador (a fonte padrão, e não o zoom) vê o mesmo desenho, com a letra maior, e nenhuma página rola de lado: a 360 px com a letra até 200%, e com a letra a 200% de 360 a 1920 px. Os pontos de quebra são em rem: com a letra a 200%, o md passa para 1536 px, e até lá vale o desenho do celular.
  - **A margem do celular** fica em px (o `px-margem-celular`, do token `margem-celular`) e não cresce com a letra: com a letra a 200%, ela continua com 20 px, e sobram 320 dos 360 px para o texto. O Renan escolheu, em 11/11/2026: "Ficam em 20 px (Recomendado)".
  - **Uma coluna não alarga a página:** a grade do documento e as grades que ficam com uma coluna só (a do artigo e a do rodapé abaixo de 1024 px, e a da 404) têm a coluna `minmax(0, 1fr)`. Sem ela, a coluna crescia até a palavra mais comprida.
  - **O número sai do lado do título** quando a tela tem menos de 18rem (a variante `letra-grande`): a 360 px, com a letra acima de 125%; com a letra a 100%, só abaixo de 288 px, fora do que o site atende. No artigo, o número fica em cima do título, com 12 px entre os dois. Nas folhas da trilha e em "Nesta trilha", o número fica na coluna dele, e o título desce para a linha de baixo, com a largura toda; a margem embaixo do número (20 px na trilha e 16 px em "Nesta trilha") deixa o X da folha lida longe do título. Com 18rem, onde o número continua ao lado do título, os dois cabem.

- **Artigo:** a partir de 1440 px (o breakpoint `folha`), três colunas: o número (até 248 px), o texto (até 700 px) e "Nesta trilha" (15rem ou mais), com 48 px entre elas. De 1024 a 1440 px, duas colunas: o número sobe para o lado do título e "Nesta trilha" fica à direita, fixa ao rolar. Abaixo de 1024 px, uma coluna, e "Nesta trilha" desce para depois das fontes.
- **Trilha:** abaixo de 1024 px, uma coluna de até 56rem, com as folhas empilhadas e, depois delas, o infográfico. A partir de 1024 px, duas colunas: à esquerda, a mesma coluna de até 56rem (o título, o resumo, a linha de meta, o progresso, o "Continuar" e as folhas); à direita, o infográfico, que começa na altura do título. A coluna da direita tem 21rem a 1024 px, 24rem a partir de 1280 px e 28rem a partir de 1440 px, com 32, 40 e 48 px entre as duas. A ordem do HTML é a mesma em todas as larguras: primeiro as folhas, depois o infográfico. Uma trilha sem `infografico.md` fica com uma coluna só. O número da folha fica numa coluna própria (7rem) a partir do md; no celular, vai para o lado do título e o resumo usa a largura toda.
- **Página inicial:** no máximo 1440 px, com 40 px em cima (56 px a partir do lg) e 80 px no fim. Abaixo de 1280 px, uma coluna. A partir do xl, duas colunas de 7fr e 5fr, com 64 px entre elas: o h1 à esquerda; à direita, a abertura, o "para quem", a linha do tamanho da trilha ou do progresso e o botão "Continuar". Abaixo do md (768 px), o "para quem" vem depois do botão, para o botão caber na primeira tela do celular: a 360 × 640 px, com o cabeçalho de 146 px, ele aparece inteiro sem rolar. O HTML tem o "para quem" duas vezes, e o CSS mostra um de cada vez: o leitor de tela e o Tab seguem a ordem da tela em cada largura, o que o `order` do CSS não faria. O Renan escolheu essa ordem em 10/11/2026. O caminho vem 64 px abaixo (80 px a partir do lg), com o título e o resumo nas mesmas duas colunas a partir do xl, alinhados pela base.
- **Lista das trilhas:** a abertura (o título, a frase e o aviso do navegador) fica em até 56rem, e a lista usa a moldura inteira. A partir de 1024 px, cada trilha tem duas colunas, com as mesmas larguras da trilha: à esquerda, o título, a descrição e o progresso em palavras; à direita, as folhas dela, com as fitas penduradas da linha que abre a trilha. Abaixo de 1024 px, cada trilha mostra as folhas em miniatura.
- **Rodapé:** o documento é uma grade de três linhas (cabeçalho, conteúdo e rodapé), e o conteúdo estica: numa página curta, como a 404 e a de erro, o rodapé fica no fim da tela.
- **Ritmo:** cerca de 24 px dentro de cada folha, 40 a 48 px entre os blocos da página e 80 px no fim. O conteúdo da folha fica recuado 26 px para dar lugar à fita.
- **Linha de meta:** o tempo de leitura e o aviso das fontes ficam numa faixa entre duas linhas de 2 px, logo abaixo do resumo, em todas as larguras.
- **O progresso chega depois:** o navegador só sabe o que a pessoa leu quando a página termina de carregar. Por isso, a linha do progresso na trilha (acima do "Continuar"), a da lista das trilhas no celular e o aviso de lido no fim do artigo têm a altura reservada desde o HTML do servidor. Quando o progresso aparece, essas linhas e o botão "Continuar" não mudam de lugar. A 360 px, numa trilha pela metade, a lista abaixo do botão pode descer: o rótulo "Continuar de onde parou" traz o título do artigo e ocupa mais linhas, e o "Recomeçar a trilha" entra embaixo do botão. O Renan aceitou esse salto. De 1024 a 1280 px, a lista também pode descer quando o "Recomeçar a trilha" aparece: o caminho ocupa a direita, e o "Recomeçar" não cabe ao lado do botão e quebra para a linha de baixo. A lista desce até 40 px, e 68 px a 1024 px com dois artigos lidos, quando o rótulo do botão também ganha uma linha. O Renan aceitou também esse salto, em 10/11/2026. Na página inicial, a linha acima do botão ("3 artigos · 6 min de leitura", que dá lugar a "Você leu 1 de 3." ou "Você terminou a trilha.") tem a altura reservada (28 px), e só os textos e o destino do botão mudam: o salto medido é 0 nos 3 estados de leitura, de 320 a 1920 px, também no "para quem", que no celular vem depois do botão.

## Elevation & Depth

O sistema é chapado. Não há sombra em nenhum elemento, nem degradê suave: a profundidade vem só da tinta. O papel é um plano; o que parece dobra (o canto dobrado) é desenhado com um contorno de 2 px, não com sombra. Na prévia do link, a tira tem 24 px de altura e faixas de 64 px, com 16 px de papel: a mesma tira, na escala da imagem de 1200 px.

### Named Rules
**A Regra da Tinta Chapada.** Sem sombra e sem degradê suave. A tira de fitas é feita com faixas de borda dura (48 px cada, com 12 px de papel a cada cinco), e é esse o único uso permitido de gradiente: listras de cor chapada.

## Shapes

Tudo é reto: raio zero (`--radius: 0`). As formas vêm do papel:

- **Linhas:** 2 px em tinta. Cheias para fechar seções (o topo das listas, a faixa de meta, "Fontes oficiais", o anterior e o próximo); tracejadas, como picote, entre uma folha e outra. No infográfico, a linha cheia liga os passos, e um traço tracejado leva a cada desvio. No caminho da página inicial, a linha cheia liga as paradas: em pé abaixo de 1024 px, deitada a partir dele.
- **A fita:** 12 px de largura, pendurada da borda de cima da folha, com a ponta cortada em V de 18 px (1,5 vez a largura), para ler como ponta de fita e não como seta.
- **A fita curta:** ao lado do link de um artigo no infográfico, 12 por 24 px, com um V raso de 8 px: com 24 px de altura, o V de 18 px viraria ponta de seta.
- **Os quadradinhos do infográfico:** 14 px, retos. O cheio, em tinta, marca cada passo do infográfico e cada parada do caminho da página inicial; o vazado, com contorno de 2 px em tinta e miolo de papel, marca cada desvio.
- **O canto dobrado:** o canto de cima à direita é cortado até o papel (30 por 32 px) e a aba é um triângulo com contorno de 2 px em tinta, sem preenchimento e sem sombra.
- **O X:** dois traços levemente curvos, de ponta redonda, em tinta, um pouco maiores que o algarismo (1,1 em) e centrados nele.

## Components

### Moldura (cabeçalho)
- **Caráter:** o cartão preto da folhinha.
- **Forma:** faixa de tinta na largura toda, com pelo menos 96 px de altura no md; o nome e o lema à esquerda, Início e Trilhas à direita. No celular, o que não cabe lado a lado desce para a linha de baixo, e o respiro fica em px, sem crescer com a letra: 16 px em cima e embaixo, 12 px entre as linhas e 4 px entre o nome e o lema. O Renan escolheu, em 11/11/2026: "Espaço de hoje (Recomendado)".
- **Navegação:** links em papel, sem sublinhado, com uma barra de 4 px embaixo: amarela no hover e papel na seção atual. "Trilhas" fica marcado na lista das trilhas, em cada trilha e em cada artigo; o `aria-current="page"` só vai no link da própria página.
- **Foco:** o anel de foco fica amarelo dentro do cartão. O "Pular para o conteúdo" aparece no foco, em tinta sobre papel.
- **Tira de fitas:** logo abaixo, 18 px de altura, as cinco fitas em sequência.

### Rodapé
- **Caráter:** a moldura de baixo da folhinha: o mesmo cartão preto do cabeçalho, com a tira de fitas de 18 px em cima. É o `<footer>` do documento (contentinfo), em todas as páginas, inclusive na 404 e na de erro.
- **Forma:** 40 px em cima e 48 px embaixo, com as margens da página. O nome em Wordmark (2rem, 2.75rem no md, com o teto do nome do cabeçalho), sem link, e três linhas em papel, em Archivo 400 a 1.0625rem, com até 38rem de largura e 12 px entre elas: "O Mandatômetro foi feito para o Hack Brasil 2026, na trilha Acesso à educação.", "Cada explicação traz a fonte oficial: a lei, o regimento ou a página da Câmara e do Senado." e "O código é aberto, no GitHub.". A partir do lg, duas colunas de 7fr e 5fr, com 64 px entre elas: o nome à esquerda, as linhas à direita. A partir de 1280 px, essa coluna é a mesma do texto da página inicial.
- **O link do GitHub:** uma ação em texto em linha (45 px de área de toque), com o foco amarelo do cartão. O vão de 12 px entre as linhas é maior que os 11 px que a área passa da linha do link.
- **Alto contraste:** nas cores forçadas do Windows, o cartão e a tira somem, como no cabeçalho, e o texto fica na cor do sistema.

### Botão "Continuar"
- **Forma:** bloco reto de tinta, texto em papel, 12 por 20 px de respiro, 1.125rem em negrito, com a seta à direita. Os 12 por 20 px são 10 por 18 px de respiro mais uma borda transparente de 2 px, que não aparece no papel.
- **Hover:** o texto ganha sublinhado; a cor não muda.
- **Alto contraste:** nas cores forçadas do Windows, o fundo some e a borda aparece na cor do texto: o botão continua com cara de botão, e não vira texto solto.
- **Onde:** na trilha ("Continuar de onde parou: …") e na página inicial ("Começar a trilha", "Continuar a trilha" ou "Ver a trilha"), com a mesma classe nas duas (`BOTAO_CONTINUAR`).
- É a única ação em bloco das páginas. Os outros links e as ações em texto são sublinhados.

### Links
- Sublinhado de 2 px, afastado 0,2 em do texto, em tinta. Títulos que são links ficam sem sublinhado e ganham sublinhado no hover.
- **Foco:** contorno de 3 px na azul, afastado 3 px.
- **Depois de uma navegação:** o foco vai para o h1 da página nova ou, quando o endereço aponta para um trecho do conteúdo (`#caminho`, `#passo-plenario`), para esse trecho, já na tela. O título e o trecho não são controles e ficam sem o anel. Os títulos que são destino de um trecho (o do infográfico e o de cada passo) têm 32 px de respiro na rolagem.

### Ações em texto
- **Quais:** "Desmarcar", embaixo de "Você leu este artigo."; "Recomeçar a trilha", ao lado do "Continuar" (embaixo dele no celular), quando a pessoa já leu algum artigo da trilha; "Desfazer"; e "Tentar de novo", na página de erro. A mesma forma serve a dois links: "Ver o caminho na trilha", na página inicial (em negrito), e "O código é aberto, no GitHub", no rodapé.
- **Forma:** um botão com cara de link (`.acao-de-texto`): Archivo 600 a 1.0625rem, sublinhado de 2 px afastado 0,2 em, em tinta. No botão, a caixa tem a altura da linha, 23,4 px, e um `::before` com `inset: -0.6875rem -0.25rem` soma 11 px em cima e embaixo dela: a área de toque fica com 45,4 px de altura, sem mudar o espaço que o texto ocupa, e o anel de foco fica justo no texto, como nos links.
- **Nos dois links:** o link fica em linha e quebra como texto, e a caixa de um link em linha tem a altura da letra, 19 px: com o `::before`, a área ficaria com 41,5 px. Por isso, no link, o padding faz a área, como nos links do infográfico: 13 px (`0.8125rem`) em cima e embaixo da letra, em cada linha quando o link quebra, e 4 px dos lados, que a margem negativa devolve. A área fica com 45 px de altura, e o texto, as quebras de linha e a largura da página, mesmo com a letra a 200%, ficam como estavam. Os 13 px são inteiros de propósito: com 13,2 px, que dariam os 45,4 px dos botões, o navegador pintava as letras com outro arredondamento a 1440 e a 1920 px. E sem o `box-decoration-break: clone`, que mudava a quebra da linha com a letra a 200%. O anel de foco contorna só o texto, que fica num `span`: azul no papel, amarelo no cartão preto e, nas cores forçadas do Windows, a cor de destaque do sistema (`Highlight`).
- **Um link sem o `span`:** a regra que tira o anel do próprio link só vale quando ele tem o `span` (`a.acao-de-texto:has(> span)`). Um link novo sem o `span` fica com o anel no próprio link, nas mesmas cores. Num navegador sem o `:has()`, essa regra cai, e o link com o `span` fica com dois anéis, um no link e outro no texto: o foco continua visível.
- **Depois da ação:** a frase de estado diz o que aconteceu ("Você desmarcou o artigo.", "Você recomeçou a trilha."), e o mesmo botão vira "Desfazer", com o foco nele. O "Desfazer" vale até a pessoa sair da página. Não há caixa de confirmação.
- **Leitor de tela:** o que aconteceu é anunciado por uma região `role="status"` escondida, que já vem vazia no HTML do servidor e se apaga depois de 7 s (`useAviso`). A frase na tela não é região viva, e por isso não é anunciada a cada visita.

### Folha (item da lista)
- **Caráter:** uma folha do bloco, sem card em volta.
- **Forma:** a fita na esquerda, o número, o título condensado, o resumo em serifa e a linha de estado ("Lido · 2 min · 2 fontes oficiais"). Separada da próxima por picote.
- **Estados:** lida leva o X sobre o número e a palavra "Lido"; onde a pessoa parou leva o canto dobrado e "Continue daqui"; no artigo aberto, "Nesta trilha" mostra o canto dobrado e "Você está aqui".
- **As folhas pequenas:** "Nesta trilha", no artigo, e as folhas de cada trilha na lista das trilhas, a partir de 1024 px, são a mesma lista: a fita de 56 px, o número a 4rem, o título em Archivo 700 a 1.0625rem e o estado ("Lido · 2 min") a 0.875rem. Na lista das trilhas não há "Você está aqui". A lista tem `role="list"`, como as do infográfico.

### Folha em miniatura (lista das trilhas)
- Só abaixo de 1024 px: quadrados de 44 px com borda de 2 px em tinta e o número em condensado; os lidos levam o X por cima. Ao lado (no celular, na linha de baixo), o estado em palavras: "Você leu 1 de 3." ou "Você terminou a trilha." A partir de 1024 px, os quadrados dão lugar às folhas da trilha, à direita, e a frase do estado continua à esquerda.

### Infográfico
- **Onde:** na página da trilha, quando a trilha tem um `infografico.md`. A partir de 1024 px, na coluna da direita, começando na altura do título; abaixo disso, depois das folhas.
- **Forma:** o título ("O caminho de um projeto de lei") em Title médio (1.625rem), sobre uma linha cheia de 2 px; o resumo em Literata a 1.0625rem; e a legenda em Archivo 600 a 0.9375rem: "A linha cheia é o caminho completo; a tracejada, o que pode mudar o caminho." Os passos vêm numa lista ordenada, em pé e sem número, para não confundir com o número das folhas, com 36 px entre um e outro.
- **O passo:** o quadradinho cheio de 14 px na altura do título e a linha cheia de 2 px até o passo seguinte. Embaixo do título (Title pequeno, a 1.375rem), o texto em Literata a 1.0625rem, os desvios, os artigos da trilha que explicam o passo e as fontes. No texto e nos desvios, o "art." e o "§" não se separam do número na quebra de linha.
- **O desvio:** começa com "Se" e sai da linha por um traço tracejado de 2 px até o quadradinho vazado, com o texto em Literata a 1rem. No último passo, a linha desce só até o último desvio, e só quando há desvio.
- **Os artigos:** "Artigo 3: O projeto passa pelas comissões", em Archivo 600 a 0.9375rem, como link, com a fita curta da folha ao lado, na cor da posição do artigo.
- **As fontes:** uma linha por passo, "Fonte:" ou "Fontes:", com o título de cada fonte como link em negrito, separados por " · ". A linha tem altura 1.75, e o "·" e o "Fontes:" ganham 4 px a mais de papel em volta. Embaixo, a data da consulta em tinta suave: "consultadas em 10 de novembro de 2026", ou "consultadas entre … e …" quando as datas são diferentes.
- **Toque e foco:** os links dos artigos e das fontes têm a área de toque das ações em texto, com 45,4 px de altura em cada linha e 4 px a mais dos lados, sem mudar o espaço que o texto ocupa: o padding faz a área, a margem negativa devolve o espaço, e o `box-decoration-break: clone` dá a área a cada linha de um link que quebra. O texto de cada link fica por cima das áreas vizinhas, e no vão entre dois links vale o que vem depois. O anel de foco (3 px na azul, afastado 3 px) contorna o texto, e não a área, e a entrelinha das fontes deixa papel entre o anel e a linha vizinha. Nas cores forçadas do Windows, o anel sai na cor de destaque do sistema (`Highlight`), como nas ações em texto. Vale também para o caminho da página inicial, que usa os mesmos links.
- **Alto contraste:** nas cores forçadas do Windows, a linha cheia e os quadradinhos cheios, que são fundo, ficam na cor do texto (`CanvasText`), e a capa do último desvio, na cor do papel (`Canvas`). O traço tracejado e o quadradinho vazado são borda e já aparecem.
- **Endereço de cada passo:** o `h3` de cada passo tem o id `passo-` e o título sem acento ("Sanção ou veto" vira `passo-sancao-ou-veto`), e o título do infográfico tem o id `caminho`. Na tela, nada muda.
- **Leitor de tela:** tudo é texto de verdade, com um `h3` em cada passo. A linha, os quadradinhos e as fitas são desenho e ficam fora do leitor de tela; o sentido está nas palavras. As listas têm `role="list"`: sem marcador, o Safari tira delas o papel de lista, e o VoiceOver deixa de dizer quantos itens elas têm.
- **Movimento:** nenhum.

### Caminho em linha (página inicial)
- **Caráter:** o infográfico da trilha reduzido ao caminho completo: as cinco paradas, sem o texto, os desvios e as fontes de cada passo, que ficam na trilha.
- **Forma:** o título "O caminho de um projeto de lei" e o resumo em Literata; depois, uma lista ordenada de 5 paradas, cada uma com o título em Title pequeno (1.375rem). Abaixo de 1024 px, a linha fica em pé, como no infográfico da trilha, com 28 px entre as paradas. A partir de 1024 px, fica deitada: 5 colunas, com 32 px entre elas (40 px a partir de 1280 px); o quadradinho de 14 px no alto de cada coluna, o título 30 px abaixo do topo, e a linha de 2 px do quadradinho até o seguinte, por cima do vão.
- **Os artigos:** cada parada traz os artigos que a explicam, como no infográfico: a fita curta da cor do artigo e "Artigo 1: Quem pode propor uma lei", com a mesma área de toque e o mesmo foco.
- **A parada sem artigo:** traz "Ler este passo na trilha", sem fita, alinhado ao título, com o título do passo num sufixo só para o leitor de tela. O link leva ao passo no infográfico da trilha (`/trilhas/processo-legislativo#passo-plenario`): nenhuma parada fica sem destino.
- **Embaixo:** a frase "A linha mostra o caminho completo. Os desvios, como a comissão que decide sem o plenário, estão na trilha, com as fontes oficiais.", em Archivo a 1.0625rem, numa caixa de até 64ch (623 px). Isso dá cerca de 77 caracteres por linha, e não 64: o `ch` é a largura do 0, que no Archivo é mais largo que a letra média. Depois, o link "Ver o caminho na trilha" (uma ação em texto em linha, em negrito, com 45 px de área de toque), para o `#caminho` da trilha.
- **Estado:** nenhum. O progresso fica só na abertura da página.
- **Alto contraste:** nas cores forçadas do Windows, a linha e os quadradinhos ficam na cor do texto (`CanvasText`).
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

### Ícone da aba e prévia do link
- **O ícone:** o M do nome em Archivo 900, largura 68%, em papel no quadrado de tinta, com as cinco fitas embaixo, em faixas iguais. O `favicon.ico` tem 16, 32 e 48 px, e o `apple-touch-icon.png`, 180 px. É a letra do nome, não um logo, e troca quando o logo existir.
- **A prévia do link** (`previa.png`, 1200 × 630 px, a mesma em todas as páginas): o cartão de tinta com o nome (88 px) e o lema (32 px), a tira de 24 px e, no papel, a frase do h1 da página inicial em Headline, a 92 px, em tinta. Os 88 e 92 px ficam fora da escala do site de propósito: a imagem tem 1200 px e é vista pequena.
- **Os textos:** a aba da página inicial diz "Mandatômetro · o diário oficial político, simplificado"; as outras páginas, "Título · Mandatômetro". O título da prévia é "Mandatômetro: entenda a política brasileira, um passo de cada vez".
- **Como gerar:** `pnpm --filter web imagens` abre o Edge ou o Chrome sem janela e fotografa `imagens/icone.html` e `imagens/previa.html`, com as fontes do site. Cada PNG leva a origem num bloco tEXt `impeccable:prompt`.

## Do's and Don'ts

### Do:
- **Do** manter o texto em tinta sobre papel (ou papel sobre o cartão preto), em qualquer tamanho.
- **Do** dar a cada artigo a fita da sua posição, pela ordem verde, amarela, azul, rosa, vermelha.
- **Do** escrever o estado em palavras e marcar no papel: X no lido, canto dobrado onde a pessoa está ou parou.
- **Do** separar as folhas com picote (linha tracejada de 2 px) e fechar as seções com linha cheia de 2 px.
- **Do** desenhar o caminho completo com linha cheia e o que pode mudar o caminho com linha tracejada, e dizer os dois em palavras.
- **Do** usar o foco de 3 px na azul, afastado 3 px, e a amarela dentro do cartão preto.
- **Do** respeitar o movimento reduzido: o X aparece sem animação.
- **Do** deixar a letra crescer com a configuração do navegador: a margem do celular fica em px, o título e o nome crescem até encostar nas margens, e nenhuma página rola de lado.
- **Do** oferecer "Desfazer" logo depois de apagar uma marca, em vez de pedir confirmação antes.

### Don't:
- **Don't** fazer "site do governo": burocracia e letra pequena.
- **Don't** fazer "coisa de criança": cor demais e tom infantil.
- **Don't** fazer "jornal partidário": manchete gritando e cor de partido. As fitas são as cinco juntas, pela ordem; nenhuma delas representa um lado.
- **Don't** pôr texto em cima de uma cor de fita.
- **Don't** usar card arredondado em volta dos itens nem barra de progresso; o progresso é o X e as palavras.
- **Don't** usar sombra, canto arredondado ou degradê suave.
- **Don't** inventar um logo; até o time fazer o dele, o nome em texto é a marca, e o M do nome é o ícone.
- **Don't** usar a vermelha como cor de domingo antes da decisão da issue #39.
- **Don't** animar nada além do X.
- **Don't** prender um tamanho de letra só à largura da tela (`vw` puro): a letra para de crescer com a configuração do navegador.
