import { describe, expect, it } from "vitest";
import { ErroDeRoteiro, lerJogos } from "./ler";

const pasta = "/conteudo/jogo/comissoes";

const jogoMd = `---
titulo: Jogo das Comissões
resumo: Cinco cenas no caminho de um projeto de lei.
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
    texto: Brasília. Primeira semana de mandato.
  - tipo: fala
    id: c1-02
    quem: lia
    expressao: confiante
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
			texto: "Por onde a gente começa?",
		});
		expect(jogo.personagens.lia.nome).toBe("Lia Moraes");
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
    texto: Uma fala.
`;
		const semExpressao = `  - tipo: fala
    id: c1-01
    quem: arnaldo
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
    texto: Uma fala.
  - tipo: fala
    id: c1-01
    quem: narracao
    texto: Outra fala.
`;
		const deOutraCena = `  - tipo: fala
    id: c3-01
    quem: narracao
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
    texto: Uma fala.
`,
				}),
			}),
		).toThrow(/falta a cena 1/);
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
