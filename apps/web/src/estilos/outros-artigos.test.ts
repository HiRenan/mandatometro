import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

function regra(arquivo: string, seletor: string) {
	const css = readFileSync(new URL(arquivo, import.meta.url), "utf8").replace(
		/\/\*[\s\S]*?\*\//g,
		"",
	);
	for (const [, cabeca, corpo] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
		if (cabeca?.trim() === seletor) return corpo;
	}
	return "";
}

it("deixa o anel do teclado a 3 px da borda interna de cada faixa", () => {
	// O anel geral tem 3 px de espessura. Os outros 3 px separam o anel da borda.
	expect(regra("../index.css", ".outros-artigos a:focus-visible")).toMatch(
		/(?:^|;)\s*outline-offset:\s*-6px\s*;/,
	);
});

it("vira o azulejo de uma vez quando a faixa tem o foco do teclado", () => {
	expect(
		regra("./movimento.css", ".outros-artigos a:focus-visible .grande"),
	).toMatch(/(?:^|;)\s*transition:\s*none\s*;/);
});
