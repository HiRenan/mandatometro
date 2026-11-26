import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync(new URL("./jogo.css", import.meta.url), "utf8");

// O caminho do jogo tinha cinco colunas escritas na folha de estilo, e a sexta
// casa do Jogo da 6x1 caía para uma segunda linha, sozinha. A linha passa a ter
// uma coluna por casa, pelo --casas que o componente escreve.

it("dá uma coluna por casa no caminho, e não cinco fixas", () => {
	expect(css).toMatch(
		/\.jogo-caminho ol \{\s*grid-template-columns: repeat\(var\(--casas, 5\), minmax\(0, 1fr\)\);\s*\}/,
	);
	expect(css).not.toMatch(
		/grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/,
	);
});

it("deixa o nome da casa quebrar, que numa coluna estreita ele não cabe", () => {
	const casa = /\.jogo-casa \{([^}]*)\}/.exec(css)?.[1];
	expect(casa).toContain("overflow-wrap: anywhere;");
});
