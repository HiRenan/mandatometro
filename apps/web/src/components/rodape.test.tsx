// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Rodape } from "./rodape";

afterEach(cleanup);

describe("rodapé", () => {
	it("é a região de informações do site, com o projeto e as fontes", () => {
		render(<Rodape />);
		const rodape = screen.getByRole("contentinfo");

		expect(rodape.textContent).toContain(
			"O Mandatômetro foi feito para o Hack Brasil 2026, na trilha Acesso à educação.",
		);
		expect(rodape.textContent).toContain(
			"Cada explicação traz a fonte oficial: a lei, o regimento ou a página da Câmara e do Senado.",
		);
	});

	it("leva ao código no GitHub, com a área de toque das ações em texto", () => {
		render(<Rodape />);
		const codigo = within(screen.getByRole("contentinfo")).getByRole("link", {
			name: "O código é aberto, no GitHub",
		});

		expect(codigo.getAttribute("href")).toBe(
			"https://github.com/HiRenan/mandatometro",
		);
		expect(codigo.classList.contains("acao-de-texto")).toBe(true);
		// O padding do link faz a área de toque, e o anel de foco contorna só o
		// texto, que fica num span (index.css).
		expect(codigo.firstElementChild?.tagName).toBe("SPAN");
		expect(codigo.firstElementChild?.textContent).toBe(
			"O código é aberto, no GitHub",
		);
	});

	it("tem o nome e o lema, e a fileira de azulejos fica fora do leitor de tela", () => {
		render(<Rodape />);
		const rodape = screen.getByRole("contentinfo");
		const fileira = rodape.querySelector(".faixa-de-azulejos");

		expect(rodape.textContent).toContain("Mandatômetro");
		expect(rodape.textContent).toContain(
			"o diário oficial político, simplificado",
		);
		// O rodapé é de papel: o foco amarelo é só do cabeçalho, que é de tinta.
		expect(rodape.classList.contains("moldura")).toBe(false);
		expect(fileira?.getAttribute("aria-hidden")).toBe("true");
		expect(fileira?.querySelectorAll(".az")).toHaveLength(16);
	});

	it("as cinco fitas aparecem juntas nos oito azulejos da fileira do celular", () => {
		render(<Rodape />);
		const pecas = [
			...screen
				.getByRole("contentinfo")
				.querySelectorAll<HTMLElement>(".faixa-de-azulejos .az"),
		].slice(0, 8);
		const cores = pecas
			.map((peca) => peca.getAttribute("style") ?? "")
			.join(" ");

		for (const fita of ["verde", "amarela", "azul", "rosa", "vermelha"]) {
			expect(cores, fita).toContain(`var(--fita-${fita})`);
		}
	});

	it("com a letra grande, fica com a largura da tela e as margens de 20 px", () => {
		render(<Rodape />);
		const grade = screen
			.getByRole("contentinfo")
			.querySelector(":scope > div.grid");

		// Abaixo do lg, a coluna não cresce até a peça mais larga.
		expect(grade?.classList.contains("grid-cols-[minmax(0,1fr)]")).toBe(true);
		expect(grade?.classList.contains("px-margem-celular")).toBe(true);
	});

	it("não pede dado nenhum", () => {
		render(<Rodape />);

		expect(
			screen
				.getByRole("contentinfo")
				.querySelector("form, input, select, textarea"),
		).toBeNull();
	});
});
