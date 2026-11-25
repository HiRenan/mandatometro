---
cena: 4
titulo: Dois turnos numa noite
cenario: bg-plenario-camara
casa: Plenário da Câmara
artigo: o-plenario-vota-o-projeto
passos:
  - tipo: fala
    id: c4-01
    quem: narracao
    emocao: solene
    texto: 27 de maio de 2026, noite. Plenário da Câmara.
  - tipo: fala
    id: c4-02
    quem: arnaldo
    expressao: explicando
    emocao: didatico
    texto: Em regra, uma lei ordinária precisa da maioria dos votos, com a maioria absoluta dos membros presente. Numa emenda, a conta é outra.
  - tipo: decisao
    natureza: regra
    id: "4.1"
    pergunta: Quantos votos a PEC precisa no Plenário da Câmara?
    resumo: Três quintos, nos dois turnos
    fundamento: art. 60, § 2º, da Constituição
    carimbo: tres-quintos
    opcoes:
      - texto: 308, três quintos dos 513, em cada um dos dois turnos
        resultado: certa
        explicacao: São três quintos do total de membros, e não dos presentes. A conta é sobre todos os deputados, em cada turno.
      - texto: 257, a maioria absoluta
        resultado: errada
        explicacao: Esse é o quórum de lei complementar. Emenda exige mais.
      - texto: A maioria dos presentes
        resultado: errada
        explicacao: Em regra, uma lei ordinária exige maioria dos votos, com a maioria absoluta dos membros presente.
  - tipo: decisao
    natureza: opiniao
    id: "4.2"
    pergunta: Primeiro turno. Você vota Sim ou Não?
    eco: votou
    opcoes:
      - texto: Sim
      - texto: Não
    desfecho:
      - A PEC passou no primeiro turno com 472 votos a favor e 22 contra. Eram necessários 308.
  - tipo: painel
    modo: nominal
    sim: 472
    nao: 22
    quorum: 308
    data: 2026-05-27
    legenda: Primeiro turno da PEC 221/2019 no Plenário da Câmara.
  - tipo: fala
    id: c4-03
    quem: lia
    expressao: surpresa
    emocao: surpreso
    texto: Passou de longe. Agora esperamos o segundo turno?
  - tipo: fala
    id: c4-04
    quem: arnaldo
    expressao: explicando
    emocao: didatico
    texto: O regimento manda esperar cinco sessões entre um turno e outro. É para dar tempo de pensar de novo.
  - tipo: fala
    id: c4-05
    quem: caio
    expressao: argumentando
    emocao: firme
    texto: Pois eu acho que esse tempo devia ser respeitado. Mudar a Constituição numa noite só é pressa demais.
  - tipo: fala
    id: c4-06
    quem: narracao
    emocao: neutro
    texto: Na mesma noite, o presidente da Câmara anuncia o segundo turno.
  - tipo: decisao
    natureza: regra
    id: "4.3"
    pergunta: Se o regimento prevê cinco sessões entre os turnos, como o segundo turno aconteceu na mesma noite?
    resumo: Interstício dispensado
    fundamento: art. 202 do Regimento da Câmara
    carimbo: intersticio-dispensado
    opcoes:
      - texto: O Plenário aprovou um requerimento dispensando o intervalo
        resultado: certa
        explicacao: O intervalo se chama interstício. O regimento permite dispensá-lo por requerimento aprovado pelo próprio Plenário. É comum quando há acordo amplo.
      - texto: O presidente da Câmara ignorou o regimento
        resultado: errada
        explicacao: "Não houve ilegalidade: a própria regra prevê a dispensa."
      - texto: Em PEC não existe intervalo
        resultado: errada
        explicacao: Existe, e foi por isso que precisou de requerimento.
  - tipo: relogio
    sessoes: 5
    fundamento: art. 202 do Regimento da Câmara
    legenda: O interstício entre o primeiro e o segundo turno.
    dispensa: O Plenário aprovou o REQ 3230/2026, e as cinco sessões de intervalo caíram.
  - tipo: fala
    id: c4-07
    quem: narracao
    emocao: neutro
    texto: "Segundo turno: 461 a 19. Logo depois, a redação final é aprovada em votação simbólica."
  - tipo: fala
    id: c4-08
    quem: arnaldo
    expressao: serio
    emocao: serio
    texto: Metade do caminho. O Senado também vai precisar de três quintos, duas vezes.
revelacao:
  paragrafos:
    - "Em 27/05/2026, o Plenário da Câmara aprovou a PEC 221/2019 em dois turnos: 472 a 22 no primeiro e 461 a 19 no segundo. Eram necessários 308 votos em cada um."
    - Entre os turnos, a Câmara aprovou o REQ 3230/2026, que dispensou o interstício de cinco sessões. O texto chegou ao Senado no dia seguinte.
  fontes:
    - titulo: Ordem do Dia da Câmara em 27 de maio de 2026
      url: https://www.camara.leg.br/internet/ordemdodia/integras/3138823.htm
      consultadoEm: 2026-11-25
    - titulo: REQ 3230/2026, que dispensou o interstício
      url: https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=3138818
      consultadoEm: 2026-11-25
    - titulo: Tramitação bicameral da PEC 221/2019 no Congresso Nacional
      url: https://www.congressonacional.leg.br/materias/materias-bicamerais/-/ver/pec-221-2019
      consultadoEm: 2026-11-25
---
