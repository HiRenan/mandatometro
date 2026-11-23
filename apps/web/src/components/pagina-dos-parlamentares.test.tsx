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
	waitFor,
	within,
} from "@testing-library/react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listaDeExemplo } from "@/lib/parlamentares/exemplos-de-teste";
import { lerParlamentares } from "@/lib/parlamentares/parlamentares.server";
import { Route } from "@/routes/parlamentares/index";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));

/** O corpo que a API de mentira manda: a lista de exemplo, que um teste pode trocar. */
let corpoDaApi: unknown;

beforeEach(() => {
	corpoDaApi = listaDeExemplo();
	// O jsdom não rola a janela.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.stubGlobal(
		"fetch",
		vi.fn(
			async () =>
				new Response(JSON.stringify(corpoDaApi), {
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
function criarRouter(endereco: string) {
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
	return { router, carregar };
}

async function abrir(endereco: string) {
	const { router, carregar } = criarRouter(endereco);
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
	it("o campo Estado oferece as 27 opções em ordem alfabética pelo nome", async () => {
		await abrir("/parlamentares");
		const campo = screen.getByRole("combobox", { name: "Estado" });
		expect(
			within(campo)
				.getAllByRole("option")
				.map((opcao) => opcao.textContent),
		).toEqual([
			"Escolha o estado",
			"Acre",
			"Alagoas",
			"Amapá",
			"Amazonas",
			"Bahia",
			"Ceará",
			"Distrito Federal",
			"Espírito Santo",
			"Goiás",
			"Maranhão",
			"Mato Grosso",
			"Mato Grosso do Sul",
			"Minas Gerais",
			"Pará",
			"Paraíba",
			"Paraná",
			"Pernambuco",
			"Piauí",
			"Rio de Janeiro",
			"Rio Grande do Norte",
			"Rio Grande do Sul",
			"Rondônia",
			"Roraima",
			"Santa Catarina",
			"São Paulo",
			"Sergipe",
			"Tocantins",
		]);
	});

	it("no mapa, cada estado é um link com o nome e o número de deputados, no singular quando é um", async () => {
		await abrir("/parlamentares");
		const mapa = screen.getByRole("navigation", { name: "Estados" });

		// O mapa e a lista, que fica no lugar dele na tela estreita.
		expect(
			within(mapa).getAllByRole("link", { name: /deputados?$/ }),
		).toHaveLength(54);
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

	it("o foco do teclado que veio antes da hidratação mantém a linha e a região em destaque sobre o ponteiro", async () => {
		const { router } = criarRouter("/parlamentares");
		await router.load();
		const pagina = <RouterProvider router={router} />;
		const raiz = document.createElement("div");
		raiz.innerHTML = renderToString(pagina);
		document.body.append(raiz);

		let hidratada: Root | undefined;
		try {
			const df = noMapa(raiz, "DF");
			focarPeloTeclado(df);
			expect(document.activeElement).toBe(df);
			expect(df.matches(":focus-visible")).toBe(true);
			expect(ficha(raiz)).toBe("Escolha um estado.");

			const erros = vi.fn();
			await act(async () => {
				hidratada = hydrateRoot(raiz, pagina, { onRecoverableError: erros });
			});
			expect(erros).not.toHaveBeenCalled();
			const fichaAoHidratar = ficha(raiz);
			fireEvent.pointerEnter(noMapa(raiz, "MG"));

			expect(document.activeElement).toBe(df);
			expect(ficha(raiz)).toBe(
				"Distrito Federal" + "Centro-Oeste" + "0 deputados",
			);
			expect(fichaAoHidratar).toBe(ficha(raiz));
			expect(
				[...raiz.querySelectorAll(".regiao-do-mapa:not(.apagada)")].map(
					(regiao) => regiao.getAttribute("aria-label"),
				),
			).toEqual(["Centro-Oeste"]);

			act(() => (df as SVGElement).blur());
			expect(ficha(raiz)).toBe("Minas Gerais" + "Sudeste" + "0 deputados");
		} finally {
			act(() => hidratada?.unmount());
			raiz.remove();
		}
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
			"Traçado dos estados: IBGE · Licença MIT",
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

describe("os retratos da lista", () => {
	/** O endereço da foto oficial de mentira de um nome, no site da Casa dele. */
	function enderecoDaFoto({ id, casa }: { id: number; casa: string }) {
		const numero = `9${String(id).padStart(7, "0")}`;
		return casa === "camara"
			? `https://www.camara.leg.br/internet/deputado/bandep/${numero}.jpg`
			: `https://legis.senado.leg.br/senadores/fotos-oficiais/${numero}`;
	}

	/**
	 * A lista de exemplo com a foto de cada nome das `casas`, uma diferente por
	 * id, menos os ids de `semFoto`, que ficam sem o campo, como na API de antes
	 * da #303.
	 */
	function listaComFotos({
		casas = ["camara", "senado"],
		semFoto = [] as number[],
	} = {}) {
		return {
			parlamentares: listaDeExemplo().parlamentares.map(
				({ foto: _, ...semAFoto }) => {
					if (!casas.includes(semAFoto.casa) || semFoto.includes(semAFoto.id)) {
						return semAFoto;
					}
					return {
						...semAFoto,
						foto: {
							url: enderecoDaFoto(semAFoto),
							credito:
								semAFoto.casa === "camara"
									? "Câmara dos Deputados"
									: "Senado Federal",
						},
					};
				},
			),
		};
	}

	const fotosDaLista = () => [
		...document.querySelectorAll<HTMLImageElement>(".nomes-da-casa img"),
	];

	it("cada nome leva o retrato antes do nome, dentro do link e fora do leitor de tela, com a foto lazy, sem o endereço da página e com o tamanho no HTML", async () => {
		corpoDaApi = listaComFotos();
		await abrir("/parlamentares?uf=SC");
		const camara = screen.getByRole("region", { name: "Câmara dos Deputados" });

		const link = within(camara).getByRole("link", {
			name: "Ágata Cedrolume PFT",
		});
		const retrato = link.firstElementChild;
		expect(retrato?.classList.contains("retrato-na-lista")).toBe(true);
		expect(retrato?.getAttribute("aria-hidden")).toBe("true");
		expect(retrato?.nextElementSibling?.textContent).toBe("Ágata Cedrolume");
		const foto = retrato?.querySelector("img");
		expect(
			Object.fromEntries(
				["src", "alt", "loading", "decoding", "referrerpolicy"].map((nome) => [
					nome,
					foto?.getAttribute(nome),
				]),
			),
		).toEqual({
			src: enderecoDaFoto({ id: 81, casa: "camara" }),
			alt: "",
			loading: "lazy",
			decoding: "async",
			referrerpolicy: "no-referrer",
		});
		expect([foto?.getAttribute("width"), foto?.getAttribute("height")]).toEqual(
			["300", "400"],
		);
		// O nome de cada link continua sendo o nome e o partido, e nenhuma foto
		// chega ao leitor de tela.
		const senado = screen.getByRole("region", { name: "Senado Federal" });
		for (const casa of [camara, senado]) {
			expect(within(casa).queryAllByRole("img")).toEqual([]);
			expect(within(casa).queryAllByRole("presentation")).toEqual([]);
		}
		expect(
			within(camara)
				.getAllByRole("link")
				.map(
					(nome) =>
						nome.querySelector<HTMLImageElement>(".retrato-na-lista img")?.src,
				),
		).toEqual([81, 82, 83].map((id) => enderecoDaFoto({ id, casa: "camara" })));
		expect(
			within(senado)
				.getAllByRole("link")
				.map(
					(nome) =>
						nome.querySelector<HTMLImageElement>(".retrato-na-lista img")?.src,
				),
		).toEqual([501, 502].map((id) => enderecoDaFoto({ id, casa: "senado" })));
	});

	it("o crédito das fotos de cada Casa fica logo embaixo do título dela, antes dos nomes", async () => {
		corpoDaApi = listaComFotos();
		await abrir("/parlamentares?uf=SC");

		for (const [casa, credito] of [
			["Câmara dos Deputados", "Fotos: Câmara dos Deputados"],
			["Senado Federal", "Fotos: Senado Federal"],
		]) {
			const titulo = screen.getByRole("heading", { level: 2, name: casa });
			const linha = titulo.nextElementSibling;
			expect(linha?.textContent, casa).toBe(credito);
			expect(linha?.classList.contains("credito-das-fotos"), casa).toBe(true);
			expect(
				linha?.nextElementSibling?.hasAttribute("data-com-retratos"),
				casa,
			).toBe(true);
		}
	});

	it("o nome sem foto nos dados leva a moldura vazia, com o azulejo cru, e a Casa continua com o crédito", async () => {
		corpoDaApi = listaComFotos({ semFoto: [82] });
		await abrir("/parlamentares?uf=SC");
		const camara = screen.getByRole("region", { name: "Câmara dos Deputados" });

		const retratos = within(camara)
			.getAllByRole("link")
			.map((link) => link.querySelector(".retrato-na-lista"));
		expect(retratos.map((retrato) => retrato?.childElementCount)).toEqual([
			1, 0, 1,
		]);
		expect(
			within(camara).getByText("Fotos: Câmara dos Deputados"),
		).toBeTruthy();
	});

	it("a foto que não carrega sai, e a moldura fica no lugar, fora do leitor de tela, com o mesmo nome no link", async () => {
		corpoDaApi = listaComFotos();
		await abrir("/parlamentares?uf=SC");
		const link = screen.getByRole("link", { name: "Ágata Cedrolume PFT" });

		fireEvent.error(link.querySelector("img") as HTMLImageElement);

		expect(link.querySelector("img")).toBeNull();
		expect(
			link.querySelector(".retrato-na-lista")?.getAttribute("aria-hidden"),
		).toBe("true");
		expect(screen.getByRole("link", { name: "Ágata Cedrolume PFT" })).toBe(
			link,
		);
		expect(fotosDaLista()).toHaveLength(4);
	});

	it("a foto que falhou antes de o JavaScript chegar também sai: o React não recebe mais o aviso da falha", async () => {
		vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(
			true,
		);
		vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(
			0,
		);
		corpoDaApi = listaComFotos();

		await abrir("/parlamentares?uf=SC");

		await waitFor(() => expect(fotosDaLista()).toEqual([]));
		expect(document.querySelectorAll(".retrato-na-lista")).toHaveLength(5);
	});

	it.each([
		["a foto que chegou antes do JavaScript", true, 300],
		["a foto lazy que ainda não foi pedida", false, 0],
	])("%s fica", async (_, completa, largura) => {
		vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(
			completa,
		);
		vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(
			largura,
		);
		corpoDaApi = listaComFotos();

		await abrir("/parlamentares?uf=SC");
		await act(async () => {});

		expect(fotosDaLista()).toHaveLength(5);
	});

	it("a Casa sem nenhuma foto nos dados fica como era, sem os retratos e sem o crédito", async () => {
		corpoDaApi = listaComFotos({ casas: ["camara"] });
		await abrir("/parlamentares?uf=SC");
		const senado = screen.getByRole("region", { name: "Senado Federal" });

		expect(senado.querySelector(".retrato-na-lista")).toBeNull();
		expect(senado.querySelector(".credito-das-fotos")).toBeNull();
		expect(
			senado.querySelector(".nomes-da-casa")?.hasAttribute("data-com-retratos"),
		).toBe(false);
		expect(
			within(senado).getByRole("link", { name: "Lia Quinemar PRV" }),
		).toBeTruthy();
		// A Câmara, com as fotos, continua com os retratos e o crédito.
		const camara = screen.getByRole("region", { name: "Câmara dos Deputados" });
		expect(camara.querySelectorAll(".retrato-na-lista img")).toHaveLength(3);
		expect(camara.querySelector(".credito-das-fotos")).toBeTruthy();
	});

	it("sem nenhuma foto nos dados, como na API de antes da #303, a lista fica como era", async () => {
		corpoDaApi = listaComFotos({ casas: [] });
		await abrir("/parlamentares?uf=SC");

		expect(document.querySelector(".retrato-na-lista")).toBeNull();
		expect(screen.queryByText(/^Fotos:/)).toBeNull();
		expect(document.querySelector("[data-com-retratos]")).toBeNull();
		expect(
			screen.getByRole("link", { name: "Ágata Cedrolume PFT" })
				.firstElementChild?.className,
		).toBe("nome");
	});
});
