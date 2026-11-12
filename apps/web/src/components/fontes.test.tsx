// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Fontes } from "./fontes";

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
});
