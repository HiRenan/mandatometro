import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O jsdom não desenha: este teste lê o CSS da caixa da busca. O da entrada do
// cabeçalho fica no header-css.test.ts.

const css = readFileSync(new URL("./busca.css", import.meta.url), "utf8");

describe("o CSS da caixa da busca", () => {
	it("nas cores forçadas, a palavra achada no trecho fica com o realce do sistema", () => {
		// Sem a regra, o navegador dava ao <mark> a letra do realce (MarkText)
		// sobre o fundo sem cor, e a palavra sumia na folha escura (visto no Edge
		// com as cores forçadas).
		expect(css).toMatch(
			/@media \(forced-colors: active\) \{\s*\.busca-resultado-trecho mark \{\s*background: Mark;\s*color: MarkText;\s*\}\s*\}/,
		);
	});
});
