# Fixtures

Respostas reais das APIs da Câmara e do Senado, gravadas para os [testes de unidade offline](../../../../AGENTS.md#tests). Os conectores (#10 e #11) leem estes arquivos em vez de chamar a rede.

**Coletadas em:** 11/11/2026; os três acréscimos da Câmara indicados abaixo, os dois históricos de mandatos do Senado, a votação secreta 7081 e seu processo foram acrescentados em 16/11/2026. O formato de cada campo está em [docs/dicionario-de-dados.md](../../../../docs/dicionario-de-dados.md).

## De onde veio cada arquivo

| Arquivo | URL |
|---|---|
| `camara/votacoes-plenario-2026-11-03_2026-11-07.json` | `/votacoes?idOrgao=180&dataInicio=2026-11-03&dataFim=2026-11-07&itens=100&ordem=DESC&ordenarPor=dataHoraRegistro` |
| `camara/votacao-2637478-26.json` | `/votacoes/2637478-26` |
| `camara/votacao-2637478-26-votos.json` | `/votacoes/2637478-26/votos` — **lista vazia**: votação não nominal |
| `camara/votacao-2236186-60-votos.json` | `/votacoes/2236186-60/votos` — votação **nominal**, 429 votos |
| `camara/votacao-2236186-60-orientacoes.json` | `/votacoes/2236186-60/orientacoes` |
| `camara/proposicao-2637478.json` | `/proposicoes/2637478` |
| `camara/deputado-178843.json` | `/deputados/178843` — **campos pessoais trocados** |
| `camara/deputados-atuais-pagina-curta.json` | `/deputados?id=178843&itens=2` — 16/11, página curta com um deputado e e-mail fictício |
| `camara/votacao-2236186-60.json` | `/votacoes/2236186-60` — 16/11, detalhe da votação nominal já gravada |
| `camara/proposicao-2236186.json` | `/proposicoes/2236186` — 16/11, proposição daquela votação nominal |
| `senado/votacao-2026-11-03_2026-11-07.json` | `/votacao?dataInicio=2026-11-03&dataFim=2026-11-07` — **todos os motivos de ausência trocados** |
| `senado/senador-lista-atual.json` | `/senador/lista/atual.json` — **motivos de afastamento trocados** |
| `senado/processo-9006525.json` | `/processo/9006525` |
| `senado/senador-5672-mandatos.json` | `/senador/5672/mandatos.json` — um mandato como objeto, sem causa de afastamento |
| `senado/senador-4525-mandatos.json` | `/senador/4525/mandatos.json` — dois mandatos como lista, **todas as causas de afastamento trocadas** |
| `senado/votacao-secreta-7081.json` | `/votacao?dataInicio=2026-04-29&dataFim=2026-04-29&idProcesso=9026396` — uma votação secreta com resultado `R`, **todos os motivos de ausência trocados** |
| `senado/processo-9026396.json` | `/processo/9026396` — a matéria da votação secreta |
| `senado/legislacao/lista-{DEC,LEI,MPV}-2026.json` | `/legislacao/lista?tipo={DEC,LEI,MPV}&ano=2026` — recortes de 19/11/2026 com assinaturas dentro e fora do período |
| `senado/legislacao/detalhe-{44427519,44391098,44363879}.json` | `/legislacao/{id}` — um detalhe por tipo, com publicações do DOU regular e de edição extra |
| `firecrawl/destaques-p{1,2}.json` | `POST /v2/scrape` — recortes das duas primeiras páginas dos destaques do DOU em 19/11/2026, com dados fictícios nos textos livres |

Bases: `https://dadosabertos.camara.leg.br/api/v2` e `https://legis.senado.leg.br/dadosabertos`.

## Dados pessoais

A troca por valores fictícios segue as regras de [dados pessoais](../../../../docs/dados-pessoais.md) e de [testes offline](../../../../AGENTS.md#tests). Em `camara/deputado-178843.json`:

- `cpf` virou `00000000000`;
- `dataNascimento` virou `1970-01-01`.

Na página curta de deputados acrescentada em 16/11, o `email` foi substituído por `parlamentar@example.com`. Ela não traz CPF nem data de nascimento. Os testes do conector simulam as páginas seguintes em memória, sem gravar os 513 cadastros. Os dois outros acréscimos não contêm cadastro pessoal.

O `tests/test_respostas_gravadas.py` verifica recursivamente os três acréscimos de 16/11: `cpf` e `dataNascimento` devem estar ausentes, e qualquer `email` deve ser exatamente `parlamentar@example.com`. A verificação percorre objetos e listas, inclusive campos aninhados; uma nova gravação sem sanitização faz o CI falhar, sem imprimir os valores encontrados.

Em `senado/senador-lista-atual.json`, os 50 exercícios com motivo de afastamento ficaram com o mesmo valor fictício, porque um motivo pode ser de saúde, e só os de saúde trocados se destacariam:

- `SiglaCausaAfastamento` virou `XXX`;
- `DescricaoCausaAfastamento` virou `Motivo fictício`.

O histórico `senador-4525-mandatos.json` segue a mesma regra em todos os exercícios. Um teste em `tests/test_respostas_gravadas.py` percorre a lista e os históricos para conferir essa troca: se forem gravados de novo sem ela, o CI falha.

O processo `senado/processo-9026396.json` não contém campos de identificação pessoal (CPF, documento de identidade, título de eleitor ou nascimento), contato ou afastamento. O guarda em `tests/test_respostas_gravadas.py` percorre objetos e listas e recusa esses campos mesmo vazios, sem imprimir valores da resposta; uma nova gravação exige a mesma conferência.

Nas votações nominais de 03–07/11/2026, os quatro códigos de ausência foram trocados por `XXX`, e suas quatro descrições, por `Motivo fictício`, em 16/11/2026. É o mesmo par usado nas duas ausências da votação secreta 7081: todos os motivos recebem o mesmo marcador, para nenhum se destacar. A mesma troca vale para qualquer código que não esteja na lista de votos/presenças conhecidos, para não guardar um motivo pessoal ainda não classificado.

O teste percorre todos os arquivos `senado/votacao-*.json` e confere os pares permitidos de código e descrição, inclusive o marcador único; uma descrição pessoal também é recusada sob um código de voto permitido. As respostas permanecem inteiras: 324 registros nas quatro nominais e 81 na secreta, incluindo 77 `Votou`. O marcador `XXX` é desconhecido pelo normalizador e vira `outro`, sem código bruto, nos testes das nominais; os testes de `test_modelo.py` continuam exercitando as ausências conhecidas com dados inventados no próprio teste. Nenhum registro da secreta vira voto individual no banco.

As demais respostas de votações e cadastros parlamentares omitem CPF, título de eleitor, data de nascimento e motivo de afastamento. Como a fonte publica, os arquivos trazem e-mail e telefone de gabinete, foto, nome completo e sexo de deputados e senadores, e o `camara/deputado-178843.json` traz também a cidade e a UF de nascimento e a escolaridade. Ao gravar uma fixture nova de `/deputados/{id}`, da lista de senadores ou dos mandatos, faça a mesma troca. Ausências nos votos também precisam de sanitização: nunca grave uma licença real ligada ao parlamentar. Os testes do conector que exercitam ausências e códigos desconhecidos usam pessoas inventadas.

Nas amostras de legislação, os textos livres foram trocados por exemplos fictícios antes de gravar os arquivos. As ementas incluem nome e CPF fictícios para exercitar a preservação no banco e a omissão na saída. Foram preservados a estrutura, os ids, os tipos, as datas, as fontes de publicação e os links oficiais.

Nos recortes do Firecrawl, títulos, ementas, órgão, assinaturas, cargos e inteiro teor usam valores fictícios. Os endereços dos atos no recorte conservam número, data e identificador. A primeira página inclui um cartão inventado da seção 2 e um XML quebrado para exercitar os descartes. As amostras preservam os metadados da URL consultada e a representação do XML em `rawHtml`.

## Por que estes casos

Cada arquivo cobre um comportamento que o conector precisa tratar:

- **Uma semana real de votações** nas duas Casas, que é a janela da newsletter.
- **Uma votação nominal e uma não nominal** na Câmara: na segunda, `/votos` responde HTTP 200 com lista vazia, e é o caso comum.
- **Uma votação do Senado com os 81 senadores** e com os totais vindo `null`, que obriga a contar a lista.
- **Um processo do Senado com `outrosNumeros`**, que é por onde se tenta ligar a matéria à versão da Câmara.
- **Uma votação secreta rejeitada no Senado**, com `Votou` e ausências na lista e placar nos totais; testa o resultado `R` e que nenhum voto individual é gravado.

## Como atualizar

Os CSVs de `tse/` foram escritos com dados inventados e os mesmos cabeçalhos dos arquivos oficiais de 2022 e 2026. Mantenha latin-1, aspas duplas, ponto e vírgula e CRLF. Os testes montam ZIPs temporários com esses CSVs e usam transporte local para verificar o download.

Se a estrutura de uma API mudar, grave de novo o arquivo com a resposta íntegra (JSON indentado com 2 espaços, UTF-8, fim de linha LF), refaça a troca dos campos pessoais e atualize a data de coleta no topo deste arquivo e no dicionário.
