import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync(
	new URL("../index.css", import.meta.url),
	"utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

it("deixa o anel do teclado a 3 px da borda interna de cada faixa", () => {
	const regra =
		/(?:^|[{}])\s*\.outros-artigos a:focus-visible\s*\{([^{}]*)\}/.exec(
			css,
		)?.[1];

	// O anel geral tem 3 px de espessura. Os outros 3 px separam o anel da borda.
	expect(regra ?? "").toMatch(/(?:^|;)\s*outline-offset:\s*-6px\s*;/);
});
