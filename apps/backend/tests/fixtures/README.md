# Fixtures

Respostas reais das APIs da Câmara e do Senado, gravadas para os testes de unidade rodarem offline, como o `AGENTS.md` pede. Os conectores (#10 e #11) leem estes arquivos em vez de chamar a rede.

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
| `senado/votacao-2026-11-03_2026-11-07.json` | `/votacao?dataInicio=2026-11-03&dataFim=2026-11-07` |
| `senado/senador-lista-atual.json` | `/senador/lista/atual.json` — **motivos de afastamento trocados** |
| `senado/processo-9006525.json` | `/processo/9006525` |
| `senado/senador-5672-mandatos.json` | `/senador/5672/mandatos.json` — um mandato como objeto, sem causa de afastamento |
| `senado/senador-4525-mandatos.json` | `/senador/4525/mandatos.json` — dois mandatos como lista, **todas as causas de afastamento trocadas** |
| `senado/votacao-secreta-7081.json` | `/votacao?dataInicio=2026-04-29&dataFim=2026-04-29&idProcesso=9026396` — uma votação secreta com resultado `R`, **todos os motivos de ausência trocados** |
| `senado/processo-9026396.json` | `/processo/9026396` — a matéria da votação secreta |

Bases: `https://dadosabertos.camara.leg.br/api/v2` e `https://legis.senado.leg.br/dadosabertos`.

## Dados pessoais

O `AGENTS.md` manda trocar CPF, título de eleitor e motivo de afastamento por valores fictícios nas fixtures. Em `camara/deputado-178843.json`:

- `cpf` virou `00000000000`;
- `dataNascimento` virou `1970-01-01`.

Na página curta de deputados acrescentada em 16/11, o `email` foi substituído por `parlamentar@example.com`. Ela não traz CPF nem data de nascimento. Os testes do conector simulam as páginas seguintes em memória, sem gravar os 513 cadastros. Os dois outros acréscimos não contêm cadastro pessoal.

Em `senado/senador-lista-atual.json`, os 50 exercícios com motivo de afastamento ficaram com o mesmo valor fictício, porque um motivo pode ser de saúde, e só os de saúde trocados se destacariam:

- `SiglaCausaAfastamento` virou `XXX`;
- `DescricaoCausaAfastamento` virou `Motivo fictício`.

O histórico `senador-4525-mandatos.json` segue a mesma regra em todos os exercícios. Um teste em `tests/test_respostas_gravadas.py` percorre a lista e os históricos para conferir essa troca: se forem gravados de novo sem ela, o CI falha.

Na votação secreta 7081, os dois códigos de ausência foram trocados por `XXX`, e suas descrições, por `Motivo fictício`. A mesma troca vale para qualquer código que não esteja na lista de votos/presenças conhecidos, para não guardar um motivo pessoal ainda não classificado. O teste confere os códigos permitidos nessa fixture e o marcador de cada motivo. A resposta permanece inteira, com 81 registros, incluindo 77 `Votou`; nenhum deles vira voto individual no banco por ser uma votação secreta.

Nenhum outro arquivo desta pasta traz CPF, título de eleitor, data de nascimento ou motivo de afastamento. Como a fonte publica, os arquivos trazem e-mail e telefone de gabinete, foto, nome completo e sexo de deputados e senadores, e o `camara/deputado-178843.json` traz também a cidade e a UF de nascimento e a escolaridade. Ao gravar uma fixture nova de `/deputados/{id}`, da lista de senadores ou dos mandatos, faça a mesma troca. Ausências nos votos também precisam de sanitização: nunca grave uma licença real ligada ao parlamentar. Os testes do conector que exercitam ausências e códigos desconhecidos usam pessoas inventadas.

## Por que estes casos

Cada arquivo cobre um comportamento que o conector precisa tratar:

- **Uma semana real de votações** nas duas Casas, que é a janela da newsletter.
- **Uma votação nominal e uma não nominal** na Câmara: na segunda, `/votos` responde HTTP 200 com lista vazia, e é o caso comum.
- **Uma votação do Senado com os 81 senadores** e com os totais vindo `null`, que obriga a contar a lista.
- **Um processo do Senado com `outrosNumeros`**, que é por onde se tenta ligar a matéria à versão da Câmara.
- **Uma votação secreta rejeitada no Senado**, com `Votou` e ausências na lista e placar nos totais; testa o resultado `R` e que nenhum voto individual é gravado.

## Como atualizar

Se a estrutura de uma API mudar, grave de novo o arquivo com a resposta íntegra (JSON indentado com 2 espaços, UTF-8, fim de linha LF), refaça a troca dos campos pessoais e atualize a data de coleta no topo deste arquivo e no dicionário.
