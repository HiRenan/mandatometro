// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
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
import type { DetalheVotacao, PlacarPorPartido } from "@/client";
import type { PaginaDaVotacao } from "@/lib/parlamentares";
import {
	CONTAGEM_ZERADA,
	votacaoDeExemplo,
} from "@/lib/parlamentares/exemplos-de-teste";
import { Route } from "@/routes/votacoes/$id";
import { QuadroDaVotacao } from "./item-da-edicao";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));

beforeEach(() => {
	// O jsdom não rola a janela.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

/**
 * A votação num site de mentira. A rota entra na árvore como no routeTree.gen.ts,
 * e os dados vêm do loader, sem a função do servidor: o teste conta quantas vezes
 * ele roda.
 */
async function abrir(votacao: DetalheVotacao = votacaoDeExemplo()) {
	const carregar = vi.fn((): PaginaDaVotacao => ({ tipo: "votacao", votacao }));
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/votacoes/$id",
		path: "/votacoes/$id",
		getParentRoute: () => raiz,
		loader: carregar,
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		history: createMemoryHistory({ initialEntries: ["/votacoes/139"] }),
	});
	render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { level: 1, name: "PL 812/2026" });
	return { router, carregar };
}

/** Os nomes da lista de quem votou como, na ordem da página. */
function nomes() {
	return Array.from(
		document.querySelectorAll(".nomes-do-grupo a"),
		(link) => link.textContent,
	);
}

describe("a página da votação", () => {
	it("o filtro troca a lista sem pedir a votação de novo, e o Limpar os filtros volta à lista inteira", async () => {
		const { router, carregar } = await abrir();
		const filtro = screen.getByRole("button", { name: "Filtrar" });
		vi.mocked(window.scrollTo).mockClear();

		fireEvent.change(screen.getByRole("combobox", { name: "Estado" }), {
			target: { value: "BA" },
		});
		// Pelo teclado, o Enter no botão: o foco está nele quando o filtro roda.
		filtro.focus();
		fireEvent.click(filtro);

		expect(await screen.findByText("Mostrando 2 de 5 nomes")).toBeTruthy();
		expect(router.state.location.search).toEqual({ uf: "BA" });
		expect(nomes()).toEqual(["Rui Tavaquil", "Sara Varombre"]);
		// O botão continua o mesmo, com o foco, e a página fica onde está.
		expect(document.activeElement).toBe(filtro);
		expect(window.scrollTo).not.toHaveBeenCalled();

		// O mesmo filtro de novo leva ao mesmo endereço: a votação também não volta
		// a ser pedida.
		fireEvent.click(filtro);
		await screen.findByText("Mostrando 2 de 5 nomes");
		await new Promise((pronto) => setTimeout(pronto, 50));

		const limpar = screen.getByRole("link", { name: "Limpar os filtros" });
		limpar.focus();
		fireEvent.click(limpar);

		expect(await screen.findByText("Mostrando 5 de 5 nomes")).toBeTruthy();
		expect(router.state.location.search).toEqual({});
		expect(screen.getByRole("combobox", { name: "Estado" })).toHaveProperty(
			"value",
			"",
		);
		// O link saiu da tela: o foco vai para o Filtrar, logo acima.
		expect(document.activeElement).toBe(filtro);
		expect(window.scrollTo).not.toHaveBeenCalled();
		expect(carregar).toHaveBeenCalledTimes(1);
	});

	it("o placar por partido é uma tabela com legenda e os cabeçalhos de cada linha e coluna", async () => {
		await abrir();
		const tabela = screen.getByRole("table", {
			name: "Quantos votos de cada tipo cada partido deu nesta votação",
		});

		expect(
			within(tabela)
				.getAllByRole("columnheader")
				.map((celula) => celula.textContent),
		).toEqual([
			"Partido",
			"Sim",
			"Não",
			"Abstenção",
			"Obstrução",
			"Presidência",
			"Não votou",
		]);
		expect(
			within(tabela)
				.getAllByRole("rowheader")
				.map((celula) => celula.textContent),
		).toEqual(["PFT", "PNX", "PRV", "Sem partido registrado"]);
	});

	it("a coluna do Outro registro só aparece quando algum partido tem um", async () => {
		const grupos: PlacarPorPartido[] = [
			{ partido: "PFT", placar: { ...CONTAGEM_ZERADA, sim: 1, outro: 1 } },
		];
		await abrir(votacaoDeExemplo({ placar_por_partido: grupos }));

		expect(
			screen.getByRole("columnheader", { name: "Outro registro" }),
		).toBeTruthy();
	});

	it("o plenário é desenho, fora do leitor de tela, com a legenda só dos votos que aparecem", async () => {
		await abrir();
		const painel = document.querySelector(".painel-da-votacao");

		expect(painel?.getAttribute("aria-hidden")).toBe("true");
		expect(
			Array.from(
				painel?.querySelectorAll(".legenda-do-plenario li") ?? [],
				(item) => item.textContent,
			),
		).toEqual(["Sim", "Não", "Presidência", "Não votou"]);
	});
});

describe("o quadro da votação, na edição e no painel", () => {
	/** O quadro num site de mentira, com o id da votação ou sem ele, como no painel. */
	async function mostrar(id?: number) {
		const raiz = createRootRoute({ component: () => <Outlet /> });
		const inicio = createRoute({
			getParentRoute: () => raiz,
			path: "/",
			component: () => (
				<QuadroDaVotacao
					votacao={{
						data: "2026-11-20",
						resultado: "aprovada",
						placar: { ...CONTAGEM_ZERADA, sim: 2, nao: 1 },
					}}
					Titulo="h3"
					id={id}
				/>
			),
		});
		const router = createRouter({
			routeTree: raiz.addChildren([inicio]),
			history: createMemoryHistory({ initialEntries: ["/"] }),
		});
		render(<RouterProvider router={router} />);
		await screen.findByRole("heading", {
			level: 3,
			name: "Votação de 20 de novembro de 2026",
		});
	}

	it("com o id, leva a quem votou, com o dia da votação no nome do link", async () => {
		await mostrar(139);

		expect(
			screen
				.getByRole("link", {
					name: "Ver quem votou na votação de 20 de novembro de 2026",
				})
				.getAttribute("href"),
		).toBe("/votacoes/139");
	});

	it("sem o id, como no painel de revisão, fica sem o link", async () => {
		await mostrar();

		expect(screen.queryByRole("link")).toBeNull();
	});
});
