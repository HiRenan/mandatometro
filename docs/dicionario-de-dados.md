# Dicionário de dados

O que as APIs devolvem, quais campos usamos e como os registros se ligam. É a referência do modelo de dados (#7), dos conectores da Câmara e do Senado (#10 e #11) e da tabela dos atos do Diário Oficial (#202).

**Conferido em:** 11/11/2026, por chamada real a cada endpoint, e de novo em 16/11/2026, nas correções da revisão (#90) e na coleta do Senado (#11). As respostas completas estão em [`apps/backend/tests/fixtures/`](../apps/backend/tests/fixtures/), e os testes offline leem de lá. Os históricos `mandatos.json` e uma votação secreta entraram com a #11; uma amostra da lista de deputados entrou com a #10.

Bases, as duas sem chave de acesso:

- **Câmara:** `https://dadosabertos.camara.leg.br/api/v2`
- **Senado:** `https://legis.senado.leg.br/dadosabertos`

Os endpoints de depois do MVP seguem nas notas da #10 e da #11. A #12 cobre as candidaturas do TSE, e a #13 trata dos bens declarados.

## Como ler este documento

Cada endpoint tem a URL que usamos, uma tabela de campos e um exemplo real recortado. Na coluna **Usamos**:

- **sim** — o conector usa o campo. O que fica no banco está em [Da API para os nomes do domínio](#da-api-para-os-nomes-do-domínio);
- **chave** — id público da Câmara ou do Senado, que serve para casar os registros. Ids públicos dos registros que não identificam pessoas, como processos, proposições e votações, podem aparecer no log, como em "coletando a votação 2637478-26". Para ids de pessoas e avisos de voto desconhecido, veja [dados pessoais](dados-pessoais.md);
- **só ligação, não exibir** — dado pessoal que segue as regras de [ligação entre bases](dados-pessoais.md#parlamentares-e-candidatos);
- **não** — existe na resposta e não vamos usar agora.

## Regras que valem para as duas APIs

- Toda chamada externa tem timeout e nova tentativa com backoff. A API da Câmara devolve 504 de vez em quando.
- O User-Agent identifica o projeto (`mandatometro (Hack Brasil 2026)`), e a coleta respeita o robots.txt dos sites.
- **Robots da Imprensa Nacional.** Em 18/11/2026, `https://www.in.gov.br/robots.txt` respondeu HTTP 200 com `User-agent: *` e `Disallow: /`. A exceção aprovada cobre a página de destaques e sua paginação pelo Firecrawl, com teto de seis páginas. [ADR 0006](adr/0006-destaques-do-dou.md).
- **Robots da coleta.** Em 16/11/2026, `dadosabertos.camara.leg.br/robots.txt` respondeu HTTP 200 com HTML de página inexistente, sem regras, e `legis.senado.leg.br/robots.txt` respondeu 403. A base lê o arquivo uma vez por execução e carrega as regras legíveis com `RobotFileParser.parse()`. Sem regras ou com 4xx no arquivo (exceto 408/429, transitórios), a coleta continua. Falha de rede ou HTTP 5xx persistente interrompe a coleta. Um 403 no endpoint de dados continua sendo erro. `Crawl-delay`, `Request-rate` e `Retry-After` são respeitados.
- **Ordem das regras no Python 3.13.5.** O `RobotFileParser.can_fetch` usado pela base decide pela primeira regra que casa. A RFC 9309 determina o uso da regra mais específica. As respostas atuais de Câmara e Senado ao `robots.txt` tornam a diferença inócua, como anotado na revisão do PR #238. [RFC 9309, seção 2.2.2](https://www.rfc-editor.org/rfc/rfc9309.html#section-2.2.2).
- As respostas da Câmara e do Senado são UTF-8, e nenhuma das duas declara o charset no `content-type` (as duas mandam `application/json`): decodifique explicitamente como UTF-8, ou os acentos embaralham no Windows.
- As chamadas de cada coleta rodam em sequência.
- Veja a [regra de fonte dos dados coletados](#fonte-dos-dados-coletados).

### Fonte dos dados coletados

- **Toda informação guardada leva a fonte:** a URL e a data da coleta.

### Pegadinhas e saída da coleta

- **Completude da paginação da Câmara:** as páginas precisam ser consecutivas desde a primeira, e o maior `last` anunciado continua valendo se uma página seguinte o omitir. Um salto ou fim antecipado torna a execução parcial (saída 1); a coleção incompleta não chega à gravação nem à reconciliação de exercício ou votos, preservando os dados anteriores da unidade.
- **Saída das coletas:** histórico de mandatos indisponível (404/410) entra no resumo como `mandatos:parlamentar_id=<id interno>`, uma vez e só após confirmar a gravação; o caminho com o código público fica apenas no cache privado da execução. Para investigar, consulte `parlamentar.id_externo` pelo id interno informado. Processos do Senado e votações da Câmara podem manter seus ids públicos, pois não identificam pessoas. No Actions, `scripts/tarefas.py` suprime os logs durante a coleta e imprime só o resumo, com mensagens fixas para erros de configuração ou inesperados.

## As duas APIs lado a lado

As diferenças abaixo não são detalhe de implementação: elas mudam o desenho do conector.

| | Câmara | Senado |
|---|---|---|
| Envelope | `{"dados": [...], "links": [...]}` | sem envelope comum: o `/votacao` é um **array JSON puro**, e a lista de senadores, o `mandatos.json` e o `/processo/{id}` vêm dentro de um objeto |
| Chamadas para montar um item da newsletter | **3** (lista → detalhe → votos); as orientações ficaram para depois do MVP | **1** para votações e votos do período, mais **1 por matéria distinta** em `/processo/{id}`; a lista de senadores é compartilhada pela execução, e só quem está fora dela pede histórico |
| Paginação | 100 itens por página, siga `links[rel=next]` | sem paginação nos endpoints que usamos |
| Formato de data | `dataInicio=2026-11-03` | `dataInicio=2026-11-03` (**`20261103` devolve HTTP 400**) |
| Quem aparece na lista de votos | **só quem votou** (429 de 513 deputados, no exemplo) | **todos os 81 senadores**, com o estado de cada um |
| Totais de Sim/Não | não existem: conte os votos | na votação aberta, **vêm `null`**: conte os votos. Na secreta, a lista traz `Votou`, sem Sim nem Não, e o placar só vem nos totais |
| Resultado | `aprovacao`, inteiro `1`/`0` | `resultadoVotacao`, letra (`"A"` para aprovação, `"R"` para rejeição) |
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

**Período:** a [documentação oficial](https://dadosabertos.camara.leg.br/api/v2/api-docs) exige que `dataInicio` e `dataFim`, quando enviados juntos, pertençam ao mesmo ano. A coleta divide intervalos maiores por ano. `dataFim` corta à meia-noite: em 16/11/2026, consultar de 14/10 a 14/10 retornou zero votações; até 15/10 retornou as cinco de 14/10. Para incluir o último dia inteiro, o conector pede o dia seguinte e filtra pela data solicitada. Se o trecho termina em 31/12, omite `dataFim`: só `dataInicio` consulta até o fim daquele ano, segundo a documentação.

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

**Id listado com detalhe indisponível:** em 16/11/2026, a consulta de 09–15/11 retornou 187 ids, dos quais 29 responderam 404 tanto em `/votacoes/{id}` quanto em `/votacoes/{id}/votos`. Todos estavam datados de 10/11, inclusive três ids consecutivos. Dois exemplos são `2155928-29` e `2420059-20`. O conector separa 404/410 nesses dois recursos em `indisponiveis_na_fonte` e continua, sem tratar o caso como queda da API e sem gravar uma votação só com a listagem. Outras falhas tornam a execução parcial (saída 1). Três consecutivas interrompem. Sem `idEvento`, a fonte da votação fica sem `url_publica`. A newsletter pode usar a ficha pública da proposição afetada, quando existir.

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
| `idEvento` | inteiro ou nulo | identifica a sessão e liga ao detalhe de `/eventos/{id}` | chave |

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

- **Há registros nas votações nominais e em algumas simbólicas**, conforme a [documentação oficial](https://dadosabertos.camara.leg.br/api/v2/api-docs). Consulte o `/votos` de todas as votações, sem deduzir a modalidade pelo tamanho da lista. **HTTP 200 com `"dados": []`** é uma resposta válida, sem votos publicados; 404/410 é indisponibilidade, como descrito acima.
- **Só aparece quem votou.** O exemplo tem 429 votos, de 513 deputados. Ausência não vem como registro.
- **`tipoVoto` tem um terceiro valor:** `Artigo 17`, uma vez no exemplo, que é o voto do presidente da sessão pelo art. 17 do Regimento Interno. Nas três votações nominais de 14/10/2026, consultadas em 16/11, havia um registro `Artigo 17` além do `Total` citado na descrição de cada votação. O banco guarda esse registro como `presidente`. Conte os valores normalizados separadamente para não somar presidência ao placar de Sim/Não. Não trate o campo como booleano.

### `/votacoes/{id}/orientacoes` — como cada bancada orientou

```text
/votacoes/2236186-60/orientacoes
```

As orientações ficaram para depois do MVP (decisão do Renan na #7, em 12/11/2026): o banco do MVP não tem tabela para elas, e os campos abaixo ficam de referência.

| Campo | Tipo | O que é | Usamos |
|---|---|---|---|
| `siglaPartidoBloco` | texto | partido ou bloco; inclui `Governo`, `Maioria`, `Minoria` e `Oposição` | não |
| `orientacaoVoto` | texto | `Sim`, `Não` ou **texto vazio** quando a bancada liberou ou não orientou | não |
| `codTipoLideranca` | texto | `P` partido, `B` bloco ou bancada | não |
| `codPartidoBloco`, `uriPartidoBloco` | — | `null` para as bancadas que não são partido | não |

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

### `/proposicoes/{id}/temas` — a classificação temática

`dados[]` pode vir vazio. Cada entrada traz `codTema` (inteiro) e `tema` (nome da classificação). A referência `/referencias/proposicoes/codTema` traz os mesmos códigos em `dados[].cod` como texto e os nomes em `dados[].nome`. A coleta consulta uma vez por proposição confirmada e converte pelo código. [Referência oficial da Câmara](https://dadosabertos.camara.leg.br/api/v2/referencias/proposicoes/codTema)

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

Uma consulta só com `dataInicio` e `dataFim` aceita **no máximo um ano**, conforme o [OpenAPI oficial](https://legis.senado.leg.br/dadosabertos/v3/api-docs); acima disso, a API respondeu HTTP 400 na conferência de 16/11/2026. O conector divide o intervalo em janelas de até **365 dias, incluindo as duas datas**, sem sobreposição. Uma semana sem votação devolve `[]`: o cadastro atual ainda é atualizado, e a coleta termina sem votações. Só entram sessões com `casaSessao == "SF"`; as conjuntas (`"CN"`) e as votações simbólicas, ausentes deste endpoint, ficam fora.

| Campo | Tipo | O que é | Usamos |
|---|---|---|---|
| `idProcesso` | inteiro | id do processo → `/processo/{id}` | chave |
| `codigoMateria` | inteiro | id da matéria, **diferente** do `idProcesso` | chave |
| `identificacao` | texto | ex.: `PEC 18/2025` | sim |
| `sigla`, `numero`, `ano` | — | a identificação em partes; **chave entre as Casas** | sim |
| `ementa` | texto | resumo da matéria | sim |
| `descricaoVotacao` | texto | o que foi votado nesta votação | sim |
| `dataSessao` | data | dia da sessão | sim |
| `resultadoVotacao` | texto | letra; `"A"` nas quatro do exemplo. Também vem `"R"`, de rejeitada: em 3 das 70 votações de 2026 até 15/11 | sim |
| `votacaoSecreta` | texto | `"N"` ou `"S"` | sim |
| `totalVotosSim` / `Nao` / `Abstencao` | inteiro | **vieram `null` nas quatro**, que eram abertas; na votação secreta, vêm preenchidos (ver abaixo) | não |
| `votos[]` | lista | o estado de cada um dos 81 senadores | sim |
| `codigoSessaoVotacao`, `sequencialVotacao` | inteiro | ids da votação, globais e únicos: nas 7 votações de 14/10 a 03/11/2026, em três sessões, foram `7106` a `7112` e `4420` a `4426`. O `codigoSessaoVotacao` sozinho basta como id | chave |
| `codigoSessao` | inteiro | código do encontro em `/plenario/encontro/{codigo}` | chave |
| `sequencialSessao` | inteiro | ordem da votação dentro da sessão (`1`, `2`, `3`...) | não |
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

- **Os totais só vêm na votação secreta.** Na aberta (`votacaoSecreta` `"N"`), `totalVotosSim`, `totalVotosNao` e `totalVotosAbstencao` vêm `null`, mesmo com os 81 votos presentes: **conte a lista `votos`**. Na secreta (`votacaoSecreta` `"S"`), a lista traz `Votou`, sem Sim nem Não, para cada senador que votou, e o placar só vem nos totais. Das 70 votações de 2026 até 15/11, 40 foram secretas: nas 40, os totais vieram preenchidos, e a soma dos três deu o número de `Votou`. Nas 30 abertas, como nas quatro do exemplo, vieram `null`. Nas do exemplo, os números aparecem em prosa dentro de `informeLegislativo.texto`, que não é campo estruturado.
- **`votos` traz os 81 senadores nas respostas conferidas,** inclusive quem não votou. É o estado de cada um, não a lista de quem votou — o oposto da Câmara. O conector não exige exatamente 81 registros para aceitar uma resposta válida.
- **`siglaVotoParlamentar` vai muito além de Sim e Não.** Valores observados nas quatro votações: `Sim`, `Não`, `Abstenção`, `P-NRV`, `AP` e `Presidente (art. 51 RISF)`; em outubro de 2026, apareceu também o `LS`. A consulta de 2026 até 15/11 trouxe também `MIS`, `NCom`, `LAP`, `LP` e `NA`. É o que apareceu, e não a lista completa: o conector aceita um código novo sem quebrar. Contar só `Sim` e `Não` não fecha 81. O significado vem em `descricaoVotoParlamentar`. O normalizador ignora diferenças de caixa e espaços. `P-NRV` indica presença e `NA` é um exemplo de código ainda não classificado. As regras para guardar o código e para o log estão em [Ausências e afastamentos](dados-pessoais.md#ausências-e-afastamentos).
- **`identificacao` identifica a matéria, não a votação.** As quatro votações da semana do exemplo eram todas da PEC 18/2025. Para distinguir uma votação da outra, use o `codigoSessaoVotacao`, que é único.

**Na votação secreta, o conector descarta toda a lista `votos`, inclusive `Votou`, presenças e ausências.** Grava matéria, votação, resultado e fontes, sem linhas de `voto` nem contagem de códigos desconhecidos. A fixture da votação 7081 contém 81 registros, dos quais 77 são `Votou`, e comprova esse comportamento. O modelo não tem colunas de total nem de modalidade: uma lista vazia no banco não prova segredo nem significa que houve zero votos. A #22 precisa considerar essa limitação ao escrever a newsletter.

**Sanitização das respostas gravadas:** os códigos de ausência descritos acima são observações da fonte. Veja a [sanitização dos exemplos](../apps/backend/tests/fixtures/README.md#dados-pessoais).

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

O `/senador/{cod}/mandatos.json` traz os mandatos do senador com o **histórico de partidos**, que **não existe** na lista atual. O caminho é `MandatoParlamentar.Parlamentar.Mandatos.Mandato`, seguido de `Partidos.Partido`: o `Mandato` pode vir como objeto único (fixture 5672) ou lista (fixture 4525), e o conector aceita as duas formas. Cada partido traz `Sigla`, `Nome`, `DataFiliacao` e `DataDesfiliacao`, que dizem o partido na data de cada voto. O partido atual vem sem `DataDesfiliacao`: o campo não existe nele. A resposta vem embrulhada em `MandatoParlamentar`, com um bloco `Metadados` na frente. Um exemplo de 16/11/2026, recortado:

```json
{
  "MandatoParlamentar": {
    "Parlamentar": {
      "Codigo": "5672",
      "Nome": "Alan Rick",
      "Mandatos": {
        "Mandato": {
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
      }
    }
  }
}
```

Duas observações:

- **Os números vêm como texto**, entre aspas (`"5672"`, `"596"`), ao contrário da Câmara, que manda inteiros. Converta na borda.
- **Um mandato de senador cobre duas legislaturas,** porque o mandato é de oito anos. No exemplo, a segunda legislatura é a 58ª, que começa em 2027 — ou seja, a resposta traz data no futuro. Não confunda com mandato encerrado.

A lista atual basta para cadastrar quem está em exercício: a coleta usa a primeira legislatura, a UF e a condição do seu `Mandato`, sem consultar histórico individual. Para um votante fora dessa lista, os dados públicos do voto criam o parlamentar, e o histórico tenta localizar o mandato pelas datas das duas legislaturas; datas de exercício podem desempatar. Motivos de afastamento não são lidos nem gravados. Sem um mandato inequívoco, os votos permanecem e nenhum mandato é inventado.

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
| `despachos`, `autuacoes`, `ordensDoDia` | lista | tramitação detalhada | não |
| `classificacoes[]` | lista | cada entrada traz `codigo`, `descricao` e `descricaoHierarquia` | temas |

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

## Vídeos das sessões

- **Câmara.** A coleta usa `idEvento` do detalhe da votação e consulta `/eventos/{id}`. O objeto `dados` traz `id`, `dataHoraInicio`, `dataHoraFim` e `urlRegistro`, com um endereço por evento. De 13 a 20/11/2026 foram gravadas 49 votações. As 36 com `idEvento` vieram de dois eventos, ambos com `urlRegistro` no formato `https://www.youtube.com/watch?v=<id>`. [Evento 83363](https://dadosabertos.camara.leg.br/api/v2/eventos/83363) · [Evento 83382](https://dadosabertos.camara.leg.br/api/v2/eventos/83382)
- **Senado.** A coleta usa `codigoSessao` das votações com `casaSessao` igual a `SF` e consulta `/plenario/encontro/{codigo}`. O endereço fica em `ServicoPlenario.encontros.encontro[].linkVideo` no objeto com o código consultado. [Sessão 594169](https://legis.senado.leg.br/dadosabertos/plenario/encontro/594169) · [OpenAPI do Senado](https://legis.senado.leg.br/dadosabertos/v3/api-docs)

Nos dois modos, o detalhe de evento da Câmara precisa indicar apenas o Plenário (id `180` em `orgaos`). No Senado, só ganha vídeo a votação com `informeLegislativo.siglaColegiado` igual a `PLEN` e cujo encontro declara `siglaCasa` igual a `SF`. O detalhe que não confirma o órgão da Câmara ou a Casa do encontro do Senado entra em `videos.urls_recusadas`.

Só é aceito `https://www.youtube.com/watch?v=<id>`, com 11 caracteres ASCII entre letras, algarismos, `_` e `-`. A consulta lê o detalhe de cada sessão uma vez por rodada, com as mesmas regras de robots e tentativas das Casas. O vídeo corresponde à sessão inteira. `dataHoraRegistro` é a hora do registro da Câmara. Na amostra, dois registros são posteriores ao fim do evento, por isso a hora não dá o minuto da votação no vídeo.

Cada par `(casa, id_externo)` de `video_sessao` tem uma fonte própria, com a URL da sessão consultada e a hora da coleta. As votações da sessão compartilham o registro. Falha na consulta mantém a votação e, se já houver, a observação anterior. Link ausente ou fora do formato fica nulo na coleta normal. O resumo `videos` conta votações sem sessão, sessões com vídeo, sessões sem endereço, URLs recusadas, falhas na consulta ou gravação e votações vinculadas com vídeo.

O modo `--somente-videos` usa o período dos comandos de coleta e procura só votações sem vídeo. Na Câmara, extrai o id da página oficial gravada na fonte da votação. No Senado, consulta `/votacao` para cruzar `codigoSessaoVotacao` e `codigoSessao`. O preenchimento registra somente observações com link válido. Retorna código 1 em falha de consulta ou gravação, preservando os vínculos já confirmados para a próxima rodada.

## Da API para os nomes do domínio

Este é o mapa que o modelo da #7 segue, em `apps/backend/src/mandatometro/db/modelos.py`, conferido com ele em 16/11/2026. A chave de parlamentar, proposição e votação é a `casa` (`camara` ou `senado`) com o `id_externo`, e cada registro aponta para uma `fonte`: a `url` que a coleta leu, a `url_publica` que o leitor abre, quando houver, e a data da coleta (`coletado_em`). [Convenções de nomes do domínio](../AGENTS.md#conventions).

| Nosso nome | Câmara | Senado |
|---|---|---|
| `parlamentar.id_externo` | `deputados.id` | `IdentificacaoParlamentar.CodigoParlamentar`, convertido para inteiro: na lista vem `"5672"`, e no `/votacao`, `5672` |
| `parlamentar.nome` | `ultimoStatus.nome` | `IdentificacaoParlamentar.NomeParlamentar` |
| nenhum no MVP | `deputados.cpf`, que o conector descarta (ver [Campos pessoais](#campos-pessoais)) | não vem nos endpoints que usamos |
| `mandato.legislatura` | `ultimoStatus.idLegislatura` | `Mandato.PrimeiraLegislaturaDoMandato.NumeroLegislatura`, a primeira das duas legislaturas do mandato |
| `mandato.uf` | `ultimoStatus.siglaUf` | `Mandato.UfParlamentar` |
| `mandato.condicao` | `ultimoStatus.condicaoEleitoral` | `Mandato.DescricaoParticipacao` |
| `mandato.em_exercicio` | `ultimoStatus.situacao` é `Exercício` | está na lista atual (`/senador/lista/atual.json`) |
| `proposicao.id_externo` | `proposicoes.id` | `idProcesso`, e não o `codigoMateria` |
| `proposicao.sigla` / `numero` / `ano` | `siglaTipo` / `numero` / `ano` | `sigla` / `numero` / `ano`; o `numero` vem como texto e vira inteiro (`"00018"` e `"18"` viram `18`) |
| `proposicao.ementa` | `proposicoes.ementa` | `votacao.ementa` ou `processo.conteudo.ementa` — **nunca `processo.ementa`, que não vem** |
| `proposicao.apelido` | não existe | `processo.apelido` |
| `proposicao.url_inteiro_teor` | `urlInteiroTeor` | `documento.url` (o PDF da proposta) |
| `votacao.id_externo` | `votacoes.id` (`"2637478-26"`) | `codigoSessaoVotacao`, como texto (`"7109"`) |
| `votacao.data` | `data` | `dataSessao` |
| `votacao.descricao` | `descricao` | `descricaoVotacao` |
| `votacao.resultado` / `resultado_bruto` | `aprovacao` (`1`/`0`) | `resultadoVotacao` (letra) |
| `votacao_proposicao` | `proposicoesAfetadas[]` do `/votacoes/{id}` — **nunca o prefixo do id da votação** | `idProcesso` |
| `video_sessao.url_video` | `urlRegistro` de `/eventos/{id}` | `linkVideo` de `/plenario/encontro/{codigo}` |
| `voto.parlamentar` | `votos[].deputado_.id` | `votos[].codigoParlamentar` |
| `voto.valor` / `valor_bruto` | `tipoVoto` | `siglaVotoParlamentar` |
| `voto.partido` | `votos[].deputado_.siglaPartido` | `votos[].siglaPartidoParlamentar` |
| `voto.uf` | `votos[].deputado_.siglaUf` | `votos[].siglaUFParlamentar` |

O partido fica no voto, e não no mandato: é o do dia do voto, porque muda dentro do mandato. A UF fica nos dois: a do mandato e a do dia do voto. O histórico de partidos do `/senador/{cod}/mandatos.json` não entra no banco.

O `resultado` e o `voto.valor` têm domínios diferentes nas duas Casas, e o modelo traduz os dois para um conjunto nosso, com o `normalizar_resultado` e o `normalizar_voto` (decisões do Renan na #7, em 12/11/2026, com os ajustes da #97):

- **`votacao.resultado`:** `aprovada`, `rejeitada` ou `outro`. O `1` e o `"A"` viram `aprovada`, o `0` e o `"R"` viram `rejeitada`, e um código ainda não classificado vira `outro`. O `resultado_bruto` guarda o código como a Casa publicou.
- **`voto.valor`:** `sim`, `nao`, `abstencao`, `obstrucao`, `presidente`, `nao_votou` ou `outro`. O `Artigo 17` e o `Presidente (art. 51 RISF)` viram `presidente`, e o `P-NRV` vira `nao_votou`. O armazenamento do `valor_bruto` segue as regras de [ausências e afastamentos](dados-pessoais.md#ausências-e-afastamentos).

## Temas das proposições e das votações

No Senado, `descricaoHierarquia` usa ` / ` entre os níveis. A coleta normal reaproveita o processo lido para gravar a proposição. O modo `--somente-temas` busca o processo pelo `idProcesso` e confere o id da resposta. Lista ausente, nula ou vazia significa falta de classificação. Os 179 nós de `/processo/classes` e os 32 códigos de referência da Câmara formam as fixtures de conversão. [Hierarquia oficial do Senado](https://legis.senado.leg.br/dadosabertos/processo/classes)

O catálogo tem identificadores estáveis e nomes para a tela. Na Câmara, vale a linha do código. No Senado, vale o caminho mais específico que conste na tabela, por segmentos inteiros. Ele também cobre seus descendentes até uma regra mais específica. Entradas sem regra ficam sem tema. A tabela deixa de fora raízes amplas como **Política Social** e **Organização do Estado**. Uma matéria classificada em **Política Social / Previdência Social** recebe o tema correspondente. As palavras-chave de `keywords` e `documento.indexacao`, a ementa e o título ficam fora da conversão.

| ID | Nome | Códigos e temas da Câmara | Caminhos do Senado |
| --- | --- | --- | --- |
| `saude` | Saúde | `56` Saúde | Política Social / Saúde |
| `educacao` | Educação | `46` Educação | Política Social / Educação |
| `economia` | Economia e impostos | `40` Economia · `60` Turismo · `66` Indústria, Comércio e Serviços | Economia e Desenvolvimento / Fiscalização e Controle da Atividade Econômica · Economia e Desenvolvimento / Indústria, Comércio e Serviços · Economia e Desenvolvimento / Linha de Crédito · Economia e Desenvolvimento / Sistema Financeiro Nacional · Economia e Desenvolvimento / Tributos |
| `trabalho` | Trabalho e emprego | `58` Trabalho e Emprego | Jurídico / Processo / Processo do Trabalho · Política Social / Trabalho e Emprego |
| `previdencia_assistencia` | Previdência e assistência social | `52` Previdência e Assistência Social | Política Social / Previdência Social · Política Social / Proteção Social / Assistência Social · Política Social / Proteção Social / Desenvolvimento Social e Combate à Fome |
| `direitos_cidadania` | Direitos e cidadania | `44` Direitos Humanos e Minorias · `67` Direito e Defesa do Consumidor | Jurídico / Direito do Consumidor · Jurídico / Direitos e Garantias · Política Social / Proteção Social / Crianças e Adolescentes · Política Social / Proteção Social / Direitos Humanos e Minorias · Política Social / Proteção Social / Idosos · Política Social / Proteção Social / Mulheres · Política Social / Proteção Social / Pessoas com Deficiência · Política Social / Proteção Social / População Indígena · Soberania, Defesa Nacional e Ordem Pública / Direito dos Estrangeiros |
| `seguranca_defesa` | Segurança e defesa | `57` Defesa e Segurança | Soberania, Defesa Nacional e Ordem Pública / Defesa do Estado e das Instituições Democráticas |
| `justica` | Justiça | `42` Direito Civil e Processual Civil · `43` Direito Penal e Processual Penal · `68` Direito Constitucional · `76` Direito e Justiça | Organização do Estado / Funções Essenciais à Justiça · Organização do Estado / Poder Judiciário · Jurídico / Direito Civil · Jurídico / Direito Empresarial e Econômico · Jurídico / Direito Notarial e Registral · Jurídico / Direito Penal e Penitenciário · Jurídico / Processo / Processo Civil · Jurídico / Processo / Processo Penal |
| `meio_ambiente` | Meio ambiente | `48` Meio Ambiente e Desenvolvimento Sustentável | Meio Ambiente |
| `agropecuaria` | Agricultura e pecuária | `51` Estrutura Fundiária · `64` Agricultura, Pecuária, Pesca e Extrativismo | Economia e Desenvolvimento / Agropecuária e Abastecimento · Economia e Desenvolvimento / Política Fundiária e Reforma Agrária |
| `infraestrutura` | Infraestrutura e transporte | `54` Energia, Recursos Hídricos e Minerais · `61` Viação, Transporte e Mobilidade | Infraestrutura · Jurídico / Direito de Trânsito · Política Social / Desenvolvimento Urbano / Mobilidade Urbana |
| `cidades_moradia` | Cidades e moradia | `41` Cidades e Desenvolvimento Urbano | Política Social / Desenvolvimento Urbano · Política Social / Habitação |
| `ciencia_tecnologia` | Ciência, tecnologia e comunicação | `37` Comunicações · `62` Ciência, Tecnologia e Inovação · `85` Ciências Exatas e da Terra · `86` Ciências Sociais e Humanas | Economia e Desenvolvimento / Ciência, Tecnologia e Informática · Infraestrutura / Comunicações |
| `cultura_esporte` | Cultura, esporte e lazer | `35` Arte, Cultura e Religião · `39` Esporte e Lazer | Política Social / Cultura · Política Social / Desporto e Lazer |
| `politica_governo` | Política e governo | `34` Administração Pública · `53` Processo Legislativo e Atuação Parlamentar · `74` Política, Partidos e Eleições | Administração Pública · Jurídico / Direito Eleitoral · Jurídico / Processo / Processo Legislativo · Jurídico / Processo / Processo Administrativo · Organização do Estado / Fiscalização e Controle · Organização do Estado / Organização Federativa · Organização do Estado / Poder Legislativo |
| `orcamento_publico` | Orçamento público | `70` Finanças Públicas e Orçamento | Economia e Desenvolvimento / Finanças Públicas · Orçamento Público |
| `relacoes_internacionais` | Relações internacionais | `55` Relações Internacionais e Comércio Exterior | Soberania, Defesa Nacional e Ordem Pública / Relações Internacionais |
| `homenagens` | Homenagens e datas comemorativas | `72` Homenagens e Datas Comemorativas | Honorífico |

`proposicao_tema` guarda uma linha por par de proposição e tema convertido, mesmo se mais de uma classificação oficial chegar ao mesmo tema. Sua fonte tem a URL e a data da consulta temática da Câmara ou do processo do Senado. A gravação é separada dos fatos da proposição e da votação. Quando o conjunto se repete, a fonte é reaproveitada. Na coleta normal, uma resposta válida substitui o conjunto da proposição e uma falha preserva o conjunto anterior.

O resumo `temas` distingue proposições com tema, proposições sem classificação, classificações sem conversão e falhas de consulta ou gravação. Uma proposição pode ter um tema reconhecido e outra classificação sem conversão. O modo `--somente-temas` consulta só proposições sem tema ligadas a votações gravadas no período.

Os códigos temáticos são aceitos como inteiros positivos ou texto com os dígitos de 0 a 9. Código malformado conta como falha da consulta e preserva os temas anteriores. No Senado, o código é validado e o caminho decide o tema.

Na coleta normal da Câmara, a etapa dos temas para após duas falhas temporárias seguidas ou ao esgotar o prazo das consultas. As consultas de tema têm até quatro minutos, dentro dos primeiros 25 minutos da coleta. O resumo conta as proposições restantes em `proposicoes_nao_consultadas`. Uma nova coleta pode consultar essas proposições. O modo `--somente-temas` também pode consultar as que ainda estão sem tema.

Uma votação expõe a união dos temas de suas proposições afetadas, na ordem do catálogo, em `temas: [{id, nome}]`. A lista vem vazia quando não há tema. O campo aparece em `GET /votacoes/{id}`, nos votos de `GET /parlamentares/{id}/votos` e nos fatos públicos das votações em `GET /edicoes/{id}`. Nos votos do parlamentar, `?tema=saude` filtra os registros antes da contagem e da paginação. Id de tema inválido responde 422 com `dados_invalidos`. `GET /temas` lista o catálogo.

## Atos do Diário Oficial

A tabela `ato` guarda os atos publicados para a seleção semanal da newsletter. Os dados abertos do Senado fornecem decretos, leis e medidas provisórias. A página de destaques complementa a cobertura com portarias e outros atos de ministérios. [ADR 0005](adr/0005-legislacao-federal-na-newsletter.md) · [ADR 0006](adr/0006-destaques-do-dou.md).

### Legislação federal nos dados abertos do Senado

Conferido em 19/11/2026, com a mesma base HTTPS das votações do Senado. A lista usa `tipo=DEC`, `tipo=LEI` ou `tipo=MPV` e o ano da assinatura.

```text
/legislacao/lista?tipo=LEI&ano=2026
/legislacao/44391098
/legislacao/tiposNorma
```

Na lista, as normas ficam em `ListaDocumento.documentos.documento`. A resposta sem normas pode trazer `documentos: ""`. A lista também traz `descricao`, `norma`, `anoassinatura` e `apelido`. O detalhe vem em `DetalheDocumento.documentos.documento` e inclui `identificacao`, `publicacoes`, `ementa`, `indexacao` e `classes`. O exemplo da lei `44391098` tem três publicações, duas na edição extra de 12/11/2026 e uma na edição de 13/11/2026. A [fixture sanitizada](../apps/backend/tests/fixtures/senado/legislacao/detalhe-44391098.json) conserva os ids e as datas.

| Campo | Tipo | Obrigatório | Procedência na coleta de legislação |
|---|---|---|---|
| `id` | inteiro | sim | Chave interna gerada pelo banco. |
| `origem` | texto | sim | Código do conector, `legislacao_senado`. |
| `id_externo` | texto | sim | `id` da lista, confirmado no detalhe. |
| `tipo` | texto | sim | Prefixo de `tipo` da lista, antes do hífen. `DEC` vira `decreto`, `LEI` vira `lei` e `MPV` vira `medida_provisoria`. O banco também admite `outro`. |
| `titulo` | texto | sim | `normaNome` da lista. |
| `ementa` | texto | não | `ementa` da lista, preservada como veio. |
| `data_publicacao` | data | sim | Menor data válida de `publicacoes.publicacao[].data` no detalhe, entre as entradas com `siglaFonte` da família `DOU` ou `DOUE`. Tem índice para a seleção por período. |
| `data_assinatura` | data | não | `dataassinatura` da lista, no formato `DD/MM/AAAA`. |
| `secao` | texto | não | Fica nula nesta coleta. |
| `orgao` | texto | não | Fica nulo nesta coleta. |
| `numero` | texto | não | `numero` da lista, como texto. |
| `fonte_id` | inteiro | sim | Referência à observação criada para o detalhe. |

`fonte.url` guarda a URL consultada em `/legislacao/{id}`. `fonte.url_publica` guarda `identificacao.urlDocumento` quando aponta para uma norma no portal oficial, com um identificador LexML no parâmetro `urn` de `https://normas.leg.br/?urn=…`. `fonte.coletado_em` registra quando a base recebeu o detalhe. A chave `(origem, id_externo)` mantém o id interno ao atualizar. Cada gravação cria outra fonte na mesma transação.

### Período e descartes

O filtro por data na lista retornou zero no teste de 19/11/2026. A coleta cobre as assinaturas de dez dias corridos antes do início até o fim do período, incluindo as duas pontas. Pede uma lista por tipo e por ano que essa faixa atravessa e consulta detalhes apenas das assinaturas na faixa. Assim, ao começar em 1º de janeiro, consulta também o ano anterior. A margem abrange feriados prolongados, como no caso da lei assinada em 02/04/2026 e publicada quatro dias depois, em 06/04/2026. Se a assinatura for mais de dez dias anterior ao início, uma publicação no período pode ficar de fora sem contagem de descarte.

A data de publicação inclui edições extras (`DOUE`). A escolha pela menor data válida usa `siglaFonte` como identificador do DOU. `fonte` no detalhe é o rótulo textual da publicação e a ordem do array pode variar. A primeira publicação determina se o ato pertence ao período, inclusive nas duas pontas. Uma republicação em outro dia conserva a data original.

O Senado devolveu um decreto com assinatura em 13/12/2026 na lista consultada em 19/11/2026. Assinatura ou primeira publicação posterior ao dia da coleta em Brasília conta como `data_futura`. Assinatura ausente ou inválida conta como `assinatura_invalida` e fica fora da consulta de detalhe. Nos candidatos, o resumo também conta `tipo_fora_do_conjunto`, `campo_obrigatorio` (id, título, tipo ou endereço oficial), `sem_publicacao`, `detalhe_invalido` (JSON ilegível, envelope inesperado ou id divergente) ou `detalhe_indisponivel` (HTTP 404 ou 410).

O resumo é uma linha JSON. O código de saída é 0 quando a coleta percorre as listas, ainda que haja descartes. Falhas de rede ou do servidor após esgotar as tentativas, falhas de listagem ou de gravação e uma proibição no robots encerram a execução com código 1 e mantêm os atos já confirmados. A falha de gravação conta como `falha_gravacao`. Datas inválidas na linha de comando retornam 2.

Título e ementa podem mencionar pessoas. O conector guarda o texto oficial em `ato`, com `fonte.trecho` nulo. Logs, resumo e erros omitem esse conteúdo. O uso editorial segue as [regras de dados pessoais](dados-pessoais.md).

### Destaques da Imprensa Nacional

O Firecrawl entrega cada página em `data.rawHtml`. O conector separa os destaques pela abertura de cada `<root>` do Liferay, com os campos em `dynamic-element` e `dynamic-content`. O link do ato fica depois do fechamento do XML e antes do próximo bloco ou do fim da página. O Liferay também inclui um script `BuscaDouPortlet_params`, cujo `jsonArray` veio vazio nas amostras. O HTML serializado transforma CDATA em comentário e pode trazer `&nbsp;` em fragmentos XML. O conector ajusta essas duas representações antes de ler o XML. A amostra da primeira página veio do cache (`cacheState: hit`). O POST pede somente `rawHtml` e usa `maxAge: 0` para obter uma leitura fresca. [Firecrawl v2](https://docs.firecrawl.dev/api-reference/endpoint/scrape) · [Cache do Firecrawl](https://docs.firecrawl.dev/features/fast-scraping).

| Campo | Procedência nos destaques |
| --- | --- |
| `id` | Chave interna gerada pelo banco. |
| `origem` | Constante `destaques_dou`. |
| `id_externo` | `idMateria` em texto. Identifica a matéria no XML e foi distinto nos 40 cartões das duas páginas. Um `idOficio` se repetiu na primeira página. |
| `tipo` | `artType` vira `decreto`, `lei`, `medida_provisoria` ou `outro`. Portaria entra como `outro`. |
| `titulo` | `titulo` do XML, com `highlight` quando vazio. `highlight` correspondeu ao título visível dos cartões nas amostras. |
| `ementa` | `ementa` do XML. Vazia ou só com espaços vira nula. |
| `data_publicacao` | `pubDate` (`DD/MM/AAAA`). |
| `data_assinatura` | `data` do XML, quando disponível. Se vier vazia, usa a data por extenso no endereço oficial do ato, quando presente. |
| `secao` | `pubName`. Entram `DO1`, `DO1E` e `DO1S`, da seção 1, incluindo edição extra e suplemento. |
| `orgao` | `artSection`, com `hierarchy` como alternativa. |
| `numero` | Número da norma no endereço oficial ou no `titulo` do XML, em texto, sem separadores de milhar. |
| `fonte_id` | Referência à observação criada na mesma transação que grava o ato. |

`fonte.url` guarda o endereço da página de destaques consultada. `fonte.url_publica` é o link principal do cartão, validado como `https://www.in.gov.br/web/dou/-/<slug>-<identificador numérico>`. Alguns links oficiais trazem barras no slug. A validação admite segmentos com letras, algarismos, pontos e hífens, todos iniciados por letra ou algarismo. `fonte.coletado_em` marca o recebimento e `fonte.trecho` fica nulo. Repetir o período atualiza `(origem, id_externo)` e conserva o id interno. O mesmo ato do Senado tem sua própria origem.

O endereço oficial pode trazer uma data de assinatura incorreta. Se a assinatura encontrada for posterior à publicação, a coleta grava o ato com `data_assinatura` nula e soma uma ocorrência em `assinaturas_ignoradas`.

O comando usa as datas de publicação, incluindo as duas pontas do período. Sem datas, cobre os sete dias completos anteriores no fuso de Brasília. Começa pelo endereço fixo e monta as páginas seguintes com o portlet `mhF1RLPnJWPh`, `_delta=20` e `_cur=N`. Uma primeira página sem destaques reconhecidos dá saída 1 com o motivo `pagina_sem_destaques`. A partir da segunda, uma página sem destaques encerra a busca. Uma página inteiramente anterior ao período também encerra a busca. Uma data de publicação ilegível leva à página seguinte. O teto é de seis páginas. Se a sexta ainda indicar continuação, a coleta sinaliza saída 1.

Atos de pessoal da seção 2 e contratos e editais da seção 3 ficam fora do recorte. O resumo conta descartes por período, seção, data inválida ou futura, campo obrigatório, link e XML inválidos. `assina`, `cargo` e `texto` ficam fora do banco e da saída. Título e ementa são campos do ato no banco e seguem as regras de uso editorial de [dados pessoais](dados-pessoais.md#coleta-dos-destaques-do-diário-oficial).

Sem `FIRECRAWL_API_KEY`, o comando sai com código 2. A coleta confirma a conexão com o banco antes do primeiro pedido. Se o banco não responder, a saída é 1 e o resumo registra zero chamadas. Falha do provedor ou de gravação também sai com código 1 e mantém os atos já confirmados. Respostas HTTP 429 e 5xx permitem até três pedidos da mesma página. O cliente respeita o `Retry-After` e encerra a coleta se a espera solicitada exceder 60 segundos.

## Candidaturas do TSE

O CDN do TSE publica `consulta_cand_AAAA.zip` na pasta `consulta_cand`. Em 2022 e 2026, cada ZIP contém 27 CSVs de UF, o CSV `BR`, o consolidado `BRASIL` e `leiame.pdf`. O consolidado repete exatamente as linhas das partes. A coleta lê só `*_BRASIL.csv` em fluxo. Os CSVs dos dois anos usam latin-1, ponto e vírgula, aspas duplas e CRLF, com 51 colunas de candidaturas. [Candidaturas de 2022](https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2022.zip) · [Candidaturas de 2026](https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip)

O download tem limite de 50 MB por arquivo, e o CSV aberto tem limite de 300 MB. A coleta conta os bytes durante a leitura. BOM, bytes nulos e sequências de UTF-8 multibyte invalidam o arquivo.

A migration `0013` cria `candidatura` após a revisão `0012`, que guarda os vídeos das sessões.

| Registro | Campo | Procedência |
| --- | --- | --- |
| `candidatura` | `id` | Identificador interno gerado pelo banco. |
| | `ano`, `codigo_eleicao` e `id_externo` | Chave única com `ANO_ELEICAO`, `CD_ELEICAO` e `SQ_CANDIDATO`. O último pode ter 12 dígitos. |
| | `cargo` | `CD_CARGO` vale 6 para deputado federal, 5 para senador, 9 para primeiro suplente e 10 para segundo suplente. |
| | `uf`, `partido`, `numero` e `nome_urna` | `SG_UF`, `SG_PARTIDO`, `NR_CANDIDATO` como texto e `NM_URNA_CANDIDATO`. |
| | `resultado` e `resultado_bruto` | `CD_SIT_TOT_TURNO`. Os códigos 1, 2, 3, 4 e 5 viram `eleito`, `eleito_por_qp`, `eleito_por_media`, `nao_eleito` e `suplente`. O código -1 (`#NULO`) vira `sem_resultado`. Um código novo entra como `outro` e é conservado em `resultado_bruto`. |
| | `parlamentar_id` | FK para o parlamentar identificado no cadastro do Congresso. |
| | `fonte_id` | FK da observação do ZIP de candidaturas. |

Em 2026, `CD_SITUACAO_CANDIDATURA` veio todo como `-3` (`#NE`) no recorte. O resultado eleitoral é `CD_SIT_TOT_TURNO`. A fonte guarda a URL oficial do ZIP e a hora da coleta.

Os links declarados ficaram de fora desta entrega porque podem conter dados pessoais no endereço. A coleta dos links será tratada em uma issue própria, com uma lista fechada de redes.

### Ligação com os parlamentares

A coleta começa pelo nome parlamentar, comparado aos nomes de urna e civil com caixa, acentos, pontuação e espaços normalizados. A UF do mandato e o grupo de cargos da Casa limitam essa busca. A apuração reúne todos os mandatos em exercício do parlamentar. O vínculo final precisa ser único tanto para o parlamentar naquele ano quanto para a candidatura.

A candidatura de 2022 precisa ser compatível com o mandato. Para mandato iniciado em 2023, o resultado precisa ser de eleito ou suplente. O mandato de senador iniciado em 2019 fica fora dessa ligação de 2022. A candidatura de 2026 pode ter qualquer resultado, pois a eleição é posterior ao início dos mandatos do recorte.

Um par nominal único e compatível de 2022 pode fornecer o CPF para reconhecer a mesma pessoa em 2026, inclusive após troca de UF. O CPF serve apenas durante a execução. Um par nominal isolado de 2026 pode valer por si e seu CPF pode revelar conflitos. A expansão entre anos depende da âncora de 2022. Mais de um par nominal, CPF repetido no recorte de um ano, CPFs nominais divergentes, CPF que aponta para uma candidatura diferente do par nominal ou candidatura de 2022 incompatível alcançada por CPF invalidam a ligação da pessoa nos dois anos. Quando a busca pelo CPF da âncora encontra em 2026 uma candidatura à outra Casa, só o vínculo de 2022 é gravado, desde que a candidatura e o CPF estejam livres de conflito.

Antes de decidir os vínculos, a coleta compara todos os pares nominais e todas as candidaturas alcançadas pelo CPF, inclusive candidaturas incompatíveis com o mandato ou à outra Casa. Se dois parlamentares reivindicarem a mesma candidatura ou CPF, ambos ficam em conflito nos dois anos, mesmo quando são de Casas diferentes.

O JSON conta `ligados`, `sem_par`, `em_conflito`, `derrubados_pela_trava` e `outro_cargo` por Casa e ano, além das gravações, fontes, descartes e falhas por arquivo. `outro_cargo` conta em 2026 a candidatura à outra Casa encontrada pelo CPF da âncora de 2022 quando a ligação está livre de conflito. Uma linha com quantidade errada de campos, valor inválido ou erro de aspas recuperável entra nos descartes e as demais seguem. Uma aspa de abertura sem fechamento pode consumir a linha seguinte, e as duas contam como um descarte. Um ZIP ausente, membro ou cabeçalho inválido ou CSV ilegível deixa a outra leitura seguir, retorna código 1 e zera as contagens de ligação. As candidaturas e fontes só são gravadas após a leitura completa dos dois arquivos e numa única transação.

Um último registro com menos campos que o cabeçalho e sem quebra de linha invalida o arquivo, e a carga retorna 1 sem gravar candidaturas ou fontes.

Uma candidatura já ligada conserva o parlamentar gravado, inclusive quando ele sai do exercício. Se algum par nominal ou alcançado pelo CPF já tiver outro titular, a pessoa fica em conflito nos dois anos e conserva os vínculos anteriores. Tentar gravar para a mesma pessoa uma candidatura diferente no mesmo ano conta como conflito naquele ano e preserva o vínculo anterior.

Para quem já tem candidaturas gravadas, a coleta as relê pela chave e usa seus CPFs em memória para detectar disputas entre parlamentares e vetar vínculos novos nos dois anos quando faltar uma ficha ou um CPF, ou quando os CPFs divergirem.

Para ligar as eleições históricas na #13, as chaves das candidaturas ligadas permitem reler `consulta_cand` e recuperar os identificadores em memória. A busca percorre todas as UFs. A carga atual cobre as eleições gerais e usa só o CPF. A proposta original para as municipais fica para uma segunda etapa.

> Em 2024 o CPF vem vazio e em 2012 falta em parte das linhas, segundo as notas da #13. Nesses casos, a ligação usa título de eleitor com data de nascimento. [Issue da série de bens](https://github.com/HiRenan/mandatometro/issues/13)

## Bens declarados ao TSE

O CDN publica `bem_candidato_AAAA.zip` na pasta `bem_candidato`. Os arquivos das seis eleições gerais de 2006 a 2026 trazem o consolidado `BRASIL`, 27 UFs e `BR`. Em cada ZIP, a carga lê só o CSV consolidado em fluxo, com os mesmos limites de 50 MB para o ZIP e 300 MB para o membro aberto. Os CSVs usam Latin-1, ponto e vírgula, aspas duplas e CRLF. A descrição livre `DS_BEM_CANDIDATO` tem uma sequência compatível com UTF-8 no arquivo de 2022. O leitor descarta a descrição assim que o CSV separa os campos e continua a recusar BOM, bytes nulos e sequências UTF-8 nos demais dados. [Arquivo de bens de 2022](https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2022.zip)

| Registro | Campo | Procedência |
| --- | --- | --- |
| `candidatura_patrimonio` | `ano`, `codigo_eleicao`, `uf`, `id_externo` | Chave com `ANO_ELEICAO`, `CD_ELEICAO`, `SG_UF` e `SQ_CANDIDATO` nos dois CSVs. Em 2006, o número da candidatura se repete entre UFs. `BR` identifica uma candidatura nacional. |
| | `cargo`, `parlamentar_id` | Código `CD_CARGO` e id interno do parlamentar confirmado. |
| | `fonte_candidatura_id`, `fonte_bens_id` | Uma observação por ZIP usado na gravação, com a URL oficial e a hora da coleta. |
| `bem_declarado` | `candidatura_id`, `tipo` | Chave da agregação por candidatura e `CD_TIPO_BEM_CANDIDATO`. O código desconhecido entra na soma e no resumo. |
| | `valor_centavos` | Soma de `VR_BEM_CANDIDATO` por tipo, no valor nominal em centavos inteiros. |

Os CSVs de bens têm 19 colunas. Em 2006 e 2010, a ordem do bem vem em `NR_ORDEM_CANDIDATO` e as colunas de atualização são `DT_ULTIMA_ATUALIZACAO` e `HH_ULTIMA_ATUALIZACAO`. Desde 2014, são `NR_ORDEM_BEM_CANDIDATO`, `DT_ULT_ATUAL_BEM_CANDIDATO` e `HH_ULT_ATUAL_BEM_CANDIDATO`. A ordem distingue os bens da mesma candidatura. O `consulta_cand` tem 63 colunas em 2006 e 2010, 50 em 2014 e 2018 e 51 nos dois anos recentes. A carga lê os campos de ligação pelo cabeçalho.

O CPF de uma âncora de 2022 ou 2026 precisa apontar para uma única candidatura naquele ano. CPFs compartilhados entre parlamentares ou âncoras da mesma pessoa com CPFs diferentes bloqueiam a ligação. Se o CPF aponta para mais de uma candidatura no ano, aquele ano fica em conflito. O resumo conta as linhas com CPF indisponível. A carga relê as chaves de todo o histórico já gravado para conferir o CPF antes de aceitar novas eleições. A mesma chave conserva o dono e cada parlamentar tem até uma eleição por ano.

Um valor vazio, negativo, malformado ou acima do limite impede a soma da declaração. O leitor também invalida uma declaração quando a ordem do mesmo bem traz dois valores ou tipos diferentes. Nesses casos, uma declaração completa de uma carga anterior é preservada. Zero declarado é registrado como zero. Quando o arquivo de bens não traz linhas da eleição confirmada, ou a primeira leitura não obtém um total válido, a API devolve `total_centavos: null`. Os centavos são limitados ao maior inteiro exato no JavaScript, inclusive na soma por eleição.

O comando `coleta bens-tse` só grava depois de ler os 12 arquivos completos, incluindo o último registro de cada CSV. A gravação usa a mesma trava da carga de candidaturas e ocorre numa única transação. O resumo mostra candidaturas, totais por tipo processados e contagens de descartes. Uma falha de arquivo retorna 1 e preserva todas as gravações anteriores.

`GET /parlamentares/{id}/patrimonio` devolve `eleicoes` em ordem de ano, com `ano`, `cargo` (código e nome), `uf`, `total_centavos` e `fonte` (URL do ZIP de bens e hora da coleta). Os rótulos vêm da lista fixa do TSE no código. A API acrescenta a [correção pelo IPCA](#ipca-mensal) a partir da série gravada.

## IPCA mensal

O SGS do Banco Central publica a variação percentual mensal do IPCA na série 433. A API é pública e dispensa chave. O JSON traz `data` em `DD/MM/AAAA`, sempre com dia `01`, e `valor` como texto com ponto decimal e duas casas. A consulta de 22/11/2026 cobriu janeiro de 2006 a outubro de 2026, com 250 meses consecutivos em um pedido. O `robots.txt` devolveu HTTP 404 nessa data. [Série 433 do SGS](https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/2006&dataFinal=22/11/2026) · [Robots do host](https://api.bcb.gov.br/robots.txt)

O catálogo do Banco Central descreve seus dados como públicos e divulgados sob licença aberta. As séries relacionadas de IPCA no catálogo usam a Licença Aberta para Bases de Dados (ODbL) do Open Data Commons. A busca no catálogo não localizou a ficha da série 433. [Perguntas frequentes do catálogo](https://dadosabertos.bcb.gov.br/pages/perguntas-frequentes) · [Licença de uma série relacionada](https://dadosabertos.bcb.gov.br/dataset/11428-indice-nacional-de-precos-ao-consumidor---amplo-ipca---itens-livres)

| Registro | Campo | Procedência |
| --- | --- | --- |
| `ipca_mensal` | `mes` | Primeiro dia do mês de referência, chave da linha. |
| | `variacao_percentual` | `valor` da série 433, guardado como `NUMERIC(7,2)`. Aceita deflação enquanto o fator mensal for positivo. |
| | `fonte_id` | Uma observação por carga válida, com URL consultada e hora UTC da coleta. |

`coleta ipca` consulta de 01/01/2006 até a data da execução em Brasília. A série precisa começar em janeiro de 2006, seguir sem duplicatas ou lacunas e alcançar pelo menos o segundo mês anterior ao mês corrente. A carga de novembro, por exemplo, precisa chegar a setembro ou depois. A resposta precisa chegar também ao último mês já gravado, se houver. A API do Banco Central devolve apenas os meses publicados na consulta. Uma série recusada ou falha de gravação retorna 1 e preserva a carga anterior. Em uma transação só, a coleta atualiza as taxas e a fonte observada de cada mês, inclusive quando há revisão de um valor.

O total corrigido é o total nominal em centavos multiplicado pelo produto dos fatores `1 + variação_percentual / 100` de outubro do ano eleitoral ao último mês gravado, incluindo os dois meses, em decimal exato, com um único arredondamento ao centavo mais próximo e empate para cima (`ROUND_HALF_UP`). Por exemplo, outubro com 10% e novembro com −5% levam R$ 1,00 a 104,5 centavos, que arredondam para R$ 1,05.

Cada eleição traz `mes_inicio` em `AAAA-MM` e `total_corrigido_centavos`. O corrigido vem nulo se faltar o total ou algum mês do intervalo, se a série acabar antes de outubro daquela eleição ou se o resultado superar o maior inteiro exato do JavaScript. A resposta traz `correcao_ipca` com `indice` igual a `IPCA`, `mes_fim` em `AAAA-MM` e `fonte` com a URL e a hora da coleta do mês final. Com o banco sem a série, `correcao_ipca` é nulo.

## Campos pessoais

As regras de uso, exposição e descarte estão em [dados pessoais](dados-pessoais.md).

- **Câmara:** `/deputados/{id}` devolve `cpf` e `dataNascimento`. A [fixture da Câmara](../apps/backend/tests/fixtures/README.md#dados-pessoais) tem valores fictícios.
- O Senado **não** devolve CPF nos endpoints que usamos. O `/senador/{cod}`, que não usamos, traz `DadosBasicosParlamentar.DataNascimento`, `Naturalidade`, `UfNaturalidade` e `EnderecoParlamentar`: quem gravar essa resposta troca a data de nascimento, como no `/deputados/{id}`.
- **TSE.** `NR_CPF_CANDIDATO`, `NR_TITULO_ELEITORAL_CANDIDATO` e `DT_NASCIMENTO` servem exclusivamente para ligação em memória. Os arquivos de teste da #12 usam valores inventados.

Nome, partido, UF e voto de parlamentar **não** são dados pessoais protegidos neste sentido: são atos públicos de agente público, e é justamente o que a newsletter mostra.

## O que ficou em aberto

- **Separar a votação de mérito das de rito.** Das 27 votações do plenário da Câmara na semana do exemplo, a maioria é procedimental ("Aprovada a Emenda de Redação", "Aprovada a Redação Final"), e as 4 do Senado eram todas da mesma PEC. A newsletter precisa de um critério para escolher o que contar. Fica para a #22, que monta a edição.
- **As orientações de bancada,** depois do MVP (decisão do Renan na #7): o banco do MVP não tem tabela para elas.
- **A série de bens das eleições municipais** fica para uma segunda etapa.
