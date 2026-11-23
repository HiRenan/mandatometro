// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listaDeExemplo } from "@/lib/parlamentares/exemplos-de-teste";
import { lerParlamentares } from "@/lib/parlamentares/parlamentares.server";
import { Route } from "@/routes/parlamentares/index";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));

beforeEach(() => {
	// O jsdom não rola a janela.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal(
		"fetch",
		vi.fn(
			async () =>
				new Response(JSON.stringify(listaDeExemplo()), {
					headers: { "Content-Type": "application/json" },
				}),
		),
	);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

/**
 * A lista num site de mentira. A rota entra na árvore como no routeTree.gen.ts,
 * e o loader lê a API de exemplo direto, sem a função do servidor.
 */
async function abrir(endereco: string) {
	const carregar = vi.fn(({ deps }: { deps: { uf?: string } }) =>
		lerParlamentares(deps.uf),
	);
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/parlamentares/",
		path: "/parlamentares/",
		getParentRoute: () => raiz,
		loader: carregar,
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		history: createMemoryHistory({ initialEntries: [endereco] }),
	});
	const { container } = render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { level: 1 });
	return { router, carregar, container };
}

/** O link de um estado no desenho do mapa, e não o da lista em ordem alfabética. */
function noMapa(container: HTMLElement, sigla: string): Element {
	const link = container.querySelector(
		`.desenho-do-brasil a[href="/parlamentares?uf=${sigla}"]`,
	);
	if (!link) {
		throw new Error(`o mapa não tem o link de ${sigla}`);
	}
	return link;
}

/** O texto da linha embaixo do mapa, que fica fora do leitor de tela. */
const ficha = (container: HTMLElement) =>
	container.querySelector(".ficha-do-mapa")?.textContent;

/** O foco do teclado: o Tab antes do foco faz o navegador mostrar o anel. */
function focarPeloTeclado(elemento: Element) {
	fireEvent.keyDown(document.body, { key: "Tab" });
	act(() => (elemento as HTMLElement | SVGElement).focus());
}

