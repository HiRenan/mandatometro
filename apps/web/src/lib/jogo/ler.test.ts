import { describe, expect, it } from "vitest";
import { ErroDeRoteiro, lerJogos } from "./ler";

const pasta = "/conteudo/jogo/comissoes";

const jogoMd = `---
titulo: Jogo das Comissões
resumo: Cinco cenas no caminho de um projeto de lei.
ordem: 1
cenario: bg-titulo
aviso: Os personagens são fictícios, e as datas são reais.
personagens:
  lia:
    nome: Lia Moraes
    quem: deputada federal no primeiro mandato
  arnaldo:
    nome: Arnaldo
    quem: consultor legislativo veterano
  caio:
    nome: Caio
    quem: assessor de um deputado
casas:
  - Apresentação
  - Comissões
epilogo:
  titulo: O que a lei mudou
  itens:
    - texto: Vale para toda a educação básica.
      dispositivo: art. 1º
  fontes:
    - titulo: Lei nº 15.100, de 2025
      url: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/Lei/L15100.htm
      consultadoEm: 2026-11-20
---
`;

function cenaMd({
	cena = "1",
	titulo = "O projeto esquecido",
	cenario = "bg-gabinete",
	casa = "Apresentação",
	artigo = "onde-o-projeto-comeca",
	passos = `  - tipo: fala
    id: c1-01
    quem: narracao
    emocao: neutro
    texto: Brasília. Primeira semana de mandato.
  - tipo: fala
    id: c1-02
    quem: lia
    expressao: confiante
    emocao: neutro
    texto: Por onde a gente começa?
`,
	corpo = "",
} = {}) {
	return `---
cena: ${cena}
titulo: ${titulo}
cenario: ${cenario}
casa: ${casa}
artigo: ${artigo}
passos:
${passos}revelacao:
  paragrafos:
    - O projeto foi arquivado em 31/01/2019 e desarquivado em 19/02/2019.
  fontes:
    - titulo: Ficha do PL 104/2015
      url: https://www.camara.leg.br/propostas-legislativas/945492
      consultadoEm: 2026-11-20
---
${corpo}`;
}

const DECISAO_DE_REGRA = `  - tipo: decisao
    natureza: regra
    id: "1.1"
    pergunta: Como o projeto volta a andar?
    resumo: Desarquivamento a pedido
    fundamento: art. 105 do Regimento da Câmara
    opcoes:
      - texto: O autor pede o desarquivamento
        resultado: certa
        explicacao: Era a regra de 2019.
      - texto: Mandar para o Senado decidir
        resultado: errada
        explicacao: O Senado recebe depois que a Câmara aprova.
`;

const DECISAO_DE_OPINIAO = `  - tipo: decisao
    natureza: opiniao
    id: "1.2"
    pergunta: Você vota Sim ou Não?
    eco: votou
    opcoes:
      - texto: Sim
      - texto: Não
    desfecho:
      - A comissão aprovou o parecer em 30/10/2024.
`;

function lerUm(arquivos: Record<string, string>) {
	const [jogo] = lerJogos(arquivos);
	return jogo;
}

