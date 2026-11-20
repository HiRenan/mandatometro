// @vitest-environment jsdom

import {
	type AnyRoute,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { listarTrilhas, trilhas } from "@/lib/conteudo/paginas.server";
import { Route as RotaDasTrilhas } from "./index";

afterEach(cleanup);

/**
 * Mostra a lista das trilhas de verdade (conteudo/trilhas/) num site de
 * mentira, com o loader lendo direto do servidor, sem a função do servidor, e
 * as rotas da trilha e dos artigos para os links.
 */
async function mostrar() {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const naRaiz = (caminho: string) => ({
		getParentRoute: (): AnyRoute => raiz,
		path: caminho,
		component: () => null,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([
			RotaDasTrilhas.update({
				id: "/trilhas/",
				path: "/trilhas/",
				getParentRoute: () => raiz,
				loader: () => listarTrilhas(trilhas),
			} as never),
			createRoute(naRaiz("/trilhas/$trilha")),
			createRoute(naRaiz("/trilhas/$trilha/$artigo")),
		]),
		history: createMemoryHistory({ initialEntries: ["/trilhas/"] }),
	});
	render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { level: 1, name: "Trilhas" });
}

describe("lista das trilhas", () => {
	it("o azulejo de cada trilha desenha o assunto dela", async () => {
		await mostrar();
		const itens = [
			...document.querySelectorAll<HTMLElement>("li.trilha-da-lista"),
		];

		// O símbolo da trilha (lib/simbolos.ts), dividido nas quatro peças.
		expect(
			itens.map((item) => [
				item.querySelector("h2")?.textContent,
				item.querySelector<HTMLElement>(".grande")?.dataset.simbolo,
			]),
		).toEqual([
			["A Constituição", "livro"],
			["Os Três Poderes", "colunas"],
			["Direitos e Deveres", "balanca"],
			["Processo legislativo", "congresso"],
		]);
		for (const item of itens) {
			expect(item.querySelectorAll(".grande .az > svg")).toHaveLength(4);
		}
	});
});
