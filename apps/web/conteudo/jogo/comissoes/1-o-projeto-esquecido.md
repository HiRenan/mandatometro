---
cena: 1
titulo: O projeto esquecido
cenario: bg-gabinete
casa: Apresentação
artigo: onde-o-projeto-comeca
passos:
  - tipo: fala
    id: c1-01
    quem: narracao
    emocao: solene
    texto: Brasília. Primeira semana de mandato.
  - tipo: fala
    id: c1-02
    quem: lia
    expressao: confiante
    emocao: confiante
    texto: Pronto, gabinete montado. Por onde a gente começa?
  - tipo: fala
    id: c1-03
    quem: arnaldo
    expressao: neutro
    emocao: neutro
    texto: "Por uma pasta velha. O PL 104 de 2015: restringe o celular nas escolas. Apresentado por um deputado do Rio Grande do Sul."
    item: item-pasta
    etiqueta: PL 104/2015
  - tipo: fala
    id: c1-04
    quem: lia
    expressao: surpresa
    emocao: surpreso
    texto: De 2015? Por que ninguém votou isso?
  - tipo: fala
    id: c1-05
    quem: arnaldo
    expressao: explicando
    emocao: didatico
    texto: Porque em 2019 ele foi arquivado. Toda vez que a legislatura acaba, o que não andou vai para a gaveta.
  - tipo: fala
    id: c1-06
    quem: lia
    expressao: preocupada
    emocao: preocupado
    texto: E agora?
  - tipo: decisao
    id: "1.1"
    natureza: regra
    pergunta: Estamos em 2019, e o projeto foi arquivado no fim da legislatura. Como ele volta a andar?
    resumo: Desarquivamento a pedido
    fundamento: art. 105 do Regimento da Câmara
    opcoes:
      - texto: O autor pede o desarquivamento
        resultado: certa
        explicacao: "Era a regra do art. 105 do Regimento da Câmara em 2019: o autor pedia o desarquivamento no começo da legislatura seguinte, e o projeto voltava de onde parou. Em 2022 a regra mudou: hoje um projeto de lei só vai ao arquivo no fim da legislatura se já tramitou por três legislaturas completas."
      - texto: Apresentar um projeto novo, igual
        resultado: funciona-mas-perde
        explicacao: Pode, mas começa do zero e perde o que já tinha andado.
      - texto: Mandar para o Senado decidir
        resultado: errada
        explicacao: O Senado só recebe o projeto depois que a Câmara aprova.
  - tipo: fala
    id: c1-07
    quem: arnaldo
    expressao: sorrindo
    emocao: caloroso
    texto: "Foi o que aconteceu, em fevereiro de 2019. A primeira parada é a Comissão de Educação. Prepare-se: ele vai ficar lá mais de cinco anos."
revelacao:
  paragrafos:
    - O PL 104/2015 foi arquivado em 31/01/2019, nos termos do art. 105 do Regimento Interno da Câmara, e desarquivado em 19/02/2019, a pedido do autor, pelo requerimento REQ 114/2019.
    - Desde a Resolução 33/2022, o art. 105 não traz mais o desarquivamento a pedido.
  fontes:
    - titulo: Ficha e tramitação do PL 104/2015 na Câmara
      url: https://www.camara.leg.br/propostas-legislativas/945492
      consultadoEm: 2026-11-20
---
