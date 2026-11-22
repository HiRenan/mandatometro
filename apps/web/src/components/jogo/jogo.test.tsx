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
	vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
	vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	window.localStorage.clear();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

async function iniciarPartida() {
	return screen.findByRole("button", {
		name: "Começar pela primeira cena",
	});
}

/**
 * Joga pela tela: a cada passo, a primeira opção da decisão ou o botão que
 * avança. O primeiro clique numa fala revela o texto inteiro, e o seguinte
 * passa adiante.
 */
function jogarAte(seletor: string) {
	for (let volta = 0; volta < 400; volta += 1) {
		if (document.querySelector(seletor)) {
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
	expect(document.querySelector(seletor), seletor).toBeTruthy();
}

async function jogarAteOFim() {
	fireEvent.click(await iniciarPartida());
	jogarAte(".jogo-fim");
}

function medirCaixas(caixas: Record<string, [number, number]>) {
	vi.stubGlobal("innerHeight", 600);
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
		function (this: HTMLElement) {
			const [topo, fim] = Object.entries(caixas).find(([classe]) =>
				this.classList.contains(classe),
			)?.[1] ?? [0, 0];
			return new DOMRect(0, topo, 400, fim - topo);
		},
	);
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

	it("enquadra a primeira fala e mantém a posição e a ordem do foco na seguinte", async () => {
		medirCaixas({ "jogo-caixa": [450, 680] });
		mostrar();
		const comecar = await iniciarPartida();
		// O router aplica a posição inicial da navegação.
		expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ top: 0, left: 0 }),
		);
		vi.mocked(window.scrollTo).mockClear();

		fireEvent.click(comecar);
		const primeiraFala = document.querySelector("[data-foco]");
		expect(document.activeElement).toBe(primeiraFala);
		expect(window.scrollTo).toHaveBeenCalledExactlyOnceWith({
			top: 92,
			behavior: "smooth",
		});

		fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
		expect(document.activeElement).toBe(
			document.querySelector(".jogo-caixa [data-foco]"),
		);
		expect(document.activeElement).not.toBe(primeiraFala);
		expect(window.scrollTo).toHaveBeenCalledTimes(1);
	});

	it("reserva a altura das falas seguidas e lê quem está falando junto do texto", async () => {
		mostrar();
		fireEvent.click(await iniciarPartida());

		const falas = [
			...document.querySelectorAll(".jogo-linhas-da-fala > .invisible"),
		];
		expect(falas.map((fala) => fala.textContent)).toEqual(
			jogo.cenas[0].passos
				.slice(0, 6)
				.map((passo) => (passo.tipo === "fala" ? passo.texto : undefined)),
		);
		expect(falas.every((fala) => fala.ariaHidden === "true")).toBe(true);
		expect(document.activeElement?.querySelector(".sr-only")?.textContent).toBe(
			"Narração. Brasília. Primeira semana de mandato.",
		);
		expect(
			screen
				.getByRole("button", { name: "Continuar", exact: true })
				.querySelector(".invisible")?.ariaHidden,
		).toBe("true");

		const caixa = document.querySelector(".jogo-toque");
		expect(caixa).toBeTruthy();
		expect(fireEvent.mouseDown(caixa as HTMLElement)).toBe(false);
		fireEvent.click(caixa as HTMLElement);
		expect(document.activeElement?.querySelector(".sr-only")?.textContent).toBe(
			"Lia Moraes. Pronto, gabinete montado. Por onde a gente começa?",
		);
	});

	it("começa pelo conteúdo novo quando as explicações da decisão são altas", async () => {
		medirCaixas({
			"jogo-decisao": [300, 990],
			"jogo-opcoes": [420, 940],
		});
		mostrar();
		fireEvent.click(await iniciarPartida());
		jogarAte(".jogo-pergunta");
		expect(window.scrollTo).toHaveBeenLastCalledWith({
			top: 288,
			behavior: "smooth",
		});

		vi.stubGlobal("scrollY", 288);
		medirCaixas({
			"jogo-decisao": [300, 1090],
			"jogo-opcoes": [420, 1040],
		});
		fireEvent.click(
			screen.getByRole("button", { name: "O autor pede o desarquivamento" }),
		);
		expect(document.activeElement).toBe(
			document.querySelector(
				".jogo-feedback [data-foco], .jogo-feedback[data-foco]",
			),
		);
		// A pergunta já estava na tela, mas a resposta precisa do intervalo
		// inteiro desde as explicações até o botão.
		expect(window.scrollTo).toHaveBeenLastCalledWith({
			top: 696,
			behavior: "smooth",
		});
	});

	it("encaixa a revelação, alinha o começo do fim e traz o foco de volta ao recomeçar", async () => {
		vi.stubGlobal("matchMedia", () => ({ matches: true }));
		medirCaixas({
			"jogo-cartao": [680, 1060],
			"jogo-fim": [680, 1480],
			"jogo-abertura": [680, 910],
		});
		mostrar();
		fireEvent.click(await iniciarPartida());
		jogarAte(".jogo-cartao");
		expect(window.scrollTo).toHaveBeenLastCalledWith({
			top: 472,
			behavior: "auto",
		});
		expect(document.activeElement?.textContent).toBe(
			"O que aconteceu de verdade",
		);

		jogarAte(".jogo-fim");
		expect(window.scrollTo).toHaveBeenLastCalledWith({
			top: 668,
			behavior: "auto",
		});
		expect(document.activeElement?.textContent).toBe("O caminho que você fez");

		fireEvent.click(screen.getByRole("button", { name: "Jogar de novo" }));
		expect(document.activeElement).toBe(document.querySelector(".jogo-resumo"));
		expect(window.scrollTo).toHaveBeenLastCalledWith({
			top: 322,
			behavior: "auto",
		});
	});
});
