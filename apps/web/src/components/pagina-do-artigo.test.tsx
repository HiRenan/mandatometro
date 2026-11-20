// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	acharArtigo,
	acharTrilha,
	trilhas,
} from "@/lib/conteudo/paginas.server";
import { Route } from "@/routes/trilhas/$trilha/$artigo";

const { alterar } = vi.hoisted(() => ({ alterar: vi.fn() }));
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.example.com" } }));
vi.mock("@/client", () => ({
	alterarProgressoConta: alterar,
	consultarProgressoConta: async () => ({ data: { lidos: [] } }),
}));

const CHAVE = "mandatometro:artigos-lidos";
const SESSAO = "mandatometro:sessao-do-progresso";
const ESPELHO = "mandatometro:artigos-lidos-na-conta";
const ARTIGO = "processo-legislativo/onde-o-projeto-comeca";

beforeEach(() => {
	// O artigo já está lido. O jsdom não rola a janela.
	window.localStorage.setItem(CHAVE, JSON.stringify([ARTIGO]));
	alterar.mockReset().mockResolvedValue({ data: { lidos: [] } });
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	window.localStorage.clear();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
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
function abrir(artigo = "onde-o-projeto-comeca") {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/trilhas/$trilha/$artigo",
		path: "/trilhas/$trilha/$artigo",
		getParentRoute: () => raiz,
		loader: () => acharArtigo(trilhas, "processo-legislativo", artigo),
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		history: createMemoryHistory({
			initialEntries: [`/trilhas/processo-legislativo/${artigo}`],
		}),
	});
	render(<RouterProvider router={router} />);
}

describe("página do artigo", () => {
	it("reúne o tempo de leitura e as fontes em um parágrafo", async () => {
		abrir();
		const leitura = await screen.findByText(/^Leitura de \d+ min$/);
		const paragrafo = leitura.closest("p:not(.faixa)");
		expect(
			paragrafo?.contains(
				screen.getByText(/fontes? oficia(?:l|is), no fim do artigo$/),
			),
		).toBe(true);
	});

	it("reúne a posição e o total em um parágrafo no sobretítulo", async () => {
		abrir();
		const total = await screen.findByText("de 6 artigos");
		expect(total.closest("p:not(.sobretitulo)")?.textContent).toBe(
			"Artigo 2 de 6 artigos",
		);
	});

	// O quiz da trilha aparece depois do artigo 3, e o quiz final, depois do
	// último: cada um chama no fim do artigo dele, depois das fontes.
	it("no último artigo, chama para o quiz final, depois das fontes", async () => {
		const ultimo = acharTrilha(trilhas, "processo-legislativo")?.artigos.at(-1);
		abrir(ultimo?.slug);
		const chamada = await screen.findByRole("region", { name: "Quiz final" });
		const fontes = document.querySelector(".artigo-folha > .fontes");

		expect(screen.queryByRole("region", { name: "Quiz da trilha" })).toBeNull();
		expect(
			fontes &&
				fontes.compareDocumentPosition(chamada) &
					Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			screen
				.getByRole("link", { name: "Responder o quiz final" })
				.getAttribute("href"),
		).toBe("/trilhas/processo-legislativo/quiz-final");
	});

	it("no artigo depois do qual o quiz aparece, chama só para o quiz da trilha", async () => {
		abrir("o-projeto-passa-pelas-comissoes");
		await screen.findByRole("region", { name: "Quiz da trilha" });

		expect(screen.queryByRole("region", { name: "Quiz final" })).toBeNull();
	});

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

	it.each(["conta B", null])(
		"o Desfazer da conta A não grava após mudar para %s em outra aba",
		async (outraSessao) => {
			localStorage.removeItem(CHAVE);
			localStorage.setItem(SESSAO, "conta A");
			localStorage.setItem(ESPELHO, JSON.stringify([ARTIGO]));
			abrir();
			fireEvent.click(await screen.findByRole("button", { name: "Desmarcar" }));
			const desfazer = screen.getByRole("button", { name: "Desfazer" });
			await vi.dynamicImportSettled();
			await waitFor(() => expect(alterar).toHaveBeenCalledTimes(1));
			alterar.mockClear();

			localStorage.removeItem(ESPELHO);
			if (outraSessao) localStorage.setItem(SESSAO, outraSessao);
			else localStorage.removeItem(SESSAO);
			// O clique pode chegar antes do evento storage da outra aba.
			fireEvent.click(desfazer);
			act(() =>
				window.dispatchEvent(
					new StorageEvent("storage", {
						key: SESSAO,
						oldValue: "conta A",
						newValue: outraSessao,
					}),
				),
			);
			await vi.dynamicImportSettled();
			expect(localStorage.getItem(ESPELHO)).toBeNull();
			expect(localStorage.getItem(CHAVE)).toBeNull();
			expect(alterar).not.toHaveBeenCalled();
			expect(screen.queryByRole("button", { name: "Desfazer" })).toBeNull();
		},
	);

	it("o Desfazer de visitante some ao entrar em outra aba", async () => {
		abrir();
		fireEvent.click(await screen.findByRole("button", { name: "Desmarcar" }));
		const desfazer = screen.getByRole("button", { name: "Desfazer" });
		localStorage.setItem(SESSAO, "conta A");
		act(() =>
			window.dispatchEvent(
				new StorageEvent("storage", { key: SESSAO, newValue: "conta A" }),
			),
		);
		fireEvent.click(desfazer);
		await vi.dynamicImportSettled();
		expect(screen.queryByRole("button", { name: "Desfazer" })).toBeNull();
		expect(localStorage.getItem(CHAVE)).toBe("[]");
		expect(localStorage.getItem(ESPELHO)).toBeNull();
		expect(alterar).not.toHaveBeenCalled();
	});

	it.each([null, "conta A"])(
		"a leitura automática aberta em %s não marca na conta seguinte",
		async (sessao) => {
			localStorage.removeItem(CHAVE);
			if (sessao) localStorage.setItem(SESSAO, sessao);
			let observarFim!: IntersectionObserverCallback;
			const observador = { observe: vi.fn(), disconnect: vi.fn() };
			vi.stubGlobal(
				"IntersectionObserver",
				class {
					constructor(callback: IntersectionObserverCallback) {
						observarFim = callback;
					}
					observe = observador.observe;
					disconnect = observador.disconnect;
				},
			);
			abrir();
			await waitFor(() => expect(observador.observe).toHaveBeenCalledTimes(1));
			localStorage.setItem(SESSAO, "conta B");
			act(() =>
				observarFim(
					[{ isIntersecting: true } as IntersectionObserverEntry],
					observador as unknown as IntersectionObserver,
				),
			);
			await vi.dynamicImportSettled();
			expect(localStorage.getItem(ESPELHO)).toBeNull();
			expect(localStorage.getItem(CHAVE)).toBeNull();
			expect(alterar).not.toHaveBeenCalled();
		},
	);
});
