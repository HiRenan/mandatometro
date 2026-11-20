// @vitest-environment jsdom
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consultarPerfil } from "@/client";
import { Route as Perfil } from "./perfil";

// O /perfil leva à revisão da edição só a administradora: a conta comum não vê
// o link, e o cabeçalho do site não muda para ninguém.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.example.com" } }));
vi.mock("@/client", () => ({
	consultarPerfil: vi.fn(),
	sairConta: vi.fn(),
}));

const perfil = vi.mocked(consultarPerfil);

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
});

afterEach(() => {
	cleanup();
	localStorage.clear();
});

/** O /perfil num site de mentira, com o /painel ao lado. */
function abrir(papel: "comum" | "administradora") {
	perfil.mockResolvedValue({
		data: { nome: "Pessoa fictícia", papel },
		request: new Request("https://api.example.com/contas/me"),
		response: new Response(null, { status: 200 }),
	});
	const raiz = createRootRoute();
	const router = createRouter({
		routeTree: raiz.addChildren([
			createRoute({
				getParentRoute: () => raiz,
				path: "/perfil",
				component: Perfil.options.component,
			}),
			createRoute({
				getParentRoute: () => raiz,
				path: "/painel",
				component: () => <h1>Revisão da edição</h1>,
			}),
		]),
		history: createMemoryHistory({ initialEntries: ["/perfil"] }),
	});
	render(<RouterProvider router={router} />);
}

describe("o link da revisão no /perfil", () => {
	it("aparece para a administradora e leva ao /painel", async () => {
		abrir("administradora");
		const link = await screen.findByRole("link", {
			name: "Revisar a edição da semana",
		});
		expect(link.getAttribute("href")).toBe("/painel");
	});

	it("não aparece para a conta comum", async () => {
		abrir("comum");
		await screen.findByText("Pessoa fictícia");
		expect(
			screen.queryByRole("link", { name: "Revisar a edição da semana" }),
		).toBeNull();
	});
});
