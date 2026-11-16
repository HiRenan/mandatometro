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
} from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pedirSaida, type ResultadoDaSaida } from "@/lib/newsletter";
import { Route as RotaDeSair } from "@/routes/newsletter/sair";
import { PaginaDeSair } from "./pagina-de-sair";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site. O pedido à API fica simulado: o que cada resposta vira está no
// lib/newsletter.test.ts, e aqui vale o que a página faz com o resultado.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));
vi.mock("@/lib/newsletter", async (original) => ({
	...(await original<typeof import("@/lib/newsletter")>()),
	pedirSaida: vi.fn(),
}));

const sair = vi.mocked(pedirSaida);
const CODIGO = "123e4567-e89b-42d3-a456-426614174000";
const EXPLICA =
	"Com o botão, o seu e-mail sai da lista e as edições de domingo param de chegar. Antes dele, nada muda.";
const INCOMPLETO =
	"Este link está incompleto. Abra de novo o link de saída que vem no fim de cada e-mail da newsletter.";
const SAIU =
	"O seu e-mail não está mais na lista, e as próximas edições não vão chegar.";

let fetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
	sair.mockReset();
	// Nenhum pedido sai da página sem o clique: nem a API, nem outro endereço.
	fetch = vi.fn();
	vi.stubGlobal("fetch", fetch);
	// O roteador rola a janela ao trocar de página, e o jsdom não rola.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

/** A página num site de mentira, com a página inicial para os links. */
async function mostrar(opcoes: { codigo?: string; comApi?: boolean } = {}) {
	// Sem o `codigo` nas opções, vale o do link; com ele, mesmo vazio, vale o dado.
	const codigo = "codigo" in opcoes ? opcoes.codigo : CODIGO;
	const comApi = opcoes.comApi ?? true;
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const inicio = createRoute({
		getParentRoute: () => raiz,
		path: "/",
		component: () => <h1>Início</h1>,
	});
	const pagina = createRoute({
		getParentRoute: () => raiz,
		path: "/newsletter/sair",
		component: () => <PaginaDeSair codigo={codigo} comApi={comApi} />,
	});
	const router = createRouter({
		routeTree: raiz.addChildren([inicio, pagina]),
		history: createMemoryHistory({ initialEntries: ["/newsletter/sair"] }),
	});
	render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { level: 1 });
	return router;
}

function botao() {
	return screen.queryByRole("button", { name: "Confirmar a saída" });
}

/** O texto à vista: o aviso do leitor de tela repete o mesmo texto. */
function naTela(texto: string) {
	return screen.queryByText(texto, {
		ignore: "[role='status'], script, style",
	});
}

function aviso() {
	return screen.getByRole("status").textContent;
}

async function confirmar() {
	const confirmacao = botao() as HTMLElement;
	confirmacao.focus();
	await act(async () => {
		fireEvent.click(confirmacao, { detail: 1 });
	});
	return confirmacao;
}

