import { describe, expect, it } from "vitest";
import { estiloDoTeto, FOLGA, largura, palavras, tetoDoTitulo } from "./regua";

// O teto de um título que vem de fora do código, como o de uma edição, que a API
// manda: o --palavra sai da régua na hora, e não de um [--palavra:N] escrito no
// código (titulos.test.ts confere esses).

describe("o teto de um título que vem da API", () => {
	it("é a palavra mais larga, com a folga, arredondada para cima", () => {
		const titulo = "Jornal legislativo — 09 a 15/11/2026";
		const maisLarga = Math.max(
			...palavras(titulo).map((palavra) =>
				largura(palavra, "titulo-condensado"),
			),
		);
		const teto = tetoDoTitulo(titulo, "titulo-condensado");

		expect(teto).toBeGreaterThanOrEqual(maisLarga * FOLGA);
		expect(teto).toBeLessThan(maisLarga * FOLGA + 0.01);
		// Duas casas, como os tetos escritos no código.
		expect(Number(teto.toFixed(2))).toBe(teto);
	});

	it("mede no estilo do título", () => {
		const titulo = "Câmara aprova a constitucionalidade";

		expect(tetoDoTitulo(titulo, "subtitulo-condensado")).toBeGreaterThan(
			tetoDoTitulo(titulo, "titulo-condensado"),
		);
	});

	it("a palavra comprida manda no teto, e a curta não", () => {
		expect(tetoDoTitulo("Inconstitucionalidade", "titulo-condensado")).toBe(
			tetoDoTitulo("A inconstitucionalidade da lei", "titulo-condensado"),
		);
	});

	it("um título sem palavra fica com o teto de uma letra larga", () => {
		expect(tetoDoTitulo("   ", "titulo-condensado")).toBe(1);
	});

	it("vai no style do título, na variável que o letra-com-teto lê", () => {
		const titulo = "Jornal legislativo — 09 a 15/11/2026";

		expect(estiloDoTeto(titulo, "titulo-condensado")).toEqual({
			"--palavra": String(tetoDoTitulo(titulo, "titulo-condensado")),
		});
	});
});