describe("a lista dos parlamentares", () => {
	it("no mapa, cada estado é um link com o nome e o número de deputados, no singular quando é um", async () => {
		await abrir("/parlamentares");
		const mapa = screen.getByRole("navigation", { name: "Estados" });

		// O mapa e a lista, que fica no lugar dele na tela estreita.
		expect(within(mapa).getAllByRole("link")).toHaveLength(54);
		expect(
			within(mapa)
				.getAllByRole("link", { name: "SC Santa Catarina, 3 deputados" })
				.map((link) => link.getAttribute("href")),
		).toEqual(["/parlamentares?uf=SC", "/parlamentares?uf=SC"]);
		expect(
			within(mapa).getAllByRole("link", { name: "BA Bahia, 1 deputado" }),
		).toHaveLength(2);
		expect(
			within(mapa).getAllByRole("link", { name: "AC Acre, 0 deputados" }),
		).toHaveLength(2);
		expect(mapa.querySelector("[aria-current]")).toBeNull();
	});

	it("no mapa, cada região é uma lista com o nome dela, na ordem do IBGE, com os estados em ordem alfabética", async () => {
		await abrir("/parlamentares");
		const mapa = screen.getByRole("navigation", { name: "Estados" });
		const regioes = within(mapa)
			.getAllByRole("list")
			.filter((lista) => lista.hasAttribute("aria-label"));

		expect(regioes.map((lista) => lista.getAttribute("aria-label"))).toEqual([
			"Norte",
			"Nordeste",
			"Sudeste",
			"Sul",
			"Centro-Oeste",
		]);
		expect(
			regioes.map((lista) => within(lista).getAllByRole("listitem").length),
		).toEqual([7, 9, 4, 3, 4]);
		expect(
			within(regioes[3])
				.getAllByRole("link")
				.map((link) => link.getAttribute("aria-label")),
		).toEqual([
			"PR Paraná, 0 deputados",
			"RS Rio Grande do Sul, 0 deputados",
			"SC Santa Catarina, 3 deputados",
		]);
		for (const [posicao, fita] of [
			"fita-verde",
			"fita-amarela",
			"fita-azul",
			"fita-rosa",
			"fita-vermelha",
		].entries()) {
			expect(regioes[posicao].classList.contains(fita), fita).toBe(true);
		}
	});

	it("com o ponteiro num estado, a linha embaixo do mapa diz o nome, a região e os deputados, e as outras regiões se apagam", async () => {
		const { container } = await abrir("/parlamentares");

		expect(ficha(container)).toBe("Escolha um estado.");
		fireEvent.pointerEnter(noMapa(container, "SC"));

		expect(ficha(container)).toBe("Santa Catarina" + "Sul" + "3 deputados");
		const apagadas = [...container.querySelectorAll(".regiao-do-mapa")]
			.filter((regiao) => regiao.classList.contains("apagada"))
			.map((regiao) => regiao.getAttribute("aria-label"));
		expect(apagadas).toEqual(["Norte", "Nordeste", "Sudeste", "Centro-Oeste"]);
		// O estado sobe numa cópia, depois de tudo no desenho, fora do leitor de
		// tela e do caminho do ponteiro.
		const copia = container.querySelector(".estado-em-destaque");
		expect(copia?.classList.contains("fita-rosa")).toBe(true);
		expect(copia?.parentElement?.lastElementChild).toBe(copia);
		expect(copia?.querySelector(".estado")?.getAttribute("d")).toBe(
			noMapa(container, "SC").querySelector("path")?.getAttribute("d"),
		);

		fireEvent.pointerLeave(noMapa(container, "SC"));
		expect(ficha(container)).toBe("Escolha um estado.");
		expect(container.querySelector(".estado-em-destaque")).toBeNull();
		expect(container.querySelector(".apagada")).toBeNull();
	});

	it("com o foco do teclado num estado, ele sobe com o anel, e a linha diz o estado; em repouso, ela diz o estado aberto", async () => {
		const { container } = await abrir("/parlamentares?uf=SC");

		expect(ficha(container)).toBe("Santa Catarina" + "Sul" + "3 deputados");
		focarPeloTeclado(noMapa(container, "BA"));

		expect(ficha(container)).toBe("Bahia" + "Nordeste" + "1 deputado");
		// O anel vem com o fio claro por fora, desenhado antes dele.
		expect(
			container.querySelector(
				".estado-em-destaque.com-foco .fio-claro + .anel",
			),
		).toBeTruthy();
		// O foco vale mais que o ponteiro: o anel fica no estado do teclado.
		fireEvent.pointerEnter(noMapa(container, "AC"));
		expect(ficha(container)).toBe("Bahia" + "Nordeste" + "1 deputado");

		fireEvent.blur(noMapa(container, "BA"));
		expect(ficha(container)).toBe("Acre" + "Norte" + "0 deputados");
	});

	it("o foco que vem do clique fica sem o anel: o mouse dá o foco ao link antes de navegar", async () => {
		const { container } = await abrir("/parlamentares");
		const ba = noMapa(container, "BA");

		fireEvent.mouseDown(ba.querySelector("path") as Element);
		act(() => (ba as SVGElement).focus());

		expect(document.activeElement).toBe(ba);
		expect(container.querySelector(".estado-em-destaque")).toBeNull();
		expect(ficha(container)).toBe("Escolha um estado.");
	});

	it("os oito estados estreitos ganham um azulejo com o endereço do estado, fora do leitor de tela e do Tab, que acende com o estado", async () => {
		const { container } = await abrir("/parlamentares");
		const azulejos = [...container.querySelectorAll(".atalho-do-estado")];

		expect(
			container.querySelector(".atalhos-do-mapa")?.getAttribute("aria-hidden"),
		).toBe("true");
		expect(azulejos.map((azulejo) => azulejo.textContent)).toEqual([
			"AL0",
			"PB0",
			"PE0",
			"RN0",
			"SE0",
			"ES0",
			"RJ0",
			"DF0",
		]);
		for (const azulejo of azulejos) {
			const sigla = azulejo.querySelector(".sigla")?.textContent;
			expect(azulejo.getAttribute("tabindex"), sigla).toBe("-1");
			expect(azulejo.getAttribute("href"), sigla).toBe(
				`/parlamentares?uf=${sigla}`,
			);
		}

		const df = azulejos[7];
		fireEvent.pointerEnter(df);
		expect(ficha(container)).toBe(
			"Distrito Federal" + "Centro-Oeste" + "0 deputados",
		);
		expect(
			container
				.querySelector(".estado-em-destaque")
				?.classList.contains("fita-vermelha"),
		).toBe(true);
		fireEvent.pointerLeave(df);

		// No mapa, o DF é pequeno: com o foco do teclado nele, o azulejo mostra o anel.
		focarPeloTeclado(noMapa(container, "DF"));
		expect(df.classList.contains("aceso")).toBe(true);
		expect(df.classList.contains("com-foco")).toBe(true);
	});

	it("a legenda diz as cinco regiões em palavras, na ordem do IBGE e com a fita de cada uma, fora do leitor de tela", async () => {
		const { container } = await abrir("/parlamentares");
		const legenda = container.querySelector(".legenda-do-mapa");

		// As listas do mapa já dizem a região de cada estado ao leitor de tela.
		expect(legenda?.getAttribute("aria-hidden")).toBe("true");
		expect(
			[...(legenda?.children ?? [])].map((item) => [
				item.textContent,
				item.className,
			]),
		).toEqual([
			["Norte", "fita-verde"],
			["Nordeste", "fita-amarela"],
			["Sudeste", "fita-azul"],
			["Sul", "fita-rosa"],
			["Centro-Oeste", "fita-vermelha"],
		]);
		expect(container.querySelector(".credito-do-mapa")?.textContent).toBe(
			"Traçado dos estados: IBGE",
		);
	});

	it("o clique num estado do desenho abre a lista dele, pelo roteador", async () => {
		const { container, router } = await abrir("/parlamentares");

		fireEvent.click(noMapa(container, "SC"));

		expect(
			await screen.findByRole("heading", { level: 1, name: "Santa Catarina" }),
		).toBeTruthy();
		expect(router.state.location.search).toEqual({ uf: "SC" });
		expect(noMapa(container, "SC").getAttribute("aria-current")).toBe("page");
	});

	it("com um estado, o mapa marca o estado aberto, e os nomes vêm separados pela Casa", async () => {
		await abrir("/parlamentares?uf=SC");

		expect(
			screen.getByRole("heading", { level: 1, name: "Santa Catarina" }),
		).toBeTruthy();
		for (const link of screen.getAllByRole("link", {
			name: "SC Santa Catarina, 3 deputados",
		})) {
			expect(link.getAttribute("aria-current")).toBe("page");
		}
		const camara = screen.getByRole("region", { name: "Câmara dos Deputados" });
		const senado = screen.getByRole("region", { name: "Senado Federal" });
		// Quem não tem partido nos dados fica com o traço, que o leitor de tela
		// pula, e ouve o porquê.
		const nomes = [
			"Ágata Cedrolume PFT",
			"Íris Dell'Ombre PNX",
			"João-Pedro Varustel sem partido registrado",
		];
		expect(within(camara).getAllByRole("link")).toHaveLength(3);
		for (const nome of nomes) {
			expect(within(camara).getByRole("link", { name: nome })).toBeTruthy();
		}
		expect(within(senado).getAllByRole("link")).toHaveLength(2);
	});

	it("o campo Estado leva à lista do estado escolhido", async () => {
		const { router, carregar } = await abrir("/parlamentares");

		fireEvent.change(screen.getByRole("combobox", { name: "Estado" }), {
			target: { value: "BA" },
		});
		fireEvent.click(
			screen.getByRole("button", { name: "Ver os parlamentares" }),
		);

		expect(
			await screen.findByRole("heading", { level: 1, name: "Bahia" }),
		).toBeTruthy();
		expect(router.state.location.search).toEqual({ uf: "BA" });
		expect(carregar.mock.lastCall?.[0].deps).toEqual({ uf: "BA" });
	});
});
