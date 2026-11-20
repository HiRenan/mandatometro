# ADR 0005 — Legislação federal na newsletter

- **Data:** 19/11/2026
- **Status:** aceita

## Contexto

O [ADR 0004](0004-newsletter-do-dou.md) escolheu o INLABS para obter os atos da newsletter. O serviço exige conta e respondeu com “Manutenção Programada” em 18 e 19/11/2026.

## Decisão

A coleta dos atos da newsletter usa a [lista de legislação federal dos dados abertos do Senado](https://legis.senado.leg.br/dadosabertos/legislacao/lista?tipo=LEI&ano=2026). A fonte dispensa cadastro e usa o mesmo endereço que o projeto já consulta para as votações do Senado. O detalhe de cada norma informa a publicação no DOU e o endereço oficial que a edição pode mostrar.

A cobertura do Senado se limita a decretos, leis e medidas provisórias. A coleta complementar de portarias e atos de ministérios está no [ADR 0006](0006-destaques-do-dou.md).
