# Jogo das Comissões

O jogo conta, em cinco cenas, a tramitação real do PL 104/2015, que virou a [Lei nº 15.100, de 2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/Lei/L15100.htm), sobre o uso de celular nas escolas. Em cada cena a pessoa decide o próximo passo e depois vê o que aconteceu de verdade, com o link da fonte oficial. Ele fica em `/jogos/comissoes`, fora da trilha, e o fim do quiz final da trilha do processo legislativo leva direto até lá, sem passar pela lista: assim a medição do piloto não muda ([medição do piloto](medicao-do-piloto.md)). O `/jogos` é a lista dos jogos, com uma folha por jogo.

O projeto escolhido passa por quase tudo que a trilha ensina: arquivamento e desarquivamento, duas comissões, poder conclusivo, prazo de recurso, mudança de número entre as Casas, urgência, votação simbólica e sanção sem vetos.

## Os personagens e o aviso

Lia Moraes, deputada federal fictícia no primeiro mandato, acompanha o projeto. Arnaldo, consultor legislativo veterano, explica as regras. Caio, assessor de um deputado do outro lado do debate, apresenta os argumentos contrários com respeito: é rival, não vilão.

A abertura avisa, em texto: "Lia, Arnaldo e Caio são personagens fictícios. Datas, votos e documentos são reais e têm link para a fonte oficial."

## As duas naturezas de decisão

| Natureza | O que é | Tem resposta certa? | Depois da escolha |
| --- | --- | --- | --- |
| Regra | Qual instrumento do regimento ou da Constituição resolve a situação | Sim | O Arnaldo explica por que cada opção está certa ou errada, com o artigo |
| Opinião | Como a pessoa votaria | Não | O jogo repete a escolha e mostra o resultado real, sem julgar |

São seis decisões de regra (1.1, 2.1, 3.2, 4.1, 4.2 e 5.1) e quatro de opinião (2.2, 3.1, 4.3 e 5.2). O `roteiro.test.ts` prende essas contas.

## Regras de conteúdo

