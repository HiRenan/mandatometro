// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { getRouter } from "./router";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site.
vi.mock("@/env", () => ({ ENV: {} }));

// O servidor monta um router a cada requisição, sem o navegador: o histórico só
// chega depois, pelo router.update do TanStack Start. Os outros testes do router
// rodam no jsdom, que tem o document, e não passam por aqui. Na #164, o router
// ouvia o histórico ao nascer, e toda página do servidor saía com HTTP 500.
describe("o router no servidor", () => {
	it("nasce sem o histórico do navegador, sem erro", () => {
		const router = getRouter();
		expect(router.isServer).toBe(true);
	});
});
