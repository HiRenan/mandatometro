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
  entrada-da-busca:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel-3}"
    rounded: "{rounded.none}"
    height: "44px"
    padding: "0 8px 0 12px"
  entrada-da-conta:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    height: "44px"
    padding: "0 14.4px"
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
  folha-da-busca:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    width: "44rem"
  folha-da-newsletter:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    typography: "{typography.headline}"
    rounded: "{rounded.none}"
  estado-no-mapa:
    backgroundColor: "{colors.folha}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
    size: "44px"
  estado-aberto:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.none}"
  carimbo-do-voto:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.none}"
  plenario:
    backgroundColor: "{colors.papel-2}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.none}"
  capa-do-video:
    backgroundColor: "{colors.papel-2}"
    textColor: "{colors.tinta}"
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
- Azulejos feitos de gradientes do CSS, sem imagem. O azulejo de cada trilha e de cada passo do caminho leva o símbolo do assunto, em SVG escrito no código, também sem arquivo de imagem. São desenho e ficam fora do leitor de tela.
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

As três são servidas pelo próprio site, pelo `@fontsource`, com `font-display: swap`: o texto aparece na letra reserva e troca de letra quando a fonte chega. Os arquivos latinos da Archivo e da Literata são pré-carregados no `<head>` de todas as páginas, e o navegador os pede junto com o CSS. Numa rede boa, eles chegam antes de o texto aparecer, que já sai na letra certa; numa rede lenta, chegam depois, e o texto ainda pula na troca. A Courier Prime é baixada em todas as páginas, porque o lema está no rodapé de todas. O pré-carregamento dela só vale onde ela aparece na primeira tela: a partir de 1312 px, por causa do lema embaixo do nome no cabeçalho, e, abaixo disso, só na página inicial, para a frase do título. Nas outras páginas, abaixo de 1312 px, o navegador a pede pelo CSS, para o rodapé.

A Courier Prime entrou na #89 só para a frase do cartaz e o lema: `@fontsource/courier-prime`, licença SIL OFL 1.1, 19 kB. É a única dependência nova da direção. Ela tomou o lugar da Instrument Serif itálica (22 kB), que o Renan achou com "muito cara de IA": em 13/11/2026, ele escolheu a letra de máquina num rascunho com cinco letras.

**Character:** a Archivo, bem preta e apertada, grita como cartaz de rua; a Courier Prime responde baixo, batida à máquina, como uma linha de diário oficial; a Literata, calma, faz o professor paciente falar.

### Hierarchy
- **Numeral** (900, largura 62%, altura de linha 0.78): o número da folha, na cor da fita da posição, com contorno de tinta, pintado antes do miolo: `max(3px, 0.05em)` nos grandes e 2 px nos pequenos (o da aba do passo a passo, o de "Nesta trilha", "Nesta edição" e "Neste termo", o das faixas do anterior e do próximo, o dos resultados da busca e o das miniaturas). O do artigo lido tem o miolo em Papel 2 e o contorno em tinta suave. Na folha da trilha, de 5.5rem a 11.5rem; no passo da página inicial, 7rem no celular e até 17rem; no alto do artigo, de 5rem a 9rem; no 404, de 7rem a 17rem; o dia de cada edição, na lista das edições, de 4.5rem a 9rem, em algarismos da mesma largura; o número de cada item da edição e o de cada parte do termo, de 3.5rem a 5.5rem; o de cada ficha do painel de revisão, de 2.75rem a 3.5rem; em "Nesta trilha", "Nesta edição", "Neste termo", "Itens da edição" (no painel) e nas faixas do anterior e do próximo, 2.75rem; nos resultados da busca, 2.25rem, em algarismos da mesma largura; nas miniaturas, 1.75rem. Os números do placar da votação usam a mesma letra, de 2.5rem a 3.25rem, em tinta, sem fita e sem contorno. No patrimônio declarado, o ano de cada eleição (de 2rem a 2.75rem, altura 0.9) e o valor em destaque (de 2rem a 3rem, altura 1) também, em algarismos da mesma largura.
- **Headline** (`titulo-condensado`: 900, largura 62%, altura 0.95, maiúsculas): o título da página. Na página inicial, de 3.25rem a 8rem; nas páginas de dentro (a trilha, Trilhas, Edições, o 404, a de erro e a de sair da newsletter), de 3.5rem a 11rem; no artigo, na edição e no termo, de 2.75rem a 6rem, com no máximo 10 em de largura e a altura 1.15 da leitura; no painel de revisão, "Revisão da edição", de 2.25rem a 4rem. Também "A primeira edição ainda não saiu", na lista das edições sem edição (2.25rem a 4.5rem), "O caminho de um projeto de lei" na página inicial (2.75rem a 6.5rem, altura 0.88), o título de cada passo dela (2.25rem a 3.75rem), "Quiz da trilha" e "Quiz final" nas chamadas (2.5rem a 5.5rem) e "O jornal legislativo" na folha da newsletter (2.5rem a 5.5rem). No quiz, o título da abertura (4rem a 12.5rem, altura 0.86): "Quiz da trilha", "Quiz final" e, na página do piloto, "Antes da trilha"; o título do fim (3.25rem a 7.5rem), também o "Você terminou a primeira etapa." do piloto; e o resultado da resposta (2.25rem a 3.5rem, altura 0.88).
- **Enunciado** (Archivo 800, largura 72%, altura 1.02, em minúsculas): a pergunta do quiz, de 1.75rem a 2.75rem, e 1.375rem abaixo de 22rem. É o único título em minúsculas: lê-se como frase.
- **Title** (`titulo-de-folha`: 900, largura 62%, altura 1.15, maiúsculas): o título de cada folha de uma lista. O do artigo na trilha e o da edição na lista das edições, de 1.875rem a 3.5rem; o da trilha em Trilhas, de 2.25rem a 4.5rem; o do anterior e do próximo, de 1.5rem a 2.5rem. Também o nome na página do parlamentar e o título da página da votação, que vêm da API, no tamanho do título da página.
- **Subtitle** (`subtitulo-condensado`: 900, largura 68%, altura 1.15, maiúsculas): os intertítulos do texto (1.75rem a 2.5rem), "Fontes oficiais" (1.5rem, altura 1), o título do caminho na trilha (1.875rem a 2.75rem, altura 0.9), o título de cada item da edição e o de cada parte do termo (1.875rem a 3rem, com no máximo 14 em de largura) e, no painel de revisão, o título de cada ficha (1.625rem a 2.5rem, com no máximo 14 em) e o das folhas por cima (1.625rem a 2.5rem).
- **Wordmark** (900, largura 68%, maiúsculas, 0.01em entre as letras): o nome Mandatômetro. No cabeçalho, 1.625rem (1.3125rem abaixo de 480 px e 1.1875rem abaixo de 360 px); no rodapé, de 2.25rem a 4.5rem. É texto, não logo.
- **Máquina** (Courier Prime 400, em minúsculas): a segunda linha do título da página inicial ("um passo de cada vez.", a 0.4 em do título, com a tira riscada embaixo) e o lema, a 0.9375rem, embaixo do nome no cabeçalho (a partir de 1312 px) e no rodapé. Só isso.
- **Lead** (Literata 500, altura 1.45): o resumo do artigo, de 1.25rem a 1.4375rem. A abertura dos cartazes é Literata 400, de 1.0625rem a 1.25rem, com altura 1.5 e até 34rem de largura.
- **Body** (Literata 400, altura 1.68): o texto do artigo, de 1.0625rem a 1.1875rem, com até 39rem de largura. Os resumos das folhas e os textos dos passos ficam em 1.0625rem, com altura 1.5 a 1.6.
- **Label** (`rotulo`: Archivo 650, 0.8125rem, maiúsculas, 0.08em entre as letras): a faixa de informações, a frase do progresso, a migalha, "Artigo 2 de 6 artigos", o nome do quiz no pé, a etiqueta de estado, o rótulo "Seu e-mail", o mês embaixo do dia da edição, "Nesta edição", "Neste termo", os títulos do quadro da votação e das fontes do item e, em tinta suave, "Enviando a inscrição…", "Confirmando a saída…", os nomes do placar, a legenda do valor do patrimônio ("em reais de hoje"), "Página 2 de 3" e, na caixa da busca, o título "Buscar no site", a contagem, o tipo de cada resultado, "Carregando a busca…" e "Procurando também nas edições…". Os nomes dos links e das ações seguem a mesma ideia, um pouco maiores: o botão (800, 1rem), a ação em texto (700, 0.875rem), os links dos artigos de um passo (750, 0.9375rem), o título de cada resultado da busca (750, 1.0625rem, 0.03em entre as letras) e o título de cada passo da sanfona (750, 1rem, 0.05em entre as letras), que também tem o teto da letra grande. A tecla do atalho, na entrada da busca, é menor (700, 0.75rem, 0.06em entre as letras), dentro do fio dela.

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
| Revisão da edição, no painel (medido pela folha, o `teto-pela-caixa`) | REVISÃO | 3.3 |
| Termo de consentimento | CONSENTIMENTO | 6.52 |
| Os títulos das partes do termo, um teto para as nove (largura 68%) | SERVIÇOS | 4.07 |
| A caixa da saudação do perfil, que guarda as duas linhas | OLÁ, | 1.75 |
| Sua leitura, no perfil (largura 68%) | LEITURA | 3.46 |
| Sua conta, no perfil (largura 68%) | CONTA | 2.82 |

- **O recuo** é o que fica entre a caixa do título e as margens da página: o respiro e os fios da folha, a coluna do número e a do azulejo. Quando a folha divide a página com uma coluna ao lado (o caminho, na trilha; "Nesta trilha", no artigo), o contêiner diz quanto ela toma no `--recuo-de-fora`, e os títulos de dentro somam. No título de cada passo da sanfona, o recuo é o que fica na linha dele: o azulejo pequeno, os dois vãos e o "+" (abaixo de 22rem, sem o azulejo, um vão e o "+"); a partir de 1400 px, a coluna do caminho diz no `--recuo-de-fora` quanto da página fica fora dela. Na folha da newsletter, a partir de 768 px, o recuo do título soma também a coluna dos azulejos (15.25rem) e o vão (3rem).
- **Na lista das trilhas:**
  - de 640 a 1407 px, o recuo do título é o do azulejo ao lado;
  - a partir de 1408 px, o título divide a cabeça com a coluna da descrição, e o recuo soma também os 42rem dela e o vão entre as duas;
  - até uns 1500 px, é o teto que dá o tamanho do título. Ele mede a página pelo `100cqi`, sem a barra de rolagem, e o título encosta na coluna com a barra à vista ou sem ela;
  - quando a coluna da descrição cresce, a do título também passa de 42rem, e o título já parou no tamanho maior: 4,5rem × 5,66 = 25,5rem.
  - O `lib/lista-das-trilhas.test.ts` confere a conta com as medidas do CSS.
- **Os títulos que vêm da API** (o da edição, o de cada item, o da edição na lista e o de cada ficha do painel de revisão) não têm o `[--palavra:N]` fixo, porque mudam a cada edição: o `estiloDoTeto` (`lib/conteudo/regua.ts`) mede a palavra mais larga de cada um, com a mesma régua do teste e a mesma folga, e põe o `--palavra` num `style`. A conta é a mesma no servidor e no navegador, e o título não muda de tamanho quando a página carrega.
  - O teto deles se mede só pela caixa em volta, e não pela página (o `teto-pela-caixa`, no `index.css`): a folha da edição e o texto da folha na lista também são contêineres (o `caixa-do-teto`), e o tamanho é `min(o tamanho normal, 100cqi ÷ a largura da palavra)`, sem margens nem recuo para somar. Pela largura da página, a conta não via a folha da edição parar de crescer, a partir de uns 1440 px: uma palavra perto do teto passava da caixa e se partia no computador (a revisão do Argos, em 17/11/2026).
  - A caixa do título não fica mais estreita que a palavra mais larga (o `min-width`), mesmo com o `max-width` de 10em do título da edição e o de 14em do título do item: uma palavra de 27 letras diminui a letra e não se parte.
- **No perfil da conta:**
  - **A saudação** traz o primeiro nome, que vem da API, e as duas linhas dela não quebram. O `tetoDaSaudacao` (`lib/perfil.ts`) mede a linha inteira, com a mesma régua e a mesma folga, e põe o `--palavra` num `style`: um nome comprido, ou com hífen, só diminui a letra. A caixa em volta guarda as duas linhas na letra do "OLÁ," (o `TETO_DA_CAIXA`), a maior que a saudação pode ter, e nenhum nome passa dela.
  - **Os títulos das trilhas**, no quadro da leitura, levam um `--palavra` só, o da palavra mais larga entre eles (hoje, CONSTITUIÇÃO, 5.66), e as trilhas ficam com a mesma letra. Ele sai do conteúdo, pelo `tetoDoTitulo`, e o teto se mede pela caixa do texto da trilha (o `teto-pela-caixa`).
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
- **Perfil da conta:** o cartaz e, embaixo, "Sua leitura" e "Sua conta", numa coluna. A partir de 62rem, o quadro da leitura vira uma tabela, e "Sua conta" se abre em duas colunas.
- **Painel de revisão:** a folha da edição, numa coluna só, com os campos na largura do texto (até 39rem). "Itens da edição" segue o lugar de "Nesta edição": abaixo de 1200 px, dentro da folha, depois da edição; daí para cima, na coluna de 17rem à direita. O pé fica preso embaixo da tela quando ela tem 40rem de altura ou mais.
- **Quiz:** o palco tem pelo menos a altura da primeira tela, com o andamento e, fora da abertura, o nome do quiz no pé, e as faixas do anterior e do próximo vêm embaixo dele. A partir de 992 px, o texto fica à esquerda e o mosaico, à direita; na pergunta, as opções à esquerda e a folha da resposta à direita. Abaixo disso, tudo vai numa coluna, com o mosaico embaixo da migalha. Abaixo de 20.1rem, como a 320 px, os doze quadradinhos do andamento do quiz final vão em duas fileiras de seis. O quiz final e a página do piloto usam o mesmo palco; a do piloto vem sem as faixas do anterior e do próximo.
- **Rodapé:** o documento é uma grade de três linhas (cabeçalho, conteúdo e rodapé), e o conteúdo estica: numa página curta, como o 404 e a de erro, o rodapé fica no fim da tela.

### A letra grande
Quem aumenta a letra do navegador (a fonte padrão, e não o zoom) vê o mesmo desenho, com a letra maior, e a página não rola de lado. Os pontos de quebra são em rem: com a letra a 200%, o desenho do celular vale até 1536 px.

- **A margem do celular** fica em px e não cresce com a letra: com a letra a 200%, ela continua com 20 px. O Renan escolheu, em 11/11/2026: "Ficam em 20 px (Recomendado)". O respiro de dentro das folhas, o do cabeçalho e o azulejo do canto do artigo seguem a mesma regra.
- **Uma coluna não alarga a página:** toda coluna de texto é `minmax(0, 1fr)`. Com `1fr` puro, ela cresce até a palavra mais comprida. Pelo mesmo motivo, o parágrafo com um endereço comprido, como o e-mail de contato no perfil, fica na largura da coluna: numa grade com `justify-items: start`, ele não fica mais estreito que a palavra mais comprida, e, com a letra a 200%, a página rolava de lado a 320 px.
- **A reserva:** uma palavra que não cabe sozinha numa linha se parte na beirada, sem hífen (`overflow-wrap: break-word` no `body`). Nenhum `hyphens` entra no site: com ele, o navegador põe hífen no fim da linha mesmo quando a palavra caberia na linha de baixo. O Renan escolheu, na #76, em 11/11/2026: "Sem hífen (Recomendado)". Nos títulos, o teto vem antes da reserva.
- **O número sai do lado do título** em "Nesta trilha" quando a tela tem menos de 22rem (a variante `letra-grande`): a 360 px, com a letra acima de 16 px. O número fica no lugar, e o título desce para a linha de baixo, com a largura toda. O Renan escolheu, na #76, em 11/11/2026: "Sim, número em cima (Recomendado)".
- **O que sai com a letra grande** (abaixo de 22rem): o azulejo de cada passo, na sanfona do caminho, e o azulejo das faixas do anterior e do próximo. São desenho, e o texto ganha a largura.
- **O botão** muda abaixo de 20rem (veja "Botão").

### O progresso chega depois
O navegador só sabe o que a pessoa leu quando a página termina de carregar. O que aparece depois disso tem o lugar guardado desde o HTML do servidor:

- a linha do progresso, acima do botão, na página inicial e na trilha;
- a linha do "Recomeçar a trilha", embaixo da descrição da trilha;
- a etiqueta "Lido" ou "Continue daqui", que fica fora do fluxo, no respiro de cima de cada folha;
- o aviso de lido, no fim do artigo (4.5rem), com o azulejo e as palavras lado a lado. Quando o aviso tem menos de 14.5rem de largura, como com a letra a 200% numa tela de 360 ou 390 px, as palavras descem para baixo do azulejo e passam do lugar guardado: o aviso cresce de 144 para 257 px, e as fontes descem 113 px. No momento do visto, o que desce está abaixo da tela, mas o azulejo, que ficava no meio do lugar guardado, sobe 16 px, para o alto do aviso. Um lugar desse tamanho deixaria 57 px vazios embaixo do aviso com a letra normal;
- o passo a passo da página inicial, que a partir de 768 px tem sempre a altura do passo mais alto;
- no quiz, a linha do "Recomeçar o quiz" (menos no depois do piloto, veja abaixo) e o lugar do botão de começar, na abertura, e a frase do andamento, no pé do palco, que guarda a altura da frase mais comprida. O mosaico da abertura vem sempre com cor: não muda quando o navegador descobre as respostas guardadas;
- o lugar do botão de continuar, na trilha;
- na página do piloto, o lugar do botão ("Começar", "Continuar" ou "Ir para a trilha"), o estado de cada passo, que guarda a altura de "Você está aqui", e a linha do "Começar como outra pessoa";
- no perfil da conta, a caixa da saudação, a abertura, a linha do progresso, o lugar do botão, a frase de cada trilha e a linha "Você entrou como…" (veja "Perfil da conta"). Ali, o que chega depois é a resposta da conta e a primeira leitura do progresso dela, e não só o progresso do navegador. A linha do nome guarda uma linha (duas abaixo de 40rem), e um nome mais comprido empurra o texto de baixo dele.

**As linhas do piloto não guardam lugar:** a do quiz final, embaixo do título (a segunda etapa, o pedido para terminar a primeira ou a linha do envio), e, na página do piloto, a frase do estado (o piloto concluído ou encerrado) e a linha do envio. Só quem participa do piloto vê essas linhas, e um lugar guardado deixaria um espaço vazio no quiz final de todo o público, inclusive dos jurados. Quem participa vê o conteúdo descer uma vez, quando a página carrega do zero; numa navegação dentro do site, a linha já vem com a página. Decidido na #92, em 16/11/2026. No depois, a linha do "Recomeçar o quiz" sai da abertura quando a da segunda etapa entra: o botão não aparece durante a etapa, e a linha vazia empurrava o "Começar" para baixo da primeira tela do celular pequeno.

**O lugar do botão** (`LugarDoBotao`, com o `.lugar-do-botao`): o botão de continuar da trilha muda de texto ("Começar pelo primeiro artigo" vira "Continuar de onde parou: …" e, com a trilha terminada, "Responder o quiz da trilha", "Responder o quiz final" ou "Ver as outras trilhas"); o do quiz só aparece depois que o JavaScript carrega, como "Começar", "Continuar" ou "Rever as respostas". Cada texto que o botão pode ter vem no HTML do servidor, numa cópia invisível com o desenho do botão, fora do leitor de tela, e todas ficam empilhadas no mesmo lugar: o lugar tem sempre a altura do texto mais alto, na letra e na largura que a tela tiver. No celular, onde o botão fica em cima da lista dos artigos, a lista não pula quando o botão troca de texto.

