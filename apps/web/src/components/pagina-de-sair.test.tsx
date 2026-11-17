// @vitest-environment jsdom

import { format } from "node:util";
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
	// A janela do jsdom é a mesma para os testes do arquivo: cada um começa com o
	// armazenamento vazio, na mesma URL e sem estado no histórico.
	localStorage.clear();
	sessionStorage.clear();
	window.history.replaceState(null, "", "/");
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
	// A página abre como pelo link do e-mail, com o código no endereço.
	const endereco =
		codigo === undefined
			? "/newsletter/sair"
			: `/newsletter/sair?codigo=${encodeURIComponent(codigo)}`;
	const router = createRouter({
		routeTree: raiz.addChildren([inicio, pagina]),
		history: createMemoryHistory({ initialEntries: [endereco] }),
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

/** O título da página no HTML do servidor, antes do JavaScript. */
async function tituloDoServidor(props: {
	codigo: string | undefined;
	comApi: boolean;
}) {
	const router = createRouter({
		routeTree: createRootRoute({
			component: () => <PaginaDeSair {...props} />,
		}),
		history: createMemoryHistory({ initialEntries: ["/newsletter/sair"] }),
	});
	await router.load();
	const raiz = document.createElement("div");
	raiz.innerHTML = renderToString(<RouterProvider router={router} />);
	return raiz.querySelector("h1") as HTMLHeadingElement;
}

describe("a página de sair", () => {
	it("com o código, explica o que o botão faz, e abrir a página não chama a API", async () => {
		await mostrar();

		expect(
			screen.getByRole("heading", { level: 1, name: "Sair da newsletter" }),
		).toBeTruthy();
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

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "Você saiu da newsletter.",
			}),
		).toBeTruthy();
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
		["antes do clique", () => mostrar()],
		[
			"enquanto confirma",
			async () => {
				sair.mockReturnValue(new Promise(() => {}));
				const router = await mostrar();
				await confirmar();
				return router;
			},
		],
		[
			"depois da saída",
			async () => {
				sair.mockResolvedValue({ tipo: "saiu" });
				const router = await mostrar();
				await confirmar();
				return router;
			},
		],
		[
			"com a API fora do ar",
			async () => {
				sair.mockResolvedValue({ tipo: "fora-do-ar" });
				const router = await mostrar();
				await confirmar();
				return router;
			},
		],
		[
			// O "Ir para o início" recebe o foco quando o botão some, e o segundo
			// clique de um clique duplo no botão cairia nele.
			"com o código que a API recusa",
			async () => {
				sair.mockResolvedValue({ tipo: "link-invalido" });
				const router = await mostrar();
				await confirmar();
				return router;
			},
		],
		["sem a API", () => mostrar({ comApi: false })],
		["com o link incompleto", () => mostrar({ codigo: "abc" })],
	])(
		"%s, o segundo clique de um clique duplo não segue o “Ir para o início”",
		async (_, preparar) => {
			const router = await preparar();
			const inicio = screen.getByRole("link", { name: "Ir para o início" });

			await act(async () => {
				fireEvent.click(inicio, { detail: 2 });
			});
			expect(router.state.location.pathname).toBe("/newsletter/sair");

			// Um clique novo, de propósito, leva ao início.
			await act(async () => {
				fireEvent.click(inicio, { detail: 1 });
			});
			await screen.findByRole("heading", { level: 1, name: "Início" });
			expect(router.state.location.pathname).toBe("/");
		},
	);

	it("o título guarda a altura do mais alto dos dois desde o HTML do servidor: as ações não descem quando ele muda", async () => {
		const titulo = await tituloDoServidor({ codigo: CODIGO, comApi: true });
		const reservas = [...titulo.querySelectorAll("[aria-hidden='true']")];

		// A 768 px, "Sair da newsletter" cabe numa linha, e "Você saiu da
		// newsletter." quebra em duas. Com os dois na mesma célula da grade,
		// invisíveis, o título já tem a altura do mais alto, e o "Inscrever-se de
		// novo" nasce no lugar do botão.
		expect(reservas.map((reserva) => reserva.textContent)).toEqual([
			"Sair da newsletter",
			"Você saiu da newsletter.",
		]);
		expect(
			reservas.every(
				(reserva) =>
					reserva.parentElement === titulo &&
					reserva.classList.contains("invisible"),
			),
		).toBe(true);
		expect(
			titulo.querySelector(":scope > :not([aria-hidden])")?.textContent,
		).toBe("Sair da newsletter");
	});

	it.each([
		["sem a API", { codigo: CODIGO, comApi: false }],
		["com o link incompleto", { codigo: "abc", comApi: true }],
	])("%s, o título não muda e não guarda lugar", async (_, props) => {
		const titulo = await tituloDoServidor(props);

		expect(titulo.textContent).toBe("Sair da newsletter");
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

describe("o código de saída fica só no pedido", () => {
	it("não vai para a URL, para o armazenamento do navegador, para os cookies nem para o console, nem quando a página sai da tela", async () => {
		// Todos os métodos do console, e não só os do log.
		const console_ = (Object.keys(console) as (keyof Console)[])
			.filter((metodo) => typeof console[metodo] === "function")
			.map((metodo) => vi.spyOn(console, metodo));
		const janela = {
			endereco: window.location.href,
			estado: window.history.state,
		};
		// O código chega no endereço, pelo link do e-mail, e de lá não sai. O
		// "antes" do roteador é esse endereço, e não o que ele mostra depois de
		// montar: o que a página gravasse ao abrir já estaria lá.
		const chegada = `/newsletter/sair?codigo=${CODIGO}`;
		const router = await mostrar();

		// Uma saída sem resposta e outra que dá certo, como a pessoa faria.
		sair.mockRejectedValueOnce(new TypeError("Failed to fetch"));
		await confirmar();
		sair.mockResolvedValueOnce({ tipo: "saiu" });
		await confirmar();

		expect(sair.mock.calls).toEqual([[CODIGO], [CODIGO]]);
		expect(naTela(SAIU)).toBeTruthy();
		// O roteador dos testes é de memória: o endereço e o estado dele não
		// chegam à janela, e cada um se confere à parte. Ele continua na entrada
		// da chegada, sem parâmetro, trecho ou estado novo com o código.
		expect(router.history.location.href).toBe(chegada);
		expect(router.history.length).toBe(1);
		expect(JSON.stringify(router.history.location.state)).not.toContain(CODIGO);

		// A pessoa sai pelo "Inscrever-se de novo", com um clique simples, e
		// depois o site inteiro sai da tela: o que a página gravasse ao sair
		// também conta. O link leva à inscrição sem o código.
		await act(async () => {
			fireEvent.click(
				screen.getByRole("link", { name: "Inscrever-se de novo" }),
				{ detail: 1 },
			);
		});
		await screen.findByRole("heading", { level: 1, name: "Início" });
		expect(router.history.location.href).toBe("/#newsletter");
		expect(JSON.stringify(router.history.location.state)).not.toContain(CODIGO);
		cleanup();

		// Com a página já fora da tela: a janela, o armazenamento, os cookies e
		// o console.
		expect(window.location.href).toBe(janela.endereco);
		expect(window.history.state).toEqual(janela.estado);
		expect(
			`${window.location.href} ${JSON.stringify(window.history.state)}`,
		).not.toContain(CODIGO);
		expect(localStorage.length).toBe(0);
		expect(sessionStorage.length).toBe(0);
		expect(document.cookie).toBe("");
		// O texto que o console escreveria com cada chamada.
		for (const espiao of console_) {
			for (const chamada of espiao.mock.calls) {
				expect(format(...chamada)).not.toContain(CODIGO);
			}
		}
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
