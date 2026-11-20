// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { EstiloDeTitulo } from "@/lib/conteudo/larguras-das-letras";
import { FOLGA, largura, palavras } from "@/lib/conteudo/regua";
import { PaginaDoTermo } from "./pagina-do-termo";

afterEach(cleanup);

/** A folha do termo, com as nove partes. */
function abrir() {
	render(<PaginaDoTermo />);
	const folha = screen.getByRole("article");
	return { folha, partes: [...folha.querySelectorAll("section")] };
}

/** O --palavra de um título, lido da classe [--palavra:N] dele. */
function tetoDaClasse(titulo: Element): number {
	return Number(/\[--palavra:([\d.]+)\]/.exec(titulo.className)?.[1]);
}

/** A largura da palavra mais larga de um título, com a folga, pela régua do site. */
function palavraMaisLarga(titulo: Element): number {
	const estilo: EstiloDeTitulo = titulo.classList.contains("titulo-condensado")
		? "titulo-condensado"
		: "subtitulo-condensado";
	return Math.max(
		...palavras(titulo.textContent ?? "").map(
			(palavra) => largura(palavra, estilo) * FOLGA,
		),
	);
}

describe("a página do termo", () => {
	it("tem o índice das nove partes nos dois lugares, e cada link leva à parte da folha, na ordem", () => {
		const { partes } = abrir();
		const indices = screen.getAllByRole("navigation", { name: "Neste termo" });

		expect(partes).toHaveLength(9);
		// No jsdom, o CSS não esconde nenhuma das duas cópias.
		expect(indices).toHaveLength(2);
		for (const indice of indices) {
			const links = within(indice).getAllByRole("link");
			expect(links.map((link) => link.getAttribute("href"))).toEqual(
				partes.map((parte) => `#${parte.id}`),
			);
			expect(
				links.map((link) => link.querySelector(".titulo")?.textContent),
			).toEqual(partes.map((parte) => parte.querySelector("h2")?.textContent));
		}
	});

	it("tem os títulos em ordem, e cada parte é uma região com o nome do título", () => {
		const { folha, partes } = abrir();
		const titulos = [...folha.querySelectorAll("h1, h2, h3, h4, h5, h6")];

		expect(titulos.map((titulo) => titulo.tagName)).toEqual([
			"H1",
			...Array(10).fill("H2"),
		]);
		expect(titulos[0].textContent).toBe("Termo de consentimento");
		for (const parte of partes) {
			const titulo = parte.querySelector("h2");
			expect(
				screen.getByRole("region", { name: titulo?.textContent ?? "" }),
			).toBe(parte);
		}
	});

	it("deixa os números das partes e do índice fora do leitor de tela", () => {
		const { partes } = abrir();
		const numeros = document.querySelectorAll(".numeral");

		// Um número em cada parte e um em cada linha das duas cópias do índice.
		expect(numeros).toHaveLength(27);
		for (const numero of numeros) {
			expect(numero.getAttribute("aria-hidden"), numero.textContent ?? "").toBe(
				"true",
			);
		}
		expect(
			partes.map((parte) => parte.querySelector(".numeral")?.textContent),
		).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
	});

	it("dá a cada título um teto que cabe a palavra mais larga dele, pela régua do site", () => {
		const { folha } = abrir();
		const titulos = [
			screen.getByRole("heading", { level: 1 }),
			...folha.querySelectorAll("section > h2"),
		];

		expect(titulos).toHaveLength(10);
		for (const titulo of titulos) {
			expect(titulo.classList.contains("letra-com-teto")).toBe(true);
			expect(
				tetoDaClasse(titulo),
				titulo.textContent ?? "",
			).toBeGreaterThanOrEqual(palavraMaisLarga(titulo));
		}
	});

	it("diz o tempo de leitura do texto, contado como o do artigo: 200 palavras por minuto", () => {
		const { folha } = abrir();
		const texto = [
			...folha.querySelectorAll(
				".lide, section > h2, section .texto p, section .texto li",
			),
		]
			.map((bloco) => bloco.textContent)
			.join(" ");
		const quantas = texto
			.split(/\s+/)
			.filter((palavra) => /[\p{L}\p{N}]/u.test(palavra)).length;
		const minutos = Math.max(1, Math.round(quantas / 200));

		expect(folha.querySelector(".faixa")?.textContent).toContain(
			`Leitura de ${minutos} min`,
		);
	});
});
