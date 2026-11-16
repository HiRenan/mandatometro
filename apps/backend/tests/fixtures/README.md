# Fixtures

Respostas reais das APIs da Câmara e do Senado, gravadas para os testes de unidade rodarem offline, como o `AGENTS.md` pede. Os conectores (#10 e #11) leem estes arquivos em vez de chamar a rede.

**Coletadas em:** 11/11/2026, com os três acréscimos indicados abaixo em 16/11/2026. O formato de cada campo está em [docs/dicionario-de-dados.md](../../../../docs/dicionario-de-dados.md).

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

Bases: `https://dadosabertos.camara.leg.br/api/v2` e `https://legis.senado.leg.br/dadosabertos`.

## Dados pessoais

O `AGENTS.md` manda trocar CPF, título de eleitor e motivo de afastamento por valores fictícios nas fixtures. Em `camara/deputado-178843.json`:

- `cpf` virou `00000000000`;
- `dataNascimento` virou `1970-01-01`.

Na página curta de deputados acrescentada em 16/11, o `email` foi substituído por `parlamentar@example.com`. Ela não traz CPF nem data de nascimento. Os testes do conector simulam as páginas seguintes em memória, sem gravar os 513 cadastros. Os dois outros acréscimos não contêm cadastro pessoal.

Em `senado/senador-lista-atual.json`, os 50 exercícios com motivo de afastamento ficaram com o mesmo valor fictício, porque um motivo pode ser de saúde, e só os de saúde trocados se destacariam:

- `SiglaCausaAfastamento` virou `XXX`;
- `DescricaoCausaAfastamento` virou `Motivo fictício`.

Um teste em `tests/test_respostas_gravadas.py` confere essa troca: se a lista for gravada de novo sem ela, o CI falha.

Nenhum outro arquivo desta pasta traz campo pessoal. Ao gravar uma fixture nova de `/deputados/{id}` ou da lista de senadores, faça a mesma troca.

## Por que estes casos

Cada arquivo cobre um comportamento que o conector precisa tratar:

- **Uma semana real de votações** nas duas Casas, que é a janela da newsletter.
- **Uma votação nominal e uma não nominal** na Câmara: na segunda, `/votos` responde HTTP 200 com lista vazia, e é o caso comum.
- **Uma votação do Senado com os 81 senadores** e com os totais vindo `null`, que obriga a contar a lista.
- **Um processo do Senado com `outrosNumeros`**, que é por onde se tenta ligar a matéria à versão da Câmara.

## Como atualizar

Se a estrutura de uma API mudar, grave de novo o arquivo com a resposta íntegra (JSON indentado com 2 espaços, UTF-8, fim de linha LF), refaça a troca dos campos pessoais e atualize a data de coleta no topo deste arquivo e no dicionário.
