// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	onTestFinished,
	vi,
} from "vitest";
import {
	anotarEntradaNaConta,
	CHAVE_SESSAO,
	encerrarProgressoNaConta,
} from "@/lib/progresso";
import Header, { ROTEIRO_DA_CONTA } from "./header";
import { NOME_DO_SITE } from "./nome-do-site";
import { Rodape } from "./rodape";

// O site com a API ou sem ela: a sessão do progresso só existe com o API_URL.
const ambiente = vi.hoisted(() => ({ API_URL: "" }));
vi.mock("@/env", () => ({ ENV: ambiente }));

// Na hidratação, o hook da sessão ainda dá o retrato de visitante, e só depois o
// do navegador. O teste da hidratação liga o retrato de visitante.
const hidratacao = vi.hoisted(() => ({ retratoDeVisitante: false }));
vi.mock("@/lib/progresso", async (original) => {
	const progresso = await original<typeof import("@/lib/progresso")>();
	return {
		...progresso,
		useContextoDoProgresso: () => {
			const contexto = progresso.useContextoDoProgresso();
			return hidratacao.retratoDeVisitante ? { sessao: null } : contexto;
		},
	};
});

const CONTA_ABERTA = "data-conta-aberta";

beforeEach(() => {
	ambiente.API_URL = "";
	hidratacao.retratoDeVisitante = false;
	localStorage.clear();
	document.documentElement.removeAttribute(CONTA_ABERTA);
});

afterEach(() => {
	cleanup();
	localStorage.clear();
	document.documentElement.removeAttribute(CONTA_ABERTA);
});

