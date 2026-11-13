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
  italic:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "1.125rem"
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
  cartaz:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    typography: "{typography.headline}"
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
- A letra do cartaz: Archivo de peso 900, estreito, em maiúsculas, com uma frase em itálico (Instrument Serif). O que se lê com calma vai em serifa (Literata).
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
- **Papel** (`papel`): a parede, o fundo de todas as páginas, e o texto dentro do bloco de tinta.
- **Papel 2 e Papel 3** (`papel-2`, `papel-3`): os dois tons do azulejo cru, papel sobre papel. O Papel 2 é também o fundo das faixas do anterior e do próximo quando o ponteiro passa, e o Papel 3, o lema no cabeçalho e o fio dos passos que ainda não foram andados.
- **Folha** (`folha`): mais clara que a parede, para o que se lê com calma: a folha do artigo, as folhas das listas e a chamada do quiz.
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

Os números levam a cor da fita com um contorno de tinta de pelo menos 3 px: quem dá a forma é o contorno, e por isso o amarelo, que quase some no papel (1,4), serve. O número da folha lida perde a cor de propósito e fica papel sobre papel (1,5): quem diz o estado é o visto, em tinta, e a palavra "Lido".

### Named Rules
**A Regra do Texto em Tinta.** O texto é sempre tinta no papel ou na folha, ou papel no bloco de tinta. Nenhum texto fica em cima de uma cor de fita: só a tinta no amarelo teria contraste.

**A Regra da Fita pela Ordem.** Cada artigo, cada trilha da lista e cada passo ganham a fita pela posição: 1 verde, 2 amarela, 3 azul, 4 rosa, 5 vermelha, e depois recomeça (`fitaDaPosicao` e `classeDaFita`, em `lib/formatar.ts`). Ninguém escolhe fita por assunto, partido ou humor.

**A Regra de Uma Fita por Azulejo.** Cada azulejo leva uma fita só, com tinta ou papel, e nunca duas fitas juntas. As cinco aparecem juntas em todo painel: o sorteio garante as cinco no começo dele, que é o que o celular mostra (`lib/azulejos.ts`, com teste).

