// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
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
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { PaginaNaBusca } from "@/lib/busca";
import { ProvedorDaBusca } from "./busca";

// As funções do servidor que entregam os índices são simuladas: cada teste diz
// o que elas devolvem. As páginas são inventadas, sem pessoa nenhuma.
const servidor = vi.hoisted(() => ({
	buscarIndiceDoConteudo: vi.fn(),
	buscarIndiceDasEdicoes: vi.fn(),
}));
vi.mock("@/lib/busca/busca.functions", () => servidor);

const TRILHA: PaginaNaBusca = {
	tipo: "trilha",
	endereco: "/trilhas/processo",
	titulo: "Processo legislativo",
	resumo: "Como uma ideia vira lei.",
	secoes: [],
	posicao: 1,
};

const ARTIGO: PaginaNaBusca = {
	tipo: "artigo",
	endereco: "/trilhas/processo/sancao-ou-veto",
	titulo: "Sanção ou veto",
	resumo: "O que a Presidência faz com o projeto aprovado.",
	secoes: [
		{
			id: "o-veto",
			titulo: "O veto",
			texto: "O veto pode ser total ou parcial.",
		},
	],
	posicao: 2,
	trilha: "Processo legislativo",
};

const EDICAO: PaginaNaBusca = {
	tipo: "edicao",
	endereco: "/edicoes/7",
	titulo: "Jornal legislativo — 09 a 15/11/2026",
	resumo: "9 a 15 de novembro de 2026",
	abertura: "Congresso mantém um veto",
	inicio: "2026-11-09",
	fim: "2026-11-15",
	secoes: [
		{
			id: "item-1",
			titulo: "Congresso mantém um veto",
			texto: "Os parlamentares mantiveram o veto da Presidência.",
		},
	],
};

const DICA =
	"Escreva um assunto, como veto, emenda ou Senado. A busca procura nas trilhas, nos artigos e nas edições.";
const DICA_SEM_EDICOES =
	"Escreva um assunto, como veto, emenda ou Senado. A busca procura nas trilhas e nos artigos.";

/** Uma promessa que não termina: o índice que ainda não chegou. */
function semFim<T>(): Promise<T> {
	return new Promise<T>(() => {});
}

beforeAll(() => {
	// O jsdom não tem o showModal nem o close da <dialog>: aqui, eles só abrem
	// e fecham, e o close avisa, como no navegador.
	HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
		this.setAttribute("open", "");
	};
	HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
		if (!this.hasAttribute("open")) {
			return;
		}
		this.removeAttribute("open");
		this.dispatchEvent(new Event("close"));
	};
	// O router desce até o trecho do endereço, e o jsdom não rola.
	Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
	servidor.buscarIndiceDoConteudo.mockImplementation(async () => [
		TRILHA,
		ARTIGO,
	]);
	servidor.buscarIndiceDasEdicoes.mockImplementation(async () => ({
		tipo: "edicoes",
		paginas: [EDICAO],
	}));
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
	servidor.buscarIndiceDoConteudo.mockReset();
	servidor.buscarIndiceDasEdicoes.mockReset();
});

/** O site de mentira com a busca, as páginas dos links e um botão antes dela. */
async function mostrar({
	comEdicoes = true,
	endereco = "/",
}: {
	comEdicoes?: boolean;
	endereco?: string;
} = {}) {
	const raiz = createRootRoute({
		component: () => (
			<ProvedorDaBusca comEdicoes={comEdicoes}>
				<button type="button">Antes da busca</button>
				<main id="conteudo">
					<Outlet />
				</main>
			</ProvedorDaBusca>
		),
	});
	const pagina = (path: string, conteudo: () => React.ReactNode = () => null) =>
		createRoute({ getParentRoute: () => raiz, path, component: conteudo });
	const router = createRouter({
		routeTree: raiz.addChildren([
			pagina("/", () => <h1>Início</h1>),
			pagina("/trilhas/$trilha"),
			pagina("/trilhas/$trilha/$artigo", () => (
				<>
					<h1>Sanção ou veto</h1>
					<h2 id="o-veto">O veto</h2>
				</>
			)),
			pagina("/edicoes/$id", () => <h1>Uma edição</h1>),
		]),
		history: createMemoryHistory({ initialEntries: [endereco] }),
	});
	render(<RouterProvider router={router} />);
	await screen.findByRole("button", { name: "Antes da busca" });
	return router;
}

