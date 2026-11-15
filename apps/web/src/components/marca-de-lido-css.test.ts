import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O número do artigo lido, na folha da trilha, nas miniaturas de Trilhas e em
// "Nesta trilha": o visto fica dentro do número, e o número perde a cor. O miolo
// fica apagado, em Papel 2, e o contorno passa para a tinta suave. O Renan, na
// #89: em Papel 3, o contorno tinha 1,5:1 na folha, e o número lido quase sumia.
// Este teste lê o CSS, porque a regra é de cor e o jsdom não desenha.

const site = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const cores = readFileSync(
	new URL("../../../../packages/ui/src/styles/globals.css", import.meta.url),
	"utf8",
);

/** O corpo da regra de um seletor no index.css. */
function regra(seletor: string): string {
	const comeco = site.indexOf(`${seletor} {`);
	if (comeco < 0) {
		throw new Error(`o index.css não tem a regra ${seletor}`);
	}
	return site.slice(comeco, site.indexOf("}", comeco));
}

/** A variável que uma propriedade da regra usa, como `tinta-suave`. */
function variavelDe(corpo: string, propriedade: string): string {
	const achada = corpo.match(
		new RegExp(`(?:^|[\\s;{])${propriedade}:\\s*var\\(--([a-z0-9-]+)\\)`),
	);
	if (!achada) {
		throw new Error(`a regra não tem ${propriedade} com uma variável`);
	}
	return achada[1];
}

/** A cor de uma variável do globals.css, em hexadecimal. */
function cor(variavel: string): string {
	const achada = cores.match(
		new RegExp(`--${variavel}:\\s*(#[0-9a-f]{6});`, "i"),
	);
	if (!achada) {
		throw new Error(`o globals.css não tem a cor --${variavel}`);
	}
	return achada[1];
}

/** A luminância relativa de uma cor, pela conta do WCAG 2. */
function luminancia(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((inicio) => {
		const canal = Number.parseInt(hex.slice(inicio, inicio + 2), 16) / 255;
		return canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** O contraste entre duas cores, de 1 a 21. */
function contraste(uma: string, outra: string): number {
	const [clara, escura] = [luminancia(uma), luminancia(outra)].sort(
		(a, b) => b - a,
	);
	return (clara + 0.05) / (escura + 0.05);
}

describe("o número do artigo lido", () => {
	const corpo = regra(".numeral:has(.marca-de-lido)");

	it("tem o miolo em Papel 2 e o contorno em tinta suave", () => {
		expect(variavelDe(corpo, "color")).toBe("papel-2");
		expect(variavelDe(corpo, "-webkit-text-stroke-color")).toBe("tinta-suave");
	});

	// O DESIGN.md dá 7,4 na folha e 6,7 no papel. A barra é a do texto do site,
	// 4,5: quem dá a forma ao número é o contorno.
	it("tem o contorno que se vê na folha e no papel", () => {
		const contorno = cor(variavelDe(corpo, "-webkit-text-stroke-color"));

		expect(contraste(contorno, cor("folha"))).toBeGreaterThanOrEqual(4.5);
		expect(contraste(contorno, cor("papel"))).toBeGreaterThanOrEqual(4.5);
	});
});