Na trilha, o botão de continuar vem depois da linha do "Recomeçar a trilha", e não antes: o que fica acima dela não muda com o progresso.

**Com a trilha terminada,** o botão leva ao que vem depois dela: "Responder o quiz da trilha", para o quiz, enquanto falta alguma resposta, contada como na página do quiz; depois, "Responder o quiz final", contado do mesmo jeito; e "Ver as outras trilhas", para a lista das trilhas, com os quizzes todos respondidos ou numa trilha sem eles. Antes, o lugar ficava vazio. O Renan decidiu em 14/11/2026, na #101: "Um botão útil no lugar" e, com o quiz também respondido, "Ver as outras trilhas". O quiz final entrou nessa ordem no plano da #92, que o Renan aprovou em 16/11/2026. O "Recomeçar a trilha" e as chamadas dos quizzes, embaixo da lista, continuam.

## Elevation & Depth

O sistema é chapado: sem sombra esfumada e sem degradê suave. A profundidade vem da tinta.

- **A sombra dura:** a folha de uma lista sobe 4 px quando o ponteiro passa, sobre uma sombra de tinta de 6 px, sem desfoque. O azulejo do passo da vez, na página inicial, fica 8 px acima, sobre uma sombra igual, de 8 px. São as duas únicas sombras do site. O fio grosso da folha aberta, em "Nesta trilha", também usa o `box-shadow`, mas `inset`: desenha um fio de 6 px, e não uma sombra. No quiz, a opção que o ponteiro toca, ou que a pessoa escolheu, anda 7 px para o lado e mostra um fio rosa, amarelo ou azul, e a certa e a errada levam um fio de 8 px por dentro, verde ou vermelho: também são fios feitos com o `box-shadow`, sem desfoque. No painel de revisão, o campo com erro leva um fio vermelho de 5 px por dentro, à esquerda, e o estado "Revisado" da ficha, um fio de 2 px em volta, do mesmo jeito.
- **O giro:** os azulejos viram em volta do próprio eixo, com perspectiva. Na lista das trilhas, quando o ponteiro passa pela folha, e na sanfona, quando o passo abre, as quatro peças do azulejo com símbolo dão uma volta inteira em onda. O símbolo termina de pé. Na fila da página inicial, "Próximo passo" vira as peças uma a uma e troca a cor de cada peça quando ela fica de lado. Em repouso, tudo é plano.

### Named Rules
**A Regra da Tinta Chapada.** Sem sombra esfumada e sem degradê suave. Os gradientes do site têm borda dura: as faixas da tira e os motivos dos azulejos. Os símbolos dos azulejos também são chapados, numa cor só, sem contorno e sem sombra. O fundo segue a regra: o grão é ponto e o mapa é traço, sem mancha e sem desfoque.

## Shapes

Tudo é reto: raio zero (`--radius: 0`).

- **O fio:** 2 px em tinta. Contorna as folhas, separa as seções e os itens das listas. "Fontes oficiais" abre com um fio de 6 px.
- **A tira:** as cinco fitas em faixas iguais, com 6 px de altura: embaixo do cabeçalho, embaixo do botão quando o ponteiro passa, e na barra de leitura do artigo. Embaixo da frase do título, ela é mais fina e se risca: 0,075 em da frase, com pelo menos 3 px. No alto da folha da resposta do quiz, ela tem 10 px.
- **O azulejo:** um quadrado com o fundo, um motivo por cima e uma volta, de 0 a 3 quartos. Os motivos são dez: o quarto de círculo, a meia-lua, o triângulo, o círculo, as listras, o arco, os dois quartos opostos, o liso, os quatro pontos e a metade. Entre dois azulejos de um painel, 2 px de rejunte.
- **O azulejo grande:** quatro peças que formam um desenho. São cinco desenhos abstratos, e dois lembram o Congresso: a cúpula e os dois lados.
- **O símbolo:** o azulejo grande de cada trilha e de cada passo do caminho leva um desenho que diz o assunto, numa caixa de 100 por 100: o livro fechado, com a etiqueta e a fita (A Constituição); o frontão sobre três colunas (Os Três Poderes); a balança (Direitos e Deveres); o Congresso, com as duas torres, a tigela e a cúpula (Processo legislativo); a folha do projeto, com a ponta dobrada e as linhas do texto (Apresentação); a mesa, com as cadeiras em volta (Comissões); as cadeiras em meia-lua, diante da mesa (Plenário); a tigela, a cúpula e a seta de uma Casa à outra (A outra Casa); e a caneta deitada sobre a linha da assinatura (Sanção ou veto). São prédios e objetos das instituições, sem partido e sem pessoa, em formas geométricas chapadas que se leem a 40 px.
- **A etiqueta de estado:** um retângulo de tinta com a letra em papel, que pende do fio de cima da folha.
- **A barra do patrimônio:** um retângulo de tinta com 0.75rem de altura, do comprimento da parte do maior valor, com pelo menos 4 px.
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
- **A organização:** o Renan reorganizou o cabeçalho na #261, em 20/11/2026 ("tá muito mal organizado [...] o ctrl K não tá centralizado, talvez passar ele pra esquerda, e as opções para o centro"), e escolheu a "A · Busca à direita":
  - à esquerda, o nome e, a partir de 82rem (1312 px com a letra a 100%), o lema embaixo dele, em letra de máquina (em Papel 3).
  - no centro da grade, os links Início, Trilhas e Jogos, e Edições onde o build do site tem o `API_URL`. Esse centro é o da área da página sem a barra de rolagem vertical.
  - à direita, a entrada da busca (veja "Busca") e a entrada da conta.
- **As larguras,** com as edições e a letra a 100%:
  - **a partir de 62rem (992 px),** uma linha de 72 px, com a tira de 6 px, numa grade de três colunas. As dos lados são iguais (`minmax(0, 1fr)`). No Edge, com a API e a letra a 100%, a 992 px o nome mediu 183,05 px, a lista de links mediu 377,55 px e o botão mostrava "Buscar" com 150,33 px de largura. A 1366 px, com a barra de rolagem vertical, o centro dos links ficou a 0,01 px do centro da área da página e a 7,5 px do centro da janela inteira.
  - **a partir de 82rem (1312 px),** o lema aparece embaixo do nome, e o par cabe nos 72 px: ali, o link do nome perde a altura mínima de 44 px. Ao lado do nome, com os links no meio, o lema só caberia a partir de uns 1710 px;
  - **abaixo de 62rem,** duas linhas (114 px com a tira): em cima, o nome, a busca e a conta; embaixo, os links, centrados, numa linha só deles;
  - **com a letra a 200%,** os links ficam na segunda linha abaixo de 1984 px, porque os 62rem crescem com a letra. Num celular, a busca e a conta descem para baixo do nome.
  - O respiro fica em px, sem crescer com a letra.
