// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	acharJogo,
	JOGO_DAS_COMISSOES,
	type JogoNaPagina,
	jogos,
} from "@/lib/jogo/paginas.server";
import { Jogo } from "./jogo";

// A tela do jogo com o roteiro de verdade. O que este teste prende é a regra do
// produto: a tela final mostra o caminho em palavras e **nunca** um total de
// acertos (DESIGN.md e docs/jogo-das-comissoes.md).

function lerOJogo(): JogoNaPagina {
	const lido = acharJogo(jogos, JOGO_DAS_COMISSOES);
	if (!lido) {
		throw new Error("o roteiro do Jogo das Comissões não foi lido");
	}
	return lido;
}

const jogo = lerOJogo();

beforeEach(() => {
	// O jsdom não rola a janela.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	window.localStorage.clear();
	vi.restoreAllMocks();
});

/**
 * Joga pela tela até a tela final, como quem clica: a cada passo, a primeira
 * opção da decisão ou o botão que avança. O primeiro clique numa fala revela o
 * texto inteiro, e o seguinte passa adiante.
 */
async function jogarAteOFim() {
	const comecar = await screen.findByRole("button", {
		name: "Começar pela primeira cena",
	});
	fireEvent.click(comecar);
	for (let volta = 0; volta < 400; volta += 1) {
		if (document.querySelector(".jogo-fim")) {
			return;
		}
		const opcao = document.querySelector<HTMLButtonElement>(
			".jogo-opcao:not([disabled])",
		);
		const seguir =
			document.querySelector<HTMLButtonElement>(".jogo-acoes button");
		const alvo = opcao ?? seguir;
		if (!alvo) {
			break;
		}
		fireEvent.click(alvo);
	}
	await screen.findByText("O caminho que você fez");
}

/** O jogo num site de mentira, para os `Link` da tela final funcionarem. */
function mostrar({ comApi = true } = {}) {
	const raiz = createRootRoute({
		component: () => <Jogo jogo={jogo} comApi={comApi} />,
	});
	const router = createRouter({
		routeTree: raiz,
		history: createMemoryHistory({ initialEntries: ["/jogos"] }),
	});
	render(<RouterProvider router={router} />);
}

describe("a tela do jogo", () => {
	it("abre na abertura, com o aviso dos personagens e o botão de começar", async () => {
		mostrar();

		expect(await screen.findByText(/personagens fictícios/)).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Começar pela primeira cena" }),
		).toBeTruthy();
		// A cena e o retrato são desenho: ficam fora do leitor de tela.
		expect(document.querySelector(".jogo-cena")?.ariaHidden).toBe("true");
	});

	it("não tem placar, nota nem total em lugar nenhum da tela final", async () => {
		mostrar();
		await jogarAteOFim();

		const fim = document.querySelector(".jogo-fim");
		expect(fim, "a tela final precisa aparecer").toBeTruthy();
		const texto = fim?.textContent ?? "";
		expect(texto).toContain("O caminho que você fez");
		expect(texto).not.toMatch(/acertou/i);
		expect(texto).not.toMatch(/\bde 6 decisões\b/);
		expect(texto).not.toMatch(/\bpontos?\b/i);
		expect(
			within(fim as HTMLElement).getAllByRole("listitem").length,
		).toBeGreaterThanOrEqual(6);
	});

	it("só oferece a newsletter onde o site tem a API", async () => {
		mostrar({ comApi: false });
		await jogarAteOFim();

		expect(screen.queryByRole("link", { name: /jornal legislativo/i })).toBe(
			null,
		);
		expect(
			screen.getByRole("link", { name: "Rever as lições da trilha" }),
		).toBeTruthy();
	});
});
