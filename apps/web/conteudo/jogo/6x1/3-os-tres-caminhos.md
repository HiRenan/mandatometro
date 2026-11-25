---
cena: 3
titulo: Os três caminhos
cenario: bg-comissao
casa: Comissão especial
artigo: o-projeto-passa-pelas-comissoes
passos:
  - tipo: fala
    id: c3-01
    quem: narracao
    emocao: solene
    texto: Maio de 2026. Comissão especial. Agora sim se discute o conteúdo.
  - tipo: fala
    id: c3-02
    quem: arnaldo
    expressao: explicando
    emocao: didatico
    texto: Aqui na comissão, duas propostas estão na mesa. Cada uma tem quem defenda.
  - tipo: fala
    id: c3-03
    quem: joana
    expressao: esperancosa
    emocao: confiante
    texto: Com duas folgas eu consigo estudar à noite e ver meu filho no fim de semana.
  - tipo: fala
    id: c3-04
    quem: raimundo
    expressao: preocupado
    emocao: preocupado
    texto: Eu não sou contra. Mas preciso de tempo para contratar e reorganizar a escala, senão fecho.
  - tipo: fala
    id: c3-05
    quem: caio
    expressao: argumentando
    emocao: firme
    texto: E se o trabalhador pudesse optar por um regime flexível, pago por hora? Padaria não funciona como fábrica.
  - tipo: versoes
    titulo: Três caminhos em debate
    caminhos:
      - nome: 4x3
        propoe: Quatro dias de trabalho, três de folga, até 36 horas por semana.
        aFavor: Mais tempo livre e mais saúde para quem trabalha.
        contra: Custo alto, e difícil para quem precisa funcionar todo dia.
      - nome: 5x2 com transição
        propoe: Duas folgas por semana, 42 horas e depois 40, sem reduzir salário.
        aFavor: Muda a rotina sem um salto brusco.
        contra: Ainda pesa para o pequeno negócio.
      - nome: Regime flexível por hora trabalhada
        propoe: Opção entre o regime comum da CLT e um regime flexível, pago por hora.
        aFavor: Pode acomodar horários variáveis.
        contra: Pode tornar a renda menos previsível.
        etiqueta: Depois da votação na comissão, foi apresentada no Senado uma proposta de regime flexível por hora, a PEC 12/2026.
  - tipo: decisao
    natureza: opiniao
    id: "3.1"
    pergunta: Se você pudesse escolher, qual caminho defenderia?
    eco: escolheu
    opcoes:
      - texto: 4x3
      - texto: 5x2 com transição
      - texto: Regime flexível por hora trabalhada
    desfecho:
      - Na comissão, o relator montou um acordo em torno do segundo caminho. O terceiro seguiu em debate no Senado. Veja o que aconteceu.
  - tipo: fala
    id: c3-06
    quem: narracao
    emocao: neutro
    texto: O relator lê o parecer por cerca de três horas e meia. Deputados pedem vista, e a votação espera duas sessões.
  - tipo: fala
    id: c3-07
    quem: lia
    expressao: surpresa
    emocao: surpreso
    texto: 34 a 4. Foi folgado.
  - tipo: fala
    id: c3-08
    quem: joana
    expressao: esperancosa
    emocao: curioso
    texto: Então já vale?
  - tipo: decisao
    natureza: regra
    id: "3.2"
    pergunta: A comissão especial aprovou. A emenda já vale?
    resumo: Em PEC não há decisão conclusiva
    fundamento: art. 60, § 2º, da Constituição
    opcoes:
      - texto: "Ainda não: falta o Plenário da Câmara, em dois turnos, e depois o Senado"
        resultado: certa
        explicacao: Em PEC não existe decisão conclusiva de comissão. Tudo passa pelos dois plenários, duas vezes cada.
      - texto: Sim, a comissão especial decide sozinha
        resultado: errada
        explicacao: O poder conclusivo do Jogo das Comissões vale para alguns projetos de lei, nunca para emenda.
      - texto: Falta só o presidente assinar
        resultado: errada
        explicacao: "Ainda faltam os dois plenários. E guarde isto: no fim, o presidente nem assina."
  - tipo: fala
    id: c3-09
    quem: raimundo
    expressao: aliviado
    emocao: aliviado
    texto: Pelo menos tem prazo para se adaptar.
revelacao:
  paragrafos:
    - "Em 27/05/2026, a comissão especial aprovou, por 34 votos a 4, o parecer do relator Leo Prates (Republicanos-BA): fim da escala 6x1, dois dias de repouso remunerado, jornada de 42 horas dois meses após a publicação e de 40 horas um ano depois, sem redução de salário. Antes, houve pedido de vista, com prazo de duas sessões."
    - Depois da votação na comissão, foi apresentada no Senado a PEC 12/2026, do senador Rogerio Marinho (PL-RN), com uma proposta de regime flexível por hora.
  fontes:
    - titulo: Comissão especial da PEC 221/2019 na Câmara
      url: https://www.camara.leg.br/noticias/1277012-noticia
      consultadoEm: 2026-11-25
    - titulo: Texto da PEC 12/2026 no Senado
      url: https://legis.senado.leg.br/sdleg-getter/documento?disposition=inline&dm=10233767&ts=1779968708686
      consultadoEm: 2026-11-25
    - titulo: Rogerio Marinho propõe PEC que flexibiliza a jornada de trabalho
      url: https://www12.senado.leg.br/noticias/materias/2026/05/28/rogerio-marinho-propoe-pec-que-flexibiliza-jornada-de-trabalho
      consultadoEm: 2026-11-25
---
