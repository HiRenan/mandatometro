# Conteúdo das trilhas

Os textos das trilhas ficam em Markdown, em `apps/web/conteudo/trilhas/`. Um artigo novo entra no site com um arquivo novo, sem mexer no código. Mudar um texto vira um PR, que também é a revisão do conteúdo.

## Onde fica cada coisa

```text
apps/web/conteudo/trilhas/
  processo-legislativo/            uma pasta por trilha
    trilha.md                      título, descrição e ordem da trilha
    infografico.md                 o caminho da trilha num infográfico (opcional)
    quem-pode-propor-uma-lei.md    um arquivo por artigo
    onde-o-projeto-comeca.md
```

- **O nome da pasta e o do arquivo viram o endereço da página:** `processo-legislativo/onde-o-projeto-comeca.md` aparece em `/trilhas/processo-legislativo/onde-o-projeto-comeca`. Os nomes só podem ter letras minúsculas sem acento, números e hífens.
- **Renomear um arquivo muda o endereço** e apaga a marca de lido desse artigo para quem já tinha lido, porque o navegador guarda o progresso pelo par `trilha/artigo`.
- **`trilha.md` e `infografico.md` são nomes reservados:** um artigo não pode ter esses nomes.

## A trilha: `trilha.md`

Só o cabeçalho, sem texto:

```markdown
---
titulo: Processo legislativo
descricao: Como uma ideia vira lei no Brasil, passo a passo, do projeto apresentado ao trabalho das comissões.
ordem: 1
---
```

- `titulo`: o nome da trilha.
- `descricao`: uma ou duas frases. Aparece na lista de trilhas, no topo da trilha e na prévia do link.
- `ordem`: a posição na lista de trilhas, um número inteiro a partir de 1, sem repetir.

**A página inicial mostra a trilha `processo-legislativo`,** qualquer que seja o `ordem` dela, com o caminho do `infografico.md` dela. Renomear ou apagar essa pasta faz o teste e o `pnpm build` falharem: sem ela, a página inicial não abre, e o deploy para com o site no ar na versão anterior. Apagar esse infográfico faz o teste falhar.

## O artigo

O cabeçalho fica entre duas linhas com `---`, e o texto vem depois:

```markdown
---
titulo: Onde o projeto começa
resumo: Um projeto de lei precisa ser aprovado nas duas Casas do Congresso. Em regra, quem propõe o projeto define por qual delas ele começa.
ordem: 2
fontes:
  - titulo: Constituição Federal, art. 64
    url: https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art64
    consultadoEm: 2026-11-09
  - titulo: Câmara dos Deputados, Entenda o processo legislativo
    url: https://www.camara.leg.br/entenda-o-processo-legislativo/
    consultadoEm: 2026-11-09
---

O Congresso Nacional tem duas Casas: a Câmara dos Deputados e o Senado Federal.

## Quando o começo é na Câmara

Em regra, o projeto começa na Câmara dos Deputados, a não ser que...
```

- `titulo`: o título do artigo.
- `resumo`: uma ou duas frases. Aparece abaixo do título, na lista da trilha e na prévia do link.
- `ordem`: a posição na trilha, um número inteiro a partir de 1, sem repetir dentro da trilha. Os números podem pular (10, 20, 30), o que deixa espaço para encaixar um artigo no meio depois.
- `fontes`: pelo menos uma. Cada fonte tem:
  - `titulo`: o nome que aparece na lista de fontes, como "Constituição Federal, art. 64";
  - `url`: um link `https` de um site oficial, com o domínio terminado em `gov.br`, `leg.br`, `jus.br`, `mp.br` ou `def.br`;
  - `consultadoEm`: o dia em que a fonte foi conferida, no formato `AAAA-MM-DD`.
- Um campo a mais, ou com o nome errado, também é erro.

## O texto

- **As seções começam com `##`.** O título do artigo vem do cabeçalho, então o texto não usa `#`.
- Parágrafos, listas (`-` ou `1.`), negrito (`**assim**`) e links funcionam. HTML no meio do texto não é interpretado.
- O tempo de leitura é calculado com 200 palavras por minuto, e o mínimo é 1 minuto.
- **Valem as regras de conteúdo do `AGENTS.md`:** tom neutro e apartidário, a fonte oficial em cada explicação e nenhum dado pessoal. A voz é a do `PRODUCT.md`: um professor paciente, que trata a pessoa por "você" e dá o exemplo antes da regra.
- Quando o texto cita um artigo de lei, como "(art. 61)", essa lei entra nas fontes.

