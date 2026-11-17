import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Onde o site tem a API, o cabeçalho tem três links, que não cabem na linha do
// nome no celular: o Início sai, e o nome leva ao início (header.tsx). Este teste
// lê o CSS do site, porque o jsdom não desenha.

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");

/** Cada @media com largura máxima: a largura, em rem, e o corpo dela. */
const midias = [
	...css.matchAll(
		/@media \(width < ([\d.]+)rem\) \{((?:[^{}]*\{[^}]*\})*)\s*\}/g,
	),
].map(([, largura, corpo]) => ({ largura: Number(largura), corpo }));

const TIRA_O_INICIO =
	/\.topo-links\[data-com-edicoes\] > li:first-child \{\s*display: none;\s*\}/;

describe("o CSS do cabeçalho com as edições", () => {
	it("no celular, tira o Início da lista com as edições", () => {
		const midia = midias.find(({ corpo }) => TIRA_O_INICIO.test(corpo));

		expect(midia, "a regra que tira o Início").toBeDefined();
		// Só no celular: dali para cima, os três links cabem na linha do nome.
		expect(midia?.largura).toBeGreaterThanOrEqual(30);
		expect(midia?.largura).toBeLessThanOrEqual(40);
	});

	it("sem as edições, o Início fica em toda largura", () => {
		expect(css).not.toMatch(/\.topo-links\s*>\s*li:first-child/);
		expect(css).not.toMatch(/\.topo-links\s+li:first-child/);
	});
});