- **Nenhum parlamentar real é nomeado**, nem nas falas nem nas revelações: vale o cargo, como "o autor", "o relator" ou "quatro deputados de partidos diferentes". É a regra de [dados pessoais](dados-pessoais.md) das trilhas, e quem quiser os nomes os encontra na ficha oficial que cada revelação linka.
- **Nenhum parlamentar real aparece desenhado.**
- **Toda cena com debate mostra o melhor argumento dos dois lados**, com o mesmo espaço.
- **A decisão de opinião nunca é "certa" ou "errada"**, e o jogo não dá ponto por concordar com o resultado real.
- **Não há nota, placar de acertos nem ranking** (`DESIGN.md`, Don'ts). A tela final mostra o caminho percorrido e as seis decisões de regra uma a uma, com o artigo e se a escolha foi a do regimento. O placar que aparece é o **da votação**, que é fato público, e fica em tinta.
- **Toda afirmação sobre datas, votos e documentos leva a fonte oficial**, nos domínios que o leitor de conteúdo aceita (`gov.br`, `leg.br`, `jus.br`, `mp.br` e `def.br`).

## O formato dos arquivos

O roteiro fica em `apps/web/conteudo/jogo/<jogo>/`, uma pasta por jogo, e é só cabeçalho YAML: não há texto embaixo dele. O leitor é `apps/web/src/lib/jogo/ler.ts`, com zod estrito — campo a mais é erro —, e o `pnpm build` confere os arquivos pelo mesmo caminho das trilhas (`lib/conteudo/conferir.ts`), com o arquivo e o problema em cada linha.

### `jogo.md`

O título, o resumo, o cenário da abertura, o aviso, os três personagens (com `nome` e `quem`), as `casas` do caminho do projeto, o `epilogo` ("O que a lei mudou", com um `dispositivo` por item) e as `pendencias`.

### Um arquivo por cena

`cena` (o número), `titulo`, `cenario`, `casa` (uma das do `jogo.md`), `artigo` (o arquivo de um artigo da trilha do processo legislativo, sem o `.md`), `passos` e `revelacao`.

As `casas` do `jogo.md` são as mesmas do infográfico "O caminho de um projeto de lei" — Apresentação, Comissões, Plenário, A outra Casa e Sanção ou veto —, e é de lá que vem o azulejo de cada uma, com o símbolo do passo (`simboloDoPasso`, em `lib/simbolos.ts`). Mudou um nome no infográfico, mude aqui também: sem o par, a casa fica com o azulejo da posição, sem símbolo.

Cada passo tem um `tipo`:

| `tipo` | Campos | O que faz |
| --- | --- | --- |
| `fala` | `id`, `quem`, `expressao`, `texto`, `item`, `etiqueta` | Uma fala na caixa de diálogo. `quem` é `narracao`, `lia`, `arnaldo` ou `caio`; a narração não leva expressão, e os outros levam uma das que têm desenho. O `item` mostra um item de cena, e a `etiqueta` é o texto dele, escrito aqui e não na imagem |
| `decisao` | `natureza`, `id`, `pergunta`, `opcoes` e o resto conforme a natureza | A decisão. Na de regra, cada opção tem `resultado` (`certa`, `funciona-mas-perde` ou `errada`) e `explicacao`, e a decisão tem `resumo` e `fundamento`, que a tela final mostra; na de opinião, as opções são só `texto`, e a decisão tem `eco` (`votou` ou `escolheu`) e `desfecho` |
| `painel` | `modo` e, no `nominal`, `sim`, `nao` e `data`; no `simbolico`, `selo` | O painel do plenário. O `nominal` conta até os votos reais; o `simbolico` não mostra número nenhum, como foi no Senado |
| `relogio` | `sessoes`, `fundamento`, `legenda` | O prazo em sessões, como o do recurso ao Plenário |
| `carimbo` | `selo`, `legenda` | Um carimbo fora de decisão, como o "Segue para o Senado" |

O `id` de cada fala (`c1-03`) é o nome do arquivo de narração: **ele não muda**. O número dele é o da cena, e o leitor recusa um id fora da cena, repetido ou fora do formato.

### Os carimbos

`pedido-de-vista`, `recurso-ao-plenario`, `segue-para-o-senado`, `urgencia`, `aprovado` e `sancionado`. Cada um é um componente em `apps/web/src/components/jogo/carimbos.tsx`, com o texto escrito no código, não numa imagem: dá para traduzir, ajustar e ler com leitor de tela. O texto fica em tinta, e a cor da fita só contorna o selo.

## Os assets

Em `apps/web/public/jogo/`: `bg/` (6 cenários de 1920×1080), `personagens/` (12 retratos de 1024×1536, com fundo transparente), `itens/` (3 itens até 800 px) e `audio/` (a trilha em loop e cinco efeitos, em OGG). As imagens e o áudio foram produzidos pelo time para o jogo.

As expressões com desenho são as que o roteiro usa:

| Personagem | Expressões |
| --- | --- |
| Lia | `confiante`, `surpresa`, `preocupada`, `pensativa`, `sorrindo` |
| Arnaldo | `neutro`, `explicando`, `sorrindo`, `serio` |
| Caio | `argumentando`, `desafiando`, `cumprimentando` |

O `roteiro.test.ts` confere que existe o arquivo de cada expressão, cenário e item que uma fala pede, e o leitor recusa uma expressão que não está na lista.

O som **vem ligado**, e quem não quiser desliga no botão do pé do palco; a escolha fica guardada naquele navegador. O navegador só deixa tocar depois de um toque ou de uma tecla, então a trilha de fundo começa no primeiro clique da pessoa, e não ao abrir a página. O texto na tela continua funcionando sozinho, sem o som.

As folhas de referência de arte (`ref-lia`, `ref-arnaldo` e `ref-caio`) e o PDF do roteiro são material de produção e ficam fora do repositório.

## A narração

Cada fala leva uma `emocao`, que é a direção de voz — como a frase é dita. Ela não muda nada na tela: o retrato continua vindo da `expressao`, e as duas podem diferir (a Lia pensativa pergunta "E se ele concordar com quase tudo, menos um artigo?" com curiosidade). São treze: `solene`, `neutro`, `didatico`, `curioso`, `surpreso`, `preocupado`, `pensativo`, `confiante`, `caloroso`, `serio`, `firme`, `respeitoso` e `aliviado`. O leitor recusa uma fala sem emoção ou com uma que não esteja na lista.

As vozes são do catálogo da ElevenLabs, todas brasileiras, uma por personagem:

| Quem | Voz |
| --- | --- |
| Narração | Carlos — Resonant & Majestic Storyteller |
| Lia | Raquel — Expressive and Energetic |
| Arnaldo | Leonardo — Deep & Resonant |
| Caio | Will — Deep, Smooth and Affectionate |

Nenhuma delas imita pessoa real, como o roteiro pede.

**Para gravar**, com a `ELEVENLABS_API_KEY` no `.env` da raiz:

```bash
pnpm --filter web vozes                 # grava o que ainda não tem arquivo
pnpm --filter web vozes -- --so c1-01   # só uma fala, para ouvir antes
pnpm --filter web vozes -- --refazer    # regrava tudo
pnpm --filter web vozes -- --modelo eleven_v3
```

O script lê o roteiro, manda cada fala com a voz do personagem e a direção da emoção — estabilidade e estilo nos modelos de hoje, e a marca entre colchetes (`[curious]`) no `eleven_v3` —, grava `public/jogo/vo/<id>.mp3` e refaz a lista de `src/lib/jogo/vozes.ts`. **A tela só toca o que está nessa lista**, então o jogo roda igual com narração parcial ou nenhuma: a fala sem arquivo simplesmente não tem voz, e o bipe da máquina de escrever volta no lugar dela. A chave vem do ambiente e não aparece no log.

**O plano gratuito da ElevenLabs não sintetiza pela API** (`402 paid_plan_required`, inclusive com as vozes nativas): a gravação precisa de uma conta paga.

## Pendências

- Ler a redação atual completa do art. 105 do Regimento Interno da Câmara antes de publicar a explicação da decisão 1.1 palavra por palavra. O Regimento não tem texto no normas.leg.br, e a versão em vigor é o arquivo "atualizado até a Resolução nº 34, de 2026", em `www2.camara.leg.br` ([conteúdo das trilhas](conteudo-das-trilhas.md)).

## Fontes conferidas em 20/11/2026

- [Ficha e tramitação do PL 104/2015 na Câmara](https://www.camara.leg.br/propostas-legislativas/945492)
- [Ficha e tramitação do PL 4.932/2024 no Senado](https://www25.senado.leg.br/web/atividade/materias/-/materia/166801)
- [Notas taquigráficas da sessão do Senado de 18/12/2024](https://www25.senado.leg.br/web/atividade/notas-taquigraficas/-/notas/s/430902)
- [Câmara: principais prazos do processo legislativo](https://www2.camara.leg.br/atividade-legislativa/plenario/contagem-de-prazos/principais-prazos-do-processo-legislativo)
- [Lei nº 15.100, de 13 de janeiro de 2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/Lei/L15100.htm)
- [Clipping do Senado: a versão da Comissão de Educação](https://www2.senado.leg.br/jspui/bitstream/id/962141/1/noticia.html)
