// @vitest-environment node

import { createMemoryHistory } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getRouter } from "./router";

afterEach(() => {
	vi.restoreAllMocks();
});

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site. O endereço do site vai na prévia do link, no head de toda
// página.
vi.mock("@/env", () => ({
	ENV: { APP_BASE_URL: "https://mandatometro.com.br" },
}));

// O servidor monta um router a cada requisição, sem o navegador: o histórico só
// chega depois, pelo router.update do TanStack Start. Os outros testes do router
// rodam no jsdom, que tem o document, e não passam por aqui. Na #164, o router
// ouvia o histórico ao nascer, e toda página do servidor saía com HTTP 500.
describe("o router no servidor", () => {
	it("nasce sem o histórico do navegador, sem erro", () => {
		const router = getRouter();
		expect(router.isServer).toBe(true);
	});

	// Depois, o servidor carrega a página pedida, e o router avisa o onBeforeLoad,
	// sem página de antes. A página de sair da newsletter não tem loader. O erro
	// do head de uma página o router só registra no console.
	it("carrega uma página com o histórico do servidor, sem erro", async () => {
		const erros = vi.spyOn(console, "error");
		const router = getRouter();
		router.update({
			history: createMemoryHistory({ initialEntries: ["/newsletter/sair"] }),
		});

		await router.load();

		expect(erros).not.toHaveBeenCalled();
		expect(router.state.location.pathname).toBe("/newsletter/sair");
		expect(
			router.state.matches.map(({ routeId, status }) => [routeId, status]),
		).toEqual([
			["__root__", "success"],
			["/newsletter/sair", "success"],
		]);
	});
});
