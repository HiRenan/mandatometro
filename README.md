# Mandatômetro

**Aprenda política com dados reais.** Um site de educação política, gamificado, que põe lado a lado o que deputados federais e senadores prometeram na campanha e o que fizeram no mandato, com a fonte de cada informação.

> Em construção no [Hack Brasil 2026](https://hackbrasil.com), de 4 a 30 de novembro de 2026.
>
> Trilha: Acesso à educação.

## O que ele faz

### Aprender política

A maioria das pessoas não sabe como o Congresso funciona nem o que seus representantes fazem lá. O Mandatômetro ensina as duas coisas com casos reais.

- **Material de estudo:** os dados de cada parlamentar, logo abaixo, explicados em linguagem simples e com a fonte.
- **Jogo (em definição):** o site vai ser gamificado, para as pessoas usarem e voltarem.

### Os dados de cada parlamentar

- **Atuação:** proposições de autoria e votos nominais de cada parlamentar, direto das APIs da Câmara e do Senado.
- **Promessas × atuação:** um LLM extrai as promessas de campanha de sites e notícias e procura os atos ligados a cada uma, com o trecho e o link da fonte.
- **Patrimônio declarado:** a evolução dos bens declarados ao TSE a cada eleição, corrigida pela inflação.
- **Seguir por e-mail:** resumo semanal e alertas sobre quem você acompanha.

O MVP cobre deputados federais e senadores do Brasil todo e começa por Santa Catarina.

## Fontes

Só dados públicos, sempre com link para a origem:

- [Dados Abertos da Câmara dos Deputados](https://dadosabertos.camara.leg.br/)
- [Dados Abertos do Senado Federal](https://legis.senado.leg.br/dadosabertos/)
- [Portal de Dados Abertos do TSE](https://dadosabertos.tse.jus.br/): candidaturas, sites e redes declarados e bens
- Sites de campanha e notícias, lidos com o Firecrawl

Deputados e senadores não são obrigados a registrar propostas no TSE. Quando não encontramos promessas de alguém, mostramos quais fontes consultamos.

## Ferramentas parceiras

| Ferramenta | Uso no Mandatômetro |
|---|---|
| [Firecrawl](https://www.firecrawl.dev/) | Coleta em lote dos sites de campanha e das notícias; o change tracking avisa quando uma promessa muda ou some |
| [Resend](https://resend.com/) | Confirmação de inscrição, resumo semanal e alertas |
| [Devin](https://devin.ai/) | Conectores de dados, API e testes, com PRs neste repositório (label `devin`) |

## Stack

FastAPI · PostgreSQL com pgvector · React · Docker Compose

## Como rodar

O ambiente local chega com o [esqueleto do projeto](https://github.com/HiRenan/mandatometro/issues/5). Por enquanto:

```bash
cp .env.example .env   # preencha as chaves; o .env fica fora do Git
```

## Time

- Renan Mocelin
- Pedro Vinicius Meerholz
- Nathan Arrais

## Licença

[MIT](LICENSE)
