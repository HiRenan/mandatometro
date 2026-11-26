---
cena: 2
titulo: A CCJ só olha a porta
cenario: bg-ccj
casa: CCJ
artigo: o-projeto-passa-pelas-comissoes
passos:
  - tipo: fala
    id: c2-01
    quem: narracao
    emocao: solene
    texto: Abril de 2026. Comissão de Constituição e Justiça.
  - tipo: fala
    id: c2-02
    quem: caio
    expressao: argumentando
    emocao: firme
    texto: Deputada, isso vai custar caro para o pequeno comércio. A CCJ tem que barrar.
  - tipo: fala
    id: c2-03
    quem: arnaldo
    expressao: explicando
    emocao: didatico
    texto: Aqui, não. Numa PEC, a CCJ não discute se a ideia é boa ou cara. Isso fica para a próxima comissão.
  - tipo: decisao
    natureza: regra
    id: "2.1"
    pergunta: O que a CCJ analisa numa proposta de emenda à Constituição?
    resumo: Admissibilidade, não mérito
    fundamento: art. 202 do Regimento da Câmara
    carimbo: admissivel
    opcoes:
      - texto: "Se ela pode tramitar: a admissibilidade"
        resultado: certa
        explicacao: A CCJ confere se a proposta respeita os limites para mudar a Constituição. O conteúdo, o custo e os detalhes são discutidos depois, numa comissão especial.
      - texto: Se a ideia é boa para o país
        resultado: errada
        explicacao: Isso é o mérito. Na PEC, ele fica para a comissão especial.
      - texto: Quanto vai custar
        resultado: errada
        explicacao: O impacto econômico entra no debate de mérito, não na admissibilidade.
  - tipo: fala
    id: c2-04
    quem: lia
    expressao: pensativa
    emocao: pensativo
    texto: E o que faria uma PEC ser barrada aqui?
  - tipo: fala
    id: c2-05
    quem: arnaldo
    expressao: serio
    emocao: serio
    texto: Uma PEC pode ser barrada se propuser uma mudança que tenda a abolir uma cláusula pétrea.
  - tipo: decisao
    natureza: regra
    id: "2.2"
    pergunta: Qual destas mudanças uma emenda constitucional NÃO pode fazer?
    resumo: Cláusulas pétreas
    fundamento: art. 60, § 4º, da Constituição
    opcoes:
      - texto: Acabar com o voto direto e secreto
        resultado: certa
        explicacao: O art. 60, § 4º, protege o voto direto, secreto, universal e periódico, a forma federativa, a separação dos Poderes e os direitos e garantias individuais.
      - texto: Reduzir a jornada máxima de trabalho
        resultado: errada
        explicacao: "A Constituição não proíbe mudar a jornada por emenda: as cláusulas pétreas impedem abolir direitos, não ampliá-los. Mas, se houver dúvida, quem decide é o STF. Guarde isso para o final do jogo."
      - texto: Reduzir de oito para sete horas o limite diário de trabalho
        resultado: errada
        explicacao: Essa redução, por si só, não é vedada pelo art. 60, § 4º.
  - tipo: fala
    id: c2-06
    quem: narracao
    emocao: neutro
    texto: A CCJ aprova a admissibilidade em votação simbólica.
  - tipo: fala
    id: c2-07
    quem: caio
    expressao: cumprimentando
    emocao: respeitoso
    texto: Tudo bem. A briga de verdade é na comissão especial.
revelacao:
  paragrafos:
    - Em 22/04/2026, a CCJ da Câmara aprovou simbolicamente a admissibilidade das PECs 221/2019 e 8/2025, conforme o parecer de Paulo Azi.
    - As propostas seguiram para a análise de mérito numa comissão especial.
  fontes:
    - titulo: Avulso com o parecer da CCJ sobre a admissibilidade
      url: https://www.camara.leg.br/proposicoesWeb/prop_mostrarintegra?codteor=3138539
      consultadoEm: 2026-11-25
---
