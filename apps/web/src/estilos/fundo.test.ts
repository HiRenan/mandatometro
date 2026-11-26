import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O fundo de todas as páginas (fundo.css): o papel, com o grão e, a partir de
// 768 px, uma coluna de azulejos tom sobre tom em cada margem. Este teste lê o
// margem.svg que o imagens/margem.mjs gravou e o CSS, e confere o que o olho
// cobraria: a coluna emenda com ela mesma, fica no tom do papel, mora nas
// margens e pesa pouco, e nada mais anda atrás da página.

const arquivo = (nome: string) =>
	readFileSync(new URL(`./${nome}`, import.meta.url), "utf8");
/** O texto com os espaços juntos, para ler as regras sem depender das quebras. */
const junto = (texto: string) => texto.replace(/\s+/g, " ");

const svg = arquivo("margem.svg");
const css = junto(arquivo("fundo.css"));
const cores = readFileSync(
	new URL("../../../../packages/ui/src/styles/globals.css", import.meta.url),
	"utf8",
);
const cor = (nome: string) =>
	new RegExp(`--${nome}: (#[0-9a-f]{6});`).exec(cores)?.[1];

const altura = Number(/ viewBox="0 0 100 (\d+)"/.exec(svg)?.[1]);
/** Cada peça é desenhada numa caixa de 100 e encolhe para deixar o rejunte. */
const pecas = [
	...svg.matchAll(
		/<g transform="translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/g,
	),
].map(([, x, y, escala]) => ({
	x: Number(x),
	y: Number(y),
	lado: 100 * Number(escala),
}));

describe("os azulejos da margem", () => {
	it("são doze peças iguais, uma embaixo da outra, com o mesmo rejunte também na emenda", () => {
		expect(pecas).toHaveLength(12);
		expect(new Set(pecas.map(({ lado }) => lado)).size).toBe(1);
		// Cada peça fica no meio da faixa de 100 dela, com metade do rejunte de
		// cada lado; como a coluna mede doze faixas, a emenda com a repetição
		// seguinte tem o mesmo rejunte de dentro da coluna.
		expect(altura).toBe(12 * 100);
		for (const [i, peca] of pecas.entries()) {
			const rejunte = 100 - peca.lado;
			expect(rejunte).toBeGreaterThan(0);
			expect(peca.x).toBeCloseTo(rejunte / 2);
			expect(peca.y).toBeCloseTo(i * 100 + rejunte / 2);
		}
	});

	it("ficam no tom do papel: só o Papel 2 e o Papel 3, sem cor de fita", () => {
		const usadas = new Set(
			[...svg.matchAll(/fill="([^"]+)"/g)].map(([, valor]) => valor),
		);
		expect([...usadas].sort()).toEqual([cor("papel-2"), cor("papel-3")].sort());
	});

	it("ficam nas duas margens a partir de 768 px, a 12 px do conteúdo; no celular, fica o grão", () => {
		expect(css).toContain('--coluna-da-margem: url("./margem.svg");');
		const [, largura, corpo = ""] =
			/@media \(width >= ([\d.]+)rem\) \{ body \{([^}]*)\}/.exec(css) ?? [];

		expect(largura).toBe("48");
		expect(corpo).toContain("--azulejo-da-margem: calc(var(--margem) - 12px);");
		expect(corpo).toContain(
			"background-image: var(--coluna-da-margem), var(--coluna-da-margem), var(--grao);",
		);
		expect(corpo).toContain("background-repeat: repeat-y, repeat-y, repeat;");
		expect(corpo).toContain(
			"background-size: var(--azulejo-da-margem) auto, var(--azulejo-da-margem) auto, 320px 320px;",
		);
		// Uma coluna em cada ponta; a da direita começa cinco peças abaixo.
		expect(corpo).toContain(
			"background-position: 0 0, 100% calc(var(--azulejo-da-margem) * 5), 0 0;",
		);
	});

	it("saem no alto contraste e na impressão, onde o papel fica liso", () => {
		const liso = css.indexOf(
			"@media (forced-colors: active), print { body { background-image: none; } }",
		);
		// A regra vem depois da do computador, que tem o mesmo peso.
		expect(liso).toBeGreaterThan(css.indexOf("@media (width >= 48rem)"));
	});

	it("pesam menos de 5 kB", () => {
		expect(Buffer.byteLength(svg)).toBeLessThan(5_000);
	});
});

describe("o fundo parado", () => {
	// Na #357, as curvas de nível que andavam numa camada atrás da página saíram.
	it("não tem camada atrás da página nem animação de fundo", () => {
		expect(css).not.toContain("body::before");
		expect(arquivo("movimento.css")).not.toMatch(/body::before|mapa-anda/);
	});
});
