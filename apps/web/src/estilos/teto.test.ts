import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O teto da letra grande (o letra-com-teto do index.css) mede a caixa do teto,
// e não a tela: o 100vw conta a barra de rolagem do Windows (15 px), e, numa
// janela de computador estreita, a palavra encostada no teto passava da página
// e se partia (a #139). Este teste lê o CSS, porque o jsdom não desenha; a
// medida de verdade é no navegador, com a barra de rolagem à vista.

const estilos = new URL("./", import.meta.url);

/** O CSS do site, arquivo por arquivo, sem os comentários. */
const arquivos = [
	["index.css", new URL("../index.css", import.meta.url)] as const,
	...readdirSync(estilos)
		.filter((nome) => nome.endsWith(".css"))
		.map((nome) => [`estilos/${nome}`, new URL(nome, estilos)] as const),
].map(([nome, url]) => ({
	nome,
	css: readFileSync(url, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
}));

/** Os valores de uma propriedade em todo o CSS, cada um numa linha só. */
function valores(propriedade: string) {
	return arquivos.flatMap(({ nome, css }) =>
		[
			...css.matchAll(
				new RegExp(`(?:^|[;{\\s])${propriedade}:([^;{}]+);`, "g"),
			),
		].map(([, valor = ""]) => ({
			onde: `${nome}: ${propriedade}`,
			valor: valor
				.replace(/\s+/g, " ")
				.replace(/\( /g, "(")
				.replace(/ \)/g, ")")
				.trim(),
		})),
	);
}

/** Uma unidade da tela: o vw e os parentes dele, que também contam a barra. */
const DA_TELA = /[\d.](?:s|l|d)?vw\b/;

describe("o teto da letra grande", () => {
	it("tira as margens e o recuo da largura da caixa do teto, e não da tela", () => {
		const tetos = valores("font-size").map(({ valor }) => valor);

		expect(tetos).toContain(
			"min(var(--letra), calc((100cqi - 2 * var(--margem) - var(--recuo, 0px)) / var(--palavra)))",
		);
	});

	it("nenhuma conta do teto mede a tela, que conta a barra de rolagem", () => {
		// Cada tamanho que para na palavra mais larga (o --palavra) e cada recuo
		// que entra nessa conta: com o 100vw, o título tinha 15 px a mais do que
		// a caixa, e a palavra mais larga se partia na beirada.
		const tetos = valores("font-size").filter(({ valor }) =>
			valor.includes("var(--palavra)"),
		);
		const recuos = [...valores("--recuo"), ...valores("--recuo-de-fora")];

		// O teto dos títulos do site, o dos que vêm da API e o do resultado do quiz.
		expect(tetos.length).toBeGreaterThanOrEqual(3);
		expect(recuos.length).toBeGreaterThan(10);
		for (const { onde, valor } of tetos) {
			expect(valor, onde).toContain("100cqi");
		}
		for (const { onde, valor } of [...tetos, ...recuos]) {
			expect(valor, onde).not.toMatch(DA_TELA);
		}
	});
});
