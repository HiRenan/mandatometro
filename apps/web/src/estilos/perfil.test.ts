import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// O perfil da conta (estilos/perfil.css) com a letra a 200%, num celular. O
// jsdom não desenha: este teste lê o CSS.
const css = readFileSync(
	new URL("./perfil.css", import.meta.url),
	"utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

it("as colunas da conta deixam cada parágrafo na largura delas, e o endereço do e-mail quebra", () => {
	// Com o justify-items: start, o parágrafo não fica mais estreito que a
	// palavra mais comprida, e o break-word do body não muda esse mínimo: a 320
	// px, com a letra a 200%, o contato@mandatometro.com.br passava da tela.
	const regra = css.match(
		/\.perfil-conta-dados,\s*\.perfil-conta-acoes\s*\{([^}]*)\}/,
	)?.[1];
	expect(regra).toBeDefined();
	expect(regra).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\)/);
	expect(regra).not.toMatch(/justify-items:\s*start/);
});
