import { describe, expect, it } from "vitest";
import {
	classeDaFita,
	dominio,
	fitaDaPosicao,
	formatarData,
	fraseDoProgresso,
	idDoPasso,
	pedacosDoDominio,
	plural,
	tamanhoDaTrilha,
} from "./formatar";

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

describe("pedacosDoDominio", () => {
	it("parte o site da fonte antes de cada ponto, para a linha quebrar ali", () => {
		expect(
			pedacosDoDominio("https://direitoshumanos.dpu.def.br/defensoria/"),
		).toEqual(["direitoshumanos", ".dpu", ".def", ".br"]);
		expect(
			pedacosDoDominio("https://www.congressonacional.leg.br/materias"),
		).toEqual(["congressonacional", ".leg", ".br"]);
	});

	it("junta os pedaços no mesmo texto do dominio", () => {
		const url = "https://www12.senado.leg.br/noticias/glossario-legislativo";
		expect(pedacosDoDominio(url).join("")).toBe(dominio(url));
	});
});

describe("a fita da posição", () => {
	it("segue a ordem das cinco fitas e volta à primeira na sexta posição", () => {
		expect([1, 2, 3, 4, 5, 6].map(fitaDaPosicao)).toEqual([
			"verde",
			"amarela",
			"azul",
			"rosa",
			"vermelha",
			"verde",
		]);
	});

	it("dá a classe que põe a cor da fita no elemento", () => {
		expect(classeDaFita(1)).toBe("fita-verde");
		expect(classeDaFita(5)).toBe("fita-vermelha");
		expect(classeDaFita(7)).toBe("fita-amarela");
	});
});

describe("fraseDoProgresso", () => {
	it("diz quantos artigos a pessoa leu, e nada antes do primeiro", () => {
		expect(fraseDoProgresso(0, 3)).toBe("");
		expect(fraseDoProgresso(1, 3)).toBe("Você leu 1 de 3.");
		expect(fraseDoProgresso(3, 3)).toBe("Você terminou a trilha.");
	});
});

describe("tamanhoDaTrilha", () => {
	it("diz quantos artigos a trilha tem e quantos minutos de leitura somam", () => {
		const artigos = [{ minutos: 2 }, { minutos: 2 }, { minutos: 2 }];
		expect(tamanhoDaTrilha(artigos)).toBe("3 artigos · 6 min de leitura");
		expect(tamanhoDaTrilha([{ minutos: 3 }])).toBe(
			"1 artigo · 3 min de leitura",
		);
	});
});

describe("idDoPasso", () => {
	it("faz o endereço do passo pelo título, sem acento nem espaço", () => {
		expect(idDoPasso("Apresentação")).toBe("passo-apresentacao");
		expect(idDoPasso("Plenário")).toBe("passo-plenario");
		expect(idDoPasso("A outra Casa")).toBe("passo-a-outra-casa");
		expect(idDoPasso("Sanção ou veto")).toBe("passo-sancao-ou-veto");
	});
});