## O infográfico: `infografico.md`

O caminho da trilha num desenho: os passos ligados por uma linha cheia, e o que pode mudar o caminho num traço tracejado. Ele aparece na página da trilha, ao lado das folhas a partir de 1024 px de largura e depois delas numa tela menor. É opcional: uma trilha sem `infografico.md` fica com uma coluna só.

Como o `trilha.md`, é só o cabeçalho, sem texto: um texto embaixo dele é erro, porque não apareceria na página. Um infográfico de um passo só ficaria assim (o da trilha do processo legislativo tem cinco):

```markdown
---
titulo: O caminho de um projeto de lei
resumo: Os passos de um projeto de lei ordinária no Congresso, da apresentação à sanção ou ao veto.
passos:
  - titulo: A outra Casa
    texto: A outra Casa revê o projeto em um só turno de discussão e votação. Se ela aprova o texto como chegou, o projeto segue para o presidente da República (art. 65).
    desvios:
      - Se a outra Casa muda o texto, o projeto volta para a Casa onde começou, que analisa só as mudanças e pode ficar com elas ou recuperar o texto original.
      - Se a outra Casa rejeita o projeto, ele é arquivado.
    artigos:
      - onde-o-projeto-comeca
    fontes:
      - titulo: Constituição Federal, art. 65
        url: https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art65
        consultadoEm: 2026-11-10
---
```

- `titulo`: o título do infográfico.
- `resumo`: uma frase, logo abaixo do título.
- `passos`: pelo menos um, na ordem do caminho. Os passos não têm número, para não confundir com o número das folhas. Cada passo tem:
  - `titulo`: o nome do passo, curto;
  - `texto`: o que acontece no passo, em poucas frases;
  - `desvios` (opcional): o que pode mudar o caminho nesse passo, uma frase por desvio, começando com "Se";
  - `artigos` (opcional): os artigos da trilha que explicam o passo, pelo nome do arquivo, sem o `.md`. Cada um vira um link com o número da folha, como "Artigo 2: Onde o projeto começa";
  - `fontes`: pelo menos uma, no mesmo formato das fontes do artigo.
- **Cada passo leva as fontes dele,** porque cada passo é uma explicação. Quando o texto ou um desvio cita um artigo de lei, como "(art. 65)", essa lei entra nas fontes do passo.
- **Um artigo que não existe na pasta é erro,** com a posição do passo, que conta a partir do 0:

  ```text
  conteudo/trilhas/processo-legislativo/infografico.md: campo "passos.3.artigos": o artigo "onde-o-projeto-começa" não existe nesta trilha
  ```

- **Nada se repete,** porque sairia duas vezes na página: dois passos com o mesmo título são erro, e, no mesmo passo, um artigo, um desvio ou uma fonte que aparece duas vezes também. A mesma fonte é o mesmo link, mesmo com outro título. O erro aponta a segunda vez:

  ```text
  conteudo/trilhas/processo-legislativo/infografico.md: campo "passos.1.fontes.2.url": a fonte "https://www.camara.leg.br/entenda-o-processo-legislativo/" já está neste passo
  ```

## Pegadinhas do YAML

- **Um valor com `: ` (dois-pontos seguido de espaço) vai entre aspas:** `titulo: "Lei 14.133: o que muda"`. Sem as aspas, o cabeçalho deixa de ser YAML válido, e o teste aponta o arquivo.
- **Um ` #` (espaço e cerquilha) começa um comentário:** em `titulo: O projeto #1 da trilha`, o título vira só "O projeto", sem aviso nenhum. Um valor com ` #` também vai entre aspas.
- **As fontes ficam recuadas com dois espaços,** com um `-` na frente de cada uma e os três campos alinhados.
- **No infográfico, cada nível recua mais dois espaços:** os passos debaixo de `passos:`, e os desvios, os artigos e as fontes debaixo do passo deles, como no exemplo.

## Palavras compridas nos títulos

