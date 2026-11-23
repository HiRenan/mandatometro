import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ESTADOS } from "./estados";
import {
	ALTURA_DO_TRACADO,
	CAMINHOS,
	CONTORNO,
	FRONTEIRAS_DAS_REGIOES,
	LARGURA_DO_TRACADO,
} from "./tracado";

// O traçado dos estados, que o imagens/tracado.mjs gera a partir das malhas do
// IBGE (pnpm --filter web tracado).

const arquivo = readFileSync(new URL("./tracado.ts", import.meta.url), "utf8");

/** Os pontos de um caminho do traçado: o M absoluto e os l relativos, em inteiros. */
function pontos(d: string): string[] {
	const saida: string[] = [];
	for (const trecho of d.match(/M[^M]*/g) ?? []) {
		const [inicio, resto = ""] = trecho.slice(1).replace(/z$/, "").split("l");
		const numeros = (texto: string) =>
			(texto.match(/-?\d+/g) ?? []).map(Number);
		let [x, y] = numeros(inicio);
		saida.push(`${x},${y}`);
		const relativos = numeros(resto);
		for (let i = 0; i < relativos.length; i += 2) {
			x += relativos[i];
			y += relativos[i + 1];
			saida.push(`${x},${y}`);
		}
	}
	return saida;
}

describe("o traçado dos estados", () => {
	it("cada um dos 27 estados tem um caminho fechado, dentro da caixa do desenho", () => {
		expect(Object.keys(CAMINHOS).sort()).toEqual(
			ESTADOS.map((estado) => estado.sigla).sort(),
		);
		for (const [sigla, d] of Object.entries(CAMINHOS)) {
			expect(d, sigla).toMatch(/^M.*z$/);
			for (const ponto of pontos(d)) {
				const [x, y] = ponto.split(",").map(Number);
				expect(x, `${sigla} ${ponto}`).toBeGreaterThanOrEqual(0);
				expect(x, `${sigla} ${ponto}`).toBeLessThanOrEqual(LARGURA_DO_TRACADO);
				expect(y, `${sigla} ${ponto}`).toBeGreaterThanOrEqual(0);
				expect(y, `${sigla} ${ponto}`).toBeLessThanOrEqual(ALTURA_DO_TRACADO);
			}
		}
	});

	it("dois vizinhos dividem a fronteira ponto a ponto, sem fresta entre eles", () => {
		const de = (sigla: string) => new Set(pontos(CAMINHOS[sigla]));
		const emComum = (a: string, b: string) =>
			[...de(a)].filter((ponto) => de(b).has(ponto)).length;

		expect(emComum("SC", "PR")).toBeGreaterThan(3);
		expect(emComum("SC", "RS")).toBeGreaterThan(3);
		// O Distrito Federal só faz fronteira com Goiás e Minas Gerais: cada ponto
		// dele é um ponto de um dos dois.
		const vizinhos = new Set([...de("GO"), ...de("MG")]);
		expect(pontos(CAMINHOS.DF).filter((ponto) => !vizinhos.has(ponto))).toEqual(
			[],
		);
	});

	it("o fio grosso das regiões e do contorno passa pelos pontos dos estados", () => {
		const dosEstados = new Set(Object.values(CAMINHOS).flatMap(pontos));

		for (const d of [FRONTEIRAS_DAS_REGIOES, CONTORNO]) {
			expect(pontos(d).length).toBeGreaterThan(100);
			expect(pontos(d).filter((ponto) => !dosEstados.has(ponto))).toEqual([]);
		}
	});

	it("o arquivo pesa menos de 50 kB e traz a fonte do traçado", () => {
		expect(Buffer.byteLength(arquivo)).toBeLessThan(50_000);
		expect(arquivo).toContain(
			"https://github.com/luizpedone/municipal-brazilian-geodata/blob/8a2e7476faf34899c26d74bea03373a2fbb800fb/data/Brasil.json",
		);
		expect(arquivo).toContain("Fonte: IBGE");
	});

	it("o mesmo aviso MIT completo vai no comentário legal do JS e no texto público", () => {
		const comentario = /\/\*!\s*([\s\S]+?)\s*\*\//.exec(arquivo)?.[1];
		expect(comentario).toContain(
			"MIT License\n\nCopyright (c) 2017 Luiz Pedone",
		);
		expect(comentario).toContain(
			"Permission is hereby granted, free of charge",
		);
		expect(comentario).toContain(
			"The above copyright notice and this permission notice shall be included in all",
		);
		expect(comentario).toContain('THE SOFTWARE IS PROVIDED "AS IS"');
		expect(comentario?.endsWith("SOFTWARE.")).toBe(true);
		const publico = readFileSync(
			new URL("../../../public/licenca-do-tracado.txt", import.meta.url),
			"utf8",
		).trim();
		expect(publico).toBe(comentario);
	});
});
