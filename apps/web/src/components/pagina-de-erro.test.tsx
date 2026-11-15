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
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CARREGANDO, Carregando, TEMPOS_DO_CARREGANDO } from "./carregando";
import { PaginaDeErro } from "./pagina-de-erro";

beforeEach(() => {
	// O router avisa do erro no console, e o jsdom não rola a janela.
	vi.spyOn(console, "warn").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

/**
 * Um site de mentira com a página de erro e o carregando do router.tsx, e uma
 * página que pede dados, com um trecho (#caminho). Com a `rolagem`, o router
 * devolve a rolagem de cada endereço, como o do site (router.tsx).
 */
function abrir(
	carregar: () => Promise<string>,
	{ rolagem = false, endereco = "/artigo" } = {},
) {
	const raiz = createRootRoute({
		component: () => (
			<main id="conteudo">
				<Outlet />
			</main>
		),
	});
	const pagina = createRoute({
		getParentRoute: () => raiz,
		path: "/artigo",
		loader: carregar,
		component: function Pagina() {
			return (
				<>
					<h1>{pagina.useLoaderData()}</h1>
					<h2 id="caminho">O caminho</h2>
				</>
			);
		},
	});
	const trilhas = createRoute({
		getParentRoute: () => raiz,
		path: "/trilhas",
		component: () => <h1>Trilhas</h1>,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([pagina, trilhas]),
		history: createMemoryHistory({ initialEntries: [endereco] }),
		defaultErrorComponent: PaginaDeErro,
		defaultPendingComponent: Carregando,
		...TEMPOS_DO_CARREGANDO,
		scrollRestoration: rolagem,
	});
	render(<RouterProvider router={router} />);
	return router;
}

const semRede = () => Promise.reject(new TypeError("Failed to fetch"));

describe("página de erro", () => {
	it("diz em português o que aconteceu, sem a mensagem técnica", async () => {
		abrir(semRede);

		expect(
			await screen.findByRole("heading", { name: "A página não carregou" }),
		).toBeTruthy();
		expect(screen.getByRole("button", { name: "Tentar de novo" })).toBeTruthy();
		expect(
			screen.getByRole("link", { name: "Ver as trilhas" }).getAttribute("href"),
		).toBe("/trilhas");
		expect(document.body.textContent).not.toContain("Failed to fetch");
		expect(document.body.textContent).not.toContain("Something went wrong");
	});

	it("com a letra grande, o título tem teto, dentro do cartaz", async () => {
		abrir(semRede);

		const titulo = await screen.findByRole("heading", {
			name: "A página não carregou",
		});
		// O título cresce até "CARREGOU" encostar nas margens, e o cartaz dá as
		// margens de 20 px do celular (index.css).
		expect(titulo.classList.contains("letra-com-teto")).toBe(true);
		expect(
			titulo.closest("[data-pagina-de-erro]")?.classList.contains("cartaz"),
		).toBe(true);
	});

	it("o Tentar de novo refaz o pedido sem recarregar e leva o foco ao título", async () => {
		const carregar = vi
			.fn<() => Promise<string>>()
			.mockImplementationOnce(semRede)
			.mockResolvedValue("Quem pode propor uma lei");
		abrir(carregar);

		fireEvent.click(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		);

		const titulo = await screen.findByRole("heading", {
			name: "Quem pode propor uma lei",
		});
		expect(carregar).toHaveBeenCalledTimes(2);
		expect(document.activeElement).toBe(titulo);
	});

	// No "Tentar de novo", o endereço é o mesmo, e o router devolve a rolagem que a
	// página de erro tinha. Com a letra grande, o botão fica embaixo, e a página
	// nova chegava rolada, sem o título na tela (575 px a 1366 px, com a letra a
	// 200%).
	it("depois de um Tentar de novo que dá certo, a página chega do alto", async () => {
		const carregar = vi
			.fn<() => Promise<string>>()
			.mockImplementationOnce(semRede)
			.mockResolvedValue("Quem pode propor uma lei");
		abrir(carregar, { rolagem: true });
		const botao = await screen.findByRole("button", { name: "Tentar de novo" });
		// A pessoa rolou a página de erro até o botão. O jsdom não rola: o router lê
		// o scrollY e ouve o evento.
		vi.spyOn(window, "scrollY", "get").mockReturnValue(575);
		document.dispatchEvent(new Event("scroll"));
		const rolagens = vi.mocked(window.scrollTo);
		rolagens.mockClear();

		fireEvent.click(botao);
		const titulo = await screen.findByRole("heading", {
			name: "Quem pode propor uma lei",
		});
		await waitFor(() => expect(document.activeElement).toBe(titulo));

		// O router devolveu os 575 px, e a página voltou ao alto depois.
		expect(rolagens).toHaveBeenCalledWith(
			expect.objectContaining({ top: 575 }),
		);
		expect(rolagens.mock.lastCall).toEqual([0, 0]);
	});

	// Com o endereço num trecho da página (o #caminho do link da página inicial),
	// a página que chega começa nele, como numa navegação.
	it("num endereço com #caminho, a página que chega depois de um Tentar de novo começa no trecho", async () => {
		const carregar = vi
			.fn<() => Promise<string>>()
			.mockImplementationOnce(semRede)
			.mockResolvedValue("Quem pode propor uma lei");
		// As rolagens, na ordem: as da janela e as do trecho, que o jsdom não tem.
		const rolagens: unknown[][] = [];
		vi.mocked(window.scrollTo).mockImplementation((...valores: unknown[]) => {
			rolagens.push(["janela", ...valores]);
		});
		Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
			configurable: true,
			value: function (this: HTMLElement) {
				rolagens.push(["trecho", this.id]);
			},
		});
		try {
			abrir(carregar, { rolagem: true, endereco: "/artigo#caminho" });
			const botao = await screen.findByRole("button", {
				name: "Tentar de novo",
			});
			vi.spyOn(window, "scrollY", "get").mockReturnValue(575);
			document.dispatchEvent(new Event("scroll"));
			rolagens.length = 0;

			fireEvent.click(botao);
			const trecho = await screen.findByRole("heading", { name: "O caminho" });
			await waitFor(() => expect(document.activeElement).toBe(trecho));

			// O router devolveu os 575 px, e a página foi ao trecho depois.
			expect(rolagens).toContainEqual([
				"janela",
				expect.objectContaining({ top: 575 }),
			]);
			expect(rolagens.at(-1)).toEqual(["trecho", "caminho"]);
		} finally {
			Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
		}
	});

	it("se falha de novo, avisa e devolve o foco ao botão", async () => {
		const carregar = vi.fn(semRede);
		abrir(carregar);

		fireEvent.click(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		);

		expect(await screen.findByText(/^Ainda não deu\./)).toBeTruthy();
		expect(carregar).toHaveBeenCalledTimes(2);
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "Tentar de novo" }),
		);
	});

	// Durante a tentativa, o carregando ocupa o lugar da página de erro, e a que
	// volta é montada de novo. Ela volta parada: os azulejos não viram e o pé não
	// sobe outra vez (o data-de-novo, no movimento.css).
	it("na primeira visita, entra; depois de uma tentativa que falha, volta parada", async () => {
		abrir(semRede);
		const titulo = await screen.findByRole("heading", {
			name: "A página não carregou",
		});
		expect(
			titulo.closest("[data-pagina-de-erro]")?.hasAttribute("data-de-novo"),
		).toBe(false);

		fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		await screen.findByText(/^Ainda não deu\./);

		expect(
			document
				.querySelector("[data-pagina-de-erro]")
				?.hasAttribute("data-de-novo"),
		).toBe(true);
	});

	it("enquanto o Tentar de novo espera, diz que está carregando, com o foco na frase", async () => {
		let chegar: (titulo: string) => void = () => {};
		const carregar = vi
			.fn<() => Promise<string>>()
			.mockImplementationOnce(semRede)
			.mockImplementationOnce(
				() =>
					new Promise((resolver) => {
						chegar = resolver;
					}),
			);
		abrir(carregar);

		// O clique de verdade deixa o foco no botão, que sai da tela com a página.
		const botao = await screen.findByRole("button", { name: "Tentar de novo" });
		botao.focus();
		fireEvent.click(botao);

		const frase = await screen.findByText(CARREGANDO);
		expect(frase.getAttribute("role")).toBe("status");
		expect(document.activeElement).toBe(frase);

		chegar("Quem pode propor uma lei");
		const titulo = await screen.findByRole("heading", {
			name: "Quem pode propor uma lei",
		});
		expect(document.activeElement).toBe(titulo);
	});

	it("voltar pelo histórico à página que falhou não repete o aviso da tentativa antiga", async () => {
		const router = abrir(semRede);

		fireEvent.click(
			await screen.findByRole("button", { name: "Tentar de novo" }),
		);
		expect(await screen.findByText(/^Ainda não deu\./)).toBeTruthy();

		// Ainda sem rede, a pessoa vai para outra página e volta pelo histórico: a
		// entrada é a mesma, mas a tentativa ficou para trás.
		fireEvent.click(screen.getByRole("link", { name: "Ver as trilhas" }));
		await screen.findByRole("heading", { name: "Trilhas" });
		router.history.back();

		expect(
			await screen.findByRole("heading", { name: "A página não carregou" }),
		).toBeTruthy();
		// Nem na tela, nem no anúncio do leitor de tela.
		expect(screen.queryAllByText(/^Ainda não deu\./)).toEqual([]);
		expect(screen.getByRole("status").textContent).toBe("");
	});
});