describe("a página de sair", () => {
	it("com o código, explica o que o botão faz, e abrir a página não chama a API", async () => {
		await mostrar();

		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"Sair da newsletter",
		);
		expect(naTela(EXPLICA)).toBeTruthy();
		expect(botao()?.getAttribute("type")).toBe("submit");
		expect(
			screen
				.getByRole("link", { name: "Ir para o início" })
				.getAttribute("href"),
		).toBe("/");
		expect(sair).not.toHaveBeenCalled();
		expect(fetch).not.toHaveBeenCalled();
		expect(aviso()).toBe("");
	});

	it("no clique, manda a saída com o código, diz que está confirmando e não manda de novo", async () => {
		let soltar: (resultado: ResultadoDaSaida) => void = () => {};
		sair.mockImplementation(
			() =>
				new Promise((resolver) => {
					soltar = resolver;
				}),
		);
		await mostrar();

		const confirmacao = await confirmar();

		expect(sair.mock.calls).toEqual([[CODIGO]]);
		expect(naTela("Confirmando a saída…")).toBeTruthy();
		expect(aviso()).toBe("Confirmando a saída…");
		expect(confirmacao.getAttribute("aria-disabled")).toBe("true");
		expect(document.activeElement).toBe(confirmacao);
		// O clique no botão com o aria-disabled nem chega a enviar o formulário.
		let enviou = true;
		await act(async () => {
			enviou = fireEvent.click(confirmacao, { detail: 2 });
			fireEvent.submit(confirmacao.closest("form") as HTMLFormElement);
		});
		expect(enviou).toBe(false);
		expect(sair).toHaveBeenCalledTimes(1);

		await act(async () => {
			soltar({ tipo: "saiu" });
		});
		expect(sair).toHaveBeenCalledTimes(1);
	});

	it("com a saída feita, o título e o texto mudam, o aviso anuncia, e o foco vai para o “Inscrever-se de novo”", async () => {
		sair.mockResolvedValue({ tipo: "saiu" });
		await mostrar();

		await confirmar();

		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"Você saiu da newsletter.",
		);
		expect(naTela(SAIU)).toBeTruthy();
		expect(naTela(EXPLICA)).toBeNull();
		expect(aviso()).toBe(`Você saiu da newsletter. ${SAIU}`);
		expect(botao()).toBeNull();
		const deNovo = screen.getByRole("link", { name: "Inscrever-se de novo" });
		expect(deNovo.getAttribute("href")).toBe("/#newsletter");
		expect(document.activeElement).toBe(deNovo);
	});

	it("o segundo clique de um clique duplo no botão não segue o “Inscrever-se de novo”, que surge no lugar dele", async () => {
		sair.mockResolvedValue({ tipo: "saiu" });
		const router = await mostrar();
		await confirmar();
		const deNovo = screen.getByRole("link", { name: "Inscrever-se de novo" });

		await act(async () => {
			fireEvent.click(deNovo, { detail: 2 });
		});
		expect(router.state.location.pathname).toBe("/newsletter/sair");

		// Um clique novo, de propósito, leva à inscrição.
		await act(async () => {
			fireEvent.click(deNovo, { detail: 1 });
		});
		await screen.findByRole("heading", { level: 1, name: "Início" });
		expect(router.state.location.pathname).toBe("/");
		expect(router.state.location.hash).toBe("newsletter");
	});

	it.each([
		[
			"fora-do-ar",
			"Não conseguimos confirmar a saída agora. Espere alguns minutos e tente de novo.",
		],
		[
			"sem-conexao",
			"Não deu para confirmar a saída. Confira a internet e tente de novo.",
		],
	] as const)(
		"com %s, diz o que fazer e deixa o botão para tentar de novo",
		async (tipo, texto) => {
			sair.mockResolvedValue({ tipo });
			await mostrar();

			const confirmacao = await confirmar();

			expect(naTela(texto)).toBeTruthy();
			expect(aviso()).toBe(texto);
			expect(naTela(EXPLICA)).toBeTruthy();
			expect(botao()).toBe(confirmacao);
			expect(confirmacao.hasAttribute("aria-disabled")).toBe(false);
			expect(document.activeElement).toBe(confirmacao);

			sair.mockResolvedValue({ tipo: "saiu" });
			await confirmar();
			expect(sair).toHaveBeenCalledTimes(2);
			expect(naTela(texto)).toBeNull();
			expect(naTela(SAIU)).toBeTruthy();
		},
	);

	it("com o pedido que falha sem resposta, diz para conferir a internet e deixa o botão", async () => {
		sair.mockRejectedValue(new TypeError("Failed to fetch"));
		await mostrar();

		const confirmacao = await confirmar();

		expect(
			naTela(
				"Não deu para confirmar a saída. Confira a internet e tente de novo.",
			),
		).toBeTruthy();
		expect(botao()).toBe(confirmacao);
		expect(confirmacao.hasAttribute("aria-disabled")).toBe(false);
	});

	it("com o código que a API recusa, o link está incompleto, e o foco vai para o “Ir para o início”", async () => {
		sair.mockResolvedValue({ tipo: "link-invalido" });
		await mostrar();

		await confirmar();

		expect(naTela(INCOMPLETO)).toBeTruthy();
		expect(aviso()).toBe(INCOMPLETO);
		expect(botao()).toBeNull();
		expect(document.activeElement).toBe(
			screen.getByRole("link", { name: "Ir para o início" }),
		);
	});

	it.each([
		["sem o código", undefined],
		["com o código vazio", ""],
		["com o código cortado", CODIGO.slice(0, -1)],
		["com outra coisa no lugar do código", "abc"],
	])(
		"%s, o link está incompleto, sem o botão e sem chamar a API",
		async (_, codigo) => {
			await mostrar({ codigo });

			expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
				"Sair da newsletter",
			);
			expect(naTela(INCOMPLETO)).toBeTruthy();
			expect(botao()).toBeNull();
			expect(document.querySelector("form")).toBeNull();
			expect(sair).not.toHaveBeenCalled();
			expect(fetch).not.toHaveBeenCalled();
		},
	);

	it("sem a API, avisa que a newsletter ainda não funciona neste endereço, sem o botão", async () => {
		await mostrar({ comApi: false });

		expect(
			naTela("A newsletter ainda não funciona neste endereço do site."),
		).toBeTruthy();
		expect(botao()).toBeNull();
		expect(sair).not.toHaveBeenCalled();
	});

	it("deixa o painel de azulejos fora do leitor de tela", async () => {
		await mostrar();

		const painel = document.querySelector(".mural");
		expect(painel?.closest("[aria-hidden='true']")).not.toBeNull();
	});

	it("no HTML do servidor, o botão não envia nada sem o JavaScript, e o noscript explica", async () => {
		const raiz = document.createElement("div");
		const router = createRouter({
			routeTree: createRootRoute({
				component: () => <PaginaDeSair codigo={CODIGO} comApi />,
			}),
			history: createMemoryHistory({ initialEntries: ["/newsletter/sair"] }),
		});
		await router.load();
		raiz.innerHTML = renderToString(<RouterProvider router={router} />)
			.replaceAll("<noscript>", "<div data-noscript>")
			.replaceAll("</noscript>", "</div>");

		expect(raiz.querySelector("form")?.getAttribute("action")).toMatch(
			/^javascript:/,
		);
		expect(raiz.querySelector("[data-noscript]")?.textContent).toBe(
			"Para confirmar a saída, o navegador precisa do JavaScript ligado. Sem ele, use a opção de cancelar a inscrição do seu programa de e-mail.",
		);
		expect(raiz.querySelector("[role='status']")?.textContent).toBe("");
	});
});

