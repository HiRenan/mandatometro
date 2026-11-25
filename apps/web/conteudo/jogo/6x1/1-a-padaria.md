---
cena: 1
titulo: A padaria
cenario: bg-padaria
casa: Iniciativa
artigo: quem-pode-propor-uma-lei
passos:
  - tipo: fala
    id: c1-01
    quem: narracao
    emocao: solene
    texto: Uma padaria de bairro, seis da manhã. Lia passa antes de ir para Brasília.
  - tipo: fala
    id: c1-02
    quem: joana
    expressao: cansada
    emocao: preocupado
    texto: Deputada, eu trabalho seis dias e folgo um. No meu dia de folga eu só consigo dormir. Isso vai mudar?
  - tipo: fala
    id: c1-03
    quem: raimundo
    expressao: preocupado
    emocao: preocupado
    texto: E eu queria dar mais folga, mas somos seis aqui. Se cada um folgar dois dias, quem abre a padaria no sábado?
  - tipo: fala
    id: c1-04
    quem: lia
    expressao: pensativa
    emocao: pensativo
    texto: Os dois têm razão. Arnaldo, onde está escrito esse limite?
  - tipo: fala
    id: c1-05
    quem: arnaldo
    expressao: explicando
    emocao: didatico
    texto: "Na Constituição, artigo 7º: até 8 horas por dia e 44 por semana."
  - tipo: decisao
    natureza: regra
    id: "1.1"
    pergunta: Para mudar o limite de 44 horas que está escrito na Constituição, o que é preciso?
    resumo: Só uma emenda muda a Constituição
    fundamento: art. 60 da Constituição
    carimbo: so-com-emenda
    opcoes:
      - texto: Uma emenda à Constituição
        resultado: certa
        explicacao: Para mudar o que está escrito na Constituição, só uma emenda. Uma lei até poderia fixar uma jornada menor, porque a Constituição dá o máximo; mas outra lei poderia voltar atrás. Com a emenda, aumentar de novo exigiria outra emenda.
      - texto: Uma lei ordinária resolve tudo
        resultado: errada
        explicacao: A lei vale abaixo da Constituição. Ela não muda o texto do artigo 7º.
      - texto: Um decreto do presidente
        resultado: errada
        explicacao: Decreto regulamenta lei. Não muda lei, muito menos a Constituição.
  - tipo: fala
    id: c1-06
    quem: lia
    expressao: confiante
    emocao: confiante
    texto: Então eu apresento uma PEC amanhã.
  - tipo: fala
    id: c1-07
    quem: arnaldo
    expressao: sorrindo
    emocao: caloroso
    texto: Sozinha, não dá.
  - tipo: decisao
    natureza: regra
    id: "1.2"
    pergunta: Quem pode apresentar uma proposta de emenda à Constituição?
    resumo: Um terço de uma das Casas
    fundamento: art. 60, I a III, da Constituição
    opcoes:
      - texto: Um terço dos deputados ou dos senadores, o presidente da República, ou mais da metade das assembleias legislativas, cada uma pela maioria relativa de seus membros
        resultado: certa
        explicacao: "Está no artigo 60 da Constituição. Na Câmara, são pelo menos 171 assinaturas. No Senado, são 27."
      - texto: Qualquer deputado, sozinho
        resultado: errada
        explicacao: Isso vale para projeto de lei, não para emenda.
      - texto: Só o presidente da República
        resultado: errada
        explicacao: O presidente pode, mas não é o único.
  - tipo: fala
    id: c1-08
    quem: arnaldo
    expressao: explicando
    emocao: didatico
    texto: Já tem duas propostas na Câmara. A de 2019 prevê chegar a 36 horas semanais em dez anos. A de 2025 propõe quatro dias de trabalho por semana e até 36 horas. Elas vão tramitar juntas.
  - tipo: fala
    id: c1-09
    quem: raimundo
    expressao: preocupado
    emocao: preocupado
    texto: Três dias de folga? Aí eu fecho as portas.
  - tipo: fala
    id: c1-10
    quem: joana
    expressao: esperancosa
    emocao: confiante
    texto: Eu já ficava feliz com dois.
revelacao:
  paragrafos:
    - A PEC 221/2019 foi apresentada por Reginaldo Lopes (PT-MG). A PEC 8/2025, de Erika Hilton (PSOL-SP) e outros deputados, previa a escala 4x3 e teve mais de 171 assinaturas confirmadas.
    - A Mesa da Câmara apensou a PEC 8/2025 à PEC 221/2019 em 09/02/2026, e o texto final resultou da análise conjunta das duas.
  fontes:
    - titulo: Ficha e tramitação da PEC 221/2019 na Câmara
      url: https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2233802
      consultadoEm: 2026-11-25
    - titulo: Ficha e tramitação da PEC 8/2025 na Câmara
      url: https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=2485341
      consultadoEm: 2026-11-25
    - titulo: Relatório de assinaturas na apresentação da PEC 8/2025
      url: https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=2860735
      consultadoEm: 2026-11-25
---
