# ADR 0006 — Coleta semanal da página de destaques do DOU

- **Data** 19/11/2026
- **Status** aceita

## Contexto

Os destaques são a escolha editorial da própria Imprensa Nacional, com atos oficiais e públicos. A coleta do Senado cobre decretos, leis e medidas provisórias. A página acrescenta portarias e outros atos de ministérios. O INLABS exige conta, esteve em manutenção em 18 e 19/11/2026 e oferece edições completas. A página de destaques é o único canal aberto para essa seleção editorial. [ADR 0005](0005-legislacao-federal-na-newsletter.md).

O `robots.txt` de `www.in.gov.br` respondeu `Disallow: /` para todos os agentes. O time escolheu a página de destaques na reunião de 18/11/2026. Renan aprovou a exceção em 19/11/2026, condicionada a este registro.

## Decisão

Na preparação da edição, a coleta roda uma vez por semana via `POST /v2/scrape` do Firecrawl, com uma página por pedido. A exceção abrange a [página de destaques](https://www.in.gov.br/servicos/diario-oficial-da-uniao/destaques-do-diario-oficial-da-uniao) e sua paginação canônica, até seis páginas ao todo. O código gera essas URLs a partir do endereço fixo e do número da página. A regra de bloqueio vale para todo o restante do site. O conector guarda os endereços `/web/dou/-/…` como links oficiais dos atos.

## Consequências

A coleta guarda os atos destacados da seção 1. Se a sexta página ainda puder abranger o período, o resumo sinaliza uma coleta incompleta e preserva as gravações confirmadas. A regra de leitura e o mapeamento dos dados estão no [dicionário](../dicionario-de-dados.md#destaques-da-imprensa-nacional).
