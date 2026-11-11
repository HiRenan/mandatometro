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

	it("é o cartão preto, com o foco amarelo e a tira de fitas fora do leitor de tela", () => {
		render(<Rodape />);
		const rodape = screen.getByRole("contentinfo");

		expect(rodape.classList.contains("moldura")).toBe(true);
		expect(
			rodape.querySelector(".tira-de-fitas")?.getAttribute("aria-hidden"),
		).toBe("true");
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