/** O Ctrl+K na página; devolve se o navegador seguiria com a tecla. */
function ctrlK(opcoes: Partial<KeyboardEventInit> = {}): boolean {
	return fireEvent.keyDown(document.body, {
		key: "k",
		ctrlKey: true,
		...opcoes,
	});
}

/** Abre a busca pelo Ctrl+K e espera os índices. */
async function abrir() {
	ctrlK();
	const caixa = await screen.findByRole("dialog", { name: "Buscar no site" });
	const campo = within(caixa).getByRole("searchbox", {
		name: "Buscar no site",
	});
	await act(async () => {});
	return { caixa, campo: campo as HTMLInputElement };
}

function digitar(campo: HTMLElement, texto: string) {
	fireEvent.change(campo, { target: { value: texto } });
}

/**
 * A descrição de um link, pelo texto dos elementos do aria-describedby. A conta
 * da descrição do jsdom erra os espaços em volta do <mark> do trecho.
 */
function descricao(elemento: HTMLElement): string {
	return (elemento.getAttribute("aria-describedby") ?? "")
		.split(" ")
		.map((id) => document.getElementById(id)?.textContent)
		.join(" ");
}

describe("o atalho", () => {
	it("Ctrl+K abre a busca no lugar do atalho do navegador, com o foco no campo", async () => {
		await mostrar();

		expect(document.querySelector("dialog")).toBeNull();
		expect(ctrlK()).toBe(false);

		const { campo } = await abrir();
		expect(document.activeElement).toBe(campo);
	});

	it("⌘K também abre", async () => {
		await mostrar();

		expect(ctrlK({ ctrlKey: false, metaKey: true })).toBe(false);
		expect(
			await screen.findByRole("dialog", { name: "Buscar no site" }),
		).toBeTruthy();
	});

	it("com Alt ou Shift, ou no meio de uma composição do teclado, a tecla segue para o navegador", async () => {
		await mostrar();

		expect(ctrlK({ altKey: true })).toBe(true);
		expect(ctrlK({ shiftKey: true })).toBe(true);
		expect(ctrlK({ isComposing: true })).toBe(true);
		expect(document.querySelector("dialog")).toBeNull();
	});

	it("com a caixa aberta, o Ctrl+K volta ao campo e seleciona o texto", async () => {
		await mostrar();
		const { caixa, campo } = await abrir();
		digitar(campo, "veto");
		within(caixa).getByRole("button", { name: "Fechar" }).focus();

		ctrlK();

		expect(document.activeElement).toBe(campo);
		expect([campo.selectionStart, campo.selectionEnd]).toEqual([0, 4]);
	});
});

