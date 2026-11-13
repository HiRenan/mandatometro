// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acharArtigo, trilhas } from "@/lib/conteudo/paginas.server";
import { Route } from "@/routes/trilhas/$trilha/$artigo";

const CHAVE = "mandatometro:artigos-lidos";
const ARTIGO = "processo-legislativo/onde-o-projeto-comeca";

beforeEach(() => {
	// O artigo já está lido. O jsdom não rola a janela.
	window.localStorage.setItem(CHAVE, JSON.stringify([ARTIGO]));
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	window.localStorage.clear();
	vi.restoreAllMocks();
});

const lidos = () => JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");

/** O texto na tela, fora do aviso para o leitor de tela, que repete a frase. */
function naTela(texto: string): HTMLElement {
	return screen.getByText(texto, {
		ignore: "[role=status], [aria-hidden=true], script, style",
	});
}

/**
 * A página do artigo num site de mentira, com o artigo de verdade. A rota entra
 * na árvore como no routeTree.gen.ts, e os dados vêm do paginas.server.ts, sem a
 * função do servidor.
 */
function abrir() {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/trilhas/$trilha/$artigo",
		path: "/trilhas/$trilha/$artigo",
		getParentRoute: () => raiz,
		loader: () =>
			acharArtigo(trilhas, "processo-legislativo", "onde-o-projeto-comeca"),
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		history: createMemoryHistory({ initialEntries: [`/trilhas/${ARTIGO}`] }),
	});
	render(<RouterProvider router={router} />);
}

describe("página do artigo", () => {
	it("num clique duplo no Desmarcar, fica desmarcado, e o Desfazer funciona com um clique depois", async () => {
		abrir();
		const botao = await screen.findByRole("button", { name: "Desmarcar" });

		// O navegador marca com 2 o segundo clique de um clique duplo.
		fireEvent.click(botao, { detail: 1 });
		fireEvent.click(botao, { detail: 2 });

		expect(botao.textContent).toBe("Desfazer");
		expect(naTela("Você desmarcou o artigo.")).toBeTruthy();
		expect(screen.getByRole("status").textContent).toBe(
			"Você desmarcou o artigo.",
		);
		expect(lidos()).toEqual([]);

		fireEvent.click(botao, { detail: 1 });

		expect(botao.textContent).toBe("Desmarcar");
		expect(naTela("Você leu este artigo.")).toBeTruthy();
		expect(screen.getByRole("status").textContent).toBe(
			"Você leu este artigo.",
		);
		expect(lidos()).toEqual([ARTIGO]);
	});
});