describe("lerJogos", () => {
	it("lê o jogo e as cenas, na ordem do número da cena", () => {
		const jogo = lerUm({
			[`${pasta}/jogo.md`]: jogoMd,
			[`${pasta}/2-na-comissao.md`]: cenaMd({
				cena: "2",
				titulo: "Na comissão",
				cenario: "bg-comissao",
				casa: "Comissões",
				artigo: "o-projeto-passa-pelas-comissoes",
				passos: `  - tipo: fala
    id: c2-01
    quem: arnaldo
    expressao: neutro
    emocao: neutro
    texto: Agora vem a comissão.
`,
			}),
			[`${pasta}/1-o-projeto-esquecido.md`]: cenaMd(),
		});

		expect(jogo).toMatchObject({
			slug: "comissoes",
			titulo: "Jogo das Comissões",
			casas: ["Apresentação", "Comissões"],
		});
		expect(jogo.cenas.map((cena) => cena.slug)).toEqual([
			"1-o-projeto-esquecido",
			"2-na-comissao",
		]);
		expect(jogo.cenas[0].passos[1]).toEqual({
			tipo: "fala",
			id: "c1-02",
			quem: "lia",
			expressao: "confiante",
			emocao: "neutro",
			texto: "Por onde a gente começa?",
		});
		expect(jogo.personagens.lia?.nome).toBe("Lia Moraes");
		expect(jogo.pendencias).toEqual([]);
	});

	it("lê as duas naturezas de decisão", () => {
		const jogo = lerUm({
			[`${pasta}/jogo.md`]: jogoMd,
			[`${pasta}/1-cena.md`]: cenaMd({
				passos: DECISAO_DE_REGRA + DECISAO_DE_OPINIAO,
			}),
		});

		const [regra, opiniao] = jogo.cenas[0].passos;
		expect(regra).toMatchObject({
			natureza: "regra",
			id: "1.1",
			fundamento: "art. 105 do Regimento da Câmara",
		});
		expect(opiniao).toMatchObject({
			natureza: "opiniao",
			eco: "votou",
			desfecho: ["A comissão aprovou o parecer em 30/10/2024."],
		});
	});

	it("recusa a expressão que não tem desenho", () => {
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({
					passos: `  - tipo: fala
    id: c1-01
    quem: lia
    expressao: furiosa
    emocao: neutro
    texto: Uma fala.
`,
				}),
			}),
		).toThrow(/não tem a expressão "furiosa"/);
	});

	it("recusa a narração com expressão e o personagem sem ela", () => {
		const comExpressao = `  - tipo: fala
    id: c1-01
    quem: narracao
    expressao: neutro
    emocao: neutro
    texto: Uma fala.
`;
		const semExpressao = `  - tipo: fala
    id: c1-01
    quem: arnaldo
    emocao: neutro
    texto: Uma fala.
`;
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({ passos: comExpressao }),
			}),
		).toThrow(/a narração não tem retrato/);
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({ passos: semExpressao }),
			}),
		).toThrow(/falta a expressão/);
	});

	it("recusa a decisão de regra sem exatamente uma opção certa", () => {
		const duasCertas = DECISAO_DE_REGRA.replace(
			"resultado: errada",
			"resultado: certa",
		);
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({ passos: duasCertas }),
			}),
		).toThrow(/exatamente uma opção com "resultado: certa", e tem 2/);
	});

	it("recusa a fala repetida e a que não é da cena", () => {
		const repetida = `  - tipo: fala
    id: c1-01
    quem: narracao
    emocao: neutro
    texto: Uma fala.
  - tipo: fala
    id: c1-01
    quem: narracao
    emocao: neutro
    texto: Outra fala.
`;
		const deOutraCena = `  - tipo: fala
    id: c3-01
    quem: narracao
    emocao: neutro
    texto: Uma fala.
`;
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({ passos: repetida }),
			}),
		).toThrow(/a fala "c1-01" já está em/);
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({ passos: deOutraCena }),
			}),
		).toThrow(/a fala "c3-01" não é da cena 1/);
	});

	it("recusa a fala sem emoção e a emoção que não existe", () => {
		const semEmocao = `  - tipo: fala
    id: c1-01
    quem: narracao
    texto: Uma fala.
`;
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({ passos: semEmocao }),
			}),
		).toThrow(/campo "passos.0.emocao": falta este campo/);
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({
					passos: semEmocao.replace(
						"    texto:",
						"    emocao: furioso\n    texto:",
					),
				}),
			}),
		).toThrow(/campo "passos.0.emocao"/);
	});

	it("recusa a casa fora do caminho do jogo.md", () => {
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({ casa: "Sanção" }),
			}),
		).toThrow(/a casa "Sanção" não está no caminho do jogo.md/);
	});

	it("recusa o artigo que não existe na trilha", () => {
		expect(() =>
			lerJogos(
				{
					[`${pasta}/jogo.md`]: jogoMd,
					[`${pasta}/1-cena.md`]: cenaMd({ artigo: "onde-o-projeto-termina" }),
				},
				new Set(["onde-o-projeto-comeca"]),
			),
		).toThrow(/o artigo "onde-o-projeto-termina" não existe na trilha/);
	});

	it("recusa campo desconhecido, texto embaixo do cabeçalho e cena sem jogo.md", () => {
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({ cena: "1\ntrilha: processo" }),
			}),
		).toThrow(/campo desconhecido "trilha"/);
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({ corpo: "\nUm texto solto.\n" }),
			}),
		).toThrow(/o arquivo é só o cabeçalho/);
		expect(() => lerUm({ [`${pasta}/1-cena.md`]: cenaMd() })).toThrow(
			/falta o jogo.md/,
		);
	});

	it("recusa a cena que pula um número", () => {
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/2-cena.md`]: cenaMd({
					cena: "2",
					casa: "Comissões",
					passos: `  - tipo: fala
    id: c2-01
    quem: narracao
    emocao: neutro
    texto: Uma fala.
`,
				}),
			}),
		).toThrow(/falta a cena 1/);
	});

	it("aceita o jogo que apresenta outros personagens, sem exigir os do primeiro", () => {
		const jogo = lerUm({
			[`${pasta}/jogo.md`]: jogoMd.replace(
				`personagens:
  lia:
    nome: Lia Moraes
    quem: deputada federal no primeiro mandato
  arnaldo:
    nome: Arnaldo
    quem: consultor legislativo veterano
  caio:
    nome: Caio
    quem: assessor de um deputado`,
				`personagens:
  joana:
    nome: Joana
    quem: atendente de padaria
  raimundo:
    nome: Seu Raimundo
    quem: dono da padaria`,
			),
			[`${pasta}/1-cena.md`]: cenaMd({
				passos: `  - tipo: fala
    id: c1-01
    quem: joana
    expressao: cansada
    emocao: preocupado
    texto: Eu trabalho seis dias e folgo um.
`,
			}),
		});

		expect(Object.keys(jogo.personagens)).toEqual(["joana", "raimundo"]);
	});

	it("recusa a fala de quem o jogo.md não apresenta", () => {
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({
					passos: `  - tipo: fala
    id: c1-01
    quem: joana
    expressao: cansada
    emocao: preocupado
    texto: Isso vai mudar?
`,
				}),
			}),
		).toThrow(/joana não está nos personagens do jogo.md/);
	});

	it("lê o quórum do painel e a dispensa do prazo", () => {
		const jogo = lerUm({
			[`${pasta}/jogo.md`]: jogoMd,
			[`${pasta}/1-cena.md`]: cenaMd({
				passos: `  - tipo: painel
    modo: nominal
    sim: 472
    nao: 22
    quorum: 308
    data: 2026-05-27
    legenda: O primeiro turno na Câmara.
  - tipo: relogio
    sessoes: 5
    fundamento: art. 202 do Regimento da Câmara
    legenda: O interstício entre os dois turnos.
    dispensa: O Plenário aprovou o requerimento, e o intervalo caiu.
`,
			}),
		});

		const [painel, relogio] = jogo.cenas[0].passos;
		expect(painel).toMatchObject({ tipo: "painel", quorum: 308 });
		expect(relogio).toMatchObject({
			tipo: "relogio",
			dispensa: "O Plenário aprovou o requerimento, e o intervalo caiu.",
		});
	});

	it("lê o painel dos caminhos em debate", () => {
		const jogo = lerUm({
			[`${pasta}/jogo.md`]: jogoMd,
			[`${pasta}/1-cena.md`]: cenaMd({
				passos: `  - tipo: versoes
    titulo: Três caminhos em debate
    caminhos:
      - nome: 4x3
        propoe: 4 dias de trabalho, 3 de folga, até 36 horas
        aFavor: Mais tempo livre e mais saúde
        contra: Custo alto para quem funciona todo dia
      - nome: 5x2 com transição
        propoe: 2 folgas por semana, 42 horas e depois 40
        aFavor: Muda a rotina sem um salto brusco
        contra: Ainda pesa para o pequeno negócio
        etiqueta: Foi o caminho do acordo na comissão.
`,
			}),
		});

		expect(jogo.cenas[0].passos[0]).toMatchObject({
			tipo: "versoes",
			caminhos: [{ nome: "4x3" }, { nome: "5x2 com transição" }],
		});
	});

	it("recusa dois caminhos com o mesmo nome no painel do debate", () => {
		expect(() =>
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({
					passos: `  - tipo: versoes
    titulo: Os caminhos
    caminhos:
      - nome: 4x3
        propoe: Quatro dias de trabalho
        aFavor: Mais tempo livre
        contra: Custo alto
      - nome: 4x3
        propoe: Outra coisa
        aFavor: Um argumento
        contra: Outro argumento
`,
				}),
			}),
		).toThrow(/o caminho "4x3" já está neste painel/);
	});

	it("lê a caixa datada do epílogo e as lições da trilha", () => {
		const jogo = lerUm({
			[`${pasta}/jogo.md`]: jogoMd.replace(
				"epilogo:\n  titulo: O que a lei mudou",
				`licoes: true
epilogo:
  titulo: O que a lei mudou
  situacao:
    data: 2026-11-25
    paragrafos:
      - O mérito das ações seguia pendente na data da revisão.`,
			),
			[`${pasta}/1-cena.md`]: cenaMd(),
		});

		expect(jogo.licoes).toBe(true);
		expect(jogo.epilogo.situacao).toMatchObject({ data: "2026-11-25" });
	});

	it("deixa o jogo sem lições e sem caixa datada", () => {
		const jogo = lerUm({
			[`${pasta}/jogo.md`]: jogoMd,
			[`${pasta}/1-cena.md`]: cenaMd(),
		});

		expect(jogo.licoes).toBeUndefined();
		expect(jogo.epilogo.situacao).toBeUndefined();
	});

	it("junta os problemas num ErroDeRoteiro, com o arquivo de cada um", () => {
		try {
			lerUm({
				[`${pasta}/jogo.md`]: jogoMd,
				[`${pasta}/1-cena.md`]: cenaMd({ cenario: "bg-cozinha" }),
			});
			expect.unreachable("a leitura precisa falhar");
		} catch (erro) {
			expect(erro).toBeInstanceOf(ErroDeRoteiro);
			expect((erro as Error).message).toContain(
				"conteudo/jogo/comissoes/1-cena.md:",
			);
		}
	});
});