describe("os estados", () => {
	it("nada digitado: a dica, com as edições", async () => {
		await mostrar();
		const { caixa } = await abrir();

		expect(within(caixa).getByText(DICA)).toBeTruthy();
	});

	it("sem a API: a dica fala só das trilhas e dos artigos, e a busca não pede as edições", async () => {
		await mostrar({ comEdicoes: false });
		const { caixa, campo } = await abrir();

		expect(within(caixa).getByText(DICA_SEM_EDICOES)).toBeTruthy();
		digitar(campo, "veto");
		expect(within(caixa).getByText("1 resultado")).toBeTruthy();
		expect(servidor.buscarIndiceDasEdicoes).not.toHaveBeenCalled();
	});

	it("carregando: a pessoa digitou antes de o índice chegar", async () => {
		servidor.buscarIndiceDoConteudo.mockImplementation(semFim);
		await mostrar();
		const { caixa, campo } = await abrir();

		digitar(campo, "veto");

		expect(within(caixa).getByText("Carregando a busca…")).toBeTruthy();
	});

	it("resultados: a contagem e cada resultado com o título no link, o tipo e o trecho, com a palavra em negrito", async () => {
		await mostrar();
		const { caixa, campo } = await abrir();

		digitar(campo, "veto");

		expect(within(caixa).getByText("2 resultados")).toBeTruthy();
		const links = within(caixa).getAllByRole("link");
		expect(links.map((link) => link.getAttribute("href"))).toEqual([
			"/trilhas/processo/sancao-ou-veto",
			"/edicoes/7#item-1",
		]);
		expect(
			descricao(within(caixa).getByRole("link", { name: "Sanção ou veto" })),
		).toBe("Artigo 2 · Processo legislativo O veto pode ser total ou parcial.");
		expect(
			descricao(
				within(caixa).getByRole("link", {
					name: "Jornal legislativo — 09 a 15/11/2026",
				}),
			),
		).toBe(
			"Edição · 9 a 15 de novembro de 2026 Congresso mantém um veto — Os parlamentares mantiveram o veto da Presidência.",
		);
		expect(
			within(caixa)
				.getAllByText("veto", { selector: "mark" })
				.map((marca) => marca.textContent),
		).toEqual(["veto", "veto"]);
	});

	it("a trilha diz que é trilha", async () => {
		await mostrar();
		const { caixa, campo } = await abrir();

		digitar(campo, "ideia");

		expect(
			descricao(
				within(caixa).getByRole("link", { name: "Processo legislativo" }),
			),
		).toBe("Trilha Como uma ideia vira lei.");
	});

	it("nenhum resultado: diz o que foi procurado e o que tentar", async () => {
		await mostrar();
		const { caixa, campo } = await abrir();

		digitar(campo, "constituicao");

		expect(
			within(caixa).getByText(
				"Nenhum resultado para “constituicao”. Confira como a palavra está escrita ou tente só o começo dela.",
			),
		).toBeTruthy();
		expect(within(caixa).queryByRole("list")).toBeNull();
	});

	it("erro: o índice não chegou, e o Tentar de novo pede outra vez", async () => {
		servidor.buscarIndiceDoConteudo.mockImplementation(async () => {
			throw new Error("A busca não carregou.");
		});
		await mostrar();
		const { caixa, campo } = await abrir();
		digitar(campo, "veto");

		expect(
			within(caixa).getByText(
				"A busca não carregou. Confira a internet e tente de novo.",
			),
		).toBeTruthy();

		servidor.buscarIndiceDoConteudo.mockImplementation(async () => [
			TRILHA,
			ARTIGO,
		]);
		fireEvent.click(
			within(caixa).getByRole("button", { name: "Tentar de novo" }),
		);

		expect(await within(caixa).findByText("2 resultados")).toBeTruthy();
		expect(servidor.buscarIndiceDoConteudo).toHaveBeenCalledTimes(2);
	});

	it("edições a caminho: as trilhas e os artigos já aparecem", async () => {
		servidor.buscarIndiceDasEdicoes.mockImplementation(semFim);
		await mostrar();
		const { caixa, campo } = await abrir();

		digitar(campo, "veto");

		expect(within(caixa).getByText("1 resultado")).toBeTruthy();
		expect(
			within(caixa).getByText("Procurando também nas edições…"),
		).toBeTruthy();
	});

	it("erro só das edições: as trilhas e os artigos continuam, e o Tentar de novo pede as edições", async () => {
		servidor.buscarIndiceDasEdicoes.mockImplementation(async () => {
			throw new Error("As edições não carregaram.");
		});
		await mostrar();
		const { caixa, campo } = await abrir();
		digitar(campo, "veto");

		expect(within(caixa).getByText("1 resultado")).toBeTruthy();
		expect(
			within(caixa).getByText(
				"As edições ficaram fora desta busca: o servidor não respondeu.",
			),
		).toBeTruthy();

		servidor.buscarIndiceDasEdicoes.mockImplementation(async () => ({
			tipo: "edicoes",
			paginas: [EDICAO],
		}));
		fireEvent.click(
			within(caixa).getByRole("button", { name: "Tentar de novo" }),
		);

		expect(await within(caixa).findByText("2 resultados")).toBeTruthy();
		expect(servidor.buscarIndiceDoConteudo).toHaveBeenCalledTimes(1);
	});

	it("o leitor de tela ouve a contagem 400 ms depois da última tecla", async () => {
		await mostrar();
		const { caixa, campo } = await abrir();
		const aviso = within(caixa).getByRole("status");
		vi.useFakeTimers();

		digitar(campo, "vet");
		act(() => vi.advanceTimersByTime(300));
		digitar(campo, "veto");
		act(() => vi.advanceTimersByTime(399));
		expect(aviso.textContent).toBe("");

		act(() => vi.advanceTimersByTime(1));
		expect(aviso.textContent).toBe("2 resultados para veto");
	});
});