Muita gente aumenta a letra do navegador no celular, até 200%. Com a letra grande, cada título diminui só o bastante para a palavra mais larga dele caber na tela inteira, sem se partir no meio. Esse limite foi medido com os títulos de hoje:

| Onde | A palavra mais larga hoje |
|---|---|
| O título da trilha (o `titulo:` do `trilha.md`) | "Constituição" |
| O título do artigo (o `titulo:` do artigo) | "fundamentais?" |
| O intertítulo (cada `##` do texto) | "constitucionalidade" |

Uma palavra mais larga que a da tabela não cabe nem no título menor e se parte no meio com a letra grande. A pontuação colada conta: "fundamentais?" é mais larga que "fundamentais". O que conta é a largura, e não o número de letras: "Participação" tem as mesmas 12 letras de "Constituição" e, mesmo assim, passa do limite do título da trilha, por pouco.

O `pnpm --filter web test` mede cada palavra dos títulos e falha com o arquivo, a palavra e o limite:

```text
conteudo/trilhas/direitos-e-deveres/novo-artigo.md: "inconstitucionalidade" precisa de 8,65 em no intertítulo (##), e o teto é 7,92 em
```

Quando o teste falhar, há duas saídas:

- **Trocar a palavra** por uma mais curta, ou escrever o título de outro jeito.
- **Medir o teto de novo**, se a palavra precisa ficar. Quem cuida do site sobe o `--palavra` do título no código, e o título fica um pouco menor com a letra grande, em todas as trilhas.

Essa medida fica só no teste: ela não derruba o build nem o deploy.

## Como conferir

- **`pnpm --filter web test`** lê a pasta de conteúdo de verdade. Se algo estiver errado, o teste falha com a lista de problemas, cada um com o nome do arquivo:

  ```text
  conteudo/trilhas/processo-legislativo/novo-artigo.md: campo "fontes.0.url": precisa ser um link https de um site oficial (gov.br, leg.br, jus.br, mp.br ou def.br)
  ```

  O CI roda o mesmo teste, então um artigo com problema não passa no PR.
- **`pnpm build`** confere a pasta antes de montar o site e para com a mesma lista. Por isso um artigo com problema também derruba o deploy na Vercel e a imagem do Docker, e o site no ar continua na versão anterior.
- **`pnpm dev`** sobe o site em http://localhost:3001, e o artigo aparece em `/trilhas/<trilha>/<artigo>`. O infográfico aparece em `/trilhas/<trilha>`. Um arquivo novo ou mudado aparece ao recarregar a página, sem reiniciar o `pnpm dev`.

## Como o site lê os arquivos

Quem lê e confere os arquivos é o servidor, em `apps/web/src/lib/conteudo/paginas.server.ts`. O navegador recebe só a página pronta, com o texto já em HTML, e não baixa o código que lê o YAML e o Markdown. O HTML solto no meio do Markdown continua desligado na conversão.

# Segmentação das Trilhas de aprendizagem

## Trilha 1 — Constituição Brasileira: as regras fundamentais do país

**Descrição:** apresenta a Constituição Federal de 1988, sua origem, seus princípios e sua função na organização do Estado. É a base necessária para entender por que existem os três Poderes e de onde vêm os direitos e deveres das pessoas.

### Artigo 1.1 — O que é a Constituição e por que ela importa?

