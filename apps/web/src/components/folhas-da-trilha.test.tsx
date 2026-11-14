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
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { ArtigoNaLista } from "@/lib/conteudo";
import { FolhasDaTrilha } from "./folhas-da-trilha";
import { NestaTrilha } from "./nesta-trilha";

afterEach(cleanup);

function artigo(ordem: number, slug: string, titulo: string): ArtigoNaLista {
	return {
		trilha: "processo-legislativo",
		slug,
		titulo,
		resumo: "Um resumo.",
		ordem,
		fontes: [],
		minutos: ordem + 2,
	};
}

const trilha = {
	slug: "processo-legislativo",
	titulo: "Processo legislativo",
	descricao: "Como uma lei nasce.",
	ordem: 1,
	artigos: [
		artigo(1, "quem-pode-propor-uma-lei", "Quem pode propor uma lei"),
		artigo(2, "onde-o-projeto-comeca", "Onde o projeto começa"),
		artigo(
			3,
			"o-projeto-passa-pelas-comissoes",
			"O projeto passa pelas comissões",
		),
	],
};

// O primeiro artigo está lido.
const lidos = new Set(["processo-legislativo/quem-pode-propor-uma-lei"]);

/** Mostra o que for pedido num site de mentira, com a rota dos artigos para os links. */
async function mostrar(conteudo: ReactNode) {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = createRoute({
		getParentRoute: () => raiz,
		path: "/",
		component: () => <div data-testid="pagina">{conteudo}</div>,
	});
	const artigoDaTrilha = createRoute({
		getParentRoute: () => raiz,
		path: "/trilhas/$trilha/$artigo",
		component: () => null,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([pagina, artigoDaTrilha]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	render(<RouterProvider router={router} />);
	return screen.findByTestId("pagina");
}

describe("folhas da trilha", () => {
	it("dá uma folha por artigo, na ordem, com o link para o artigo", async () => {
		const pagina = await mostrar(
			<FolhasDaTrilha
				trilha={trilha}
				lidos={lidos}
				aria-label="Artigos da trilha Processo legislativo"
			/>,
		);
		const lista = within(pagina).getByRole("list", {
			name: "Artigos da trilha Processo legislativo",
		});
		const links = within(lista).getAllByRole("link");

		expect(lista.tagName).toBe("OL");
		// Sem marcador, a lista perde o papel no Safari.
		expect(lista.getAttribute("role")).toBe("list");
		expect(links.map((link) => link.getAttribute("href"))).toEqual([
			"/trilhas/processo-legislativo/quem-pode-propor-uma-lei",
			"/trilhas/processo-legislativo/onde-o-projeto-comeca",
			"/trilhas/processo-legislativo/o-projeto-passa-pelas-comissoes",
		]);
		expect(links[1].textContent).toContain("Onde o projeto começa");
		expect(links[1].textContent).toContain("4 min");
	});

	it("marca a folha lida com o visto e escreve o “Lido”", async () => {
		const pagina = await mostrar(
			<FolhasDaTrilha trilha={trilha} lidos={lidos} />,
		);
		const [lida, naoLida] = within(pagina).getAllByRole("link");
		const visto = lida.querySelector("svg.marca-de-lido");

		expect(visto).not.toBeNull();
		expect(visto?.getAttribute("aria-hidden")).toBe("true");
		expect(lida.textContent).toContain("Lido · 3 min");
		expect(naoLida.querySelector("svg.marca-de-lido")).toBeNull();
		expect(naoLida.textContent).not.toContain("Lido");
	});

	it("desenha o visto só no artigo que a pessoa acabou de ler", async () => {
		const pagina = await mostrar(
			<FolhasDaTrilha
				trilha={trilha}
				lidos={
					new Set([...lidos, "processo-legislativo/onde-o-projeto-comeca"])
				}
				marcarAgora="onde-o-projeto-comeca"
			/>,
		);
		const vistos = pagina.querySelectorAll("svg.marca-de-lido");

		expect(vistos).toHaveLength(2);
		expect(vistos[0].hasAttribute("data-animar")).toBe(false);
		expect(vistos[1].hasAttribute("data-animar")).toBe(true);
	});

	it("sem uma folha aberta, nenhuma diz “Você está aqui”", async () => {
		const pagina = await mostrar(
			<FolhasDaTrilha trilha={trilha} lidos={lidos} />,
		);

		expect(pagina.querySelector("[aria-current]")).toBeNull();
		expect(pagina.textContent).not.toContain("Você está aqui");
	});

	it("com a letra grande, o título desce para baixo do número", async () => {
		const pagina = await mostrar(
			<FolhasDaTrilha trilha={trilha} lidos={lidos} />,
		);
		const link = within(pagina).getAllByRole("link")[0];
		const [numero, texto] = link.children;

		// O número fica na coluna dele, e o texto ocupa a linha de baixo inteira,
		// longe do visto da folha lida (index.css, a variante letra-grande).
		expect(numero.classList.contains("numeral")).toBe(true);
		expect(numero.classList.contains("letra-grande:mb-4")).toBe(true);
		expect(texto.classList.contains("letra-grande:col-span-full")).toBe(true);
		expect(texto.textContent).toContain("Quem pode propor uma lei");
	});

	it("dá a cada folha a fita da posição e deixa o número fora do leitor de tela", async () => {
		const pagina = await mostrar(
			<FolhasDaTrilha trilha={trilha} lidos={lidos} />,
		);
		const folhas = within(pagina).getAllByRole("listitem");
		const numero = folhas[1].querySelector(".numeral");

		// A cor do número vem da fita da posição, pela ordem (index.css).
		expect(folhas.map((folha) => folha.className)).toEqual([
			"fita-verde",
			"fita-amarela",
			"fita-azul",
		]);
		expect(numero?.getAttribute("aria-hidden")).toBe("true");
		expect(numero?.textContent).toBe("2");
	});
});

describe("nesta trilha", () => {
	it("mostra as folhas com o título “Nesta trilha” e marca a aberta", async () => {
		const pagina = await mostrar(
			<NestaTrilha
				trilha={trilha}
				atual="onde-o-projeto-comeca"
				lidos={lidos}
			/>,
		);
		const nav = within(pagina).getByRole("navigation", {
			name: "Nesta trilha",
		});
		const aberta = within(nav).getByRole("link", { current: "page" });

		expect(within(nav).getAllByRole("link")).toHaveLength(3);
		expect(aberta.getAttribute("href")).toBe(
			"/trilhas/processo-legislativo/onde-o-projeto-comeca",
		);
		expect(aberta.textContent).toContain("Você está aqui");
		// A folha aberta leva o fio de tinta do lado (index.css).
		expect(aberta.closest("li")?.classList.contains("aqui")).toBe(true);
	});

	it("fica numa coluna só: a lista não leva classe além da folhas-da-trilha", async () => {
		// As colunas são só da lista das trilhas: no CSS, presas à .trilha-da-lista
		// (lib/lista-das-trilhas.test.ts). Uma classe do Tailwind aqui, como
		// lg:grid lg:grid-flow-col, poria as colunas também no artigo.
		const pagina = await mostrar(
			<NestaTrilha
				trilha={trilha}
				atual="onde-o-projeto-comeca"
				lidos={lidos}
			/>,
		);
		const lista = within(pagina).getByRole("list");

		expect([...lista.classList]).toEqual(["folhas-da-trilha"]);
		expect(lista.getAttribute("style")).toBeNull();
	});
});
