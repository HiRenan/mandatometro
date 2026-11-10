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
import type { Infografico as DadosDoInfografico } from "@/lib/conteudo";
import { Infografico } from "./infografico";

afterEach(cleanup);

const trilha = {
	slug: "processo-legislativo",
	artigos: [
		{ slug: "quem-pode-propor-uma-lei", titulo: "Quem pode propor uma lei" },
		{ slug: "onde-o-projeto-comeca", titulo: "Onde o projeto começa" },
	],
};

const infografico: DadosDoInfografico = {
	titulo: "O caminho de um projeto de lei",
	resumo: "Os passos de um projeto, do começo ao fim.",
	passos: [
		{
			titulo: "Apresentação",
			texto: "Quem pode propor apresenta o projeto.",
			desvios: [],
			artigos: ["quem-pode-propor-uma-lei"],
			fontes: [
				{
					titulo: "Constituição Federal, art. 61",
					url: "https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art61",
					consultadoEm: "2026-11-10",
				},
			],
		},
		{
			titulo: "A outra Casa",
			texto: "A outra Casa revê o projeto.",
			desvios: [
				"Se a outra Casa muda o texto, o projeto volta para a Casa onde começou.",
				"Se a outra Casa rejeita o projeto, ele é arquivado.",
			],
			artigos: ["onde-o-projeto-comeca"],
			fontes: [
				{
					titulo: "Constituição Federal, art. 65",
					url: "https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art65",
					consultadoEm: "2026-11-01",
				},
				{
					titulo: "Câmara dos Deputados, Entenda o processo legislativo",
					url: "https://www.camara.leg.br/entenda-o-processo-legislativo/",
					consultadoEm: "2026-11-10",
				},
			],
		},
	],
};

/** Mostra o infográfico num site de mentira, com a rota dos artigos para os links. */
async function mostrar() {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = createRoute({
		getParentRoute: () => raiz,
		path: "/",
		component: () => <Infografico infografico={infografico} trilha={trilha} />,
	});
	const artigo = createRoute({
		getParentRoute: () => raiz,
		path: "/trilhas/$trilha/$artigo",
		component: () => null,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([pagina, artigo]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	render(<RouterProvider router={router} />);
	return screen.findByRole("region", {
		name: "O caminho de um projeto de lei",
	});
}

function passo(secao: HTMLElement, titulo: string): HTMLElement {
	const item = within(secao)
		.getByRole("heading", { level: 3, name: titulo })
		.closest("li");
	if (!item) {
		throw new Error(`o passo "${titulo}" não está numa lista`);
	}
	return item;
}

describe("infográfico", () => {
	it("mostra o caminho na ordem, com um título por passo numa lista ordenada", async () => {
		const secao = await mostrar();

		expect(
			within(secao)
				.getAllByRole("heading", { level: 3 })
				.map((titulo) => titulo.textContent),
		).toEqual(["Apresentação", "A outra Casa"]);
		expect(secao.querySelectorAll(":scope ol > li")).toHaveLength(2);
		expect(
			within(secao).getByText("Os passos de um projeto, do começo ao fim."),
		).toBeTruthy();
	});

	it("escreve os desvios em palavras, dentro do passo deles", async () => {
		const secao = await mostrar();
		const outraCasa = passo(secao, "A outra Casa");

		expect(
			within(outraCasa).getByText(
				"Se a outra Casa muda o texto, o projeto volta para a Casa onde começou.",
			),
		).toBeTruthy();
		expect(
			within(outraCasa).getByText(
				"Se a outra Casa rejeita o projeto, ele é arquivado.",
			),
		).toBeTruthy();
		expect(
			within(secao).getByText(/A linha cheia é o caminho de sempre/),
		).toBeTruthy();
	});

	it("dá as fontes de cada passo, com o link, o site e a data da consulta", async () => {
		const secao = await mostrar();
		const outraCasa = passo(secao, "A outra Casa");
		const fontes = within(outraCasa).getByRole("list", {
			name: "Fontes do passo A outra Casa",
		});

		expect(
			within(fontes)
				.getByRole("link", { name: "Constituição Federal, art. 65" })
				.getAttribute("href"),
		).toBe(
			"https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art65",
		);
		expect(fontes.textContent).toContain(
			"normas.leg.br, consultada em 1º de novembro de 2026",
		);
		expect(fontes.textContent).toContain(
			"camara.leg.br, consultada em 10 de novembro de 2026",
		);
		expect(
			within(passo(secao, "Apresentação")).getByRole("link", {
				name: "Constituição Federal, art. 61",
			}),
		).toBeTruthy();
	});

	it("leva ao artigo da trilha que explica o passo, com o número da folha", async () => {
		const secao = await mostrar();

		expect(
			within(passo(secao, "Apresentação"))
				.getByRole("link", { name: "Artigo 1: Quem pode propor uma lei" })
				.getAttribute("href"),
		).toBe("/trilhas/processo-legislativo/quem-pode-propor-uma-lei");
		expect(
			within(passo(secao, "A outra Casa"))
				.getByRole("link", { name: "Artigo 2: Onde o projeto começa" })
				.getAttribute("href"),
		).toBe("/trilhas/processo-legislativo/onde-o-projeto-comeca");
	});

	it("deixa as cores e os desenhos fora do leitor de tela", async () => {
		const secao = await mostrar();
		const comCor = [...secao.querySelectorAll<HTMLElement>("[style]")];

		expect(comCor.length).toBeGreaterThan(0);
		for (const elemento of comCor) {
			expect(elemento.getAttribute("aria-hidden")).toBe("true");
		}
	});
});
