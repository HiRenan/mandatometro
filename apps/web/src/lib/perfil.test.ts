import { describe, expect, it } from "vitest";
import { largura } from "./conteudo/regua";
import {
	fraseDaLeitura,
	fraseDaTrilha,
	linhasDaSaudacao,
	ondeContinuar,
	primeiroNome,
	TETO_DA_CAIXA,
	tetoDaSaudacao,
} from "./perfil";

// Três trilhas inventadas, com dois, três e dois artigos.
const artigo = (trilha: string, slug: string) => ({ trilha, slug });
const TRILHAS = [
	{ artigos: [artigo("a", "um"), artigo("a", "dois")] },
	{ artigos: [artigo("b", "um"), artigo("b", "dois"), artigo("b", "tres")] },
	{ artigos: [artigo("c", "um"), artigo("c", "dois")] },
];
const lidos = (...ids: string[]) => new Set(ids);

describe("onde continuar a leitura no perfil", () => {
	it("sem nada lido, começa pelo primeiro artigo da primeira trilha", () => {
		expect(ondeContinuar(TRILHAS, lidos())).toEqual(artigo("a", "um"));
	});

	it("continua na trilha começada, mesmo com outra terminada antes dela", () => {
		expect(ondeContinuar(TRILHAS, lidos("a/um", "a/dois", "c/um"))).toEqual(
			artigo("c", "dois"),
		);
	});

	it("com duas trilhas começadas, continua na primeira da lista", () => {
		expect(ondeContinuar(TRILHAS, lidos("b/um", "c/um"))).toEqual(
			artigo("b", "dois"),
		);
	});

	it("com as trilhas começadas já terminadas, vai ao primeiro artigo que falta", () => {
		expect(ondeContinuar(TRILHAS, lidos("a/um", "a/dois"))).toEqual(
			artigo("b", "um"),
		);
	});

	it("dentro da trilha, volta ao primeiro artigo que falta", () => {
		expect(ondeContinuar(TRILHAS, lidos("b/dois"))).toEqual(artigo("b", "um"));
	});

	it("com tudo lido, não há onde continuar", () => {
		const todos = TRILHAS.flatMap((trilha) =>
			trilha.artigos.map((item) => `${item.trilha}/${item.slug}`),
		);
		expect(ondeContinuar(TRILHAS, new Set(todos))).toBeUndefined();
	});
});

describe("as frases do perfil", () => {
	it("dizem a leitura da conta sem número quando nada foi lido", () => {
		expect(fraseDaLeitura(0, 28)).toBe("Você ainda não leu nenhum artigo.");
		expect(fraseDaLeitura(9, 28)).toBe("Você leu 9 de 28 artigos.");
		expect(fraseDaLeitura(28, 28)).toBe("Você leu os 28 artigos.");
	});

	it("falam também da trilha ainda não começada", () => {
		expect(fraseDaTrilha(0, 8)).toBe("Você ainda não começou esta trilha.");
		expect(fraseDaTrilha(3, 8)).toBe("Você leu 3 de 8.");
		expect(fraseDaTrilha(8, 8)).toBe("Você terminou a trilha.");
	});
});

describe("a saudação", () => {
	it("usa a primeira palavra do nome completo", () => {
		expect(primeiroNome("  Maria   Fictícia de Exemplo ")).toBe("Maria");
		expect(primeiroNome("Ana")).toBe("Ana");
		expect(primeiroNome("")).toBe("");
	});

	it("diz olá antes de a conta responder e põe o nome numa linha à parte", () => {
		expect(linhasDaSaudacao("")).toEqual(["Olá!"]);
		expect(linhasDaSaudacao("Maria")).toEqual(["Olá,", "Maria."]);
	});

	it("mede o nome inteiro, também com hífen, para ele caber numa linha", () => {
		expect(tetoDaSaudacao("Ana-Maria")).toBeGreaterThanOrEqual(
			largura("Ana-Maria.", "titulo-condensado"),
		);
	});

	it("guarda a caixa na letra maior: nenhum nome pede uma letra maior que ela", () => {
		for (const primeiro of ["", "Ana", "Maria", "Maximiliana"]) {
			expect(tetoDaSaudacao(primeiro)).toBeGreaterThanOrEqual(TETO_DA_CAIXA);
		}
	});
});
