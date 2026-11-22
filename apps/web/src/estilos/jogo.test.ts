import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const css = readFileSync(new URL("./jogo.css", import.meta.url), "utf8");

function regra(seletor: string) {
	const inicio = css.indexOf(`${seletor} {`);
	expect(inicio, seletor).toBeGreaterThanOrEqual(0);
	return css.slice(inicio, css.indexOf("}", inicio));
}

// O jsdom não mede a área de toque, a reserva da fala nem o carimbo animado.
it("mantém a fala em Literata sobre uma grade com espaço para o item da cena", () => {
	expect(regra(".jogo-linhas-da-fala")).toContain("display: grid;");
	expect(regra(".jogo-linhas-da-fala")).toContain(
		"font-family: var(--font-serif);",
	);
	expect(regra('.jogo-placa[data-narracao="true"]')).not.toMatch(
		/(?<!-)\bborder:/,
	);
	expect(css).toMatch(
		/\.jogo-palco\[data-sobre-a-cena\] > \.jogo-frente \{[^}]*margin-block-start: var\(--espaco-do-item\);/,
	);
});

it("contém o carimbo durante a batida e dá espaço para a casa atual na tela estreita", () => {
	expect(regra(".jogo-palco")).toContain("overflow-x: clip;");
	expect(regra(".jogo-casa")).toContain("overflow-wrap: anywhere;");
	expect(css).toMatch(
		/@media \(width < 22rem\)[\s\S]*?\.jogo-aqui \{\s*grid-column: 2;/,
	);
});

it("dá 44 px de altura aos links de referência do jogo", () => {
	expect(regra(".jogo .lista-de-fontes a")).toContain("min-height: 44px;");
	expect(css).toMatch(
		/\.jogo-cartao-trilha a,\s*\.jogo \.lista-de-fontes a \{/,
	);
});
