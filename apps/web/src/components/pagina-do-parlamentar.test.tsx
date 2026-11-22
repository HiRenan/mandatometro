// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DetalheParlamentar, VotoParlamentar } from "@/client";
import type { PaginaDoParlamentar } from "@/lib/parlamentares";
import {
	CONTAGEM_ZERADA,
	detalheDeExemplo,
	votoDoParlamentarDeExemplo,
	votosDeExemplo,
} from "@/lib/parlamentares/exemplos-de-teste";
import { Route } from "@/routes/parlamentares/$id";

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
 * A página de uma pessoa num site de mentira, já no endereço certo. A rota entra
 * na árvore como no routeTree.gen.ts, e os dados vêm prontos, sem a função do
 * servidor nem o redirecionamento.
 */
async function abrir(
	parlamentar: DetalheParlamentar,
	votos: VotoParlamentar[] = [votoDoParlamentarDeExemplo(139)],
	paginaAtual = 1,
	total = votos.length,
) {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/parlamentares/$id",
		path: "/parlamentares/$id",
		getParentRoute: () => raiz,
		loader: (): PaginaDoParlamentar => ({
			tipo: "parlamentar",
			parlamentar,
			votos,
			total,
			pagina: paginaAtual,
			paginas: Math.max(1, Math.ceil(total / 20)),
		}),
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		history: createMemoryHistory({
			initialEntries: [`/parlamentares/${parlamentar.id}`],
		}),
	});
	render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { level: 1, name: parlamentar.nome });
}

/** Cada voto de "Como votou": o nome, o número e a regra, como o leitor de tela lê. */
function comoVotou() {
	return Array.from(document.querySelectorAll(".tipo-de-voto"), (linha) =>
		Array.from(linha.children, (celula) => celula.textContent),
	);
}

describe("a página do parlamentar", () => {
	it("como votou: o número e a regra de cada voto, com o artigo do Regimento da Câmara", async () => {
		await abrir(detalheDeExemplo());

		expect(comoVotou()).toEqual([
			[
				"Sim",
				"12",
				"Votou a favor do que estava em votação. (Regimento Interno da Câmara, art. 187, § 1º)",
			],
			[
				"Não",
				"5",
				"Votou contra o que estava em votação. (Regimento Interno da Câmara, art. 187, § 1º)",
			],
			[
				"Abstenção",
				"1",
				"Estava na votação e não votou a favor nem contra. (Regimento Interno da Câmara, art. 180, § 2º)",
			],
			[
				"Obstrução",
				"0",
				"Deixou de votar numa estratégia do partido ou do bloco, comunicada à Mesa na Câmara e declarada pela liderança no Senado. (Regimento Interno da Câmara, art. 82, § 6º)",
			],
			[
				"Presidência",
				"0",
				"Presidia a sessão. Na votação aberta, quem preside só vota para desempatar; por isso, este registro aparece à parte e não conta como Sim nem como Não. (Regimento Interno da Câmara, art. 17, § 1º)",
			],
			[
				"Não votou",
				"2",
				"Não registrou voto. Pode ter faltado ou estado na sessão sem votar; o site não guarda o motivo.",
			],
		]);
		expect(
			screen
				.getByRole("link", {
					name: "Regimento Interno da Câmara dos Deputados",
				})
				.getAttribute("href"),
		).toBe(
			"https://www2.camara.leg.br/atividade-legislativa/legislacao/regimento-interno-da-camara-dos-deputados",
		);
	});

	it("no Senado, a regra cita o Regimento do Senado, e o Outro registro aparece quando passa de zero, sem artigo", async () => {
		await abrir(
			detalheDeExemplo({
				id: 501,
				nome: "Lia Quinemar",
				casa: "senado",
				contagem_votos: { ...CONTAGEM_ZERADA, sim: 3, outro: 1 },
			}),
		);
		const linhas = comoVotou();

		expect(linhas[0]).toEqual([
			"Sim",
			"3",
			"Votou a favor do que estava em votação. (Regimento Interno do Senado, art. 294)",
		]);
		expect(linhas.at(-1)).toEqual([
			"Outro registro",
			"1",
			"A fonte usou um código que o site ainda não classifica.",
		]);
		expect(
			screen.getByRole("link", { name: "Regimento Interno do Senado Federal" }),
		).toBeTruthy();
		expect(screen.getByText("Senado Federal")).toBeTruthy();
	});

	it("cada voto leva a quem votou como, com um nome de link só dele, e à página oficial só quando ela existe", async () => {
		await abrir(detalheDeExemplo(), [
			votoDoParlamentarDeExemplo(139),
			votoDoParlamentarDeExemplo(138, {
				valor: "nao",
				url_oficial: null,
				proposicoes: [],
				data: "2026-11-19",
			}),
		]);
		const [primeiro, segundo] = screen
			.getAllByRole("listitem", {
				name: undefined,
			})
			.filter((item) => item.classList.contains("voto-da-pessoa"));

		expect(
			within(primeiro)
				.getByRole("link", {
					name: "Ver quem votou na votação de 20 de novembro de 2026: PL 812/2026",
				})
				.getAttribute("href"),
		).toBe("/votacoes/139");
		expect(
			within(primeiro).getByRole("link", {
				name: "Página oficial da votação de 20 de novembro de 2026: PL 812/2026",
			}),
		).toBeTruthy();
		expect(within(primeiro).getByText("Sim")).toBeTruthy();
		// Sem proposição, o título é o dia, e o texto é a descrição oficial.
		expect(
			within(segundo).getByRole("heading", {
				level: 3,
				name: "Votação de 19 de novembro",
			}),
		).toBeTruthy();
		expect(
			within(segundo).getByText(
				"Votação nominal em turno único da matéria 138.",
			),
		).toBeTruthy();
		expect(
			within(segundo).queryByRole("link", { name: /Página oficial/ }),
		).toBeNull();
	});

	it.each([
		[1, "Votos mais antigos", "?pagina=2#votos"],
		[2, "Votos mais novos", "#votos"],
	])(
		"da página %i, o link leva ao título dos votos",
		async (pagina, nome, fim) => {
			await abrir(
				detalheDeExemplo(),
				votosDeExemplo(25, (pagina - 1) * 20).votos,
				pagina,
				25,
			);

			const titulo = screen.getByRole("heading", { level: 2, name: "Votos" });
			expect(titulo.id).toBe("votos");
			expect(titulo.getAttribute("tabindex")).toBe("-1");
			expect(
				screen.getByRole("link", { name: nome }).getAttribute("href"),
			).toBe(`/parlamentares/81-agata-cedrolume${fim}`);
		},
	);
});
