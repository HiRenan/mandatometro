---
cena: 4
titulo: Dois dias no Senado
cenario: bg-senado
casa: A outra Casa
artigo: a-outra-casa-revisa-o-projeto
passos:
  - tipo: fala
    id: c4-01
    quem: narracao
    emocao: solene
    texto: Terça-feira, 17 de dezembro de 2024. O projeto chega ao Senado.
  - tipo: fala
    id: c4-02
    quem: lia
    expressao: surpresa
    emocao: surpreso
    texto: Espera, aqui ele é o PL 4.932 de 2024?
  - tipo: fala
    id: c4-03
    quem: arnaldo
    expressao: explicando
    emocao: didatico
    texto: Cada Casa dá o seu número. É o mesmo projeto. Agora o Senado revisa.
  - tipo: fala
    id: c4-04
    quem: lia
    expressao: preocupada
    emocao: preocupado
    texto: O recesso começa em dias, e o governo quer a lei valendo no ano letivo de 2025.
  - tipo: decisao
    id: "4.1"
    natureza: regra
    pergunta: Falta pouco tempo. Como o Senado pode votar rápido?
    resumo: Urgência
    fundamento: requerimento de urgência dos líderes
    carimbo: urgencia
    opcoes:
      - texto: Aprovar um requerimento de urgência
        resultado: certa
        explicacao: "Os líderes pedem urgência. Aprovada, ela dispensa prazos e etapas: o projeto vai direto ao Plenário, com um relator designado ali mesmo."
      - texto: Pedido de vista
        resultado: errada
        explicacao: "Pedir vista atrasa: é para ganhar tempo de leitura, o contrário do que se quer aqui."
      - texto: Devolver para a Câmara
        resultado: errada
        explicacao: A Câmara já aprovou. Agora quem decide é o Senado.
  - tipo: fala
    id: c4-05
    quem: arnaldo
    expressao: neutro
    emocao: neutro
    texto: O relator pode manter o texto ou mudar. Isso decide o caminho.
  - tipo: decisao
    id: "4.2"
    natureza: regra
    pergunta: Se o Senado mudar o texto, o que acontece?
    resumo: Volta à Casa de origem
    fundamento: art. 65 da Constituição
    opcoes:
      - texto: Volta para a Câmara analisar as mudanças
        resultado: certa
        explicacao: A Casa que começou dá a palavra final sobre as emendas (Constituição, art. 65). Sem mudança, vai direto à sanção.
      - texto: Vai direto para a sanção mesmo assim
        resultado: errada
        explicacao: Mudou o texto, a outra Casa precisa ver.
      - texto: O Senado vota de novo do zero
        resultado: errada
        explicacao: "Não há reinício: as Casas trocam o texto até fechar."
  - tipo: fala
    id: c4-06
    quem: narracao
    emocao: solene
    texto: Quarta-feira, 18 de dezembro. O relator rejeita as duas emendas e mantém o texto da Câmara.
  - tipo: fala
    id: c4-07
    quem: narracao
    emocao: solene
    texto: '"Os senadores que aprovam permaneçam como se encontram."'
  - tipo: painel
    modo: simbolico
    selo: aprovado
    legenda: Votação simbólica, sem número nenhum no painel. O texto-base passou, ressalvados os destaques.
  - tipo: fala
    id: c4-08
    quem: lia
    expressao: surpresa
    emocao: surpreso
    texto: Ué, cadê o placar?
  - tipo: fala
    id: c4-09
    quem: arnaldo
    expressao: sorrindo
    emocao: caloroso
    texto: "Votação simbólica: quem concorda fica parado, e ninguém aperta botão. Passou o texto principal, ressalvados os destaques."
  - tipo: fala
    id: c4-10
    quem: lia
    expressao: pensativa
    emocao: curioso
    texto: Destaques?
  - tipo: fala
    id: c4-11
    quem: arnaldo
    expressao: explicando
    emocao: didatico
    texto: É quando alguém pede para votar uma parte separada. Uma emenda queria começar só pelo ensino fundamental, aos poucos, e deixar o ensino médio de fora. Essa vai ao painel.
  - tipo: decisao
    id: "4.3"
    natureza: opiniao
    pergunta: Você votaria Sim ou Não nessa emenda?
    eco: votou
    opcoes:
      - texto: Sim
      - texto: Não
    desfecho:
      - A emenda foi rejeitada por 16 votos a 42, em votação nominal.
  - tipo: painel
    modo: nominal
    sim: 16
    nao: 42
    data: 2024-12-18
    legenda: A Emenda 1 foi rejeitada na mesma sessão que aprovou o texto-base.
  - tipo: fala
    id: c4-12
    quem: arnaldo
    expressao: neutro
    emocao: neutro
    texto: Outra emenda pedia câmeras nas salas de aula. O autor retirou o destaque e propôs discutir o tema em outro projeto. O texto da Câmara passou inteiro.
revelacao:
  paragrafos:
    - O projeto foi autuado no Senado em 17/12/2024 como PL 4.932/2024, com o requerimento de urgência RQS 957/2024, de líderes.
    - O relator de Plenário deu parecer favorável ao projeto e contrário às emendas. Em 18/12/2024, a urgência e o projeto foram aprovados, com o texto-base em votação simbólica.
    - A Emenda 1 foi rejeitada em votação nominal por 16 a 42, e o destaque da Emenda 2 foi retirado pelo autor. O projeto foi à sanção em 20/12/2024.
  fontes:
    - titulo: Ficha e tramitação do PL 4.932/2024 no Senado
      url: https://www25.senado.leg.br/web/atividade/materias/-/materia/166801
      consultadoEm: 2026-11-20
    - titulo: Notas taquigráficas da sessão do Senado de 18/12/2024
      url: https://www25.senado.leg.br/web/atividade/notas-taquigraficas/-/notas/s/430902
      consultadoEm: 2026-11-20
---
