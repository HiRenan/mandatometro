import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	linhasDaLista,
	MAXIMOS_DE_COLUNAS,
	variaveisDaLista,
} from "./lista-das-trilhas";

/** Um arquivo do código do site, a partir de src/. */
const codigo = (arquivo: string) =>
	readFileSync(new URL(`../${arquivo}`, import.meta.url), "utf8");

/** O index.css sem os comentários. */
const css = codigo("index.css").replace(/\/\*[\s\S]*?\*\//g, "");

/** O que fica dentro de cada bloco `@media` com a condição. */
function blocosDeMedia(condicao: string): string[] {
	const blocos: string[] = [];
	let de = css.indexOf(`@media ${condicao} {`);
	while (de >= 0) {
		const abre = css.indexOf("{", de);
		let fundo = 0;
		let ate = abre;
		for (; ate < css.length; ate++) {
			if (css[ate] === "{") fundo++;
			if (css[ate] === "}" && --fundo === 0) break;
		}
		blocos.push(css.slice(abre + 1, ate));
		de = css.indexOf(`@media ${condicao} {`, ate);
	}
	return blocos;
}

/** As regras de um trecho do CSS: os seletores e o corpo de cada uma. */
function regras(trecho: string) {
	return [...trecho.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
		([, seletor = "", corpo = ""]) => ({
			seletores: seletor.split(",").map((s) => s.trim()),
			corpo,
		}),
	);
}

/** O corpo da regra de um seletor, nos blocos da condição. */
function corpo(condicao: string, seletor: string): string {
	const achada = blocosDeMedia(condicao)
		.flatMap(regras)
		.find((regra) => regra.seletores.includes(seletor));
	if (!achada) {
		throw new Error(`o index.css não tem ${seletor} em @media ${condicao}`);
	}
	return achada.corpo;
}

/** O valor de uma propriedade num corpo de regra. */
function valor(corpoDaRegra: string, propriedade: string): string | undefined {
	return new RegExp(`(?:^|;|\\s)${propriedade}:\\s*([^;]+);`).exec(
		corpoDaRegra,
	)?.[1];
}

/** Quantas folhas cada coluna recebe, de cima para baixo e da esquerda para a direita. */
function colunas(artigos: number, linhas: number): number[] {
	const quantas: number[] = [];
	for (let resto = artigos; resto > 0; resto -= linhas) {
		quantas.push(Math.min(linhas, resto));
	}
	return quantas;
}

describe("as linhas da lista das trilhas", () => {
	it("dividem as trilhas de hoje em colunas que terminam juntas", () => {
		// 8 artigos: 2 colunas de 4 e, a partir de 1600 px, 4 de 2.
		expect(colunas(8, linhasDaLista(8, 2))).toEqual([4, 4]);
		expect(colunas(8, linhasDaLista(8, 3))).toEqual([4, 4]);
		expect(colunas(8, linhasDaLista(8, 4))).toEqual([2, 2, 2, 2]);
		// 6 artigos: 2 colunas de 3 e, a partir de 1280 px, 3 de 2.
		expect(colunas(6, linhasDaLista(6, 2))).toEqual([3, 3]);
		expect(colunas(6, linhasDaLista(6, 3))).toEqual([2, 2, 2]);
		expect(colunas(6, linhasDaLista(6, 4))).toEqual([2, 2, 2]);
	});

	it("põem até o máximo de artigos numa linha só", () => {
		expect(linhasDaLista(3, 3)).toBe(1);
		expect(linhasDaLista(3, 4)).toBe(1);
		expect(linhasDaLista(1, 2)).toBe(1);
		expect(linhasDaLista(0, 2)).toBe(1);
	});

	it("sem divisor, deixam a última coluna no máximo uma linha mais curta", () => {
		expect(colunas(3, linhasDaLista(3, 2))).toEqual([2, 1]);
		expect(colunas(7, linhasDaLista(7, 3))).toEqual([4, 3]);
		expect(colunas(11, linhasDaLista(11, 4))).toEqual([3, 3, 3, 2]);
	});

	it("nunca passam do máximo de colunas, de 1 a 30 artigos", () => {
		for (let artigos = 1; artigos <= 30; artigos++) {
			for (const maximo of MAXIMOS_DE_COLUNAS) {
				const quantas = colunas(artigos, linhasDaLista(artigos, maximo));
				const rotulo = `${artigos} artigos em até ${maximo} colunas`;
				expect(quantas.length, rotulo).toBeLessThanOrEqual(maximo);
				expect(
					Math.max(...quantas) - Math.min(...quantas),
					rotulo,
				).toBeLessThanOrEqual(1);
			}
		}
	});

	it("vão para o CSS nas variáveis de cada largura", () => {
		expect(variaveisDaLista(8)).toEqual({
			"--linhas-2": 4,
			"--linhas-3": 4,
			"--linhas-4": 2,
		});
		expect(variaveisDaLista(3)).toEqual({
			"--linhas-2": 2,
			"--linhas-3": 1,
			"--linhas-4": 1,
		});
	});
});

/** O CSS de todos os arquivos do site, sem os comentários. */
const todoCss = [
	codigo("index.css"),
	...["movimento", "fundo", "azulejos", "quiz"].map((nome) =>
		codigo(`estilos/${nome}.css`),
	),
]
	.join("\n")
	.replace(/\/\*[\s\S]*?\*\//g, "");

describe("o CSS da lista das trilhas no computador", () => {
	it("lê as linhas do variaveisDaLista, uma variável em cada largura", () => {
		const nomes = Object.keys(variaveisDaLista(8));
		const larguras = [
			"(width >= 64rem)",
			"(width >= 80rem)",
			"(width >= 100rem)",
		];

		expect(nomes).toEqual(MAXIMOS_DE_COLUNAS.map((m) => `--linhas-${m}`));
		nomes.forEach((nome, i) => {
			const regra = corpo(
				larguras[i] ?? "",
				".trilha-da-lista .folhas-da-trilha",
			);
			expect(valor(regra, "grid-template-rows")).toBe(
				`repeat(var(${nome}), auto)`,
			);
		});
	});

	it("põe as colunas só na lista das trilhas: Nesta trilha, no artigo, fica igual", () => {
		const colunas =
			/grid-auto-flow|grid-template-rows|grid-auto-columns|column-gap|margin-bottom|--linhas-/;
		const daLista = regras(todoCss).filter(({ seletores }) =>
			seletores.some((seletor) => seletor.includes(".folhas-da-trilha")),
		);

		expect(daLista.length).toBeGreaterThan(0);
		for (const { seletores, corpo: daRegra } of daLista) {
			for (const seletor of seletores) {
				if (!seletor.startsWith(".trilha-da-lista ")) {
					expect(daRegra, seletor).not.toMatch(colunas);
				}
			}
		}
		expect(codigo("components/nesta-trilha.tsx")).not.toContain(
			"trilha-da-lista",
		);
	});
});

describe("o recuo do título da trilha, em /trilhas", () => {
	// O recuo é o que fica entre a caixa do título e as margens da página: o
	// respiro dos dois lados da folha, os fios de 2 px, o azulejo e o vão depois
	// dele e, com a cabeça aberta, o vão e a coluna da descrição.
	const folha = regras(css).find(({ seletores }) =>
		seletores.includes(".trilha-da-lista"),
	)?.corpo;
	const titulo = regras(css).find(({ seletores }) =>
		seletores.includes(".trilha-da-lista .titulo-de-folha"),
	)?.corpo;
	const cabeca = regras(css).find(({ seletores }) =>
		seletores.includes(".trilha-cabeca"),
	)?.corpo;
	const azulejo = Number(
		/clamp\([\d.]+rem, [\d.]+vw, ([\d.]+)rem\)/.exec(
			valor(
				corpo("(width >= 40rem)", ".trilha-cabeca"),
				"grid-template-columns",
			) ?? "",
		)?.[1],
	);
	const aberta = corpo("(width >= 88rem)", ".trilha-cabeca-texto");
	const descricao = Number(
		/minmax\(([\d.]+)rem, 1fr\)/.exec(
			valor(aberta, "grid-template-columns") ?? "",
		)?.[1],
	);

	it("soma os pedaços que a folha tem", () => {
		expect(valor(folha ?? "", "padding")).toMatch(/ var\(--respiro\)$/);
		expect(valor(folha ?? "", "border")).toBe("2px solid var(--tinta)");
		expect(valor(cabeca ?? "", "gap")).toBe("0.75rem var(--respiro)");
		expect(valor(aberta, "column-gap")).toBe("var(--respiro)");
		expect(azulejo).toBe(7.5);
		expect(descricao).toBe(42);
	});

	it("com a cabeça empilhada, de 640 a 1407 px, conta o azulejo ao lado", () => {
		const tablet = valor(
			corpo("(width >= 40rem)", ".trilha-da-lista .titulo-de-folha"),
			"--recuo",
		);
		const computador = blocosDeMedia("(width >= 64rem)")
			.flatMap(regras)
			.filter(({ seletores }) =>
				seletores.includes(".trilha-da-lista .titulo-de-folha"),
			);

		expect(tablet).toBe(`calc(3 * var(--respiro) + 4px + ${azulejo}rem)`);
		expect(computador).toEqual([]);
	});

	it("com a cabeça aberta, a partir de 1408 px, conta também a descrição", () => {
		const recuo = valor(
			corpo("(width >= 88rem)", ".trilha-da-lista .titulo-de-folha"),
			"--recuo",
		);

		expect(recuo).toBe(
			`calc(4 * var(--respiro) + 4px + ${azulejo + descricao}rem)`,
		);
	});

	it("não deixa o título passar da coluna dele quando a descrição cresce", () => {
		// A conta usa a descrição nos 42rem dela. Quando ela cresce, as duas colunas
		// ficam iguais, e a do título também passa de 42rem: o título, no maior
		// tamanho (o fim do --letra), cabe nela.
		const letra = Number(
			/clamp\([^,]+, [^,]+, ([\d.]+)rem\)/.exec(
				valor(titulo ?? "", "--letra") ?? "",
			)?.[1],
		);
		const palavra = Number(
			/titulo-de-folha letra-com-teto \[--palavra:([\d.]+)\]/.exec(
				codigo("routes/trilhas/index.tsx"),
			)?.[1],
		);

		expect(letra).toBe(4.5);
		expect(letra * palavra).toBeLessThanOrEqual(descricao);
	});
});