describe("a rota da página de sair", () => {
	it("não tem loader: nada sai ao abrir a página nem ao passar o ponteiro num link para ela", () => {
		expect(RotaDeSair.options.loader).toBeUndefined();
		expect(RotaDeSair.options.beforeLoad).toBeUndefined();
	});

	it("lê o código da busca como texto", () => {
		const ler = RotaDeSair.options.validateSearch as (
			busca: Record<string, unknown>,
		) => { codigo?: string };

		expect(ler({ codigo: CODIGO })).toEqual({ codigo: CODIGO });
		// O roteador lê "?codigo=123" como número.
		expect(ler({ codigo: 123 })).toEqual({ codigo: "123" });
		expect(ler({})).toEqual({ codigo: undefined });
	});

	it("fica fora dos buscadores, do Referer e do cache", () => {
		const cabeca = RotaDeSair.options.head?.({} as never) as {
			meta: Array<Record<string, string>>;
		};
		expect(cabeca.meta).toContainEqual({
			title: "Sair da newsletter · Mandatômetro",
		});
		expect(cabeca.meta).toContainEqual({ name: "robots", content: "noindex" });
		expect(cabeca.meta).toContainEqual({
			name: "referrer",
			content: "no-referrer",
		});

		expect(RotaDeSair.options.headers?.({} as never)).toEqual({
			"X-Robots-Tag": "noindex",
			"Referrer-Policy": "no-referrer",
			"Cache-Control": "no-store",
		});
	});
});
