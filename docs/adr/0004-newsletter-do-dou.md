# ADR 0004: a newsletter ganha o Diário Oficial, e a IA passa a sugerir a seleção

- **Data:** 18/11/2026
- **Status:** aceita

## Contexto

O [ADR 0002](0002-mvp.md) definiu a newsletter como "o que o Congresso votou na semana": a coleta lê as APIs da Câmara e do Senado, o LLM escreve o rascunho e uma pessoa do time revisa antes de publicar (#22 e #39). É o que está no ar.

Duas limitações apareceram com o produto funcionando:

- **A edição só enxerga o Legislativo.** O que o Executivo publica no Diário Oficial da União — decreto, regulamentação, programa novo — fica de fora, embora seja parte do que afeta quem lê. O lema do produto é "o diário oficial político, simplificado", e o diário oficial mesmo não entrava.
- **A revisão exige o repositório na máquina.** Ela é um arquivo JSON editado pelo CLI (`exportar`, `revisar`, `publicar`). Quem revisa precisa de banco, Python e as variáveis de ambiente.

Em 16/11/2026, o Arrais propôs ao time ler os destaques do DOU por semana, com a IA selecionando o que é mais relevante, e deixar o resultado no sábado num painel, para os administradores escolherem o que vai no domingo. Em 18/11, o time fechou as decisões abaixo.

## Decisão

- **A edição passa a ter duas seções:** as votações da Câmara e do Senado, que continuam como estão, e os destaques do Diário Oficial da União. O DOU acrescenta, não substitui.
- **A fonte do DOU é o INLABS,** o serviço de dados abertos da Imprensa Nacional (`inlabs.in.gov.br`), com cadastro gratuito e os XMLs das edições. **Não** se raspa a página de destaques do `in.gov.br`.
- **A IA passa a ordenar e sugerir a seleção dos atos do DOU,** e uma pessoa confirma item a item antes de publicar.
- **A revisão ganha um painel** (#114), onde o material fica pronto no sábado e a pessoa escolhe o que vai no domingo. No primeiro momento o painel serve só para selecionar e validar.

### Por que o INLABS, e não a página de destaques

Em 18/11/2026, `https://www.in.gov.br/robots.txt` respondeu HTTP 200 com:

```
User-agent: *
Disallow: /
```

É um `Disallow: /` para todos os agentes, no site inteiro. O [`AGENTS.md`](../../AGENTS.md) manda que a coleta respeite o robots.txt dos sites e siga a RFC 9309, e isso vale igual para uma leitura feita pelo Firecrawl: a requisição que chega ao servidor do órgão é a mesma. Ler aquela página contrariaria a regra do próprio projeto.

O INLABS não tem `robots.txt` — responde 404, que a RFC 9309 e a base da coleta tratam como ausência de regras. É o caminho que a Imprensa Nacional publica para quem quer o DOU em lote.

Em 18/11/2026 o INLABS respondeu HTTP 200 com a página "Manutenção Programada": confirmar que o serviço voltou antes de fechar a #200.

## Consequências

- **A seleção deixa de ser só determinística.** Até aqui, `ia/selecao.py` escolhe e ordena por regra, e o `AGENTS.md` diz que "a redação nunca escolhe votos ou matérias" — o LLM só redige o que o código selecionou. Para o DOU, o modelo passa a ordenar por relevância e sugerir o que entra. **O contrapeso é a confirmação humana:** nada publica sem alguém aprovar item a item, e recusa, corte ou formato inválido deixam a seleção pendente. A seção das votações continua com a seleção determinística de hoje.
- **O `fatos` precisa de uma versão nova.** Hoje `ia/esquemas.py` exige pelo menos uma proposição **e** uma votação por item, com `extra="forbid"`: um item de DOU é estruturalmente impossível. A #204 é a pedra angular — sem ela, nada do resto fecha. Item já gravado continua válido.
- **O DOU traz dado pessoal de um jeito novo.** Nomeação, exoneração, aposentadoria e sanção vêm com nome, cargo e às vezes CPF. O filtro de `ia/privacidade.py` foi escrito para o vocabulário do Congresso (licença, afastamento, saúde) e não cobre isso (#206). Valem as regras de "Dados pessoais" do `AGENTS.md` e o item 6.9 do regulamento do hackathon, que proíbe a demo expor dado pessoal real de terceiro.
- **O Firecrawl sai desta linha de trabalho.** Ele continua só na #9, para o inteiro teor das proposições. A decisão aqui é sobre a fonte do DOU, não sobre a ferramenta.
- **O painel traz autenticação para a revisão.** A `Conta` não tem papel nenhum hoje, e a API só expõe edição publicada. O painel pede papel de administrador (#207), rotas autenticadas (#208) e uma tela atrás da guarda de sessão (#209). As regras de `ia/servico.py` continuam valendo: item com pendência não publica, venha o pedido do CLI ou da rota.
- **A coleta ganha um caminho que não é JSON.** O `ClienteHttp` trava a base numa origem HTTPS, só faz GET e só decodifica JSON; o INLABS pede login com cookie e devolve XML em ZIP (#201). Timeout, backoff, `Retry-After` e robots continuam.
- **O que o produto promete muda.** O `PRODUCT.md`, o `README.md` e o `AGENTS.md` diziam que a newsletter é o que o Congresso votou na semana. Passam a dizer que ela tem as duas seções, com a do DOU em construção (#113).

## O que fica para depois

Gestão de usuários (#212) e indicadores de retenção e frequência (#213) ficam fora do MVP, por decisão do time: no primeiro momento o painel serve só para selecionar e validar a edição.
