---
cena: 3
titulo: A votação que vale como Plenário
cenario: bg-ccj
casa: Comissões
artigo: o-plenario-vota-o-projeto
passos:
  - tipo: fala
    id: c3-01
    quem: narracao
    texto: Comissão de Constituição e Justiça. Dezembro de 2024.
  - tipo: fala
    id: c3-02
    quem: arnaldo
    expressao: explicando
    texto: "A CCJ aprovou o texto da Educação com mudanças: o aluno pode levar o celular, mas não pode usar na aula nem no recreio, salvo para fins pedagógicos."
  - tipo: fala
    id: c3-03
    quem: caio
    expressao: argumentando
    texto: "Tem gente do meu lado com outra preocupação: sem o celular, quem garante que o aluno pode registrar o que acontece em sala?"
  - tipo: fala
    id: c3-04
    quem: lia
    expressao: pensativa
    texto: E quem defende diz que é atenção e saúde mental. A lei manda a escola falar disso com os alunos.
  - tipo: fala
    id: c3-05
    quem: arnaldo
    expressao: serio
    texto: "E repare: o tema dividiu até quem costuma votar junto. Hora do painel."
  - tipo: decisao
    id: "3.1"
    natureza: opiniao
    pergunta: Você vota Sim ou Não?
    eco: votou
    opcoes:
      - texto: Sim
      - texto: Não
    desfecho:
      - A CCJ aprovou o projeto por 45 votos a 14, em votação nominal.
  - tipo: painel
    modo: nominal
    sim: 45
    nao: 14
    data: 2024-12-11
    legenda: A CCJ aprovou o projeto em caráter conclusivo.
  - tipo: fala
    id: c3-06
    quem: lia
    expressao: confiante
    texto: Aprovado! Agora vai para o Plenário da Câmara, né?
  - tipo: fala
    id: c3-07
    quem: arnaldo
    expressao: sorrindo
    texto: Talvez não.
  - tipo: decisao
    id: "3.2"
    natureza: regra
    pergunta: A CCJ aprovou o projeto em caráter conclusivo. Ele precisa passar pelo Plenário da Câmara?
    resumo: Poder conclusivo
    fundamento: art. 58, § 2º, I, da Constituição
    carimbo: recurso-ao-plenario
    opcoes:
      - texto: Não, a menos que um décimo dos deputados recorra
        resultado: certa
        explicacao: A Constituição (art. 58, § 2º, I) deixa a comissão decidir no lugar do Plenário. Se 52 dos 513 deputados recorrerem no prazo, o Plenário vota.
      - texto: Sim, todo projeto passa pelo Plenário
        resultado: errada
        explicacao: É o erro mais comum. Muitas leis nunca passam pelo Plenário de uma das Casas.
      - texto: Não, já vai direto para a sanção
        resultado: errada
        explicacao: Falta o Senado. Toda lei ordinária passa pelas duas Casas.
  - tipo: relogio
    sessoes: 5
    fundamento: art. 58, § 1º, do Regimento da Câmara
    legenda: O prazo de recurso abriu em 12/12/2024 e correu por cinco sessões. Ninguém recorreu.
  - tipo: carimbo
    selo: segue-para-o-senado
    legenda: O projeto foi enviado ao Senado em 17/12/2024.
  - tipo: fala
    id: c3-08
    quem: arnaldo
    expressao: explicando
    texto: "Detalhe de vocabulário: na Câmara isso se chama poder conclusivo. No Senado, decisão terminativa. A imprensa costuma misturar."
  - tipo: fala
    id: c3-09
    quem: caio
    expressao: cumprimentando
    texto: Perdi essa, deputada. Nos vemos no Senado.
revelacao:
  paragrafos:
    - A CCJ da Câmara aprovou o texto em 11/12/2024, por 45 votos a 14, em caráter conclusivo e em votação nominal. O relator também pediu que a CCJ julgasse o mérito.
    - Antes, um requerimento para retirar o projeto de pauta foi rejeitado por 8 a 27.
    - O prazo de recurso abriu em 12/12/2024, nenhum recurso foi apresentado, e o projeto foi enviado ao Senado em 17/12/2024.
  fontes:
    - titulo: Ficha e tramitação do PL 104/2015 na Câmara
      url: https://www.camara.leg.br/propostas-legislativas/945492
      consultadoEm: 2026-11-20
    - titulo: "Câmara: principais prazos do processo legislativo"
      url: https://www2.camara.leg.br/atividade-legislativa/plenario/contagem-de-prazos/principais-prazos-do-processo-legislativo
      consultadoEm: 2026-11-20
---
