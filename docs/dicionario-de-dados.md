# Dicionário de dados: Câmara e Senado

O que cada API devolve, quais campos usamos e como os registros se ligam. É a referência do modelo de dados (#7) e dos conectores (#10 e #11).

**Conferido em:** 11/11/2026, por chamada real a cada endpoint, e de novo em 16/11/2026, nas correções da revisão (#90) e na coleta do Senado (#11). As respostas completas estão em [`apps/backend/tests/fixtures/`](../apps/backend/tests/fixtures/), e os testes offline leem de lá. Os históricos `mandatos.json` e uma votação secreta entraram com a #11; uma amostra da lista de deputados entrou com a #10.

Bases, as duas sem chave de acesso:

- **Câmara:** `https://dadosabertos.camara.leg.br/api/v2`
- **Senado:** `https://legis.senado.leg.br/dadosabertos`

Os endpoints de depois do MVP seguem nas notas da #10 e da #11. O TSE entra depois do MVP, nas issues #12 e #13.

## Como ler este documento

Cada endpoint tem a URL que usamos, uma tabela de campos e um exemplo real recortado. Na coluna **Usamos**:

- **sim** — o conector usa o campo. O que fica no banco está em [Da API para os nomes do domínio](#da-api-para-os-nomes-do-domínio);
- **chave** — id público da Câmara ou do Senado, que serve para casar os registros. Processos e votações podem aparecer pelo id público no log, como em "coletando a votação 2637478-26". Para ids de pessoas e avisos de voto desconhecido, veja [dados pessoais](dados-pessoais.md);
- **só ligação, não exibir** — dado pessoal que segue as regras de [ligação entre bases](dados-pessoais.md#parlamentares-e-candidatos);
- **não** — existe na resposta e não vamos usar agora.

## Regras que valem para as duas APIs

- Toda chamada externa tem timeout e nova tentativa com backoff. A API da Câmara devolve 504 de vez em quando.
- O User-Agent identifica o projeto (`mandatometro (Hack Brasil 2026)`), e a coleta respeita o robots.txt dos sites.
- **Robots da coleta:** em 16/11/2026, `dadosabertos.camara.leg.br/robots.txt` respondeu HTTP 200 com HTML de página inexistente, sem regras, e `legis.senado.leg.br/robots.txt` respondeu 403. A base lê o arquivo uma vez por execução, usa `RobotFileParser.parse()` e segue a RFC 9309: aplica as regras legíveis; sem regras ou com 4xx no arquivo (exceto 408/429, transitórios), continua; falha de rede/5xx persistente interrompe. Um 403 no endpoint de dados continua sendo erro. `Crawl-delay`, `Request-rate` e `Retry-After` são respeitados.
- As respostas da Câmara e do Senado são UTF-8, e nenhuma das duas declara o charset no `content-type` (as duas mandam `application/json`): decodifique explicitamente como UTF-8, ou os acentos embaralham no Windows.
- As chamadas de cada coleta rodam em sequência.
- As regras de fonte estão no [PRODUCT.md](../PRODUCT.md#capabilities-and-constraints).

### Pegadinhas e saída da coleta

- **Completude da paginação da Câmara:** as páginas precisam ser consecutivas desde a primeira, e o maior `last` anunciado continua valendo se uma página seguinte o omitir. Um salto ou fim antecipado torna a execução parcial (saída 1); a coleção incompleta não chega à gravação nem à reconciliação de exercício ou votos, preservando os dados anteriores da unidade.
- **Saída das coletas:** histórico de mandatos indisponível (404/410) entra no resumo como `mandatos:parlamentar_id=<id interno>`, uma vez e só após confirmar a gravação; o caminho com o código público fica apenas no cache privado da execução. Processos do Senado e votações da Câmara podem manter seus ids públicos, pois não identificam pessoas. No Actions, `scripts/tarefas.py` suprime os logs durante a coleta e imprime só o resumo, com mensagens fixas para erros de configuração ou inesperados.

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
| `voto.parlamentar` | `votos[].deputado_.id` | `votos[].codigoParlamentar` |
| `voto.valor` / `valor_bruto` | `tipoVoto` | `siglaVotoParlamentar` |
| `voto.partido` | `votos[].deputado_.siglaPartido` | `votos[].siglaPartidoParlamentar` |
| `voto.uf` | `votos[].deputado_.siglaUf` | `votos[].siglaUFParlamentar` |

O partido fica no voto, e não no mandato: é o do dia do voto, porque muda dentro do mandato. A UF fica nos dois: a do mandato e a do dia do voto. O histórico de partidos do `/senador/{cod}/mandatos.json` não entra no banco.

O `resultado` e o `voto.valor` têm domínios diferentes nas duas Casas, e o modelo traduz os dois para um conjunto nosso, com o `normalizar_resultado` e o `normalizar_voto` (decisões do Renan na #7, em 12/11/2026, com os ajustes da #97):

- **`votacao.resultado`:** `aprovada`, `rejeitada` ou `outro`. O `1` e o `"A"` viram `aprovada`, o `0` e o `"R"` viram `rejeitada`, e um código ainda não classificado vira `outro`. O `resultado_bruto` guarda o código como a Casa publicou.
- **`voto.valor`:** `sim`, `nao`, `abstencao`, `obstrucao`, `presidente`, `nao_votou` ou `outro`. O `Artigo 17` e o `Presidente (art. 51 RISF)` viram `presidente`, e o `P-NRV` vira `nao_votou`. O armazenamento do `valor_bruto` segue as regras de [ausências e afastamentos](dados-pessoais.md#ausências-e-afastamentos).

## Campos pessoais

As regras de uso, exposição e descarte estão em [dados pessoais](dados-pessoais.md).

- **Câmara:** `/deputados/{id}` devolve `cpf` e `dataNascimento`. A [fixture da Câmara](../apps/backend/tests/fixtures/README.md#dados-pessoais) tem valores fictícios.
- O Senado **não** devolve CPF nos endpoints que usamos. O `/senador/{cod}`, que não usamos, traz `DadosBasicosParlamentar.DataNascimento`, `Naturalidade`, `UfNaturalidade` e `EnderecoParlamentar`: quem gravar essa resposta troca a data de nascimento, como no `/deputados/{id}`.

Nome, partido, UF e voto de parlamentar **não** são dados pessoais protegidos neste sentido: são atos públicos de agente público, e é justamente o que a newsletter mostra.

## O que ficou em aberto

- **Separar a votação de mérito das de rito.** Das 27 votações do plenário da Câmara na semana do exemplo, a maioria é procedimental ("Aprovada a Emenda de Redação", "Aprovada a Redação Final"), e as 4 do Senado eram todas da mesma PEC. A newsletter precisa de um critério para escolher o que contar. Fica para a #22, que monta a edição.
- **As orientações de bancada,** depois do MVP (decisão do Renan na #7): o banco do MVP não tem tabela para elas.
- **O TSE,** depois do MVP (#12 e #13). `SQ_CANDIDATO` liga os arquivos dentro de uma eleição.
- Os CSVs do TSE vêm em latin-1, separados por `;`, um por UF dentro de cada ZIP.
- A mesma pessoa se liga entre eleições do TSE pelo CPF. Em 2024 o CPF vem vazio e em 2012 falta em parte das linhas: nesses anos, use o título de eleitor e confira a data de nascimento.
