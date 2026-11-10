# Conteúdo das trilhas

Os textos das trilhas ficam em Markdown, em `apps/web/conteudo/trilhas/`. Um artigo novo entra no site com um arquivo novo, sem mexer no código. Mudar um texto vira um PR, que também é a revisão do conteúdo.

## Onde fica cada coisa

```text
apps/web/conteudo/trilhas/
  processo-legislativo/            uma pasta por trilha
    trilha.md                      título, descrição e ordem da trilha
    quem-pode-propor-uma-lei.md    um arquivo por artigo
    onde-o-projeto-comeca.md
```

- **O nome da pasta e o do arquivo viram o endereço da página:** `processo-legislativo/onde-o-projeto-comeca.md` aparece em `/trilhas/processo-legislativo/onde-o-projeto-comeca`. Os nomes só podem ter letras minúsculas sem acento, números e hífens.
- **Renomear um arquivo muda o endereço** e apaga a marca de lido desse artigo para quem já tinha lido, porque o navegador guarda o progresso pelo par `trilha/artigo`.

## A trilha: `trilha.md`

Só o cabeçalho, sem texto:

```markdown
---
titulo: Processo legislativo
descricao: Como uma ideia vira lei no Brasil, passo a passo, do projeto apresentado ao trabalho das comissões.
ordem: 1
---
```

- `titulo`: o nome da trilha.
- `descricao`: uma ou duas frases. Aparece na lista de trilhas, no topo da trilha e na prévia do link.
- `ordem`: a posição na lista de trilhas, um número inteiro a partir de 1, sem repetir.

## O artigo

O cabeçalho fica entre duas linhas com `---`, e o texto vem depois:

```markdown
---
titulo: Onde o projeto começa
resumo: Um projeto de lei precisa ser aprovado nas duas Casas do Congresso. Em regra, quem propõe o projeto define por qual delas ele começa.
ordem: 2
fontes:
  - titulo: Constituição Federal, art. 64
    url: https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art64
    consultadoEm: 2026-11-09
  - titulo: Câmara dos Deputados, Entenda o processo legislativo
    url: https://www.camara.leg.br/entenda-o-processo-legislativo/
    consultadoEm: 2026-11-09
---

O Congresso Nacional tem duas Casas: a Câmara dos Deputados e o Senado Federal.

## Quando o começo é na Câmara

Em regra, o projeto começa na Câmara dos Deputados, a não ser que...
```

- `titulo`: o título do artigo.
- `resumo`: uma ou duas frases. Aparece abaixo do título, na lista da trilha e na prévia do link.
- `ordem`: a posição na trilha, um número inteiro a partir de 1, sem repetir dentro da trilha. Os números podem pular (10, 20, 30), o que deixa espaço para encaixar um artigo no meio depois.
- `fontes`: pelo menos uma. Cada fonte tem:
  - `titulo`: o nome que aparece na lista de fontes, como "Constituição Federal, art. 64";
  - `url`: um link `https` de um site oficial, com o domínio terminado em `gov.br`, `leg.br` ou `jus.br`;
  - `consultadoEm`: o dia em que a fonte foi conferida, no formato `AAAA-MM-DD`.
- Um campo a mais, ou com o nome errado, também é erro.

## O texto

- **As seções começam com `##`.** O título do artigo vem do cabeçalho, então o texto não usa `#`.
- Parágrafos, listas (`-` ou `1.`), negrito (`**assim**`) e links funcionam. HTML no meio do texto não é interpretado.
- O tempo de leitura é calculado com 200 palavras por minuto, e o mínimo é 1 minuto.
- **Valem as regras de conteúdo do `AGENTS.md`:** tom neutro e apartidário, a fonte oficial em cada explicação e nenhum dado pessoal. A voz é a do `PRODUCT.md`: um professor paciente, que trata a pessoa por "você" e dá o exemplo antes da regra.
- Quando o texto cita um artigo de lei, como "(art. 61)", essa lei entra nas fontes.

## Pegadinhas do YAML

- **Um valor com `: ` (dois-pontos seguido de espaço) vai entre aspas:** `titulo: "Lei 14.133: o que muda"`. Sem as aspas, o cabeçalho deixa de ser YAML válido, e o teste aponta o arquivo.
- **Um ` #` (espaço e cerquilha) começa um comentário:** em `titulo: O projeto #1 da trilha`, o título vira só "O projeto", sem aviso nenhum. Um valor com ` #` também vai entre aspas.
- **As fontes ficam recuadas com dois espaços,** com um `-` na frente de cada uma e os três campos alinhados.

## Como conferir

- **`pnpm --filter web test`** lê a pasta de conteúdo de verdade. Se algo estiver errado, o teste falha com a lista de problemas, cada um com o nome do arquivo:

  ```text
  conteudo/trilhas/processo-legislativo/novo-artigo.md: campo "fontes.0.url": precisa ser um link https de um site oficial (gov.br, leg.br ou jus.br)
  ```

  O CI roda o mesmo teste, então um artigo com problema não passa no PR.
- **`pnpm dev`** sobe o site em http://localhost:3001, e o artigo aparece em `/trilhas/<trilha>/<artigo>`. Um arquivo novo ou mudado aparece ao recarregar a página, sem reiniciar o `pnpm dev`.

## Como o site lê os arquivos

Quem lê e confere os arquivos é o servidor, em `apps/web/src/lib/conteudo/paginas.server.ts`. O navegador recebe só a página pronta, com o texto já em HTML, e não baixa o código que lê o YAML e o Markdown. O HTML solto no meio do Markdown continua desligado na conversão.
