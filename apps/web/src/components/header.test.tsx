// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Header from "./header";
import { NOME_DO_SITE } from "./nome-do-site";
import { Rodape } from "./rodape";

afterEach(cleanup);

/** O cabeçalho num site de mentira, com as páginas dos links dele. */
async function mostrar({
	comEdicoes = false,
	endereco = "/",
}: {
	comEdicoes?: boolean;
	endereco?: string;
} = {}) {
	const raiz = createRootRoute({
		component: () => (
			<>
				<Header comEdicoes={comEdicoes} />
				<Outlet />
			</>
		),
	});
	const inicio = createRoute({
		getParentRoute: () => raiz,
		path: "/",
		component: () => null,
	});
	const trilhas = createRoute({
		getParentRoute: () => raiz,
		path: "/trilhas",
		component: () => null,
	});
	const edicoes = createRoute({
		getParentRoute: () => raiz,
		path: "/edicoes",
		component: () => null,
	});
	const edicao = createRoute({
		getParentRoute: () => raiz,
		path: "/edicoes/$id",
		component: () => null,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([inicio, trilhas, edicoes, edicao]),
		history: createMemoryHistory({ initialEntries: [endereco] }),
	});
	render(<RouterProvider router={router} />);
	return screen.findByRole("banner");
}

function temAsClasses(elemento: Element, classes: string) {
	for (const classe of classes.split(" ")) {
		expect(elemento.classList.contains(classe), classe).toBe(true);
	}
}

describe("cabeçalho", () => {
	it("tem o pulo para o conteúdo, o nome, o lema e os três links", async () => {
		const cabecalho = await mostrar();
		const principal = within(cabecalho).getByRole("navigation", {
			name: "Principal",
		});

		expect(
			within(cabecalho)
				.getByRole("link", { name: "Pular para o conteúdo" })
				.getAttribute("href"),
		).toBe("#conteudo");
		expect(
			within(cabecalho)
				.getByRole("link", { name: "Mandatômetro" })
				.getAttribute("href"),
		).toBe("/");
		expect(cabecalho.textContent).toContain(
			"o diário oficial político, simplificado",
		);
		expect(
			within(principal)
				.getAllByRole("link")
				.map((link) => [link.textContent, link.getAttribute("href")]),
		).toEqual([
			["Início", "/"],
			["Trilhas", "/trilhas"],
			["Jogos", "/jogos"],
			["Conta", "/perfil"],
		]);
	});

	it("onde o site tem a API, as edições entram nos links, e a lista diz isso ao CSS", async () => {
		const cabecalho = await mostrar({ comEdicoes: true });
		const principal = within(cabecalho).getByRole("navigation", {
			name: "Principal",
		});

		expect(
			within(principal)
				.getAllByRole("link")
				.map((link) => [link.textContent, link.getAttribute("href")]),
		).toEqual([
			["Início", "/"],
			["Trilhas", "/trilhas"],
			["Jogos", "/jogos"],
			["Edições", "/edicoes"],
			["Conta", "/perfil"],
		]);
		expect(
			principal.querySelector("ul")?.hasAttribute("data-com-edicoes"),
		).toBe(true);
	});

	it("sem a API, ficam os três links, sem a marca das edições", async () => {
		const cabecalho = await mostrar();
		const lista = cabecalho.querySelector(".topo-links");

		expect(lista?.hasAttribute("data-com-edicoes")).toBe(false);
		expect(within(cabecalho).queryByRole("link", { name: "Edições" })).toBe(
			null,
		);
	});

	it("numa edição, o traço fica nas edições, e o link não é a página atual", async () => {
		const cabecalho = await mostrar({
			comEdicoes: true,
			endereco: "/edicoes/7",
		});
		const edicoes = within(cabecalho).getByRole("link", { name: "Edições" });

		expect(edicoes.hasAttribute("data-na-secao")).toBe(true);
		expect(edicoes.hasAttribute("aria-current")).toBe(false);
		expect(
			within(cabecalho)
				.getByRole("link", { name: "Início" })
				.hasAttribute("data-na-secao"),
		).toBe(false);
	});

	it("o nome tem a mesma letra no rodapé, com o teto da letra grande", async () => {
		const cabecalho = await mostrar();
		render(<Rodape />);

		expect(NOME_DO_SITE).toContain("letra-com-teto");
		temAsClasses(
			within(cabecalho).getByRole("link", { name: "Mandatômetro" }),
			NOME_DO_SITE,
		);
		temAsClasses(
			within(screen.getByRole("contentinfo")).getByText("Mandatômetro"),
			NOME_DO_SITE,
		);
	});

	it("com a letra grande, as margens e o respiro não crescem", async () => {
		// O Renan, na #48: "Ficam em 20 px" e "Espaço de hoje".
		const cabecalho = await mostrar();
		const faixa = cabecalho.querySelector(":scope > div.topo-dentro");

		temAsClasses(faixa as Element, "px-margem-celular py-[8px] gap-y-[4px]");
	});

	it("é o bloco de tinta, com o foco amarelo e a tira das cinco fitas fora do leitor de tela", async () => {
		const cabecalho = await mostrar();

		// A classe moldura dá o fundo de tinta e o foco amarelo (index.css), e é por
		// ela que o cabeçalho fica parado na troca de página.
		expect(cabecalho.classList.contains("moldura")).toBe(true);
		expect(
			cabecalho.querySelector(".tira-de-fitas")?.getAttribute("aria-hidden"),
		).toBe("true");
	});

	it("marca a seção aberta, e só a página do link é a página atual", async () => {
		const cabecalho = await mostrar();
		const [inicio, trilhas] = within(cabecalho)
			.getByRole("navigation", { name: "Principal" })
			.querySelectorAll("a");

		expect(inicio.hasAttribute("data-na-secao")).toBe(true);
		expect(inicio.getAttribute("aria-current")).toBe("page");
		expect(trilhas.hasAttribute("data-na-secao")).toBe(false);
		expect(trilhas.hasAttribute("aria-current")).toBe(false);
	});

	it("tem a entrada da busca entre o nome e os links, com o atalho para o leitor de tela", async () => {
		const cabecalho = await mostrar();
		const nome = within(cabecalho).getByRole("link", { name: "Mandatômetro" });
		const entrada = within(cabecalho).getByRole("button", {
			name: "Buscar no site",
		});
		const principal = within(cabecalho).getByRole("navigation", {
			name: "Principal",
		});

		expect(
			nome.compareDocumentPosition(entrada) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			entrada.compareDocumentPosition(principal) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(entrada.getAttribute("aria-haspopup")).toBe("dialog");
		expect(entrada.getAttribute("aria-keyshortcuts")).toBe("Control+K Meta+K");
		expect(entrada.querySelector("kbd")?.getAttribute("aria-hidden")).toBe(
			"true",
		);
	});
});
