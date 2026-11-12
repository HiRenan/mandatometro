// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Fontes, ListaDeFontes } from "./fontes";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("fontes oficiais", () => {
	it("parte nos pontos o domínio que repete um pedaço, sem chave repetida", () => {
		// O React avisa no console.error quando dois filhos têm a mesma chave.
		const erros = vi.spyOn(console, "error").mockImplementation(() => {});
		render(
			<Fontes
				fontes={[
					{
						titulo: "Glossário legislativo",
						// Um endereço de mentira, com o pedaço ".leg" duas vezes.
						url: "https://www12.senado.leg.leg.br/noticias/glossario-legislativo",
						consultadoEm: "2026-11-12",
					},
				]}
			/>,
		);
		// O domínio em pedaços, que aparece com a letra grande (abaixo de 20rem).
		const pedacos = screen
			.getByRole("listitem")
			.querySelector("wbr")?.parentElement;

		expect(pedacos?.textContent).toBe("senado.leg.leg.br");
		expect(pedacos?.querySelectorAll("wbr")).toHaveLength(3);
		expect(erros).not.toHaveBeenCalled();
	});

	it("põe a mesma lista no quiz, sem o título e o id da seção do artigo", () => {
		const fontes = [
			{
				titulo: "Constituição Federal, art. 61",
				url: "https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art61",
				consultadoEm: "2026-11-12",
			},
		];
		const lista = renderToStaticMarkup(<ListaDeFontes fontes={fontes} />);

		expect(renderToStaticMarkup(<Fontes fontes={fontes} />)).toContain(lista);
		expect(lista).toMatch(/^<ol class="mt-4 grid gap-4">/);
		expect(lista).not.toContain("Fontes oficiais");
		expect(lista).not.toContain('id="fontes"');
	});
});
