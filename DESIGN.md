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
    lineHeight: 0.86
    fontVariation: "'wdth' 62"
  title:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 900
    lineHeight: 0.92
    fontVariation: "'wdth' 62"
  subtitle:
    fontFamily: "Archivo Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 900
    lineHeight: 0.95
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

**A Regra da Fita pela Ordem.** Cada artigo, cada trilha da lista e cada passo ganham a fita pela posição: 1 verde, 2 amarela, 3 azul, 4 rosa, 5 vermelha, e depois recomeça (`fitaDaPosicao` e `classeDaFita`, em `lib/formatar.ts`). Ninguém escolhe fita por assunto, partido ou humor.

**A Regra de Uma Fita por Azulejo.** Cada azulejo leva uma fita só, com tinta ou papel, e nunca duas fitas juntas. As cinco aparecem juntas em todo painel: o sorteio garante as cinco no começo dele, que é o que o celular mostra (`lib/azulejos.ts`, com teste).

**A Regra do Domingo em Aberto.** O vermelho de domingo das edições ainda não foi decidido (issue #39). Até lá, a vermelha é só a quinta fita, não marca dia nenhum.

## Typography

**Display Font:** Archivo Variable, eixo de largura (com ui-sans-serif, system-ui)
**Body Font:** Literata Variable, eixo de tamanho óptico, com itálico (com ui-serif, Georgia)
**Accent Font:** Courier Prime 400, letra de máquina de escrever (com Courier New, ui-monospace)

As três são servidas pelo próprio site, pelo `@fontsource`, com `font-display: swap`: o texto aparece na letra reserva e troca de letra quando a fonte chega. Os arquivos latinos da Archivo e da Literata são pré-carregados no `<head>` de todas as páginas, e o navegador os pede junto com o CSS. Numa rede boa, eles chegam antes de o texto aparecer, que já sai na letra certa; numa rede lenta, chegam depois, e o texto ainda pula na troca. A Courier Prime é baixada em todas as páginas, porque o lema está no rodapé de todas. O pré-carregamento dela só vale onde ela aparece na primeira tela: a partir de 864 px, por causa do lema no cabeçalho, e, abaixo disso, só na página inicial, para a frase do título. Nas outras páginas, no celular, o navegador a pede pelo CSS, para o rodapé.

A Courier Prime entrou na #89 só para a frase do cartaz e o lema: `@fontsource/courier-prime`, licença SIL OFL 1.1, 19 kB. É a única dependência nova da direção. Ela tomou o lugar da Instrument Serif itálica (22 kB), que o Renan achou com "muito cara de IA": em 13/11/2026, ele escolheu a letra de máquina num rascunho com cinco letras.

**Character:** a Archivo, bem preta e apertada, grita como cartaz de rua; a Courier Prime responde baixo, batida à máquina, como uma linha de diário oficial; a Literata, calma, faz o professor paciente falar.

### Hierarchy
- **Numeral** (900, largura 62%, altura de linha 0.78): o número da folha, na cor da fita da posição, com contorno de tinta, pintado antes do miolo: `max(3px, 0.05em)` nos grandes e 2 px nos pequenos (o da aba do passo a passo, o de "Nesta trilha", o das faixas do anterior e do próximo e o das miniaturas). O do artigo lido tem o miolo em Papel 2 e o contorno em tinta suave. Na folha da trilha, de 5.5rem a 11.5rem; no passo da página inicial, 7rem no celular e até 17rem; no alto do artigo, de 5rem a 9rem; no 404, de 7rem a 17rem; em "Nesta trilha" e nas faixas do anterior e do próximo, 2.75rem; nas miniaturas, 1.75rem.
- **Headline** (`titulo-condensado`: 900, largura 62%, altura 0.86, maiúsculas): o título da página. Na página inicial, de 3.25rem a 8rem; nas páginas de dentro (a trilha, Trilhas, o 404 e a de erro), de 3.5rem a 11rem; no artigo, de 2.75rem a 6rem, com no máximo 10 em de largura. Também "O caminho de um projeto de lei" na página inicial (2.75rem a 6.5rem), o título de cada passo dela (2.25rem a 3.75rem) e "Quiz da trilha" na chamada (2.5rem a 5.5rem). No quiz, "Quiz da trilha" na abertura (4rem a 12.5rem), o título do fim (3.25rem a 7.5rem) e o resultado da resposta (2.25rem a 3.5rem).
- **Enunciado** (Archivo 800, largura 72%, altura 1.02, em minúsculas): a pergunta do quiz, de 1.75rem a 2.75rem, e 1.375rem abaixo de 22rem. É o único título em minúsculas: lê-se como frase.
- **Title** (`titulo-de-folha`: 900, largura 62%, altura 0.92, maiúsculas): o título de cada folha de uma lista. O do artigo na trilha, de 1.875rem a 3.5rem; o da trilha em Trilhas, de 2.25rem a 4.5rem; o do anterior e do próximo, de 1.5rem a 2.5rem.
- **Subtitle** (`subtitulo-condensado`: 900, largura 68%, altura 0.95, maiúsculas): os intertítulos do texto (1.75rem a 2.5rem), "Fontes oficiais" (1.5rem) e o título do caminho na trilha (1.875rem a 2.75rem).
- **Wordmark** (900, largura 68%, maiúsculas, 0.01em entre as letras): o nome Mandatômetro. No cabeçalho, 1.625rem (1.3125rem abaixo de 480 px); no rodapé, de 2.25rem a 4.5rem. É texto, não logo.
- **Máquina** (Courier Prime 400, em minúsculas): a segunda linha do título da página inicial ("um passo de cada vez.", a 0.4 em do título, com a tira riscada embaixo) e o lema, a 0.9375rem, no cabeçalho e no rodapé. Só isso.
- **Lead** (Literata 500, altura 1.45): o resumo do artigo, de 1.25rem a 1.4375rem. A abertura dos cartazes é Literata 400, de 1.0625rem a 1.25rem, com altura 1.5 e até 34rem de largura.
- **Body** (Literata 400, altura 1.68): o texto do artigo, de 1.0625rem a 1.1875rem, com até 39rem de largura. Os resumos das folhas e os textos dos passos ficam em 1.0625rem, com altura 1.5 a 1.6.
- **Label** (`rotulo`: Archivo 650, 0.8125rem, maiúsculas, 0.08em entre as letras): a faixa de informações, a frase do progresso, a migalha, "Artigo 2 de 6 artigos", a etiqueta de estado. Os nomes dos links e das ações seguem a mesma ideia, um pouco maiores: o botão (800, 1rem), a ação em texto (700, 0.875rem), os links dos artigos de um passo (750, 0.9375rem).

### O teto da letra grande
Com a letra do navegador grande, no celular, o título cresce com a letra até a palavra mais comprida dele encostar nas margens, e para aí. O tamanho é `min(o tamanho normal, (100vw − as margens − o recuo) ÷ a largura da palavra)`: a classe `letra-com-teto`, com o tamanho no `--letra`, a largura da palavra no `--palavra` (em em) e o recuo no `--recuo`. O Renan escolheu o teto em 11/11/2026 ("Teto (Recomendado)") e, na #76, o teto pela palavra mais larga do conteúdo ("Teto menor (Recomendado)"): o título diminui só o bastante para a palavra caber inteira, e nada se parte.

- **A largura da palavra** é a dela em maiúsculas, como aparece na tela, com 0,5% de folga. Os tetos de hoje:

| Título | A palavra mais larga | `--palavra` |
| --- | --- | --- |
| Página inicial | BRASILEIRA, | 4.72 |
| Trilha, e a trilha em Trilhas | CONSTITUIÇÃO | 5.66 |
| Artigo, folha da trilha, anterior e próximo | FUNDAMENTAIS? | 6.34 |
| Intertítulo do texto (largura 68%) | CONSTITUCIONALIDADE | 9.64 |
| O caminho, na página inicial | CAMINHO | 3.62 |
| Passo da página inicial | APRESENTAÇÃO | 6.07 |
| Trilhas | TRILHAS | 3.21 |
| Quiz da trilha | TRILHA | 2.74 |
| O fim do quiz | RECOMEÇOU | 4.8 |
| O resultado da resposta, no quiz | ACERTOU. | 3.79 |
| Página não encontrada | ENCONTRADA | 5.15 |
| A página não carregou | CARREGOU | 4.15 |
| O nome do site (largura 68%) | MANDATÔMETRO | 7.08 |

- **O recuo** é o que fica entre a caixa do título e as margens da página: o respiro e os fios da folha, a coluna do número e a do azulejo. Quando a folha divide a página com uma coluna ao lado (o caminho, na trilha; "Nesta trilha", no artigo), o contêiner diz quanto ela toma no `--recuo-de-fora`, e os títulos de dentro somam.
- **Na lista das trilhas:**
  - de 640 a 1407 px, o recuo do título é o do azulejo ao lado;
  - a partir de 1408 px, o título divide a cabeça com a coluna da descrição, e o recuo soma também os 42rem dela e o vão entre as duas;
  - até uns 1500 px, é o teto que dá o tamanho do título, e ele mede a página pelo `100vw`, que conta a barra de rolagem (15 px no Edge e no Chrome do Windows). Por isso, o recuo da cabeça aberta leva 1rem a mais, e o título cabe na coluna com a barra à vista ou sem ela;
  - quando a coluna da descrição cresce, a do título também passa de 42rem, e o título já parou no tamanho maior: 4,5rem × 5,66 = 25,5rem.
  - O `lib/lista-das-trilhas.test.ts` confere a conta com as medidas do CSS.
- **O aviso a quem escreve:** um teste (`src/lib/conteudo/titulos.test.ts`) soma a largura de cada letra em maiúsculas (`larguras-das-letras.ts`, medida no navegador nos dois estilos) e falha quando uma palavra de um título do conteúdo passa do teto, com o arquivo, a palavra e o que fazer (`docs/conteudo-das-trilhas.md`). Os tetos saem do código, e o teste fica fora do `conferir.ts`: ele não derruba o build nem o deploy.

### Named Rules
**A Regra das Três Letras.** O grotesco estreito para número, título e etiqueta; a serifa para o que se lê de verdade; a letra de máquina só para a frase do cartaz e o lema. Nenhuma quarta família, e a letra de máquina não vira estilo de texto.

**A Regra das Maiúsculas com Medida.** Os títulos grandes vão em maiúsculas sempre, com o teto; a exceção é o enunciado do quiz, que é uma frase. As etiquetas pequenas vão em maiúsculas espaçadas, mas voltam às minúsculas, sem o espaço entre as letras, quando a tela tem menos de 22rem (as variáveis `--caixa-alta` e `--espacado`): em maiúsculas, uma palavra comprida não cabe na linha.

## Layout

A página usa a largura toda da tela, com as margens do `--margem`: 20 px no celular e, a partir de 768 px, de 32 a 72 px, crescendo com a tela. Os títulos têm as linhas equilibradas e os parágrafos evitam palavra sozinha na última linha.

- **Os cartazes** abrem as páginas. A partir de 992 px, o cartaz da página inicial tem pelo menos a altura da primeira tela, e o das páginas de dentro, também, com o limite de 44rem. O título e o pé ficam embaixo, e o que vem antes do título (a migalha), no alto.
- **O painel de azulejos** fica à direita do cartaz, nos 30% da largura, de cima a baixo, a partir de 992 px. Abaixo disso, é uma faixa de duas fileiras no alto, de borda a borda: 6 azulejos por fileira no celular e 10 a partir de 640 px.
- **Página inicial:** o cartaz e, depois de um fio de tinta, o caminho de um projeto de lei, passo a passo. Abaixo de 768 px, o "para quem" vem depois do botão, para o botão caber na primeira tela do celular. O HTML tem o "para quem" duas vezes, e o CSS mostra um de cada vez: o leitor de tela e o Tab seguem a ordem da tela em cada largura, o que o `order` do CSS não faria. O Renan escolheu essa ordem em 10/11/2026.
- **Trilha:** o cartaz e as folhas dos artigos, uma embaixo da outra, e depois a chamada do quiz e o caminho. A partir de 1400 px, o caminho fica numa coluna de 24rem à direita das folhas. A ordem do HTML é a mesma em todas as larguras.
- **Lista das trilhas:** o cartaz e uma folha por trilha.
  - **A partir de 1024 px:** a folha tem a cabeça em cima (o azulejo, o título, a descrição, o rótulo e o progresso) e, embaixo, as folhas dos artigos em colunas que terminam juntas.
  - **A partir de 1408 px:** a cabeça se abre em duas colunas.
  - **Abaixo de 1024 px:** os artigos viram quadradinhos.
  - **Antes da #104:** a lista ficava à direita, numa coluna de 22rem, e nas trilhas de 6 e 8 artigos deixava um vão embaixo da descrição. O Renan pediu, em 13/11/2026, para acabar com esses vãos.
- **Artigo:** a parede de papel com a folha de leitura por cima, até 82rem. A partir de 1200 px, "Nesta trilha" fica numa coluna de 17rem à direita, fixa ao rolar; abaixo disso, vem depois da folha. No celular, a folha fica a 8 px das bordas da tela, com 16 px de respiro por dentro.
- **Quiz:** o palco tem pelo menos a altura da primeira tela, com o andamento no pé, e as faixas do anterior e do próximo vêm embaixo dele. A partir de 992 px, o texto fica à esquerda e o mosaico, à direita; na pergunta, as opções à esquerda e a folha da resposta à direita. Abaixo disso, tudo vai numa coluna, com o mosaico embaixo da migalha.
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
- no quiz, a linha do "Recomeçar o quiz" e o lugar do botão de começar, na abertura, e a frase do andamento, no pé do palco, que guarda a altura da frase mais comprida. O mosaico da abertura vem sempre com cor: não muda quando o navegador descobre as respostas guardadas;
- o lugar do botão de continuar, na trilha.

**O lugar do botão** (`LugarDoBotao`, com o `.lugar-do-botao`): o botão de continuar da trilha muda de texto ("Começar pelo primeiro artigo" vira "Continuar de onde parou: …") e some com a trilha terminada; o do quiz só aparece depois que o JavaScript carrega, como "Começar", "Continuar" ou "Rever as respostas". Cada texto que o botão pode ter vem no HTML do servidor, numa cópia invisível com o desenho do botão, fora do leitor de tela, e todas ficam empilhadas no mesmo lugar: o lugar tem sempre a altura do texto mais alto, na letra e na largura que a tela tiver. No celular, onde o botão fica em cima da lista dos artigos, a lista não pula quando o botão troca de texto ou some.

Na trilha, o botão de continuar vem depois da linha do "Recomeçar a trilha", e não antes: o que fica acima dela não muda com o progresso.

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
- **Forma:** 72 px de altura, com a tira de 6 px. O nome e, a partir de 864 px, o lema em letra de máquina (em Papel 3) à esquerda; Início e Trilhas à direita. Abaixo disso, ficam o nome e os links: o lema, que é largo na letra de máquina, não cabe na linha e está no rodapé. O respiro fica em px, sem crescer com a letra.
- **Navegação:** links em papel, em maiúsculas espaçadas, sem sublinhado, com um traço de 4 px em papel embaixo: ele se risca da esquerda para a direita quando o ponteiro passa e fica na seção aberta. "Trilhas" fica marcado na lista das trilhas, em cada trilha e em cada artigo; o `aria-current="page"` só vai no link da própria página.
- **Foco:** o anel de foco fica amarelo dentro do bloco. O "Pular para o conteúdo" aparece no foco, em tinta sobre papel.
- **Na troca de página,** o cabeçalho fica parado (veja "A troca de página").

### Rodapé
- **Caráter:** papel com um fio de tinta em cima e uma fileira de azulejos embaixo. É o `<footer>` do documento, em todas as páginas, inclusive no 404 e na de erro.
- **Forma:** o nome em Wordmark, grande, sem link, com o lema em letra de máquina embaixo; ao lado (embaixo, até 1024 px), três linhas em Literata, em tinta suave: "O Mandatômetro foi feito para o Hack Brasil 2026, na trilha Acesso à educação.", "Cada explicação traz a fonte oficial: a lei, o regimento ou a página da Câmara e do Senado." e "O código é aberto, no GitHub.".
- **O link do GitHub:** uma ação em texto em linha, na letra do parágrafo, em tinta e negrito. A área de toque tem 12 px em cima e embaixo da letra, menos que o vão entre os parágrafos: um toque na linha de cima não vai para o link.
- **A fileira de azulejos:** 16 azulejos (os 8 primeiros no celular, que já têm as cinco fitas). Ela faz a onda uma vez, quando entra na tela.

### Botão
- **Forma:** bloco reto de tinta, texto em papel, em maiúsculas espaçadas (800, 1rem), com pelo menos 52 px de altura e a seta à direita. O vazado, com o fundo transparente e o texto em tinta, acompanha o principal ("Voltar", no passo a passo, e "Rever as respostas", no fim do quiz).
- **Hover:** o botão sobe 3 px, a tira das cinco fitas aparece embaixo dele, e a seta anda um pouco para a frente.
- **Com a letra grande:** quando a tela tem menos de 20rem (a 360 px, com a letra acima de 18 px), a seta vem logo depois da última palavra, e o respiro dos lados fica em 18 px, que não cresce com a letra. Entre a palavra e a seta vai um espaço, e não uma margem: quando a seta desce sozinha, começa alinhada com o texto. Uma palavra maior que a linha se parte sem hífen (`overflow-wrap: anywhere`). O Renan escolheu, na #76, em 11/11/2026: "Seta no fim, respiro fixo (Recomendado)".
- **Desligado:** fica apagado (35%), sem subir e sem a tira.
- **Alto contraste:** nas cores forçadas do Windows, o fundo some e a borda aparece na cor do texto: o botão continua com cara de botão.
- **Onde:** é a única ação em bloco das páginas (`BOTAO_CONTINUAR`): na página inicial, na trilha, na chamada do quiz, no quiz, no passo a passo, no 404 e na página de erro. Os outros links e ações são sublinhados.

### Links
- Sublinhado de 2 px, afastado 0,2 em do texto, em tinta. Títulos que são links ficam sem sublinhado.
- **Foco:** contorno de 3 px no azul do foco, afastado 3 px. Na folha de uma lista, o contorno vai na folha inteira.
- **Depois de uma navegação:** o foco vai para o h1 da página nova ou, quando o endereço aponta para um trecho do conteúdo (`#caminho`, `#passo-plenario`), para esse trecho, já na tela. O título e o trecho não são controles e ficam sem o anel.

### Ações em texto
- **Quais:** "Desmarcar", embaixo de "Você leu este artigo."; "Recomeçar a trilha", embaixo da descrição da trilha, quando a pessoa já leu algum artigo dela; "Recomeçar o quiz", na abertura e no fim do quiz, quando ela já respondeu alguma pergunta; e "Desfazer". A mesma forma serve a links: "Ver o caminho na trilha", na página inicial, "Ir para o início", no 404, "Ver as trilhas", na página de erro, e "O código é aberto, no GitHub", no rodapé.
- **Forma:** um botão com cara de link (`.acao-de-texto`): Archivo 700 a 0.875rem, em maiúsculas espaçadas, com sublinhado de 2 px. No botão, um `::before` soma 13 px em cima e embaixo da caixa: a área de toque fica com 45 px de altura, sem mudar o espaço que o texto ocupa, e o anel de foco fica justo no texto.
- **Nos links:** o link fica em linha e quebra como texto, e o padding faz a área (15 px em cima e embaixo da letra, 4 px dos lados, que a margem negativa devolve). O anel de foco contorna só o texto, que fica num `span`. Um link sem o `span` fica com o anel no próprio link; num navegador sem o `:has()`, o link com o `span` fica com dois anéis, e o foco continua visível.
- **Depois da ação:** a frase de estado diz o que aconteceu ("Você desmarcou o artigo.", "Você recomeçou a trilha.", "Você recomeçou o quiz."), e o mesmo botão vira "Desfazer", no mesmo lugar, com o foco nele. Nenhum outro controle aparece onde o botão estava: o segundo clique de um clique duplo cai sempre no mesmo botão. O "Desfazer" vale até a pessoa sair da página. Não há caixa de confirmação.
- **Leitor de tela:** o que aconteceu é anunciado por uma região `role="status"` escondida, que já vem vazia no HTML do servidor e se apaga depois de 7 s (`useAviso`).

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
- **O pé:** depois de um fio de tinta, a abertura em Literata, e ao lado (embaixo, até 992 px) a linha do progresso e o botão.
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
- **A fila:** cinco azulejos grandes, um por passo, cada um um botão com o número e o nome do passo (no celular, o nome fica só para o leitor de tela). Os passos já andados ficam com a cor, e os da frente, crus. A partir de 768 px, um fio liga os cinco: o de Papel 3 é o caminho inteiro, e o de tinta avança até o passo da vez. Com o nome à vista, cada aba tem pelo menos a largura da palavra mais comprida do nome, e as outras dividem o resto (`minmax(min-content, 1fr)`): o nome de um passo não se parte.
- **O passo:** o número gigante, que tomba no lugar, e ao lado "Passo 2 de 5", o título, o texto, os desvios (cada um com um fio da cor do passo ao lado), as fontes com a data da consulta e os artigos que explicam o passo. O passo sem artigo traz "Ler este passo na trilha", com o título do passo num sufixo só para o leitor de tela.
- **Os controles:** "Voltar" (vazado) e "Próximo passo", que no último vira "Ver do começo"; e o link "Ver o caminho na trilha".
- **Sem JavaScript,** os cinco passos ficam abertos, um embaixo do outro, e a fila e os botões saem. Com JavaScript, o CSS já mostra um passo de cada vez desde a primeira pintura (`@media (scripting: enabled)`), e nada pula quando o código carrega. No navegador que não sabe dizer no CSS se tem JavaScript, os cinco ficam abertos até o código carregar.
- **Leitor de tela e teclado:** o passo escondido fica fora dos dois. O botão do passo da vez leva `aria-current="step"`, e cada troca é anunciada ("Passo 2 de 5: Comissões") pela região `role="status"`.

### O caminho da trilha (a sanfona)
- **Onde:** na página da trilha, quando ela tem um `infografico.md`: depois das folhas e, a partir de 1400 px, ao lado delas.
- **Forma:** o título e o resumo, e uma lista ordenada de passos entre fios. Cada passo é um `<details>` do navegador, com o azulejo pequeno do passo, o título e um "+", que vira "×" quando abre. Um passo fica aberto de cada vez (`name="caminho"`), e o primeiro já vem aberto. Funciona sem JavaScript.
- **Dentro:** o texto, os desvios, os artigos que explicam o passo e as fontes, numa linha ("Fonte:" ou "Fontes:", com os títulos em negrito, separados por " · "), com a data da consulta embaixo: "consultadas em 10 de novembro de 2026", ou "consultadas entre … e …". No texto e nos desvios, o "art." e o "§" não se separam do número na quebra de linha.
- **Os artigos:** "Artigo 3: O projeto passa pelas comissões", como link, com um azulejinho na fita do artigo ao lado.
- **Endereço de cada passo:** o `h3` de cada passo tem o id `passo-` e o título sem acento ("Sanção ou veto" vira `passo-sancao-ou-veto`), e o título do caminho tem o id `caminho`. O passo do endereço abre sozinho.
- **Toque e foco:** os links dos artigos e das fontes têm 45 px de área de toque em cada linha e 4 px a mais dos lados, sem mudar o espaço que o texto ocupa (`.link-do-caminho`). O anel de foco contorna o texto, e não a área; nas cores forçadas do Windows, sai na cor de destaque do sistema.
- **Leitor de tela:** tudo é texto de verdade. Os desvios ficam numa lista com o nome "O que pode mudar o caminho". As listas têm `role="list"`: sem marcador, o Safari tira delas o papel de lista.

### Chamada do quiz
- Uma folha com "Quiz da trilha", a frase que diz quantas perguntas ele tem e de quais artigos, o botão "Responder o quiz" e um azulejo grande por pergunta. Os azulejos seguem a ordem das perguntas e não dizem nada sobre acertos. Quando o ponteiro passa, eles giram em fila.
- **Onde:** na página da trilha e no fim do artigo depois do qual o quiz aparece.

### Quiz
- **Caráter:** um palco de papel com uma pergunta por vez: a abertura, a pergunta, a resposta e o fim. O Renan aprovou a pergunta por tela no plano, em 12/11/2026. A lógica é a de antes (`lib/quiz.ts` e `lib/respostas-do-quiz.ts`): sem placar, sem total de acertos, sem nota e sem ranking.
- **O palco:** a migalha, o título, a tela da vez e, no pé, o andamento. Embaixo dele ficam as faixas do anterior e do próximo, como no artigo.
- **O mosaico:** um azulejo grande por pergunta, na ordem delas, três por fileira. Na abertura, fica inteiro e com cor. Nas perguntas, fica cru, e cada pergunta respondida devolve a cor ao azulejo dela, com qualquer resposta. A partir de 992 px, ele fica grande no meio do papel durante a pergunta e se recolhe no canto de cima quando a resposta chega; abaixo disso, fica pequeno no canto, ao lado das etiquetas, e inteiro embaixo da migalha na abertura e no fim. É desenho, fora do leitor de tela, e não diz nada sobre acertos.
- **A abertura:** "Quiz da trilha" na letra do cartaz, a frase que explica, a faixa ("6 perguntas", "Fonte oficial em cada resposta") e o botão: "Começar", "Continuar", com o quiz pela metade, ou "Rever as respostas", com ele terminado. O botão só funciona com JavaScript e só aparece depois que ele carrega, no lugar que já guarda a altura do texto mais alto dos três (veja "O progresso chega depois"): "Rever as respostas" vai em duas linhas no celular com a letra grande, e nada desce quando o botão aparece.
- **A pergunta:** "Pergunta 2 de 6", em Label, e o enunciado formam a legenda de um grupo de rádios. Cada opção é uma folha com fio de tinta, com pelo menos 56 px de altura, e a letra (A, B, C) na fita da posição, com contorno de tinta. O rádio de verdade cobre a opção inteira, sem aparecer: o clique, o teclado e o leitor de tela são os do navegador, e o anel de foco contorna a opção. Com o ponteiro, a opção anda para o lado e mostra um fio rosa, amarelo ou azul, pela posição; a escolhida fica assim, em bloco de tinta com o texto em papel. Antes da resposta, o fio não usa o verde nem o vermelho, que ficam para a certa e a errada (o Renan, em 13/11/2026); quem distingue as opções é a letra, que continua na fita da posição. Embaixo, o botão "Responder"; sem opção marcada, aparece "Escolha uma opção antes de responder.", com um fio vermelho ao lado.
- **A resposta:** as opções viram com o estado, sempre escrito: a certa leva um fio verde e "Resposta certa"; a que a pessoa marcou e estava errada fica tracejada, com um fio vermelho e "Sua resposta"; as outras passam para a tinta suave. A folha da resposta, com a tira das cinco fitas no alto, tomba no lugar: "Você acertou." ou "Você errou.", com o visto ou o xis em tinta e um fio verde ou vermelho embaixo; a explicação; "Para rever", com o link do artigo; as fontes oficiais; e o botão "Próxima pergunta" ou, na última, "Terminar". A partir de 992 px, a folha fica ao lado das opções; abaixo disso, embaixo delas, e, para quem errou, traz também a resposta certa por extenso. Trocar de opção fecha a resposta: vale a última que a pessoa responde.
- **O verde e o vermelho** dizem aqui certo e errado, sempre junto com a frase, o desenho do visto ou do xis e a etiqueta de cada opção. São as mesmas fitas, e não marcam lado nenhum. Antes da resposta, eles só aparecem pela posição, na letra da opção (a A é verde e, numa pergunta com cinco opções, a E é vermelha) e nos quadradinhos do andamento, que são desenho: o fio da opção, que diz qual a pessoa escolheu, fica na rosa, na amarela e na azul.
- **O fim:** "Você terminou o quiz." na letra do cartaz, o "Recomeçar o quiz", os artigos do quiz para rever, numa lista entre fios, e os botões "Voltar para" a trilha e, vazado, "Rever as respostas", que passa pelas perguntas com a resposta de cada uma à vista. O fim fica preso ao alto do palco: o que muda com o recomeço vem depois da linha do "Recomeçar o quiz".
- **Recomeçar:** depois do clique em "Recomeçar o quiz", a tela continua a mesma: o título do fim, ou a frase do andamento, diz "Você recomeçou o quiz.", o mosaico e os quadradinhos perdem a cor, e o mesmo botão vira "Desfazer", no mesmo lugar. O "Começar" leva à primeira pergunta, e dali em diante o recomeço não se desfaz mais.
- **O andamento:** o pé do palco, em papel com o grão do fundo, com um quadradinho por pergunta, que vira e ganha a cor da posição quando a pergunta é respondida (o contorno marca a pergunta da vez), e a frase "Você respondeu 2 de 6.", em minúsculas. Numa tela com pelo menos 40rem de altura, ele fica preso embaixo enquanto a pessoa rola, e o que recebe o foco para acima dele.
- **Foco e leitor de tela:** a cada troca de tela, o foco vai para o título do que apareceu: o enunciado, o resultado ou o título do fim. O resultado é anunciado pela região `role="status"` ("Pergunta 2: você errou. A resposta certa é: …"). As setas trocam de opção, e o Enter responde.
- **Sem JavaScript:** o palco fica só com a abertura, sem o botão e sem o andamento, e as perguntas vêm todas embaixo dele, num `<noscript>`: cada uma numa folha, com os rádios e um "Ver a resposta" do navegador (`<details>`).
- **Alto contraste:** nas cores forçadas do Windows, a opção escolhida ganha um contorno, e o estado de cada opção já vem escrito.

### Artigo
- **A folha de leitura:** a folha clara com fio de tinta, sobre a parede de papel. No canto de cima, o azulejo do artigo, que entra virando, peça por peça.
- **No alto:** a migalha, o número na fita da posição com "Artigo 2 de 6 artigos", o título, a faixa entre dois fios ("Leitura de 2 min" e as fontes) e o resumo.
- **O texto:** Literata, até 39rem. Os intertítulos vão na letra do cartaz, mais larga (68%). As listas levam um azulejinho no lugar do marcador: um quarto de círculo na fita da posição do item, que dá um quarto de volta a cada item. As listas numeradas ficam com o número.
- **A barra de leitura:** a tira das cinco fitas, no alto da tela, que enche com a rolagem do texto. É a animação de rolagem do CSS: onde o navegador não tem, a barra não aparece.
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
- "Trilhas / Processo legislativo", em Label, com os links sublinhados e a página atual sem link, em tinta suave. Cada link tem 44 px de altura, inteiros para o toque: a migalha fica por cima do que vem depois dela (`z-index: 1`), porque a linha do título gigante do quiz e a do número do artigo são mais altas que a letra e passavam por cima dos links.

### Página não encontrada e página de erro
- **Forma:** o cartaz das páginas de dentro, com o painel de azulejos. No 404, o número gigante em cima do título "Página não encontrada", com um algarismo em cada fita, pela ordem; o número é desenho, e o título diz o que houve. Na de erro, só o título, "A página não carregou". Embaixo, uma frase em Literata e as duas ações: o botão e uma ação em texto.
- **Página de erro:** aparece quando a página pedida não chega (a rede caiu, o pedido foi bloqueado ou o servidor deu erro), em todas as rotas, dentro do site, com o cabeçalho e o rodapé. Sem ícone de alerta e sem cor de erro: o erro é dito em palavras.
- **Tentar de novo:** pede a página de novo, sem recarregar (`router.invalidate()`). Enquanto o pedido não volta, o carregando aparece na hora, no lugar da página de erro, com o foco na frase (veja "Carregando"). Se der certo, a página pedida abre com o foco no título. Se falhar de novo, aparece "Ainda não deu. Confira a internet ou espere um pouco e tente de novo.", o foco volta ao botão e a frase é anunciada pela região `role="status"`.
- **O aviso é da visita:** o "Ainda não deu" vale só para a tentativa feita ali. Quem sai da página de erro e volta, inclusive pelo voltar do navegador, encontra a página sem o aviso, e o leitor de tela não o anuncia de novo.
- **Título da aba:** "Erro ao carregar a página · Mandatômetro". A tela não mostra a mensagem técnica nem a pilha do erro.

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
- **Na rolagem:** as seções sobem e aparecem quando entram na tela (`.revelar`), e a barra de leitura enche. As duas usam a animação de rolagem do CSS, dentro de `@supports`: sem ela, e sem JavaScript, a peça já está no lugar. Nada fica escondido à espera de um script. A seção termina de aparecer quando o alto dela sobe 7rem na tela, e não numa fração da altura dela: só a faixa de baixo da tela mostra a peça entrando, e o texto parado mais acima nunca fica apagado.
- **O mapa do fundo** anda mais devagar que a página: sobe um décimo do que ela rola, até 60vh, nas seis primeiras telas de rolagem, e depois fica parado (`mapa-anda`, com `animation-timeline: scroll()` e `animation-range: 0 600vh`, dentro de `@supports`). O trecho é um comprimento fixo, e não o progresso da página inteira: ele só se mexe quando a pessoa rola, e não salta quando a página muda de altura com ela parada, como ao abrir um passo do caminho. Parado, o fundo está parado. Sem a animação de rolagem, o mapa fica fixo atrás da página.
- **Com o ponteiro:** o azulejo vira; a folha sobe; o azulejo da folha dá um quarto de volta; o botão sobe e mostra a tira; o traço do link do cabeçalho se risca.
- **Na ação:** os azulejos do passo a passo viram em fila até o passo da vez, o texto do passo entra de lado (da direita ao avançar, da esquerda ao voltar), com a seção cortando o que passa da borda da tela, para a página não rolar de lado, e o número tomba; o azulejo do lido vira para o verde, e o visto se desenha. No quiz, as opções tombam no lugar, uma a uma; depois da resposta, viram com o estado, a folha da resposta tomba, presa pela borda de cima, e os azulejos já acesos do mosaico fazem a onda; no fim, o mosaico inteiro faz a onda. A tela que sai sobe um pouco e some (0,4 s) antes de a seguinte entrar.
- **Cada animação parte de um estado de saída e chega ao estado normal da peça:** onde a animação não roda, a peça aparece pronta.

### A troca de página
- **O gesto:** a página nova aparece azulejo por azulejo, num giro de relógio em cada peça, por cima da página de antes, que fica parada. Dura 0,6 s. Ao voltar, o giro é ao contrário.
- **O sentido** vem do lugar da página no site, e não da ordem da visita (`lib/troca-de-pagina.ts`): a página inicial em cima, depois Trilhas, cada trilha e os artigos dela, na ordem da trilha, com o quiz no lugar dele, logo depois do artigo que o chama. Ir mais para dentro, ou para um artigo mais adiante, é avançar; o contrário é voltar, também pelo botão voltar do navegador. Do quiz para o "Artigo anterior" é voltar.
- **O cabeçalho,** quando aparece na tela, fica parado por cima, e só o traço da seção troca, num esmaecer de 200 ms. Com a página rolada, ele vem com a página nova.
- **Os cliques:** enquanto a troca roda, o navegador mostra fotos das duas páginas, e nada da página nova responde ao ponteiro (o `pointer-events: none` nas fotos não muda isso, porque a página inteira está na foto). Para o clique não se perder, o toque encerra a troca na hora, e o clique segue para o que está embaixo do ponteiro na página nova (`cliqueDuranteATroca`, em `lib/troca-de-pagina.ts`). O segundo clique de um clique duplo não segue: ele cairia num botão que a pessoa nem viu. Num navegador sem o `activeViewTransition`, o clique feito durante a troca ainda se perde.
- **Quando não anima:** na primeira carga, num link para um trecho da mesma página e no "Tentar de novo" da página de erro. O carregando também entra sem animação, no lugar da página de antes; numa navegação, a página que chega depois dele aparece azulejo por azulejo, por cima da frase. Num navegador sem as View Transitions, a página troca direto; num que não tem os tipos de transição, vira o esmaecer padrão do navegador.
- **Foco e leitor de tela:** nada muda. O foco vai para o título da página nova, ou para o trecho do endereço; a animação é só da tela.
- **Como:** pelas View Transitions do navegador, que o TanStack Router pede em cada navegação (o `defaultViewTransition` do `router.tsx`), com os tipos `folha`, `avancar` ou `voltar` e `moldura-na-tela`. A máscara da foto nova é uma grade de azulejos que se abre com um ângulo animado (`@property --vt`).

### Movimento reduzido
Com `prefers-reduced-motion: reduce`, nada vira, tomba, sobe nem se risca: as peças aparecem no lugar, e os estados trocam direto. O painel não vira com o ponteiro nem sozinho. A barra de leitura sai, e o mapa do fundo fica parado. A página troca num esmaecer de 160 ms, nos dois sentidos, e o cabeçalho vai direto para o lugar. No quiz, as telas trocam na hora. Tudo continua funcionando: o movimento nunca carrega informação que não esteja também em palavras.

## Do's and Don'ts

### Do:
- **Do** manter o texto em tinta sobre o papel ou a folha (ou em papel sobre a tinta), em qualquer tamanho.
- **Do** dar a cada artigo, trilha e passo a fita da posição, pela ordem verde, amarela, azul, rosa, vermelha.
- **Do** pôr uma fita só em cada azulejo, e as cinco juntas em cada painel.
- **Do** deixar os azulejos fora do leitor de tela: são desenho.
- **Do** escrever o estado em palavras e marcar na folha: o visto e "Lido", "Continue daqui", "Você está aqui".
- **Do** guardar desde o HTML do servidor o lugar do que só aparece depois que o navegador sabe o progresso.
- **Do** deixar o botão que vira "Desfazer" no mesmo lugar, sem outro controle aparecendo ali.
- **Do** usar o foco de 3 px no azul do foco, afastado 3 px, e o amarelo dentro do cabeçalho.
- **Do** respeitar o movimento reduzido, e fazer cada animação chegar ao estado normal da peça: sem ela, a peça aparece pronta.
- **Do** deixar a letra crescer com a configuração do navegador: as margens e os respiros do celular ficam em px, o título cresce até a palavra mais larga encostar nas margens (o teto), e nenhuma página rola de lado.
- **Do** oferecer "Desfazer" logo depois de apagar uma marca, em vez de pedir confirmação antes.
- **Do** deixar sem fundo o que fica direto no papel, para o mapa aparecer; o que precisa cobrir a página, como o pé do quiz e as faixas do anterior e do próximo, leva o papel com o grão (`var(--papel) var(--grao)`).

### Don't:
- **Don't** fazer "site do governo": burocracia e letra pequena.
- **Don't** fazer "coisa de criança": cor demais e tom infantil. A cor fica nos azulejos e nos números; o resto é papel e tinta.
- **Don't** fazer "jornal partidário": manchete gritando e cor de partido. As fitas são as cinco juntas, pela ordem; nenhuma delas representa um lado.
- **Don't** pôr texto em cima de uma cor de fita.
- **Don't** usar o fundo escuro na página: o Renan recusou em 12/11/2026. A tinta em bloco fica no cabeçalho, no botão e nas etiquetas.
- **Don't** mostrar placar, total de acertos, nota ou ranking, nem animar uma pontuação: a animação comemora o aprender. Os azulejos do quiz seguem a ordem das perguntas.
- **Don't** usar barra de progresso para a trilha: o progresso é o visto e as palavras. A barra do alto do artigo mostra só a rolagem do texto.
- **Don't** usar sombra esfumada, canto arredondado ou degradê suave.
- **Don't** pintar o fundo com mancha de cor, degradê ou sombra borrada, nem fazer ele se mexer sozinho: o fundo é o papel, com o grão e as curvas do mapa, e só anda com a rolagem.
- **Don't** trazer de volta a itálica fina ao lado do título pesado: o Renan achou com "muito cara de IA" (13/11/2026).
- **Don't** inventar um logo; até o time fazer o dele, o nome em texto é a marca, e o M do nome é o ícone.
- **Don't** usar a vermelha como cor de domingo antes da decisão da issue #39.
- **Don't** trazer uma biblioteca de animação nem imagem para os azulejos: o movimento é do navegador, e o desenho, do CSS.
- **Don't** esconder conteúdo à espera de um script: o que anima na entrada já está no HTML, no lugar.
- **Don't** pôr ícone girando ou barra no carregando: ele diz em palavras que a página está a caminho, e nada nele se mexe.
- **Don't** marcar o lido com um X: ele lê como "errado" ou "cancelado", ainda mais num site com quiz.
- **Don't** prender um tamanho de letra só à largura da tela (`vw` puro): a letra para de crescer com a configuração do navegador.
- **Don't** pôr hífen automático (`hyphens`): a palavra só se parte, sem hífen, quando não cabe sozinha na linha.
- **Don't** deixar uma coluna de texto ao lado de outra com `1fr` puro: com a letra grande, ela cresce até a palavra mais comprida e alarga a página. Use `minmax(0, 1fr)`.
