import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync(new URL("./painel.css", import.meta.url), "utf8");

it("permite a quebra dos rótulos dentro das colunas do resumo com letra grande", () => {
	const rotulo = /\.resumo-dos-numeros \.rotulo \{([^}]*)\}/.exec(css)?.[1];
	expect(rotulo).toContain("overflow-wrap: anywhere;");
});

it("encurta o recuo da segunda coluna só nas inscrições, na tela estreita com letra grande", () => {
	// A 320 px com a letra a 200%, a largura mínima da tabela com o recuo
	// de 1rem passa da folha. O Edge confere a geometria com a tabela aberta.
	expect(css).toMatch(
		/@media \(width < 11rem\) \{\s*\.inscritos-por-semana \.tabela-dos-numeros :is\(th, td\) \+ :is\(th, td\) \{\s*padding-left: 0\.125rem;\s*\}\s*\}/,
	);
});
