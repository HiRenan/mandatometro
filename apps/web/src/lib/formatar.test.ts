import { describe, expect, it } from "vitest";
import { corDaFita, dominio, formatarData, plural } from "./formatar";

describe("formatarData", () => {
	it("escreve a data por extenso, sem depender do fuso", () => {
		expect(formatarData("2026-11-09")).toBe("9 de novembro de 2026");
		expect(formatarData("2026-03-01")).toBe("1º de março de 2026");
	});
});

describe("plural", () => {
	it("concorda a palavra com a quantidade", () => {
		expect(plural(1, "artigo", "artigos")).toBe("1 artigo");
		expect(plural(3, "artigo", "artigos")).toBe("3 artigos");
		expect(plural(0, "artigo", "artigos")).toBe("0 artigos");
	});
});

describe("dominio", () => {
	it("mostra o site da fonte sem o www", () => {
		expect(
			dominio("https://www.camara.leg.br/entenda-o-processo-legislativo/"),
		).toBe("camara.leg.br");
		expect(
			dominio("https://www12.senado.leg.br/noticias/glossario-legislativo"),
		).toBe("senado.leg.br");
		expect(
			dominio(
				"https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art61",
			),
		).toBe("normas.leg.br");
	});
});

describe("corDaFita", () => {
	it("dá uma fita por artigo, na ordem das fitas, e recomeça depois da quinta", () => {
		expect(corDaFita(1)).toBe("var(--fita-verde)");
		expect(corDaFita(2)).toBe("var(--fita-amarela)");
		expect(corDaFita(5)).toBe("var(--fita-vermelha)");
		expect(corDaFita(6)).toBe("var(--fita-verde)");
	});
});
