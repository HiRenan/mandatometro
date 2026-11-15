// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	type RootRouteOptions,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Route as RotaRaiz } from "../routes/__root";
import { CliqueNaTroca } from "./clique-na-troca";

afterEach(() => {
	cleanup();
	document.body.innerHTML = "";
	Reflect.deleteProperty(document, "activeViewTransition");
	Reflect.deleteProperty(document, "elementFromPoint");
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

/**
 * Uma página com um botão embaixo do ponteiro e uma troca rodando. O jsdom não
 * tem o activeViewTransition nem o elementFromPoint.
 */
function paginaTrocando() {
	const botao = document.createElement("button");
	botao.textContent = "Começar";
	document.body.append(botao);
	const cliques: MouseEvent[] = [];
	botao.addEventListener("click", (evento) => cliques.push(evento));
	const troca = { skipTransition: vi.fn() };
	Object.defineProperty(document, "activeViewTransition", {
		configurable: true,
		get: () => troca,
	});
	Object.defineProperty(document, "elementFromPoint", {
		configurable: true,
		value: () => botao,
	});
	return { cliques, troca };
}

/** Durante a troca, o navegador entrega o toque e o clique ao documento. */
function tocarEClicar() {
	document.documentElement.dispatchEvent(
		new Event("pointerdown", { bubbles: true }),
	);
	document.documentElement.dispatchEvent(
		new MouseEvent("click", {
			bubbles: true,
			detail: 1,
			clientX: 120,
			clientY: 300,
		}),
	);
}

/**
 * O documento de verdade da rota raiz (routes/__root.tsx), o <html> inteiro, num
 * site de mentira com uma página só. O React põe o <html> e o <body> no documento
 * da caixa em que ele é montado: a caixa fica num documento à parte, para o
 * documento do teste continuar com o botão e a troca.
 */
async function montarODocumentoDaRaiz() {
	// O options tem o tipo de uma rota qualquer, sem o documento da raiz.
	const Documento = (RotaRaiz.options as RootRouteOptions).shellComponent;
	if (!Documento) {
		throw new Error("a rota raiz ficou sem o documento (shellComponent)");
	}
	const raiz = createRootRoute({ shellComponent: Documento });
	const inicio = createRoute({
		getParentRoute: () => raiz,
		path: "/",
		component: () => <h1>Início</h1>,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([inicio]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	const outro = document.implementation.createHTMLDocument();
	const caixa = outro.body.appendChild(outro.createElement("div"));
	// O React avisa que o <html> não fica dentro de um <div>. O jsdom não tem o
	// matchMedia, que o aviso do sonner (o Toaster) pede, nem rola a janela.
	vi.spyOn(console, "error").mockImplementation(() => {});
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal("matchMedia", (consulta: string) => ({
		matches: false,
		media: consulta,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
	}));
	render(<RouterProvider router={router} />, { container: caixa });
	await waitFor(() =>
		expect(outro.querySelector("main#conteudo h1")?.textContent).toBe("Início"),
	);
}

describe("CliqueNaTroca", () => {
	it("montado, encerra a troca no toque e leva o clique à página nova", () => {
		const { cliques, troca } = paginaTrocando();
		render(<CliqueNaTroca />);

		tocarEClicar();

		expect(troca.skipTransition).toHaveBeenCalledTimes(1);
		expect(cliques).toHaveLength(1);
	});

	it("desmontado, deixa de ouvir o documento", () => {
		const { cliques, troca } = paginaTrocando();
		const { unmount } = render(<CliqueNaTroca />);
		unmount();

		tocarEClicar();

		expect(troca.skipTransition).not.toHaveBeenCalled();
		expect(cliques).toHaveLength(0);
	});

	// A rota raiz desenha o documento de todas as páginas: é lá que o clique
	// durante a troca fica ligado, fora de qualquer página.
	it("está no documento de todas as páginas, na rota raiz", async () => {
		const { cliques, troca } = paginaTrocando();
		await montarODocumentoDaRaiz();

		tocarEClicar();

		expect(troca.skipTransition).toHaveBeenCalledTimes(1);
		expect(cliques).toHaveLength(1);
	});
});
