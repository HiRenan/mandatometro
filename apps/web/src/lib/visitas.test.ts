// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acompanharVisitas, avisarVisita, caminhoQueConta } from "./visitas";

// O cliente da API lê o endereço dela ao ser importado. Aqui, a API é um
// endereço de mentira, e o fetch, simulado. O API_URL muda por teste.
const ambiente = vi.hoisted(() => ({
	API_URL: "https://api.exemplo.test" as string | undefined,
}));
vi.mock("@/env", () => ({ ENV: ambiente }));

beforeEach(() => {
	ambiente.API_URL = "https://api.exemplo.test";
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

/** Simula a API: cada pedido recebe 204, e o pedido fica guardado. */
function api(
	responder: () => Promise<Response> = async () =>
		new Response(null, { status: 204 }),
) {
	const pedidos: Request[] = [];
	const fetch = vi.fn(async (pedido: Request) => {
		pedidos.push(pedido);
		return responder();
	});
	vi.stubGlobal("fetch", fetch);
	return { fetch, pedidos };
}

describe("o caminho que conta", () => {
	it("as páginas públicas contam pelo caminho", () => {
		expect(caminhoQueConta("/")).toBe("/");
		expect(caminhoQueConta("/trilhas/processo-legislativo/apresentacao")).toBe(
			"/trilhas/processo-legislativo/apresentacao",
		);
		expect(caminhoQueConta("/parlamentares/123-nome")).toBe(
			"/parlamentares/123-nome",
		);
		expect(caminhoQueConta("/votacoes/139")).toBe("/votacoes/139");
	});

	it("o painel e as telas da conta não contam", () => {
		for (const caminho of [
			"/painel",
			"/painel/",
			"/painel/numeros",
			"/perfil",
			"/login",
			"/cadastro",
			"/cadastro/confirmar",
			"/cadastro/excluir",
			"/newsletter/sair",
		]) {
			expect(caminhoQueConta(caminho), caminho).toBeNull();
		}
	});

	it("uma página que só começa com o mesmo nome conta", () => {
		expect(caminhoQueConta("/paineis")).toBe("/paineis");
		expect(caminhoQueConta("/perfilado")).toBe("/perfilado");
	});
});

describe("o aviso da visita", () => {
	it("manda o caminho à API, sem o cookie", async () => {
		const { pedidos } = api();

		await avisarVisita("/trilhas");

		expect(pedidos).toHaveLength(1);
		const [pedido] = pedidos;
		expect(pedido.method).toBe("POST");
		expect(pedido.url).toBe("https://api.exemplo.test/visitas");
		expect(pedido.credentials).toBe("omit");
		expect(pedido.keepalive).toBe(true);
		expect(await pedido.json()).toEqual({ caminho: "/trilhas" });
	});

	it("o painel e as telas da conta não avisam", async () => {
		const { fetch } = api();

		await avisarVisita("/painel/numeros");
		await avisarVisita("/perfil");

		expect(fetch).not.toHaveBeenCalled();
	});

	it("sem o API_URL, nada é pedido", async () => {
		ambiente.API_URL = "";
		const { fetch } = api();

		await avisarVisita("/trilhas");

		expect(fetch).not.toHaveBeenCalled();
	});

	it("com a rede caída, o aviso some sem erro e sem console", async () => {
		const erro = vi.spyOn(console, "error").mockImplementation(() => {});
		const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
		api(() => Promise.reject(new TypeError("Failed to fetch")));

		await expect(avisarVisita("/trilhas")).resolves.toBeUndefined();

		expect(erro).not.toHaveBeenCalled();
		expect(aviso).not.toHaveBeenCalled();
	});

	it("com a API fora do ar, o aviso some sem erro", async () => {
		const erro = vi.spyOn(console, "error").mockImplementation(() => {});
		api(async () => new Response(null, { status: 503 }));

		await expect(avisarVisita("/trilhas")).resolves.toBeUndefined();

		expect(erro).not.toHaveBeenCalled();
	});
});

describe("as visitas na troca de página", () => {
	/** Um site pequeno, com o router de verdade, num histórico de memória. */
	async function site(comeco: string) {
		const raiz = createRootRoute();
		const rotas = ["/", "/trilhas", "/votacoes/$id", "/painel"].map((path) =>
			createRoute({ getParentRoute: () => raiz, path }),
		);
		const router = createRouter({
			routeTree: raiz.addChildren(rotas),
			history: createMemoryHistory({ initialEntries: [comeco] }),
		});
		await router.load();
		return router;
	}

	it("conta a primeira página uma vez e cada página nova uma vez", async () => {
		const router = await site("/");
		const avisar = vi.fn();

		const parar = acompanharVisitas(router, avisar);
		await router.navigate({ to: "/trilhas" });
		await router.navigate({ to: "/votacoes/$id", params: { id: "139" } });

		expect(avisar.mock.calls).toEqual([["/"], ["/trilhas"], ["/votacoes/139"]]);
		parar();
	});

	it("a troca só da busca ou do trecho não conta de novo", async () => {
		const router = await site("/votacoes/139");
		const avisar = vi.fn();

		const parar = acompanharVisitas(router, avisar);
		await router.navigate({ to: ".", search: { uf: "SC" } });
		await router.navigate({ to: ".", hash: "votos" });

		expect(avisar.mock.calls).toEqual([["/votacoes/139"]]);
		parar();
	});

	it("ligar de novo no mesmo router não conta a primeira página outra vez", async () => {
		// No dev, o React em modo estrito monta o efeito, desmonta e monta de novo.
		const router = await site("/");
		const avisar = vi.fn();

		acompanharVisitas(router, avisar)();
		const parar = acompanharVisitas(router, avisar);
		await router.navigate({ to: "/trilhas" });

		expect(avisar.mock.calls).toEqual([["/"], ["/trilhas"]]);
		parar();
	});

	it("depois de parar, nada mais conta", async () => {
		const router = await site("/");
		const avisar = vi.fn();

		const parar = acompanharVisitas(router, avisar);
		parar();
		await router.navigate({ to: "/trilhas" });

		expect(avisar.mock.calls).toEqual([["/"]]);
	});
});
