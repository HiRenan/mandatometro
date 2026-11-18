---
name: Mandatômetro
description: o diário oficial político, simplificado
colors:
  papel: "#f6f1e4"
  papel-2: "#ebe4d2"
  papel-3: "#d8cfb8"
  folha: "#fffdf7"
  tinta: "#14161c"
  tinta-suave: "#4f5461"
  fita-verde: "#00a650"
  fita-amarela: "#ffd200"
  fita-azul: "#0a78c8"
  fita-rosa: "#e6007e"
  fita-vermelha: "#e30613"
  foco: "#0b5cad"
typography:
  numeral:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11.5rem"
    fontWeight: 900
    lineHeight: 0.78
    fontFeature: "lnum"
    fontVariation: "'wdth' 62"
  headline:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "8rem"
    fontWeight: 900
    lineHeight: 0.95
    fontVariation: "'wdth' 62"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 900
    lineHeight: 1.15
    fontVariation: "'wdth' 62"
  subtitle:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 900
    lineHeight: 1.15
    fontVariation: "'wdth' 68"
  wordmark:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 68"
  typewriter:
    fontFamily: "Courier Prime, Courier New, ui-monospace, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.2
  lead:
    fontFamily: "Literata Variable, ui-serif, Georgia, serif"
    fontSize: "1.4375rem"
    fontWeight: 500
    lineHeight: 1.45
  body:
    fontFamily: "Literata Variable, ui-serif, Georgia, serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.68
  label:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "0.08em"
  button:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "0.05em"
  action:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.375
    letterSpacing: "0.06em"
  question:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.005em"
    fontVariation: "'wdth' 72"
  field:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  none: "0px"
spacing:
  margem-celular: "20px"
  margem-larga: "72px"
  respiro-celular: "16px"
  fio: "2px"
  rejunte: "2px"
  tira: "6px"
  topo: "72px"
components:
  moldura:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    typography: "{typography.wordmark}"
    height: "72px"
  tira-de-fitas:
    height: "6px"
  botao:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    height: "52px"
    padding: "9.6px 24px"
  botao-vazado:
    textColor: "{colors.tinta}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    height: "52px"
    padding: "9.6px 24px"
  acao-de-texto:
    textColor: "{colors.tinta}"
    typography: "{typography.action}"
  carregando:
    textColor: "{colors.tinta-suave}"
    typography: "{typography.label}"
  cartaz:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    typography: "{typography.headline}"
  fundo-de-papel:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
  folha:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
  folha-da-lista:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    typography: "{typography.title}"
    rounded: "{rounded.none}"
  etiqueta-de-estado:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    typography: "{typography.label}"
    padding: "3.2px 9.6px"
  folha-miniatura:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    size: "44px"
  azulejo:
    backgroundColor: "{colors.papel-2}"
    rounded: "{rounded.none}"
  texto-do-artigo:
    textColor: "{colors.tinta}"
    typography: "{typography.body}"
    width: "39rem"
  rodape:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta-suave}"
    typography: "{typography.wordmark}"
  opcao-do-quiz:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    height: "56px"
    padding: "9.6px 16px 9.6px 17.6px"
  opcao-escolhida:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.none}"
  folha-da-resposta:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
  campo:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    typography: "{typography.field}"
    rounded: "{rounded.none}"
    height: "52px"
    padding: "9.6px 14.4px"
  folha-da-newsletter:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
---

# Design System: Mandatômetro

## Overview

**Creative North Star: "O cartaz de azulejos"**

O site é um cartaz colado numa parede de azulejos. O papel é claro, a letra é gigante, bem preta e estreita, e as cinco cores das fitas do Bonfim ficam nos azulejos, nos números e na tira. O que se mexe são os azulejos: eles viram, um de cada vez ou em onda, e o resto da página acompanha esse gesto (as palavras do título tombam no lugar, a página nova chega azulejo por azulejo).

A direção é da #89. O Renan pediu um visual novo e animado para o site inteiro, escolhido por referências, e fechou a "Mistura clara" em 12/11/2026: "ficou perfeito, podemos seguir com este desing". Ela junta as animações da direção dos azulejos com o minimalismo da direção do cartaz, em fundo claro: o fundo preto ele recusou ("este fundo preto nn descce"). O cabeçalho é um bloco de tinta, para se destacar da página clara ("um header bem feito").

