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
import { EdicaoNaoEncontrada, NaoEncontrado } from "./nao-encontrado";

afterEach(cleanup);

/** A página de não encontrado num site de mentira, com as páginas dos links dela. */
async function mostrar(componente = NaoEncontrado) {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = createRoute({
		getParentRoute: () => raiz,
		path: "/nao-existe",
		component: componente,
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
	const edicoes = createRoute({
		getParentRoute: () => raiz,
		path: "/edicoes",
		component: () => null,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([pagina, inicio, trilhas, edicoes]),
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

	it("nas páginas das edições, leva à lista das edições e ao início", async () => {
		const titulo = await mostrar(EdicaoNaoEncontrada);

		expect(titulo.textContent).toBe("Página não encontrada");
		expect(
			screen.getByRole("link", { name: "Ver as edições" }).getAttribute("href"),
		).toBe("/edicoes");
		expect(screen.queryByRole("link", { name: "Ver as trilhas" })).toBeNull();
		expect(
			screen
				.getByRole("link", { name: "Ir para o início" })
				.getAttribute("href"),
		).toBe("/");
	});

	it("com a letra grande, o título tem teto, dentro do cartaz", async () => {
		const titulo = await mostrar();

		// O título cresce até "ENCONTRADA" encostar nas margens, e o cartaz dá as
		// margens de 20 px do celular (index.css).
		expect(titulo.classList.contains("letra-com-teto")).toBe(true);
		expect(titulo.closest("section.cartaz")).not.toBeNull();
	});

	it("deixa o 404 gigante e os azulejos fora do leitor de tela", async () => {
		const cartaz = (await mostrar()).closest("section.cartaz");
		const numero = cartaz?.querySelector(".numero-404");

		expect(numero?.textContent).toBe("404");
		expect(numero?.getAttribute("aria-hidden")).toBe("true");
		expect(cartaz?.querySelector(".mural")?.getAttribute("aria-hidden")).toBe(
			"true",
		);
	});
});
