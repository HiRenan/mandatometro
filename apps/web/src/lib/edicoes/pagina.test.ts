import { describe, expect, it } from "vitest";
import { idDaEdicao, paginaDaBusca } from "./pagina";

describe("a página da lista no endereço", () => {
	it("aceita um inteiro de 2 em diante, em número ou em texto", () => {
		expect(paginaDaBusca(2)).toBe(2);
		expect(paginaDaBusca("3")).toBe(3);
		expect(paginaDaBusca(40)).toBe(40);
	});

	it("a primeira página e o valor inválido ficam sem número, como a lista sem ?pagina", () => {
		for (const valor of [
			1,
			"1",
			0,
			-2,
			1.5,
			"abc",
			"2a",
			"",
			null,
			undefined,
		]) {
			expect(paginaDaBusca(valor), String(valor)).toBeUndefined();
		}
	});
});

describe("o id da edição no endereço", () => {
	it("aceita um inteiro positivo", () => {
		expect(idDaEdicao("7")).toBe(7);
		expect(idDaEdicao(12)).toBe(12);
		expect(idDaEdicao("2147483647")).toBe(2147483647);
	});

	it("recusa o que não pode ser o id de uma edição", () => {
		for (const valor of [
			"abc",
			"0",
			"-1",
			"1.5",
			"07",
			" 7",
			"7 ",
			"2147483648",
			"99999999999",
			"",
			0,
			-3,
			1.5,
			null,
			undefined,
		]) {
			expect(idDaEdicao(valor), String(valor)).toBeNull();
		}
	});
});