Ela substitui a folhinha de parede (da #35 à #87). Da folhinha ficam o visto da folha lida, as fitas pela ordem, o estado em palavras e todas as regras da letra grande.

O que ficaria errado, nas palavras do Renan: "Site do governo, Coisa de criança, Jornal partidário". Ou seja: burocracia e letra pequena, cor demais e tom infantil, manchete gritando e cor de partido. O logo ainda não existe; até ele chegar, o nome em texto faz o papel da marca, e o M do nome, o do ícone da aba.

**Key Characteristics:**
- Papel claro e tinta. A cor fica nas fitas: nos azulejos, nos números e na tira.
- O papel não é liso: tem um grão miúdo e, atrás de tudo, o mapa da trilha, em curvas de nível um tom acima do papel.
- A letra do cartaz: Archivo de peso 900, estreito, em maiúsculas, com uma frase em letra de máquina de escrever (Courier Prime). O que se lê com calma vai em serifa (Literata).
- Azulejos feitos de gradientes do CSS, sem imagem. São só desenho e ficam fora do leitor de tela.
- O estado em palavras e em marca: o visto no lido, "Lido", "Continue daqui", "Você está aqui", "Você leu 1 de 3."
- Fio de tinta de 2 px e canto reto. A única sombra é dura, de tinta, embaixo do que sobe quando o ponteiro passa.
- Movimento com sentido: os azulejos viram, as palavras tombam, o que entra na tela sobe, e a página troca azulejo por azulejo. Com o movimento reduzido, nada disso acontece.

## Colors

Papel, tinta e as cinco fitas do Bonfim. O texto é sempre tinta no papel, ou papel na tinta.

### Primary
- **Tinta** (`tinta`): todo o texto, os fios, o contorno dos números, o visto, o bloco do cabeçalho, o botão e as etiquetas de estado. É também a `--primary`, a `--border` e a `--input` do shadcn, e a `theme-color` do navegador no celular.

### Secondary
- **As fitas do Bonfim**, na ordem fixa: **Verde** (`fita-verde`), **Amarela** (`fita-amarela`), **Azul** (`fita-azul`), **Rosa** (`fita-rosa`) e **Vermelha** (`fita-vermelha`). Aparecem nos azulejos, nos números (com contorno de tinta), na tira (`--tira`, as cinco em faixas iguais), no fio ao lado de cada desvio e no marcador das listas do texto. Também ocupam `--chart-1` a `--chart-5`, na mesma ordem.
- A **Azul** ficou mais clara que a da folhinha (`#0a78c8`, era `#0067b1`), para aparecer nos azulejos ao lado da tinta.
- A **Amarela** é a seleção de texto (com tinta por cima) e o anel de foco dentro do cabeçalho. A **Vermelha** é a `--destructive`.

### Neutral
- **Papel** (`papel`): a parede, o fundo de todas as páginas, e o texto dentro do bloco de tinta. No fundo, ele leva o grão e o mapa da trilha (veja "Fundo").
- **Papel 2 e Papel 3** (`papel-2`, `papel-3`): os dois tons do azulejo cru, papel sobre papel. O Papel 2 é também o fundo das faixas do anterior e do próximo quando o ponteiro passa, e o Papel 3, o lema no cabeçalho, o fio dos passos que ainda não foram andados e as curvas do mapa do fundo.
- **Folha** (`folha`): mais clara que a parede, para o que se lê com calma: a folha do artigo, as folhas das listas, a chamada do quiz e, no quiz, as opções e a folha da resposta.
- **Tinta suave** (`tinta-suave`): as linhas secundárias: a faixa de informações, a frase do progresso, o "para quem", o endereço e a data das fontes, o rodapé. Não serve para o texto principal.
- **Foco** (`foco`): o anel de foco no papel, um azul mais escuro que a fita. É a `--ring`.

### Contraste
Os pares de texto, pela conta da WCAG:

| Texto | Fundo | Contraste |
| --- | --- | --- |
| Tinta | Papel | 16,0 |
| Tinta | Folha | 17,8 |
| Tinta | Papel 2 | 14,3 |
| Tinta suave | Papel | 6,7 |
| Tinta suave | Folha | 7,4 |
| Tinta suave | Papel 2 | 6,0 |
| Papel | Tinta | 16,0 |
| Papel 3 | Tinta | 11,7 |

O anel de foco tem 5,9 no papel, 6,6 na folha e 5,3 no Papel 2; o amarelo, 12,5 na tinta.

O texto que fica direto no papel passa por cima do grão e das curvas do mapa. No ponto mais escuro deles (uma curva em cima de um ponto escuro do grão), a tinta tem 11,7 e a tinta suave, 4,9: o texto continua acima de 4,5.

Os números levam a cor da fita com um contorno de tinta: de pelo menos 3 px nos grandes e de 2 px nos pequenos (veja "Numeral"). Quem dá a forma é o contorno, e por isso o amarelo, que quase some no papel (1,4), serve.

O número do artigo lido perde a cor de propósito: o miolo fica apagado, em Papel 2, e o contorno passa para a tinta suave, com 7,4 na folha e 6,7 no papel. Vale em todo lugar onde ele aparece: na folha da trilha, nas miniaturas de Trilhas e em "Nesta trilha". O Renan decidiu em 13/11/2026: antes, o contorno ficava em Papel 3 (1,5), e o número lido quase sumia. Quem diz o estado continua sendo o visto, em tinta, e a palavra "Lido".

No quiz, a opção que se apaga depois da resposta passa para a tinta suave na folha (7,4), no texto e no fio, em vez de ficar meio transparente: o texto continua com contraste. Só a letra da opção, que é desenho, esmaece.

### Named Rules
**A Regra do Texto em Tinta.** O texto é sempre tinta no papel ou na folha, ou papel no bloco de tinta. Nenhum texto fica em cima de uma cor de fita: só a tinta no amarelo teria contraste.

**A Regra da Fita pela Ordem.** Cada artigo, cada trilha da lista, cada passo e cada item de uma edição ganham a fita pela posição: 1 verde, 2 amarela, 3 azul, 4 rosa, 5 vermelha, e depois recomeça (`fitaDaPosicao` e `classeDaFita`, em `lib/formatar.ts`). Ninguém escolhe fita por assunto, partido ou humor.

**A Regra de Uma Fita por Azulejo.** Cada azulejo leva uma fita só, com tinta ou papel, e nunca duas fitas juntas. As cinco aparecem juntas em todo painel: o sorteio garante as cinco no começo dele, que é o que o celular mostra (`lib/azulejos.ts`, com teste).

**A Regra da Cor da Semana.** Cada edição da newsletter leva a fita da semana dela no calendário, de segunda a domingo: as semanas seguidas ficam em posições seguidas, e a posição passa pela ordem das fitas (`posicaoDaSemana`, em `lib/formatar.ts`, com o `classeDaFita` e o `azulejoDaPosicao`). A cor é a mesma na lista e na página da edição, muda de uma semana para a outra, e ninguém escolhe. Não há vermelho de domingo: a vermelha continua sendo só a quinta fita. O Renan escolheu em 17/11/2026, na #39: "Dia grande, cor da semana".

## Typography

**Display Font:** Archivo Variable, eixo de largura (com ui-sans-serif, system-ui)
**Body Font:** Literata Variable, eixo de tamanho óptico, com itálico (com ui-serif, Georgia)
**Accent Font:** Courier Prime 400, letra de máquina de escrever (com Courier New, ui-monospace)

As três são servidas pelo próprio site, pelo `@fontsource`, com `font-display: swap`: o texto aparece na letra reserva e troca de letra quando a fonte chega. Os arquivos latinos da Archivo e da Literata são pré-carregados no `<head>` de todas as páginas, e o navegador os pede junto com o CSS. Numa rede boa, eles chegam antes de o texto aparecer, que já sai na letra certa; numa rede lenta, chegam depois, e o texto ainda pula na troca. A Courier Prime é baixada em todas as páginas, porque o lema está no rodapé de todas. O pré-carregamento dela só vale onde ela aparece na primeira tela: a partir de 864 px, por causa do lema no cabeçalho, e, abaixo disso, só na página inicial, para a frase do título. Nas outras páginas, no celular, o navegador a pede pelo CSS, para o rodapé.

A Courier Prime entrou na #89 só para a frase do cartaz e o lema: `@fontsource/courier-prime`, licença SIL OFL 1.1, 19 kB. É a única dependência nova da direção. Ela tomou o lugar da Instrument Serif itálica (22 kB), que o Renan achou com "muito cara de IA": em 13/11/2026, ele escolheu a letra de máquina num rascunho com cinco letras.

**Character:** a Archivo, bem preta e apertada, grita como cartaz de rua; a Courier Prime responde baixo, batida à máquina, como uma linha de diário oficial; a Literata, calma, faz o professor paciente falar.

### Hierarchy
- **Numeral** (900, largura 62%, altura de linha 0.78): o número da folha, na cor da fita da posição, com contorno de tinta, pintado antes do miolo: `max(3px, 0.05em)` nos grandes e 2 px nos pequenos (o da aba do passo a passo, o de "Nesta trilha" e "Nesta edição", o das faixas do anterior e do próximo e o das miniaturas). O do artigo lido tem o miolo em Papel 2 e o contorno em tinta suave. Na folha da trilha, de 5.5rem a 11.5rem; no passo da página inicial, 7rem no celular e até 17rem; no alto do artigo, de 5rem a 9rem; no 404, de 7rem a 17rem; o dia de cada edição, na lista das edições, de 4.5rem a 9rem, em algarismos da mesma largura; o número de cada item da edição, de 3.5rem a 5.5rem; em "Nesta trilha", "Nesta edição" e nas faixas do anterior e do próximo, 2.75rem; nas miniaturas, 1.75rem. Os números do placar da votação usam a mesma letra, de 2.5rem a 3.25rem, em tinta, sem fita e sem contorno.
- **Headline** (`titulo-condensado`: 900, largura 62%, altura 0.95, maiúsculas): o título da página. Na página inicial, de 3.25rem a 8rem; nas páginas de dentro (a trilha, Trilhas, Edições, o 404, a de erro e a de sair da newsletter), de 3.5rem a 11rem; no artigo e na edição, de 2.75rem a 6rem, com no máximo 10 em de largura e a altura 1.15 da leitura. Também "A primeira edição ainda não saiu", na lista das edições sem edição (2.25rem a 4.5rem), "O caminho de um projeto de lei" na página inicial (2.75rem a 6.5rem, altura 0.88), o título de cada passo dela (2.25rem a 3.75rem), "Quiz da trilha" e "Quiz final" nas chamadas (2.5rem a 5.5rem) e "O jornal legislativo" na folha da newsletter (2.5rem a 5.5rem). No quiz, o título da abertura (4rem a 12.5rem, altura 0.86): "Quiz da trilha", "Quiz final" e, na página do piloto, "Antes da trilha"; o título do fim (3.25rem a 7.5rem), também o "Você terminou a primeira etapa." do piloto; e o resultado da resposta (2.25rem a 3.5rem, altura 0.88).
- **Enunciado** (Archivo 800, largura 72%, altura 1.02, em minúsculas): a pergunta do quiz, de 1.75rem a 2.75rem, e 1.375rem abaixo de 22rem. É o único título em minúsculas: lê-se como frase.
- **Title** (`titulo-de-folha`: 900, largura 62%, altura 1.15, maiúsculas): o título de cada folha de uma lista. O do artigo na trilha e o da edição na lista das edições, de 1.875rem a 3.5rem; o da trilha em Trilhas, de 2.25rem a 4.5rem; o do anterior e do próximo, de 1.5rem a 2.5rem.
- **Subtitle** (`subtitulo-condensado`: 900, largura 68%, altura 1.15, maiúsculas): os intertítulos do texto (1.75rem a 2.5rem), "Fontes oficiais" (1.5rem, altura 1), o título do caminho na trilha (1.875rem a 2.75rem, altura 0.9) e o título de cada item da edição (1.875rem a 3rem, com no máximo 14 em de largura).
- **Wordmark** (900, largura 68%, maiúsculas, 0.01em entre as letras): o nome Mandatômetro. No cabeçalho, 1.625rem (1.3125rem abaixo de 480 px); no rodapé, de 2.25rem a 4.5rem. É texto, não logo.
- **Máquina** (Courier Prime 400, em minúsculas): a segunda linha do título da página inicial ("um passo de cada vez.", a 0.4 em do título, com a tira riscada embaixo) e o lema, a 0.9375rem, no cabeçalho e no rodapé. Só isso.
- **Lead** (Literata 500, altura 1.45): o resumo do artigo, de 1.25rem a 1.4375rem. A abertura dos cartazes é Literata 400, de 1.0625rem a 1.25rem, com altura 1.5 e até 34rem de largura.
- **Body** (Literata 400, altura 1.68): o texto do artigo, de 1.0625rem a 1.1875rem, com até 39rem de largura. Os resumos das folhas e os textos dos passos ficam em 1.0625rem, com altura 1.5 a 1.6.
- **Label** (`rotulo`: Archivo 650, 0.8125rem, maiúsculas, 0.08em entre as letras): a faixa de informações, a frase do progresso, a migalha, "Artigo 2 de 6 artigos", o nome do quiz no pé, a etiqueta de estado, o rótulo "Seu e-mail", o mês embaixo do dia da edição, "Nesta edição", os títulos do quadro da votação e das fontes do item e, em tinta suave, "Enviando a inscrição…", "Confirmando a saída…", os nomes do placar e "Página 2 de 3". Os nomes dos links e das ações seguem a mesma ideia, um pouco maiores: o botão (800, 1rem), a ação em texto (700, 0.875rem), os links dos artigos de um passo (750, 0.9375rem) e o título de cada passo da sanfona (750, 1rem, 0.05em entre as letras), que também tem o teto da letra grande.

### O teto da letra grande
Com a letra do navegador grande, no celular, o título cresce com a letra até a palavra mais comprida dele encostar nas margens, e para aí. O tamanho é `min(o tamanho normal, (a largura da página − as margens − o recuo) ÷ a largura da palavra)`: a classe `letra-com-teto`, com o tamanho no `--letra`, a largura da palavra no `--palavra` (em em) e o recuo no `--recuo`. O Renan escolheu o teto em 11/11/2026 ("Teto (Recomendado)") e, na #76, o teto pela palavra mais larga do conteúdo ("Teto menor (Recomendado)"): o título diminui só o bastante para a palavra caber inteira, e nada se parte.

- **A largura da página** vem da caixa em volta do cabeçalho, do main e do rodapé (o `caixa-do-teto`, no `__root.tsx`), que o teto mede pelo `100cqi`. Ela não conta a barra de rolagem, que o `100vw` conta (15 px no Edge e no Chrome do Windows): com o `100vw`, numa janela de computador estreita, a palavra encostada no teto passava da página e se partia (a #139, em 17/11/2026). No celular e no Mac, a barra não toma espaço, e as duas contas dão o mesmo tamanho. Os recuos que dependem da largura da página também a medem pelo `100cqi`: os 30% do cartaz, a metade da página no anterior e no próximo lado a lado e os 42% do fim do quiz.

- **A largura da palavra** é a dela em maiúsculas, como aparece na tela, com 0,5% de folga. A exceção é o título de cada passo da sanfona, que é uma etiqueta: abaixo de 22rem, ele fica como escrito, sem o espaço entre as letras, e leva um segundo número, só para essa largura (o `letra-grande:[--palavra:N]`, na mesma linha do TSX). Os tetos de hoje:

| Título | A palavra mais larga | `--palavra` |
| --- | --- | --- |
| Página inicial | BRASILEIRA, | 4.72 |
| Trilha, e a trilha em Trilhas | CONSTITUIÇÃO | 5.66 |
| Artigo, folha da trilha, anterior e próximo | FUNDAMENTAIS? | 6.34 |
| Intertítulo do texto (largura 68%) | CONSTITUCIONALIDADE | 9.64 |
| O caminho, na página inicial | CAMINHO | 3.62 |
| Passo da página inicial | APRESENTAÇÃO | 6.07 |
| Passo da sanfona da trilha (Archivo 750, largura 100%, 0,05 em entre as letras) | APRESENTAÇÃO | 9.33 |
| Passo da sanfona com a letra grande, abaixo de 22rem, como escrito e sem o espaço | Apresentação | 6.95 |
| Trilhas | TRILHAS | 3.21 |
| Edições | EDIÇÕES | 3.25 |
| A primeira edição ainda não saiu (a lista das edições sem edição) | PRIMEIRA | 3.75 |
| O título do quiz, na abertura e na chamada ("Quiz da trilha", "Quiz final" e "Antes da trilha") | TRILHA | 2.74 |
| O fim do quiz (e o fim do antes, no piloto, em que TERMINOU mede 4,01) | RECOMEÇOU | 4.8 |
| O resultado da resposta, no quiz | ACERTOU. | 3.79 |
| Página não encontrada | ENCONTRADA | 5.15 |
| A página não carregou | CARREGOU | 4.15 |
| A folha da newsletter | LEGISLATIVO | 4.94 |
| Sair da newsletter (e "Você saiu da newsletter.") | NEWSLETTER. | 5.25 |
| O nome do site (largura 68%) | MANDATÔMETRO | 7.08 |

- **O recuo** é o que fica entre a caixa do título e as margens da página: o respiro e os fios da folha, a coluna do número e a do azulejo. Quando a folha divide a página com uma coluna ao lado (o caminho, na trilha; "Nesta trilha", no artigo), o contêiner diz quanto ela toma no `--recuo-de-fora`, e os títulos de dentro somam. No título de cada passo da sanfona, o recuo é o que fica na linha dele: o azulejo pequeno, os dois vãos e o "+" (abaixo de 22rem, sem o azulejo, um vão e o "+"); a partir de 1400 px, a coluna do caminho diz no `--recuo-de-fora` quanto da página fica fora dela. Na folha da newsletter, a partir de 768 px, o recuo do título soma também a coluna dos azulejos (15.25rem) e o vão (3rem).
- **Na lista das trilhas:**
  - de 640 a 1407 px, o recuo do título é o do azulejo ao lado;
  - a partir de 1408 px, o título divide a cabeça com a coluna da descrição, e o recuo soma também os 42rem dela e o vão entre as duas;
  - até uns 1500 px, é o teto que dá o tamanho do título. Ele mede a página pelo `100cqi`, sem a barra de rolagem, e o título encosta na coluna com a barra à vista ou sem ela;
  - quando a coluna da descrição cresce, a do título também passa de 42rem, e o título já parou no tamanho maior: 4,5rem × 5,66 = 25,5rem.
  - O `lib/lista-das-trilhas.test.ts` confere a conta com as medidas do CSS.
- **Os títulos que vêm da API** (o da edição, o de cada item e o da edição na lista) não têm o `[--palavra:N]` fixo, porque mudam a cada edição: o `estiloDoTeto` (`lib/conteudo/regua.ts`) mede a palavra mais larga de cada um, com a mesma régua do teste e a mesma folga, e põe o `--palavra` num `style`. A conta é a mesma no servidor e no navegador, e o título não muda de tamanho quando a página carrega.
  - O teto deles se mede só pela caixa em volta, e não pela página (o `teto-pela-caixa`, no `index.css`): a folha da edição e o texto da folha na lista também são contêineres (o `caixa-do-teto`), e o tamanho é `min(o tamanho normal, 100cqi ÷ a largura da palavra)`, sem margens nem recuo para somar. Pela largura da página, a conta não via a folha da edição parar de crescer, a partir de uns 1440 px: uma palavra perto do teto passava da caixa e se partia no computador (a revisão do Argos, em 17/11/2026).
  - A caixa do título não fica mais estreita que a palavra mais larga (o `min-width`), mesmo com o `max-width` de 10em do título da edição e o de 14em do título do item: uma palavra de 27 letras diminui a letra e não se parte.
- **O aviso a quem escreve:** um teste (`src/lib/conteudo/titulos.test.ts`) soma a largura de cada letra em maiúsculas (`larguras-das-letras.ts`, medida no navegador em cada estilo; o título do passo da sanfona tem duas réguas, em maiúsculas espaçadas e como escrito, e o teste confere cada uma com o CSS dele) e falha quando uma palavra de um título do conteúdo passa do teto, com o arquivo, a palavra e o que fazer (`docs/conteudo-das-trilhas.md`). Os tetos saem do código, e o teste fica fora do `conferir.ts`: ele não derruba o build nem o deploy.

### Named Rules
**A Regra das Três Letras.** O grotesco estreito para número, título e etiqueta; a serifa para o que se lê de verdade; a letra de máquina só para a frase do cartaz e o lema. Nenhuma quarta família, e a letra de máquina não vira estilo de texto.

**A Regra das Duas Alturas.** O título tem a altura de linha do papel dele: 0.95 no cartaz, que é curto, e 1.15 na leitura, que aceita qualquer texto (a pergunta do artigo, a folha, o intertítulo e o que vem da API), porque o acento da maiúscula sobe a 0.885 em e a cedilha desce a 0.21 em: com menos, o acento encosta na linha de cima e, na leitura, a cedilha cai sobre o acento da linha de baixo (a #158; o `estilos/entrelinha.test.ts` confere cada título com a tinta da letra).

**A Regra das Maiúsculas com Medida.** Os títulos grandes vão em maiúsculas sempre, com o teto; a exceção é o enunciado do quiz, que é uma frase. As etiquetas pequenas vão em maiúsculas espaçadas, mas voltam às minúsculas, sem o espaço entre as letras, quando a tela tem menos de 22rem (as variáveis `--caixa-alta` e `--espacado`): em maiúsculas, uma palavra comprida não cabe na linha. O título do passo da sanfona é uma delas e tem o teto, medido dos dois jeitos.

## Layout

A página usa a largura toda da tela, com as margens do `--margem`: 20 px no celular e, a partir de 768 px, de 32 a 72 px, crescendo com a tela. Os títulos têm as linhas equilibradas e os parágrafos evitam palavra sozinha na última linha.

- **Os cartazes** abrem as páginas. A partir de 992 px, o cartaz da página inicial tem pelo menos a altura da primeira tela, e o das páginas de dentro, também, com o limite de 44rem. O título e o pé ficam embaixo, e o que vem antes do título (a migalha), no alto.
- **O painel de azulejos** fica à direita do cartaz, nos 30% da largura, de cima a baixo, a partir de 992 px. Abaixo disso, é uma faixa de duas fileiras no alto, de borda a borda: 6 azulejos por fileira no celular e 10 a partir de 640 px.
- **Página inicial:** o cartaz e, depois de um fio de tinta, o caminho de um projeto de lei, passo a passo. Abaixo de 768 px, o "para quem" vem depois do botão, para o botão caber na primeira tela do celular. O HTML tem o "para quem" duas vezes, e o CSS mostra um de cada vez: o leitor de tela e o Tab seguem a ordem da tela em cada largura, o que o `order` do CSS não faria. O Renan escolheu essa ordem em 10/11/2026. Onde o build do site tem o `API_URL`, a folha da newsletter vem depois do caminho, antes do rodapé.
- **Trilha:** o cartaz e as folhas dos artigos, uma embaixo da outra, e depois as chamadas do quiz e do quiz final e o caminho. A partir de 1400 px, o caminho fica numa coluna de 24rem à direita das folhas. A ordem do HTML é a mesma em todas as larguras.
- **Lista das trilhas:** o cartaz e uma folha por trilha.
  - **A partir de 1024 px:** a folha tem a cabeça em cima (o azulejo, o título, a descrição, o rótulo e o progresso) e, embaixo, as folhas dos artigos em colunas que terminam juntas.
  - **A partir de 1408 px:** a cabeça se abre em duas colunas.
  - **Abaixo de 1024 px:** os artigos viram quadradinhos.
  - **Antes da #104:** a lista ficava à direita, numa coluna de 22rem, e nas trilhas de 6 e 8 artigos deixava um vão embaixo da descrição. O Renan pediu, em 13/11/2026, para acabar com esses vãos.
- **Artigo:** a parede de papel com a folha de leitura por cima, até 82rem. A partir de 1200 px, "Nesta trilha" fica numa coluna de 17rem à direita, fixa ao rolar; abaixo disso, vem depois da folha. No celular, a folha fica a 8 px das bordas da tela, com 16 px de respiro por dentro.
- **Lista das edições:** o cartaz e uma folha por edição, como as da trilha, da mais nova para a mais antiga, 20 por página, com os links das páginas vizinhas embaixo.
- **Edição:** a parede e a folha de leitura do artigo. A partir de 1200 px, "Nesta edição" fica numa coluna de 17rem à direita, fixa ao rolar; abaixo disso, fica dentro da folha, depois do lide.
- **Quiz:** o palco tem pelo menos a altura da primeira tela, com o andamento e, fora da abertura, o nome do quiz no pé, e as faixas do anterior e do próximo vêm embaixo dele. A partir de 992 px, o texto fica à esquerda e o mosaico, à direita; na pergunta, as opções à esquerda e a folha da resposta à direita. Abaixo disso, tudo vai numa coluna, com o mosaico embaixo da migalha. Abaixo de 20.1rem, como a 320 px, os doze quadradinhos do andamento do quiz final vão em duas fileiras de seis. O quiz final e a página do piloto usam o mesmo palco; a do piloto vem sem as faixas do anterior e do próximo.
- **Rodapé:** o documento é uma grade de três linhas (cabeçalho, conteúdo e rodapé), e o conteúdo estica: numa página curta, como o 404 e a de erro, o rodapé fica no fim da tela.

### A letra grande
Quem aumenta a letra do navegador (a fonte padrão, e não o zoom) vê o mesmo desenho, com a letra maior, e a página não rola de lado. Os pontos de quebra são em rem: com a letra a 200%, o desenho do celular vale até 1536 px.

- **A margem do celular** fica em px e não cresce com a letra: com a letra a 200%, ela continua com 20 px. O Renan escolheu, em 11/11/2026: "Ficam em 20 px (Recomendado)". O respiro de dentro das folhas, o do cabeçalho e o azulejo do canto do artigo seguem a mesma regra.
- **Uma coluna não alarga a página:** toda coluna de texto é `minmax(0, 1fr)`. Com `1fr` puro, ela cresce até a palavra mais comprida.
- **A reserva:** uma palavra que não cabe sozinha numa linha se parte na beirada, sem hífen (`overflow-wrap: break-word` no `body`). Nenhum `hyphens` entra no site: com ele, o navegador põe hífen no fim da linha mesmo quando a palavra caberia na linha de baixo. O Renan escolheu, na #76, em 11/11/2026: "Sem hífen (Recomendado)". Nos títulos, o teto vem antes da reserva.
- **O número sai do lado do título** em "Nesta trilha" quando a tela tem menos de 22rem (a variante `letra-grande`): a 360 px, com a letra acima de 16 px. O número fica no lugar, e o título desce para a linha de baixo, com a largura toda. O Renan escolheu, na #76, em 11/11/2026: "Sim, número em cima (Recomendado)".
- **O que sai com a letra grande** (abaixo de 22rem): o azulejo de cada passo, na sanfona do caminho, e o azulejo das faixas do anterior e do próximo. São desenho, e o texto ganha a largura.
- **O botão** muda abaixo de 20rem (veja "Botão").

### O progresso chega depois
O navegador só sabe o que a pessoa leu quando a página termina de carregar. O que aparece depois disso tem o lugar guardado desde o HTML do servidor:

- a linha do progresso, acima do botão, na página inicial e na trilha;
- a linha do "Recomeçar a trilha", embaixo da descrição da trilha;
- a etiqueta "Lido" ou "Continue daqui", que fica fora do fluxo, no respiro de cima de cada folha;
- o aviso de lido, no fim do artigo (4.5rem);
- o passo a passo da página inicial, que a partir de 768 px tem sempre a altura do passo mais alto;
- no quiz, a linha do "Recomeçar o quiz" (menos no depois do piloto, veja abaixo) e o lugar do botão de começar, na abertura, e a frase do andamento, no pé do palco, que guarda a altura da frase mais comprida. O mosaico da abertura vem sempre com cor: não muda quando o navegador descobre as respostas guardadas;
- o lugar do botão de continuar, na trilha;
- na página do piloto, o lugar do botão ("Começar", "Continuar" ou "Ir para a trilha"), o estado de cada passo, que guarda a altura de "Você está aqui", e a linha do "Começar como outra pessoa".

**As linhas do piloto não guardam lugar:** a do quiz final, embaixo do título (a segunda etapa, o pedido para terminar a primeira ou a linha do envio), e, na página do piloto, a frase do estado (o piloto concluído ou encerrado) e a linha do envio. Só quem participa do piloto vê essas linhas, e um lugar guardado deixaria um espaço vazio no quiz final de todo o público, inclusive dos jurados. Quem participa vê o conteúdo descer uma vez, quando a página carrega do zero; numa navegação dentro do site, a linha já vem com a página. Decidido na #92, em 16/11/2026. No depois, a linha do "Recomeçar o quiz" sai da abertura quando a da segunda etapa entra: o botão não aparece durante a etapa, e a linha vazia empurrava o "Começar" para baixo da primeira tela do celular pequeno.

**O lugar do botão** (`LugarDoBotao`, com o `.lugar-do-botao`): o botão de continuar da trilha muda de texto ("Começar pelo primeiro artigo" vira "Continuar de onde parou: …" e, com a trilha terminada, "Responder o quiz da trilha", "Responder o quiz final" ou "Ver as outras trilhas"); o do quiz só aparece depois que o JavaScript carrega, como "Começar", "Continuar" ou "Rever as respostas". Cada texto que o botão pode ter vem no HTML do servidor, numa cópia invisível com o desenho do botão, fora do leitor de tela, e todas ficam empilhadas no mesmo lugar: o lugar tem sempre a altura do texto mais alto, na letra e na largura que a tela tiver. No celular, onde o botão fica em cima da lista dos artigos, a lista não pula quando o botão troca de texto.

Na trilha, o botão de continuar vem depois da linha do "Recomeçar a trilha", e não antes: o que fica acima dela não muda com o progresso.

**Com a trilha terminada,** o botão leva ao que vem depois dela: "Responder o quiz da trilha", para o quiz, enquanto falta alguma resposta, contada como na página do quiz; depois, "Responder o quiz final", contado do mesmo jeito; e "Ver as outras trilhas", para a lista das trilhas, com os quizzes todos respondidos ou numa trilha sem eles. Antes, o lugar ficava vazio. O Renan decidiu em 14/11/2026, na #101: "Um botão útil no lugar" e, com o quiz também respondido, "Ver as outras trilhas". O quiz final entrou nessa ordem no plano da #92, que o Renan aprovou em 16/11/2026. O "Recomeçar a trilha" e as chamadas dos quizzes, embaixo da lista, continuam.

## Elevation & Depth

O sistema é chapado: sem sombra esfumada e sem degradê suave. A profundidade vem da tinta.

- **A sombra dura:** a folha de uma lista sobe 4 px quando o ponteiro passa, sobre uma sombra de tinta de 6 px, sem desfoque. O azulejo do passo da vez, na página inicial, fica 8 px acima, sobre uma sombra igual, de 8 px. São as duas únicas sombras do site. O fio grosso da folha aberta, em "Nesta trilha", também usa o `box-shadow`, mas `inset`: desenha um fio de 6 px, e não uma sombra. No quiz, a opção que o ponteiro toca, ou que a pessoa escolheu, anda 7 px para o lado e mostra um fio rosa, amarelo ou azul, e a certa e a errada levam um fio de 8 px por dentro, verde ou vermelho: também são fios feitos com o `box-shadow`, sem desfoque.
- **O giro:** os azulejos viram em volta do próprio eixo, com perspectiva. É movimento, e não camada: parado, tudo é plano.

### Named Rules
**A Regra da Tinta Chapada.** Sem sombra esfumada e sem degradê suave. Os gradientes do site têm borda dura: as faixas da tira e os motivos dos azulejos. O fundo segue a regra: o grão é ponto e o mapa é traço, sem mancha e sem desfoque.

## Shapes

Tudo é reto: raio zero (`--radius: 0`).

- **O fio:** 2 px em tinta. Contorna as folhas, separa as seções e os itens das listas. "Fontes oficiais" abre com um fio de 6 px.
- **A tira:** as cinco fitas em faixas iguais, com 6 px de altura: embaixo do cabeçalho, embaixo do botão quando o ponteiro passa, e na barra de leitura do artigo. Embaixo da frase do título, ela é mais fina e se risca: 0,075 em da frase, com pelo menos 3 px. No alto da folha da resposta do quiz, ela tem 10 px.
- **O azulejo:** um quadrado com o fundo, um motivo por cima e uma volta, de 0 a 3 quartos. Os motivos são dez: o quarto de círculo, a meia-lua, o triângulo, o círculo, as listras, o arco, os dois quartos opostos, o liso, os quatro pontos e a metade. Entre dois azulejos de um painel, 2 px de rejunte.
- **O azulejo grande:** quatro peças que formam um desenho. São cinco desenhos, e dois lembram o Congresso: a cúpula e os dois lados.
- **A etiqueta de estado:** um retângulo de tinta com a letra em papel, que pende do fio de cima da folha.
- **O visto:** um traço só, levemente curvo, com a perna curta e a longa, de ponta redonda, em tinta, sobre um traço mais largo na cor da folha, que o separa do que fica atrás.

## Components

### Fundo (o papel)
- **Caráter:** o papel de todas as páginas não é liso. Ele tem um grão miúdo e, atrás de tudo, o mapa da trilha: curvas de nível, como num mapa de trilha, um tom acima do papel. O Renan, em 13/11/2026: o fundo liso estava "meio inanimado", "apenas uma cor"; ele pediu algo que lembrasse a natureza, "que não polua tanto", e escolheu o mapa e o grão num rascunho com três fundos ("muito boa mesmo"). A natureza entra pela palavra que o site já usa: a trilha, um passo de cada vez.
- **O grão** (`estilos/grao.svg`): um ruído miúdo, com pontos claros e escuros na mesma medida, para o papel ganhar textura sem escurecer. É um ladrilho de 320 px, que emenda. Fica no fundo da página e no que cobre a página com papel (`var(--papel) var(--grao)`): o pé do quiz e as faixas do anterior e do próximo. As folhas, o mural de azulejos e as outras peças com fundo próprio são lisas.
- **O mapa** (`estilos/mapa.svg`): curvas em fio de 1 px, com uma mestra de 1,7 px a cada quatro, no Papel 3 a 80% (60% abaixo de 768 px, onde o texto fica direto no papel). É um ladrilho de 1400 px, que emenda dos quatro lados, numa camada fixa atrás da página (`body::before`), que sobra 60vh embaixo: é o quanto ela sobe com a rolagem, no máximo. O arquivo é a máscara, e a cor vem do Papel 3.
- **Como gerar:** `pnpm --filter web mapa` roda o `imagens/mapa.mjs`, que desenha o relevo com um sorteio de semente fixa e grava o SVG (15 kB; 5 kB comprimido). Para mudar o mapa, mude o roteiro e gere de novo, sem editar o SVG. Um teste (`src/estilos/fundo.test.ts`) confere que as curvas emendam, que o arquivo pesa pouco e que a camada sobra embaixo o tanto que o mapa sobe na rolagem.
- **É desenho:** o grão e o mapa não dizem nada sobre o assunto, e nenhum texto depende deles. No alto contraste do sistema e na impressão, o fundo é liso.

### Moldura (cabeçalho)
- **Caráter:** um bloco de tinta na largura toda, com a tira das cinco fitas embaixo. É o que separa o cabeçalho da página clara.
- **Forma:** 72 px de altura, com a tira de 6 px. O nome e, a partir de 864 px, o lema em letra de máquina (em Papel 3) à esquerda; Início e Trilhas à direita, e Edições depois delas onde o build do site tem o `API_URL`. Abaixo de 864 px, ficam o nome e os links: o lema, que é largo na letra de máquina, não cabe na linha e está no rodapé. O respiro fica em px, sem crescer com a letra.
- **Com as edições, no celular:** os três links não cabem na linha do nome, e, abaixo de 32rem, o Início sai: o nome leva ao início. Abaixo de 26rem, Trilhas e Edições se apertam (6 px de respiro de cada lado, sem vão entre eles, e pelo menos 12 px entre o nome e os links), e a linha cabe a partir de 355 px. Com a letra grande, ela ainda pode quebrar, e os links descem para a linha de baixo. Quando Trilhas e Edições não cabem juntos nem ali, como a 320 px com a letra a 200%, a lista quebra, e Edições desce para baixo de Trilhas: sem a quebra, Edições passava da página no computador, onde a barra de rolagem toma 15 px, e a página rolava de lado (a Atena pediu a correção em 17/11/2026). As regras valem só com a marca `data-com-edicoes`: sem a API, o cabeçalho fica como antes. O Renan escolheu em 17/11/2026, na #39: "Edições" no cabeçalho, sem o Início no celular, e o link "Ler as edições" na folha da newsletter.
- **Navegação:** links em papel, em maiúsculas espaçadas, sem sublinhado, com um traço de 4 px em papel embaixo: ele se risca da esquerda para a direita quando o ponteiro passa e fica na seção aberta. "Trilhas" fica marcado na lista das trilhas, em cada trilha e em cada artigo, e "Edições", na lista das edições e em cada edição; o `aria-current="page"` só vai no link da própria página.
- **Foco:** o anel de foco fica amarelo dentro do bloco. O "Pular para o conteúdo" aparece no foco, em tinta sobre papel.
- **Na troca de página,** o cabeçalho fica parado quando aparece nas duas páginas (veja "A troca de página").

### Rodapé
- **Caráter:** papel com um fio de tinta em cima e uma fileira de azulejos embaixo. É o `<footer>` do documento, em todas as páginas, inclusive no 404 e na de erro.
- **Forma:** o nome em Wordmark, grande, sem link, com o lema em letra de máquina embaixo; ao lado (embaixo, até 1024 px), três linhas em Literata, em tinta suave: "O Mandatômetro foi feito para o Hack Brasil 2026, na trilha Acesso à educação.", "Cada explicação traz a fonte oficial: a lei, o regimento ou a página da Câmara e do Senado." e "O código é aberto, no GitHub.".
- **O link do GitHub:** uma ação em texto em linha, na letra do parágrafo, em tinta e negrito. A área de toque tem 12 px em cima e embaixo da letra, menos que o vão entre os parágrafos: um toque na linha de cima não vai para o link.
- **A fileira de azulejos:** 16 azulejos (os 8 primeiros no celular, que já têm as cinco fitas). Ela faz a onda uma vez, quando entra na tela.

### Botão
- **Forma:** bloco reto de tinta, texto em papel, em maiúsculas espaçadas (800, 1rem), com pelo menos 52 px de altura e a seta à direita. O vazado, com o fundo transparente e o texto em tinta, acompanha o principal ("Voltar", no passo a passo, e "Rever as respostas", no fim do quiz e, com o piloto encerrado, no fim do antes).
- **Hover:** o botão sobe 3 px, a tira das cinco fitas aparece embaixo dele, e a seta anda um pouco para a frente.
- **Com a letra grande:** quando a tela tem menos de 20rem (a 360 px, com a letra acima de 18 px), a seta vem logo depois da última palavra, e o respiro dos lados fica em 18 px, que não cresce com a letra. Entre a palavra e a seta vai um espaço, e não uma margem: quando a seta desce sozinha, começa alinhada com o texto. Uma palavra maior que a linha se parte sem hífen (`overflow-wrap: anywhere`). O Renan escolheu, na #76, em 11/11/2026: "Seta no fim, respiro fixo (Recomendado)".
- **Desligado:** fica apagado (35%), sem subir e sem a tira. Enquanto um envio espera a resposta (a inscrição e a saída da newsletter), o botão fica com esse desenho pelo `aria-disabled`, e não pelo `disabled`, que tirava o foco dele: o clique nele não envia o formulário.
- **Alto contraste:** nas cores forçadas do Windows, o fundo some e a borda aparece na cor do texto: o botão continua com cara de botão.
- **Onde:** é a única ação em bloco das páginas (`BOTAO_CONTINUAR`): na página inicial, na trilha, na chamada do quiz, no quiz, na página do piloto, no passo a passo, no 404, na página de erro, na folha da newsletter, na página de sair e nas páginas das edições ("Receber por e-mail", na lista sem edição; "Ver todas as edições", no fim da edição; "Ver as trilhas", sem a API). Os outros links e ações são sublinhados.

### Links
- Sublinhado de 2 px, afastado 0,2 em do texto, em tinta. Títulos que são links ficam sem sublinhado.
- **Foco:** contorno de 3 px no azul do foco, afastado 3 px. Na folha de uma lista, o contorno vai na folha inteira.
- **Depois de uma navegação:** o foco vai para o h1 da página nova ou, quando o endereço aponta para um trecho do conteúdo (`#caminho`, `#passo-plenario`, `#newsletter`), para esse trecho, já na tela. O título e o trecho não são controles e ficam sem o anel.

### Ações em texto
- **Quais:** "Desmarcar", embaixo de "Você leu este artigo."; "Recomeçar a trilha", embaixo da descrição da trilha, quando a pessoa já leu algum artigo dela; "Recomeçar o quiz", na abertura e no fim do quiz, quando ela já respondeu alguma pergunta; "Começar como outra pessoa", na página do piloto; "Tentar de novo", na linha do envio do piloto; e "Desfazer". A mesma forma serve a links: "Ver o caminho na trilha", na página inicial, "Ir para o início", no 404 e na página de sair da newsletter, "Inscrever-se de novo", também na de sair, "Ver as trilhas", na página de erro, "Ler as edições", na folha da newsletter, "Receber por e-mail", "Edições mais novas" e "Edições mais antigas", na lista das edições, "Entenda na trilha: …" e "Receber as próximas por e-mail", na edição, e "O código é aberto, no GitHub", no rodapé.
- **Forma:** um botão com cara de link (`.acao-de-texto`): Archivo 700 a 0.875rem, em maiúsculas espaçadas, com sublinhado de 2 px. No botão, um `::before` soma 13 px em cima e embaixo da caixa: a área de toque fica com 45 px de altura, sem mudar o espaço que o texto ocupa, e o anel de foco fica justo no texto.
- **Nos links:** o link fica em linha e quebra como texto, e o padding faz a área (15 px em cima e embaixo da letra, 4 px dos lados, que a margem negativa devolve). O anel de foco contorna só o texto, que fica num `span`. Um link sem o `span` fica com o anel no próprio link; num navegador sem o `:has()`, o link com o `span` fica com dois anéis, e o foco continua visível.
- **Desligada:** com o `aria-disabled`, como o "Tentar de novo" do piloto enquanto o pedido espera, a ação passa para a tinta suave, que continua legível, e guarda o foco; nas cores forçadas, fica com a cor do desligado do sistema.
- **Depois da ação:** a frase de estado diz o que aconteceu ("Você desmarcou o artigo.", "Você recomeçou a trilha.", "Você recomeçou o quiz."), e o mesmo botão vira "Desfazer", no mesmo lugar, com o foco nele. Nenhum outro controle aparece onde o botão estava: o segundo clique de um clique duplo cai sempre no mesmo botão. O "Desfazer" vale até a pessoa sair da página. Não há caixa de confirmação. O "Começar como outra pessoa" é a exceção: apaga tudo o que o site guardou no navegador, sem "Desfazer", e no lugar dele fica "Pronto: este navegador começou do zero.", com o foco (veja "O piloto").
- **Leitor de tela:** o que aconteceu é anunciado por uma região `role="status"` escondida, que já vem vazia no HTML do servidor e se apaga depois de 7 s (`useAviso`).

### Campo
- **Forma:** uma caixa reta, com pelo menos 52 px de altura, fio de tinta de 2 px e fundo de folha (`.campo`, no `index.css`). O texto vai em Archivo 500, a 1.0625rem: com 16 px ou mais, o iPhone não aumenta a tela quando o campo recebe o foco. O rótulo fica à vista, em cima, em Label.
- **Foco:** o contorno de 3 px no azul do foco, como nos links.
- **Preenchido pelo navegador:** o texto continua em tinta, e o fundo fica no Papel 2, no lugar do azul ou do amarelo do navegador (`:autofill`).
- **Erro:** quando o erro é do que a pessoa escreveu, o campo leva o `aria-invalid`, a mensagem fica ligada a ele pelo `aria-describedby`, e o foco volta para ele.
- **Enquanto envia:** fica só de leitura (`readOnly`), com o texto à vista.
- **Onde:** na folha da newsletter. O login (#109 a #112) pode usar a mesma peça.

### Azulejos
- **O que são:** desenho. O painel, o azulejo grande e cada peça ficam fora do leitor de tela (`aria-hidden`), e nada do que a página diz depende deles. Nas cores forçadas do Windows, eles somem.
- **Como são feitos:** cada peça é um `span` com três variáveis (o fundo, o desenho e a volta), e o CSS pinta o motivo com um gradiente (`estilos/azulejos.css`). O desenho de cada peça vem de `lib/azulejos.ts`, em dados.
- **O sorteio tem semente:** o servidor e o navegador desenham o mesmo painel. Cada trilha tem o seu, pela semente que sai do endereço dela.
- **As cores:** poucos azulejos ficam quietos, papel sobre papel, para o painel respirar; os outros levam uma fita, com tinta ou papel (A Regra de Uma Fita por Azulejo).
- **O azulejo cru:** papel sobre papel, sem cor. É o passo que ainda não foi andado e o artigo que ainda não foi lido. Ele ganha a cor quando vira.
- **O azulejo da posição:** cada artigo e cada trilha da lista têm um azulejo grande, na fita da posição, com os desenhos alternados para dois vizinhos não ficarem iguais (`azulejoDaPosicao`).
- **O painel vivo** (`lib/painel-vivo.ts`): a peça que o ponteiro toca vira e ganha outro desenho; um clique faz a onda, da peça tocada para fora; e, no cartaz, uma peça vira sozinha a cada 1,4 s. No toque, o dedo que rola a página não vira as peças. O painel para quando a aba está escondida ou ele saiu da tela. As cinco fitas continuam juntas: a peça que é a única da cor dela muda de desenho, e não de cor.

### Cartaz
- **Caráter:** a abertura de cada página: o título gigante em tinta e o painel de azulejos.
- **O título:** as palavras tombam no lugar, uma a uma. Cada palavra fica numa caixa fora do leitor de tela, e o título leva o texto corrido no `aria-label`.
- **A frase** (só na página inicial): "um passo de cada vez.", em letra de máquina de escrever, com a tira das cinco fitas, que se risca embaixo dela.
- **O pé:** depois de um fio de tinta, a abertura em Literata, e ao lado (embaixo, até 992 px) a linha do progresso e o botão. Na página de sair, o pé inteiro, com a abertura e as ações, guarda a altura de antes da saída (veja "Página de sair da newsletter").
- **A faixa de informações** (na trilha): "3 artigos", "6 min de leitura" e "Fonte oficial em cada explicação", separados por um quadradinho.

### Folha da lista (o artigo na trilha)
- **Forma:** uma folha com fio de tinta: o número gigante, na fita da posição; o título, o resumo em Literata e a linha "Leitura de 2 min · 2 fontes oficiais"; e o azulejo do artigo. No celular, o número e o azulejo ficam em cima, e o texto usa a largura toda.
- **A folha inteira leva ao artigo:** o link é o título, e a área dele cobre a folha.
- **Hover:** a folha sobe 4 px sobre a sombra de tinta, o azulejo dá um quarto de volta, e o número chega um pouco para o lado.
- **Estados:** a lida leva o visto no meio do número, que perde a cor, e a etiqueta "Lido"; onde a pessoa parou leva a etiqueta "Continue daqui".

### A trilha na lista das trilhas
- Uma folha por trilha: o azulejo da posição, o título, a descrição, "8 artigos · 16 min de leitura" e o progresso em palavras ("Você leu 1 de 8." ou "Você terminou a trilha.").
- **O título é o link** para a trilha, o único no celular. A área de toque dele tem pelo menos 44 px de altura, também quando o título cabe numa linha: um `::before` soma o que falta, por igual em cima e embaixo, sem mexer no desenho.
- **Com a letra grande** (abaixo de 22rem, a variante `letra-grande`), o azulejo passa para cima do texto, como nas folhas da trilha, e a descrição fica em 1rem. Ao lado, o azulejo crescia com a letra, e a coluna do texto ficava estreita demais: palavras como "Constituição" se partiam. Nenhuma palavra da página se parte, de 320 a 430 px, com a letra de 100% a 200%.
- **As miniaturas** (abaixo de 1024 px): um quadrado de 44 px por artigo, com fio de tinta e o número na fita da posição; os lidos levam o visto no canto de cima, por cima da borda. Os quadrados ficam a 6 px um do outro e, quando quebram de linha, as linhas ficam a 12 px (o Renan, em 11/11/2026: "Linhas mais afastadas"). São desenho: o estado está na frase do progresso.
- **A partir de 1024 px,** os quadrados dão lugar às folhas da trilha, embaixo da cabeça, com o desenho de "Nesta trilha":
  - **A ordem:** as folhas descem uma coluna e passam para a próxima (1 a 4 | 5 a 8). A ordem do Tab é a da leitura: a cabeça e depois os artigos 1, 2, 3..., coluna por coluna.
  - **Quantas colunas:** até 2, até 3 a partir de 1280 px e até 4 a partir de 1600 px. É o maior número que divide os artigos, para as colunas terminarem juntas. Com 8 artigos, 2 colunas e, a partir de 1600 px, 4; com 6, 2 e, a partir de 1280 px, 3; com 3, 2 e, a partir de 1280 px, 3. Sem divisor, a última coluna fica no máximo uma linha mais curta.
  - **De onde vêm as linhas:** do número de artigos (`variaveisDaLista`, em `lib/lista-das-trilhas.ts`), em variáveis de CSS que saem iguais no HTML do servidor e no navegador.
  - **Os fios:** cada folha leva o fio de baixo, e o fio de cima da seguinte o cobre. A última de cada coluna fecha a coluna.
- **O progresso, a partir de 1024 px,** fica no fim da linha do rótulo, na mesma célula da grade. A linha já está lá desde o HTML do servidor, e nada pula quando ele chega, nem com "Você terminou a trilha.", a frase mais longa.
- **A cabeça aberta, a partir de 1408 px:**
  - o título fica à esquerda; a descrição e o rótulo, à direita, numa coluna de pelo menos 42rem (a largura da descrição), rentes à base do título;
  - nas telas bem largas, as duas colunas ficam iguais;
  - na coluna estreita, o título quebra em duas linhas logo depois dos 1408 px. Com a barra de rolagem à vista, A Constituição fica em duas linhas até 1551 px, Os Três Poderes até 1586 px, Direitos e Deveres até 1655 px e Processo legislativo até 1761 px; sem a barra, a coluna tem 15 px a mais, e cada título volta a uma linha uns 15 a 21 px antes.
- **Nenhum vão:** de 1024 a 2560 px, com a letra a 100%, a cabeça não deixa ao lado do texto uma faixa vazia de mais de 6rem de altura com mais de um terço da largura da folha.

### "Nesta trilha"
- A lista dos artigos da trilha, no artigo e na lista das trilhas: em cada linha, entre dois fios, o número pequeno na fita da posição, o título em maiúsculas e o estado ("Lido · 2 min"). A lida leva o visto no número; a aberta leva um fio grosso de tinta do lado e "Você está aqui". A lista tem `role="list"`.
- **No artigo,** a lista fica numa coluna só. **Na lista das trilhas,** a partir de 1024 px, ela vai em colunas (veja "A trilha na lista das trilhas"). As regras das colunas ficam presas à `.trilha-da-lista`, e dois testes conferem que "Nesta trilha" não as recebe: o `lib/lista-das-trilhas.test.ts`, no CSS, e o `components/folhas-da-trilha.test.tsx`, que mostra a lista do artigo e confere que ela não leva classe além da `folhas-da-trilha` (uma classe do Tailwind, como `lg:grid-flow-col`, traria as colunas).

### O passo a passo (página inicial)
- **Caráter:** o caminho de um projeto de lei, um passo de cada vez. O conteúdo é o do `infografico.md` da trilha: o texto, os desvios, as fontes e os artigos de cada passo.
- **A fila:** cinco azulejos grandes, um por passo, cada um um botão com o número e o nome do passo (no celular, o nome fica só para o leitor de tela). Os passos já andados ficam com a cor, e os da frente, crus. A partir de 768 px, um fio liga os cinco: o de Papel 3 é o caminho inteiro, e o de tinta avança até o passo da vez. Com o nome à vista, as cinco abas dividem a largura em partes iguais (`minmax(0, 1fr)`), como o fio pede. O nome de um passo não se parte: ele fica do tamanho da palavra mais comprida e, se ela passar da coluna, entra no vão até a aba seguinte. No Edge, "APRESENTAÇÃO" passa 1,14 px da coluna a 768 px, com a letra a 100%, e sobram pelo menos 11 px do vão.
- **O passo:** o número gigante, que tomba no lugar, e ao lado "Passo 2 de 5", o título, o texto, os desvios (cada um com um fio da cor do passo ao lado), as fontes com a data da consulta e os artigos que explicam o passo. O passo sem artigo traz "Ler este passo na trilha", com o título do passo num sufixo só para o leitor de tela.
- **Os controles:** "Voltar" (vazado) e "Próximo passo", que no último vira "Ver do começo"; e o link "Ver o caminho na trilha".
- **Sem JavaScript,** os cinco passos ficam abertos, um embaixo do outro, e a fila e os botões saem. Com JavaScript, o CSS já mostra um passo de cada vez desde a primeira pintura (`@media (scripting: enabled)`), e nada pula quando o código carrega. No navegador que não sabe dizer no CSS se tem JavaScript, os cinco ficam abertos até o código carregar.
- **Leitor de tela e teclado:** o passo escondido fica fora dos dois. O botão do passo da vez leva `aria-current="step"`, e cada troca é anunciada ("Passo 2 de 5: Comissões") pela região `role="status"`.

### O caminho da trilha (a sanfona)
- **Onde:** na página da trilha, quando ela tem um `infografico.md`: depois das folhas e, a partir de 1400 px, ao lado delas.
- **Forma:** o título e o resumo, e uma lista ordenada de passos entre fios. Cada passo é um `<details>` do navegador, com o azulejo pequeno do passo, o título e um "+", que vira "×" quando abre. O título do passo é uma etiqueta, em maiúsculas espaçadas, com o teto: com a letra grande, diminui só o bastante para a palavra mais larga caber ao lado do azulejo e do "+" (a #148). Um passo fica aberto de cada vez (`name="caminho"`), e o primeiro já vem aberto. Funciona sem JavaScript.
- **Dentro:** o texto, os desvios, os artigos que explicam o passo e as fontes, numa linha ("Fonte:" ou "Fontes:", com os títulos em negrito, separados por " · "), com a data da consulta embaixo: "consultadas em 10 de novembro de 2026", ou "consultadas entre … e …". No texto e nos desvios, o "art." e o "§" não se separam do número na quebra de linha.
- **Os artigos:** "Artigo 3: O projeto passa pelas comissões", como link, com um azulejinho na fita do artigo ao lado.
- **Endereço de cada passo:** o `h3` de cada passo tem o id `passo-` e o título sem acento ("Sanção ou veto" vira `passo-sancao-ou-veto`), e o título do caminho tem o id `caminho`. O passo do endereço abre sozinho.
- **Toque e foco:** os links dos artigos e das fontes têm 45 px de área de toque em cada linha e 4 px a mais dos lados, sem mudar o espaço que o texto ocupa (`.link-do-caminho`). O anel de foco contorna o texto, e não a área; nas cores forçadas do Windows, sai na cor de destaque do sistema.
- **Leitor de tela:** tudo é texto de verdade. Os desvios ficam numa lista com o nome "O que pode mudar o caminho". As listas têm `role="list"`: sem marcador, o Safari tira delas o papel de lista.

### Chamada do quiz
- Uma folha com "Quiz da trilha", a frase que diz quantas perguntas ele tem e de quais artigos, o botão "Responder o quiz" e um azulejo grande por pergunta. Os azulejos seguem a ordem das perguntas e não dizem nada sobre acertos. Quando o ponteiro passa, eles giram em fila.
- **O quiz final** tem a mesma folha, com "Quiz final", a frase ("12 perguntas sobre os artigos 1 a 6, com a resposta certa, a explicação e a fonte oficial de cada uma.") e o botão "Responder o quiz final". A partir de 768 px, os doze azulejos vão em quatro colunas, e não em três (o `colunasDoMosaico`, em `lib/quiz.ts`); abaixo disso, em duas fileiras de seis.
- **Onde:** na página da trilha e no fim do artigo depois do qual o quiz aparece. A do quiz final fica na página da trilha, embaixo da do quiz da trilha, a 0,75rem dela, como as folhas dos artigos, e no fim do último artigo, depois das fontes.

### Folha da newsletter (página inicial)
- **Onde:** na página inicial, depois do caminho e antes do rodapé, só quando o build do site tem o `API_URL`. Sem ele, como na Vercel até a API ter casa (#23), a página inicial fica como antes, sem formulário e sem falar de newsletter. O título leva o `id="newsletter"`, o destino do "Inscrever-se de novo" da página de sair.
- **Forma:** a folha clara com fio de tinta, como a chamada do quiz. Em cima, "O jornal legislativo" na letra do cartaz (2.5rem a 5.5rem), a faixa ("Todo domingo", "Câmara e Senado" e "Link oficial em cada item") e a abertura em Literata. Depois, o rótulo "Seu e-mail", o campo com o botão "Receber a newsletter" e a nota, em tinta suave: "O e-mail serve só para mandar a newsletter. Para sair, use o link no fim de cada edição.". O campo e o botão ficam lado a lado enquanto cabem; depois, o botão desce para a linha de baixo. Depois da nota, a ação em texto "Ler as edições" leva à lista das edições: ela aparece onde a folha aparece.
- **Os azulejos:** seis azulejos grandes, nas cinco fitas. A partir de 768 px, ficam à direita, em duas fileiras de três; abaixo disso, numa fileira de seis, embaixo. Quando o ponteiro passa pela folha, eles giram em fila, como os da chamada do quiz. São desenho.
- **O envio:** um formulário com uma função no `action`, do React 19, e o `noValidate`, para a mensagem ser a do site, e não a do navegador. A função não espera a API: ela confere o e-mail e dispara o pedido. Uma função que esperasse prenderia à espera dela as outras transições da página, como a troca de página do roteador, porque o React junta as ações pendentes. Enquanto o pedido espera, aparece "Enviando a inscrição…" embaixo, em Label e tinta suave. O botão fica desligado, com o foco, e o campo, só de leitura: o segundo clique e o Enter não mandam outro pedido.
- **As mensagens** ficam embaixo do botão, em Archivo, e o leitor de tela ouve cada uma pela região `role="status"`. A mesma resposta, de novo, é anunciada de novo.
  - **Feita** (600): "Inscrição realizada.", seguida do que houve com a última edição: "Enviamos para o seu e-mail a última edição publicada.", "A primeira edição ainda não saiu: ela chega no seu e-mail quando for publicada." ou "Não conseguimos confirmar o envio da última edição agora. Se ela não chegar, tente de novo mais tarde.". O campo esvazia. O e-mail novo e o repetido têm a mesma resposta.
  - **Erro do e-mail** (700, com o fio vermelho do "Escolha uma opção" do quiz): "Escreva o seu e-mail para receber a newsletter." e "Confira o e-mail: falta alguma parte, como o @ ou o domínio.". O foco vai para o campo.
  - **Erro do serviço** (700, sem cor, como o "Ainda não deu"): "Muitas inscrições neste minuto. Espere 42 segundos e tente de novo.", com os segundos do `Retry-After` da API, "Não conseguimos registrar a inscrição agora. Espere alguns minutos e tente de novo." e "Não deu para enviar a inscrição. Confira a internet e tente de novo.". O campo guarda o texto, e o foco fica no botão.
- **O e-mail** só vai no corpo do POST: nunca na URL, no armazenamento do navegador ou no console.
- **Sem JavaScript:** o formulário não envia nada, e o `<noscript>` diz "A inscrição precisa do JavaScript do navegador ligado.".
- **As escolhas do Renan,** em 16/11/2026: a seção no fim da página inicial, a folha com azulejos e o formulário só onde o build tem o `API_URL`.

### Quiz
- **Caráter:** um palco de papel com uma pergunta por vez: a abertura, a pergunta, a resposta e o fim. O Renan aprovou a pergunta por tela no plano, em 12/11/2026. A lógica é a de antes (`lib/quiz.ts` e `lib/respostas-do-quiz.ts`): sem placar, sem total de acertos, sem nota e sem ranking. O quiz final, em `/trilhas/<trilha>/quiz-final`, usa o mesmo palco, com as 12 perguntas do `quiz-final.md`, e guarda as respostas à parte das do quiz da trilha.
- **O palco:** a migalha, o título, a tela da vez e, no pé, o andamento. Embaixo dele ficam as faixas do anterior e do próximo, como no artigo. O título só fica à vista na abertura, na letra do cartaz. Nas outras telas, ele sai da vista, e quem vê lê o nome do quiz no pé (veja "O nome do quiz"). O leitor de tela continua com ele: o palco tem o nome do quiz, e o título vem antes do enunciado e do título do fim.
- **O mosaico:** um azulejo grande por pergunta, na ordem delas, três por fileira, ou quatro com mais de seis perguntas, como as 12 do quiz final. Na abertura, fica inteiro e com cor. Nas perguntas, fica cru, e cada pergunta respondida devolve a cor ao azulejo dela, com qualquer resposta. A partir de 992 px, ele fica grande no meio do papel durante a pergunta e se recolhe no canto de cima quando a resposta chega, acima da folha da resposta e sem encostar nela, mesmo com as três fileiras do quiz final; abaixo disso, fica pequeno no canto, ao lado da contagem, e inteiro embaixo da migalha na abertura e no fim. É desenho, fora do leitor de tela, e não diz nada sobre acertos.
- **A abertura:** "Quiz da trilha", ou "Quiz final", na letra do cartaz, a frase que explica, a faixa ("6 perguntas", ou "12 perguntas", e "Fonte oficial em cada resposta") e o botão: "Começar", "Continuar", com o quiz pela metade, ou "Rever as respostas", com ele terminado. O botão só funciona com JavaScript e só aparece depois que ele carrega, no lugar que já guarda a altura do texto mais alto dos três (veja "O progresso chega depois"): "Rever as respostas" vai em duas linhas no celular com a letra grande, e nada desce quando o botão aparece.
- **A pergunta:** "Pergunta 2 de 6", em Label, e o enunciado formam a legenda de um grupo de rádios. Cada opção é uma folha com fio de tinta, com pelo menos 56 px de altura, e a letra (A, B, C) na fita da posição, com contorno de tinta. O rádio de verdade cobre a opção inteira, sem aparecer: o clique, o teclado e o leitor de tela são os do navegador, e o anel de foco contorna a opção. Com o ponteiro, a opção anda para o lado e mostra um fio rosa, amarelo ou azul, pela posição; a escolhida fica assim, em bloco de tinta com o texto em papel. Antes da resposta, o fio não usa o verde nem o vermelho, que ficam para a certa e a errada (o Renan, em 13/11/2026); quem distingue as opções é a letra, que continua na fita da posição. Embaixo, o botão "Responder"; sem opção marcada, aparece "Escolha uma opção antes de responder.", com um fio vermelho ao lado.
- **A resposta:** as opções viram com o estado, sempre escrito: a certa leva um fio verde e "Resposta certa"; a que a pessoa marcou e estava errada fica tracejada, com um fio vermelho e "Sua resposta"; as outras passam para a tinta suave. A folha da resposta, com a tira das cinco fitas no alto, tomba no lugar: "Você acertou." ou "Você errou.", com o visto ou o xis em tinta e um fio verde ou vermelho embaixo; a explicação; "Para rever", com o link do artigo; as fontes oficiais; e o botão "Próxima pergunta" ou, na última, "Terminar". A partir de 992 px, a folha fica ao lado das opções; abaixo disso, embaixo delas, e, para quem errou, traz também a resposta certa por extenso. Trocar de opção fecha a resposta: vale a última que a pessoa responde.
- **O verde e o vermelho** dizem aqui certo e errado, sempre junto com a frase, o desenho do visto ou do xis e a etiqueta de cada opção. São as mesmas fitas, e não marcam lado nenhum. Antes da resposta, eles só aparecem pela posição, na letra da opção (a A é verde e, numa pergunta com cinco opções, a E é vermelha) e nos quadradinhos do andamento, que são desenho: o fio da opção, que diz qual a pessoa escolheu, fica na rosa, na amarela e na azul.
- **O fim:** "Você terminou o quiz." na letra do cartaz, o "Recomeçar o quiz", os artigos do quiz para rever, numa lista entre fios, e os botões "Voltar para" a trilha e, vazado, "Rever as respostas", que passa pelas perguntas com a resposta de cada uma à vista. O fim fica preso ao alto do palco: o que muda com o recomeço vem depois da linha do "Recomeçar o quiz".
- **Recomeçar:** depois do clique em "Recomeçar o quiz", a tela continua a mesma: o título do fim, ou a frase do andamento, diz "Você recomeçou o quiz.", o mosaico e os quadradinhos perdem a cor, e o mesmo botão vira "Desfazer", no mesmo lugar. O "Começar" leva à primeira pergunta, e dali em diante o recomeço não se desfaz mais.
- **O andamento:** o pé do palco, em papel com o grão do fundo, com um quadradinho por pergunta, que vira e ganha a cor da posição quando a pergunta é respondida (o contorno marca a pergunta da vez), e a frase "Você respondeu 2 de 6.", em minúsculas. Numa tela com pelo menos 40rem de altura, ele fica preso embaixo enquanto a pessoa rola, e o que recebe o foco para acima dele. Na abertura do quiz final com uma linha do piloto (a segunda etapa, o pedido para terminar a primeira ou a linha do envio), ele fica solto, depois do botão, e volta a prender nas perguntas: a linha deixa a abertura mais alta, e o pé preso cobria o "Começar" no celular pequeno. Os quadradinhos ficam numa fileira enquanto cabem; onde os doze do quiz final não cabem, como a 320 px, vão em duas fileiras de seis, ou em fileiras de três onde nem seis cabem (a 320 px, com a letra acima de 200%), e nenhum fica sozinho embaixo.
- **O nome do quiz:** fora da abertura, a linha da frase do andamento começa pelo nome do quiz ("Quiz da trilha", "Quiz final" ou, no piloto, "Antes da trilha"), em Label e na tinta. É ali que quem vê descobre em que quiz está; o leitor de tela já tem o título e não ouve o nome de novo. Na primeira pergunta, ainda sem frase, e no fim, o nome fica sozinho. O nome e a frase ficam na mesma linha de base e andam juntos, ao lado dos quadradinhos ou embaixo deles: a 360 px, a linha do quiz da trilha vai para baixo dos seis quadradinhos, como a do quiz final. Onde os dois não cabem lado a lado, como com a letra a 200% a 320 e a 360 px, a frase desce inteira, sem virar uma coluna estreita. O Renan escolheu na #136, em 17/11/2026: "B. Nome no pé (Recomendado)". Antes, o título virava uma etiqueta acima da contagem e do título do fim; a opção A, o nome no fim da migalha, caía sozinho na segunda linha dela a 360 px, no mesmo lugar da etiqueta.
- **Foco e leitor de tela:** a cada troca de tela, o foco vai para o título do que apareceu: o enunciado, o resultado ou o título do fim. O resultado é anunciado pela região `role="status"` ("Pergunta 2: você errou. A resposta certa é: …"). As setas trocam de opção, e o Enter responde.
- **Sem JavaScript:** o palco fica só com a abertura, sem o botão e sem o andamento, e as perguntas vêm todas embaixo dele, num `<noscript>`: cada uma numa folha, com os rádios e um "Ver a resposta" do navegador (`<details>`).
- **Alto contraste:** nas cores forçadas do Windows, a opção escolhida ganha um contorno, e o estado de cada opção já vem escrito.

### O piloto
- **Caráter:** a medição do piloto (#40), em duas etapas, no palco do quiz: o antes, na página `/piloto`, antes de ler a trilha, e o depois, no quiz final. A página fica fora do menu e dos buscadores (`noindex`): o endereço vai só para quem participa. A tela nunca mostra o total de acertos, e o código do piloto não aparece nela. Só o site com a API (o `API_URL` do build) tem o piloto: sem ela, a página diz "O piloto ainda não funciona neste endereço do site.", e o quiz final é o de sempre. O Renan escolheu em 16/11/2026, na #92, a página só pelo endereço, o palco do quiz com os três passos e a linha do envio embaixo do título, como na folha da newsletter.
- **A abertura:** "Antes da trilha" na letra do cartaz, a frase que explica as duas etapas, a faixa ("12 perguntas", "Duas etapas" e "Sem nome e sem e-mail"), os passos, as notas, a frase do estado ou a linha do envio, o botão ("Começar", "Continuar" ou "Ir para a trilha") e, depois de um fio, o "Começar como outra pessoa".
- **Os passos:** uma lista entre fios, como "Nesta trilha", sem link: em cada linha, o número pequeno na fita da posição (verde, amarela e azul), o nome em maiúsculas ("Antes da trilha", "Os seis artigos" e "O quiz final") e o estado em palavras, "Você está aqui" ou "Feito". O feito leva o visto no número, e o da vez, o fio grosso de tinta do lado. Sem a API e com o piloto encerrado, os passos só explicam o caminho, sem estado.
- **As notas:** três frases em Literata, na tinta suave: a resposta certa fica para o quiz final; o piloto é para quem tem 18 anos ou mais, e quem tem menos pode fazer o quiz final, que não envia nada; num computador usado por mais gente, a janela anônima. O site não pergunta a idade.
- **O antes:** as 12 perguntas do quiz final, uma por vez, sem a resposta certa. O "Responder" guarda a resposta e passa à próxima pergunta, sem a folha da resposta, e o leitor de tela ouve "Pergunta 3: resposta guardada.". No pé, o nome do quiz é "Antes da trilha". Não há "Recomeçar o quiz" nem "Rever as respostas". O fim traz "Você terminou a primeira etapa.", a linha do envio, a frase que chama para a trilha e o botão "Começar a trilha". Com o piloto encerrado, o fim também oferece, vazado, "Rever as respostas", agora com a certa.
- **O depois:** no quiz final, para quem fez o antes neste navegador, uma linha embaixo do título: "Piloto, segunda etapa: são as mesmas 12 perguntas do começo. Vale a primeira resposta de cada uma. No fim, o site envia quantas você acertou, sem o seu nome.". Respondida a pergunta, as opções travam (o `fieldset` desligado), e o "Recomeçar o quiz" só volta quando a etapa termina. Com o antes pela metade, a linha pede para terminar a primeira etapa, com o link da página do piloto, e o quiz não mede nada.
- **A linha do envio:** embaixo do título do fim, como a mensagem da folha da newsletter. "Enviando a primeira etapa…" (ou a segunda) vai em Label, na tinta suave; a resposta ("Recebemos a primeira etapa." e "Recebemos a segunda etapa. Obrigado por participar do piloto."), em Archivo 600; e os problemas, em Archivo 700, sem cor: o piloto encerrado (410), o limite de envios, com os segundos da espera, a API fora do ar, a falta de conexão e o pedido recusado (413 e 422). Os textos ficam em `components/piloto.tsx`.
- **O reenvio:** sem resposta da API, o "Tentar de novo", em ação de texto, manda na hora. Depois da falha, ele fica no lugar, desligado (o `aria-disabled`), enquanto um pedido espera, o dele ou o que o site manda sozinho: não pisca a cada tentativa nem perde o foco. O site tenta de novo só com a página do piloto ou o quiz final aberto: em 5, 15, 30 e 60 segundos, depois a cada minuto; no limite, depois dos segundos do `Retry-After`, ou de um minuto; sem conexão, também quando a internet volta. O leitor de tela ouve cada mudança pelo aviso do palco, e o foco fica onde está; quando o "Tentar de novo" sai com o foco, o foco passa para a frase.
- **Começar como outra pessoa:** "Outra pessoa usou este navegador? Comece do zero: o site apaga daqui os artigos lidos, as respostas dos quizzes e o piloto." e a ação em texto. Ela apaga tudo o que o site guardou no navegador, sem "Desfazer" (o Renan, em 16/11/2026): a pessoa seguinte não pode recuperar o que era da anterior. Depois do clique, "Pronto: este navegador começou do zero." toma o lugar do botão, com o foco, e o aviso diz o mesmo. Um pedido da pessoa anterior que ainda espera a API não segura o da próxima.
- **Sem JavaScript:** a abertura e os passos, sem o botão e sem o "Começar como outra pessoa", com a frase "O piloto precisa do JavaScript do navegador ligado. Sem ele, nada é enviado.". As perguntas do antes não vêm num `<noscript>`, como as do quiz, porque o "Ver a resposta" mostraria a certa.

### Artigo
- **A folha de leitura:** a folha clara com fio de tinta, sobre a parede de papel. No canto de cima, o azulejo do artigo, que entra virando, peça por peça.
- **No alto:** a migalha, o número na fita da posição com "Artigo 2 de 6 artigos", o título, a faixa entre dois fios ("Leitura de 2 min" e as fontes) e o resumo.
- **O texto:** Literata, até 39rem. Os intertítulos vão na letra do cartaz, mais larga (68%). As listas levam um azulejinho no lugar do marcador: um quarto de círculo na fita da posição do item, que dá um quarto de volta a cada item. As listas numeradas ficam com o número.
- **A barra de leitura:** a tira das cinco fitas, no alto da tela, que enche com a rolagem do texto: começa a encher quando o começo do texto passa de uma linha a 60% da altura da tela, e fica cheia quando o fim dele passa. É a animação de rolagem do CSS: onde o navegador não tem, a barra não aparece. Fica embaixo do cabeçalho: enquanto ele está na tela, cobre a barra, que aparece quando ele sai, na rolagem. Fica fora do leitor de tela e não recebe o ponteiro.
- **O lido:** no fim do texto, um azulejo cru vira para o verde, com o visto, quando a pessoa chega ali, e aparece "Você leu este artigo.", com o "Desmarcar" embaixo. Quem volta a um artigo lido já o vê verde, sem animação.
- **Fontes oficiais:** depois de um fio de 6 px, a lista numerada: o número na letra do cartaz, o título da fonte como link em negrito e, embaixo, o domínio e a data da consulta em tinta suave.
  - **O domínio comprido** quebra antes de um ponto: "direitoshumanos" e ".dpu.def.br". O Renan escolheu, na #76, em 11/11/2026: "Nos pontos (Recomendado)". Os pontos só viram lugar de quebra abaixo de 20rem; dali para cima, o endereço vai inteiro.
- **Anterior e próximo:** duas faixas no pé da folha, de borda a borda, lado a lado a partir de 768 px. Em cima, o número na fita da posição, "Artigo anterior" ou "Próximo artigo" e o azulejo do artigo, que gira quando o ponteiro passa; embaixo, o título, com a largura toda da faixa. No último artigo, a faixa da direita volta para a trilha. As mesmas faixas ficam embaixo do palco do quiz (`OutrosArtigos`), direto na página: por isso a faixa é papel com o grão do fundo, e não papel liso, que cortava o grão. Quando o ponteiro passa, ela vai para o Papel 2, e o grão continua.

### O visto da folha lida (assinatura)
- **Caráter:** o visto do professor no caderno, que diz "este já foi" sem cara de erro. Ele substituiu o X em 11/11/2026: o Pedro sugeriu trocar o X, e o Renan concordou ("um X grande não faz sentido"). O X lia como "errado" ou "cancelado", ainda mais num site com quiz.
- **Forma:** um traço só, no viewBox de 60: 7 em tinta sobre 17 na cor da folha, com ponta e junta redondas. É um componente só (`MarcaDeLido`), com uma classe para cada lugar: no meio do número da folha (`visto-no-numero`), no canto da miniatura (`visto-na-miniatura`) e sobre o azulejo verde do lido, no fim do artigo.
- **A palavra "Lido" continua** ao lado: o visto é a marca, e a palavra diz o que ela quer dizer. O visto fica fora do leitor de tela.
- **Movimento:** quando a pessoa chega ao fim do texto, o visto é desenhado de uma vez, em 400 ms: a perna curta sai devagar, como a caneta que encosta no papel, e a longa vai num golpe só. Ele é desenhado no azulejo do lido e no número do artigo em "Nesta trilha"; nas outras páginas, aparece pronto. O "Desmarcar" apaga o visto sem animação.
- **Alto contraste:** nas cores forçadas do Windows, o traço fica na cor do texto (`CanvasText`), e o de baixo, na do fundo (`Canvas`). Dentro de um link, o visto leva a cor dos links (`LinkText`). O `currentColor` não serve: com o `forced-color-adjust: none`, o Chromium dá a ele a tinta original, e o visto some no fundo escuro.

### Migalha
- "Trilhas / Processo legislativo", em Label, com os links sublinhados e a página atual sem link, em tinta suave. Na edição, é só o link "Edições" (veja "Página da edição"). Cada link tem 44 px de altura, inteiros para o toque: a migalha fica por cima do que vem depois dela (`z-index: 1`), porque a linha do título gigante do quiz e a do número do artigo são mais altas que a letra e passavam por cima dos links.

### Página não encontrada e página de erro
- **Forma:** o cartaz das páginas de dentro, com o painel de azulejos. No 404, o número gigante em cima do título "Página não encontrada", com um algarismo em cada fita, pela ordem; o número é desenho, e o título diz o que houve. Na de erro, só o título, "A página não carregou". Embaixo, uma frase em Literata e as duas ações: o botão e uma ação em texto. Nas páginas das edições, o 404 (a edição que não existe, o rascunho, o endereço que não pode ser de uma edição e a página da lista depois da última) leva o botão "Ver as edições", no lugar de "Ver as trilhas".
- **Página de erro:** aparece quando a página pedida não chega (a rede caiu, o pedido foi bloqueado ou o servidor deu erro), em todas as rotas, dentro do site, com o cabeçalho e o rodapé. Sem ícone de alerta e sem cor de erro: o erro é dito em palavras.
- **Tentar de novo:** pede a página de novo, sem recarregar (`router.invalidate()`). Enquanto o pedido não volta, o carregando aparece na hora, no lugar da página de erro, com o foco na frase (veja "Carregando"). Se der certo, a página pedida abre do alto, com o foco no título, ou no trecho do endereço (#caminho), como numa navegação: o router devolveria a rolagem que a página de erro tinha, e, com a letra grande, a página chegava rolada, sem o título na tela. Se falhar de novo, aparece "Ainda não deu. Confira a internet ou espere um pouco e tente de novo.", o foco volta ao botão e a frase é anunciada pela região `role="status"`. A página de erro volta parada, sem a chegada: ela já estava na tela antes do carregando.
- **O aviso é da visita:** o "Ainda não deu" vale só para a tentativa feita ali. Quem sai da página de erro e volta, inclusive pelo voltar do navegador, encontra a página sem o aviso, e o leitor de tela não o anuncia de novo.
- **Título da aba:** "Erro ao carregar a página · Mandatômetro". A tela não mostra a mensagem técnica nem a pilha do erro.
- **Nas edições:** a API fora do ar, sem resposta em 8 s ou com uma resposta de outra forma também dá esta página, com HTTP 500. O servidor registra uma linha fixa, com o motivo curto, e o erro que chega ao HTML e ao navegador tem só a mensagem fixa "As edições não carregaram.", sem o endereço da API nem a resposta dela.

### Página de sair da newsletter
- **Endereço:** `/newsletter/sair?codigo=`. O link do fim de cada edição abre a API, e o GET dela, que não apaga nada, manda o navegador para cá.
- **Forma:** o cartaz das páginas de dentro, como o 404: o painel de azulejos, o título "Sair da newsletter", a frase "Com o botão, o seu e-mail sai da lista e as edições de domingo param de chegar. Antes dele, nada muda." e as ações: o botão "Confirmar a saída" e "Ir para o início".
- **Só o botão apaga:** programas de e-mail e antivírus abrem os links sozinhos. A página não tem loader e não pede nada ao abrir, nem quando o roteador adianta a página.
- **Enquanto confirma:** "Confirmando a saída…" fica embaixo das ações, em Label e tinta suave, com o botão desligado e o foco nele. A linha tem o lugar guardado desde o HTML do servidor, com uma cópia invisível e fora do leitor de tela, e nada mexe quando ela aparece ou sai. Antes, de 62rem para cima, com duas colunas, o cartaz se apoia no pé, e a linha que entrava embaixo das ações empurrava o botão 11 px para cima; numa coluna, a página crescia 29 px, ou 58 px com a letra a 200% (#153). O lugar custa essa linha, no fim do pé, em todos os estados: 29 px com a letra a 100% e 58 px a 200%. A 1024 px, ela cabe ao lado da abertura; a 1366 px, o título e o pé ficam 11 px mais acima. Vale nas mesmas condições do título: sem a API, sem o código ou com o código mal formado, não há botão, nem espera, nem o lugar dela.
- **Depois da saída:** o título vira "Você saiu da newsletter." e a frase, "O seu e-mail não está mais na lista, e as próximas edições não vão chegar.".
- **O título guarda o lugar:** os dois títulos vêm no HTML do servidor, invisíveis e fora do leitor de tela, na mesma célula da grade, e o título tem sempre a altura do mais alto. O da vez fica embaixo, junto do fio. A 768 px, "Sair da newsletter" cabe numa linha e "Você saiu da newsletter." quebra em duas: o título já nasce com as duas linhas, e as ações não descem quando ele muda. Sem a API, sem o código ou com o código mal formado, o título não muda e não guarda lugar. Com o código bem formado que a API recusa (o 422), ele continua guardando o lugar, embora não mude mais: tirar a reserva na resposta faria a frase e as ações subirem uma linha quando ela chega.
- **O pé também guarda o lugar:** o pé inteiro, com a abertura e as ações, tem sempre a altura de antes da saída. A abertura guarda as duas frases, a de antes e a de depois da saída, e os dois erros, invisíveis e fora do leitor de tela, na mesma célula da grade, e a da vez fica no alto, junto do fio. A grade fica num elemento em volta do parágrafo da frase da vez, e não nele: um parágrafo em grade sai da árvore de acessibilidade do Chromium, e quem anda de parágrafo em parágrafo pulava a frase (#152). O lugar do botão guarda uma cópia dele, com o mesmo desenho, e o botão fica na mesma célula. Depois da saída, a frase é mais curta, e os dois links caberiam numa linha só: nas telas estreitas e com a letra a 200%, o pé encolhia, a página encurtava, e o navegador puxava a rolagem de quem estava no fim dela. Com a letra a 200%, numa tela estreita, o "Inscrever-se de novo" nascia até 135 px acima do botão (#141). Agora a página fica com a mesma altura, em todas as larguras e letras, e sobra um vão entre a frase e o "Inscrever-se de novo": as linhas que a frase de depois tem a menos (até duas) e o lugar do botão, que fica só com o link no meio. Com a letra a 200% numa tela estreita, ele chega a uns 190 px; no celular com a letra a 100%, a uns 70 px. Vale nas mesmas condições do título: sem a API, sem o código ou com o código mal formado, o pé não guarda lugar.
- **O "Inscrever-se de novo"** fica no lugar do botão, no meio dele, com o foco, e leva à folha da newsletter (`/#newsletter`). O código já usado dá a mesma tela, porque a API responde igual.
- **Os erros:** "Não conseguimos confirmar a saída agora. Espere alguns minutos e tente de novo." e "Não deu para confirmar a saída. Confira a internet e tente de novo.", em negrito e sem cor, como o "Ainda não deu". O erro fica no lugar da frase de abertura, como a do link incompleto, e a explicação sai enquanto ele está na tela. A abertura guarda os dois erros com o desenho deles, em negrito: a explicação é sempre a mais alta, e o erro entra sem mexer em nada. O botão continua onde estava, com o foco, e um clique no mesmo ponto tenta de novo. Antes, o erro ficava embaixo das ações: de 62rem para cima, ele empurrava o botão até 65 px para cima, o "Ir para o início" ficava embaixo do ponteiro, e o clique seguinte no mesmo ponto abria a página inicial (#153). O leitor de tela ouve o erro uma vez, pelo aviso (a região `role="status"`): a frase da abertura não é região viva.
- **A nova tentativa:** a página volta à espera, com a explicação no lugar do erro, a linha "Confirmando a saída…" e o aviso. Quando o mesmo erro volta na hora (a rede caída), a espera fica meio segundo na tela antes dele, e o aviso lê o erro de novo: sem isso, o erro voltava no mesmo quadro, e nada mostrava que a tentativa tinha acontecido. O meio segundo conta do clique, e um erro que demora mais que isso aparece assim que chega.
- **O link incompleto** (sem o código, com o código mal formado ou com o código que a API recusa): "Este link está incompleto. Abra de novo o link de saída que vem no fim de cada e-mail da newsletter.", sem o botão. Quando a API recusa o código, o "Ir para o início" sobe para o lugar do botão, com o foco, e o item dele guarda a altura com uma cópia invisível, fora do leitor de tela: o espaço que sobra fica no fim do pé, e nada sai do lugar. A cópia é o mesmo link, sem o endereço, e quebra as linhas como ele: no Firefox, o "Ir para o início" vai em duas linhas, e uma cópia num `span` ia numa, porque a regra `a.acao-de-texto` (a margem negativa e o padding da área de toque) só pega o `<a>`. A 390 px, o pé ficava 24 px mais baixo (48 px com a letra a 200%), e a página encurtava (#152). Sem o endereço, a cópia não é link e não recebe o foco.
- **O segundo clique de um clique duplo**, e o terceiro de um clique triplo, não seguem nenhum dos dois links, em nenhum estado (o `detail` do clique acima de 1, como no `lib/clique.ts`): depois da saída e com o código recusado, o link nasce embaixo do ponteiro. Um clique novo, de propósito, segue o link. O Enter também: o link que nasce no lugar do botão (o "Inscrever-se de novo" ou, com o código recusado, o "Ir para o início") não segue o Enter no primeiro meio segundo depois da troca, o tempo do clique duplo do Windows. Quem apertava o Enter duas vezes no botão mandava o segundo para o link novo, que já tem o foco, e saía da página (#153). A guarda está em dois lugares, porque os navegadores mandam o Enter de jeitos diferentes: no Chromium, o Enter clica no link com o `detail` 0, e quem segura é o clique; no Firefox, o clique do Enter vem com o `detail` 1, como o do mouse, e quem segura é o `keydown` do Enter. O tempo conta da troca, e não do foco: quem sai do link com o Tab e volta depois segue com o Enter. A guarda só impede seguir o link: não manda pedido nem muda o foco, e o Tab sai do link na hora. O Enter segurado também fica na página: no Firefox, cada repetição da tecla (o `keydown` com o `repeat`) ativa o link, e quem segurava o Enter no botão saía pelo link novo assim que o meio segundo acabava; a repetição não segue esse link, e um Enter novo, sim. O "Ir para o início" do lado, que não nasce no lugar do botão, segue o Enter na hora.
- **Sem a API** (o build sem o `API_URL`): "A newsletter ainda não funciona neste endereço do site.", sem o botão.
- **Sem JavaScript:** o botão não envia nada, e o `<noscript>` diz "Para confirmar a saída, o navegador precisa do JavaScript ligado. Sem ele, use a opção de cancelar a inscrição do seu programa de e-mail.".
- **O código fica fora dos buscadores, do Referer e do cache:** o `noindex`, o `no-referrer` e o `Cache-Control: no-store`, no `<head>` e nos cabeçalhos da resposta. Título da aba: "Sair da newsletter · Mandatômetro".

### Lista das edições
- **Endereço:** `/edicoes`, e `/edicoes?pagina=2` a partir da segunda página. Um `?pagina` que não é um número inteiro maior que 1 leva ao endereço sem ele; a página depois da última dá o 404.
- **O cartaz:** o das páginas de dentro, como o de Trilhas: o painel de azulejos, o título "Edições" e, no pé, a abertura "O que o Congresso votou em cada semana, explicado em linguagem simples. Cada item traz a fonte oficial.", a frase "A edição nova sai todo domingo e também chega por e-mail." e a ação em texto "Receber por e-mail", que leva à folha da newsletter (`/#newsletter`). A faixa: "25 edições", "Todo domingo" e "Fonte oficial em cada item".
- **Cada edição** é uma folha da trilha (veja "Folha da lista"), na fita da semana (A Regra da Cor da Semana), da mais nova para a mais antiga, 20 por página:
  - no lugar do número, o último dia da semana em dois algarismos ("15"), como na folhinha, com o mês abreviado embaixo ("NOV"), em Label e tinta. Na tela, o dia é desenho; o leitor de tela ouve no lugar dele, antes do título, "Semana de 9 a 15 de novembro de 2026";
  - o título que o revisor deu, com o teto calculado. Ele é o link, e a área dele cobre a folha;
  - "Publicada em 16 de novembro de 2026", em Label;
  - o azulejo grande da semana.
- **O período não se repete na folha:** o título padrão já traz ele ("Jornal legislativo — 09 a 15/11/2026"), e o dia grande mostra o fim da semana. Na primeira versão, uma frase em Literata repetia o período embaixo do título; ela saiu na revisão da Atena, em 17/11/2026. O hover, o foco e a subida com a rolagem são os da folha da trilha.
- **As páginas vizinhas:** depois de um fio de tinta, "Página 2 de 3", em Label e tinta suave, e as ações em texto "Edições mais novas" e "Edições mais antigas". A partir de 40rem, a página fica no meio, as mais novas à esquerda e as mais antigas à direita; abaixo disso, uma linha embaixo da outra. São links: funcionam sem JavaScript.
- **Sem edição publicada:** no lugar das folhas, a folha clara com fio de tinta, como a da newsletter: "A primeira edição ainda não saiu", na letra do cartaz, "Ela sai num domingo, com o que o Congresso votou na semana. Inscreva-se e ela chega no seu e-mail assim que for publicada." e o botão "Receber por e-mail". O cartaz fica sem o número de edições e sem a ação "Receber por e-mail", que não se repete.
- **Sem a API** (o build sem o `API_URL`, como nas prévias dos PRs): o cartaz com "As edições ainda não aparecem neste endereço do site.", "Enquanto isso, as trilhas explicam passo a passo como o Congresso funciona.", o botão "Ver as trilhas" e "Ir para o início". A página de cada edição mostra o mesmo cartaz, e o cabeçalho e a página inicial não falam das edições.
- **Título da aba:** "Edições · Mandatômetro" e, a partir da segunda página, "Edições (página 2) · Mandatômetro".

### Página da edição
- **Endereço:** `/edicoes/7`, com o id da edição na API. O rascunho, a edição que não existe e o id que não pode ser de uma edição dão o 404.
- **A folha:** a folha de leitura do artigo, na fita da semana, a mesma da folha na lista, com o azulejo grande da semana no canto. Não tem a barra de leitura, o lido nem o anterior e o próximo: cada edição vizinha pediria outra chamada à API.
- **No alto:** o caminho, só com o link "Edições", e, embaixo do azulejo do canto, o título que o revisor deu, com o teto calculado. Nada fica acima do título além do caminho: nem número, nem rótulo. Embaixo dele, a faixa: o período com o ano ("9 a 15 de novembro de 2026"), "Publicada em 16 de novembro" (com o ano só quando é outro: "Publicada em 1º de janeiro de 2027") e "3 itens". O período fica na página com o ano mesmo quando o revisor troca o título padrão. Depois, o lide: "O que o Congresso votou na semana, em linguagem simples. Cada item traz a fonte oficial e a data em que ela foi coletada."
- **Por que assim:** na primeira versão, a primeira tela repetia o período três vezes: no caminho, num rótulo com o dia grande acima do título e no título padrão. A Atena pediu, em 17/11/2026, nenhum rótulo acima do título e a primeira tela sem a repetição, com o período e o ano na página em todo caso.
- **"Nesta edição":** o desenho de "Nesta trilha": o título "Nesta edição", em Label, e, entre fios, o número pequeno de cada item na fita da posição e o título dele, que leva ao item (`#item-3`). Abaixo de 1200 px, fica dentro da folha, depois do lide; daí para cima, na coluna ao lado, fixa ao rolar. As duas cópias vêm no HTML, e o CSS mostra uma de cada vez: o leitor de tela só encontra a que está na tela. O clique leva ao item sem pedir nada ao servidor.
- **Cada item:** depois de um fio de tinta, o número na fita da posição, o título, o texto em Literata (um parágrafo para cada bloco separado por uma linha em branco, e a quebra simples de linha fica dentro do parágrafo, como no e-mail; sempre como texto, nunca como HTML), o quadro de cada votação, as fontes e, quando o revisor escolheu um artigo da trilha, a ação em texto "Entenda na trilha: ‹título do artigo›". O item é uma seção com o id `item-3`, ligada ao título dele; quando o índice leva até ele, fica 1rem de respiro em cima (`scroll-margin-top`).
- **O item antigo,** de antes dos fatos por votação, vem sem o quadro da votação, com as fontes.
- **O fim:** depois de um fio de 6 px, o botão "Ver todas as edições" e a ação em texto "Receber as próximas por e-mail" (`/#newsletter`).
- **Título da aba e prévia do link:** "‹título› · Mandatômetro"; a descrição diz "O que o Congresso votou de 9 a 15 de novembro de 2026, em 8 itens em linguagem simples, com a fonte oficial de cada um.", com o `og:type` article. A imagem é a `previa.png` de todas as páginas.
- **Sem JavaScript:** tudo vem no HTML do servidor: os itens, os quadros, as fontes e os links do índice.

### Quadro da votação
- **Forma:** o título "Votação de 12 de novembro de 2026", em Label, e, entre dois fios de tinta, uma lista de termos (`dl`): o "Resultado registrado" ("Aprovada", "Rejeitada" ou "Não classificado nos dados usados", em Archivo 800, a 1.125rem, com altura 1.25); o placar, "Sim", "Não", "Abstenções" e "Obstruções", com o número grande em cima do nome; e, numa linha à parte, "Presidência", com "1, contada à parte", em Literata. O placar vai em duas colunas no celular, em quatro a partir de 40rem e numa só abaixo de 20rem.
- **Tudo em tinta:** o Sim não é verde, e o Não não é vermelho. O placar é contado por votação, e a Presidência fica fora dele. Um resultado que não é aprovada nem rejeitada não vira aprovação.
- **Sem placar,** como nas votações secretas do Senado: "O placar não está disponível nos dados usados.", sem zero e sem adivinhar a modalidade.
- **Leitor de tela:** o nome vem antes do número no HTML, e o leitor de tela lê "Sim, 312"; a tela põe o número em cima (`column-reverse`).

### Fontes do item
- **Forma:** o título "Fontes", em Label, e a lista numerada das "Fontes oficiais" do artigo, sem o fio de 6 px. As fontes vêm agrupadas pelo endereço, como no e-mail: o primeiro endereço se chama "Fonte oficial", e os outros, "Outra referência oficial". Embaixo do nome, o site, como nas fontes das trilhas, e "coletada em 13 de novembro de 2026", no dia de Brasília.
- **Nomes únicos para o leitor de tela:** o título leva "do item 3", e o nome de cada link, " do item 3", só para o leitor de tela; nas outras referências, vem antes o número delas na lista, o mesmo que a tela mostra ao lado: "Outra referência oficial 2 do item 3", "Outra referência oficial 3 do item 3". Assim, a lista de links da página não fica com oito "Fonte oficial" iguais, e um item com três endereços não fica com duas "Outra referência oficial do item 3" para lugares diferentes. Na tela, o nome continua "Fonte oficial" e "Outra referência oficial".
- **O trecho literal** de cada coleta vem entre aspas, num `blockquote` com o endereço no `cite` e um fio fino de tinta do lado, sempre como texto; o leitor de tela ouve "Trecho da fonte:" antes dele. A mesma página coletada de novo aparece embaixo, em tinta suave, "Outra coleta da mesma referência, em 14 de novembro de 2026.", com o trecho dela.
- **Um endereço que não é `http` ou `https`** fica sem link: o nome vai em negrito, seguido de "Coletada em …".

### Carregando
- **Quando aparece:** quando a página pedida demora. Numa navegação, se ela levar mais de 1 s; no "Tentar de novo" da página de erro, na hora. Quando aparece, fica pelo menos 0,5 s, para não piscar (`TEMPOS_DO_CARREGANDO`, em `components/carregando.tsx`, que o `router.tsx` passa ao router).
- **Forma:** a frase "Carregando a página…", no lugar da página, no alto do conteúdo, em Label e tinta suave, como a linha do progresso. Ela fica na margem da página, a mesma da migalha da trilha e do quiz e do título das páginas (no artigo, a migalha fica dentro da folha). Sem ícone, sem giro e sem barra: o estado é dito em palavras, e nada se mexe, com ou sem o movimento reduzido.
- **Leitor de tela e foco:** a frase fica numa região `role="status"`, que entra vazia e recebe a frase logo depois, para ser anunciada. Se o foco estava na página que saiu (o "Tentar de novo" ou o link que a pessoa tocou dentro dela), ele vem para a frase, sem o anel, e o navegador rola até ela, se ela estiver fora da tela; quando a página chega, o foco vai para o título dela, ou volta ao botão, se a tentativa falhar. Um foco num link do cabeçalho fica onde está.
- **As escolhas do Renan,** em 13/11/2026: o texto "Carregando a página…", o lugar "Etiqueta no alto", a espera "1 s, e fica 0,5 s" e o foco "Na frase".

### Ícone da aba e prévia do link
- **O ícone:** o M do nome em Archivo 900, largura 68%, em papel no quadrado de tinta, com a tira das cinco fitas embaixo. O `favicon.ico` tem 16, 32 e 48 px, e o `apple-touch-icon.png`, 180 px. É a letra do nome, não um logo, e troca quando o logo existir.
- **A prévia do link** (`previa.png`, 1200 × 630 px, a mesma em todas as páginas): o bloco de tinta com o nome (46 px) e o lema em letra de máquina (26 px), a tira de 10 px, o título da página inicial no papel liso (112 px, com a frase em letra de máquina e a tira riscada) e uma fileira de dez azulejos, com as cinco fitas pela ordem, duas vezes. Os tamanhos ficam fora da escala do site de propósito: a imagem tem 1200 px e é vista pequena.
- **Os textos:** a aba da página inicial diz "Mandatômetro · o diário oficial político, simplificado"; as outras páginas, "Título · Mandatômetro". O título da prévia é "Mandatômetro: entenda a política brasileira, um passo de cada vez".
- **Como gerar:** `pnpm --filter web imagens` abre o Edge ou o Chrome sem janela e fotografa `imagens/icone.html` e `imagens/previa.html`, com as fontes do site embutidas. Cada PNG leva a origem num bloco tEXt `impeccable:prompt`. Para mudar uma imagem, mude o HTML e gere de novo.

## Motion

Tudo é CSS e a animação nativa do navegador (View Transitions, animação de rolagem e Web Animations), sem biblioteca. As regras ficam em `src/estilos/movimento.css`.

Três curvas: o **golpe** (`cubic-bezier(0.5, 0, 0.15, 1)`), seco, para o que se risca; a **mola** (`cubic-bezier(0.2, 0.8, 0.3, 1.25)`), que passa um pouco e volta, para o que vira e tomba; e a **suave** (`cubic-bezier(0.2, 0.7, 0.2, 1)`), para o que sobe.

- **Na chegada:** os azulejos do painel entram virando, em onda, a partir do canto de cima (0,7 s cada, 42 ms entre um e outro); as palavras do título tombam no lugar (70 ms entre uma e outra); a tira se risca embaixo da frase; o pé do cartaz sobe.
- **Na rolagem:** as seções sobem e aparecem quando entram na tela (`.revelar`), e a barra de leitura enche. As duas usam a animação de rolagem do CSS, dentro de `@supports`: sem ela, e sem JavaScript, a peça já está no lugar. Nada fica escondido à espera de um script. A seção termina de aparecer quando o alto dela sobe 7rem na tela, e não numa fração da altura dela: só a faixa de baixo da tela mostra a peça entrando, e o texto parado mais acima nunca fica apagado. O que um link da própria página alcança não sobe, como os itens da edição, que o índice "Nesta edição" alcança: o navegador calcularia o lugar com a peça ainda deslocada, e o item pararia 28 px acima do alto da tela.
- **O mapa do fundo** anda mais devagar que a página: sobe um décimo do que ela rola, até 60vh, nas seis primeiras telas de rolagem, e depois fica parado (`mapa-anda`, com `animation-timeline: scroll()` e `animation-range: 0 600vh`, dentro de `@supports`). O trecho é um comprimento fixo, e não o progresso da página inteira: ele só se mexe quando a pessoa rola, e não salta quando a página muda de altura com ela parada, como ao abrir um passo do caminho. Parado, o fundo está parado. Sem a animação de rolagem, o mapa fica fixo atrás da página. O décimo vale em todas as páginas: antes, a velocidade dependia do comprimento da página, e, nos artigos, o mapa agora anda o dobro no celular e uma vez e meia no computador; no quiz e no 404, que são curtos, anda bem menos. O Renan decidiu manter assim em 14/11/2026, na #101: "Manter como está".
- **Com o ponteiro:** o azulejo vira; a folha sobe; o azulejo da folha dá um quarto de volta; o botão sobe e mostra a tira; o traço do link do cabeçalho se risca.
- **Na ação:** os azulejos do passo a passo viram em fila até o passo da vez, o texto do passo entra de lado (da direita ao avançar, da esquerda ao voltar), com a seção cortando o que passa da borda da tela, para a página não rolar de lado, e o número tomba; o azulejo do lido vira para o verde, e o visto se desenha. No quiz, as opções tombam no lugar, uma a uma; depois da resposta, viram com o estado, a folha da resposta tomba, presa pela borda de cima, e os azulejos já acesos do mosaico fazem a onda; no fim, o mosaico inteiro faz a onda. A tela que sai sobe um pouco e some (0,4 s) antes de a seguinte entrar.
- **Cada animação parte de um estado de saída e chega ao estado normal da peça:** onde a animação não roda, a peça aparece pronta.

### A troca de página
- **O gesto:** a página nova aparece azulejo por azulejo, num giro de relógio em cada peça, por cima da página de antes, que fica parada. Dura 0,6 s. Ao voltar, o giro é ao contrário.
- **O sentido** vem do lugar da página no site, e não da ordem da visita (`lib/troca-de-pagina.ts`): a página inicial em cima, depois Trilhas, cada trilha e os artigos dela, na ordem da trilha, com o quiz no lugar dele, logo depois do artigo que o chama, e o quiz final depois do último artigo. A página do piloto fica ao lado da lista das trilhas, e a lista das edições também, com cada edição embaixo dela, como uma trilha. Ir mais para dentro, ou para um artigo mais adiante, é avançar; o contrário é voltar, também pelo botão voltar do navegador. Do quiz para o "Artigo anterior" é voltar. Da edição para a lista das edições é voltar, e de uma edição para outra é avançar, como entre duas trilhas.
- **O cabeçalho,** quando aparece na tela nas duas páginas, fica parado por cima, e só o traço da seção troca, num esmaecer de 200 ms. Quando uma delas está rolada para baixo dele, ele vai com a página dele: o de antes fica na foto da página de antes, e os azulejos o cobrem junto com ela. A página nova abre no alto num link; no trecho, num link para um trecho de outra página, como o "Receber por e-mail" das edições (`/#newsletter`); e, na volta e no avançar do navegador, na rolagem que tinha. Onde fica o trecho só se sabe com a página nova na tela: aí, e quando não se sabe onde ela abre, como na volta depois de recarregar a página, o cabeçalho também vai com a página de antes. Antes, na volta para uma página rolada e na ida para um trecho de outra página, ele voava até o alto da nova e deixava uma faixa de papel no lugar (a #164 e a #172, em 18/11/2026).
- **Os cliques:** enquanto a troca roda, o navegador mostra fotos das duas páginas, e nada da página nova responde ao ponteiro (o `pointer-events: none` nas fotos não muda isso, porque a página inteira está na foto). Para o clique não se perder, o toque encerra a troca na hora, e o clique segue para o que está embaixo do ponteiro na página nova (`cliqueDuranteATroca`, em `lib/troca-de-pagina.ts`). O segundo clique de um clique duplo não segue: ele cairia num botão que a pessoa nem viu. Num navegador sem o `activeViewTransition`, o clique feito durante a troca ainda se perde.
- **Quando não anima:** na primeira carga, num link para um trecho da mesma página e no "Tentar de novo" da página de erro. Quando a tentativa falha, a página de erro volta sem a chegada: os azulejos do painel não viram, e o pé não sobe outra vez (o `data-de-novo`). O carregando também entra sem animação, no lugar da página de antes; numa navegação, a página que chega depois dele aparece azulejo por azulejo, por cima da frase. Num navegador sem as View Transitions, a página troca direto; num que não tem os tipos de transição, vira o esmaecer padrão do navegador.
- **Foco e leitor de tela:** nada muda. O foco vai para o título da página nova, ou para o trecho do endereço; a animação é só da tela.
- **Como:** pelas View Transitions do navegador, que o TanStack Router pede em cada navegação (o `defaultViewTransition` do `router.tsx`), com os tipos `folha`, `avancar` ou `voltar` e `moldura-na-tela`. O `moldura-na-tela` olha o cabeçalho na página de antes e onde a nova abre: na volta e no avançar, o router só devolve a rolagem dentro da troca, depois da foto da página de antes, e por isso o site guarda a rolagem de cada visita quando a pessoa sai dela (`rolagemDasPaginas`); num link para um trecho, ele também só rola a página nova até o trecho dentro da troca, e, sem a rolagem guardada, o trecho conta como dúvida. A máscara da foto nova é uma grade de azulejos que se abre com um ângulo animado (`@property --vt`).

### Movimento reduzido
Com `prefers-reduced-motion: reduce`, nada vira, tomba, sobe nem se risca: as peças aparecem no lugar, e os estados trocam direto. O painel não vira com o ponteiro nem sozinho. A barra de leitura sai, e o mapa do fundo fica parado. A página troca num esmaecer de 160 ms, nos dois sentidos, e o cabeçalho, quando aparece nas duas páginas, vai direto para o lugar; senão, esmaece com a página de antes. No quiz, as telas trocam na hora. Tudo continua funcionando: o movimento nunca carrega informação que não esteja também em palavras.

## Do's and Don'ts

### Do:
- **Do** manter o texto em tinta sobre o papel ou a folha (ou em papel sobre a tinta), em qualquer tamanho.
- **Do** dar a cada artigo, trilha, passo e item de uma edição a fita da posição, pela ordem verde, amarela, azul, rosa, vermelha, e a cada edição a fita da semana dela.
- **Do** pôr uma fita só em cada azulejo, e as cinco juntas em cada painel.
- **Do** deixar os azulejos fora do leitor de tela: são desenho.
- **Do** escrever o estado em palavras e marcar na folha: o visto e "Lido", "Continue daqui", "Você está aqui".
- **Do** guardar desde o HTML do servidor o lugar do que só aparece depois que o navegador sabe o progresso. A exceção são as linhas do piloto, que só quem participa vê (veja "O progresso chega depois").
- **Do** deixar o botão que vira "Desfazer" no mesmo lugar, sem outro controle aparecendo ali.
- **Do** usar o foco de 3 px no azul do foco, afastado 3 px, e o amarelo dentro do cabeçalho.
- **Do** respeitar o movimento reduzido, e fazer cada animação chegar ao estado normal da peça: sem ela, a peça aparece pronta.
- **Do** deixar a letra crescer com a configuração do navegador: as margens e os respiros do celular ficam em px, o título cresce até a palavra mais larga encostar nas margens (o teto), e nenhuma página rola de lado.
- **Do** oferecer "Desfazer" logo depois de apagar uma marca, em vez de pedir confirmação antes. O "Começar como outra pessoa", do piloto, apaga sem "Desfazer": o que era da pessoa anterior não volta.
- **Do** deixar sem fundo o que fica direto no papel, para o mapa aparecer; o que precisa cobrir a página, como o pé do quiz e as faixas do anterior e do próximo, leva o papel com o grão (`var(--papel) var(--grao)`).

### Don't:
- **Don't** fazer "site do governo": burocracia e letra pequena.
- **Don't** fazer "coisa de criança": cor demais e tom infantil. A cor fica nos azulejos e nos números; o resto é papel e tinta.
- **Don't** fazer "jornal partidário": manchete gritando e cor de partido. As fitas são as cinco juntas, pela ordem; nenhuma delas representa um lado.
- **Don't** pôr texto em cima de uma cor de fita.
- **Don't** pôr o nome do quiz numa etiqueta acima da contagem ou do título do fim: fora da abertura, ele vai no pé, com o andamento (a #136).
- **Don't** usar o fundo escuro na página: o Renan recusou em 12/11/2026. A tinta em bloco fica no cabeçalho, no botão e nas etiquetas.
- **Don't** mostrar placar, total de acertos, nota ou ranking, nem animar uma pontuação: a animação comemora o aprender. Os azulejos do quiz seguem a ordem das perguntas. O piloto envia o total de acertos de cada etapa, e a tela não o mostra.
- **Don't** usar barra de progresso para a trilha: o progresso é o visto e as palavras. A barra do alto do artigo mostra só a rolagem do texto.
- **Don't** usar sombra esfumada, canto arredondado ou degradê suave.
- **Don't** pintar o fundo com mancha de cor, degradê ou sombra borrada, nem fazer ele se mexer sozinho: o fundo é o papel, com o grão e as curvas do mapa, e só anda com a rolagem.
- **Don't** trazer de volta a itálica fina ao lado do título pesado: o Renan achou com "muito cara de IA" (13/11/2026).
- **Don't** inventar um logo; até o time fazer o dele, o nome em texto é a marca, e o M do nome é o ícone.
- **Don't** usar a vermelha como cor de domingo, nem escolher a cor de uma edição pelo assunto: a cor é a da semana no calendário (A Regra da Cor da Semana).
- **Don't** pintar o placar de uma votação: o Sim não é verde, e o Não não é vermelho. O placar fica em tinta.
- **Don't** trazer uma biblioteca de animação nem imagem para os azulejos: o movimento é do navegador, e o desenho, do CSS.
- **Don't** esconder conteúdo à espera de um script: o que anima na entrada já está no HTML, no lugar.
- **Don't** pôr ícone girando ou barra no carregando: ele diz em palavras que a página está a caminho, e nada nele se mexe.
- **Don't** marcar o lido com um X: ele lê como "errado" ou "cancelado", ainda mais num site com quiz.
- **Don't** prender um tamanho de letra só à largura da tela (`vw` puro): a letra para de crescer com a configuração do navegador.
- **Don't** pôr hífen automático (`hyphens`): a palavra só se parte, sem hífen, quando não cabe sozinha na linha.
- **Don't** deixar uma coluna de texto ao lado de outra com `1fr` puro: com a letra grande, ela cresce até a palavra mais comprida e alarga a página. Use `minmax(0, 1fr)`.
- **Don't** pôr grade ou flex num `<p>`: o Chromium tira o parágrafo da árvore de acessibilidade, e quem anda de parágrafo em parágrafo pula a frase. A grade que guarda o lugar das frases (as `Reservas`) fica num elemento em volta do `<p>`, como na abertura da página de sair e no andamento do quiz (#152).
