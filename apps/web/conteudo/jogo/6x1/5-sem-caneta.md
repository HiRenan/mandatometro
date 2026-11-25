---
cena: 5
titulo: Sem caneta
cenario: bg-senado
casa: Senado
artigo: o-presidente-sanciona-ou-veta
passos:
  - tipo: fala
    id: c5-01
    quem: narracao
    emocao: solene
    texto: O texto chega ao Senado em 28 de maio. Fica quase três meses esperando ir à CCJ.
  - tipo: fala
    id: c5-02
    quem: joana
    expressao: cansada
    emocao: preocupado
    texto: Três meses parado?
  - tipo: fala
    id: c5-03
    quem: arnaldo
    expressao: explicando
    emocao: didatico
    texto: Quem decide quando a proposta anda é o presidente de cada Casa. A pauta também é política.
  - tipo: fala
    id: c5-04
    quem: narracao
    emocao: neutro
    texto: Em setembro, a CCJ do Senado aprova. Em 14 de outubro, o Plenário vota com um calendário especial.
  - tipo: fala
    id: c5-05
    quem: caio
    expressao: argumentando
    emocao: firme
    texto: Um grupo de senadores quer deixar explícito como a mudança afeta quem já trabalha até 40 horas por semana.
  - tipo: decisao
    natureza: regra
    id: "5.1"
    pergunta: Se o Senado aprovasse essa emenda e mudasse o texto, o que aconteceria?
    resumo: Mudou o texto, volta
    fundamento: art. 60, § 2º, da Constituição
    opcoes:
      - texto: A PEC voltaria para a Câmara votar a mudança
        resultado: certa
        explicacao: Uma emenda constitucional só é promulgada quando as duas Casas aprovam o mesmo texto. Mudou, volta. O relator recomendou rejeitar a emenda, dizendo que ela alteraria o mérito, e o autor retirou o destaque.
      - texto: O Senado decidiria sozinho
        resultado: errada
        explicacao: Na PEC, nenhuma Casa tem a palavra final sozinha.
      - texto: Iria para o presidente escolher
        resultado: errada
        explicacao: O presidente da República não participa da votação de emenda.
  - tipo: fala
    id: c5-06
    quem: narracao
    emocao: neutro
    texto: "Primeiro turno: 75 a 1. Segundo turno, na mesma sessão: 75 a 1. Eram necessários 49."
  - tipo: painel
    modo: nominal
    sim: 75
    nao: 1
    quorum: 49
    data: 2026-10-14
    legenda: Os dois turnos da PEC 221/2019 no Plenário do Senado, na mesma sessão.
  - tipo: fala
    id: c5-07
    quem: lia
    expressao: sorrindo
    emocao: confiante
    texto: Agora é só a sanção.
    item: item-caneta
    etiqueta: A caneta da sanção
  - tipo: fala
    id: c5-08
    quem: arnaldo
    expressao: sorrindo
    emocao: caloroso
    texto: Lembra o que eu disse na comissão?
  - tipo: decisao
    natureza: regra
    id: "5.2"
    pergunta: Quem transforma a PEC aprovada em emenda constitucional?
    resumo: As Mesas promulgam, sem sanção
    fundamento: art. 60, § 3º, da Constituição
    carimbo: promulgada
    opcoes:
      - texto: As Mesas da Câmara e do Senado, que a promulgam
        resultado: certa
        explicacao: Emenda constitucional não vai para sanção. O presidente da República não assina nem pode vetar.
      - texto: O presidente da República, que pode sancionar ou vetar
        resultado: errada
        explicacao: Isso vale para projetos de lei, como o do celular nas escolas. Emenda não.
      - texto: O STF, que confere se está tudo certo
        resultado: errada
        explicacao: O STF não aprova emendas. Ele só entra se alguém questionar uma depois. Guarde isso.
  - tipo: fala
    id: c5-09
    quem: narracao
    emocao: solene
    texto: 16 de outubro de 2026. Nasce a Emenda Constitucional 141.
    cenario: bg-promulgacao
    item: item-emenda
    etiqueta: EC 141/2026
  - tipo: fala
    id: c5-10
    quem: narracao
    emocao: neutro
    texto: De volta à padaria.
    cenario: bg-padaria
  - tipo: fala
    id: c5-11
    quem: joana
    expressao: esperancosa
    emocao: curioso
    texto: E quando muda para mim?
  - tipo: fala
    id: c5-12
    quem: arnaldo
    expressao: explicando
    emocao: didatico
    texto: Em 16 de dezembro de 2026, o limite passa a 42 horas por semana, com dois repousos remunerados e sem redução salarial. Um dia de repouso é preferencialmente no domingo. Em 16 de dezembro de 2027, o limite cai para 40 horas.
  - tipo: fala
    id: c5-13
    quem: raimundo
    expressao: preocupado
    emocao: preocupado
    texto: E se eu não conseguir fechar a escala até lá?
  - tipo: fala
    id: c5-14
    quem: arnaldo
    expressao: neutro
    emocao: neutro
    texto: "A emenda prevê que uma lei complementar possa criar medidas temporárias para MEIs, microempresas e empresas de pequeno porte, condicionadas à manutenção dos níveis de emprego. Mas a emenda sozinha não cria essa ajuda: o Congresso ainda precisa aprovar essa lei. E as confederações do comércio e da indústria foram ao STF pedir mais tempo para a transição."
  - tipo: fala
    id: c5-15
    quem: lia
    expressao: surpresa
    emocao: surpreso
    texto: Dá para questionar uma emenda que já está na Constituição?
  - tipo: decisao
    natureza: regra
    id: "5.3"
    pergunta: Uma emenda constitucional promulgada pode ser questionada no STF?
    resumo: Cabe ação direta
    fundamento: art. 102, I, "a", e art. 103 da Constituição
    opcoes:
      - texto: Sim, por ação direta de inconstitucionalidade proposta por um dos legitimados do art. 103
        resultado: certa
        explicacao: Os legitimados do art. 103 podem questionar vícios de tramitação ou violações dos limites da reforma. Foi o que fizeram a CNC e a CNI.
      - texto: "Não: o que está na Constituição não pode ser questionado"
        resultado: errada
        explicacao: O texto original de 1988 não pode; as emendas podem.
      - texto: Só o presidente da República pode questionar
        resultado: errada
        explicacao: Confederações nacionais, partidos e outras entidades também podem entrar com ação.
  - tipo: fala
    id: c5-16
    quem: arnaldo
    expressao: neutro
    emocao: neutro
    texto: Em caráter excepcional, acordo ou convenção coletiva pode distribuir as folgas garantindo, no mês-calendário, uma média de dois dias de repouso remunerado por semana e pelo menos um repouso em cada período de até uma semana de trabalho. O STF analisa as regras de transição. Veja a situação atual no cartão final.
  - tipo: fala
    id: c5-17
    quem: raimundo
    expressao: preocupado
    emocao: preocupado
    texto: Regra clara ajuda. Mas vou ter que contratar mais alguém, e ainda não sei se a conta fecha.
  - tipo: fala
    id: c5-18
    quem: joana
    expressao: esperancosa
    emocao: confiante
    texto: Dois dias por semana, ou na média do mês, já muda muita coisa.
  - tipo: fala
    id: c5-19
    quem: caio
    expressao: cumprimentando
    emocao: respeitoso
    texto: O debate continua. Uma proposta apresentada no Senado antes da promulgação já previa a opção por um regime de trabalho por hora.
revelacao:
  paragrafos:
    - Em 14/10/2026, o Senado aprovou a PEC 221/2019 por 75 a 1 nos dois turnos, com parecer de Omar Aziz (PSD-AM) pela manutenção do texto da Câmara. Eram necessários 49 votos em cada turno.
    - As Mesas das duas Casas promulgaram a Emenda Constitucional 141 em 16/10/2026, sem sanção do presidente da República.
  fontes:
    - titulo: PEC 221/2019 no Senado e as votações
      url: https://www25.senado.leg.br/web/atividade/materias/-/materia/174386/votacoes
      consultadoEm: 2026-11-25
    - titulo: Emenda Constitucional nº 141, de 16 de outubro de 2026
      url: https://planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc141.htm
      consultadoEm: 2026-11-25
---
