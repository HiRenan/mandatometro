// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listaDeExemplo } from "@/lib/parlamentares/exemplos-de-teste";
import { lerParlamentares } from "@/lib/parlamentares/parlamentares.server";
import { Route } from "@/routes/parlamentares/index";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));

beforeEach(() => {
	// O jsdom não rola a janela.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal(
		"fetch",
		vi.fn(
			async () =>
				new Response(JSON.stringify(listaDeExemplo()), {
					headers: { "Content-Type": "application/json" },
				}),
		),
	);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

/**
 * A lista num site de mentira. A rota entra na árvore como no routeTree.gen.ts,
 * e o loader lê a API de exemplo direto, sem a função do servidor.
 */
async function abrir(endereco: string) {
	const carregar = vi.fn(({ deps }: { deps: { uf?: string } }) =>
		lerParlamentares(deps.uf),
	);
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/parlamentares/",
		path: "/parlamentares/",
		getParentRoute: () => raiz,
		loader: carregar,
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		history: createMemoryHistory({ initialEntries: [endereco] }),
	});
	render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { level: 1 });
	return { router, carregar };
}

describe("a lista dos parlamentares", () => {
	it("no mapa, cada estado é um link com o nome e o número de deputados, no singular quando é um", async () => {
		await abrir("/parlamentares");
		const mapa = screen.getByRole("navigation", { name: "Estados" });

		// O mapa e a lista, que fica no lugar dele na tela estreita.
		expect(within(mapa).getAllByRole("link")).toHaveLength(54);
		expect(
			within(mapa)
				.getAllByRole("link", { name: "SC Santa Catarina, 3 deputados" })
				.map((link) => link.getAttribute("href")),
		).toEqual(["/parlamentares?uf=SC", "/parlamentares?uf=SC"]);
		expect(
			within(mapa).getAllByRole("link", { name: "BA Bahia, 1 deputado" }),
		).toHaveLength(2);
		expect(
			within(mapa).getAllByRole("link", { name: "AC Acre, 0 deputados" }),
		).toHaveLength(2);
		expect(mapa.querySelector("[aria-current]")).toBeNull();
	});

	it("com um estado, o mapa marca o estado aberto, e os nomes vêm separados pela Casa", async () => {
		await abrir("/parlamentares?uf=SC");

		expect(
			screen.getByRole("heading", { level: 1, name: "Santa Catarina" }),
		).toBeTruthy();
		for (const link of screen.getAllByRole("link", {
			name: "SC Santa Catarina, 3 deputados",
		})) {
			expect(link.getAttribute("aria-current")).toBe("page");
		}
		const camara = screen.getByRole("region", { name: "Câmara dos Deputados" });
		const senado = screen.getByRole("region", { name: "Senado Federal" });
		// Quem não tem partido nos dados fica com o traço, que o leitor de tela
		// pula, e ouve o porquê.
		const nomes = [
			"Ágata Cedrolume PFT",
			"Íris Dell'Ombre PNX",
			"João-Pedro Varustel sem partido registrado",
		];
		expect(within(camara).getAllByRole("link")).toHaveLength(3);
		for (const nome of nomes) {
			expect(within(camara).getByRole("link", { name: nome })).toBeTruthy();
		}
		expect(within(senado).getAllByRole("link")).toHaveLength(2);
	});

	it("o campo Estado leva à lista do estado escolhido", async () => {
		const { router, carregar } = await abrir("/parlamentares");

		fireEvent.change(screen.getByRole("combobox", { name: "Estado" }), {
			target: { value: "BA" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Ver os parlamentares" }),
		);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Bahia" }),
		).toBeTruthy();
		expect(router.state.location.search).toEqual({ uf: "BA" });
		expect(carregar.mock.lastCall?.[0].deps).toEqual({ uf: "BA" });
	});
});
