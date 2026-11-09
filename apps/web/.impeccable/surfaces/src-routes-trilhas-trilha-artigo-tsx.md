---
version: 1
slug: "src-routes-trilhas-trilha-artigo-tsx"
primary_target: "src/routes/trilhas/$trilha/$artigo.tsx"
related_targets: ["src/routes/trilhas/index.tsx","src/routes/trilhas/$trilha/index.tsx"]
---

# Trilhas e artigos

**Modo:** Read. **Alvos:** `/trilhas`, `/trilhas/<trilha>` e `/trilhas/<trilha>/<artigo>`, mais o cabeçalho do site e a página de não encontrado. **Tarefa:** a #36, as páginas das trilhas e dos artigos, com o progresso salvo no navegador, pedida pelo Renan em 09/11/2026.

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
  - o quiz (#37) e o infográfico (#38);
  - a página inicial (#35), a inscrição (#21) e as edições (#39);
  - o login (#30) e a API.

## States and copy

- **Progresso:**
  - antes da hidratação, a página não sabe o progresso e mostra a trilha como nova;
  - depois, "Você leu 1 de 3", "Continuar de onde parou" e "Você terminou a trilha".
- **No artigo:** o "Você leu este artigo" aparece ao chegar ao fim do texto. A navegação traz o anterior e o próximo, e no último, a volta à trilha.

## Unresolved decisions

- **A domingueira das edições (#39):** a cor e o lugar dos domingos ficam para a issue das edições.
- **O logo:** vem depois. Até lá, o nome em texto faz o papel da marca.

## Direction contract

THESIS: A trilha é uma folhinha de parede. Cada artigo é uma folha do bloco: o número grande diz onde a pessoa está, e a folha lida é riscada com um X. Recusa o site educativo de cards arredondados com barra de progresso.

OWN-WORLD:
- **Papel e tinta:** papel branco e tinta preta.
- **A moldura:** o cartão da folhinha é uma faixa preta com o nome e o lema. Logo abaixo, no lugar do picote, vem a tira das fitas do Bonfim: verde #00A650, amarelo #FFD200, azul #0067B1, rosa #E6007E e vermelho #E30613. Cada artigo tem a sua fita, pela ordem.
- **A letra:** numerais e títulos num grotesco condensado bem preto (Archivo); o texto corrido numa serifa de leitura (Literata).
- **As regras que vieram dos desafiantes:**
  - tintas chapadas, sem degradê nem sombra (cartaz);
  - uma grade de etiqueta só (caixas de tênis);
  - estado escrito em palavras (ciclorama);
  - nada de cards em volta dos itens (tela de demo);
  - estado é marca no papel: X no lido e canto dobrado onde parou (mesa de corte).

STORY:
- **O caminho:** a pessoa vê onde está, quanto tempo leva e que tudo tem fonte. Lê até o fim, segue para a próxima folha ou volta outro dia de onde parou.
- **O momento:** quando o fim do texto aparece na tela, o X é desenhado sobre o número da folha em "Nesta trilha", num traço de 400 ms, e surge "Você leu este artigo". Com o movimento reduzido, o X aparece sem animação. É o único movimento das páginas.

FIRST VIEWPORT:
- **No computador, de cima para baixo:**
  - o cartão preto com Mandatômetro, o lema, Início e Trilhas;
  - a tira de fitas;
  - o caminho Trilhas / Processo legislativo.
- **Abaixo, em três colunas:**
  - à esquerda, o número do artigo gigante, com "de 3 artigos" sublinhado na cor da fita e o miúdo (trilha, leitura, fontes);
  - no centro, o título condensado, o resumo, a linha com o tempo e o aviso das fontes, e o texto, a cerca de 64 caracteres;
  - à direita, "Nesta trilha": as folhas em ordem, cada uma com a sua fita, o lido riscado e "Você está aqui" de canto dobrado.
- **No celular:** o número encolhe para o lado do título, e "Nesta trilha" desce para depois das fontes.

FORM: a folhinha de arrancar das padarias, a 5ª da lista ordenada, com a paleta das fitas do Bonfim. seed:0b322b8c4550df91

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
