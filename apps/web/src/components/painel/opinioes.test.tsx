// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
	consultarOpinioesPainel,
	consultarPerfil,
	type OpinioesPainel,
} from "@/client";
import { Route as Autenticado } from "@/routes/_autenticado";
import { Route as Opinioes } from "@/routes/_autenticado/painel_.opinioes";

vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.example.com" } }));
vi.mock("@/client", () => ({
	consultarOpinioesPainel: vi.fn(),
	consultarPerfil: vi.fn(),
}));
const perfil = vi.mocked(consultarPerfil);
const consultar = vi.mocked(consultarOpinioesPainel);

const DADOS: OpinioesPainel = {
	total: 2,
	nota_media: 4.5,
	por_parte: { trilhas: 1, parlamentares: 0, jogos: 2, edicoes: 0 },
	opinioes: [
		{
			criada_em: "2026-11-26T15:00:00Z",
			nota: 5,
			partes: ["jogos"],
			texto: "A comissão ficou fácil de entender.",
		},
		{
			criada_em: "2026-11-25T16:00:00Z",
			nota: 4,
			partes: ["trilhas", "jogos"],
			texto: "Mais exemplos na trilha, por favor.",
		},
	],
};

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

function abrir() {
	const raiz = createRootRoute({
		notFoundComponent: () => <p>Página não encontrada</p>,
	});
	const autenticado = Autenticado.update({
		id: "/_autenticado",
		getParentRoute: () => raiz,
	} as never);
	const opinioes = Opinioes.update({
		id: "/painel_/opinioes",
		path: "/painel/opinioes",
		getParentRoute: () => autenticado,
	} as never);
	const login = createRoute({
		path: "/login",
		getParentRoute: () => raiz,
		component: () => <h1>Entrar</h1>,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([login, autenticado.addChildren([opinioes])]),
		history: createMemoryHistory({ initialEntries: ["/painel/opinioes"] }),
	});
	render(<RouterProvider router={router} />);
}

function resposta(status: number, data?: unknown) {
	return { data, response: new Response(null, { status }) } as never;
}

it("manda ao login antes de pedir opiniões quando falta a sessão", async () => {
	perfil.mockResolvedValue(resposta(401));
	abrir();
	expect(await screen.findByRole("heading", { name: "Entrar" })).toBeTruthy();
	expect(consultar).not.toHaveBeenCalled();
});

it("a conta comum vê a página não encontrada e o site não pede opiniões", async () => {
	perfil.mockResolvedValue(resposta(200, { papel: "comum" }));
	abrir();
	expect(await screen.findByText("Página não encontrada")).toBeTruthy();
	expect(consultar).not.toHaveBeenCalled();
});

it("a administradora vê os totais e a lista na ordem da API", async () => {
	perfil.mockResolvedValue(resposta(200, { papel: "administradora" }));
	consultar.mockResolvedValue(resposta(200, DADOS));
	abrir();
	const lista = await screen.findByRole("region", {
		name: "Opiniões recebidas",
	});
	expect(consultar).toHaveBeenCalledOnce();
	expect(consultar.mock.calls[0][0]).toMatchObject({
		credentials: "include",
		cache: "no-store",
	});
	expect(screen.getByText("4,5 de 5")).toBeTruthy();
	expect(
		screen.getByText("Total de opiniões").nextElementSibling?.textContent,
	).toBe("2");
	const partes = screen.getByRole("region", {
		name: "O que as pessoas usaram",
	});
	expect(
		within(partes).getByText("Jogos").nextElementSibling?.textContent,
	).toBe("2");
	const itens = within(lista).getAllByRole("listitem");
	expect(itens[0].textContent).toContain(DADOS.opinioes[0].texto);
	expect(itens[1].textContent).toContain(DADOS.opinioes[1].texto);
	expect(itens[0].querySelector("time")?.dateTime).toBe(
		DADOS.opinioes[0].criada_em,
	);
	expect(screen.getByText("Opiniões").getAttribute("aria-current")).toBe(
		"page",
	);
});

it("conferir a sessão de novo tira o painel quando o papel foi revogado", async () => {
	perfil
		.mockResolvedValueOnce(resposta(200, { papel: "administradora" }))
		.mockResolvedValue(resposta(200, { papel: "comum" }));
	consultar.mockResolvedValue(resposta(403));
	abrir();
	expect(await screen.findByText("Página não encontrada")).toBeTruthy();
	expect(perfil).toHaveBeenCalledTimes(2);
	expect(
		screen.queryByRole("region", { name: "Opiniões recebidas" }),
	).toBeNull();
});
