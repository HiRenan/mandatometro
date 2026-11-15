import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A página de erro que volta depois de uma tentativa que falha (o data-de-novo,
// em pagina-de-erro.tsx) fica parada: os azulejos do painel não viram de novo,
// e o pé não sobe outra vez. Este teste lê o CSS, porque o jsdom não anima.

const movimento = readFileSync(
	new URL("../estilos/movimento.css", import.meta.url),
	"utf8",
);

/** As regras do movimento.css para a página de erro de novo, sem os comentários. */
const regras = [
	...movimento.matchAll(/([^{}]*\[data-de-novo\][^{}]*)\{([^}]*)\}/g),
].map(([, seletor, corpo]) => ({
	seletores: seletor
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.split(",")
		.map((parte) => parte.trim()),
	corpo,
}));

describe("a página de erro que volta depois de uma tentativa que falha", () => {
	it("não repete a entrada dos azulejos nem a do pé", () => {
		const seletores = regras.flatMap((regra) => regra.seletores);

		expect(seletores).toContain("[data-pagina-de-erro][data-de-novo] .az");
		expect(seletores).toContain(
			"[data-pagina-de-erro][data-de-novo] .cartaz-pe",
		);
		for (const { seletores, corpo } of regras) {
			expect(corpo, seletores.join(", ")).toMatch(/animation:\s*none/);
		}
	});
});
