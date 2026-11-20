---
cena: 5
titulo: A caneta
cenario: bg-planalto
casa: Sanção ou veto
artigo: o-presidente-sanciona-ou-veta
passos:
  - tipo: fala
    id: c5-01
    quem: narracao
    texto: O texto aprovado pelas duas Casas chega ao presidente da República.
    item: item-documento
    etiqueta: PL 4.932/2024
  - tipo: fala
    id: c5-02
    quem: arnaldo
    expressao: explicando
    texto: "Ele tem 15 dias úteis para decidir. Se ficar calado, o projeto vira lei do mesmo jeito: é a sanção tácita."
  - tipo: fala
    id: c5-03
    quem: lia
    expressao: pensativa
    texto: E se ele concordar com quase tudo, menos um artigo?
  - tipo: decisao
    id: "5.1"
    natureza: regra
    pergunta: O presidente discorda de um artigo só. O que ele pode fazer?
    resumo: Veto parcial
    fundamento: art. 66, § 2º, da Constituição
    opcoes:
      - texto: Vetar só aquele artigo
        resultado: certa
        explicacao: É o veto parcial. Ele corta o artigo, o parágrafo, o inciso ou a alínea inteiros, nunca palavras soltas (Constituição, art. 66, § 2º).
      - texto: Reescrever o artigo do jeito dele
        resultado: errada
        explicacao: Quem escreve a lei é o Congresso. O presidente só aceita ou corta.
      - texto: Ignorar o artigo e aplicar o resto
        resultado: errada
        explicacao: "Sancionado, o artigo vale. Para tirá-lo, só vetando."
  - tipo: fala
    id: c5-04
    quem: arnaldo
    expressao: serio
    texto: E se ele vetar, o Congresso ainda pode derrubar o veto numa sessão conjunta. A última palavra pode voltar para lá.
  - tipo: decisao
    id: "5.2"
    natureza: opiniao
    pergunta: "Se a caneta fosse sua: sancionar tudo, vetar parte ou vetar tudo?"
    eco: escolheu
    opcoes:
      - texto: Sancionar tudo
      - texto: Vetar parte
      - texto: Vetar tudo
    desfecho:
      - O projeto foi sancionado sem nenhum veto em 13/01/2025.
  - tipo: carimbo
    selo: sancionado
    legenda: Sancionado sem vetos em 13/01/2025.
  - tipo: fala
    id: c5-05
    quem: narracao
    texto: 13 de janeiro de 2025. Sancionado, sem vetos. No dia seguinte, a Lei 15.100 sai no Diário Oficial.
    item: item-caneta
  - tipo: fala
    id: c5-06
    quem: lia
    expressao: sorrindo
    texto: Dez anos entre a pasta velha e a lei.
  - tipo: fala
    id: c5-07
    quem: arnaldo
    expressao: sorrindo
    texto: E toda semana tem projeto andando assim. A diferença é que agora você sabe ler o caminho.
revelacao:
  paragrafos:
    - O projeto foi enviado à sanção em 20/12/2024, sancionado sem vetos em 13/01/2025 e publicado no Diário Oficial da União em 14/01/2025.
    - A Lei 15.100/2025 foi regulamentada pelo Decreto 12.385, de 18/02/2025.
  fontes:
    - titulo: Lei nº 15.100, de 13 de janeiro de 2025
      url: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/Lei/L15100.htm
      consultadoEm: 2026-11-20
---
