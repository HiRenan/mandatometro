// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	Outlet,
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
import { acharQuizFinal, trilhas } from "@/lib/conteudo/paginas.server";
import {
	comecarPiloto,
	concluirEtapa,
	proximoPedido,
	registrarResposta,
} from "@/lib/piloto";
import { Route } from "@/routes/trilhas/$trilha/quiz-final";

// A rota lê do ENV, do varlock, se o site tem a API, e o ENV só existe no site.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));

const RESPOSTAS = "mandatometro:respostas-do-quiz";
const TRILHA = "processo-legislativo";

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
 * A página do quiz final num site de mentira, com o quiz final de verdade. A
 * rota entra na árvore como no routeTree.gen.ts, e os dados vêm do
 * paginas.server.ts, sem a função do servidor.
 */
async function abrir() {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/trilhas/$trilha/quiz-final",
		path: "/trilhas/$trilha/quiz-final",
		getParentRoute: () => raiz,
		loader: () => acharQuizFinal(trilhas, TRILHA),
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		history: createMemoryHistory({
			initialEntries: [`/trilhas/${TRILHA}/quiz-final`],
		}),
	});
	render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { level: 1, name: "Quiz final" });
}

describe("página do quiz final", () => {
	it("no piloto, com o antes feito, diz que é a segunda etapa", async () => {
		comecarPiloto();
		concluirEtapa("antes", 2);
		const antes = proximoPedido();
		if (!antes) {
			throw new Error("o antes devia esperar o envio");
		}
		registrarResposta(antes, "recebida");

		await abrir();

		expect(
			screen.getByText(/^Piloto, segunda etapa: /, {
				ignore: "[aria-hidden=true], [role=status]",
			}),
		).toBeTruthy();
	});

	it("abre com doze azulejos e, embaixo, o último artigo e a volta para a trilha", async () => {
		await abrir();
		const rodape = screen.getByRole("navigation", {
			name: "Artigos da trilha",
		});

		expect(document.querySelectorAll(".quiz-cena .grande")).toHaveLength(12);
		expect(screen.getByText("12 perguntas")).toBeTruthy();
		expect(
			within(rodape)
				.getAllByRole("link")
				.map((link) => link.getAttribute("href")),
		).toEqual([
			`/trilhas/${TRILHA}/o-presidente-sanciona-ou-veta`,
			`/trilhas/${TRILHA}`,
		]);
	});

	it("guarda as respostas à parte das do quiz da trilha", async () => {
		await abrir();

		fireEvent.click(screen.getByRole("button", { name: "Começar" }), {
			detail: 1,
		});
		fireEvent.click(screen.getAllByRole("radio")[0]);
		fireEvent.click(screen.getByRole("button", { name: "Responder" }));

		const guardado = JSON.parse(window.localStorage.getItem(RESPOSTAS) ?? "{}");
		expect(Object.keys(guardado)).toEqual([`${TRILHA}/quiz-final`]);
	});

	it("dá à aba o título do quiz final e, à prévia do link, quantas perguntas e de quais artigos", () => {
		const cabeca = Route.options.head?.({
			loaderData: acharQuizFinal(trilhas, TRILHA),
			match: { status: "success" },
		} as never) as { meta: Array<Record<string, string>> };

		expect(cabeca.meta).toContainEqual({
			title: "Quiz final · Processo legislativo · Mandatômetro",
		});
		expect(cabeca.meta).toContainEqual({
			name: "description",
			content:
				"12 perguntas sobre os artigos 1 a 6, com a resposta certa, a explicação e a fonte oficial de cada uma.",
		});
	});
});