**A Regra do Domingo em Aberto.** O vermelho de domingo das edições ainda não foi decidido (issue #39). Até lá, a vermelha é só a quinta fita, não marca dia nenhum.

## Typography

**Display Font:** Archivo Variable, eixo de largura (com ui-sans-serif, system-ui)
**Body Font:** Literata Variable, eixo de tamanho óptico, com itálico (com ui-serif, Georgia)
**Accent Font:** Instrument Serif, itálico 400 (com Georgia)

As três são servidas pelo próprio site, pelo `@fontsource`. Os arquivos latinos da Archivo e da Literata são pré-carregados no `<head>` de todas as páginas, para o texto não pular quando elas chegam. A Instrument Serif é pré-carregada a partir de 768 px, por causa do lema no cabeçalho; no celular, só a página inicial a pede, para a frase do título.

A Instrument Serif entrou na #89 só para a frase em itálico. É a única dependência nova da direção: `@fontsource/instrument-serif`, licença SIL OFL 1.1, 22 kB. O Renan aprovou no plano, em 12/11/2026.

**Character:** a Archivo, bem preta e apertada, grita como cartaz de rua; a Instrument Serif responde baixo, em itálico, numa frase só; a Literata, calma, faz o professor paciente falar.

### Hierarchy
- **Numeral** (900, largura 62%, altura de linha 0.78): o número da folha, na cor da fita da posição, com contorno de tinta (`max(3px, 0.05em)`, pintado antes do miolo; 2 px nos números pequenos). Na folha da trilha, de 5.5rem a 11.5rem; no passo da página inicial, 7rem no celular e até 17rem; no alto do artigo, de 5rem a 9rem; no 404, de 7rem a 17rem; em "Nesta trilha" e nas faixas do anterior e do próximo, 2.75rem; nas miniaturas, 1.75rem.
- **Headline** (`titulo-condensado`: 900, largura 62%, altura 0.86, maiúsculas): o título da página. Na página inicial, de 3.25rem a 8rem; nas páginas de dentro (a trilha, Trilhas, o 404 e a de erro), de 3.5rem a 11rem; no artigo, de 2.75rem a 6rem, com no máximo 10 em de largura. Também "O caminho de um projeto de lei" na página inicial (2.75rem a 6.5rem), o título de cada passo dela (2.25rem a 3.75rem) e "Quiz da trilha" na chamada (2.5rem a 5.5rem).
- **Title** (`titulo-de-folha`: 900, largura 62%, altura 0.92, maiúsculas): o título de cada folha de uma lista. O do artigo na trilha, de 1.875rem a 3.5rem; o da trilha em Trilhas, de 2.25rem a 4.5rem; o do anterior e do próximo, de 1.5rem a 2.5rem.
- **Subtitle** (`subtitulo-condensado`: 900, largura 68%, altura 0.95, maiúsculas): os intertítulos do texto (1.75rem a 2.5rem), "Fontes oficiais" (1.5rem) e o título do caminho na trilha (1.875rem a 2.75rem).
- **Wordmark** (900, largura 68%, maiúsculas, 0.01em entre as letras): o nome Mandatômetro. No cabeçalho, 1.625rem (1.3125rem abaixo de 480 px); no rodapé, de 2.25rem a 4.5rem. É texto, não logo.
- **Italic** (Instrument Serif itálico 400): a segunda linha do título da página inicial ("um passo de cada vez.", a 0.9 em do título, com a tira riscada embaixo) e o lema, a 1.125rem no cabeçalho e 1.25rem no rodapé. Só isso.
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
| Página não encontrada | ENCONTRADA | 5.15 |
| A página não carregou | CARREGOU | 4.15 |
| O nome do site (largura 68%) | MANDATÔMETRO | 7.08 |

- **O recuo** é o que fica entre a caixa do título e as margens da página: o respiro e os fios da folha, a coluna do número e a do azulejo. Quando a folha divide a página com uma coluna ao lado (o caminho, na trilha; "Nesta trilha", no artigo), o contêiner diz quanto ela toma no `--recuo-de-fora`, e os títulos de dentro somam.
- **O aviso a quem escreve:** um teste (`src/lib/conteudo/titulos.test.ts`) soma a largura de cada letra em maiúsculas (`larguras-das-letras.ts`, medida no navegador nos dois estilos) e falha quando uma palavra de um título do conteúdo passa do teto, com o arquivo, a palavra e o que fazer (`docs/conteudo-das-trilhas.md`). Os tetos saem do código, e o teste fica fora do `conferir.ts`: ele não derruba o build nem o deploy.

### Named Rules
**A Regra das Três Letras.** O grotesco estreito para número, título e etiqueta; a serifa para o que se lê de verdade; o itálico só para a frase do cartaz e o lema. Nenhuma quarta família, e o itálico não vira estilo de texto.

**A Regra das Maiúsculas com Medida.** Os títulos grandes vão em maiúsculas sempre, com o teto. As etiquetas pequenas vão em maiúsculas espaçadas, mas voltam às minúsculas, sem o espaço entre as letras, quando a tela tem menos de 22rem (as variáveis `--caixa-alta` e `--espacado`): em maiúsculas, uma palavra comprida não cabe na linha.

## Layout

A página usa a largura toda da tela, com as margens do `--margem`: 20 px no celular e, a partir de 768 px, de 32 a 72 px, crescendo com a tela. Os títulos têm as linhas equilibradas e os parágrafos evitam palavra sozinha na última linha.

- **Os cartazes** abrem as páginas. A partir de 992 px, o cartaz da página inicial tem pelo menos a altura da primeira tela, e o das páginas de dentro, também, com o limite de 44rem. O título e o pé ficam embaixo, e o que vem antes do título (a migalha), no alto.
- **O painel de azulejos** fica à direita do cartaz, nos 30% da largura, de cima a baixo, a partir de 992 px. Abaixo disso, é uma faixa de duas fileiras no alto, de borda a borda: 6 azulejos por fileira no celular e 10 a partir de 640 px.
- **Página inicial:** o cartaz e, depois de um fio de tinta, o caminho de um projeto de lei, passo a passo. Abaixo de 768 px, o "para quem" vem depois do botão, para o botão caber na primeira tela do celular. O HTML tem o "para quem" duas vezes, e o CSS mostra um de cada vez: o leitor de tela e o Tab seguem a ordem da tela em cada largura, o que o `order` do CSS não faria. O Renan escolheu essa ordem em 10/11/2026.
- **Trilha:** o cartaz e as folhas dos artigos, uma embaixo da outra, e depois a chamada do quiz e o caminho. A partir de 1400 px, o caminho fica numa coluna de 24rem à direita das folhas. A ordem do HTML é a mesma em todas as larguras.
- **Lista das trilhas:** o cartaz e uma folha por trilha. A partir de 1024 px, a folha tem duas colunas: à esquerda, o azulejo, o título, a descrição e o progresso; à direita (22rem), as folhas dos artigos em lista. Abaixo disso, os artigos viram quadradinhos.
- **Artigo:** a parede de papel com a folha de leitura por cima, até 82rem. A partir de 1200 px, "Nesta trilha" fica numa coluna de 17rem à direita, fixa ao rolar; abaixo disso, vem depois da folha. No celular, a folha fica a 8 px das bordas da tela, com 16 px de respiro por dentro.
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
- o passo a passo da página inicial, que a partir de 768 px tem sempre a altura do passo mais alto.

Na trilha, o botão de continuar muda de texto ("Começar pelo primeiro artigo" vira "Continuar de onde parou: …") e some com a trilha terminada. Ele vem depois da linha do "Recomeçar a trilha", e não antes: o que fica acima dela não muda com o progresso.

## Elevation & Depth

O sistema é chapado: sem sombra esfumada e sem degradê suave. A profundidade vem da tinta.

- **A sombra dura:** a folha de uma lista sobe 4 px quando o ponteiro passa, sobre uma sombra de tinta de 6 px, sem desfoque. O azulejo do passo da vez, na página inicial, fica 8 px acima, sobre uma sombra igual, de 8 px. São as duas únicas sombras do site. O fio grosso da folha aberta, em "Nesta trilha", também usa o `box-shadow`, mas `inset`: desenha um fio de 6 px, e não uma sombra.
- **O giro:** os azulejos viram em volta do próprio eixo, com perspectiva. É movimento, e não camada: parado, tudo é plano.

### Named Rules
**A Regra da Tinta Chapada.** Sem sombra esfumada e sem degradê suave. Os gradientes do site têm borda dura: as faixas da tira e os motivos dos azulejos.

## Shapes

Tudo é reto: raio zero (`--radius: 0`).

- **O fio:** 2 px em tinta. Contorna as folhas, separa as seções e os itens das listas. "Fontes oficiais" abre com um fio de 6 px.
- **A tira:** as cinco fitas em faixas iguais, com 6 px de altura: embaixo do cabeçalho, embaixo do botão quando o ponteiro passa, na barra de leitura do artigo e riscada embaixo da frase em itálico do título.
- **O azulejo:** um quadrado com o fundo, um motivo por cima e uma volta, de 0 a 3 quartos. Os motivos são dez: o quarto de círculo, a meia-lua, o triângulo, o círculo, as listras, o arco, os dois quartos opostos, o liso, os quatro pontos e a metade. Entre dois azulejos de um painel, 2 px de rejunte.
- **O azulejo grande:** quatro peças que formam um desenho. São cinco desenhos, e dois lembram o Congresso: a cúpula e os dois lados.
- **A etiqueta de estado:** um retângulo de tinta com a letra em papel, que pende do fio de cima da folha.
- **O visto:** um traço só, levemente curvo, com a perna curta e a longa, de ponta redonda, em tinta, sobre um traço mais largo na cor da folha, que o separa do que fica atrás.

## Components

### Moldura (cabeçalho)
- **Caráter:** um bloco de tinta na largura toda, com a tira das cinco fitas embaixo. É o que separa o cabeçalho da página clara.
- **Forma:** 72 px de altura, com a tira de 6 px. O nome e, a partir de 768 px, o lema em itálico (em Papel 3) à esquerda; Início e Trilhas à direita. No celular, ficam o nome e os links: o lema está no rodapé. O respiro fica em px, sem crescer com a letra.
- **Navegação:** links em papel, em maiúsculas espaçadas, sem sublinhado, com um traço de 4 px em papel embaixo: ele se risca da esquerda para a direita quando o ponteiro passa e fica na seção aberta. "Trilhas" fica marcado na lista das trilhas, em cada trilha e em cada artigo; o `aria-current="page"` só vai no link da própria página.
- **Foco:** o anel de foco fica amarelo dentro do bloco. O "Pular para o conteúdo" aparece no foco, em tinta sobre papel.
- **Na troca de página,** o cabeçalho fica parado (veja "A troca de página").

### Rodapé
- **Caráter:** papel com um fio de tinta em cima e uma fileira de azulejos embaixo. É o `<footer>` do documento, em todas as páginas, inclusive no 404 e na de erro.
- **Forma:** o nome em Wordmark, grande, sem link, com o lema em itálico embaixo; ao lado (embaixo, até 1024 px), três linhas em Literata, em tinta suave: "O Mandatômetro foi feito para o Hack Brasil 2026, na trilha Acesso à educação.", "Cada explicação traz a fonte oficial: a lei, o regimento ou a página da Câmara e do Senado." e "O código é aberto, no GitHub.".
- **O link do GitHub:** uma ação em texto em linha, na letra do parágrafo, em tinta e negrito. A área de toque tem 12 px em cima e embaixo da letra, menos que o vão entre os parágrafos: um toque na linha de cima não vai para o link.
- **A fileira de azulejos:** 16 azulejos (os 8 primeiros no celular, que já têm as cinco fitas). Ela faz a onda uma vez, quando entra na tela.

### Botão
- **Forma:** bloco reto de tinta, texto em papel, em maiúsculas espaçadas (800, 1rem), com pelo menos 52 px de altura e a seta à direita. O vazado, com o fundo transparente e o texto em tinta, acompanha o principal ("Voltar", no passo a passo).
- **Hover:** o botão sobe 3 px, a tira das cinco fitas aparece embaixo dele, e a seta anda um pouco para a frente.
- **Com a letra grande:** quando a tela tem menos de 20rem (a 360 px, com a letra acima de 18 px), a seta vem logo depois da última palavra, e o respiro dos lados fica em 18 px, que não cresce com a letra. Entre a palavra e a seta vai um espaço, e não uma margem: quando a seta desce sozinha, começa alinhada com o texto. Uma palavra maior que a linha se parte sem hífen (`overflow-wrap: anywhere`). O Renan escolheu, na #76, em 11/11/2026: "Seta no fim, respiro fixo (Recomendado)".
- **Desligado:** fica apagado (35%), sem subir e sem a tira.
- **Alto contraste:** nas cores forçadas do Windows, o fundo some e a borda aparece na cor do texto: o botão continua com cara de botão.
- **Onde:** é a única ação em bloco das páginas (`BOTAO_CONTINUAR`): na página inicial, na trilha, na chamada do quiz, no passo a passo, no 404 e na página de erro. Os outros links e ações são sublinhados.

### Links
- Sublinhado de 2 px, afastado 0,2 em do texto, em tinta. Títulos que são links ficam sem sublinhado.
- **Foco:** contorno de 3 px no azul do foco, afastado 3 px. Na folha de uma lista, o contorno vai na folha inteira.
- **Depois de uma navegação:** o foco vai para o h1 da página nova ou, quando o endereço aponta para um trecho do conteúdo (`#caminho`, `#passo-plenario`), para esse trecho, já na tela. O título e o trecho não são controles e ficam sem o anel.

### Ações em texto
- **Quais:** "Desmarcar", embaixo de "Você leu este artigo."; "Recomeçar a trilha", embaixo da descrição da trilha, quando a pessoa já leu algum artigo dela; e "Desfazer". A mesma forma serve a links: "Ver o caminho na trilha", na página inicial, "Ir para o início", no 404, "Ver as trilhas", na página de erro, e "O código é aberto, no GitHub", no rodapé.
- **Forma:** um botão com cara de link (`.acao-de-texto`): Archivo 700 a 0.875rem, em maiúsculas espaçadas, com sublinhado de 2 px. No botão, um `::before` soma 13 px em cima e embaixo da caixa: a área de toque fica com 45 px de altura, sem mudar o espaço que o texto ocupa, e o anel de foco fica justo no texto.
- **Nos links:** o link fica em linha e quebra como texto, e o padding faz a área (15 px em cima e embaixo da letra, 4 px dos lados, que a margem negativa devolve). O anel de foco contorna só o texto, que fica num `span`. Um link sem o `span` fica com o anel no próprio link; num navegador sem o `:has()`, o link com o `span` fica com dois anéis, e o foco continua visível.
- **Depois da ação:** a frase de estado diz o que aconteceu ("Você desmarcou o artigo.", "Você recomeçou a trilha."), e o mesmo botão vira "Desfazer", no mesmo lugar, com o foco nele. Nenhum outro controle aparece onde o botão estava: o segundo clique de um clique duplo cai sempre no mesmo botão. O "Desfazer" vale até a pessoa sair da página. Não há caixa de confirmação.
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
- **A frase em itálico** (só na página inicial): "um passo de cada vez.", com a tira das cinco fitas, que se risca embaixo dela.
- **O pé:** depois de um fio de tinta, a abertura em Literata, e ao lado (embaixo, até 992 px) a linha do progresso e o botão.
- **A faixa de informações** (na trilha): "3 artigos", "6 min de leitura" e "Fonte oficial em cada explicação", separados por um quadradinho.

### Folha da lista (o artigo na trilha)
- **Forma:** uma folha com fio de tinta: o número gigante, na fita da posição; o título, o resumo em Literata e a linha "Leitura de 2 min · 2 fontes oficiais"; e o azulejo do artigo. No celular, o número e o azulejo ficam em cima, e o texto usa a largura toda.
- **A folha inteira leva ao artigo:** o link é o título, e a área dele cobre a folha.
- **Hover:** a folha sobe 4 px sobre a sombra de tinta, o azulejo dá um quarto de volta, e o número chega um pouco para o lado.
- **Estados:** a lida leva o visto no meio do número, que perde a cor, e a etiqueta "Lido"; onde a pessoa parou leva a etiqueta "Continue daqui".

### A trilha na lista das trilhas
- Uma folha por trilha: o azulejo da posição, o título, a descrição, "8 artigos · 16 min de leitura" e o progresso em palavras ("Você leu 1 de 8." ou "Você terminou a trilha.").
- **As miniaturas** (abaixo de 1024 px): um quadrado de 44 px por artigo, com fio de tinta e o número na fita da posição; os lidos levam o visto no canto de cima, por cima da borda. Os quadrados ficam a 6 px um do outro e, quando quebram de linha, as linhas ficam a 12 px (o Renan, em 11/11/2026: "Linhas mais afastadas"). São desenho: o estado está na frase do progresso.
- **A partir de 1024 px,** os quadrados dão lugar às folhas da trilha em lista, à direita.

### "Nesta trilha"
- A lista dos artigos da trilha, no artigo e na lista das trilhas: em cada linha, entre dois fios, o número pequeno na fita da posição, o título em maiúsculas e o estado ("Lido · 2 min"). A lida leva o visto no número; a aberta leva um fio grosso de tinta do lado e "Você está aqui". A lista tem `role="list"`.

### O passo a passo (página inicial)
- **Caráter:** o caminho de um projeto de lei, um passo de cada vez. O conteúdo é o do `infografico.md` da trilha: o texto, os desvios, as fontes e os artigos de cada passo.
- **A fila:** cinco azulejos grandes, um por passo, cada um um botão com o número e o nome do passo (no celular, o nome fica só para o leitor de tela). Os passos já andados ficam com a cor, e os da frente, crus. A partir de 768 px, um fio liga os cinco: o de Papel 3 é o caminho inteiro, e o de tinta avança até o passo da vez.
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
- A tela do quiz ainda é a da #37, sem o desenho novo. Ela entra nesta direção no passo seguinte da #89, com uma pergunta por tela (o Renan aprovou no plano, em 12/11/2026), sobre a mesma lógica: sem placar, sem total de acertos, sem nota e sem ranking.

### Artigo
- **A folha de leitura:** a folha clara com fio de tinta, sobre a parede de papel. No canto de cima, o azulejo do artigo, que entra virando, peça por peça.
- **No alto:** a migalha, o número na fita da posição com "Artigo 2 de 6 artigos", o título, a faixa entre dois fios ("Leitura de 2 min" e as fontes) e o resumo.
- **O texto:** Literata, até 39rem. Os intertítulos vão na letra do cartaz, mais larga (68%). As listas levam um azulejinho no lugar do marcador: um quarto de círculo na fita da posição do item, que dá um quarto de volta a cada item. As listas numeradas ficam com o número.
- **A barra de leitura:** a tira das cinco fitas, no alto da tela, que enche com a rolagem do texto. É a animação de rolagem do CSS: onde o navegador não tem, a barra não aparece.
- **O lido:** no fim do texto, um azulejo cru vira para o verde, com o visto, quando a pessoa chega ali, e aparece "Você leu este artigo.", com o "Desmarcar" embaixo. Quem volta a um artigo lido já o vê verde, sem animação.
- **Fontes oficiais:** depois de um fio de 6 px, a lista numerada: o número na letra do cartaz, o título da fonte como link em negrito e, embaixo, o domínio e a data da consulta em tinta suave.
  - **O domínio comprido** quebra antes de um ponto: "direitoshumanos" e ".dpu.def.br". O Renan escolheu, na #76, em 11/11/2026: "Nos pontos (Recomendado)". Os pontos só viram lugar de quebra abaixo de 20rem; dali para cima, o endereço vai inteiro.
- **Anterior e próximo:** duas faixas no pé da folha, de borda a borda, lado a lado a partir de 768 px. Em cima, o número na fita da posição, "Artigo anterior" ou "Próximo artigo" e o azulejo do artigo, que gira quando o ponteiro passa; embaixo, o título, com a largura toda da faixa. No último artigo, a faixa da direita volta para a trilha.

### O visto da folha lida (assinatura)
- **Caráter:** o visto do professor no caderno, que diz "este já foi" sem cara de erro. Ele substituiu o X em 11/11/2026: o Pedro sugeriu trocar o X, e o Renan concordou ("um X grande não faz sentido"). O X lia como "errado" ou "cancelado", ainda mais num site com quiz.
- **Forma:** um traço só, no viewBox de 60: 7 em tinta sobre 17 na cor da folha, com ponta e junta redondas. É um componente só (`MarcaDeLido`), com uma classe para cada lugar: no meio do número da folha (`visto-no-numero`), no canto da miniatura (`visto-na-miniatura`) e sobre o azulejo verde do lido, no fim do artigo.
- **A palavra "Lido" continua** ao lado: o visto é a marca, e a palavra diz o que ela quer dizer. O visto fica fora do leitor de tela.
- **Movimento:** quando a pessoa chega ao fim do texto, o visto é desenhado de uma vez, em 400 ms: a perna curta sai devagar, como a caneta que encosta no papel, e a longa vai num golpe só. Ele é desenhado no azulejo do lido e no número do artigo em "Nesta trilha"; nas outras páginas, aparece pronto. O "Desmarcar" apaga o visto sem animação.
- **Alto contraste:** nas cores forçadas do Windows, o traço fica na cor do texto (`CanvasText`), e o de baixo, na do fundo (`Canvas`). Dentro de um link, o visto leva a cor dos links (`LinkText`). O `currentColor` não serve: com o `forced-color-adjust: none`, o Chromium dá a ele a tinta original, e o visto some no fundo escuro.

### Migalha
- "Trilhas / Processo legislativo", em Label, com os links sublinhados e a página atual sem link, em tinta suave. Cada link tem 44 px de altura.

### Página não encontrada e página de erro
- **Forma:** o cartaz das páginas de dentro, com o painel de azulejos. No 404, o número gigante em cima do título "Página não encontrada", com um algarismo em cada fita, pela ordem; o número é desenho, e o título diz o que houve. Na de erro, só o título, "A página não carregou". Embaixo, uma frase em Literata e as duas ações: o botão e uma ação em texto.
- **Página de erro:** aparece quando a página pedida não chega (a rede caiu, o pedido foi bloqueado ou o servidor deu erro), em todas as rotas, dentro do site, com o cabeçalho e o rodapé. Sem ícone de alerta e sem cor de erro: o erro é dito em palavras.
- **Tentar de novo:** pede a página de novo, sem recarregar (`router.invalidate()`). Se der certo, a página pedida abre com o foco no título. Se falhar de novo, aparece "Ainda não deu. Confira a internet ou espere um pouco e tente de novo.", o foco fica no botão e a frase é anunciada pela região `role="status"`.
- **Título da aba:** "Erro ao carregar a página · Mandatômetro". A tela não mostra a mensagem técnica nem a pilha do erro.

### Carregando
- O aviso de carregando das navegações é da #45 e ainda não tem o desenho desta direção. Quando vier, é texto, sem ícone girando.

### Ícone da aba e prévia do link
- **O ícone:** o M do nome em Archivo 900, largura 68%, em papel no quadrado de tinta, com a tira das cinco fitas embaixo. O `favicon.ico` tem 16, 32 e 48 px, e o `apple-touch-icon.png`, 180 px. É a letra do nome, não um logo, e troca quando o logo existir.
- **A prévia do link** (`previa.png`, 1200 × 630 px, a mesma em todas as páginas): o bloco de tinta com o nome (46 px) e o lema em itálico (32 px), a tira de 10 px, o título da página inicial no papel (112 px, com a frase em itálico e a tira riscada) e uma fileira de dez azulejos, com as cinco fitas pela ordem, duas vezes. Os tamanhos ficam fora da escala do site de propósito: a imagem tem 1200 px e é vista pequena.
- **Os textos:** a aba da página inicial diz "Mandatômetro · o diário oficial político, simplificado"; as outras páginas, "Título · Mandatômetro". O título da prévia é "Mandatômetro: entenda a política brasileira, um passo de cada vez".
- **Como gerar:** `pnpm --filter web imagens` abre o Edge ou o Chrome sem janela e fotografa `imagens/icone.html` e `imagens/previa.html`, com as fontes do site embutidas. Cada PNG leva a origem num bloco tEXt `impeccable:prompt`. Para mudar uma imagem, mude o HTML e gere de novo.

## Motion

Tudo é CSS e a animação nativa do navegador (View Transitions, animação de rolagem e Web Animations), sem biblioteca. As regras ficam em `src/estilos/movimento.css`.

Três curvas: o **golpe** (`cubic-bezier(0.5, 0, 0.15, 1)`), seco, para o que se risca; a **mola** (`cubic-bezier(0.2, 0.8, 0.3, 1.25)`), que passa um pouco e volta, para o que vira e tomba; e a **suave** (`cubic-bezier(0.2, 0.7, 0.2, 1)`), para o que sobe.

- **Na chegada:** os azulejos do painel entram virando, em onda, a partir do canto de cima (0,7 s cada, 42 ms entre um e outro); as palavras do título tombam no lugar (70 ms entre uma e outra); a tira se risca embaixo do itálico; o pé do cartaz sobe.
- **Na rolagem:** as seções sobem e aparecem quando entram na tela (`.revelar`), e a barra de leitura enche. As duas usam a animação de rolagem do CSS, dentro de `@supports`: sem ela, e sem JavaScript, a peça já está no lugar. Nada fica escondido à espera de um script.
- **Com o ponteiro:** o azulejo vira; a folha sobe; o azulejo da folha dá um quarto de volta; o botão sobe e mostra a tira; o traço do link do cabeçalho se risca.
- **Na ação:** os azulejos do passo a passo viram em fila até o passo da vez, o texto do passo entra de lado (da direita ao avançar, da esquerda ao voltar) e o número tomba; o azulejo do lido vira para o verde, e o visto se desenha.
- **Cada animação parte de um estado de saída e chega ao estado normal da peça:** onde a animação não roda, a peça aparece pronta.

### A troca de página
- **O gesto:** a página nova aparece azulejo por azulejo, num giro de relógio em cada peça, por cima da página de antes, que fica parada. Dura 0,6 s. Ao voltar, o giro é ao contrário.
- **O sentido** vem do lugar da página no site, e não da ordem da visita (`lib/troca-de-pagina.ts`): a página inicial em cima, depois Trilhas, cada trilha e os artigos dela, na ordem da trilha. Ir mais para dentro, ou para um artigo mais adiante, é avançar; o contrário é voltar, também pelo botão voltar do navegador.
- **O cabeçalho,** quando aparece na tela, fica parado por cima, e só o traço da seção troca, num esmaecer de 200 ms. Com a página rolada, ele vem com a página nova.
- **Os cliques:** as fotos da troca não seguram o clique (`::view-transition { pointer-events: none }`). O que a pessoa clica durante a troca vai para a página nova, que já está embaixo.
- **Quando não anima:** na primeira carga, num link para um trecho da mesma página e no "Tentar de novo" da página de erro. Num navegador sem as View Transitions, a página troca direto; num que não tem os tipos de transição, vira o esmaecer padrão do navegador.
- **Foco e leitor de tela:** nada muda. O foco vai para o título da página nova, ou para o trecho do endereço; a animação é só da tela.
- **Como:** pelas View Transitions do navegador, que o TanStack Router pede em cada navegação (o `defaultViewTransition` do `router.tsx`), com os tipos `folha`, `avancar` ou `voltar` e `moldura-na-tela`. A máscara da foto nova é uma grade de azulejos que se abre com um ângulo animado (`@property --vt`).

### Movimento reduzido
Com `prefers-reduced-motion: reduce`, nada vira, tomba, sobe nem se risca: as peças aparecem no lugar, e os estados trocam direto. O painel não vira com o ponteiro nem sozinho. A barra de leitura sai. A página troca num esmaecer de 160 ms, nos dois sentidos, e o cabeçalho vai direto para o lugar. Tudo continua funcionando: o movimento nunca carrega informação que não esteja também em palavras.

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

### Don't:
- **Don't** fazer "site do governo": burocracia e letra pequena.
- **Don't** fazer "coisa de criança": cor demais e tom infantil. A cor fica nos azulejos e nos números; o resto é papel e tinta.
- **Don't** fazer "jornal partidário": manchete gritando e cor de partido. As fitas são as cinco juntas, pela ordem; nenhuma delas representa um lado.
- **Don't** pôr texto em cima de uma cor de fita.
- **Don't** usar o fundo escuro na página: o Renan recusou em 12/11/2026. A tinta em bloco fica no cabeçalho, no botão e nas etiquetas.
- **Don't** mostrar placar, total de acertos, nota ou ranking, nem animar uma pontuação: a animação comemora o aprender. Os azulejos do quiz seguem a ordem das perguntas.
- **Don't** usar barra de progresso para a trilha: o progresso é o visto e as palavras. A barra do alto do artigo mostra só a rolagem do texto.
- **Don't** usar sombra esfumada, canto arredondado ou degradê suave.
- **Don't** inventar um logo; até o time fazer o dele, o nome em texto é a marca, e o M do nome é o ícone.
- **Don't** usar a vermelha como cor de domingo antes da decisão da issue #39.
- **Don't** trazer uma biblioteca de animação nem imagem para os azulejos: o movimento é do navegador, e o desenho, do CSS.
- **Don't** esconder conteúdo à espera de um script: o que anima na entrada já está no HTML, no lugar.
- **Don't** marcar o lido com um X: ele lê como "errado" ou "cancelado", ainda mais num site com quiz.
- **Don't** prender um tamanho de letra só à largura da tela (`vw` puro): a letra para de crescer com a configuração do navegador.
- **Don't** pôr hífen automático (`hyphens`): a palavra só se parte, sem hífen, quando não cabe sozinha na linha.
- **Don't** deixar uma coluna de texto ao lado de outra com `1fr` puro: com a letra grande, ela cresce até a palavra mais comprida e alarga a página. Use `minmax(0, 1fr)`.
