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
import { acharTrilha, trilhas } from "@/lib/conteudo/paginas.server";
import { Route } from "@/routes/trilhas/$trilha/index";

const CHAVE = "mandatometro:artigos-lidos";
const TRILHA = "processo-legislativo";
const ARTIGOS = [
	`${TRILHA}/quem-pode-propor-uma-lei`,
	`${TRILHA}/onde-o-projeto-comeca`,
	`${TRILHA}/o-projeto-passa-pelas-comissoes`,
];

beforeEach(() => {
	// O jsdom não rola a janela.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	window.localStorage.clear();
	vi.restoreAllMocks();
});

const lidos = () => JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");

/**
 * A página da trilha num site de mentira, com a trilha de verdade e os artigos
 * já lidos. A rota entra na árvore como no routeTree.gen.ts, e os dados vêm do
 * paginas.server.ts, sem a função do servidor.
 */
function abrir(jaLidos: string[]) {
	window.localStorage.setItem(CHAVE, JSON.stringify(jaLidos));
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/trilhas/$trilha/",
		path: "/trilhas/$trilha/",
		getParentRoute: () => raiz,
		loader: () => acharTrilha(trilhas, TRILHA),
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		history: createMemoryHistory({ initialEntries: [`/trilhas/${TRILHA}`] }),
	});
	render(<RouterProvider router={router} />);
}

/** A linha do botão, embaixo da descrição: os controles que estão nela. */
function controlesDaLinha(botao: HTMLElement): Element[] {
	const linha = botao.closest(".recomeco");
	if (!linha) {
		throw new Error('o "Recomeçar a trilha" saiu da linha .recomeco');
	}
	return [...linha.querySelectorAll("a, button, input, summary")];
}

describe("página da trilha", () => {
	it("num clique duplo no Recomeçar a trilha, a trilha recomeça, e o Desfazer funciona com um clique depois", async () => {
		abrir(ARTIGOS.slice(0, 2));
		const botao = await screen.findByRole("button", {
			name: "Recomeçar a trilha",
		});
		expect(screen.getByText("Você leu 2 de 3.")).toBeTruthy();

		// O navegador marca com 2 o segundo clique de um clique duplo.
		fireEvent.click(botao, { detail: 1 });
		fireEvent.click(botao, { detail: 2 });

		expect(botao.textContent).toBe("Desfazer");
		expect(screen.getByRole("status").textContent).toBe(
			"Você recomeçou a trilha.",
		);
		expect(lidos()).toEqual([]);

		fireEvent.click(botao, { detail: 1 });

		expect(botao.textContent).toBe("Recomeçar a trilha");
		expect(screen.getByRole("status").textContent).toBe("Você leu 2 de 3.");
		expect(lidos()).toEqual(ARTIGOS.slice(0, 2));
	});

	// Com a trilha terminada, o botão de continuar não existe, e ele aparece
	// ("Começar pelo primeiro artigo") depois do recomeço. Ele não pode aparecer
	// onde o "Recomeçar a trilha" estava: o segundo clique de um clique duplo
	// cairia nele, e a pessoa sairia da página sem o "Desfazer".
	it("com a trilha terminada, o Desfazer fica no lugar do Recomeçar a trilha, sozinho na linha dele", async () => {
		abrir(ARTIGOS);
		const botao = await screen.findByRole("button", {
			name: "Recomeçar a trilha",
		});
		expect(screen.getByText("Você terminou a trilha.")).toBeTruthy();
		expect(controlesDaLinha(botao)).toEqual([botao]);
		const linha = botao.closest(".recomeco");

		fireEvent.click(botao, { detail: 1 });
		fireEvent.click(botao, { detail: 2 });

		// O mesmo botão, na mesma linha, e mais nenhum controle nela.
		expect(botao.isConnected).toBe(true);
		expect(botao.textContent).toBe("Desfazer");
		expect(botao.closest(".recomeco")).toBe(linha);
		expect(controlesDaLinha(botao)).toEqual([botao]);
		expect(lidos()).toEqual([]);

		// O botão de continuar apareceu, fora da linha do "Desfazer".
		const comecar = screen.getByRole("link", {
			name: "Começar pelo primeiro artigo",
		});
		expect(linha?.contains(comecar)).toBe(false);

		fireEvent.click(botao, { detail: 1 });

		expect(botao.textContent).toBe("Recomeçar a trilha");
		expect(lidos()).toEqual(ARTIGOS);
	});
});