/** O cabeçalho num site de mentira, com as páginas dos links dele. */
async function mostrar({
	comApi = false,
	endereco = "/",
}: {
	comApi?: boolean;
	endereco?: string;
} = {}) {
	const raiz = createRootRoute({
		component: () => (
			<>
				<Header comApi={comApi} />
				<Outlet />
			</>
		),
	});
	const pagina = (path: string) =>
		createRoute({ getParentRoute: () => raiz, path, component: () => null });
	const router = createRouter({
		routeTree: raiz.addChildren(
			[
				"/",
				"/trilhas",
				"/parlamentares",
				"/parlamentares/$id",
				"/votacoes/$id",
				"/jogos",
				"/edicoes",
				"/edicoes/$id",
				"/login",
				"/perfil",
				"/cadastro/confirmar",
			].map(pagina),
		),
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

/**
 * As três listas dos links: a do meio (computador), a de baixo (tablet) e a do
 * menu (celular). O jsdom não aplica o CSS e vê as três; o navegador mostra uma
 * de cada vez.
 */
function asListas(cabecalho: HTMLElement) {
	return within(cabecalho).getAllByRole("navigation", { name: "Principal" });
}

/** Os links de uma lista: no menu, sem a busca e a conta, que vêm depois. */
function linksDe(lista: HTMLElement) {
	return within(within(lista).getByRole("list"))
		.getAllByRole("link")
		.map((link) => [link.textContent, link.getAttribute("href")]);
}

/** O <details> do menu do celular e o botão dele, o <summary>. */
function oMenu(cabecalho: HTMLElement) {
	const detalhes = cabecalho.querySelector<HTMLDetailsElement>(
		"nav.menu-do-celular > details",
	);
	const botao = detalhes?.querySelector<HTMLElement>(":scope > summary");
	if (!detalhes || !botao) throw new Error("O cabeçalho ficou sem o menu.");
	return { detalhes, botao };
}

describe("cabeçalho", () => {
	it("tem o pulo para o conteúdo, o nome, o lema e os dois links nas três listas", async () => {
		const cabecalho = await mostrar();
		const listas = asListas(cabecalho);

		expect(
			within(cabecalho)
				.getByRole("link", { name: "Pular para o conteúdo" })
				.getAttribute("href"),
		).toBe("#conteudo");
		const inicio = within(cabecalho).getByRole("link", {
			name: /^Mandatômetro$/,
		});
		expect(inicio.getAttribute("href")).toBe("/");
		// O M é a letra da fonte, e não mais o livro (a #357).
		expect(inicio.querySelector("svg")).toBeNull();
		expect(inicio.querySelector(".marca-inicial")?.textContent).toBe("M");
		expect(inicio.textContent).toBe("Mandatômetro");
		expect(cabecalho.querySelector(".marca-lema")?.textContent).toBe(
			"A política brasileira de perto.",
		);
		// A conta fica fora das listas: ao lado da busca e, no menu, embaixo.
		expect(listas.map(linksDe)).toEqual(
			Array(3).fill([
				["Trilhas", "/trilhas"],
				["Jogos", "/jogos"],
			]),
		);
	});

	it("mostra o M inteiro enquanto a Archivo carrega e só então acrescenta os enfeites", async () => {
		let terminarCarga!: (fontes: object[]) => void;
		const carga = new Promise<object[]>((resolver) => {
			terminarCarga = resolver;
		});
		Object.defineProperty(document, "fonts", {
			configurable: true,
			value: { load: () => carga },
		});
		onTestFinished(() => {
			Reflect.deleteProperty(document, "fonts");
		});

		const cabecalho = await mostrar();
		const inicio = within(cabecalho).getByRole("link", {
			name: /^Mandatômetro$/,
		});
		const inicial = inicio.querySelector(".marca-inicial");
		expect(inicial?.textContent).toBe("M");
		expect(inicial?.hasAttribute("data-archivo-carregada")).toBe(false);

		await act(async () => terminarCarga([{ status: "loaded" }]));
		expect(inicial?.hasAttribute("data-archivo-carregada")).toBe(true);
	});

	it("onde o site tem a API, os parlamentares e as edições entram nas três listas", async () => {
		const cabecalho = await mostrar({ comApi: true });
		const listas = asListas(cabecalho);

		expect(listas).toHaveLength(3);
		for (const lista of listas) {
			expect(linksDe(lista)).toEqual([
				["Trilhas", "/trilhas"],
				["Parlamentares", "/parlamentares"],
				["Jogos", "/jogos"],
				["Edições", "/edicoes"],
			]);
		}
	});

	it("sem a API, os parlamentares e as edições ficam fora", async () => {
		const cabecalho = await mostrar();

		for (const nome of ["Parlamentares", "Edições"]) {
			expect(within(cabecalho).queryByRole("link", { name: nome })).toBe(null);
		}
	});

	it("o Início saiu dos links: o nome leva ao início, e na página inicial nenhum link fica marcado", async () => {
		const cabecalho = await mostrar({ comApi: true });

		expect(within(cabecalho).queryByRole("link", { name: "Início" })).toBe(
			null,
		);
		for (const lista of asListas(cabecalho)) {
			expect(lista.querySelector('a[href="/"]')).toBeNull();
			expect(lista.querySelector("a[data-na-secao]")).toBeNull();
			expect(lista.querySelector("a[aria-current]")).toBeNull();
		}
	});

	it("numa edição, o traço fica nas edições, e o link não é a página atual", async () => {
		const cabecalho = await mostrar({
			comApi: true,
			endereco: "/edicoes/7",
		});
		const edicoes = within(cabecalho).getAllByRole("link", { name: "Edições" });
		const trilhas = within(cabecalho).getAllByRole("link", { name: "Trilhas" });

		expect(edicoes).toHaveLength(3);
		for (const link of edicoes) {
			expect(link.hasAttribute("data-na-secao")).toBe(true);
			expect(link.hasAttribute("aria-current")).toBe(false);
		}
		for (const link of trilhas) {
			expect(link.hasAttribute("data-na-secao")).toBe(false);
		}
	});

	it.each([
		["na lista sem estado, que é a página do link", "/parlamentares", "page"],
		["na lista de um estado", "/parlamentares?uf=PR", null],
		["na página de uma pessoa", "/parlamentares/81-agata-cedrolume", null],
		["na página de uma votação", "/votacoes/139", null],
	])("o traço fica no Parlamentares %s", async (_, endereco, atual) => {
		const cabecalho = await mostrar({ comApi: true, endereco });

		const marcados = within(cabecalho)
			.getAllByRole("link")
			.filter((link) => link.hasAttribute("data-na-secao"))
			.map((link) => [link.textContent, link.getAttribute("aria-current")]);
		expect(marcados).toEqual(Array(3).fill(["Parlamentares", atual]));
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
		const cabecalho = await mostrar({ endereco: "/trilhas" });

		for (const lista of asListas(cabecalho)) {
			const [trilhas, jogos] = lista.querySelectorAll("ul a");
			expect(trilhas.hasAttribute("data-na-secao")).toBe(true);
			expect(trilhas.getAttribute("aria-current")).toBe("page");
			expect(jogos.hasAttribute("data-na-secao")).toBe(false);
			expect(jogos.hasAttribute("aria-current")).toBe(false);
		}
	});

	it("segue a ordem da tela: o nome, a lista do meio, a busca, a conta, a lista de baixo e o menu", async () => {
		// No computador, o CSS mostra a lista do meio: o Tab vai do nome aos links e
		// depois à busca e à conta, como na tela. No tablet, mostra a de baixo: o
		// Tab vai do nome à busca e à conta, e depois aos links. No celular, mostra
		// o menu: o Tab vai do nome ao botão e, com o menu aberto, aos destinos, à
		// busca e à conta (header.tsx).
		const cabecalho = await mostrar();
		const nome = within(cabecalho).getByRole("link", { name: "Mandatômetro" });
		const [meio, baixo, menu] = asListas(cabecalho);
		const [entrada, entradaDoMenu] = within(cabecalho).getAllByRole("button", {
			name: "Buscar no site",
		});
		const [conta, contaDoMenu] = within(cabecalho).getAllByRole("link", {
			name: "Entrar",
		});
		const { botao } = oMenu(cabecalho);
		const emOrdem = [
			nome,
			meio,
			entrada,
			conta,
			baixo,
			menu,
			botao,
			within(menu).getByRole("list"),
			entradaDoMenu,
			contaDoMenu,
		];

		for (let i = 1; i < emOrdem.length; i++) {
			expect(
				emOrdem[i - 1].compareDocumentPosition(emOrdem[i]) &
					Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		}
		expect(meio.classList.contains("topo-nav-meio")).toBe(true);
		expect(baixo.classList.contains("topo-nav-baixo")).toBe(true);
		expect(menu.classList.contains("menu-do-celular")).toBe(true);
		for (const busca of [entrada, entradaDoMenu]) {
			expect(busca.getAttribute("aria-haspopup")).toBe("dialog");
			expect(busca.getAttribute("aria-keyshortcuts")).toBe("Control+K Meta+K");
			expect(busca.querySelector("kbd")?.getAttribute("aria-hidden")).toBe(
				"true",
			);
		}
	});
});

describe("a entrada da conta", () => {
	/**
	 * Os dois links da conta, "Entrar" e "Conta", com a marca de cada um. A
	 * entrada está duas vezes no cabeçalho, ao lado da busca e no menu do
	 * celular, e as duas são iguais: o CSS mostra uma de cada vez.
	 */
	async function conta(endereco: string) {
		const cabecalho = await mostrar({ endereco });
		const estado = (link: HTMLElement) => ({
			href: link.getAttribute("href"),
			atual: link.getAttribute("aria-current"),
			traco: link.hasAttribute("data-na-secao"),
		});
		const [aoLadoDaBusca, noMenu] = [
			...cabecalho.querySelectorAll<HTMLElement>(".entrada-da-conta"),
		].map((entrada) => ({
			entrar: estado(within(entrada).getByRole("link", { name: "Entrar" })),
			conta: estado(within(entrada).getByRole("link", { name: "Conta" })),
		}));
		expect(noMenu).toEqual(aoLadoDaBusca);
		return { cabecalho, ...aoLadoDaBusca };
	}

	it("tem Entrar, que leva ao login, e Conta, que leva ao perfil, na mesma célula, ao lado da busca e no fim do menu", async () => {
		const { cabecalho, entrar, conta: aberta } = await conta("/trilhas");
		const entradas = [
			...cabecalho.querySelectorAll<HTMLElement>(".entrada-da-conta"),
		];

		expect(entrar).toEqual({ href: "/login", atual: null, traco: false });
		expect(aberta).toEqual({ href: "/perfil", atual: null, traco: false });
		expect(entradas).toHaveLength(2);
		for (const entrada of entradas) {
			const links = within(entrada).getAllByRole("link");
			// O CSS esconde um deles pela marca do <html> (index.css).
			expect(links.map((link) => link.getAttribute("data-para"))).toEqual([
				"quem-nao-entrou",
				"quem-entrou",
			]);
			expect(links.map((link) => link.parentElement)).toEqual([
				entrada,
				entrada,
			]);
		}
		// No computador e no tablet, a conta fica fora das listas, ao lado da
		// busca; no celular, no fim do menu, depois dos destinos.
		const [aoLadoDaBusca, noMenu] = entradas;
		expect(aoLadoDaBusca.closest("nav")).toBe(null);
		expect(
			aoLadoDaBusca.parentElement?.classList.contains("topo-ferramentas"),
		).toBe(true);
		expect(
			noMenu.parentElement?.classList.contains("menu-do-celular-util"),
		).toBe(true);
	});

	it.each([
		[
			"no login, o Entrar é a página atual",
			"/login",
			{ href: "/login", atual: "page", traco: true },
			{ href: "/perfil", atual: null, traco: true },
		],
		[
			"no perfil, o Conta é a página atual",
			"/perfil",
			{ href: "/login", atual: null, traco: false },
			{ href: "/perfil", atual: "page", traco: true },
		],
		[
			"no cadastro, os dois ficam marcados, sem página atual",
			"/cadastro/confirmar",
			{ href: "/login", atual: null, traco: true },
			{ href: "/perfil", atual: null, traco: true },
		],
	])("%s", async (_, endereco, esperadoEntrar, esperadoConta) => {
		const { entrar, conta: aberta } = await conta(endereco);

		expect(entrar).toEqual(esperadoEntrar);
		expect(aberta).toEqual(esperadoConta);
	});
});

describe("a marca da conta aberta no <html>", () => {
	const marcado = () => document.documentElement.hasAttribute(CONTA_ABERTA);

	it("com o API_URL e a chave da sessão, o <html> fica marcado, e a marca sai quando a sessão acaba", async () => {
		ambiente.API_URL = "https://api.exemplo.test";
		localStorage.setItem(CHAVE_SESSAO, "1-2-3-4");
		await mostrar();

		expect(marcado()).toBe(true);

		// O Sair e a exclusão da conta apagam a chave (lib/progresso.ts).
		act(() => encerrarProgressoNaConta());
		expect(marcado()).toBe(false);

		// O login grava a chave antes de ir para o perfil.
		act(() => anotarEntradaNaConta());
		expect(marcado()).toBe(true);
	});

	it("quando outra aba sai da conta, a marca sai desta também", async () => {
		ambiente.API_URL = "https://api.exemplo.test";
		localStorage.setItem(CHAVE_SESSAO, "1-2-3-4");
		await mostrar();
		expect(marcado()).toBe(true);

		localStorage.removeItem(CHAVE_SESSAO);
		act(() => {
			window.dispatchEvent(new StorageEvent("storage", { key: CHAVE_SESSAO }));
		});

		expect(marcado()).toBe(false);
	});

	it("na hidratação, com o retrato de visitante, a marca do roteiro do <head> fica", async () => {
		ambiente.API_URL = "https://api.exemplo.test";
		localStorage.setItem(CHAVE_SESSAO, "1-2-3-4");
		document.documentElement.setAttribute(CONTA_ABERTA, "");
		hidratacao.retratoDeVisitante = true;
		const trocas: boolean[] = [];
		const observador = new MutationObserver(() => trocas.push(marcado()));
		observador.observe(document.documentElement, {
			attributeFilter: [CONTA_ABERTA],
		});

		await mostrar();
		await act(async () => {});
		observador.disconnect();

		expect(marcado()).toBe(true);
		// Nenhuma troca: a palavra não pisca de "Conta" para "Entrar".
		expect(trocas.filter((aberta) => !aberta)).toEqual([]);
	});

	it.each([
		["sem a chave", "https://api.exemplo.test", null],
		["sem o API_URL", "", "1-2-3-4"],
	])("%s, o <html> fica sem a marca", async (_, endereco, chave) => {
		ambiente.API_URL = endereco;
		if (chave) localStorage.setItem(CHAVE_SESSAO, chave);
		document.documentElement.setAttribute(CONTA_ABERTA, "");
		await mostrar();

		expect(marcado()).toBe(false);
	});

	it("o roteiro do <head> marca o <html> só com a chave, e não quebra sem o armazenamento", () => {
		const rodar = new Function(ROTEIRO_DA_CONTA);

		rodar();
		expect(marcado()).toBe(false);

		localStorage.setItem(CHAVE_SESSAO, "1-2-3-4");
		rodar();
		expect(marcado()).toBe(true);

		// No navegador que bloqueia o armazenamento, ler a chave dá erro: fica o
		// "Entrar", sem erro no console.
		document.documentElement.removeAttribute(CONTA_ABERTA);
		const ler = vi
			.spyOn(Storage.prototype, "getItem")
			.mockImplementation(() => {
				throw new DOMException("bloqueado", "SecurityError");
			});
		expect(() => rodar()).not.toThrow();
		expect(marcado()).toBe(false);
		ler.mockRestore();
	});
});