describe("o teclado e os links", () => {
	it("o Esc fecha a caixa e devolve o foco a quem tinha; a busca volta ao reabrir", async () => {
		await mostrar();
		const antes = screen.getByRole("button", { name: "Antes da busca" });
		antes.focus();
		const { caixa, campo } = await abrir();
		digitar(campo, "veto");

		fireEvent.keyDown(campo, { key: "Escape" });

		expect(caixa.hasAttribute("open")).toBe(false);
		expect(document.activeElement).toBe(antes);

		ctrlK();
		expect(caixa.hasAttribute("open")).toBe(true);
		expect(campo.value).toBe("veto");
	});

	it("as setas andam do campo pela lista e voltam ao campo", async () => {
		await mostrar();
		const { caixa, campo } = await abrir();
		digitar(campo, "veto");
		const [primeiro, segundo] = within(caixa).getAllByRole("link");

		fireEvent.keyDown(campo, { key: "ArrowDown" });
		expect(document.activeElement).toBe(primeiro);
		fireEvent.keyDown(primeiro, { key: "ArrowDown" });
		expect(document.activeElement).toBe(segundo);
		fireEvent.keyDown(segundo, { key: "ArrowDown" });
		expect(document.activeElement).toBe(segundo);
		fireEvent.keyDown(segundo, { key: "ArrowUp" });
		expect(document.activeElement).toBe(primeiro);
		fireEvent.keyDown(primeiro, { key: "ArrowUp" });
		expect(document.activeElement).toBe(campo);
	});

	it("o Enter no campo abre o primeiro resultado, e a caixa fecha antes", async () => {
		const router = await mostrar();
		const { caixa, campo } = await abrir();
		digitar(campo, "veto");

		fireEvent.keyDown(campo, { key: "Enter" });

		expect(caixa.hasAttribute("open")).toBe(false);
		await waitFor(() =>
			expect(router.state.location.pathname).toBe(
				"/trilhas/processo/sancao-ou-veto",
			),
		);
	});

	it("o clique num resultado fecha a caixa e leva ao item", async () => {
		const router = await mostrar();
		const { caixa, campo } = await abrir();
		digitar(campo, "parlamentares");

		fireEvent.click(within(caixa).getByRole("link"));

		expect(caixa.hasAttribute("open")).toBe(false);
		await waitFor(() =>
			expect(router.state.location.href).toBe("/edicoes/7#item-1"),
		);
	});

	it("num resultado da página aberta, o foco vai ao intertítulo", async () => {
		await mostrar({ endereco: "/trilhas/processo/sancao-ou-veto" });
		const { caixa, campo } = await abrir();
		digitar(campo, "parcial");

		fireEvent.click(
			within(caixa).getByRole("link", { name: "Sanção ou veto" }),
		);

		await waitFor(() =>
			expect(document.activeElement).toBe(document.getElementById("o-veto")),
		);
	});
});

describe("o que a pessoa digita", () => {
	it("não vai ao endereço, ao armazenamento, ao console nem ao servidor", async () => {
		const guardar = vi.spyOn(Storage.prototype, "setItem");
		const registros = [
			vi.spyOn(console, "log"),
			vi.spyOn(console, "info"),
			vi.spyOn(console, "debug"),
		];
		const router = await mostrar();
		const { caixa, campo } = await abrir();

		digitar(campo, "votacao secreta");
		await within(caixa).findByText(/Nenhum resultado/);

		expect(router.state.location.href).toBe("/");
		expect(guardar).not.toHaveBeenCalled();
		for (const registro of registros) {
			expect(registro).not.toHaveBeenCalled();
		}
		expect(servidor.buscarIndiceDoConteudo.mock.calls).toEqual([[]]);
		expect(servidor.buscarIndiceDasEdicoes.mock.calls).toEqual([[]]);
	});
});
