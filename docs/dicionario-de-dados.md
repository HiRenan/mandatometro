# Dicionário de dados: Câmara e Senado

O que cada API devolve, quais campos usamos e como os registros se ligam. É a referência do modelo de dados (#7) e dos conectores (#10 e #11).

**Conferido em:** 11/11/2026, por chamada real a cada endpoint, e de novo em 16/11/2026, nas correções da revisão (#90). As respostas completas estão em [`apps/backend/tests/fixtures/`](../apps/backend/tests/fixtures/), e os testes offline leem de lá.

Bases, as duas sem chave de acesso:

- **Câmara:** `https://dadosabertos.camara.leg.br/api/v2`
- **Senado:** `https://legis.senado.leg.br/dadosabertos`

O TSE entra depois do MVP, nas issues #12 e #13.

## Como ler este documento

Cada endpoint tem a URL que usamos, uma tabela de campos e um exemplo real recortado. Na coluna **Usamos**:

- **sim** — vai para o banco e pode aparecer no site ou na newsletter;
- **chave** — id público da Câmara ou do Senado, que serve para casar os registros. Não é dado pessoal: pode ir a um log, como em "coletando a votação 2637478-26". A exceção é o aviso de código de voto desconhecido, que leva a votação, e não a pessoa nem o código (`AGENTS.md`, "Dados pessoais");
- **só ligação, não exibir** — dado pessoal que serve só para ligar registros entre bases. No MVP, o conector não grava: a ligação por CPF só entra com o TSE, depois do MVP (#12 e #13). Quando entrar, fica no banco e nunca aparece na API, no site, nos logs nem nas respostas gravadas (ver [Campos pessoais](#campos-pessoais));
- **não** — existe na resposta e não vamos usar agora.

## Regras que valem para as duas APIs

- **Timeout e nova tentativa com backoff.** A API da Câmara devolve 504 de vez em quando.
- **User-Agent identificando o projeto:** `mandatometro (Hack Brasil 2026)`. A coleta respeita o `robots.txt`.
- **As respostas são UTF-8, e nenhuma das duas APIs declara o charset:** as duas mandam `content-type: application/json`, sem `charset`. Decodifique explicitamente como UTF-8: um cliente que confie no padrão do sistema embaralha os acentos no Windows.
- **A coleta roda em lote, fora do caminho das requisições de usuário** (ver `AGENTS.md`).
- **Toda informação guardada leva a fonte:** a URL e a data da coleta.

## As duas APIs lado a lado

As diferenças abaixo não são detalhe de implementação: elas mudam o desenho do conector.

| | Câmara | Senado |
|---|---|---|
| Envelope | `{"dados": [...], "links": [...]}` | sem envelope comum: o `/votacao` é um **array JSON puro**, e a lista de senadores, o `mandatos.json` e o `/processo/{id}` vêm dentro de um objeto |
| Chamadas para montar um item da newsletter | **4** (lista → detalhe → votos → orientações) | **1** (`/votacao` já traz tudo) |
| Paginação | 100 itens por página, siga `links[rel=next]` | sem paginação nos endpoints que usamos |
| Formato de data | `dataInicio=2026-11-03` | `dataInicio=2026-11-03` (**`20261103` devolve HTTP 400**) |
| Quem aparece na lista de votos | **só quem votou** (429 de 513 deputados, no exemplo) | **todos os 81 senadores**, com o estado de cada um |
| Totais de Sim/Não | não existem: conte os votos | os campos existem, mas **vêm `null`**: conte os votos |
| Resultado | `aprovacao`, inteiro `1`/`0` | `resultadoVotacao`, letra (`"A"` no exemplo) |
| Orientação de bancada | `/votacoes/{id}/orientacoes` | não encontrada nos endpoints que usamos |

## Chaves de ligação

```text
CÂMARA
  votacao.id = "2637478-26"            <- o prefixo é o id da proposição votada,
      |                |                  que pode ser um requerimento (aviso 1)
      |                └─ sequencial da votação dentro da proposição
      ├─ proposicoesAfetadas[].id ─────> /proposicoes/{id}   <- a matéria: use este
      └─ votos[].deputado_.id ────────> /deputados/{id}

SENADO
  votacao.idProcesso = 9006525 ────────> /processo/{id}
  votacao.codigoMateria = 172997        (id da matéria, outro número)
  votacao.votos[].codigoParlamentar ──> CodigoParlamentar de /senador/lista/atual.json
                                        e /senador/{cod}/mandatos.json

ENTRE AS DUAS CASAS: não existe id em comum.
  Ligue por sigla + numero + ano (ex.: PEC 18/2025),
  conferindo siglaCasaIniciadora e identificacaoProcessoInicial.
```

Três avisos sobre essas chaves:

1. **O prefixo do id da votação da Câmara é a proposição votada, que nem sempre é a matéria.** Em `2637478-26`, o `2637478` é o PL 3507/2026, o `26` é o sequencial, e o `proposicoesAfetadas[0].id` também é `2637478`. Nas urgências e nos recursos, porém, o que se vota é o requerimento ou o recurso, e o prefixo é o dele: `2637487-7` é a urgência do PL 3507/2026, o prefixo `2637487` é o REQ 3721/2026, e o `proposicoesAfetadas` traz o PL (`2637478`). Na semana do exemplo, foram 6 das 27 votações (4 urgências e 2 recursos), e derivar a matéria pelo prefixo erraria nas 6. **Use o `proposicoesAfetadas`** do detalhe, que é uma lista: no recurso `2332871-17`, ele trouxe o PL e o próprio recurso.
2. **No Senado, `idProcesso` e `codigoMateria` são números diferentes** para a mesma matéria. Quem resolve `/processo/{id}` é o `idProcesso`.
3. **Entre as Casas não há id compartilhado.** O `/processo/{id}` traz `outrosNumeros[].idOutroProcesso`, mas esse número continua sendo um id do Senado para a versão da Câmara — não é o `idProposicao` da Câmara. Na PEC 18/2025, o Senado usa `9006525` para a própria tramitação e `9006524` para a da Câmara; nenhum dos dois aparece na API da Câmara. **A ligação possível é por tipo, número e ano.**

## Câmara dos Deputados

### `/votacoes` — as votações do plenário no período

```text
/votacoes?idOrgao=180&dataInicio=2026-11-03&dataFim=2026-11-07&itens=100&ordem=DESC&ordenarPor=dataHoraRegistro
```

`idOrgao=180` é o Plenário. A semana de 03 a 07/11/2026 teve 27 votações.

| Campo | Tipo | O que é | Usamos |
|---|---|---|---|
| `id` | texto | id da votação, no formato `{idProposicao}-{sequencial}`; a proposição do prefixo pode ser um requerimento (ver o aviso 1, em "Chaves de ligação") | chave |
| `data` | data | dia da votação | sim |
| `dataHoraRegistro` | data e hora | momento do registro; serve para ordenar | sim |
| `siglaOrgao` | texto | `PLEN` para o plenário | sim |
| `descricao` | texto | o que foi votado, em texto livre | sim |
| `aprovacao` | inteiro | `1` aprovada, `0` rejeitada | sim |
| `proposicaoObjeto` | texto | o requerimento ou o recurso votado (`"REQ 3721/2026"`), nas urgências e nos recursos; **`null` nas outras votações** (21 das 27 da semana) | não |
| `uri`, `uriOrgao`, `uriEvento` | texto | links para os outros recursos | não |

```json
{
  "id": "2637478-26",
  "data": "2026-11-05",
  "dataHoraRegistro": "2026-11-05T11:37:08",
  "siglaOrgao": "PLEN",
  "proposicaoObjeto": null,
  "descricao": "Aprovado o Projeto de Lei nº 3.507, de 2026.",
  "aprovacao": 1
}
```

**Pegadinha:** `proposicaoObjeto` vem `null` na maioria das votações. Nas urgências e nos recursos, ele traz o requerimento ou o recurso votado, e não a matéria. A matéria só aparece no detalhe, em `proposicoesAfetadas`.

### `/votacoes/{id}` — a proposição que foi votada

```text
/votacoes/2637478-26
```

| Campo | Tipo | O que é | Usamos |
|---|---|---|---|
| `proposicoesAfetadas[]` | lista | **a proposição de fato votada**, com `id`, `siglaTipo`, `numero`, `ano` e `ementa` | sim |
| `objetosPossiveis[]` | lista | outros textos em pauta na sessão | não |
| `descricao` | texto | igual à da lista | sim |
| `aprovacao` | inteiro | igual ao da lista | sim |
| `ultimaApresentacaoProposicao` | objeto | o parecer lido em plenário | não |
| `descUltimaAberturaVotacao` | texto | ex.: "Votação em turno único" | sim |
| `efeitosRegistrados` | lista | veio vazia no exemplo | não |

```json
{
  "id": "2637478-26",
  "descUltimaAberturaVotacao": "Votação em turno único.",
  "proposicoesAfetadas": [
    {
      "id": 2637478,
      "siglaTipo": "PL",
      "numero": 3507,
      "ano": 2026,
      "ementa": "Reconhece o artesanato tradicional do Estado do Maranhão como manifestação da cultura nacional."
    }
  ]
}
```

**Pegadinha:** `objetosPossiveis` **não** é `proposicoesAfetadas`. No exemplo, `objetosPossiveis` trazia quatro itens, nenhum deles o PL: um PRLP (Parecer Preliminar de Plenário), um PPP (Parecer Proferido em Plenário), um RDF (Redação Final) e o REQ 3721/2026, a urgência. O `proposicoesAfetadas` trazia o PL votado. Use `proposicoesAfetadas`.

### `/votacoes/{id}/votos` — o voto de cada deputado

```text
/votacoes/2236186-60/votos
```

| Campo | Tipo | O que é | Usamos |
|---|---|---|---|
| `tipoVoto` | texto | `Sim`, `Não` ou `Artigo 17` | sim |
| `dataRegistroVoto` | data e hora | quando o voto foi registrado | sim |
| `deputado_.id` | inteiro | id do deputado — **o campo tem underscore no fim** | chave |
| `deputado_.nome` | texto | nome parlamentar | sim |
| `deputado_.siglaPartido` | texto | partido na hora do voto | sim |
| `deputado_.siglaUf` | texto | UF | sim |
| `deputado_.email`, `urlFoto`, `uriPartido` | texto | — | não |
| `deputado_.idLegislatura` | inteiro | a legislatura (`57`) | não |

```json
{
  "tipoVoto": "Sim",
  "dataRegistroVoto": "2026-10-14T20:52:43",
  "deputado_": {
    "id": 220588,
    "nome": "Roberto Duarte",
    "siglaPartido": "REPUBLICANOS",
    "siglaUf": "AC"
  }
}
```

Três coisas para o conector:

- **Só existe em votação nominal, e elas são raras:** 2 em 66 votações do plenário entre 01/10 e 07/11/2026. Nas outras, a resposta é **HTTP 200 com `"dados": []`**, não 404. Lista vazia não é erro.
- **Só aparece quem votou.** O exemplo tem 429 votos, de 513 deputados. Ausência não vem como registro.
- **`tipoVoto` tem um terceiro valor:** `Artigo 17`, uma vez no exemplo, que é o voto do presidente da sessão pelo art. 17 do Regimento Interno. Não trate o campo como booleano.

### `/votacoes/{id}/orientacoes` — como cada bancada orientou

```text
/votacoes/2236186-60/orientacoes
```

| Campo | Tipo | O que é | Usamos |
|---|---|---|---|
| `siglaPartidoBloco` | texto | partido ou bloco; inclui `Governo`, `Maioria`, `Minoria` e `Oposição` | sim |
| `orientacaoVoto` | texto | `Sim`, `Não` ou **texto vazio** quando a bancada liberou ou não orientou | sim |
| `codTipoLideranca` | texto | `P` partido, `B` bloco ou bancada | sim |
| `codPartidoBloco`, `uriPartidoBloco` | — | `null` para as bancadas que não são partido | chave |

```json
{ "orientacaoVoto": "Não", "codTipoLideranca": "B", "siglaPartidoBloco": "Governo", "codPartidoBloco": null }
```

**Pegadinha:** no exemplo, 7 das 15 orientações vinham com `orientacaoVoto` como **string vazia**, não `null`. Ao exibir, trate vazio como "sem orientação".

### `/proposicoes/{id}` — a ementa e o inteiro teor

```text
/proposicoes/2637478
```

| Campo | Tipo | O que é | Usamos |
|---|---|---|---|
| `id` | inteiro | id da proposição | chave |
| `siglaTipo`, `numero`, `ano` | — | identificação (`PL 3507/2026`); **é a chave entre as Casas** | sim |
| `ementa` | texto | o resumo oficial | sim |
| `ementaDetalhada` | texto | veio vazia no exemplo | não |
| `keywords` | texto | palavras-chave separadas por vírgula | sim |
| `urlInteiroTeor` | texto | PDF do texto integral — é o que o Firecrawl vai ler (#9) | sim |
| `dataApresentacao` | data e hora | quando foi apresentada | sim |
| `statusProposicao` | objeto | situação atual e último relator | sim |
| `texto`, `justificativa`, `urnFinal`, `uriPropPrincipal` | — | — | não |

```json
{
  "id": 2637478,
  "siglaTipo": "PL",
  "numero": 3507,
  "ano": 2026,
  "ementa": "Reconhece o artesanato tradicional do Estado do Maranhão como manifestação da cultura nacional.",
  "urlInteiroTeor": "https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=3157723",
  "dataApresentacao": "2026-07-07T09:17"
}
```

### `/deputados` e `/deputados/{id}` — quem são os deputados

```text
/deputados?itens=100          lista os deputados em exercício
/deputados/178843             traz os campos que só existem no detalhe
```

A lista traz `id`, `nome`, `siglaPartido`, `siglaUf`, `idLegislatura`, `email`, `urlFoto`, `uri` e `uriPartido`, sem CPF nem data de nascimento. São 100 deputados por página: em 16/11/2026, os 513 vinham em 6 páginas, seguindo `links[rel=next]`.

```json
{
  "id": 178843,
  "nome": "Marx Beltrão",
  "siglaPartido": "UNIÃO",
  "siglaUf": "AL",
  "idLegislatura": 57
}
```

O detalhe acrescenta:

| Campo | Tipo | O que é | Usamos |
|---|---|---|---|
| `id` | inteiro | id do deputado | chave |
| `nomeCivil` | texto | nome completo | sim |
| `ultimoStatus.nome` | texto | nome parlamentar | sim |
| `ultimoStatus.siglaPartido`, `siglaUf` | texto | partido e UF atuais | sim |
| `ultimoStatus.situacao`, `condicaoEleitoral` | texto | ex.: `Exercício`, `Titular` | sim |
| `ultimoStatus.gabinete` | objeto | sala e telefone | não |
| `urlWebsite`, `redeSocial` | — | site e redes; servem para as promessas, depois do MVP | não |
| `sexo`, `municipioNascimento`, `ufNascimento`, `escolaridade` | texto | — | não |
| **`cpf`** | texto | **dado pessoal** | **só ligação, não exibir** |
| **`dataNascimento`** | data | **dado pessoal** | **só ligação, não exibir** |

```json
{
  "id": 178843,
  "nomeCivil": "MARX BELTRÃO LIMA SIQUEIRA",
  "cpf": "00000000000",
  "dataNascimento": "1970-01-01",
  "ultimoStatus": {
    "nome": "Marx Beltrão",
    "siglaPartido": "UNIÃO",
    "siglaUf": "AL",
    "situacao": "Exercício",
    "condicaoEleitoral": "Titular"
  }
}
```

> O `cpf` e o `dataNascimento` do exemplo **são fictícios**, trocados de propósito. Veja [Campos pessoais](#campos-pessoais).

## Senado Federal

### `/votacao` — a votação e os votos numa chamada

```text
/votacao?dataInicio=2026-11-03&dataFim=2026-11-07
```

Devolve um **array JSON puro**, sem envelope. A semana de 03 a 07/11/2026 teve 4 votações.

| Campo | Tipo | O que é | Usamos |
|---|---|---|---|
| `idProcesso` | inteiro | id do processo → `/processo/{id}` | chave |
| `codigoMateria` | inteiro | id da matéria, **diferente** do `idProcesso` | chave |
| `identificacao` | texto | ex.: `PEC 18/2025` | sim |
| `sigla`, `numero`, `ano` | — | a identificação em partes; **chave entre as Casas** | sim |
| `ementa` | texto | resumo da matéria | sim |
| `descricaoVotacao` | texto | o que foi votado nesta votação | sim |
| `dataSessao` | data | dia da sessão | sim |
| `resultadoVotacao` | texto | letra; `"A"` nas quatro do exemplo | sim |
| `votacaoSecreta` | texto | `"N"` ou `"S"` | sim |
| `totalVotosSim` / `Nao` / `Abstencao` | inteiro | **vieram `null` nas quatro** | não |
| `votos[]` | lista | o estado de cada um dos 81 senadores | sim |
| `codigoSessaoVotacao`, `sequencialVotacao` | inteiro | ids da votação, globais, crescentes e únicos: nas 7 votações de 14/10 a 03/11/2026, em três sessões, foram `7106` a `7112` e `4420` a `4426`. O `codigoSessaoVotacao` sozinho basta como id | chave |
| `codigoSessao`, `sequencialSessao` | inteiro | a sessão e a ordem da votação dentro dela (`1`, `2`, `3`...) | não |
| `informeLegislativo` | objeto | ata em texto livre; traz os totais em prosa | não |

Cada item de `votos[]`:

| Campo | Tipo | O que é | Usamos |
|---|---|---|---|
| `codigoParlamentar` | inteiro | id do senador → o `CodigoParlamentar` da lista de senadores e `/senador/{cod}/mandatos.json` | chave |
| `nomeParlamentar` | texto | nome parlamentar | sim |
| `siglaPartidoParlamentar` | texto | partido | sim |
| `siglaUFParlamentar` | texto | UF | sim |
| `siglaVotoParlamentar` | texto | o voto; ver os valores abaixo | sim |
| `descricaoVotoParlamentar` | texto | o significado do código, quando ele não se explica sozinho (`P-NRV`, `AP`, `LS`); `null` em `Sim`, `Não`, `Abstenção` e `Presidente (art. 51 RISF)` | não |
| `sexoParlamentar` | texto | — | não |

```json
{
  "idProcesso": 9006525,
  "codigoMateria": 172997,
  "identificacao": "PEC 18/2025",
  "sigla": "PEC", "numero": "18", "ano": 2025,
  "dataSessao": "2026-11-03",
  "resultadoVotacao": "A",
  "votacaoSecreta": "N",
  "totalVotosSim": null, "totalVotosNao": null, "totalVotosAbstencao": null,
  "votos": [
    {
      "codigoParlamentar": 5672,
      "nomeParlamentar": "Alan Rick",
      "siglaPartidoParlamentar": "REPUBLICANOS",
      "siglaUFParlamentar": "AC",
      "siglaVotoParlamentar": "Não"
    }
  ]
}
```

Quatro coisas para o conector:

- **Os totais vêm `null`.** Nas quatro votações do exemplo, `totalVotosSim`, `totalVotosNao` e `totalVotosAbstencao` estavam vazios, mesmo com os 81 votos presentes. **Conte a lista `votos`**, não confie nos campos de total. Os números aparecem em prosa dentro de `informeLegislativo.texto`, que não é campo estruturado.
- **`votos` traz os 81 senadores sempre,** inclusive quem não votou. É o estado de cada um, não a lista de quem votou — o oposto da Câmara.
- **`siglaVotoParlamentar` vai muito além de Sim e Não.** Valores observados nas quatro votações: `Sim`, `Não`, `Abstenção`, `P-NRV`, `AP` e `Presidente (art. 51 RISF)`; em outubro de 2026, apareceu também o `LS`. É o que apareceu, e não a lista completa: o conector precisa aceitar um código novo sem quebrar. Contar só `Sim` e `Não` não fecha 81. O significado vem no `descricaoVotoParlamentar`: `P-NRV` é "Presente – Não registrou voto" (26 vezes na semana gravada), `AP` é "Atividade parlamentar" (4 vezes) e `LS` é "Licença saúde". O banco guarda o `P-NRV`, de quem estava presente, e não guarda o `AP` nem o `LS`: toda ausência entra como `nao_votou`, sem o código, e o motivo fica fora do banco e do log (`AGENTS.md`, "Dados pessoais").
- **`identificacao` identifica a matéria, não a votação.** As quatro votações da semana do exemplo eram todas da PEC 18/2025. Para distinguir uma votação da outra, use o `codigoSessaoVotacao`, que é único.

### `/senador/lista/atual.json` e `/senador/{cod}/mandatos.json`

```text
/senador/lista/atual.json       os 81 senadores em exercício
/senador/5672/mandatos.json     os mandatos de um senador
```

A lista vem aninhada em `ListaParlamentarEmExercicio.Parlamentares.Parlamentar`, um array de 81 itens, cada um com `IdentificacaoParlamentar` e `Mandato`.

| Campo | Tipo | O que é | Usamos |
|---|---|---|---|
| `IdentificacaoParlamentar.CodigoParlamentar` | texto | id do senador | chave |
| `IdentificacaoParlamentar.NomeParlamentar` | texto | nome parlamentar | sim |
| `IdentificacaoParlamentar.NomeCompletoParlamentar` | texto | nome completo | sim |
| `IdentificacaoParlamentar.SiglaPartidoParlamentar` | texto | partido | sim |
| `IdentificacaoParlamentar.UfParlamentar` | texto | UF — **o nome do campo não tem "Sigla"** | sim |
| `IdentificacaoParlamentar.EmailParlamentar`, `UrlFotoParlamentar`, `Telefones` | — | — | não |
| `Mandato.CodigoMandato` | texto | id do mandato | chave |
| `Mandato.UfParlamentar` | texto | UF do mandato | sim |
| `Mandato.DescricaoParticipacao` | texto | `Titular` ou suplente | sim |
| `Mandato.PrimeiraLegislaturaDoMandato` / `Segunda...` | objeto | número da legislatura e datas | sim |
| `Mandato.Exercicios.Exercicio[]` | lista | períodos de exercício efetivo | não |
| `Mandato.Suplentes.Suplente[]` | lista | os suplentes | não |

```json
{
  "IdentificacaoParlamentar": {
    "CodigoParlamentar": "5672",
    "NomeParlamentar": "Alan Rick",
    "SiglaPartidoParlamentar": "REPUBLICANOS",
    "UfParlamentar": "AC"
  },
  "Mandato": {
    "CodigoMandato": "596",
    "UfParlamentar": "AC",
    "DescricaoParticipacao": "Titular",
    "PrimeiraLegislaturaDoMandato": { "NumeroLegislatura": "57", "DataInicio": "2023-02-01", "DataFim": "2027-01-31" }
  }
}
```

O `/senador/{cod}/mandatos.json` traz os mandatos do senador com o **histórico de partidos**, que **não existe** na lista atual. O caminho completo é `MandatoParlamentar.Parlamentar.Mandatos.Mandato[].Partidos.Partido[]`: ali, o `Mandato` é uma lista, e cada partido traz `Sigla`, `Nome`, `DataFiliacao` e `DataDesfiliacao`, que dizem o partido na data de cada voto. O partido atual vem sem `DataDesfiliacao`: o campo não existe nele. A resposta vem embrulhada em `MandatoParlamentar`, com um bloco `Metadados` na frente. Um exemplo de 16/11/2026, recortado:

```json
{
  "MandatoParlamentar": {
    "Parlamentar": {
      "Codigo": "5672",
      "Nome": "Alan Rick",
      "Mandatos": {
        "Mandato": [
          {
            "CodigoMandato": "596",
            "UfParlamentar": "AC",
            "DescricaoParticipacao": "Titular",
            "Partidos": {
              "Partido": [
                { "Sigla": "REPUBLICANOS", "Nome": "Republicanos", "DataFiliacao": "2025-11-12" },
                { "Sigla": "UNIÃO", "Nome": "União Brasil", "DataFiliacao": "2022-02-24", "DataDesfiliacao": "2025-11-10" }
              ]
            }
          }
        ]
      }
    }
  }
}
```

Duas observações:

- **Os números vêm como texto**, entre aspas (`"5672"`, `"596"`), ao contrário da Câmara, que manda inteiros. Converta na borda.
- **Um mandato de senador cobre duas legislaturas,** porque o mandato é de oito anos. No exemplo, a segunda legislatura é a 58ª, que começa em 2027 — ou seja, a resposta traz data no futuro. Não confunda com mandato encerrado.

### `/processo/{id}` — a matéria

```text
/processo/9006525
```

| Campo | Tipo | O que é | Usamos |
|---|---|---|---|
| `id` | inteiro | id do processo | chave |
| `identificacao` | texto | ex.: `PEC 18/2025` | sim |
| `sigla`, `numero`, `ano` | — | a identificação em partes | sim |
| `apelido` | texto | o nome pelo qual a matéria é conhecida, ex.: `PEC da Segurança Pública` | sim |
| `ementa` | — | **não vem neste endpoint**: o campo não existe na resposta, e a ementa está em `conteudo.ementa` | não |
| `conteudo.ementa` | texto | **a ementa de verdade** | sim |
| `conteudo.tipo` | texto | ex.: `Norma Geral` | sim |
| `objetivo` | texto | ex.: `Revisora` | sim |
| `tramitando` | texto | `Sim` ou `Não` | sim |
| `situacaoAtual`, `dataSituacaoAtual` | — | situação da matéria | sim |
| `autoriaIniciativa[]` | lista | quem propôs | sim |
| `documento.url` | texto | link do PDF do texto apresentado: é o inteiro teor, que o Firecrawl vai ler (#9) | sim |
| `documento.dataApresentacao` | data | quando foi apresentado | sim |
| `documento.indexacao` | texto | palavras-chave separadas por vírgula | sim |
| `documento.autoria[]` | lista | os autores, um objeto cada (`autor`, `siglaTipo`, `ente`...) | sim |
| `documento.resumoAutoria` | texto | a autoria em texto livre | sim |
| `documento.ementa` | — | **também não vem**: o campo não existe | não |
| `siglaCasaIniciadora` | texto | `CD` ou `SF` — **onde a matéria começou** | sim |
| `identificacaoProcessoInicial` | texto | a identificação na Casa de origem | sim |
| `outrosNumeros[]` | lista | a mesma matéria na outra Casa (ver abaixo) | chave |
| `despachos`, `autuacoes`, `ordensDoDia`, `classificacoes` | lista | tramitação detalhada | não |

```json
{
  "id": 9006525,
  "identificacao": "PEC 18/2025",
  "apelido": "PEC da Segurança Pública",
  "conteudo": {
    "tipo": "Norma Geral",
    "ementa": "Altera os arts. 5º, 15, 22, 23, 24, 40, 49, 84, 103-B, 130-A e 144 da Constituição Federal..."
  },
  "tramitando": "Não",
  "siglaCasaIniciadora": "CD",
  "identificacaoProcessoInicial": "PEC 18/2025",
  "outrosNumeros": [
    { "idOutroProcesso": 9006524, "sigla": "PEC", "numero": "00018", "ano": 2025,
      "casaIdentificadora": "CD", "enteIdentificador": "Câmara dos Deputados" }
  ]
}
```

Três pegadinhas, uma delas séria:

- **`/processo?id=9006525` ignora o filtro.** Com o id em query string, a API responde **HTTP 200 com uma lista arbitrária e enorme de matérias**, de mais de 8 MB — no teste vieram um PDS de 1984 e uma mensagem de 1991. Não dá erro: devolve dado errado em silêncio. Use sempre o id no caminho, `/processo/{id}`.
- **`ementa` não vem em `/processo/{id}`:** o campo não existe na resposta, nem no primeiro nível nem em `documento`. A ementa está em `conteudo.ementa`. Cuidado: na forma errada, com query string, o `ementa` do primeiro nível **vem preenchido** — o que torna fácil escrever um conector que parece funcionar lendo a matéria errada.
- **`outrosNumeros[].numero` vem com zeros à esquerda** (`"00018"`), enquanto o `numero` do próprio processo vem `"18"`. Normalize antes de comparar, ou a ligação por número falha.

O `apelido` (`"PEC da Segurança Pública"`) é o campo mais útil para a newsletter: diz em quatro palavras o que a ementa diz em seis linhas. Não é garantido para toda matéria — quando faltar, caia para `conteudo.ementa`.

## Da API para os nomes do domínio

O `AGENTS.md` fixa os nomes do domínio em português e sem acento. Este é o mapa que a #7 deve seguir:

| Nosso nome | Câmara | Senado |
|---|---|---|
| `parlamentar.id_externo` | `deputados.id` | `IdentificacaoParlamentar.CodigoParlamentar` |
| `parlamentar.nome` | `ultimoStatus.nome` | `IdentificacaoParlamentar.NomeParlamentar` |
| nenhum no MVP | `deputados.cpf`, que o conector descarta (ver [Campos pessoais](#campos-pessoais)) | não vem nos endpoints que usamos |
| `mandato.uf` | `ultimoStatus.siglaUf` | `Mandato.UfParlamentar` |
| `mandato.partido` | `ultimoStatus.siglaPartido` | `IdentificacaoParlamentar.SiglaPartidoParlamentar` (o histórico de partidos só vem em `/senador/{cod}/mandatos.json`, em `MandatoParlamentar.Parlamentar.Mandatos.Mandato[].Partidos.Partido[].Sigla`) |
| `proposicao.sigla` / `numero` / `ano` | `siglaTipo` / `numero` / `ano` | `sigla` / `numero` / `ano` |
| `proposicao.ementa` | `proposicoes.ementa` | `votacao.ementa` ou `processo.conteudo.ementa` — **nunca `processo.ementa`, que não vem** |
| `proposicao.url_inteiro_teor` | `urlInteiroTeor` | `documento.url` (o PDF da proposta) |
| `votacao.id_externo` | `votacoes.id` (`"2637478-26"`) | `codigoSessaoVotacao` (`7109`) |
| `votacao.data` | `data` | `dataSessao` |
| `votacao.resultado` | `aprovacao` (`1`/`0`) | `resultadoVotacao` (letra) |
| `votacao.descricao` | `descricao` | `descricaoVotacao` |
| `voto.valor` | `tipoVoto` | `siglaVotoParlamentar` |
| `voto.parlamentar` | `votos[].deputado_.id` | `votos[].codigoParlamentar` |

Como `resultado` e `voto.valor` têm domínios diferentes nas duas Casas, o conector precisa normalizá-los para um conjunto nosso. Vale decidir isso na #7 e registrar aqui.

## Campos pessoais

O `AGENTS.md` é explícito, e o regulamento do hackathon (item 6.9) proíbe a demo de expor dados pessoais reais de terceiros.

- **`cpf` e `dataNascimento`, de `/deputados/{id}`, ficam fora do banco no MVP:** o banco não tem coluna para eles, e o conector da Câmara descarta os dois. A ligação por CPF só entra com o TSE, depois do MVP (#12 e #13). Aí vale a regra do `AGENTS.md`: os dois servem só para ligar registros entre bases, ficam no banco e **não** aparecem na API, no site, nos logs nem nas fixtures.
- O Senado **não** devolve CPF nos endpoints que usamos. O `/senador/{cod}`, que não usamos, traz `DadosBasicosParlamentar.DataNascimento`, `Naturalidade`, `UfNaturalidade` e `EnderecoParlamentar`: quem gravar essa resposta troca a data de nascimento, como no `/deputados/{id}`.
- Na API e no front, pessoas são identificadas **pelo id interno**.
- Nas fixtures, os dois campos estão trocados por `00000000000` e `1970-01-01`.

Nome, partido, UF e voto de parlamentar **não** são dados pessoais protegidos neste sentido: são atos públicos de agente público, e é justamente o que a newsletter mostra.

## O que ficou em aberto

- **Separar a votação de mérito das de rito.** Das 27 votações do plenário da Câmara na semana do exemplo, a maioria é procedimental ("Aprovada a Emenda de Redação", "Aprovada a Redação Final"), e as 4 do Senado eram todas da mesma PEC. A newsletter precisa de um critério para escolher o que contar. Fica para a #22, que monta a edição.
- **Normalizar `resultado` e `voto.valor`** num conjunto único para as duas Casas: decisão da #7.
- **O TSE,** depois do MVP (#12 e #13). Os CSVs vêm em latin-1, separados por `;`, um por UF dentro de cada ZIP; `SQ_CANDIDATO` liga os arquivos dentro de uma eleição e o CPF liga eleições diferentes.
