// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaginaDeErro } from "./pagina-de-erro";

beforeEach(() => {
	// O router avisa do erro no console, e o jsdom não rola a janela.
	vi.spyOn(console, "warn").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

/** Um site de mentira com a página de erro do router.tsx e uma página que pede dados. */
function abrir(carregar: () => Promise<string>) {
	const raiz = createRootRoute({
		component: () => (
			<main id="conteudo">
				<Outlet />
			</main>
		),
	});
	const pagina = createRoute({
		getParentRoute: () => raiz,
		path: "/artigo",
		loader: carregar,
		component: function Pagina() {
			return <h1>{pagina.useLoaderData()}</h1>;
		},
	});
	const trilhas = createRoute({
		getParentRoute: () => raiz,
		path: "/trilhas",
		component: () => <h1>Trilhas</h1>,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([pagina, trilhas]),
		history: createMemoryHistory({ initialEntries: ["/artigo"] }),
		defaultErrorComponent: PaginaDeErro,
	});
	render(<RouterProvider router={router} />);
}

const semRede = () => Promise.reject(new TypeError("Failed to fetch"));

describe("página de erro", () => {
	it("diz em português o que aconteceu, sem a mensagem técnica", async () => {
		abrir(semRede);

		expect(
			await screen.findByRole("heading", { name: "A página não carregou" }),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeTruthy();
		expect(
			screen.getByRole("link", { name: "Ver as trilhas" }).getAttribute("href"),
		).toBe("/trilhas");
		expect(document.body.textContent).not.toContain("Failed to fetch");
		expect(document.body.textContent).not.toContain("Something went wrong");
	});

	it("com a letra grande, o título tem teto, dentro do cartaz", async () => {
		abrir(semRede);

		const titulo = await screen.findByRole("heading", {
			name: "A página não carregou",
		});
		// O título cresce até "CARREGOU" encostar nas margens, e o cartaz dá as
		// margens de 20 px do celular (index.css).
		expect(titulo.classList.contains("letra-com-teto")).toBe(true);
		expect(
			titulo.closest("[data-pagina-de-erro]")?.classList.contains("cartaz"),
		).toBe(true);
	});

	it("o Tentar de novo refaz o pedido sem recarregar e leva o foco ao título", async () => {
		const carregar = vi
			.fn<() => Promise<string>>()
			.mockImplementationOnce(semRede)
			.mockResolvedValue("Quem pode propor uma lei");
		abrir(carregar);

		fireEvent.click(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		);

		const titulo = await screen.findByRole("heading", {
			name: "Quem pode propor uma lei",
		});
		expect(carregar).toHaveBeenCalledTimes(2);
		expect(document.activeElement).toBe(titulo);
	});

	it("se falha de novo, avisa e devolve o foco ao botão", async () => {
		const carregar = vi.fn(semRede);
		abrir(carregar);

		fireEvent.click(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		);

		expect(await screen.findByText(/^Ainda não deu\./)).toBeTruthy();
		expect(carregar).toHaveBeenCalledTimes(2);
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "Tentar de novo" }),
		);
	});
});
