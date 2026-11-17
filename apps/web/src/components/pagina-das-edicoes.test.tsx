// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	notFound,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tetoDoTitulo } from "@/lib/conteudo/regua";
import type { PaginaDaLista } from "@/lib/edicoes";
import { resumosDeExemplo } from "@/lib/edicoes/exemplos-de-teste";
import { classeDaFita, posicaoDaSemana } from "@/lib/formatar";
import { Route } from "@/routes/edicoes/index";

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

/** A lista com `total` edições semanais, 20 por página, como o lerEdicoes devolve. */
function lista(total: number): (pagina: number) => PaginaDaLista {
	return (pagina) => {
		const deslocamento = (pagina - 1) * 20;
		return {
			tipo: "lista",
			edicoes: resumosDeExemplo(
				Math.max(0, Math.min(20, total - deslocamento)),
				{ pular: deslocamento, total },
			),
			total,
			pagina,
			paginas: Math.max(1, Math.ceil(total / 20)),
		};
	};
}

/**
 * A lista num site de mentira. A rota entra na árvore como no routeTree.gen.ts,
 * e os dados vêm prontos, sem a função do servidor, pela página do endereço.
 */
async function abrir(
	dados: (pagina: number) => PaginaDaLista,
	endereco = "/edicoes",
	titulo = "Edições",
) {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/edicoes/",
		path: "/edicoes/",
		getParentRoute: () => raiz,
		loader: ({ deps }: { deps: { pagina: number } }) => dados(deps.pagina),
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		history: createMemoryHistory({ initialEntries: [endereco] }),
	});
	render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { level: 1, name: titulo });
}

const edicoesNaLista = () =>
	within(
		screen.getByRole("region", { name: "Edições publicadas" }),
	).getAllByRole("listitem");

/** Os links da paginação: o texto e o endereço de cada um. */
function paginacao() {
	const nav = screen.getByRole("navigation", { name: "Páginas das edições" });
	return {
		texto: nav.textContent,
		links: within(nav)
			.getAllByRole("link")
			.map((link) => [link.textContent, link.getAttribute("href")]),
	};
}

describe("a lista das edições", () => {
	it("mostra cada edição, da mais nova para a mais antiga, com o link, a semana e a data", async () => {
		await abrir(lista(3));
		const [primeira, segunda] = edicoesNaLista();
		/** A semana que o dia grande diz ao leitor de tela, antes do título. */
		const semana = (folha: HTMLElement) =>
			folha.querySelector(".dia-da-edicao .sr-only")?.textContent;

		expect(edicoesNaLista()).toHaveLength(3);
		const link = within(primeira).getByRole("link", {
			name: "Jornal legislativo — semana 3",
		});
		expect(link.getAttribute("href")).toBe("/edicoes/3");
		expect(semana(primeira)).toBe("Semana de 9 a 15 de novembro de 2026");
		expect(primeira.textContent?.indexOf("Semana de")).toBeLessThan(
			primeira.textContent?.indexOf("Jornal legislativo") ?? -1,
		);
		expect(primeira.textContent).toContain(
			"Publicada em 16 de novembro de 2026",
		);
		// O período não se repete na folha numa frase pronta.
		expect(primeira.textContent).not.toContain("O que o Congresso votou");
		expect(within(segunda).getByRole("link").getAttribute("href")).toBe(
			"/edicoes/2",
		);
		expect(semana(segunda)).toBe("Semana de 2 a 8 de novembro de 2026");
	});

	it("o dia e o mês, como na folhinha, ficam fora do leitor de tela, e a cor é a da semana", async () => {
		await abrir(lista(3));
		const [primeira, segunda] = edicoesNaLista();
		const dia = primeira.querySelector(".dia-da-edicao > [aria-hidden]");

		expect(dia?.getAttribute("aria-hidden")).toBe("true");
		expect(dia?.textContent).toBe("15nov");
		expect(
			primeira.classList.contains(classeDaFita(posicaoDaSemana("2026-11-15"))),
		).toBe(true);
		expect(
			segunda.classList.contains(classeDaFita(posicaoDaSemana("2026-11-08"))),
		).toBe(true);
		expect(classeDaFita(posicaoDaSemana("2026-11-15"))).not.toBe(
			classeDaFita(posicaoDaSemana("2026-11-08")),
		);
	});

	it("o título de cada edição tem o teto da palavra mais larga dele", async () => {
		await abrir(lista(1));
		const titulo = within(edicoesNaLista()[0]).getByRole("heading", {
			level: 2,
		});

		expect(titulo.style.getPropertyValue("--palavra")).toBe(
			String(
				tetoDoTitulo("Jornal legislativo — semana 1", "titulo-condensado"),
			),
		);
		expect(titulo.classList.contains("letra-com-teto")).toBe(true);
		// O CSS mede o teto pela largura do texto da folha (o 100cqi), e não pela
		// da tela, que conta a barra de rolagem do Windows: estilos/edicoes.test.ts.
		expect(titulo.classList.contains("teto-pela-caixa")).toBe(true);
		expect(titulo.parentElement?.closest(".caixa-do-teto")).toBe(
			edicoesNaLista()[0].querySelector(".linha-texto"),
		);
	});

	it("a faixa do cartaz conta as edições", async () => {
		await abrir(lista(3));

		expect(document.querySelector(".cartaz .faixa")?.textContent).toContain(
			"3 edições",
		);
	});

	it("com uma página só, não há paginação", async () => {
		await abrir(lista(20));

		expect(
			screen.queryByRole("navigation", { name: "Páginas das edições" }),
		).toBeNull();
	});

	it("a primeira página de três leva só às mais antigas", async () => {
		await abrir(lista(45));

		expect(paginacao().texto).toContain("Página 1 de 3");
		expect(paginacao().links).toEqual([
			["Edições mais antigas", "/edicoes?pagina=2"],
		]);
	});

	it("a página do meio leva às mais novas e às mais antigas", async () => {
		await abrir(lista(45), "/edicoes?pagina=2");

		expect(paginacao().texto).toContain("Página 2 de 3");
		expect(paginacao().links).toEqual([
			["Edições mais novas", "/edicoes"],
			["Edições mais antigas", "/edicoes?pagina=3"],
		]);
		expect(edicoesNaLista()).toHaveLength(20);
	});

	it("a última página leva só às mais novas", async () => {
		await abrir(lista(45), "/edicoes?pagina=3");

		expect(paginacao().links).toEqual([
			["Edições mais novas", "/edicoes?pagina=2"],
		]);
		expect(edicoesNaLista()).toHaveLength(5);
	});

	it("a página inválida no endereço abre a primeira", async () => {
		await abrir(lista(45), "/edicoes?pagina=abc");

		expect(paginacao().texto).toContain("Página 1 de 3");
	});
});

