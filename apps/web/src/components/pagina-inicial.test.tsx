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
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ArtigoNaLista, PaginaInicial as Dados } from "@/lib/conteudo";
import { PaginaInicial } from "./pagina-inicial";

const LIDOS = "mandatometro:artigos-lidos";
const PARA_QUEM =
	"É para quem vota e quer entender o que acontece depois do voto. Cada explicação traz a fonte oficial, e você não precisa criar conta.";

/** Se `depois` vem depois de `antes` no HTML. */
function vemDepois(antes: Node, depois: Node) {
	return Boolean(
		antes.compareDocumentPosition(depois) & Node.DOCUMENT_POSITION_FOLLOWING,
	);
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

function artigo(slug: string, titulo: string, ordem: number): ArtigoNaLista {
	return {
		trilha: "processo-legislativo",
		slug,
		titulo,
		resumo: `O resumo de ${titulo}.`,
		ordem,
		fontes: [
			{
				titulo: "Câmara dos Deputados, Entenda o processo legislativo",
				url: "https://www.camara.leg.br/entenda-o-processo-legislativo/",
				consultadoEm: "2026-11-10",
			},
		],
		minutos: 2,
	};
}

const pagina: Dados = {
	trilha: {
		slug: "processo-legislativo",
		titulo: "Processo legislativo",
		descricao: "Como uma ideia vira lei no Brasil.",
		ordem: 1,
		artigos: [
			artigo("quem-pode-propor-uma-lei", "Quem pode propor uma lei", 1),
			artigo("onde-o-projeto-comeca", "Onde o projeto começa", 2),
			artigo(
				"o-projeto-passa-pelas-comissoes",
				"O projeto passa pelas comissões",
				3,
			),
		],
	},
	caminho: {
		titulo: "O caminho de um projeto de lei",
		resumo: "Os passos de um projeto de lei ordinária no Congresso.",
		passos: [
			{
				titulo: "Apresentação",
				artigos: ["quem-pode-propor-uma-lei", "onde-o-projeto-comeca"],
			},
			{ titulo: "Comissões", artigos: ["o-projeto-passa-pelas-comissoes"] },
			{ titulo: "Plenário", artigos: [] },
			{ titulo: "A outra Casa", artigos: ["onde-o-projeto-comeca"] },
			{ titulo: "Sanção ou veto", artigos: [] },
		],
	},
};

/** Mostra a página num site de mentira, com as rotas da trilha e dos artigos para os links. */
async function mostrar(dados: Dados = pagina) {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const inicio = createRoute({
		getParentRoute: () => raiz,
		path: "/",
		component: () => <PaginaInicial pagina={dados} />,
	});
	const trilha = createRoute({
		getParentRoute: () => raiz,
		path: "/trilhas/$trilha",
		component: () => null,
	});
	const artigoDaTrilha = createRoute({
		getParentRoute: () => raiz,
		path: "/trilhas/$trilha/$artigo",
		component: () => null,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([inicio, trilha, artigoDaTrilha]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	const { container } = render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { level: 1 });
	return container;
}

function lerAntes(...slugs: string[]) {
	localStorage.setItem(
		LIDOS,
		JSON.stringify(slugs.map((slug) => `processo-legislativo/${slug}`)),
	);
}

function parada(caminho: HTMLElement, titulo: string): HTMLElement {
	const item = within(caminho)
		.getByRole("heading", { level: 3, name: titulo })
		.closest("li");
	if (!item) {
		throw new Error(`a parada "${titulo}" não está numa lista`);
	}
	return item;
}

describe("página inicial", () => {
	it("tem um título só, que diz o que a pessoa vai fazer", async () => {
		await mostrar();

		expect(
			screen.getAllByRole("heading", { level: 1 }).map((h1) => h1.textContent),
		).toEqual(["Entenda a política brasileira, um passo de cada vez."]);
	});

	it("diz o que é o Mandatômetro e para quem ele é", async () => {
		await mostrar();

		expect(
			screen.getByText(
				"O Mandatômetro explica como funciona a política no Brasil, em artigos curtos e em linguagem simples. A trilha do processo legislativo mostra como uma ideia vira lei.",
			),
		).toBeTruthy();
		expect(screen.getAllByText(PARA_QUEM).length).toBeGreaterThan(0);
	});

	it("no celular, o botão vem antes do “para quem”; a partir do md, depois dele", async () => {
		await mostrar();
		const linha = screen.getByText("3 artigos · 6 min de leitura");
		const botao = screen.getByRole("link", { name: "Começar a trilha" });
		const copias = screen.getAllByText(PARA_QUEM);

		// O mesmo parágrafo em dois lugares, e o CSS mostra um de cada vez: a
		// ordem do HTML, que o leitor de tela e o Tab seguem, é a da tela.
		expect(copias).toHaveLength(2);
		const [noComputador, noCelular] = copias;
		expect(vemDepois(noComputador, linha)).toBe(true);
		expect(noComputador.classList.contains("hidden")).toBe(true);
		expect(noComputador.classList.contains("md:block")).toBe(true);
		expect(vemDepois(botao, noCelular)).toBe(true);
		expect(noCelular.classList.contains("md:hidden")).toBe(true);
	});

	it("começa a trilha pelo primeiro artigo, sem progresso", async () => {
		const tela = await mostrar();

		expect(
			screen
				.getByRole("link", { name: "Começar a trilha" })
				.getAttribute("href"),
		).toBe("/trilhas/processo-legislativo/quem-pode-propor-uma-lei");
		expect(tela.textContent).not.toContain("Você leu");
	});

	it("sem progresso, diz o tamanho da trilha logo acima do botão", async () => {
		await mostrar();

		const linha = screen.getByText("3 artigos · 6 min de leitura");
		// O trim tira o espaço antes da seta (o SETA_DO_BOTAO).
		expect(linha.nextElementSibling?.textContent?.trim()).toBe(
			"Começar a trilha",
		);
	});

	it("continua do primeiro artigo não lido, com o progresso em palavras", async () => {
		lerAntes("quem-pode-propor-uma-lei");
		await mostrar();

		expect(screen.getByText("Você leu 1 de 3.")).toBeTruthy();
		expect(screen.queryByText("3 artigos · 6 min de leitura")).toBeNull();
		expect(
			screen
				.getByRole("link", { name: "Continuar a trilha" })
				.getAttribute("href"),
		).toBe("/trilhas/processo-legislativo/onde-o-projeto-comeca");
	});

	it("com a trilha terminada, leva à página da trilha", async () => {
		lerAntes(
			"quem-pode-propor-uma-lei",
			"onde-o-projeto-comeca",
			"o-projeto-passa-pelas-comissoes",
		);
		await mostrar();

		expect(screen.getByText("Você terminou a trilha.")).toBeTruthy();
		expect(
			screen.getByRole("link", { name: "Ver a trilha" }).getAttribute("href"),
		).toBe("/trilhas/processo-legislativo");
	});

	it("mostra o caminho de um projeto de lei em cinco paradas, numa lista ordenada", async () => {
		await mostrar();
		const caminho = screen.getByRole("region", {
			name: "O caminho de um projeto de lei",
		});

		expect(
			within(caminho)
				.getAllByRole("heading", { level: 3 })
				.map((titulo) => titulo.textContent),
		).toEqual([
			"Apresentação",
			"Comissões",
			"Plenário",
			"A outra Casa",
			"Sanção ou veto",
		]);
		expect(
			caminho.querySelectorAll(':scope ol[role="list"] > li'),
		).toHaveLength(5);
		expect(
			within(caminho).getByText(
				"Os passos de um projeto de lei ordinária no Congresso.",
			),
		).toBeTruthy();
	});

	it("leva de cada parada aos artigos que a explicam, com o número da folha", async () => {
		await mostrar();
		const caminho = screen.getByRole("region", {
			name: "O caminho de um projeto de lei",
		});
		const links = (titulo: string) =>
			within(parada(caminho, titulo))
				.queryAllByRole("link")
				.map((link) => [link.textContent, link.getAttribute("href")]);

		expect(links("Apresentação")).toEqual([
			[
				"Artigo 1: Quem pode propor uma lei",
				"/trilhas/processo-legislativo/quem-pode-propor-uma-lei",
			],
			[
				"Artigo 2: Onde o projeto começa",
				"/trilhas/processo-legislativo/onde-o-projeto-comeca",
			],
		]);
		expect(links("Comissões")).toEqual([
			[
				"Artigo 3: O projeto passa pelas comissões",
				"/trilhas/processo-legislativo/o-projeto-passa-pelas-comissoes",
			],
		]);
		expect(links("Plenário")).toEqual([
			[
				"Ler este passo na trilha: Plenário",
				"/trilhas/processo-legislativo#passo-plenario",
			],
		]);
		expect(links("A outra Casa")).toEqual([
			[
				"Artigo 2: Onde o projeto começa",
				"/trilhas/processo-legislativo/onde-o-projeto-comeca",
			],
		]);
		expect(links("Sanção ou veto")).toEqual([
			[
				"Ler este passo na trilha: Sanção ou veto",
				"/trilhas/processo-legislativo#passo-sancao-ou-veto",
			],
		]);
		for (const lista of caminho.querySelectorAll("li ul")) {
			expect(lista.getAttribute("role")).toBe("list");
		}
	});

	it("avisa que os desvios estão na trilha e leva ao caminho completo", async () => {
		await mostrar();
		const caminho = screen.getByRole("region", {
			name: "O caminho de um projeto de lei",
		});

		expect(caminho.textContent).toContain(
			"A linha mostra o caminho completo. Os desvios, como a comissão que decide sem o plenário, estão na trilha, com as fontes oficiais.",
		);
		const link = within(caminho).getByRole("link", {
			name: "Ver o caminho na trilha",
		});
		expect(link.getAttribute("href")).toBe(
			"/trilhas/processo-legislativo#caminho",
		);
		// Uma ação em texto em linha: o padding do link faz a área de toque, e o
		// anel de foco contorna só o texto, que fica num span (index.css).
		expect(link.classList.contains("acao-de-texto")).toBe(true);
		expect(link.firstElementChild?.tagName).toBe("SPAN");
	});

	it("deixa os desenhos fora do leitor de tela", async () => {
		const tela = await mostrar();

		const desenhos = tela.querySelectorAll(".fita-curta, svg");
		expect(desenhos.length).toBeGreaterThan(0);
		for (const desenho of desenhos) {
			expect(desenho.getAttribute("aria-hidden")).toBe("true");
		}
	});

	it("não pede dado nenhum e não fala do que ainda não existe", async () => {
		const tela = await mostrar();

		expect(tela.querySelector("form, input, select, textarea")).toBeNull();
		expect(tela.textContent).not.toMatch(
			/status da api|newsletter|inscri|quiz|em breve|em construção/i,
		);
	});

	it("com a letra grande, o título tem teto e as margens ficam em 20 px", async () => {
		await mostrar();
		const titulo = screen.getByRole("heading", { level: 1 });

		// O título cresce até "brasileira," encostar nas margens (index.css).
		expect(titulo.classList.contains("letra-com-teto")).toBe(true);
		expect(
			titulo.closest("div.mx-auto")?.classList.contains("px-margem-celular"),
		).toBe(true);
	});

	it("sem o caminho, fica com a abertura e o botão", async () => {
		await mostrar({ trilha: pagina.trilha });

		expect(screen.queryByRole("region")).toBeNull();
		expect(
			screen
				.getByRole("link", { name: "Começar a trilha" })
				.getAttribute("href"),
		).toBe("/trilhas/processo-legislativo/quem-pode-propor-uma-lei");
	});
});