- **Duas listas, uma à vista:** o HTML tem duas listas iguais dos links, com o mesmo nome ("Principal"), e o CSS mostra uma de cada vez: a do meio na linha única e a de baixo nas duas linhas. Assim, o Tab e o leitor de tela seguem a ordem da tela: no computador, o nome, os links, a busca e a conta; no celular, o nome, a busca, a conta e os links. Com uma lista só, uma das duas ordens ficaria trocada. A lista escondida (`display: none`) fica fora do Tab e do leitor de tela.
- **No celular:**
  - Abaixo de 32rem, o Início sai: o nome leva ao início (o Renan, na #39).
  - Abaixo de 48rem, os links e a conta ficam com 10 px de respiro de cada lado; abaixo de 26rem, com 6 px, sem vão entre os links e com 12 px entre o nome e a busca.
  - Abaixo de 22.5rem (360 px), o nome fica com 1.1875rem: com 1.3125rem, o nome, a lupa e o "Entrar" passavam 2 px da linha de 280 px.
  - **Com a letra grande,** os links ficam um embaixo do outro onde não cabem numa linha (o Renan escolheu "Um embaixo do outro" na #261), cada um com 44 px de altura, em px. Quem decide é uma consulta de contêiner pela largura da lista: com as edições, abaixo de 13.75rem (Trilhas, Jogos e Edições pedem 13.45rem com a letra a 150%); sem elas, abaixo de 8.5rem. Onde a lista ainda não cabe e a coluna não entrou, ela quebra a linha em vez de passar da página: no computador, a barra de rolagem toma 15 px (a Atena pediu a quebra em 17/11/2026).
  - De 320 a 1920 px, com a letra a 100% e a 200%, com a API e sem ela, nenhuma largura rola de lado ou deixa um link sozinho numa linha.
- **A entrada da conta:** quem não entrou vê "Entrar", que leva ao `/login`; quem entrou vê "Conta", que leva ao `/perfil` (o Renan, na #261, em 20/11/2026). Ela toma o lugar do "Conta" igual para todos e do quadradinho verde que o Renan tinha escolhido na #258.
  - **Os dois links ficam no HTML,** na mesma célula, e o CSS esconde um deles com `visibility: hidden`: a célula tem a largura do maior, e nada pula quando a palavra troca. O escondido sai do Tab e do leitor de tela. São links comuns (`<a>`), como era o "Conta": o perfil e o login carregam a página do zero.
  - **A marca:** a palavra segue a marca `data-conta-aberta` no `<html>`. Onde o site tem a API, um roteiro no `<head>` lê a chave da sessão do progresso que o login grava neste navegador (um código sorteado, sem dado da conta) e põe a marca antes da primeira pintura. Depois, o cabeçalho atualiza a marca sem recarregar o documento nas páginas que continuam abertas, como na exclusão da conta, no 401 da sincronização e quando outra aba sai. O "Sair" do perfil abre um documento novo em `/login`, que já mostra "Entrar", conforme a #258. Nenhum pedido sai do cabeçalho, e nada novo fica guardado.
  - **Sem JavaScript ou sem a API,** fica "Entrar". Com a chave velha, quando a sessão já acabou na API, a página abre com "Conta" e troca para "Entrar" quando a sincronização recebe o 401.
  - **O traço:** o "Entrar" fica marcado no login e no cadastro; o "Conta", no perfil, no login e no cadastro, como o "Conta" de antes. O `aria-current="page"` vai no "Entrar" só no `/login` e no "Conta" só no `/perfil`.
- **Navegação:** links em papel, em maiúsculas espaçadas, sem sublinhado, com um traço de 4 px em papel embaixo: ele se risca da esquerda para a direita quando o ponteiro passa e fica na seção aberta. "Trilhas" fica marcado na lista das trilhas, em cada trilha e em cada artigo, e "Edições", na lista das edições e em cada edição; o `aria-current="page"` só vai no link da própria página. Nas cores forçadas, o traço usa a cor de texto do sistema (`CanvasText`), que pode ser diferente da cor do link. No Edge, o traço ficou branco e o link amarelo.
- **Foco:** o anel de foco fica amarelo dentro do bloco. O "Pular para o conteúdo" aparece no foco, em tinta sobre papel.
- **Na troca de página,** o cabeçalho fica parado quando aparece nas duas páginas (veja "A troca de página").
- **O que mudou na #261:**
  - a "Barra no meio" da #233 (19/11/2026) saiu do meio: a busca foi para a direita, junto da conta, e o meio ficou com os links;
  - o lema, que ficava ao lado do nome a partir de 1344 px, passou para baixo do nome, a partir de 1312 px;
  - a barra, que encolhia abaixo de 960 px, agora mostra o que cabe no lugar dela (veja "Busca");
  - o "Conta" igual para todos virou "Entrar" e "Conta";
  - os links do celular, que quebravam em linhas, ficam numa linha só deles ou, com a letra grande, em coluna.

### Busca
- **O que é:** a busca do site, sem IA, nas trilhas, nos artigos e nas edições publicadas (a #233). Ela abre pela entrada do cabeçalho ou pelo Ctrl+K (⌘K no Mac), em qualquer página, numa caixa por cima da página. O Renan escolheu em 19/11/2026:
  - a "Barra no meio" do cabeçalho, que foi para a direita, junto da conta, na #261, em 20/11/2026 (veja "Moldura");
  - nenhum campo a mais na página inicial ("Não, só a do cabeçalho");
  - a "Caixa por cima" e, para ela, a "Folha por cima".
- **A entrada:**
  - **A forma:** um botão à direita do cabeçalho, antes da conta, com a lupa, "Buscar no site" e a tecla do atalho, num fio de 2 px em Papel 3, com 44 px de altura. A tecla diz "Ctrl K"; no Mac, "⌘ K", trocada depois da hidratação, no mesmo espaço.
  - **A tecla só no computador:** ela aparece com mouse ou trackpad (`(hover: hover) and (pointer: fine)`) e onde a barra inteira cabe. No celular, ninguém aperta Ctrl K (o Renan, na #261: "Ctrl K no computador").
  - **Ponteiro e foco:** com o ponteiro, o fio e a letra vão para o papel. O foco é o amarelo do bloco.
  - **Acessibilidade:** ela leva `aria-haspopup="dialog"` e `aria-keyshortcuts="Control+K Meta+K"`. A tecla é desenho e fica fora do leitor de tela.
  - **O índice:** quando o ponteiro ou o foco chega nela, o índice já começa a vir.
- **A largura da entrada:** o lugar da barra cresce até 20rem no espaço que sobra ao lado da conta e encolhe até o quadrado da lupa, de 44 px. Ele é um contêiner, e a entrada mostra o que cabe nele:
  - a barra com a tecla, a partir de 14.25rem (a 1280 px e acima, e de 768 a 960 px, na linha do nome);
  - "Buscar no site", a partir de 9.5rem (a 1024 px; e num celular de 600 px, que fica sem a tecla de qualquer jeito);
  - "Buscar", a partir de 6.5rem (a 414 px);
  - só a lupa, abaixo disso (a 360 e a 320 px).

  Os limites têm folga sobre o que cada forma pede com a letra a 100%: 13.84rem, 9.22rem e 6.25rem. O que sai da tela continua no botão para o leitor de tela, e o nome dele é sempre "Buscar no site". A linha do nome quebra pelo tamanho mínimo da busca e da conta (a lupa e o "Entrar"), e não pela barra inteira: com a barra inteira, a busca descia para a linha de baixo a 360 px.
- **O atalho:**
  - O Ctrl+K e o ⌘K abrem a busca. Com a caixa aberta, o atalho volta ao campo e seleciona o texto.
  - Com Alt ou Shift, ou no meio de uma composição (o teclado japonês, por exemplo), a tecla fica com o que ela já fazia.
  - Com o foco na página, a busca do navegador no Ctrl+K (Chrome e Firefox) deixa de valer, como no GitHub e no MDN. Com o foco na barra do navegador, o atalho continua dele.
- **A caixa:**
  - **O elemento:** o `<dialog>` do navegador, aberto com `showModal()`. A caixa fica por cima de tudo e o resto da página fica inerte. Nos limites da caixa, Tab e Shift+Tab podem passar pela barra do navegador antes de voltar à caixa.
  - **A folha:** uma folha clara (Folha) com fio de tinta de 2 px e até 44rem de largura. Ela fica no alto da tela, com um respiro em cima (`clamp(1.5rem, 8vh, 6rem)`), sobre um véu de tinta a 72%, chapado, sem desfoque. Ela cresce para baixo com os resultados, e a cabeça não pula enquanto a pessoa digita.
  - **No celular:** abaixo de 40rem, a folha é a tela inteira, sem o fio.
  - **O HTML:** ela é montada na primeira abertura, e o HTML das páginas não muda.
- **A cabeça** fica parada no alto da folha. Ela tem:
  - "Buscar no site", em Label e tinta suave, que é o título (`h2`) e o nome da caixa;
  - a ação em texto "Fechar";
  - o campo (a peça Campo, `type="search"`), com a lupa dentro, à esquerda;
  - a contagem, "9 resultados", em Label e tinta suave.

  Os resultados rolam embaixo dela, dentro da folha, sem levar a página junto (`overscroll-behavior: contain`).
- **Cada resultado:** uma linha entre fios de tinta, de um lado ao outro da folha, como as de "Nesta trilha":
  - **o número pequeno** (2.25rem), na fita da posição, com o contorno de 2 px: a posição da trilha em Trilhas e a do artigo na trilha; na edição, o último dia da semana, na fita da semana. É desenho (`aria-hidden`);
  - **o título,** em maiúsculas (Archivo 750, 1.0625rem). Ele é o link, e a área dele cobre a linha;
  - **o tipo,** em Label e tinta suave: "Trilha", "Artigo 6 · A Constituição" ou "Edição · 9 a 15 de novembro de 2026";
  - **o trecho,** em Literata, a 0.9375rem: uns 180 caracteres em volta da primeira palavra achada, cortados entre palavras, com "…". A palavra achada vai em negrito, sem cor. Quando o link leva a um intertítulo, ele vem antes do trecho, em Archivo 650, com um travessão.
  - **Ponteiro e foco:** com o ponteiro, a linha vai para o Papel 2, e o título ganha o sublinhado. Com o foco do teclado, o anel azul fica na linha inteira, por dentro.
- **Os estados,** em palavras, sem ícone e sem giro:
  - **nada digitado:** "Escreva um assunto, como veto, emenda ou Senado. A busca procura nas trilhas, nos artigos e nas edições." Sem a API, a frase termina em "nas trilhas e nos artigos.";
  - **o índice a caminho:** "Carregando a busca…", em Label e tinta suave;
  - **nenhum resultado:** "Nenhum resultado para “xyz”. Confira como a palavra está escrita ou tente só o começo dela." A frase espera as edições: enquanto elas não chegam, fica só "Procurando também nas edições…";
  - **o índice não chegou:** "A busca não carregou. Confira a internet e tente de novo.", com a ação em texto "Tentar de novo";
  - **as edições a caminho:** "Procurando também nas edições…", em Label e tinta suave, embaixo da lista;
  - **as edições não chegaram:** "As edições ficaram fora desta busca: o servidor não respondeu.", com "Tentar de novo". As trilhas e os artigos continuam na lista.

  O "Tentar de novo" sai da tela com o aviso, e o foco volta ao campo.
- **O que ela procura:**
  - na trilha, o título e a descrição;
  - no artigo, o título, o resumo, os intertítulos e o texto inteiro;
  - nas 20 edições mais novas, o título, o período e o título e o texto de cada item.

  O quiz, o infográfico e as fontes ficam de fora. Sem a API, a busca não fala das edições.

  Os pedidos feitos após os 5 minutos de memória do servidor incluem as edições novas e excluem as despublicadas. A aba que já carregou o índice o mantém até recarregar. Links de edições despublicadas levam à página de edição não encontrada.
- **Como ela acha:**
  - **O texto:** sem acento e sem maiúscula ("constituicao" acha "Constituição") e pelo começo de cada palavra ("constitu"). O resultado tem todas as palavras digitadas. As palavras vazias ("o", "de", "que"…) saem quando há outra.
  - **A ordem:** vem de onde a palavra aparece: o título, o intertítulo, o resumo e o texto. No empate, a trilha vem antes do artigo, e o artigo antes da edição, na ordem do site.
  - **O link:** a palavra no título leva ao alto da página. Num intertítulo ou no texto abaixo dele, ela leva ao intertítulo (`#id`); na edição, ao item (`#item-3`).
  - **O erro de digitação** não acha: "consituição" fica sem resultado.
- **O texto digitado** fica na página. Ele não vai ao servidor, ao endereço, ao armazenamento nem ao console, e nada conta as buscas. A caixa reabre com a última busca, que some quando a página recarrega.
- **Teclado:**
  - O Esc fecha a caixa, também com texto no campo, e não apaga o texto. No Chrome, o Esc num campo de busca apagaria.
  - No campo, ↓ vai ao primeiro resultado, e o Enter abre o primeiro.
  - Na lista, ↓ e ↑ andam de um resultado ao outro, e ↑ no primeiro volta ao campo. O Tab também anda pela lista.
- **Foco:**
  - Ao abrir, o foco vai ao campo, com o texto selecionado; ao fechar, volta para onde estava.
  - Ao seguir um resultado, a caixa fecha antes da navegação, e a troca de página fotografa a página sem ela. O foco vai para o título da página nova ou para o trecho do endereço, como em qualquer link, também quando o resultado é da página aberta.
- **Leitor de tela:**
  - O nome de cada link é o título, e o tipo e o trecho vão na descrição (`aria-describedby`): o foco que anda pelas setas só lê o link.
  - A contagem chega por uma região `role="status"`, 400 ms depois da última tecla ("9 resultados para constitui").
  - Sem resultado e sem as edições, as duas frases vão juntas.
- **Letra grande:** abaixo de 22rem, o número fica no lugar, e o texto desce para a linha de baixo, com a largura toda, como nas folhas da trilha. O título e as etiquetas voltam às minúsculas, sem o espaço entre as letras.
- **Cores forçadas:** a entrada, a folha e o anel ficam com as cores do sistema. A palavra achada fica com o realce do sistema (`Mark` e `MarkText`). Só com o negrito, o navegador dava a ela a letra do realce sobre o fundo sem cor, e ela sumia.
- **Sem JavaScript:** a entrada sai do cabeçalho (`@media (scripting: none)`). Sem a caixa, ela seria um botão morto.

### Rodapé
- **Caráter:** papel com um fio de tinta em cima e uma fileira de azulejos embaixo. É o `<footer>` do documento, em todas as páginas, inclusive no 404 e na de erro.
- **Forma:** o nome em Wordmark, grande, sem link, com o lema em letra de máquina embaixo; ao lado (embaixo, até 1024 px), quatro linhas em Literata, em tinta suave: "O Mandatômetro foi feito para o Hack Brasil 2026, na trilha Acesso à educação.", "Cada explicação traz a fonte oficial: a lei, o regimento ou a página da Câmara e do Senado.", "O código é aberto, no GitHub." e "O termo de consentimento da conta.".
- **Os links do GitHub e do termo:** ações em texto em linha, na letra do parágrafo, em tinta e negrito. A área de toque tem 12 px em cima e embaixo da letra, o tamanho do vão entre os parágrafos: um toque numa linha de texto não vai para o link de outra linha. O vão entre os dois links fica com o de baixo, que é pintado por cima: a área do GitHub fica com 36 px de altura, e a do termo, com 48 (medido a 360 px, na #112). Para os dois terem 48 px, o vão entre os parágrafos iria a 24 px, e o rodapé cresceria 36 px em todas as páginas. O do termo é um link comum (`<a>`), como o "Entrar" e o "Conta" do cabeçalho: o rodapé não depende do roteador.
- **A fileira de azulejos:** 16 azulejos (os 8 primeiros no celular, que já têm as cinco fitas). Ela faz a onda uma vez, quando entra na tela.

### Botão
- **Forma:** bloco reto de tinta, texto em papel, em maiúsculas espaçadas (800, 1rem), com pelo menos 52 px de altura e a seta à direita. O vazado, com o fundo transparente e o texto em tinta, acompanha o principal ("Voltar", no passo a passo, e "Rever as respostas", no fim do quiz e, com o piloto encerrado, no fim do antes).
- **Hover:** o botão sobe 3 px, a tira das cinco fitas aparece embaixo dele, e a seta anda um pouco para a frente.
- **Com a letra grande:** quando a tela tem menos de 20rem (a 360 px, com a letra acima de 18 px), a seta vem logo depois da última palavra, e o respiro dos lados fica em 18 px, que não cresce com a letra. Entre a palavra e a seta vai um espaço, e não uma margem: quando a seta desce sozinha, começa alinhada com o texto. Uma palavra maior que a linha se parte sem hífen (`overflow-wrap: anywhere`). O Renan escolheu, na #76, em 11/11/2026: "Seta no fim, respiro fixo (Recomendado)".
- **Desligado:** fica apagado (35%), sem subir e sem a tira. Enquanto um envio espera a resposta (a inscrição e a saída da newsletter e as telas da conta), o botão fica com esse desenho pelo `aria-disabled`, e não pelo `disabled`, que tirava o foco dele: o clique nele não envia o formulário.
- **Alto contraste:** nas cores forçadas do Windows, o fundo some e a borda aparece na cor do texto: o botão continua com cara de botão.
- **Onde:** é a única ação em bloco das páginas (`BOTAO_CONTINUAR`): na página inicial, na trilha, na chamada do quiz, no quiz, na página do piloto, no passo a passo, no 404, na página de erro, na folha da newsletter, na página de sair, nas páginas das edições ("Receber por e-mail", na lista sem edição; "Ver todas as edições", no fim da edição; "Ver as trilhas", sem a API), nas telas da conta (o botão de cada formulário e, sem a API, "Ver as trilhas") e no painel de revisão ("Salvar a revisão" e, vazado, "Publicar a edição", no pé, e os das folhas por cima). Os outros links e ações são sublinhados.

### Links
- Sublinhado de 2 px, afastado 0,2 em do texto, em tinta. Títulos que são links ficam sem sublinhado.
- **Foco:** contorno de 3 px no azul do foco, afastado 3 px. Na folha de uma lista, o contorno vai na folha inteira.
- **Na página de sair da newsletter**, "Edições" é o link no texto da abertura depois da saída.
- **Depois de uma navegação:** o foco vai para o h1 da página nova ou, quando o endereço aponta para um trecho do conteúdo (`#caminho`, `#passo-plenario`, `#newsletter`), para esse trecho, já na tela. O título e o trecho não são controles e ficam sem o anel. Outro estado na lista dos parlamentares (`?uf`) também é página nova, com outro título. Ao paginar os votos de um parlamentar, o foco vai para o título `#votos` e o Tab seguinte entra na lista de votos. Filtrar a votação mantém o foco em “Filtrar”.

### Ações em texto
- **Quais:** "Desmarcar", embaixo de "Você leu este artigo."; "Recomeçar a trilha", embaixo da descrição da trilha, quando a pessoa já leu algum artigo dela; "Recomeçar o quiz", na abertura e no fim do quiz, quando ela já respondeu alguma pergunta; "Começar como outra pessoa", na página do piloto; "Tentar de novo", na linha do envio do piloto; e "Desfazer". A mesma forma serve a links: "Ver o caminho na trilha", na página inicial, "Ir para o início", no 404 e na página de sair da newsletter, "Inscrever-se de novo", também na de sair, "Ver as trilhas", na página de erro, "Ler as edições", na folha da newsletter, "Receber por e-mail", "Edições mais novas" e "Edições mais antigas", na lista das edições, "Entenda na trilha: …" e "Receber as próximas por e-mail", na edição, "Revisar a edição da semana", no `/perfil`, só para a administradora, os links entre as telas da conta (veja "Telas da conta"), e "O código é aberto, no GitHub" e "O termo de consentimento da conta", no rodapé.
- **Forma:** um botão com cara de link (`.acao-de-texto`): Archivo 700 a 0.875rem, em maiúsculas espaçadas, com sublinhado de 2 px. No botão, um `::before` soma 13 px em cima e embaixo da caixa: a área de toque fica com 45 px de altura, sem mudar o espaço que o texto ocupa, e o anel de foco fica justo no texto.
- **Nos links:** o link fica em linha e quebra como texto, e o padding faz a área: 15 px em cima e embaixo da letra, em cada linha. Dos lados, a área é a do texto, sem padding nem margem. Até a #173, ela tinha 4 px de cada lado, que uma margem negativa devolvia, mas o Firefox conta a margem ao medir um item da largura do texto, e não ao decidir a quebra: o "Ir para o início" do 404 ia em duas linhas, "IR PARA O" e "INÍCIO", com espaço de sobra. O `estilos/acao-de-texto.test.ts` recusa o padding e a margem negativa dos lados no link e no que fica dentro dele. O anel de foco contorna só o texto, que fica num `span`. Um link sem o `span` fica com o anel no próprio link; num navegador sem o `:has()`, o link com o `span` fica com dois anéis, e o foco continua visível.
- **Desligada:** com o `aria-disabled`, como o "Tentar de novo" do piloto enquanto o pedido espera, a ação passa para a tinta suave, que continua legível, e guarda o foco; nas cores forçadas, fica com a cor do desligado do sistema.
- **Depois da ação:** a frase de estado diz o que aconteceu ("Você desmarcou o artigo.", "Você recomeçou a trilha.", "Você recomeçou o quiz."), e o mesmo botão vira "Desfazer", no mesmo lugar, com o foco nele. Nenhum outro controle aparece onde o botão estava: o segundo clique de um clique duplo cai sempre no mesmo botão. O "Desfazer" vale até a pessoa sair da página. Não há caixa de confirmação. O "Começar como outra pessoa" é a exceção: apaga tudo o que o site guardou no navegador, sem "Desfazer", e no lugar dele fica "Pronto: este navegador começou do zero.", com o foco (veja "O piloto").
- **Leitor de tela:** o que aconteceu é anunciado por uma região `role="status"` escondida, que já vem vazia no HTML do servidor e se apaga depois de 7 s (`useAviso`).

### Campo
- **Forma:** uma caixa reta, com pelo menos 52 px de altura, fio de tinta de 2 px e fundo de folha (`.campo`, no `index.css`). O texto vai em Archivo 500, a 1.0625rem: com 16 px ou mais, o iPhone não aumenta a tela quando o campo recebe o foco. O rótulo fica à vista, em cima, em Label.
- **Foco:** o contorno de 3 px no azul do foco, como nos links.
- **Preenchido pelo navegador:** o texto continua em tinta, e o fundo fica no Papel 2, no lugar do azul ou do amarelo do navegador (`:autofill`).
- **Erro:** quando o erro é do que a pessoa escreveu, o campo leva o `aria-invalid`, a mensagem fica ligada a ele pelo `aria-describedby`, e o foco volta para ele.
- **Enquanto envia:** fica só de leitura (`readOnly`), com o texto à vista.
- **Onde:** na folha da newsletter e na caixa da busca, com a lupa dentro (veja "Busca"), e nas sete telas da conta, com o erro embaixo do campo (veja "Telas da conta"). No painel de revisão, ela serve ao título, à explicação (em Literata, numa caixa que cresce com o texto), ao motivo e à lista do artigo da trilha; lá, o campo com erro leva também um fio vermelho de 5 px por dentro, à esquerda.

### Azulejos
- **O que são:** desenho. O painel, o azulejo grande e cada peça ficam fora do leitor de tela (`aria-hidden`), e nada do que a página diz depende deles. Nas cores forçadas do Windows, eles somem.
- **Como são feitos:** cada peça é um `span` com três variáveis (o fundo, o desenho e a volta), e o CSS pinta o motivo com um gradiente (`estilos/azulejos.css`). O desenho de cada peça vem de `lib/azulejos.ts`, em dados. Em repouso, o fundo cobre toda a caixa, e um SVG mostra o símbolo inteiro. Durante a virada, cada peça lisa mostra um quarto do desenho, com 2% de sobra para o recorte. Os mesmos caminhos de `lib/simbolos.ts` e a mesma cor da peça compõem as duas versões.
- **O sorteio tem semente:** o servidor e o navegador desenham o mesmo painel. Cada trilha tem o seu, pela semente que sai do endereço dela.
- **As cores:** poucos azulejos ficam quietos, papel sobre papel, para o painel respirar; os outros levam uma fita, com tinta ou papel (A Regra de Uma Fita por Azulejo).
- **O azulejo cru:** papel sobre papel, sem cor. É o passo que ainda não foi andado e o artigo que ainda não foi lido. Ele ganha a cor quando vira.
- **O azulejo da posição:** cada artigo tem um azulejo grande, na fita da posição, com os desenhos alternados para dois vizinhos não ficarem iguais (`azulejoDaPosicao`).
- **O azulejo do assunto:** a trilha, na lista das trilhas, e cada passo do caminho, na sanfona da trilha e no passo a passo da página inicial, levam o símbolo do assunto no lugar do desenho (`simboloDaTrilha` e `simboloDoPasso`, em `lib/simbolos.ts`). A cor continua sendo a da posição. O símbolo sai de um mapa no código, pelo endereço da trilha e do passo, e um teste lê o conteúdo e falha quando uma trilha ou um passo fica sem símbolo; sem ele, o azulejo volta ao desenho da posição. O Renan escolheu os símbolos em 19/11/2026, na #232.
- **O painel vivo** (`lib/painel-vivo.ts`): a peça que o ponteiro toca vira e ganha outro desenho; um clique faz a onda, da peça tocada para fora; e, no cartaz, uma peça vira sozinha a cada 1,4 s. No toque, o dedo que rola a página não vira as peças. O painel para quando a aba está escondida ou ele saiu da tela. As cinco fitas continuam juntas: a peça que é a única da cor dela muda de desenho, e não de cor.

### Cartaz
- **Caráter:** a abertura de cada página: o título gigante em tinta e o painel de azulejos.
- **O título:** as palavras tombam no lugar, uma a uma. Cada palavra fica numa caixa fora do leitor de tela, e o título leva o texto corrido no `aria-label`.
- **A frase** (só na página inicial): "um passo de cada vez.", em letra de máquina de escrever, com a tira das cinco fitas, que se risca embaixo dela.
- **O pé:** depois de um fio de tinta, a abertura em Literata, e ao lado (embaixo, até 992 px) a linha do progresso e o botão. Na página de sair, o pé inteiro, com a abertura e as ações, guarda a altura de antes da saída (veja "Página de sair da newsletter").
- **A faixa de informações** reúne textos como "3 artigos", "6 min de leitura" e "Fonte oficial em cada explicação". Um quadradinho decorativo separa os itens e usa a cor do texto nas cores forçadas do Windows. Nas sete faixas do site, a frase fica em um parágrafo com `role="paragraph"`. O `span` de dentro distribui os itens em flex e mantém as quebras.

### Folha da lista (o artigo na trilha)
- **Forma:** uma folha com fio de tinta: o número gigante, na fita da posição; o título, o resumo em Literata e a linha "Leitura de 2 min · 2 fontes oficiais"; e o azulejo do artigo. No celular, o número e o azulejo ficam em cima, e o texto usa a largura toda.
- **A folha inteira leva ao artigo:** o link é o título, e a área dele cobre a folha.
- **Hover:** a folha sobe 4 px sobre a sombra de tinta, o azulejo dá um quarto de volta, e o número chega um pouco para o lado.
- **Estados:** a lida leva o visto no meio do número, que perde a cor, e a etiqueta "Lido"; onde a pessoa parou leva a etiqueta "Continue daqui".

### A trilha na lista das trilhas
- Uma folha por trilha: o azulejo com o símbolo da trilha, na fita da posição, o título, a descrição, "8 artigos · 16 min de leitura" e o progresso em palavras ("Você leu 1 de 8." ou "Você terminou a trilha."). Quando o ponteiro passa pela folha, as quatro peças do azulejo viram em onda, e o símbolo termina de pé.
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
- **A fila:** cinco azulejos grandes, um por passo, com o símbolo dele; cada um é um botão com o número e o nome do passo (no celular, o nome fica só para o leitor de tela). Os passos já andados ficam com a cor, e os da frente, crus. A partir de 768 px, um fio liga os cinco: o de Papel 3 é o caminho inteiro, e o de tinta avança até o passo da vez. Com o nome à vista, as cinco abas dividem a largura em partes iguais (`minmax(0, 1fr)`), como o fio pede. O nome de um passo não se parte: ele fica do tamanho da palavra mais comprida e, se ela passar da coluna, entra no vão até a aba seguinte. No Edge, "APRESENTAÇÃO" passa 1,14 px da coluna a 768 px, com a letra a 100%, e sobram pelo menos 11 px do vão.
- **O passo:** o número gigante, que tomba no lugar, e ao lado "Passo 2 de 5", o título, o texto, os desvios (cada um com um fio da cor do passo ao lado), as fontes com a data da consulta e os artigos que explicam o passo. O passo sem artigo traz "Ler este passo na trilha", com o título do passo num sufixo só para o leitor de tela.
- **Os controles:** "Voltar" (vazado) e "Próximo passo", que no último vira "Ver do começo"; e o link "Ver o caminho na trilha".
- **Sem JavaScript,** os cinco passos ficam abertos, um embaixo do outro, e a fila e os botões saem. Com JavaScript, o CSS já mostra um passo de cada vez desde a primeira pintura (`@media (scripting: enabled)`), e nada pula quando o código carrega. No navegador que não sabe dizer no CSS se tem JavaScript, os cinco ficam abertos até o código carregar.
- **Leitor de tela e teclado:** o passo escondido fica fora dos dois. O botão do passo da vez leva `aria-current="step"`, e cada troca é anunciada ("Passo 2 de 5: Comissões") pela região `role="status"`.

### O caminho da trilha (a sanfona)
- **Onde:** na página da trilha, quando ela tem um `infografico.md`: depois das folhas e, a partir de 1400 px, ao lado delas.
- **Forma:** o título e o resumo, e uma lista ordenada de passos entre fios. Cada passo é um `<details>` do navegador, com o azulejo pequeno do passo, com o símbolo dele, o título e um "+", que vira "×" quando abre. Quando o passo abre, as quatro peças do azulejo viram em onda, e o símbolo termina de pé. O título do passo é uma etiqueta em maiúsculas espaçadas. Abaixo de 22rem, fica como escrito. O teto da #148 diminui a letra até a palavra mais larga caber na linha do título, ao lado do "+". A partir de 22rem, o azulejo também ocupa essa linha. Um passo fica aberto de cada vez (`name="caminho"`), e o primeiro já vem aberto. Funciona sem JavaScript.
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

### Quem representa o seu estado (página inicial)
- **Onde:** na página inicial, logo depois do caminho e antes da folha da newsletter, só quando o build do site tem o `API_URL`, como a folha. O Renan escolheu, em 21/11/2026, na #268, a entrada das páginas dos parlamentares por aqui e pelo "Ver quem votou" da edição: o cabeçalho fica como está.
- **Forma:** direto no papel, depois de um fio de tinta: o título "Quem representa o seu estado", na letra do cartaz (2.5rem a 5.5rem), a frase "Veja os deputados federais e os senadores de cada estado e como cada um votou.", em Literata, e o campo "Estado", que começa em "Escolha o estado", com o botão "Ver os parlamentares". A partir de 768 px, ao lado, o Brasil em 27 azulejos, nas cinco fitas, o mesmo mapa da lista, sem os números: é desenho, fora do leitor de tela. Abaixo disso, o mapa sai.
- **O campo** é o mesmo da lista: um formulário GET para `/parlamentares`, que funciona sem JavaScript (`/parlamentares?uf=SC`). Com ele, a troca de página é a do site.
- **Na rolagem,** o bloco sobe como as outras seções (`.revelar`).

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
- **O nome do quiz:** fora da abertura, a linha da frase do andamento começa pelo nome do quiz ("Quiz da trilha", "Quiz final" ou, no piloto, "Antes da trilha"), em Label e na tinta. É ali que quem vê descobre em que quiz está; o leitor de tela já tem o título e não ouve o nome de novo. Na primeira pergunta, ainda sem frase, e no fim, o nome fica sozinho. O nome e a frase ficam na mesma linha de base e andam juntos, ao lado dos quadradinhos ou embaixo deles: a 360 px, a linha do quiz da trilha vai para baixo dos seis quadradinhos, como a do quiz final. Onde os dois não cabem lado a lado, como com a letra a 200% a 320 e a 360 px, a frase desce inteira, sem virar uma coluna estreita. O Renan escolheu na #136, em 17/11/2026: "B. Nome no pé (Recomendado)". Antes, o título virava uma etiqueta acima da contagem e do título do fim; a opção A, o nome no fim da migalha, caía sozinho na segunda linha dela a 360 px, no mesmo lugar da etiqueta. Abaixo de 22rem, a etiqueta sai das maiúsculas, e o nome ficava com quase a letra da frase: "Quiz final Você respondeu 1 de 12." se lia como uma frase só. Ali, entre os dois, vai o quadradinho da faixa de informações, a mesma peça, no meio do vão. Ele não toma lugar na linha, que quebra como antes, e só aparece com o nome e a frase lado a lado: com o nome sozinho, ou com a frase na linha de baixo, não. O separador fica fora da árvore de acessibilidade e usa a cor do texto nas cores forçadas do Windows. O Renan escolheu o separador em 18/11/2026, na #162.
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

### Lista dos jogos
- **Endereço:** `/jogos`, a aba Jogos do cabeçalho. Cada jogo tem o endereço dele, `/jogos/<jogo>`, pelo nome da pasta do roteiro; um endereço que não é de um jogo dá o 404.
- **O cartaz** segue o das páginas de dentro, como o de Trilhas, com o painel de azulejos e o título "Jogos". No pé, a abertura "Você no lugar de quem decide no Congresso: escolha o próximo passo e veja o que aconteceu de verdade, com a fonte oficial." e a frase "Sem cadastro e sem nota: no fim, o jogo mostra o caminho que você fez.".
- **Cada jogo** é uma folha da lista (veja "Folha da lista"), na fita da posição: o número gigante, o título, o resumo em Literata, a linha "5 cenas · 10 decisões", em Label, e o azulejo com o símbolo do jogo — a mesa das comissões no Jogo das Comissões, o mesmo símbolo do passo que ele conta. O título é o link, e a área dele cobre a folha; o hover, o foco e a subida com a rolagem são os da folha da trilha.
- **Só o Jogo das Comissões está na lista** (a #288). A segunda folha é o "Fake ou fato" (#41), e a lista já nasce para mais de um.
- **O fim do quiz final** da trilha do processo legislativo continua levando direto ao jogo, e não à lista: a medição do piloto conta os cliques dali até o jogo (veja "O piloto").
- **Título da aba:** "Jogos · Mandatômetro".

### O Jogo das Comissões
- **Caráter:** um palco de visual novel dentro da página de papel, em `/jogos/comissoes`: o cenário desenhado, o retrato de quem fala e, na frente, o passo da vez. Conta a tramitação real do PL 104/2015, que virou a Lei 15.100/2025, em cinco cenas (#42). O roteiro e as regras de conteúdo estão em [docs/jogo-das-comissoes.md](docs/jogo-das-comissoes.md).
- **A exceção da imagem:** é a primeira peça do site com imagem de verdade. Fora dela, todo desenho continua sendo CSS e caminho de SVG escrito no código. O cenário, o retrato e o item de cena são **desenho**: ficam fora do leitor de tela, e tudo o que importa está nas palavras da caixa de diálogo, como nos azulejos. A cena cobre o papel de propósito, dentro da moldura do palco; fora dela, a página continua no papel com o grão e o mapa.
- **O palco:** a cena ocupa a largura toda, com 56svh de altura, e o pé, em papel com o grão, traz o caminho do projeto, o botão do som e "Cena 2 de 5". **A fala fica em cima da cena**, no pé dela, como numa visual novel; a decisão, o painel, o prazo, o carimbo solto e o cartão, que são altos, ficam embaixo dela, numa folha clara com fio de tinta. O retrato entra pela direita e fica na cena enquanto quem falou por último não muda: ele continua na decisão, no painel e no carimbo, e só sai na narração. O item de cena fica no alto, à esquerda, onde a caixa não passa por cima dele. Com a letra grande, a caixa pode crescer para baixo para deixar o item à vista.
- **A caixa de diálogo:** a placa com o nome, em bloco de tinta, e a fala em Literata, com a altura da fala mais alta do trecho guardada, no mínimo três linhas: a caixa não muda de tamanho de uma fala para a outra no mesmo trecho, nem pula sobre o cenário. Ela é **a folha opaca de sempre, com o fio de tinta** — texto direto sobre a ilustração perderia contraste. A narração leva a placa vazada, sem bloco, com a mesma altura. Com a letra grande, a placa segue as outras etiquetas e usa o nome como escrito. O botão guarda espaço para seus dois rótulos. O texto entra em máquina de escrever, e o toque na caixa faz o mesmo que o botão: o primeiro revela a fala inteira, o seguinte avança. O leitor de tela recebe o nome de quem fala e a fala inteira na hora, num texto que só ele lê, e a digitação fica no pedaço que ele ignora.
- **As decisões:** a etiqueta diz a natureza, "Regra" ou "Opinião", e uma frase explica o que ela significa. As opções são folhas com fio de tinta, uma por linha; a escolhida fica em bloco de tinta. Depois da escolha, cada opção abre a explicação do Arnaldo, com o resultado em palavras ("Pelo regimento", "Funciona, mas perde o que já andou", "Não resolve") e um fio mais grosso na certa: a informação nunca fica só na cor. Embaixo, o jogo repete a escolha e, na decisão de opinião, mostra o que aconteceu de verdade, sem julgar.
- **Os carimbos:** seis, com o texto escrito no código, não numa imagem: "Pedido de vista!", "Recurso ao Plenário?", "Segue para o Senado", "Urgência!", "Aprovado" e "Sancionado". O texto fica **em tinta**, em maiúsculas, e a cor da fita só contorna o selo — nenhum texto em cima de uma cor. Ele entra grande e torto, gira para os 6° dele e bate dentro dos limites laterais da moldura: **o palco inteiro treme uma vez**, e a batida do carimbo toca junto, quando o som está ligado. Com `prefers-reduced-motion`, ele aparece no lugar, e o som continua o mesmo.
- **O painel do plenário:** o placar da votação **em tinta**, nunca verde e vermelho, em dois números grandes com "Sim" e "Não" em Label. Na votação nominal, os contadores sobem juntos até os votos reais; na simbólica, o painel acende sem número nenhum, com o carimbo "Aprovado" e a frase que explica. Na nominal, a contagem tem um único efeito sonoro e o leitor de tela recebe os números reais junto da legenda. É o placar de uma votação, um fato público, e não a pontuação de quem joga.
- **O prazo em sessões:** cinco quadradinhos de tinta que acendem um a um, com a frase e o artigo embaixo. O leitor de tela ouve "5 sessões de prazo".
- **O cartão "O que aconteceu de verdade":** no fim de cada cena, uma folha com o título, os fatos, o link do artigo da trilha que explica a regra e as fontes oficiais, na mesma lista numerada do artigo. Os links quebram dentro da coluna e têm uma área de toque de pelo menos 44 px de altura, também nas fontes da tela final.
- **O caminho do projeto:** as cinco casas do infográfico "O caminho de um projeto de lei" — Apresentação, Comissões, Plenário, A outra Casa e Sanção ou veto —, cada uma com **o azulejo do passo dela**, o mesmo da trilha: a folha, a mesa, o hemiciclo, as duas Casas e a caneta. O azulejo fica cru, papel sobre papel, enquanto a partida não chegou ali, e ganha a cor da posição quando chega, com as quatro peças virando em fila. O nome vai em Label, e a casa de agora leva "Você está aqui", em bloco de tinta, com um fio grosso em cima. Abaixo de 22rem, "Você está aqui" fica embaixo do nome. **Não é uma barra que enche:** o progresso é o azulejo com cor e a palavra, como na trilha. O azulejo é desenho e fica fora do leitor de tela.
- **O som:** vem ligado, e quem não quiser desliga no botão do pé do palco, que guarda a escolha naquele navegador. O navegador só deixa tocar depois de um toque ou de uma tecla: a trilha de fundo entra no primeiro acionamento dentro do jogo, não ao abrir a página. Vale clique, toque, Enter ou Espaço. Ela fica em loop, baixa, e cinco efeitos curtos marcam a máquina de escrever, o carimbo, a campainha, o painel e a revelação. Desligar o som ou sair do jogo silencia a trilha, a voz e os efeitos em curso. Tudo o que o som marca está também em palavras na tela.
- **A narração:** cada fala tem uma direção de voz no roteiro — a `emocao`, que não muda nada na tela — e, gravada, toca quando a fala entra, uma por vez. Onde a fala tem voz, o bipe da máquina de escrever sai de cena. O jogo roda igual sem narração nenhuma: só toca o que está na lista de `lib/jogo/vozes.ts` ([a narração](docs/jogo-das-comissoes.md#a-narração)).
- **A tela final:** "O caminho que você fez", o caminho nas cinco casas e as seis decisões de regra, uma a uma, com o resumo, o artigo e o que a pessoa escolheu — "Você escolheu 'Pedido de vista', o instrumento do regimento." ou, quando foi outra, qual era a do regimento. **Sem total, sem nota e sem placar de acertos**, como no quiz. Depois, o cartão "O que a lei mudou", com um item por artigo da lei e a fonte, e três ações: "Rever as lições da trilha", "Receber o jornal legislativo todo domingo" (só onde o site tem a API) e, vazado, "Jogar de novo".
- **Foco e leitor de tela:** a cada passo, o foco vai para o que apareceu — a fala, a pergunta, a resposta da decisão, a legenda do painel ou o título do cartão. Na fala, na resposta da decisão e no painel, o Tab seguinte chega ao botão que avança. No cartão e no fim, o Tab segue os controles na ordem em que aparecem na folha. Ao trocar o tipo de passo, a rolagem enquadra o trecho novo e o botão de avançar. Quando o trecho inteiro cabe, ele fica à vista. Quando passa da altura da janela, seu começo fica no alto e a pessoa pode rolar para ler o resto. Na resposta de regra, o trecho começa nas opções com explicações. Na de opinião, começa no retorno da escolha. O cartão e a tela final seguem o mesmo enquadramento. Falas seguidas conservam a posição da página. Se o começo da fala seguinte ficou acima da janela, a página volta ao começo da caixa. A primeira abertura segue a posição da navegação do site. Ao jogar de novo, o foco volta ao resumo.
- **Movimento:** com `prefers-reduced-motion`, a fala já entra inteira, os contadores vão direto ao número real, as sessões acendem todas de uma vez e nada treme nem gira. O jogo chama a preferência no código, porque a regra de CSS não alcança a máquina de escrever nem a contagem. A rolagem usa a mesma preferência para ir direto ao passo.
- **Sem JavaScript:** a abertura fica com o resumo e o aviso de que os personagens são fictícios, e uma frase diz que o jogo precisa do JavaScript e que as lições de cada cena estão nos artigos da trilha.

### Artigo
- **A folha de leitura:** a folha clara com fio de tinta, sobre a parede de papel. No canto de cima, o azulejo do artigo, que entra virando, peça por peça.
- **No alto** ficam a migalha, o número na fita da posição, o título, a faixa entre dois fios ("Leitura de 2 min" e as fontes) e o resumo. O número é decorativo. O parágrafo "Artigo 2 de 6 artigos" fica ao lado dele ou abaixo quando falta largura.
- **O texto:** Literata, até 39rem. Os intertítulos vão na letra do cartaz, mais larga (68%). As listas levam um azulejinho no lugar do marcador: um quarto de círculo na fita da posição do item, que dá um quarto de volta a cada item. As listas numeradas ficam com o número.
- **A barra de leitura:** a tira das cinco fitas, no alto da tela, que enche com a rolagem do texto: começa a encher quando o começo do texto passa de uma linha a 60% da altura da tela, e fica cheia quando o fim dele passa da linha a 90%, a do visto. O aviso de lido vem 2rem abaixo do texto: quando o "Você leu este artigo." aparece, a barra já está cheia. É a animação de rolagem do CSS: onde o navegador não tem, a barra não aparece. Fica embaixo do cabeçalho: enquanto ele está na tela, cobre a barra, que aparece quando ele sai, na rolagem. Fica fora do leitor de tela e não recebe o ponteiro.
- **O lido:** no fim do texto, um azulejo cru vira para o verde, com o visto, quando a pessoa chega ali, e aparece "Você leu este artigo.", com o "Desmarcar" embaixo. Quem volta a um artigo lido já o vê verde, sem animação.
- **Fontes oficiais:** depois de um fio de 6 px, a lista numerada: o número na letra do cartaz, o título da fonte como link em negrito e, embaixo, o domínio e a data da consulta em tinta suave.
  - **O domínio comprido** quebra antes de um ponto: "direitoshumanos" e ".dpu.def.br". O Renan escolheu, na #76, em 11/11/2026: "Nos pontos (Recomendado)". Os pontos só viram lugar de quebra abaixo de 20rem; dali para cima, o endereço vai inteiro.
- **Anterior e próximo:** duas faixas no pé da folha, de borda a borda, lado a lado a partir de 768 px. Em cima, o número na fita da posição, "Artigo anterior" ou "Próximo artigo" e o azulejo do artigo, que gira quando o ponteiro passa; embaixo, o título, com a largura toda da faixa. No último artigo, a faixa da direita volta para a trilha. As mesmas faixas ficam embaixo do palco do quiz (`OutrosArtigos`), direto na página: por isso a faixa é papel com o grão do fundo, e não papel liso, que cortava o grão. Quando o ponteiro passa, ela vai para o Papel 2, e o grão continua. O anel azul do foco do teclado tem 3 px de espessura. Fica a 3 px da borda, pelo lado de dentro. Assim ele cabe na tela e continua visível entre as faixas. Com o foco do teclado, o azulejo vira de uma vez para o canto dele não cobrir o anel.

### O visto da folha lida (assinatura)
- **Caráter:** o visto do professor no caderno, que diz "este já foi" sem cara de erro. Ele substituiu o X em 11/11/2026: o Pedro sugeriu trocar o X, e o Renan concordou ("um X grande não faz sentido"). O X lia como "errado" ou "cancelado", ainda mais num site com quiz.
- **Forma:** um traço só, no viewBox de 60: 7 em tinta sobre 17 na cor da folha, com ponta e junta redondas. É um componente só (`MarcaDeLido`), com uma classe para cada lugar: no meio do número da folha (`visto-no-numero`), no canto da miniatura (`visto-na-miniatura`) e sobre o azulejo verde do lido, no fim do artigo.
- **A palavra "Lido" continua** ao lado: o visto é a marca, e a palavra diz o que ela quer dizer. O visto fica fora do leitor de tela.
- **Movimento:** quando a pessoa chega ao fim do texto, o visto é desenhado de uma vez, em 400 ms: a perna curta sai devagar, como a caneta que encosta no papel, e a longa vai num golpe só. Ele é desenhado no azulejo do lido e no número do artigo em "Nesta trilha"; nas outras páginas, aparece pronto. O "Desmarcar" apaga o visto sem animação.
- **Alto contraste:** nas cores forçadas do Windows, o traço fica na cor do texto (`CanvasText`), e o de baixo, na do fundo (`Canvas`). Dentro de um link, o visto leva a cor dos links (`LinkText`). O `currentColor` não serve: com o `forced-color-adjust: none`, o Chromium dá a ele a tinta original, e o visto some no fundo escuro.

### Migalha
- "Trilhas / Processo legislativo", em Label, com os links sublinhados e a página atual sem link, em tinta suave. Na edição, é só o link "Edições" (veja "Página da edição"). Cada link tem 44 px de altura, inteiros para o toque: a migalha fica por cima do que vem depois dela (`z-index: 1`), porque a linha do título gigante do quiz e a do número do artigo são mais altas que a letra e passavam por cima dos links.

### Página não encontrada e página de erro
- **Forma:** o cartaz das páginas de dentro, com o painel de azulejos. No 404, o número gigante em cima do título "Página não encontrada", com um algarismo em cada fita, pela ordem; o número é desenho, e o título diz o que houve. Na de erro, só o título, "A página não carregou". Embaixo, uma frase em Literata e as duas ações: o botão e uma ação em texto. Nas páginas das edições, o 404 (a edição que não existe, o rascunho, o endereço que não pode ser de uma edição e a página da lista depois da última) leva o botão "Ver as edições", no lugar de "Ver as trilhas". Nas páginas dos parlamentares e das votações, o 404 (a pessoa ou a votação que não existe, o endereço que não pode ser de uma delas e a página de votos depois da última) leva o botão "Ver os parlamentares".
- **Página de erro:** aparece quando a página pedida não chega (a rede caiu, o pedido foi bloqueado ou o servidor deu erro), em todas as rotas, dentro do site, com o cabeçalho e o rodapé. Sem ícone de alerta e sem cor de erro: o erro é dito em palavras.
- **Tentar de novo:** pede a página de novo, sem recarregar (`router.invalidate()`). Enquanto o pedido não volta, o carregando aparece na hora, no lugar da página de erro, com o foco na frase (veja "Carregando"). Se der certo, a página pedida abre do alto, com o foco no título, ou no trecho do endereço (#caminho), como numa navegação: o router devolveria a rolagem que a página de erro tinha, e, com a letra grande, a página chegava rolada, sem o título na tela. Se falhar de novo, aparece "Ainda não deu. Confira a internet ou espere um pouco e tente de novo.", o foco volta ao botão e a frase é anunciada pela região `role="status"`. A página de erro volta parada, sem a chegada: ela já estava na tela antes do carregando.
- **O aviso é da visita:** o "Ainda não deu" vale só para a tentativa feita ali. Quem sai da página de erro e volta, inclusive pelo voltar do navegador, encontra a página sem o aviso, e o leitor de tela não o anuncia de novo.
- **Título da aba:** "Erro ao carregar a página · Mandatômetro". A tela não mostra a mensagem técnica nem a pilha do erro.
- **Nas edições:** a API fora do ar, sem resposta em 8 s ou com uma resposta de outra forma também dá esta página, com HTTP 500. O servidor registra uma linha fixa, com o motivo curto, e o erro que chega ao HTML e ao navegador tem só a mensagem fixa "As edições não carregaram.", sem o endereço da API nem a resposta dela.
- **Nos parlamentares e nas votações:** o mesmo, com HTTP 500, a linha fixa `[parlamentares]` no servidor e a mensagem fixa "Os parlamentares não carregaram.".

### Página de sair da newsletter
- **Endereço:** `/newsletter/sair?codigo=`. O link do fim de cada edição abre a API, e o GET dela, que não apaga nada, manda o navegador para cá.
- **Forma:** o cartaz das páginas de dentro, como o 404: o painel de azulejos, o título "Sair da newsletter", a frase "Com o botão, o seu e-mail sai da lista e as edições de domingo param de chegar. Antes dele, nada muda." e as ações: o botão "Confirmar a saída" e "Ir para o início".
- **Só o botão apaga:** programas de e-mail e antivírus abrem os links sozinhos. A página não tem loader e não pede nada ao abrir, nem quando o roteador adianta a página.
- **Enquanto confirma:** "Confirmando a saída…" fica embaixo das ações, em Label e tinta suave, com o botão desligado e o foco nele. A linha tem o lugar guardado desde o HTML do servidor, com uma cópia invisível e fora do leitor de tela, e nada mexe quando ela aparece ou sai. De 62rem para cima, com duas colunas, o cartaz se apoia no pé. Antes da #153, a linha que entrava embaixo das ações empurrava o botão para cima (a 1366 px, 11 px no Edge e 29 px no Firefox). Numa coluna, a página crescia 29 px, ou 58 px com a letra a 200%. O lugar custa essa linha, no fim do pé, em todos os estados: numa coluna, 29 px com a letra a 100% e 58 px a 200%, que deixa a página numa coluna até 1920 px. Com duas colunas, a linha da espera ocupa primeiro a sobra da coluna das ações, ao lado da abertura. A 1366 px e com a letra a 100%, o "Ir para o início" cabe numa linha no Edge e no Firefox. Nos dois, o título e o botão abrem 10,9 px mais acima e o rodapé fica no mesmo lugar. No Edge, a 1024 px a linha da espera cabe inteira na sobra e a 1920 px passa dela em 1 px. Vale nas mesmas condições do título: sem a API, sem o código ou com o código mal formado, não há botão, nem espera, nem o lugar dela.
- **Depois da saída:** o título vira "Você saiu da newsletter." e a frase, "O seu e-mail não está mais na lista, e as próximas edições não vão chegar. Elas continuam no site, em Edições, para ler quando quiser.". "Edições" é o link sublinhado para `/edicoes`, dentro do parágrafo. A região `role="status"` anuncia o título e a frase inteira uma vez.
- **O título guarda o lugar:** os dois títulos vêm no HTML do servidor, invisíveis e fora do leitor de tela, na mesma célula da grade, e o título tem sempre a altura do mais alto. O da vez fica embaixo, junto do fio. A 768 px, "Sair da newsletter" cabe numa linha e "Você saiu da newsletter." quebra em duas: o título já nasce com as duas linhas, e as ações não descem quando ele muda. Sem a API, sem o código ou com o código mal formado, o título não muda e não guarda lugar. Com o código bem formado que a API recusa (o 422), ele continua guardando o lugar, embora não mude mais: tirar a reserva na resposta faria a frase e as ações subirem uma linha quando ela chega.
- **O pé também guarda o lugar:** o pé inteiro, com a abertura e as ações, tem sempre a altura de antes da saída. A abertura guarda as duas frases, a de antes e a de depois da saída, e os dois erros, invisíveis e fora do leitor de tela, na mesma célula da grade. A frase da vez fica no alto, junto do fio. A reserva da frase de saída tem a cópia do "Edições" sem endereço. A grade fica em volta do parágrafo da frase da vez. No site, o Chromium deixou de expor a frase como parágrafo quando o CSS pôs o próprio parágrafo em grade (#152). O lugar do botão guarda uma cópia dele, com o mesmo desenho, e o botão fica na mesma célula. Antes da #141, em telas estreitas e com a letra a 200%, o pé encolhia e o navegador puxava a rolagem de quem estava no fim da página. O "Inscrever-se de novo" nascia até 135 px acima do botão. A página agora tem a mesma altura antes e depois da saída, em todas as larguras e letras. Vale nas mesmas condições do título: sem a API, sem o código ou com o código mal formado, o pé não guarda lugar.
- **O "Inscrever-se de novo"** fica no lugar do botão, no meio dele, com o foco, e leva à folha da newsletter (`/#newsletter`). Na ordem nativa do Tab, "Edições" vem antes das ações. Do "Inscrever-se de novo", Shift+Tab leva a "Edições", com o anel de foco, e Tab leva a "Ir para o início". O código já usado dá a mesma tela, porque a API responde igual.
- **Os erros:** "Não conseguimos confirmar a saída agora. Espere alguns minutos e tente de novo." e "Não deu para confirmar a saída. Confira a internet e tente de novo.", em negrito e sem cor, como o "Ainda não deu". O erro fica no lugar da frase de abertura, como a do link incompleto, e a explicação sai enquanto ele está na tela. A abertura guarda os dois erros com o desenho deles, em negrito, e o erro entra sem mexer em nada. O botão continua onde estava, com o foco, e um clique no mesmo ponto tenta de novo. Antes, o erro ficava embaixo das ações: de 62rem para cima, ele empurrava o botão até 65 px para cima, o "Ir para o início" ficava embaixo do ponteiro, e o clique seguinte no mesmo ponto abria a página inicial (#153). O leitor de tela ouve o erro uma vez, pelo aviso (a região `role="status"`): a frase da abertura não é região viva.
- **A nova tentativa:** a página volta à espera, com a explicação no lugar do erro, a linha "Confirmando a saída…" e o aviso. Quando um erro volta na hora (a rede caída), a espera fica meio segundo na tela antes dele, e o aviso lê o erro de novo: sem isso, o erro voltava no mesmo quadro, e nada mostrava que a tentativa tinha acontecido. O meio segundo conta do clique, e um erro que demora mais que isso aparece assim que chega.
- **O link incompleto** (sem o código, com o código mal formado ou com o código que a API recusa): "Este link está incompleto. Abra de novo o link de saída que vem no fim de cada e-mail da newsletter.", sem o botão. Quando a API recusa o código, o "Ir para o início" sobe para o lugar do botão, com o foco, e o item dele guarda a altura com uma cópia invisível, fora do leitor de tela: o espaço que sobra fica no fim do pé, e nada sai do lugar. A cópia é o mesmo link, sem o endereço, e segue as regras dele: na #152, quando o Firefox ainda quebrava o "Ir para o início" em duas linhas, uma cópia num `span`, fora da regra `a.acao-de-texto`, que só pega o `<a>`, ia numa. A 390 px, o pé ficava 24 px mais baixo (48 px com a letra a 200%), e a página encurtava. Desde a #173, o link vai numa linha também no Firefox (veja "Ações em texto"). Sem o endereço, a cópia não é link e não recebe o foco.
- **O segundo clique de um clique duplo**, e o terceiro de um clique triplo, são bloqueados em todos os links da tela (`detail` acima de 1, como no `lib/clique.ts`). Depois da saída e com o código recusado, o link no lugar do botão nasce embaixo do ponteiro. Um clique novo, de propósito, segue o link. O Enter também: o link que nasce no lugar do botão (o "Inscrever-se de novo" ou, com o código recusado, o "Ir para o início") não segue o Enter no primeiro meio segundo depois da troca, o tempo do clique duplo do Windows. Quem apertava o Enter duas vezes no botão mandava o segundo para o link novo, que já tem o foco, e saía da página (#153). No Chromium e no Firefox, o segundo Enter para no `keydown` do link novo e não gera clique. Se chegar um clique com `detail` 0 sem `keydown` nesse meio segundo, a guarda do clique impede a navegação. No Firefox, o clique do Enter num link vem com `detail` 1, como o do mouse. O tempo conta da troca, e não do foco: quem sai do link com o Tab e volta depois segue com o Enter. A guarda só impede seguir o link: não manda pedido nem muda o foco, e o Tab sai do link na hora. O Enter segurado também fica na página: no Firefox, cada repetição da tecla (o `keydown` com o `repeat`) ativa o link, e quem segurava o Enter no botão saía pelo link novo assim que o meio segundo acabava; a repetição não segue esse link, e um Enter novo, sim. O "Edições" e o "Ir para o início" do lado seguem o Enter na hora.
- **Sem a API** (o build sem o `API_URL`): "A newsletter ainda não funciona neste endereço do site.", sem o botão.
- **Sem JavaScript:** o botão não envia nada, e o `<noscript>` diz "Para confirmar a saída, o navegador precisa do JavaScript ligado. Sem ele, use a opção de cancelar a inscrição do seu programa de e-mail.".
- **O código fica fora dos buscadores, do Referer e do cache:** o `noindex`, o `no-referrer` e o `Cache-Control: no-store`, no `<head>` e nos cabeçalhos da resposta. Título da aba: "Sair da newsletter · Mandatômetro".

### Lista das edições
- **Endereço:** `/edicoes`, e `/edicoes?pagina=2` a partir da segunda página. Um `?pagina` que não é um número inteiro maior que 1 leva ao endereço sem ele; a página depois da última dá o 404.
- **O cartaz** segue o das páginas de dentro, como o de Trilhas, com o painel de azulejos e o título "Edições". No pé, vêm a abertura "As votações do Congresso e os destaques do Diário Oficial em linguagem simples. Cada item traz a fonte oficial.", a frase "A edição nova sai todo domingo e também chega por e-mail." e a ação em texto "Receber por e-mail", que leva à folha da newsletter (`/#newsletter`). A faixa traz "25 edições", "Todo domingo" e "Fonte oficial em cada item".
- **Cada edição** é uma folha da trilha (veja "Folha da lista"), na fita da semana (A Regra da Cor da Semana), da mais nova para a mais antiga, 20 por página:
  - no lugar do número, o último dia da semana em dois algarismos ("15"), como na folhinha, com o mês abreviado embaixo ("NOV"), em Label e tinta. Na tela, o dia é desenho; o leitor de tela ouve no lugar dele, antes do título, "Semana de 9 a 15 de novembro de 2026";
  - o título que o revisor deu, com o teto calculado. Ele é o link, e a área dele cobre a folha;
  - "Publicada em 16 de novembro de 2026", em Label;
  - o azulejo grande da semana.
- **O período não se repete na folha:** o título padrão já traz ele ("Jornal legislativo — 09 a 15/11/2026"), e o dia grande mostra o fim da semana. Na primeira versão, uma frase em Literata repetia o período embaixo do título; ela saiu na revisão da Atena, em 17/11/2026. O hover, o foco e a subida com a rolagem são os da folha da trilha.
- **As páginas vizinhas:** depois de um fio de tinta, "Página 2 de 3", em Label e tinta suave, e as ações em texto "Edições mais novas" e "Edições mais antigas". A partir de 40rem, a página fica no meio, as mais novas à esquerda e as mais antigas à direita; abaixo disso, uma linha embaixo da outra. São links: funcionam sem JavaScript.
- **Sem edição publicada**, a folha clara com fio de tinta traz "A primeira edição ainda não saiu", na letra do cartaz, "Inscreva-se e receba a primeira edição por e-mail assim que ela sair." e o botão "Receber por e-mail". O botão fica só nessa folha, e a contagem de edições aparece quando sai a primeira.
- **Sem a API** (o build sem o `API_URL`, como nas prévias dos PRs): o cartaz com "As edições ainda não aparecem neste endereço do site.", "Enquanto isso, as trilhas explicam passo a passo como o Congresso funciona.", o botão "Ver as trilhas" e "Ir para o início". A página de cada edição mostra o mesmo cartaz, e o cabeçalho e a página inicial não falam das edições.
- **Título da aba:** "Edições · Mandatômetro" e, a partir da segunda página, "Edições (página 2) · Mandatômetro".

### Página da edição
- **Endereço:** `/edicoes/7`, com o id da edição na API. O rascunho, a edição que não existe e o id que não pode ser de uma edição dão o 404.
- **A folha:** a folha de leitura do artigo, na fita da semana, a mesma da folha na lista, com o azulejo grande da semana no canto. Não tem a barra de leitura, o lido nem o anterior e o próximo: cada edição vizinha pediria outra chamada à API.
- **No alto** vem o caminho com o link "Edições". Embaixo do azulejo do canto, fica o título que o revisor deu, com o teto calculado. A faixa abaixo do título traz o período com o ano ("9 a 15 de novembro de 2026"), "Publicada em 16 de novembro" (com o ano quando difere do período) e a contagem, como "3 itens". O período fica na página com o ano mesmo quando o revisor troca o título padrão. O lide começa com "O que o Congresso votou na semana" nas edições só com votações e com "Os destaques da semana" nas que têm atos. Depois vêm ", em linguagem simples. Cada item traz a fonte oficial e a data em que ela foi coletada."
- **Por que assim:** na primeira versão, a primeira tela repetia o período três vezes: no caminho, num rótulo com o dia grande acima do título e no título padrão. A Atena pediu, em 17/11/2026, nenhum rótulo acima do título e a primeira tela sem a repetição, com o período e o ano na página em todo caso.
- **"Nesta edição"** segue o desenho de "Nesta trilha", com título em Label e, entre fios, o número pequeno de cada item na fita da posição e o título que leva ao item (`#item-3`). Os links seguem a ordem em que os itens aparecem na folha. Abaixo de 1200 px, o índice fica dentro da folha, depois do lide. Daí para cima, fica na coluna ao lado, fixa ao rolar. As duas cópias vêm no HTML, e o CSS mostra só uma por largura, também para o leitor de tela. O clique leva direto ao item.
- Nas edições com atos, **os títulos das seções** usam o rótulo de "Nesta edição", em Label e tinta suave. Primeiro vem "O que o Congresso votou" se houver votações, depois "O que saiu no Diário Oficial". Dentro de cada seção vale a ordem da revisão. Os títulos dos grupos são `h2`, os dos itens são `h3`, e os dos quadros e fontes são `h4`. Na edição só com votações, a folha vai direto aos itens, com títulos em `h2`.
- **Os números e as fitas** seguem a ordem de leitura da página, de 1 em diante, no índice e na folha. Os nomes das fontes para leitor de tela usam o mesmo número. Os links da busca e do índice apontam para `item-N`, com o `N` da ordem gravada na revisão.
- **Cada item** começa com um fio de tinta, seguido do número na fita da posição, do título, do texto em Literata, do quadro de cada votação e das fontes. A explicação é texto puro, com um parágrafo por bloco separado por linha em branco e a quebra simples dentro do parágrafo, como no e-mail. Quando o revisor escolheu um artigo da trilha, aparece a ação em texto "Entenda na trilha: ‹título do artigo›". O item é uma seção ligada ao próprio título e fica com 1rem de respiro em cima quando é alcançado por um link (`scroll-margin-top`).
- **O item antigo,** de antes dos fatos por votação, vem sem o quadro da votação, com as fontes.
- **O fim:** depois de um fio de 6 px, o botão "Ver todas as edições" e a ação em texto "Receber as próximas por e-mail" (`/#newsletter`).
- O **título da aba e da prévia do link** segue o formato "‹título› · Mandatômetro". A descrição começa com "O que o Congresso votou de 9 a 15 de novembro de 2026" ou, nas edições com atos, "Os destaques de 9 a 15 de novembro de 2026". Ela informa a contagem de itens e cita a fonte oficial de cada um. O `og:type` é article, e a imagem é a `previa.png` de todas as páginas.
- **Sem JavaScript:** tudo vem no HTML do servidor: os itens, os quadros, as fontes e os links do índice.

### Quadro da votação
- **Forma:** o título "Votação de 12 de novembro de 2026", em Label, e, entre dois fios de tinta, uma lista de termos (`dl`): o "Resultado registrado" ("Aprovada", "Rejeitada" ou "Não classificado nos dados usados", em Archivo 800, a 1.125rem, com altura 1.25); o placar, "Sim", "Não", "Abstenções" e "Obstruções", com o número grande em cima do nome; e, numa linha à parte, "Presidência", com "1, contada à parte", em Literata. O placar vai em duas colunas no celular, em quatro a partir de 40rem e numa só abaixo de 20rem.
- **Tudo em tinta:** o Sim não é verde, e o Não não é vermelho. O placar é contado por votação, e a Presidência fica fora dele. Um resultado que não é aprovada nem rejeitada não vira aprovação.
- **Sem placar,** como nas votações secretas do Senado: "O placar não está disponível nos dados usados.", sem zero e sem adivinhar a modalidade.
- **Leitor de tela:** o nome vem antes do número no HTML, e o leitor de tela lê "Sim, 312"; a tela põe o número em cima (`column-reverse`).
- **Ver quem votou:** na edição, cada quadro termina com a ação em texto "Ver quem votou", que leva à página da votação (`/votacoes/139`). O fim do nome, "na votação de 12 de novembro de 2026", fica só para o leitor de tela: a edição pode ter várias votações. O painel de revisão não passa o id da votação e fica sem o link. O Renan pediu o link em 21/11/2026, na #268, olhando o placar de uma edição. Quando a votação tem o vídeo da sessão, vem ao lado a ação em texto "Vídeo da sessão", que leva ao bloco dele na página da votação (`/votacoes/139#video-da-sessao`), com o mesmo fim só para o leitor de tela (veja "Vídeo da sessão"); sem vídeo, ou com um endereço fora do formato do contrato, ela não aparece.

### Fontes do item
- **Forma:** o título "Fontes", em Label, e a lista numerada das "Fontes oficiais" do artigo, sem o fio de 6 px. As fontes vêm agrupadas pelo endereço, como no e-mail: o primeiro endereço se chama "Fonte oficial", e os outros, "Outra referência oficial". Embaixo do nome, o site, como nas fontes das trilhas, e "coletada em 13 de novembro de 2026", no dia de Brasília.
- **Nomes únicos para o leitor de tela:** o título leva "do item 3", e o nome de cada link, " do item 3", só para o leitor de tela; nas outras referências, vem antes o número delas na lista, o mesmo que a tela mostra ao lado: "Outra referência oficial 2 do item 3", "Outra referência oficial 3 do item 3". Assim, a lista de links da página não fica com oito "Fonte oficial" iguais, e um item com três endereços não fica com duas "Outra referência oficial do item 3" para lugares diferentes. Na tela, o nome continua "Fonte oficial" e "Outra referência oficial".
- **O trecho literal** de cada coleta vem entre aspas, num `blockquote` com o endereço no `cite` e um fio fino de tinta do lado, sempre como texto; o leitor de tela ouve "Trecho da fonte:" antes dele. A mesma página coletada de novo aparece embaixo, em tinta suave, "Outra coleta da mesma referência, em 14 de novembro de 2026.", com o trecho dela.
- **Um endereço que não é `http` ou `https`** fica sem link: o nome vai em negrito, seguido de "Coletada em …".

### Lista dos parlamentares
- **Endereço:** `/parlamentares` e `/parlamentares?uf=SC`. Um `?uf` que não é a sigla de um estado sai do endereço, e a sigla em minúsculas vira maiúscula. As páginas dos parlamentares e das votações entram nos buscadores, como as outras (o Renan, em 21/11/2026, na #268).
- **O cartaz:** o das páginas de dentro, com o painel de dados no lugar do painel de enfeite. O Renan escolheu o "Cartaz com painel de dados" em 21/11/2026. Sem estado, o título é "Parlamentares", e o pé traz "Escolha o seu estado. Na Câmara, cada estado tem de 8 a 70 deputados; no Senado, sempre 3 (Constituição, art. 45 e art. 46).", com os dois artigos no normas.leg.br, e o campo "Estado". Com um estado, o título vira o nome dele, com o teto da régua (o `estiloDoTeto`); a migalha volta a "Parlamentares"; e o pé diz quantos são, contados nos dados ("16 deputados federais e 3 senadores em exercício."), e "O partido é o do último voto registrado. Quem ainda não tem voto registrado aparece com um traço.".
- **O mapa:** o Brasil em 27 azulejos, na forma do mapa, numa grade de seis colunas e oito fileiras. Cada azulejo é um link para a lista do estado, com a sigla grande e o número de deputados pequeno, na folha clara com fio de tinta e a fita da posição numa tira em cima. O texto fica sempre no papel. O estado aberto fica em tinta, com o `aria-current`. O nome do link traz o que a tela mostra e o nome do estado: "SC Santa Catarina, 16 deputados", e "1 deputado" no singular. Com o ponteiro, o azulejo sobe, como as folhas. A partir de 62rem, o mapa fica nos 30% da direita, no Papel 2, com um fio de tinta à esquerda. Abaixo disso, ele vem depois do pé do cartaz, com até 26rem, e o painel de enfeite fica no alto, como nas outras páginas.
- **A lista no lugar do mapa:** seis azulejos de 44 px e cinco vãos de 4 px pedem 17,75rem. Com menos que isso, como a 320 px ou com a letra a 200% no celular, um container query troca o mapa pela lista dos 27 estados em ordem alfabética, entre fios, com o nome e o número. A sigla sai da lista e do nome do link: numa terceira coluna, a 320 px e com a letra a 200%, ela fazia o nome quebrar no meio da palavra ("Pernam-buco"). As duas cópias vêm no HTML, e o `display: none` tira a outra do leitor de tela e do Tab.
- **Os nomes:** "Câmara dos Deputados" e "Senado Federal", em subtítulo, e os nomes em ordem alfabética, em colunas de pelo menos 16rem. Cada nome é um link de 44 px de altura para a página da pessoa, entre fios, com o partido à direita, na primeira linha quando o nome quebra (o `minmax(0, 1fr) auto`). Sem partido nos dados, vai um traço, que o leitor de tela pula, e ele ouve "sem partido registrado". Uma Casa sem nome nos dados diz "Nenhum nome nos dados usados.".
- **Os dados:** uma chamada só, o `GET /parlamentares`. O servidor conta os deputados de cada estado e manda ao navegador só as 27 contagens e os nomes do estado aberto.
- **Sem a API** (o build sem o `API_URL`): o cartaz com "Os parlamentares ainda não aparecem neste endereço do site." e o mesmo "Enquanto isso" das edições, com "Ver as trilhas" e "Ir para o início". A página de cada parlamentar e a de cada votação mostram o mesmo cartaz, e a página inicial fica sem o bloco "Quem representa o seu estado".
- **Título da aba:** "Parlamentares · Mandatômetro" e, com um estado, "Parlamentares de Santa Catarina · Mandatômetro", com a descrição "3 deputados federais e 2 senadores de Santa Catarina em exercício, com o partido e como cada um votou.".

### Página do parlamentar
- **Endereço:** `/parlamentares/81-agata-cedrolume`: o id na API, um hífen e o nome em minúsculas, sem acento. O id sozinho, ou com outro nome, como depois de uma troca de nome, leva ao endereço certo por um redirecionamento permanente (301), com a mesma `?pagina`. O id que não pode ser de um parlamentar, a pessoa que não existe e a página de votos depois da última dão o 404.
- **O cartaz:** o das páginas de dentro, com o painel de enfeite, da semente do id. A migalha leva a "Parlamentares" e ao estado da pessoa. O nome vem gigante, com o teto da régua: um nome de 45 letras cabe a 320 px. Como vem da API, ele usa a altura 1.15 da leitura (o `titulo-de-folha`), e não a 0.95 do cartaz (veja "A Regra das Duas Alturas"). Embaixo, a faixa com a Casa, o estado e o partido. Sem partido nos dados, entra "Sem partido nos dados usados: o partido vem do último voto registrado.".
- **Mandatos:** um por linha, como "57ª legislatura · Santa Catarina · titular · em exercício". A condição e o "em exercício" só aparecem quando vêm nos dados, e a página não calcula anos.
- **Patrimônio declarado ao TSE:** logo depois dos mandatos e antes de "Como votou" (veja "Patrimônio declarado ao TSE"). Sem voto registrado, a ordem é Mandatos, Patrimônio e a folha "Nenhum voto registrado ainda".
- **Como votou:** uma lista de termos, com uma linha por tipo de voto: o nome ("Sim", "Não", "Abstenção", "Obstrução", "Presidência", "Não votou" e, só quando passa de zero, "Outro registro"), o número grande em tinta e a regra, com o artigo do Regimento Interno da Casa da pessoa entre parênteses: "Votou a favor do que estava em votação. (Regimento Interno da Câmara, art. 187, § 1º)". Depois do "art." e do "§", um espaço que não quebra. O Não votou e o Outro registro não têm artigo. Embaixo, "Fonte das regras:", com o link do regimento da Casa da pessoa. Cada artigo foi conferido no texto oficial do regimento, em 22/11/2026, e a regra sem artigo saiu do texto. O número fica à esquerda, numa coluna de 5.5rem (4.25rem abaixo de 40rem), com o nome e a regra à direita, e abaixo de 22rem vai para cima do nome.
- **Os votos:** "25 votos registrados, do mais novo para o mais antigo", em Label, e os votos, 20 por página, entre fios. Cada voto traz o título (a proposição, como "PL 812/2026", ou, sem ela, "Votação de 19 de novembro"), a faixa com o dia e o resultado, o carimbo do voto ("Sim", em bloco de tinta com a letra em papel, em Archivo estreito, sem cor de lado nenhum), a ementa ou a descrição oficial, as ações em texto "Ver quem votou" e, quando há endereço, "Página oficial", e "Coletado em …". Os links levam um fim só para o leitor de tela, como "na votação de 20 de novembro de 2026: PL 812/2026". A partir de 40rem, o carimbo fica numa coluna de 7.5rem à esquerda; abaixo disso, embaixo dos fatos. Embaixo, "Página 1 de 2" e as ações em texto "Votos mais novos" e "Votos mais antigos", como nas edições. Os dois links levam a `#votos`. A primeira página fica sem `?pagina`.
- **Sem voto registrado:** a folha clara com fio de tinta, no lugar de "Como votou" e dos votos: "Nenhum voto registrado ainda", na letra do cartaz; "Os dados usados ainda não têm votos de Ágata Cedrolume. O voto de cada parlamentar só fica registrado na votação nominal, feita em geral pelo painel eletrônico. Na votação simbólica, a mais comum na Câmara, o resultado sai sem a lista de nomes."; e o link "Entenda na trilha: O Plenário vota o projeto".
- **Título da aba:** o nome ("Ágata Cedrolume · Mandatômetro") e, a partir da segunda página, "Ágata Cedrolume (página 2) · Mandatômetro". A descrição: "Câmara dos Deputados, Santa Catarina, PFT. Os mandatos, como votou e cada voto registrado, com a página oficial de cada votação.".

### Patrimônio declarado ao TSE
- **Onde:** na página do parlamentar, entre "Mandatos" e "Como votou", com o título "Patrimônio declarado ao TSE", em subtítulo. O Renan escolheu em 22/11/2026, na #20: uma linha por eleição, com barra; o valor em reais de hoje em destaque; o bloco depois de Mandatos; e uma explicação curta quando não há dados.
- **A abertura e o aviso:** a abertura diz o que é a declaração de bens e até que mês a inflação corrige os valores, em Literata, a 1.0625rem, com até 39rem. Logo antes da lista vem o aviso, com o fio de 5 px dos desvios em tinta. O texto diz "É o valor que a própria pessoa declarou ao registrar a candidatura, e não o patrimônio de hoje. A Justiça Eleitoral dá acesso à declaração como ela foi entregue, e cada bem costuma entrar pelo preço de compra, como na declaração do Imposto de Renda: uma casa comprada há 20 anos pode aparecer pelo valor daquela época."
- **Cada eleição:** um item de uma lista ordenada, da mais antiga para a mais nova, entre fios de tinta (2 px em cima da lista e 1 px entre as eleições). O ano vai em número grande, em tinta. Ao lado, a faixa com o cargo e o estado ("Brasil" na eleição para presidente), que, numa coluna com menos de 23.5rem, põe um embaixo do outro, sem o quadradinho: assim ele não fica sozinho no fim da linha. Depois, o valor em destaque, com a legenda "em reais de hoje" em Label, em tinta suave, e a barra. Embaixo, "Declarado em 2018: R$ 812.400,00", em Archivo 600, a 1rem, em algarismos da mesma largura; a ação em texto "Arquivo do TSE (ZIP)", com o fim "com os bens declarados em 2018" só para o leitor de tela; e "Coletado em …", em tinta suave. O "(ZIP)" só aparece quando o endereço termina em `.zip`. Um endereço fora dos sites oficiais fica escrito, sem link, com a altura do link. A partir de 48rem, a linha tem três colunas: o ano, numa de 5.5rem; o cargo, o declarado e o arquivo; e o valor com a barra, à direita. Abaixo disso, tudo desce numa coluna ao lado do ano (4.25rem abaixo de 40rem), e abaixo de 22rem o ano vai para cima.
- **Os números:** o destaque vem arredondado ("R$ 850", "R$ 45,3 mil", "R$ 352 mil", "R$ 1,9 milhão", "R$ 2 milhões" e "R$ 1,2 bilhão", no singular até 1,9), e o valor exato fica no "Declarado em". O valor exato fica junto quando cabe na coluna e pode quebrar depois de um ponto de milhar. O "em" fica junto do ano. O leitor de tela recebe o número inteiro. A correção pelo IPCA vem pronta da API, e o site só escreve os números (`lib/parlamentares/patrimonio.ts`).
- **A barra:** em tinta, do tamanho da parte do maior valor de hoje da pessoa, sem cor de ganho nem de perda, sem seta e sem percentual. Ela só aparece com duas eleições ou mais com o valor de hoje. Acima de zero, tem pelo menos 4 px, e o zero e o valor que falta ficam sem barra. Ela fica fora do leitor de tela, porque o número está escrito, e continua à vista nas cores forçadas (`CanvasText`).
- **Os estados:** sem o total, "Os dados do TSE desta eleição não trazem um total de bens.". A eleição sem a correção traz o declarado, arredondado, com "sem a correção pela inflação" e sem barra. Sem a série do IPCA, a abertura termina com "Os valores aparecem como foram declarados, sem a correção pela inflação: a série do IPCA não está nos dados usados agora.", e o bloco fica sem barras e sem a nota da correção. Sem eleição ligada à pessoa: "Os dados usados ainda não têm a declaração de bens de Ágata Cedrolume. Uma eleição só aparece aqui quando dá para ligar, com segurança, a candidatura no TSE a esta pessoa.".
- **A cobertura do IPCA** considera só eleições com total. Quando todos os totais vêm corrigidos, a abertura termina com "Para comparar anos diferentes, cada total aparece também em reais de hoje, corrigido pela inflação até {mês}." Se só parte vem corrigida, termina com "Para comparar anos diferentes, os totais aparecem também em reais de hoje, corrigidos pela inflação até {mês}, quando a série do IPCA cobre a eleição." Se a série existe e nenhum total veio corrigido, a abertura termina depois de "concorreu." e o bloco fica sem a nota, o link e a data da coleta do IPCA.
- **Quando só o bloco falha:** o resto da página continua, e o bloco diz "O patrimônio declarado não carregou agora. Recarregue a página para tentar de novo.". Uma data de coleta inválida no arquivo do TSE ou na série do IPCA deixa o bloco indisponível, com o motivo `resposta-invalida`. O servidor escreve uma linha fixa, `[parlamentares] O patrimônio não carregou: <motivo>.`, e nada da falha chega ao HTML. O patrimônio é um complemento: sem ele, a página não dá erro 500.
- **Depois da lista:** a nota "Só aparecem as eleições em que deu para ligar, com segurança, a candidatura no TSE a Ágata Cedrolume. O arquivo de cada ano é o do TSE com os bens declarados naquela eleição, e não só os desta pessoa." Com todos os totais corrigidos, a nota da correção diz "A correção usa o IPCA, a inflação oficial medida pelo IBGE, de outubro do ano de cada eleição até {mês}." Com parte corrigida, diz "A correção usa o IPCA, a inflação oficial medida pelo IBGE, de outubro do ano da eleição até {mês}." Quando aparece, a nota traz a ação em texto "Série do IPCA no Banco Central" e "Coletada em …". O pé traz "Fontes das regras:", com a Lei 9.504/1997, art. 11, e a Lei 9.250/1995, art. 25, no Planalto. As citações têm alvo de toque de pelo menos 44 px, como a de "Como votou".
- **Sem julgamento:** o bloco não compara as eleições em palavras nem em percentual, e não diz que o patrimônio subiu ou caiu. Ele mostra o que foi declarado e de onde vem.

### Página da votação
- **Endereço:** `/votacoes/139`, com o id da votação na API. O id que não pode ser de uma votação e a votação que não existe dão o 404.
- **O cartaz:** o título é a proposição ("PL 812/2026", ou "PL 812/2026 e mais 2" quando são várias), com o teto da régua; sem proposição, "Votação de 20 de novembro". O título vem da API e usa a altura 1.15 da leitura (o `titulo-de-folha`). No pé, a faixa com a Casa, o dia e o resultado, numa linha de largura toda a partir de 62rem; as ementas; a "Descrição oficial"; a ação em texto "Página oficial", quando há endereço; e "Coletado em …".
- **O plenário:** no lugar do painel de enfeite, um azulejo por voto, em SVG escrito no código, na ordem do placar e todo em tinta: o Sim é cheio, o Não é um anel, a Abstenção é a metade, a Obstrução são barras, a Presidência é um ponto, o Outro registro é um traço, e o Não votou é o azulejo cru. A forma diz o voto, e ninguém precisa da cor. A legenda, em texto, traz só os votos que aparecem. O painel é decorativo e fica fora do leitor de tela. O quadro mostra Sim, Não, Abstenção e Obstrução, com a Presidência à parte. “Não votou” e “Outro registro” aparecem no placar por partido e nos grupos de “Quem votou como”, quando há registros. A partir de 62rem, o plenário fica nos 30% da direita, no Papel 2, num desenho alto; abaixo disso, vira uma faixa larga, de borda a borda, no alto do cartaz, no Papel 2 e com um fio de tinta embaixo.
- **O placar:** "Placar", em subtítulo, e o quadro da votação, o mesmo da edição (veja "Quadro da votação"). Sem o voto de cada um, ele diz "O placar não está disponível nos dados usados.".
- **O placar por partido:** "Placar por partido" e, a partir de 62rem, uma tabela com a legenda "Quantos votos de cada tipo cada partido deu nesta votação", só para o leitor de tela, uma linha por partido e uma coluna por tipo de voto, com o `th` de cada linha e de cada coluna. Abaixo disso, uma lista por partido. As duas vêm no HTML, e o CSS mostra uma de cada vez. "Sem partido registrado" vem por último, e a coluna do Outro registro só aparece quando algum partido tem um.
- **Quem votou como:** os nomes agrupados pelo voto, num `<details>` por grupo. A abertura do grupo traz o voto em maiúsculas e o número de nomes ("SIM 312"), com o sinal de abrir desenhado no CSS, que gira quando o grupo abre. Se faltar largura, o nome ou o número passa para outra linha dentro do grupo. Os nomes são links de 44 px de altura para a página de cada um, em até três colunas de 16rem, com o partido e a UF do dia do voto. Os grupos vêm abertos quando a lista tem até 100 nomes e fechados acima disso: a Câmara inteira vem fechada, e um estado, um partido ou o Senado vêm abertos. O Renan escolheu agrupar pelo voto, com os filtros, em 21/11/2026.
- **O filtro:** "Estado" e "Partido", só com o que aparece na votação, e o botão "Filtrar", num formulário GET para o mesmo endereço (`/votacoes/139?uf=SC&partido=PFT`), que funciona sem JavaScript. Embaixo vem "Mostrando 16 de 513 nomes" e, com filtro, a ação em texto "Limpar os filtros". Sem nome nenhum, aparece "Nenhum nome com esses filtros.". O leitor de tela recebe a contagem inteira e a frase de vazio juntas. O filtro só muda o que a página mostra, e a votação não é pedida de novo. O partido no endereço conserva até 40 caracteres de texto, sem controles. Um partido ausente na votação dá a lista vazia. Um estado ausente é ignorado, e valores inválidos saem do endereço. A página fica onde está, com a lista logo abaixo, e o foco fica no "Filtrar"; o "Limpar os filtros" some com o filtro e leva o foco ao "Filtrar", logo acima.
- **Sem o voto de cada um,** como na votação simbólica e na secreta do Senado: o painel volta a ser de enfeite, o placar por partido e o filtro saem, e "Quem votou como" diz "Esta votação não tem o voto de cada parlamentar nos dados usados. Isso acontece quando o voto de cada um não é registrado, como na votação simbólica.", com o link "Entenda na trilha: O Plenário vota o projeto".
- **Título da aba:** a proposição ("PL 812/2026 · Mandatômetro"). A descrição: "Câmara dos Deputados, 20 de novembro de 2026: aprovada. O placar, o placar por partido e quem votou como, com a página oficial da votação.".

### Vídeo da sessão
- **Onde:** na página da votação, depois do placar e antes do placar por partido, só quando a votação tem o vídeo da sessão (o `url_video` da API). Na edição, o quadro da votação leva a ele pelo "Vídeo da sessão" (veja "Quadro da votação"), sem player dentro da edição. A Atena escolheu, pelo Renan, em 22/11/2026, na #268: o pedido nasceu na edição, quando ele abriu o link oficial de uma votação e caiu no vídeo da sessão no site da Câmara.
- **O endereço:** só o formato do contrato, `https://www.youtube.com/watch?v=` com o id de 11 caracteres, vira capa e player (`lib/parlamentares/video.ts`). Qualquer outro valor conta como sem vídeo, e o bloco não aparece.
- **A capa:** "Vídeo da sessão", em subtítulo, e a caixa 16:9, guardada desde o servidor, com o fio de tinta de 2 px e o papel do painel. Dentro, o azulejo de tinta com o play em papel, desenhado em SVG no código, e, ao lado, "Assistir ao vídeo da sessão", em Archivo estreito em maiúsculas, e a linha "Sessão de 20 de novembro de 2026 · Câmara dos Deputados · YouTube", em Label. A capa inteira é um link para o vídeo no YouTube: sem o JavaScript, ela abre o vídeo lá; com ele, o toque põe no lugar o player do `youtube-nocookie.com`, que já começa a tocar, num `iframe` com o título "Vídeo da sessão de 20 de novembro de 2026, no YouTube", e o foco vai para o player. Enquanto o player tem foco, a caixa mostra o anel azul de 3 px, a 3 px da borda. O Ctrl, o Shift e o botão do meio seguem o link. Nada do YouTube carrega antes do toque, nem a miniatura.
- **A altura:** com a letra grande numa tela estreita, a caixa cresce para caber a capa. Depois do toque, a capa fica na caixa, escondida e fora do teclado (`inert`), e o player ocupa a caixa inteira: nada pula.
- **A nota,** embaixo, em serifa pequena: "O vídeo é da sessão inteira do Plenário, publicado pela Câmara dos Deputados no YouTube, e não começa no momento desta votação. O player do YouTube, do Google, só carrega depois do toque." No Senado, "publicado pelo Senado Federal". A API não diz o minuto da votação, e a página não afirma.
- **O termo** fica como está (a Atena, pelo Renan, em 22/11/2026): o vídeo não usa dado da conta, e a nota diz que o player é do Google.

### Página do termo
- **Endereço.** O termo de consentimento da conta fica em `/termo`, com o título da aba "Termo de consentimento · Mandatômetro". A rota serve o texto sem loader nem pedido à API e abre sem conta e sem JavaScript. No navegador com API configurada e sessão anotada, a moldura consulta o progresso da conta, como nas outras páginas. O cadastro leva até o termo em outra aba, pelo endereço que a API devolve (`CONTA_TERMO_URL`), e o rodapé de todas as páginas, pelo link "O termo de consentimento da conta".
- **A folha:** a folha de leitura do artigo e da edição, sem migalha, sem azulejo no canto e sem barra de leitura: o termo é um documento calmo.
- **No alto**, o título "Termo de consentimento" tem o teto da tabela. A faixa mostra "Versão de 20 de novembro de 2026", num `<time>` com a `VERSAO_DO_TERMO` (`lib/termo.ts`), e "Leitura de 6 min". A abertura vem no lide. O tempo de leitura segue a conta do artigo (200 palavras por minuto), sobre o lide, os títulos e o texto das partes. O teste do componente recusa um número que não bate com o texto.
- **"Neste termo"** segue o desenho de "Nesta edição", com um link para cada uma das nove partes (`#servicos`). Abaixo de 1200 px, fica dentro da folha, depois do lide; daí para cima, na coluna ao lado, fixa ao rolar. As duas cópias vêm no HTML, e o CSS mostra só uma por largura.
- **Cada parte** é uma seção ligada ao próprio título, depois de um fio de tinta: o número na fita da posição, fora do leitor de tela; o título em `h2`, com o teto de SERVIÇOS, que vale para as nove; e o texto do artigo, em Literata, com as listas do azulejinho. A parte não sobe com a rolagem: o índice leva até ela, com 1rem de respiro em cima (`scroll-margin-top`). As nove ficam numa lista no `pagina-do-termo.tsx`, que gera o índice e as seções.
- **Os links do texto** abrem na mesma aba. Os atalhos "parte 5", "parte 6" e "escreva para nós" levam a outras partes. O contato é um `mailto:`, e as políticas da Vercel, do Neon, do Resend e do GitHub, a ANPD e o histórico no GitHub levam para fora.
- **A versão** fica num lugar só, a `VERSAO_DO_TERMO`, a data do texto em AAAA-MM-DD. O cadastro só abre quando a API devolve a mesma versão; com outra, mostra "O cadastro está indisponível no momento.". [Quando o texto do termo mudar](docs/hospedagem.md#quando-o-texto-do-termo-mudar)

### Perfil da conta
- **Endereço:** `/perfil`, com o título da aba "Meu perfil · Mandatômetro", o `noindex` e o `no-store`. O nome e o papel vêm do `GET /contas/me` (o `usePerfil`); os lidos, do espelho da conta no navegador, que a moldura sincroniza; e as trilhas, do conteúdo, pelo loader, como em Trilhas. Quem não entrou vai para o `/login`. O Renan pediu a página nova em 20/11/2026, na #258 ("melhorar isto, ter acesso ao perfil, melhor, mais personalizado, e bem mais bem feito"), e escolheu o desenho ("Quadro da leitura"), o título, a frase de abertura e a parte "Sua conta" completa. Os dados da conta na página são só o nome, sem mudar a API.
- **O cartaz:** o das páginas de dentro, com o painel de azulejos. "Meu perfil" é o `h1`, em Label, no alto, onde as outras páginas põem a migalha, e com a altura dela (44 px). Embaixo, a saudação, na letra gigante: "OLÁ!" no HTML do servidor e, quando a conta responde, "OLÁ," numa linha e o primeiro nome na outra, que tomba no lugar. O leitor de tela lê "Olá, Maria." num texto escondido. As linhas não quebram, e um nome comprido só diminui a letra (veja "O teto da letra grande"). A saudação tem a altura de linha da leitura (1.15), e não a do cartaz: com 0.95, a vírgula do "OLÁ," encostava no acento de um nome como "JOSÉ", na linha de baixo.
- **O pé:** a abertura, "A sua conta guarda os artigos que você leu. Comece uma trilha no celular e continue no computador, de onde parou."; a linha do progresso (`role="status"`), com "Verificando sua sessão…", "Você ainda não leu nenhum artigo.", "Você leu 9 de 28 artigos." ou "Você leu os 28 artigos."; e o botão, com "Começar pelo primeiro artigo", "Continuar de onde parou: …" ou, com tudo lido, "Ver as trilhas".
- **Onde continuar** (`ondeContinuar`, em `lib/perfil.ts`): na primeira trilha começada e não terminada, na ordem da lista, o primeiro artigo que falta nela. Sem trilha pela metade, vale o primeiro artigo não lido da lista. O navegador não sabe quando cada artigo foi lido, e a ordem das trilhas faz as vezes da leitura mais recente.
- **Sua leitura:** o título, a legenda "Cada azulejo é um artigo da trilha. Com cor e o visto, você já leu." e o quadro da leitura, uma folha com fio de tinta, com uma trilha por linha, entre fios. Cada linha tem:
  - o azulejo da trilha, com o símbolo dela, que vira em onda quando o ponteiro passa, como em Trilhas;
  - o título, que leva à trilha, com pelo menos 44 px de área de toque, e a frase: "Você terminou a trilha.", "Você leu 3 de 8." ou "Você ainda não começou esta trilha.";
  - a fileira dos artigos, com um azulejo por artigo, na fita da posição. O azulejo fica cru até a pessoa ler o artigo.
- **A marca da página:** quando a leitura da conta chega e a fileira está na tela, acima dos 15% de baixo, os azulejos lidos viram do cru para a cor, em onda, 60 ms um depois do outro, e o visto é desenhado no canto de cada um quando ele termina de virar. A fileira que ainda está fora da tela espera a pessoa rolar até ela: o cartaz toma a primeira tela, e a onda passaria longe da vista. Com o movimento reduzido, a cor e o visto chegam de uma vez. Os azulejos ficam fora do leitor de tela, e a frase da trilha diz o mesmo em palavras. Nas cores forçadas do Windows, cada artigo fica com um contorno na cor do texto, e o lido, com o visto.
- **O tamanho dos azulejos:** até 44 px, a 6 px um do outro, numa fileira só. Numa tela estreita, eles diminuem até caber a fileira da trilha mais comprida, e todas as fileiras ficam com o azulejo do mesmo tamanho, com as colunas alinhadas de uma trilha para a outra. No celular, a fileira fica embaixo do azulejo e do texto, na largura toda; a partir de 40rem, embaixo do texto. A partir de 62rem, o quadro vira uma tabela, e a fileira fica numa terceira coluna, com a largura da trilha mais comprida. Com a letra grande (abaixo de 22rem), o azulejo da trilha passa para cima do texto, como na lista das trilhas.
- **Sua conta:** depois de um fio de tinta, o que a conta guarda fica à esquerda e as ações, à direita, a partir de 62rem; abaixo disso, tudo numa coluna.
  - "Você entrou como Maria Fictícia.", com o nome completo, que o termo diz que aparece no perfil.
  - "A conta guarda o seu nome, o seu e-mail, um código da sua senha (nunca a senha), os dados opcionais que você escolheu dar e os artigos que você leu. As respostas dos quizzes ficam só neste navegador, e a newsletter é uma inscrição à parte.", seguido de "Ler o termo da conta" (`/termo#o-que-guarda`) e de "Para ver ou corrigir um dado, escreva para contato@mandatometro.com.br." (`mailto:`).
  - "Trocar a senha" (`/cadastro/recuperar`), com a nota "Você recebe no e-mail um link para criar a senha nova. Depois, entre de novo em cada aparelho.": a API encerra todas as sessões quando a senha muda.
  - "Sair", um botão com o `aria-disabled` enquanto envia, e "Excluir conta" (`/cadastro/excluir`). O termo cita "Meu perfil" e "Excluir conta", e os nomes ficam assim. Se a saída falhar, aparece "Não deu para sair. Confira a internet ou espere um pouco e tente de novo." (`role="alert"`), embaixo das ações.
  - "Revisar a edição da semana" (`/painel`), só para a administradora, no fim.
- **Os estados:**
  - **Verificando** (o HTML do servidor e a espera da conta): a abertura, "Verificando sua sessão…", o lugar do botão vazio, os azulejos crus e as frases das trilhas e a linha do nome vazias. O perfil confere a chave da sessão do navegador antes de pedir o nome. Se a chave some ou troca durante o pedido, o perfil descarta a resposta e consulta de novo, com a tela ainda em espera. Vai para o `/login` se a consulta confirma que a sessão acabou.
  - **Esperando a leitura** (a conta respondeu e o navegador ainda aguarda a primeira leitura bem-sucedida do progresso desta sessão): a saudação e a linha do nome já têm o nome, e o resto fica como em Verificando, com "Verificando sua sessão…", sem número, sem frase de trilha, sem cor e sem botão. O perfil segue à espera se alguém marcar um artigo antes da resposta. Depois que o navegador guarda a primeira leitura bem-sucedida dessa sessão, outros documentos já usam a cópia quando a conta responde (o `useCopiaDaConta`, em `lib/progresso.ts`).
  - **Indisponível** (a rede, o prazo de 15 s ou outra resposta da API): "Não conseguimos abrir a sua conta agora. Confira a internet ou espere um pouco e tente de novo.", em negrito, no lugar da abertura, como na página de sair da newsletter, e "Tentar de novo" (`/perfil`) no lugar do botão. Quando a primeira leitura do progresso falha (a rede, o prazo de 10 s ou outra resposta da API), o nome fica, e o progresso continua indisponível até uma leitura bem-sucedida, mesmo se a pessoa marcar um artigo.
  - **A sessão acaba depois de mostrar o nome** (o "Sair" ou a exclusão da conta em outra aba e o 401 da sincronização apagam a chave da sessão do progresso neste navegador, e uma entrada nova troca a chave): o perfil tira o nome, o total, as frases, os vistos e o botão no mesmo quadro em que os azulejos dos artigos voltam ao cru, sem giro, e vai para o `/login`.
  - **Sem a API** (o build sem o `API_URL`): "A conta ainda não funciona neste endereço do site.", o botão "Ver as trilhas" e nenhum "Sair".
  - **Sem JavaScript:** o `<noscript>` diz "O perfil precisa do JavaScript do navegador ligado." no lugar do botão. A linha da espera e o "Sair" saem pelo `@media (scripting: none)`, com o display no CSS da peça (veja `docs/codigo-do-site.md`).
- **O que fica no lugar quando a conta responde:** a saudação, a abertura, o progresso, o botão, o quadro e o título "Sua conta" não saem do lugar. A linha "Você entrou como…" guarda uma linha (duas abaixo de 40rem), e um nome que ocupe mais linhas do que isso empurra o texto que vem depois dele, com qualquer tamanho de letra. Os lugares guardados desde o HTML do servidor:
  - a caixa da saudação guarda as duas linhas desde o HTML do servidor, na letra maior que a saudação pode ter, e a saudação fica no alto dela;
  - a abertura guarda a frase e os dois erros, e a linha do progresso guarda as quatro frases;
  - o lugar do botão guarda os 28 "Continuar de onde parou", o "Começar" e o "Ver as trilhas", e a frase de cada trilha guarda as três;
  - a linha do nome guarda uma linha de altura e, abaixo de 40rem, duas, porque ali "Você entrou como" e um nome completo quebram;
  - os azulejos só mudam de cor.

  Medido no Edge, num navegador que acabou de entrar e ainda não tem a cópia da conta, com o `/contas/me` atrasado em 4 s e a leitura do progresso em 7 s, a 320, 360, 768, 1024, 1366 e 1920 px: com o nome "Maria Fictícia de Exemplo", a saudação, o fio do pé, o lugar do botão, as trilhas, "Sua conta" e o rodapé ficam no mesmo lugar quando a conta responde e quando a leitura chega, e o `layout-shift` fica em zero. A linha do nome é o limite. Na revisão da #258, com a letra a 100%, o texto de baixo dela desceu 50 px a 320 px com um nome completo de 70 letras e 151 px com um primeiro nome de 100 letras (101 px a 1024 px); com "Sua conta" na tela, o Edge contou esse deslocamento no `layout-shift`. Com a letra a 200%, no celular, um nome completo de mais de duas linhas também empurra o texto de baixo dele. O deslocamento fica no fim da página, depois do quadro. A Atena decidiu manter a reserva assim em 21/11/2026, na #258: guardar mais linhas deixaria um vão para todo mundo, e cortar o nome tiraria da página o que ela tem de pessoal. O link da administradora e o erro de sair não guardam lugar, como as linhas do piloto: o link fica no fim e só empurra o rodapé, e o erro vem depois do clique, embaixo das ações.

### Telas da conta
- **Endereços:** `/login`, `/cadastro`, `/cadastro/confirmar`, `/cadastro/reenvio`, `/cadastro/recuperar`, `/cadastro/redefinir` e `/cadastro/excluir`, com o `noindex`, o `no-store` e o `no-referrer`. As sete saem de um componente só (`components/formulario-conta.tsx`), no cartaz das páginas de dentro (`components/cartaz-da-conta.tsx`). Na #266, o Renan pediu as sete no desenho do perfil e escolheu, em 21/11/2026, a opção recomendada em cada pergunta: no computador, o formulário no pé do cartaz; no celular, tudo direto no papel; ao lado do formulário do cadastro, o que a conta guarda; os textos da tabela abaixo; e o "·" no título da aba. As outras duas direções, a ficha na parede e o cartaz curto com a folha embaixo, ficaram de fora.
- **O cartaz:** o painel de azulejos, com a mesma semente nas sete telas (`sementeDe("conta")`), o título gigante apoiado no fio e o pé. A partir de 62rem, o painel ocupa os 30% da direita e cresce com o cartaz, e o pé tem duas colunas: à esquerda, o lado, com a abertura em Literata e, no cadastro, o que a conta guarda; à direita, a ação, a coluna mais larga, com o formulário, a linha das mensagens e os links. Abaixo de 62rem, o painel vira as duas fileiras do alto, e o pé fica numa coluna, na ordem do HTML: a abertura, o que a conta guarda, o formulário, a linha das mensagens e os links. Na conclusão, o lado sai e a ação toma o pé inteiro.
- **O título** tem o teto da palavra mais larga de todos os títulos que a tela pode mostrar, e não só do da vez: na redefinição, ALTERADA, do título da conclusão, é mais larga que DEFINIR, e o título muda sem mudar de letra. Os títulos que a tela pode mostrar ficam guardados, invisíveis e fora do leitor de tela, na mesma célula (as `Reservas`), e o da vez fica embaixo, junto do fio, como na página de sair da newsletter: o pé não desce quando o título muda.
- **Os textos:**

  | Tela | Título | Abertura | Título na conclusão |
  | --- | --- | --- | --- |
  | `/login` | Entrar | A sua conta guarda os artigos que você leu. Comece uma trilha no celular e continue no computador, de onde parou. | não tem: a tela vai para o `/perfil` |
  | `/cadastro` | Criar conta | A conta é opcional. Com ela, os artigos que você leu ficam guardados. | Confira o e-mail |
  | `/cadastro/confirmar` | Confirmar e-mail | Falta um passo: confirme o seu e-mail para ativar a conta. | E-mail confirmado |
  | `/cadastro/reenvio` | Reenviar confirmação | Escreva o e-mail do cadastro para receber outro link de confirmação. | Confira o e-mail |
  | `/cadastro/recuperar` | Recuperar senha | Escreva o e-mail da conta para receber um link e criar uma senha nova. | Confira o e-mail |
  | `/cadastro/redefinir` | Definir nova senha | Escolha a senha nova. Depois, entre de novo em cada aparelho. | Senha alterada |
  | `/cadastro/excluir` | Excluir conta | A exclusão é permanente. Sua conta e o progresso associado serão apagados. Sua inscrição na newsletter é independente. | Conta excluída |

  O botão de cada formulário leva o título da tela, com a seta. Os nomes dos campos, as mensagens de erro, as frases de conclusão e o aviso do spam (#259) são os de antes.
- **O que a conta guarda** (só no cadastro): o rótulo "O que a conta guarda", em Label; o texto "O seu nome, o seu e-mail, um código da sua senha (nunca a senha), os dados opcionais que você escolher dar e os artigos que você ler. As respostas dos quizzes ficam só no seu navegador, e a newsletter é uma inscrição à parte.", em Literata e tinta suave, com as palavras do perfil; e "Ler o termo da conta" (`/termo#o-que-guarda`), que abre em outra aba, para o formulário preenchido não se perder. O link leva a seta para cima, desenhada, e "(abre em outra aba)" para o leitor de tela.
- **O formulário:** os campos do site, com o rótulo em Label em cima (veja "Campo"), um embaixo do outro, até 32rem, e o botão na largura do formulário. No cadastro, os campos opcionais (gênero, estado e nascimento) ficam entre dois fios de tinta, com a legenda "Campos opcionais", em Label, e "Essas informações ajudam a entender quem usa o Mandatômetro.". As caixas do aceite e da newsletter são as do painel de revisão (`.marcar`): a caixa tem 22 px, e a linha do rótulo, com pelo menos 44 px, recebe o toque. O link do termo, na caixa do aceite, leva ao endereço que a API devolve, em outra aba.
- **A linha das mensagens**, embaixo do botão, é a região `role="status"`, que nunca sai da página, com o `aria-busy` só na conclusão do cadastro enquanto a newsletter responde. Ela guarda o lugar do "Aguarde…", em Label e tinta suave, que aparece em todo envio sem mexer em nada. O leitor de tela recebe a região livre para anunciar essa espera. O erro, em negrito e sem cor (`.ainda-nao`, como o "Ainda não deu"), entra no mesmo lugar.
  - **A partir de 62rem**, a linha guarda também a altura do erro mais longo, até duas linhas. O motivo é o cartaz, que prende o título embaixo (o `margin-top: auto` do h1, com a altura mínima). Numa tela curta, como o login, o que crescesse no pé subiria o título, o formulário e o botão, que está embaixo do ponteiro. Antes da reserva, a 1366 × 768, o erro da rede subia tudo 7 px, e o link que a entrada recusada traz subiria mais 47 px.
  - **No celular**, o cartaz não tem altura mínima, e só o "Aguarde…" fica guardado: o erro empurra só os links de baixo. Guardar ali as três linhas do erro mais longo deixaria um vão grande entre o botão e os links.
- **Os links entre as telas** são ações em texto, embaixo da linha das mensagens, um embaixo do outro, a 1,75rem de distância. A área de toque de cada um tem pelo menos 44 px de altura, com 15 px acima e abaixo da letra. Entre uma área e a outra sobram 7 px, e 13 px a 320 px com a letra a 200%. São links comuns, que funcionam sem JavaScript.
- **O link do reenvio no login** vem no HTML, guardado e invisível (`aria-hidden` e `inert`). A partir de 62rem, ele já ocupa o lugar e aparece depois da entrada recusada sem mexer no formulário. No celular, ele entra embaixo dos outros.

  | Tela | Antes da conclusão | Na conclusão |
  | --- | --- | --- |
  | `/login` | "Esqueci minha senha" (`/cadastro/recuperar`), "Criar conta" (`/cadastro`) e, depois de uma entrada recusada, "Solicitar outro e-mail de confirmação" (`/cadastro/reenvio`) | não tem |
  | `/cadastro` | "Entrar na conta" (`/login`) | "Solicitar outro e-mail de confirmação" e "Entrar na conta" |
  | `/cadastro/confirmar` | "Solicitar outro e-mail de confirmação" | "Entrar na conta" |
  | `/cadastro/reenvio` e `/cadastro/recuperar` | "Entrar na conta" | "Entrar na conta" |
  | `/cadastro/redefinir` | "Solicitar outro link" (`/cadastro/recuperar`) | "Entrar na conta" |
  | `/cadastro/excluir` | "Voltar ao perfil" (`/perfil`) | "Ir para o início" (`/`) |

- **O segundo clique de um clique duplo**, e o terceiro de um clique triplo, não seguem os links da tela (`semSegundoClique`, em `lib/clique.ts`): na conclusão, o formulário sai, e um link pode nascer embaixo do ponteiro que clicou no botão. Um clique novo, de propósito, segue o link.
- **Os estados:**
  - **Enviando:** "Aguarde…" na linha das mensagens, os campos só de leitura e o botão com o `aria-disabled` e o foco (veja "Botão"). Um segundo envio não sai. Os campos de texto e a data usam `readOnly`. As listas e as duas caixas do cadastro usam `aria-disabled` e bloqueiam as interações que mudariam o valor, com a aparência da peça e o Tab preservados.
  - **Erro de campo:** a mensagem embaixo do campo, com o fio vermelho de 5 px por dentro, à esquerda, e o foco no primeiro campo com erro, ligado à mensagem pelo `aria-describedby`. O campo já leva `aria-invalid` e `aria-describedby` quando recebe o foco.
  - **Erro da API:** a frase de antes, na linha das mensagens: "Muitas tentativas. Aguarde um minuto.", "Confira o e-mail, a senha e a confirmação do cadastro.", "Entre novamente e confira sua senha.", "O link expirou ou é inválido. Solicite outro abaixo.", "O termo mudou. Recarregue a página para ler a versão atual." ou "Não foi possível concluir. Confira os dados e tente novamente.". O botão volta, com o foco, e no computador nada sai do lugar.
  - **Sem rede:** "Confira sua conexão e tente novamente.", no mesmo lugar. O cliente gerado da API devolve a falha da rede e o fim do prazo de 20 s sem lançar, e, até a #266, a tela mostrava "Não foi possível concluir. Confira os dados e tente novamente." nesses casos.
  - **Conclusão:** o formulário sai, o título muda e recebe o foco, sem o anel, e a linha das mensagens lê a frase de conclusão, na letra da abertura. Os links da conclusão ficam embaixo dela.
  - **Login:** o formulário vem no HTML do servidor, invisível e inerte, na mesma célula de "Verificando sua sessão…", e aparece no lugar dela quando a conta responde que a pessoa não entrou: nada se mexe. Quem já entrou vai para o `/perfil`. Sem resposta da conta, aparece "Não foi possível consultar sua conta." e "Tentar novamente" (`/login`).
  - **Sem a API** (o build sem o `API_URL`): "A conta ainda não funciona neste endereço do site." e o botão "Ver as trilhas", sem formulário, sem links entre as telas e sem pedido à API, nem o do termo.
  - **Sem JavaScript:** o formulário, a espera do login e a linha das mensagens saem pelo `@media (scripting: none)` do `estilos/conta.css`, com o display no CSS da peça (veja `docs/codigo-do-site.md`), e o `<noscript>` diz "A conta precisa do JavaScript do navegador ligado.". Os links entre as telas continuam.
- **Título da aba:** "‹título› · Mandatômetro", como "Entrar · Mandatômetro". O perfil também usa o "·"; o painel continua com o "|".

### Painel de revisão
- **Endereço e acesso:** `/painel`, só para a conta administradora (a #207). A entrada é o link "Revisar a edição da semana", uma ação em texto no `/perfil` que só ela vê. Sem sessão, o site leva ao `/login`. A conta comum, e a que perdeu o papel, veem "Página não encontrada". Na primeira visita e depois de um `401` ou `404` da API do painel, o conteúdo principal mostra só "Verificando sua sessão…" enquanto a guarda responde. O rascunho e a folha do painel saem da tela durante a conferência. O HTML do servidor também traz só a frase de conferência no conteúdo principal. A página não entra no sitemap, na busca nem no cabeçalho, e leva `noindex` e `no-store`.
- **A folha:** a da página da edição, sem o azulejo do canto, porque é uma tela de trabalho. A cor fica nos números das fitas, e o resto é tinta e papel. No alto vêm:
  - a migalha "Conta", para o `/perfil`;
  - o título "Revisão da edição", menor que o da edição (2.25rem a 4rem), com o teto medido pela folha;
  - a faixa com o período, a contagem de itens e "Rascunho";
  - o lide "Confira cada item com o texto oficial, ajuste o texto e salve. Quando nada faltar, publique a edição."
- **A edição:** depois de um fio de 6 px, "A edição", em Label e tinta suave, e mais duas peças:
  - o campo "Título da edição", de até 180 caracteres;
  - a caixa "Confirmo a cobertura da semana", com a dica "Marque depois de conferir, nos resumos das coletas, que as votações e os atos da semana chegaram. Uma coleta que falhou deixa a edição incompleta."
- **"Itens da edição":** o desenho de "Nesta edição", com o número na fita, o título e, embaixo, o estado de cada item. No fim vem "Para publicar", em Label e tinta suave, com o que falta, curto: "falta confirmar a revisão de 2 itens.", "salve as alterações." ou "nada falta.". O lugar segue o de "Nesta edição": abaixo de 1200 px, dentro da folha, depois da edição; daí para cima, na coluna ao lado, fixa ao rolar. As votações vêm antes dos atos, como na folha.
- **As seções** "O que o Congresso votou" e "O que saiu no Diário Oficial" são as da edição. O número de cada ficha é a posição do item no arquivo da revisão, o mesmo das mensagens "Item 3" da API. Por isso, a numeração pode pular de uma seção para a outra.
- **A ficha de cada item** é uma `section` com um fio de tinta em cima. Ela traz, nesta ordem:
  - **O número e o estado:** o número na fita da posição, de 2.75rem a 3.5rem. Pendurado no fio, à direita, vai o estado, em Label. "Revisado" leva só o fio de 2 px. Os estados que pedem alguma coisa vão no retângulo de tinta: "Falta escrever", "Falta a privacidade", "Falta revisar", "Falta o artigo", "Por salvar" e "Sai da edição".
  - **O título** como vai sair na edição, de 1.625rem a 2.5rem, com no máximo 14 em e o teto calculado.
  - **Os avisos:** cada um num quadro com fio de 2 px e 6 px do lado esquerdo, com "Aviso" em Label.
  - **Os textos oficiais,** à vista, antes dos campos. Na votação, vêm a proposição (a sigla em Archivo 800 e a ementa em Literata), o quadro de cada votação e as fontes, com o trecho. O quadro traz a casa e a descrição oficial da votação embaixo da data. No ato, vêm "Publicado no Diário Oficial em 13 de novembro de 2026." e a fonte oficial. Os links das fontes do painel abrem em outra aba e incluem "abre em outra aba" no nome lido pelo leitor de tela.
  - **A privacidade:** no ato que o filtro de pessoal reteve, o quadro de fio grosso "Privacidade do ato". Ele diz o motivo da retenção em palavras e "Confira no texto oficial se ele trata de uma pessoa. Se tratar, tire o item da edição.", com a caixa "Conferi a privacidade, e o ato fica na edição".
  - **Os campos,** depois de um fio e de "Texto da edição", em Label e tinta suave:
    - "Título", de até 180 caracteres;
    - "Explicação", em Literata, como o texto publicado. A caixa cresce com o texto onde o navegador aplica `field-sizing`. Nos outros, tem 8 linhas e o puxador. A altura máxima deixa o campo caber com o contorno no espaço visível da tela. Embaixo vem "3 parágrafos de até 12. Separe os parágrafos com uma linha em branco.", e a contagem passa para tinta e negrito acima de 12;
    - "Artigo da trilha", uma lista com "Sem artigo" e os artigos do catálogo;
    - "Confirmo o artigo: O projeto passa pelas comissões", por exemplo. A caixa aparece quando há um artigo escolhido e o nome inteiro quebra em várias linhas quando precisa;
    - "Confirmo a revisão deste item".
  - **Tirar o item:** "Tirar este item da edição" abre o campo "Motivo" e a dica "Ao salvar, o item sai deste rascunho e não volta pela tela." Com a caixa marcada, o título fica riscado em tinta suave. Os campos saem de vista e ficam guardados até o salvar.
- **As caixas de marcar:** as do navegador, de 22 px, na cor da tinta (`accent-color`), com a frase ao lado em Archivo 650. A linha inteira é a área do toque, com pelo menos 44 px de altura.
- **O pé da revisão:** a frase do estado e os botões "Salvar a revisão" e, vazado, "Publicar a edição", depois de um fio de tinta de borda a borda da folha.
  - **Onde fica:** com a tela de 40rem de altura ou mais, preso embaixo enquanto a pessoa rola, como o pé do quiz. A reserva de rolagem acompanha a altura medida do pé quando a frase ou a largura muda. O campo, link ou aviso focado na folha fica inteiro acima do pé, com o contorno. A frase e os botões do próprio pé ficam inteiros quando recebem o foco. Abaixo de 40rem de altura, como com a letra a 200%, o pé fica no fim da folha.
  - **Os botões:** abaixo de 40rem de largura, dividem a linha, a 0.875rem; abaixo de 20rem, ficam um embaixo do outro. "Publicar a edição" fica desligado (`aria-disabled`) até a edição ficar pronta, e a frase do pé é a descrição dele.
  - **A frase,** pela ordem: "Salvando a revisão…" ou "Publicando a edição…"; a falha do último envio, em negrito; o rascunho que mudou; "Você tem alterações por salvar."; e o que falta para publicar. Exemplos do último: "Revisão salva. Para publicar, falta confirmar a revisão de 2 itens e confirmar a cobertura da semana." e "A edição está pronta para publicar.".
- **Os erros:**
  - **No campo:** o fio vermelho de 5 px por dentro, à esquerda, e o `aria-invalid`. Na conferência antes de enviar, o foco vai para o campo, inclusive a caixa de privacidade. A mensagem abaixo dele é ligada pelo `aria-describedby`.
  - **No pé:** onde olhar, como "A revisão não foi salva. Veja o aviso no item 4." ou "…no título da edição".
  - **A conferência antes de enviar:** título ou explicação vazios, mais de 12 parágrafos, item tirado sem motivo e ato retido sem decisão. Assim a pessoa não esbarra nas mensagens da API, que usam os nomes de campo do CLI.
  - **A recusa da API (422)** leva o foco à mensagem na ficha ou no título da edição, pelo "Item N" e pelo "Edição:" da mensagem.
  - **O 503, o 413, o 500 e a falta de conexão** ficam no pé, com o foco, e as alterações ficam na tela. O 503 diz "Há outra gravação em andamento. Tente de novo.".
- **O rascunho que mudou (409)** passa por uma releitura. Na mesma edição, a tela aplica os campos alterados que cabem na versão atual. O aviso no pé quantifica os itens alterados que saíram da edição e os atos que deixaram de pedir uma confirmação de privacidade que a pessoa tinha alterado. Quando tudo cabe, a tela diz "O rascunho mudou enquanto você revisava. Carregamos a versão atual e mantivemos o que você alterou. Confira e salve de novo.". Se a edição foi publicada ou trocada, ela diz "Esta edição foi publicada ou trocada enquanto você revisava." e "O que não foi salvo ficou de fora.", com o botão "Carregar o rascunho atual".
- **As folhas por cima:** "Publicar a edição?" e "Sair sem salvar?".
  - **A forma:** o `<dialog>` da busca, aberto com `showModal()`. A folha é clara, com fio de tinta de 2 px e até 34rem de largura, no meio da tela, sobre o véu de tinta a 72%. O título vai em Subtitle (1.625rem a 2.5rem), e o texto, em Literata.
  - **Os botões:** o cheio confirma ("Publicar agora" ou "Sair sem salvar"), e o vazado volta ("Voltar à revisão" ou "Continuar a revisão") e recebe o foco. O Esc também volta, e o foco retorna a quem o tinha.
  - **O movimento:** a folha entra como a da busca. Com o movimento reduzido, aparece no lugar.
  - **Publicar:** "A edição fica pública no site na hora e não volta a ser rascunho. Os inscritos a recebem por e-mail no envio de domingo, às 10h37. Publicada depois desse horário, ela só vai por e-mail num envio feito à mão."
  - **Sair:** "As alterações desta revisão ainda não foram salvas. Se você sair, elas se perdem." A folha aparece num link do site com alterações por salvar. Ao fechar ou recarregar a aba, e nos links que carregam a página do zero, como os do cabeçalho, quem avisa é o navegador.
- **Os outros estados** ficam embaixo do título:
  - "Carregando o rascunho da semana…", em Label e tinta suave;
  - "Não há rascunho para revisar.", com "A agenda de sábado prepara o rascunho com as votações e os atos da semana. Quando ele chegar, aparece aqui." e o botão "Ver as edições publicadas";
  - "O rascunho não carregou.", com a mensagem e "Tentar de novo";
  - "Edição publicada." (ou "Esta edição já estava publicada."), com "Ela já está no site e vai por e-mail aos inscritos no envio de domingo." e o botão "Ver a edição publicada". O foco vai para a frase;
  - sem o `API_URL`, "O painel de revisão não funciona neste endereço do site.".
- **O rascunho fica na página,** só na memória dela. Nada dele vai para o console, o endereço (só o `#item-3` do índice), o armazenamento do navegador ou o router. Quando a sessão cai ou o papel sai, o rascunho sai da tela na hora.
- **Leitor de tela:** o título de cada ficha começa com "Item 3:", só para o leitor de tela, e a ficha é uma região com esse nome. O começo de cada envio e o salvar que deu certo chegam pela região `role="status"` (`useAviso`).
- **As escolhas do Renan,** em 19 e 20/11/2026, na #209:
  - a folha única com o índice;
  - os textos oficiais à vista;
  - a explicação num campo só;
  - o `/login` e a 404 na guarda;
  - o link no `/perfil` só para a administradora;
  - a ordem dos itens fora da tela;
  - a folha por cima para publicar, com o foco em "Voltar à revisão";
  - o aviso ao sair, sem nada guardado no navegador.
- **Fora da tela:** gerar ou refazer o rascunho, o envio, o histórico e a ordem dos itens continuam no CLI (`docs/newsletter.md`).

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
- **Na rolagem:** as seções sobem e aparecem quando entram na tela (`.revelar`), a barra de leitura enche, e as barras do patrimônio declarado se riscam da esquerda, com a animação da tira (`risca`), até o alto delas subir 7rem. Todas usam a animação de rolagem do CSS, dentro de `@supports`: sem ela, e sem JavaScript, a peça já está no lugar. Nada fica escondido à espera de um script. A seção termina de aparecer quando o alto dela sobe 7rem na tela, e não numa fração da altura dela: só a faixa de baixo da tela mostra a peça entrando, e o texto parado mais acima nunca fica apagado. O que um link da própria página alcança não sobe, como os itens da edição, que o índice "Nesta edição" alcança: o navegador calcularia o lugar com a peça ainda deslocada, e o item pararia 28 px acima do alto da tela.
- **O mapa do fundo** anda mais devagar que a página: sobe um décimo do que ela rola, até 60vh, nas seis primeiras telas de rolagem, e depois fica parado (`mapa-anda`, com `animation-timeline: scroll()` e `animation-range: 0 600vh`, dentro de `@supports`). O trecho é um comprimento fixo, e não o progresso da página inteira: ele só se mexe quando a pessoa rola, e não salta quando a página muda de altura com ela parada, como ao abrir um passo do caminho. Parado, o fundo está parado. Sem a animação de rolagem, o mapa fica fixo atrás da página. O décimo vale em todas as páginas: antes, a velocidade dependia do comprimento da página, e, nos artigos, o mapa agora anda o dobro no celular e uma vez e meia no computador; no quiz e no 404, que são curtos, anda bem menos. O Renan decidiu manter assim em 14/11/2026, na #101: "Manter como está".
- **Com o ponteiro:** o azulejo vira; a folha sobe; o azulejo da folha dá um quarto de volta, e o da trilha, na lista das trilhas, vira peça por peça; o botão sobe e mostra a tira; o traço do link do cabeçalho se risca.
- **Na ação:** os azulejos do passo a passo viram em fila até o passo da vez, o texto do passo entra de lado (da direita ao avançar, da esquerda ao voltar), com a seção cortando o que passa da borda da tela, para a página não rolar de lado, e o número tomba; o azulejo do lido vira para o verde, e o visto se desenha. No quiz, as opções tombam no lugar, uma a uma; depois da resposta, viram com o estado, a folha da resposta tomba, presa pela borda de cima, e os azulejos já acesos do mosaico fazem a onda; no fim, o mosaico inteiro faz a onda. A tela que sai sobe um pouco e some (0,4 s) antes de a seguinte entrar.
- **Na busca:** a folha sobe 0,75rem e aparece em 200 ms, na curva suave, e o véu esmaece junto. Os resultados não animam. As folhas por cima do painel de revisão ("Publicar a edição?" e "Sair sem salvar?") entram do mesmo jeito.
- **Cada animação parte de um estado de saída e chega ao estado normal da peça:** onde a animação não roda, a peça aparece pronta.

### A troca de página
- **O gesto:** a página nova aparece azulejo por azulejo, num giro de relógio em cada peça, por cima da página de antes, que fica parada. Dura 0,6 s. Ao voltar, o giro é ao contrário.
- **O sentido** vem do lugar da página no site, e não da ordem da visita (`lib/troca-de-pagina.ts`): a página inicial em cima, depois Trilhas, cada trilha e os artigos dela, na ordem da trilha, com o quiz no lugar dele, logo depois do artigo que o chama, e o quiz final depois do último artigo. A página do piloto fica ao lado da lista das trilhas, e a lista das edições também, com cada edição embaixo dela, como uma trilha. Ir mais para dentro, ou para um artigo mais adiante, é avançar; o contrário é voltar, também pelo botão voltar do navegador. Do quiz para o "Artigo anterior" é voltar. Da edição para a lista das edições é voltar, e de uma edição para outra é avançar, como entre duas trilhas. A lista dos parlamentares fica ao lado da lista das edições, com cada parlamentar embaixo dela, e a página de uma votação fica mais para dentro que uma edição e que um parlamentar: da edição ou da pessoa para a votação é avançar.
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
- **Do** dar a cada trilha e a cada passo do caminho o símbolo do assunto: um prédio ou um objeto das instituições, chapado, numa cor só, que se leia a 40 px.
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
- **Don't** pintar o placar de uma votação: o Sim não é verde, e o Não não é vermelho. O placar fica em tinta. O mesmo vale para o plenário, o placar por partido, o carimbo do voto de cada pessoa e as barras do patrimônio declarado, sem cor de ganho nem de perda.
- **Don't** trazer uma biblioteca de animação nem imagem para os azulejos: o movimento é do navegador, e o desenho, do CSS e dos caminhos de SVG escritos no código.
- **Don't** pôr símbolo de partido, pessoa ou rosto nos azulejos, nem escolher a cor deles pelo assunto: o símbolo diz o assunto, e a cor é a da posição.
- **Don't** esconder conteúdo à espera de um script: o que anima na entrada já está no HTML, no lugar.
- **Don't** pôr ícone girando ou barra no carregando: ele diz em palavras que a página está a caminho, e nada nele se mexe.
- **Don't** marcar o lido com um X: ele lê como "errado" ou "cancelado", ainda mais num site com quiz.
- **Don't** prender um tamanho de letra só à largura da tela (`vw` puro): a letra para de crescer com a configuração do navegador.
- **Don't** pôr hífen automático (`hyphens`): a palavra só se parte, sem hífen, quando não cabe sozinha na linha.
- **Don't** deixar uma coluna de texto ao lado de outra com `1fr` puro: com a letra grande, ela cresce até a palavra mais comprida e alarga a página. Use `minmax(0, 1fr)`.
- **Don't** pôr grade ou flex num `<p>`. No site, o Chromium perdeu esse parágrafo quando o CSS chegou (#152). A grade das `Reservas` fica em volta da frase. No andamento do quiz, o parágrafo só entra quando há texto. As reservas mantêm a altura quando ele sai (#174).