describe("a lista sem edição", () => {
	it("diz que a primeira edição ainda não saiu e leva à inscrição", async () => {
		await abrir(lista(0));

		expect(
			screen.getByRole("heading", {
				level: 2,
				name: "A primeira edição ainda não saiu",
			}),
		).toBeTruthy();
		expect(document.body.textContent).toContain(
			"Ela sai num domingo, com o que o Congresso votou na semana. Inscreva-se e ela chega no seu e-mail assim que for publicada.",
		);
		expect(
			screen
				.getByRole("link", { name: "Receber por e-mail" })
				.getAttribute("href"),
		).toBe("/#newsletter");
		expect(
			screen.queryByRole("region", { name: "Edições publicadas" }),
		).toBeNull();
		expect(document.body.textContent).not.toContain("0 edições");
	});
});

describe("a página depois da última", () => {
	it("dá a página não encontrada, que leva de volta às edições", async () => {
		await abrir(
			() => {
				throw notFound();
			},
			"/edicoes?pagina=9",
			"Página não encontrada",
		);

		expect(
			screen.getByRole("link", { name: "Ver as edições" }).getAttribute("href"),
		).toBe("/edicoes");
	});
});

describe("o site sem a API", () => {
	it("diz que as edições ainda não aparecem neste endereço e leva às trilhas", async () => {
		await abrir(() => ({ tipo: "sem-api" }));

		expect(document.body.textContent).toContain(
			"As edições ainda não aparecem neste endereço do site.",
		);
		expect(document.body.textContent).toContain(
			"Enquanto isso, as trilhas explicam passo a passo como o Congresso funciona.",
		);
		expect(
			screen.getByRole("link", { name: "Ver as trilhas" }).getAttribute("href"),
		).toBe("/trilhas");
		expect(
			screen
				.getByRole("link", { name: "Ir para o início" })
				.getAttribute("href"),
		).toBe("/");
		expect(
			screen.queryByRole("link", { name: "Receber por e-mail" }),
		).toBeNull();
	});
});

describe("o cabeçalho da página", () => {
	const head = (lista: PaginaDaLista | undefined, status = "success") =>
		Route.options.head?.({
			loaderData: lista,
			match: { status },
		} as never) as { meta: Record<string, string>[] };

	it("a lista tem o título e a descrição para a prévia do link", () => {
		const meta = head(lista(45)(1)).meta;

		expect(meta).toContainEqual({ title: "Edições · Mandatômetro" });
		expect(meta).toContainEqual({
			name: "description",
			content:
				"O que o Congresso votou em cada semana, em linguagem simples, com a fonte oficial de cada item.",
		});
	});

	it("a partir da segunda página, o título diz a página", () => {
		expect(head(lista(45)(2)).meta).toContainEqual({
			title: "Edições (página 2) · Mandatômetro",
		});
	});

	it("sem a API, a página continua com o título das edições", () => {
		expect(head({ tipo: "sem-api" }).meta).toContainEqual({
			title: "Edições · Mandatômetro",
		});
	});
});
