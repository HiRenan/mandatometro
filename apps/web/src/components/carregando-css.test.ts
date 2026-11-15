import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O carregando é texto parado: nada nele gira nem se mexe (carregando.tsx). Este
// teste lê o CSS do site, porque o jsdom não desenha.

const estilos = new URL("../estilos/", import.meta.url);
const arquivos = [
	new URL("../index.css", import.meta.url),
	...readdirSync(estilos)
		.filter((nome) => nome.endsWith(".css"))
		.map((nome) => new URL(nome, estilos)),
];

/** As regras do CSS do site que citam o carregando, com o seletor e o corpo. */
const regras = arquivos.flatMap((arquivo) =>
	[
		...readFileSync(arquivo, "utf8").matchAll(
			/([^{}]*\.carregando\b[^{}]*)\{([^}]*)\}/g,
		),
	].map(([, seletor, corpo]) => ({ seletor: seletor.trim(), corpo })),
);

describe("o CSS do carregando", () => {
	it("tem a regra dele no index.css", () => {
		expect(regras.length).toBeGreaterThan(0);
	});

	it("não tem animação nem transição", () => {
		for (const { seletor, corpo } of regras) {
			expect(corpo, seletor).not.toMatch(/animation|transition/);
		}
	});
});