- **Escopo:** explicar o que é uma Constituição; por que ela ocupa o lugar central do sistema jurídico brasileiro; como estabelece limites ao poder do Estado e protege direitos; e a diferença básica entre Constituição e leis comuns. Introduzir as expressões *Constituição Federal* e *Carta Magna*.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal de 1988 (texto atualizado)](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [Senado Federal — acesso à Constituição Federal](https://www25.senado.leg.br/web/atividade/legislacao/constituicao-federal).

### Artigo 1.2 — Como surgiu a Constituição de 1988?

- **Escopo:** contextualizar a redemocratização após o regime militar; apresentar, de forma breve, a Assembleia Nacional Constituinte; registrar a promulgação em 5 de outubro de 1988; e explicar por que o texto ficou conhecido como *Constituição Cidadã*.
- **Referências oficiais:**
  - [Senado Notícias — Constituições brasileiras](https://www12.senado.leg.br/noticias/constituicoes).
  - [Governo Federal — Há 30 anos a Constituição Federal garante cidadania aos brasileiros](https://www.gov.br/pt-br/constituicao-30-anos/textos/ha-30-anos-constituicao-federal-garante-cidadania-aos-brasileiros).

### Artigo 1.3 — Quais são os princípios fundamentais do Brasil?

- **Escopo:** apresentar a República Federativa, o Estado Democrático de Direito e a ideia de que o poder emana do povo; explicar, em linguagem cotidiana, soberania, cidadania, dignidade da pessoa humana, valores sociais do trabalho e da livre iniciativa e pluralismo político; introduzir os objetivos fundamentais da República, como a redução das desigualdades.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, arts. 1º a 4º](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [Governo Federal — Direitos fundamentais e humanos na Constituição de 1988](https://www.gov.br/pt-br/constituicao-30-anos/textos/direitos-fundamentais-e-humanos-marcam-texto-constitucional-de-1988).

### Artigo 1.4 — Como a Constituição é organizada?

- **Escopo:** mostrar como localizar informações no texto constitucional: preâmbulo, títulos, capítulos, artigos, parágrafos e incisos; apresentar os grandes temas (direitos fundamentais, organização do Estado, Poderes, tributação e ordem social); e explicar a finalidade geral do Ato das Disposições Constitucionais Transitórias (ADCT). Usar exemplos de consulta, sem exigir leitura integral da norma.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal e ADCT](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [Senado Federal — texto constitucional e ADCT](https://www25.senado.leg.br/web/atividade/legislacao/constituicao-federal).

### Artigo 1.5 — Como o Brasil se organiza em União, estados, Distrito Federal e municípios?

- **Escopo:** explicar o federalismo e a autonomia dos entes federativos; diferenciar União, estados, Distrito Federal e municípios; introduzir a divisão de competências e responsabilidades, com exemplos simples de serviços públicos; e desfazer a ideia de que todo problema público é atribuição exclusiva do governo federal.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, arts. 18 a 30 (organização político-administrativa e competências)](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).

### Artigo 1.6 — A Constituição pode mudar? Como funcionam as emendas?

- **Escopo:** diferenciar mudança constitucional de criação de uma lei ordinária; explicar quem pode propor uma PEC e sua aprovação em dois turnos em cada Casa do Congresso, por três quintos dos votos; apresentar as cláusulas pétreas e o motivo de existirem limites para alterações constitucionais.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, art. 60](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [Câmara dos Deputados — Entenda o processo legislativo (PEC)](https://www.camara.leg.br/entenda-o-processo-legislativo/).
  - [Governo Federal — Critérios rígidos permitem alterações na Constituição](https://www.gov.br/pt-br/constituicao-30-anos/textos/criterios-rigidos-permitem-alteracoes-na-constituicao-federal).

---

## Trilha 2 — Os Três Poderes: quem decide, executa e julga

**Descrição:** explica o papel do Executivo, do Legislativo e do Judiciário, como eles se distribuem no Brasil e por que precisam atuar com independência e equilíbrio. Ao final, o leitor deve saber distinguir as funções de cada Poder e reconhecer mecanismos básicos de fiscalização.

### Artigo 2.1 — Por que o Brasil tem três Poderes?

- **Escopo:** apresentar a separação entre Executivo, Legislativo e Judiciário; explicar independência e harmonia entre eles; e mostrar por que a divisão de funções ajuda a evitar a concentração de poder. Introduzir o conceito de *freios e contrapesos*, sem ainda detalhar os mecanismos.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, art. 2º](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [Câmara dos Deputados — Consultoria Legislativa: a função legiferante dos três Poderes](https://www2.camara.leg.br/atividade-legislativa/estudos-e-notas-tecnicas/fiquePorDentro/temas/temas-anteriores-desativados-com-texto-da-consultoria/tres_poderes/documento-de-referencia-da-consultoria-legislativa).

### Artigo 2.2 — Onde atuam os Poderes: União, estados e municípios?

- **Escopo:** relacionar a separação dos Poderes aos níveis de governo: Presidência, governos estaduais e prefeituras no Executivo; Congresso, assembleias legislativas e câmaras municipais no Legislativo; e Justiça federal e estadual, além das Justiças especializadas, no Judiciário. Esclarecer que não existe um Poder Judiciário municipal próprio.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, arts. 18, 27 a 29, 44, 76, 92 e 125](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [CNJ — Panorama e estrutura do Poder Judiciário brasileiro](https://www.cnj.jus.br/poder-judiciario/panorama-e-estrutura-do-poder-judiciario-brasileiro/).

### Artigo 2.3 — Poder Executivo: quem governa e administra?

- **Escopo:** explicar a função de administrar e implementar políticas públicas; distinguir presidente, governadores e prefeitos; apresentar o papel de ministros e secretários; e dar exemplos de execução de serviços, gestão de recursos e atribuições do presidente, como sanção e veto de projetos de lei.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, arts. 76 a 91](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).

### Artigo 2.4 — Poder Legislativo: quem faz leis e fiscaliza governos?

- **Escopo:** explicar as duas funções centrais do Legislativo — legislar e fiscalizar; apresentar Câmara dos Deputados e Senado Federal, além dos Legislativos estaduais e municipais; diferenciar deputados federais, senadores, deputados estaduais/distritais e vereadores; e introduzir o acompanhamento do orçamento e dos gastos públicos.
- **Referências oficiais:**
  - [Congresso Nacional — Atribuições](https://www.congressonacional.leg.br/institucional/atribuicoes).
  - [Senado Federal — Atribuições: legislar e fiscalizar](https://www12.senado.leg.br/institucional/documentos/sobre-o-senado/atividade/atribuicoes).
  - [Câmara dos Deputados — Constituição Federal, arts. 44 a 75](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).

### Artigo 2.5 — Como um projeto se transforma em lei?

- **Escopo:** acompanhar, por meio de um exemplo simples, a apresentação de um projeto, a análise em comissões, as votações nas Casas legislativas e, quando cabível, a sanção ou o veto do chefe do Executivo; explicar que há diferentes tipos de proposição e procedimentos e que nem toda norma segue exatamente o mesmo caminho.
- **Referências oficiais:**
  - [Câmara dos Deputados — Entenda o processo legislativo](https://www.camara.leg.br/entenda-o-processo-legislativo/).
  - [Câmara dos Deputados — Constituição Federal, arts. 59 a 69](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).

### Artigo 2.6 — Poder Judiciário: quem resolve conflitos e protege a Constituição?

- **Escopo:** explicar a função de julgar conflitos e garantir a aplicação do Direito; apresentar, sem excesso de siglas, juízes, tribunais, instâncias e recursos; diferenciar STF, STJ, Justiças federal e estadual e Justiças especializadas; e esclarecer que o Judiciário não é responsável por criar políticas públicas como função principal.
- **Referências oficiais:**
  - [CNJ — Panorama e estrutura do Poder Judiciário brasileiro](https://www.cnj.jus.br/poder-judiciario/panorama-e-estrutura-do-poder-judiciario-brasileiro/).
  - [Câmara dos Deputados — Constituição Federal, arts. 92 a 126](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).

### Artigo 2.7 — Como os três Poderes se fiscalizam e se limitam?

- **Escopo:** aprofundar os freios e contrapesos com exemplos: fiscalização legislativa e CPIs; sanção, veto e apreciação de vetos; controle de constitucionalidade pelo Judiciário; e fiscalização das contas públicas. Ressaltar que independência não significa ausência de controle, nem autorização para um Poder assumir livremente a função de outro.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, arts. 49, 58, 66, 70 a 71 e 102](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [Senado Federal — Atribuições e mecanismos de fiscalização](https://www12.senado.leg.br/institucional/documentos/sobre-o-senado/atividade/atribuicoes).
  - [TCU — Conheça o Tribunal de Contas da União](https://portal.tcu.gov.br/conheca-o-tcu).

### Artigo 2.8 — Ministério Público, Defensoria e TCU: são outros Poderes?

- **Escopo:** diferenciar os três Poderes de instituições relevantes para a Justiça e o controle público; explicar, em nível introdutório, a autonomia e a missão do Ministério Público, a assistência jurídica da Defensoria Pública e o auxílio técnico do TCU ao controle externo exercido pelo Congresso. Situar o CNJ como órgão do Judiciário, e não como um quarto Poder.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, arts. 70 a 75, 92, 103-B, 127 a 130-A e 134](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [MPF — A Procuradoria-Geral da República pertence a qual Poder?](https://www.mpf.mp.br/o-mpf/unidades/procuradoria-geral-da-republica-pgr/noticias/me-explica-mpf-a-procuradoria-geral-da-republica-pertence-a-qual-poder).
  - [DPU — Papel constitucional da Defensoria Pública](https://direitoshumanos.dpu.def.br/dpu-completa-29-anos-de-implantacao/).
  - [TCU — Conheça o TCU](https://portal.tcu.gov.br/conheca-o-tcu).

---

## Trilha 3 — Direitos e deveres: como exercer a cidadania

**Descrição:** conecta a Constituição e o funcionamento do Estado à vida cotidiana. Apresenta direitos individuais, sociais e políticos, deveres previstos em lei e maneiras práticas de participar das decisões públicas, solicitar informações e buscar a proteção de direitos.

### Artigo 3.1 — O que significa ser cidadão no Brasil?

- **Escopo:** explicar cidadania como exercício de direitos e responsabilidades na vida coletiva; diferenciar, de forma básica, nacionalidade, direitos fundamentais e direitos políticos; esclarecer que muitos direitos fundamentais protegem também pessoas estrangeiras, enquanto o exercício de direitos políticos depende das regras constitucionais.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, arts. 1º, 5º, 12 e 14](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [Governo Federal — Há 30 anos a Constituição Federal garante cidadania](https://www.gov.br/pt-br/constituicao-30-anos/textos/ha-30-anos-constituicao-federal-garante-cidadania-aos-brasileiros).

### Artigo 3.2 — Quais são os principais direitos individuais e garantias fundamentais?

- **Escopo:** apresentar igualdade perante a lei, vida, liberdade, segurança, propriedade, liberdade de expressão e religião, privacidade e devido processo legal; explicar, com situações comuns, a diferença entre ter um direito e contar com garantias para protegê-lo. Evitar transmitir a ideia de que todos os direitos são absolutos.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, art. 5º](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [Governo Federal — Direitos fundamentais e humanos na Constituição de 1988](https://www.gov.br/pt-br/constituicao-30-anos/textos/direitos-fundamentais-e-humanos-marcam-texto-constitucional-de-1988).

### Artigo 3.3 — Quais são os direitos sociais e o que o Estado deve oferecer?

- **Escopo:** explicar os direitos sociais previstos na Constituição, como educação, saúde, alimentação, trabalho, moradia, transporte, lazer, segurança, previdência e assistência; mostrar que sua concretização envolve políticas públicas e responsabilidades de diferentes esferas de governo; oferecer exemplos simples de onde esses direitos aparecem no cotidiano.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, arts. 6º, 7º, 196, 203 e 205](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [Governo Federal — Há 30 anos a Constituição Federal garante cidadania](https://www.gov.br/pt-br/constituicao-30-anos/textos/ha-30-anos-constituicao-federal-garante-cidadania-aos-brasileiros).

### Artigo 3.4 — Como participar da política: voto, candidatura e decisões coletivas

- **Escopo:** explicar o direito de votar e de concorrer a cargos eletivos, observados os requisitos legais; diferenciar eleições, plebiscito, referendo e iniciativa popular; apresentar as idades e situações de voto obrigatório ou facultativo; e mostrar que a participação política não se resume às eleições.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, arts. 14 a 16](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [TSE — Perguntas frequentes sobre obrigatoriedade do voto](https://www.tse.jus.br/servicos-eleitorais/servicos/ouvidoria-tse).
  - [Governo Federal — Direito ao voto e participação popular](https://www.gov.br/pt-br/constituicao-30-anos/textos/direito-ao-voto-e-participacao-popular-tambem-estao-previstas-na-constituicao).

### Artigo 3.5 — Quais são os deveres básicos de quem vive em sociedade?

- **Escopo:** explicar o dever de cumprir as leis e respeitar os direitos das outras pessoas; distinguir obrigações legais de atitudes desejáveis para a convivência; apresentar a responsabilidade de cumprir obrigações tributárias quando previstas em lei, bem como a função dos tributos no financiamento dos serviços públicos. Evitar afirmar que a Constituição contém uma lista única e exaustiva de “deveres do cidadão”.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, arts. 5º, II, e 145](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [Receita Federal — Programa Cidadania Fiscal](https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/cidadania-fiscal/f_programa-cidadania-fiscal).

### Artigo 3.6 — Quais deveres existem em situações específicas?

- **Escopo:** apresentar as obrigações eleitorais aplicáveis a cada pessoa (alistamento e voto, conforme idade e demais condições legais), o alistamento militar obrigatório nos casos previstos, os deveres relacionados à educação e à proteção de crianças e adolescentes, e a responsabilidade compartilhada de defender o meio ambiente. Deixar claro que essas obrigações não se aplicam da mesma forma a todas as pessoas.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, arts. 14, 143, 205, 225 e 227](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [TSE — Obrigatoriedade e facultatividade do voto](https://www.tse.jus.br/servicos-eleitorais/servicos/ouvidoria-tse).
  - [Ministério da Defesa — Serviço Militar](https://www.gov.br/defesa/pt-br/assuntos/servico-militar).
  - [Governo Federal — Proteção do meio ambiente na Constituição](https://www.gov.br/pt-br/constituicao-30-anos/textos/preservacao-do-meio-ambiente-preocupacao-prevista-na-constituicao).

### Artigo 3.7 — O que fazer quando um direito não é respeitado?

- **Escopo:** apresentar caminhos iniciais para buscar a proteção de direitos: reclamação e requerimento ao órgão responsável, assistência jurídica, Defensoria Pública, Ministério Público e acesso ao Judiciário; introduzir, sem tecnicismos, direito de petição, acesso à Justiça e garantia de assistência jurídica gratuita a quem comprovar insuficiência de recursos. Explicar que o canal adequado depende da situação.
- **Referências oficiais:**
  - [Câmara dos Deputados — Constituição Federal, art. 5º, XXXIV, XXXV e LXXIV; arts. 127 e 134](https://www2.camara.leg.br/atividade-legislativa/legislacao/constituicao1988).
  - [DPU — Papel constitucional da Defensoria Pública](https://direitoshumanos.dpu.def.br/dpu-completa-29-anos-de-implantacao/).
  - [MPF — Sobre o Ministério Público](https://mandaareal.mpf.mp.br/sobre-o-mp).

### Artigo 3.8 — Como fiscalizar o governo e participar além do voto?

- **Escopo:** demonstrar a participação em audiências e consultas públicas, conselhos e ouvidorias; explicar o controle social dos gastos e serviços públicos; mostrar como solicitar informações pela Lei de Acesso à Informação (LAI) e enviar manifestações aos órgãos públicos. Distinguir pedidos de informação de reclamações, sugestões e denúncias; apresentar o **Informa.BR** para pedidos federais de informação e o **Fala.BR** para manifestações de ouvidoria, conforme os canais oficiais vigentes.
- **Referências oficiais:**
  - [CGU — Capacitações para o exercício do controle social](https://www.gov.br/cgu/pt-br/governo-aberto/capacitacoes-da-cgu-para-o-exercicio-do-controle-social).
  - [Governo Federal — Registrar pedido de acesso à informação no Informa.BR](https://www.gov.br/pt-br/servicos/acessar-informacoes-de-orgaos-publicos).
  - [CGU — Plataforma Fala.BR](https://www.gov.br/ouvidorias/pt-br/falabr).
  - [Casa Civil — Participação social](https://www.gov.br/casacivil/pt-br/acesso-a-informacao/participacao-social).

---

## Observações para a produção dos artigos

1. **Linguagem:** escrever para iniciantes, traduzindo os termos jurídicos na primeira menção e ilustrando os temas com exemplos do cotidiano.
2. **Neutralidade:** explicar instituições, regras e procedimentos sem defender partidos, candidatos ou posições político-partidárias.
3. **Precisão:** distinguir direitos de deveres juridicamente exigíveis, práticas recomendadas de cidadania e responsabilidades do Estado. Evitar afirmar que todo direito ou dever se aplica a todas as pessoas de forma idêntica.
4. **Atualização:** conferir a redação vigente da Constituição, a legislação eleitoral e os canais digitais antes de publicar cada artigo. Algumas páginas institucionais são materiais didáticos históricos; em caso de diferença, prevalece o texto normativo vigente.
5. **Progressão:** não repetir artigos completos em diferentes trilhas; quando necessário, fazer remissões entre os conteúdos (por exemplo: artigo 2.1 → artigo 1.3; artigo 3.4 → artigos 2.3 e 2.4).
