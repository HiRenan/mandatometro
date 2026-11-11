// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NaoEncontrado } from "./nao-encontrado";

afterEach(cleanup);

/** A página de não encontrado num site de mentira, com as páginas dos links dela. */
async function mostrar() {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = createRoute({
		getParentRoute: () => raiz,
		path: "/nao-existe",
		component: NaoEncontrado,
	});
	const inicio = createRoute({
		getParentRoute: () => raiz,
		path: "/",
		component: () => null,
	});
	const trilhas = createRoute({
		getParentRoute: () => raiz,
		path: "/trilhas",
		component: () => null,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([pagina, inicio, trilhas]),
		history: createMemoryHistory({ initialEntries: ["/nao-existe"] }),
	});
	render(<RouterProvider router={router} />);
	return screen.findByRole("heading", { level: 1 });
}

describe("não encontrado", () => {
	it("diz que a página não foi encontrada e leva às trilhas e ao início", async () => {
		const titulo = await mostrar();

		expect(titulo.textContent).toBe("Página não encontrada");
		expect(
			screen.getByRole("link", { name: "Ver as trilhas" }).getAttribute("href"),
		).toBe("/trilhas");
		expect(
			screen
				.getByRole("link", { name: "Ir para o início" })
				.getAttribute("href"),
		).toBe("/");
	});

	it("com a letra grande, o título tem teto e a página, uma coluna com as margens de 20 px", async () => {
		const titulo = await mostrar();
		const pagina = titulo.closest("div.mx-auto");

		// O título cresce até "encontrada" encostar nas margens (index.css).
		expect(titulo.classList.contains("letra-com-teto")).toBe(true);
		// Abaixo do xl, a coluna não cresce até a peça mais larga.
		expect(pagina?.classList.contains("grid-cols-[minmax(0,1fr)]")).toBe(true);
		expect(pagina?.classList.contains("px-margem-celular")).toBe(true);
	});
});
