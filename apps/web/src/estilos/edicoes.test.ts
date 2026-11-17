import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// As regras das páginas das edições que dependem do desenho: o teto dos títulos
// que vêm da API, medido pela caixa deles, e a quebra simples de linha no texto
// de cada item. Este teste lê o CSS, porque o jsdom não desenha; a medida de
// verdade é no navegador, com a barra de rolagem do Windows à vista.

const index = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const edicoes = readFileSync(new URL("./edicoes.css", import.meta.url), "utf8");

/** O corpo da regra de um seletor, com os espaços juntos, como numa linha só. */
function regra(css: string, seletor: string): string {
	const escapado = seletor.replace(/[.*+?^${}()|[\]\\>]/g, "\\$&");
	const achada = new RegExp(`(?:^|[\\n}])\\s*${escapado} \\{([^}]*)\\}`).exec(
		css,
	);
	if (!achada) {
		throw new Error(`o CSS não tem a regra ${seletor}`);
	}
	return achada[1]
		.replace(/\s+/g, " ")
		.replace(/\( /g, "(")
		.replace(/ \)/g, ")")
		.trim();
}

describe("o teto dos títulos que vêm da API", () => {
	it("a caixa em volta do título é um contêiner da largura", () => {
		expect(regra(index, ".caixa-do-teto")).toBe("container-type: inline-size;");
	});

	it("a letra para quando a palavra mais larga enche a caixa, e não a tela", () => {
		const teto = regra(index, ".letra-com-teto.teto-pela-caixa");

		// O 100cqi é a largura da caixa: ele já desconta a barra de rolagem e o
		// limite da folha. O 100vw conta a barra (15 px no Windows).
		expect(teto).toContain(
			"font-size: min(var(--letra), calc(100cqi / var(--palavra)));",
		);
		expect(teto).not.toMatch(/vw/);
	});

	it("o título nunca fica mais estreito que a palavra mais larga dele", () => {
		// O max-width do título (10 em na edição, 14 em no item) perde para o
		// min-width quando a palavra é mais larga que ele.
		expect(regra(index, ".letra-com-teto.teto-pela-caixa")).toContain(
			"min-width: calc(var(--palavra) * 1em);",
		);
	});
});

describe("o texto de cada item", () => {
	it("guarda a quebra simples de linha, como o <br> do e-mail", () => {
		// Os parágrafos herdam o white-space da caixa do texto.
		expect(regra(edicoes, ".item-da-edicao > .texto")).toContain(
			"white-space: pre-line;",
		);
	});
});
