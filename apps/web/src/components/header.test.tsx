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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
	const pagina = (path: string) =>
		createRoute({ getParentRoute: () => raiz, path, component: () => null });
	const router = createRouter({
		routeTree: raiz.addChildren(
			[
				"/",
				"/trilhas",
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
 * As duas listas dos links: a do meio (computador) e a de baixo (celular). O
 * jsdom não aplica o CSS e vê as duas; o navegador mostra uma de cada vez.
 */
function asListas(cabecalho: HTMLElement) {
	return within(cabecalho).getAllByRole("navigation", { name: "Principal" });
}

function linksDe(lista: HTMLElement) {
	return within(lista)
		.getAllByRole("link")
		.map((link) => [link.textContent, link.getAttribute("href")]);
}

describe("cabeçalho", () => {
	it("tem o pulo para o conteúdo, o nome, o lema e os três links nas duas listas", async () => {
		const cabecalho = await mostrar();
		const listas = asListas(cabecalho);

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
		// A conta fica fora das listas, ao lado da busca.
		expect(listas.map(linksDe)).toEqual([
			[
				["Início", "/"],
				["Trilhas", "/trilhas"],
				["Jogos", "/jogos"],
			],
			[
				["Início", "/"],
				["Trilhas", "/trilhas"],
				["Jogos", "/jogos"],
			],
		]);
	});

	it("onde o site tem a API, as edições entram nas duas listas, e elas dizem isso ao CSS", async () => {
		const cabecalho = await mostrar({ comEdicoes: true });
		const listas = asListas(cabecalho);

		for (const lista of listas) {
			expect(linksDe(lista)).toEqual([
				["Início", "/"],
				["Trilhas", "/trilhas"],
				["Jogos", "/jogos"],
				["Edições", "/edicoes"],
			]);
			// A coluna da letra grande depende de quantos links a lista tem.
			expect(lista.querySelector("ul")?.hasAttribute("data-com-edicoes")).toBe(
				true,
			);
		}
	});

	it("sem a API, ficam os três links, sem a marca das edições", async () => {
		const cabecalho = await mostrar();

		for (const lista of cabecalho.querySelectorAll(".topo-links")) {
			expect(lista.hasAttribute("data-com-edicoes")).toBe(false);
		}
		expect(within(cabecalho).queryByRole("link", { name: "Edições" })).toBe(
			null,
		);
	});

	it("numa edição, o traço fica nas edições, e o link não é a página atual", async () => {
		const cabecalho = await mostrar({
			comEdicoes: true,
			endereco: "/edicoes/7",
		});
		const edicoes = within(cabecalho).getAllByRole("link", { name: "Edições" });
		const inicio = within(cabecalho).getAllByRole("link", { name: "Início" });

		expect(edicoes).toHaveLength(2);
		for (const link of edicoes) {
			expect(link.hasAttribute("data-na-secao")).toBe(true);
			expect(link.hasAttribute("aria-current")).toBe(false);
		}
		for (const link of inicio) {
			expect(link.hasAttribute("data-na-secao")).toBe(false);
		}
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

		for (const lista of asListas(cabecalho)) {
			const [inicio, trilhas] = lista.querySelectorAll("a");
			expect(inicio.hasAttribute("data-na-secao")).toBe(true);
			expect(inicio.getAttribute("aria-current")).toBe("page");
			expect(trilhas.hasAttribute("data-na-secao")).toBe(false);
			expect(trilhas.hasAttribute("aria-current")).toBe(false);
		}
	});

	it("segue a ordem da tela: o nome, a lista do meio, a busca, a conta e a lista de baixo", async () => {
		// No computador, o CSS mostra a lista do meio: o Tab vai do nome aos links e
		// depois à busca e à conta, como na tela. No celular, mostra a de baixo: o
		// Tab vai do nome à busca e à conta, e depois aos links (header.tsx).
		const cabecalho = await mostrar();
		const nome = within(cabecalho).getByRole("link", { name: "Mandatômetro" });
		const [meio, baixo] = asListas(cabecalho);
		const entrada = within(cabecalho).getByRole("button", {
			name: "Buscar no site",
		});
		const conta = within(cabecalho).getByRole("link", { name: "Entrar" });
		const emOrdem = [nome, meio, entrada, conta, baixo];

		for (let i = 1; i < emOrdem.length; i++) {
			expect(
				emOrdem[i - 1].compareDocumentPosition(emOrdem[i]) &
					Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		}
		expect(meio.classList.contains("topo-nav-meio")).toBe(true);
		expect(baixo.classList.contains("topo-nav-baixo")).toBe(true);
		expect(entrada.getAttribute("aria-haspopup")).toBe("dialog");
		expect(entrada.getAttribute("aria-keyshortcuts")).toBe("Control+K Meta+K");
		expect(entrada.querySelector("kbd")?.getAttribute("aria-hidden")).toBe(
			"true",
		);
	});
});

describe("a entrada da conta", () => {
	/** Os dois links da conta: "Entrar" e "Conta", com a marca de cada um. */
	async function conta(endereco: string) {
		const cabecalho = await mostrar({ endereco });
		const estado = (link: HTMLElement) => ({
			href: link.getAttribute("href"),
			atual: link.getAttribute("aria-current"),
			traco: link.hasAttribute("data-na-secao"),
		});
		return {
			cabecalho,
			entrar: estado(within(cabecalho).getByRole("link", { name: "Entrar" })),
			conta: estado(within(cabecalho).getByRole("link", { name: "Conta" })),
		};
	}

	it("tem Entrar, que leva ao login, e Conta, que leva ao perfil, fora das listas e na mesma célula", async () => {
		const { cabecalho, entrar, conta: aberta } = await conta("/trilhas");
		const links = within(cabecalho).getAllByRole("link", {
			name: /^(Entrar|Conta)$/,
		});

		expect(entrar).toEqual({ href: "/login", atual: null, traco: false });
		expect(aberta).toEqual({ href: "/perfil", atual: null, traco: false });
		// O CSS esconde um deles pela marca do <html> (index.css).
		expect(links.map((link) => link.getAttribute("data-para"))).toEqual([
			"quem-nao-entrou",
			"quem-entrou",
		]);
		expect(links[0].parentElement).toBe(links[1].parentElement);
		expect(links[0].parentElement?.classList.contains("entrada-da-conta")).toBe(
			true,
		);
		expect(links[0].closest("nav")).toBe(null);
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
