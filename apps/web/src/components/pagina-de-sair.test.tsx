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
	within,
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
	"O seu e-mail não está mais na lista, e as próximas edições não vão chegar. Elas continuam no site, em Edições, para ler quando quiser.";
const FORA_DO_AR =
	"Não conseguimos confirmar a saída agora. Espere alguns minutos e tente de novo.";
const SEM_CONEXAO =
	"Não deu para confirmar a saída. Confira a internet e tente de novo.";
const CONFIRMANDO = "Confirmando a saída…";
/** As frases que a abertura guarda: a de antes e a de depois da saída, e os dois erros. */
const FRASES_DA_ABERTURA = [EXPLICA, SAIU, FORA_DO_AR, SEM_CONEXAO];

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
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

/** A página num site de mentira, com a página inicial e a lista das edições. */
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
	const edicoes = createRoute({
		getParentRoute: () => raiz,
		path: "/edicoes",
		component: () => <h1>Edições</h1>,
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
		routeTree: raiz.addChildren([inicio, edicoes, pagina]),
		history: createMemoryHistory({ initialEntries: [endereco] }),
	});
	render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { level: 1 });
	return router;
}

function botao() {
	return screen.queryByRole("button", { name: "Confirmar a saída" });
}

/**
 * O texto à vista: o aviso do leitor de tela repete o mesmo texto, e as frases
 * guardadas ficam escondidas.
 */
function naTela(texto: string) {
	return screen.queryByText(texto, {
		ignore: "[role='status'], [aria-hidden='true'], script, style",
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

/** A página no HTML do servidor, antes do JavaScript. */
async function paginaDoServidor(props: {
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
	return raiz;
}

async function tituloDoServidor(props: {
	codigo: string | undefined;
	comApi: boolean;
}) {
	return (await paginaDoServidor(props)).querySelector(
		"h1",
	) as HTMLHeadingElement;
}

/** As frases guardadas de um lugar: invisíveis, fora do leitor de tela. */
function reservasDe(lugar: Element) {
	const reservas = [...lugar.querySelectorAll(":scope > [aria-hidden='true']")];
	expect(
		reservas.every((reserva) => reserva.classList.contains("invisible")),
	).toBe(true);
	return reservas.map((reserva) => reserva.textContent);
}

/** O texto à vista de um lugar que guarda frases. */
function textoAVista(lugar: Element) {
	return lugar.querySelector(":scope > :not([aria-hidden])")?.textContent;
}

/** O lugar da linha "Confirmando a saída…", no fim das ações. */
function lugarDaEspera(raiz: ParentNode = document) {
	return raiz.querySelector(
		".cartaz-acao > .saida-confirmando",
	) as HTMLElement | null;
}

/**
 * Só os relógios do setTimeout ficam de mentira: o React e o roteador seguem
 * com os de verdade.
 */
function relogioDeMentira() {
	vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
}

async function passar(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

/** O primeiro item das ações: o lugar do botão "Confirmar a saída". */
function lugarDoBotao(raiz: ParentNode = document) {
	return raiz.querySelector(".acoes-da-pagina > li:first-child") as HTMLElement;
}

/** A célula da grade de um elemento: as classes de lugar do Tailwind. */
function celula(elemento: Element | null | undefined) {
	return [...(elemento?.classList ?? [])]
		.filter((classe) => /^(col|row)-/.test(classe))
		.sort();
}

/**
 * O parágrafo de uma frase à vista: um <p> só com ela, em bloco. O Chromium tira
 * da árvore de acessibilidade um <p> em grade ou flex, e quem navega pelos
 * parágrafos pula a frase (a revisão do PR #146, pelo CDP). A grade que guarda
 * o lugar fica num elemento em volta dele. Este teste lê as classes do <p>.
 * Uma regra do CSS pode pôr esse elemento em grade sem aparecer aqui.
 */
function paragrafoDe(frase: string, raiz: HTMLElement = document.body) {
	const paragrafo = within(raiz).getByText(
		(_, elemento) => elemento?.textContent === frase,
		{
			selector: "p",
			ignore: "[role='status'], [aria-hidden='true'], script, style",
		},
	);
	expect(
		[...paragrafo.classList].filter((classe) =>
			/^(inline-)?(grid|flex)$/.test(classe),
		),
	).toEqual([]);
	return paragrafo;
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
		expect(naTela(CONFIRMANDO)).toBeTruthy();
		expect(aviso()).toBe(CONFIRMANDO);
		// A linha nasce no lugar guardado para ela, no fim das ações, em
		// parágrafo comum: a página não cresce quando ela aparece.
		const espera = lugarDaEspera() as HTMLElement;
		expect(reservasDe(espera)).toEqual([CONFIRMANDO]);
		expect(paragrafoDe(CONFIRMANDO).parentElement).toBe(espera);
		expect(celula(paragrafoDe(CONFIRMANDO))).toEqual(
			celula(espera.querySelector(":scope > [aria-hidden='true']")),
		);
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

	it("com a saída feita, o título e o texto mudam, e o foco vai para o “Inscrever-se de novo”", async () => {
		sair.mockResolvedValue({ tipo: "saiu" });
		await mostrar();

		await confirmar();

		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "Você saiu da newsletter.",
			}),
		).toBeTruthy();
		expect(
			within(paragrafoDe(SAIU))
				.getByRole("link", { name: "Edições" })
				.getAttribute("href"),
		).toBe("/edicoes");
		expect(naTela(EXPLICA)).toBeNull();
		expect(botao()).toBeNull();
		const deNovo = screen.getByRole("link", { name: "Inscrever-se de novo" });
		expect(deNovo.getAttribute("href")).toBe("/#newsletter");
		expect(document.activeElement).toBe(deNovo);
	});

	it("depois da saída, um só aviso anuncia o título e a frase inteira", async () => {
		sair.mockResolvedValue({ tipo: "saiu" });
		await mostrar();
		await confirmar();

		expect(aviso()).toBe(`Você saiu da newsletter. ${SAIU}`);
		expect(screen.getAllByRole("status")).toHaveLength(1);
		expect(
			paragrafoDe(SAIU).closest("[aria-live], [role='status'], [role='alert']"),
		).toBeNull();
	});

	it("o segundo e o terceiro cliques não seguem o link “Edições”; um clique novo segue", async () => {
		sair.mockResolvedValue({ tipo: "saiu" });
		const router = await mostrar();
		await confirmar();
		const edicoes = screen.getByRole("link", { name: "Edições", exact: true });

		for (const detail of [2, 3]) {
			await act(async () => {
				fireEvent.click(edicoes, { detail });
			});
			expect(router.state.location.pathname).toBe("/newsletter/sair");
		}
		await act(async () => {
			fireEvent.click(edicoes, { detail: 1 });
		});
		await screen.findByRole("heading", { level: 1, name: "Edições" });
		expect(router.state.location.pathname).toBe("/edicoes");
	});

	it("depois da saída, o Tab passa do link no lugar do botão para “Edições” e “Ir para o início”", async () => {
		sair.mockResolvedValue({ tipo: "saiu" });
		await mostrar();
		await confirmar();
		const deNovo = screen.getByRole("link", { name: "Inscrever-se de novo" });
		const edicoes = screen.getByRole("link", { name: "Edições" });
		const inicio = screen.getByRole("link", { name: "Ir para o início" });

		expect(document.activeElement).toBe(deNovo);
		fireEvent.keyDown(deNovo, { key: "Tab" });
		expect(document.activeElement).toBe(edicoes);
		fireEvent.keyDown(edicoes, { key: "Tab" });
		expect(document.activeElement).toBe(inicio);
		fireEvent.keyDown(inicio, { key: "Tab", shiftKey: true });
		expect(document.activeElement).toBe(edicoes);
		fireEvent.keyDown(edicoes, { key: "Tab", shiftKey: true });
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

	it.each([
		["Inscrever-se de novo", "saiu"],
		["Ir para o início", "link-invalido"],
	] as const)(
		"o terceiro clique de um clique triplo no botão também não segue o “%s”, que surge no lugar dele",
		async (nome, tipo) => {
			sair.mockResolvedValue({ tipo });
			const router = await mostrar();
			await confirmar();
			const link = screen.getByRole("link", { name: nome });

			// O clique triplo manda o detail 1, no botão, e depois o 2 e o 3, que
			// caem no link nascido embaixo do ponteiro.
			for (const detail of [2, 3]) {
				await act(async () => {
					fireEvent.click(link, { detail });
				});
				expect(router.state.location.pathname).toBe("/newsletter/sair");
			}
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

	it("o pé guarda a altura de antes da saída desde o HTML do servidor: a abertura e o lugar do botão", async () => {
		const raiz = await paginaDoServidor({ codigo: CODIGO, comApi: true });

		// A abertura guarda as duas frases, invisíveis, na mesma célula da
		// grade; a de antes do botão fica à vista.
		const abertura = raiz.querySelector(".abertura") as HTMLElement;
		expect(reservasDe(abertura)).toEqual(FRASES_DA_ABERTURA);
		expect(textoAVista(abertura)).toBe(EXPLICA);
		// Os erros também ficam guardados, com o desenho deles, em negrito: o
		// erro entra no lugar da frase com a altura que ela já tem.
		expect(
			[...abertura.querySelectorAll(":scope > [aria-hidden='true']")].map(
				(copia) => copia.classList.contains("ainda-nao"),
			),
		).toEqual([false, false, true, true]);
		// O lugar do botão guarda uma cópia dele, com o mesmo desenho, e o
		// botão de verdade fica na mesma célula.
		const lugar = lugarDoBotao(raiz);
		expect(reservasDe(lugar)).toEqual(["Confirmar a saída"]);
		expect(
			lugar.querySelector(":scope > [aria-hidden='true'] > .botao"),
		).not.toBeNull();
		expect(lugar.querySelector(":scope > form > button")?.textContent).toBe(
			"Confirmar a saída",
		);
		expect(lugar.nextElementSibling?.textContent).toBe("Ir para o início");
		// A linha da espera também tem o lugar guardado, vazio, no fim das ações:
		// com duas colunas, o que entrava embaixo delas empurrava o botão para
		// cima, e numa coluna a página crescia.
		const espera = lugarDaEspera(raiz) as HTMLElement;
		expect(reservasDe(espera)).toEqual([CONFIRMANDO]);
		expect(textoAVista(espera)).toBeUndefined();
		expect(espera.parentElement?.lastElementChild).toBe(espera);
	});

	it("no HTML do servidor, a cópia da abertura com “Edições” guarda o lugar sem expor um link", async () => {
		const raiz = await paginaDoServidor({ codigo: CODIGO, comApi: true });
		const copia = raiz.querySelector(".abertura > [aria-hidden='true'] > a");
		const reserva = copia?.parentElement;

		expect(copia?.textContent).toBe("Edições");
		expect(copia?.hasAttribute("href")).toBe(false);
		expect(reserva?.textContent).toBe(SAIU);
		expect(reserva?.classList.contains("invisible")).toBe(true);
		expect(celula(reserva)).toEqual(celula(paragrafoDe(EXPLICA, raiz)));
		expect(raiz.querySelector('a[href="/edicoes"]')).toBeNull();
		expect(
			within(raiz).queryByRole("link", { name: "Edições", hidden: true }),
		).toBeNull();
	});

	it("depois da saída, o pé fica com a altura de antes: a frase de antes continua guardada, e o “Inscrever-se de novo” fica no lugar do botão", async () => {
		sair.mockResolvedValue({ tipo: "saiu" });
		await mostrar();
		await confirmar();

		const abertura = document.querySelector(".abertura") as HTMLElement;
		expect(reservasDe(abertura)).toEqual(FRASES_DA_ABERTURA);
		expect(textoAVista(abertura)).toBe(SAIU);
		const lugar = lugarDoBotao();
		expect(reservasDe(lugar)).toEqual(["Confirmar a saída"]);
		expect(
			screen.getByRole("link", { name: "Inscrever-se de novo" }).closest("li"),
		).toBe(lugar);
		// O "Ir para o início" fica onde estava, no item seguinte.
		expect(
			screen.getByRole("link", { name: "Ir para o início" }).closest("li"),
		).toBe(lugar.nextElementSibling);
	});

	// O jsdom não desenha, e o CSS não sabe qual elemento leva a célula: ela está
	// nas classes do Tailwind. Fora da célula da cópia, o link nasceria uma
	// altura de botão abaixo do ponteiro (a revisão do PR #146).
	it.each([
		["antes do clique, o botão", () => mostrar(), () => botao()?.parentElement],
		[
			"depois da saída, o “Inscrever-se de novo”",
			async () => {
				sair.mockResolvedValue({ tipo: "saiu" });
				await mostrar();
				await confirmar();
			},
			() =>
				screen.getByRole("link", { name: "Inscrever-se de novo" })
					.parentElement,
		],
		[
			"com o código que a API recusa, o “Ir para o início”",
			async () => {
				sair.mockResolvedValue({ tipo: "link-invalido" });
				await mostrar();
				await confirmar();
			},
			() =>
				screen.getByRole("link", { name: "Ir para o início" }).parentElement,
		],
	])(
		"%s fica na mesma célula da grade que a cópia do botão",
		async (_, preparar, daVez) => {
			await preparar();
			const lugar = lugarDoBotao();
			const copia = lugar.querySelector(":scope > [aria-hidden='true']");
			const peca = daVez();

			expect(lugar.classList.contains("grid")).toBe(true);
			expect(peca?.parentElement).toBe(lugar);
			expect(celula(copia)).toEqual(["col-start-1", "row-start-1"]);
			expect(celula(peca)).toEqual(celula(copia));
		},
	);

	it.each([
		["antes do clique", () => mostrar(), EXPLICA],
		[
			"enquanto confirma",
			async () => {
				sair.mockReturnValue(new Promise(() => {}));
				await mostrar();
				await confirmar();
			},
			EXPLICA,
		],
		[
			"depois da saída",
			async () => {
				sair.mockResolvedValue({ tipo: "saiu" });
				await mostrar();
				await confirmar();
			},
			SAIU,
		],
		[
			// O erro fica no lugar da frase, e continua um parágrafo comum.
			"com a API fora do ar",
			async () => {
				sair.mockResolvedValue({ tipo: "fora-do-ar" });
				await mostrar();
				await confirmar();
			},
			FORA_DO_AR,
		],
		[
			"com a rede caída",
			async () => {
				sair.mockResolvedValue({ tipo: "sem-conexao" });
				await mostrar();
				await confirmar();
			},
			SEM_CONEXAO,
		],
		[
			"com o código que a API recusa",
			async () => {
				sair.mockResolvedValue({ tipo: "link-invalido" });
				await mostrar();
				await confirmar();
			},
			INCOMPLETO,
		],
		["com o link incompleto", () => mostrar({ codigo: "abc" }), INCOMPLETO],
		[
			"sem a API",
			() => mostrar({ comApi: false }),
			"A newsletter ainda não funciona neste endereço do site.",
		],
	])(
		"%s, a frase de abertura é um parágrafo em bloco, só com ela",
		async (_, preparar, frase) => {
			await preparar();

			// As frases guardadas continuam em volta dele, na grade da abertura.
			expect(paragrafoDe(frase).parentElement).toBe(
				document.querySelector(".abertura"),
			);
			expect(document.querySelectorAll('a[href="/edicoes"]')).toHaveLength(
				frase === SAIU ? 1 : 0,
			);
		},
	);

	it("no HTML do servidor, a frase de abertura já é um parágrafo em bloco, com as guardadas em volta", async () => {
		const raiz = await paginaDoServidor({ codigo: CODIGO, comApi: true });
		const abertura = raiz.querySelector(".abertura") as HTMLElement;

		expect(paragrafoDe(EXPLICA, raiz).parentElement).toBe(abertura);
		expect(reservasDe(abertura)).toEqual(FRASES_DA_ABERTURA);
	});

	it("com o código que a API recusa, o pé continua guardando o lugar, e o “Ir para o início” fica no lugar do botão", async () => {
		sair.mockResolvedValue({ tipo: "link-invalido" });
		await mostrar();
		await confirmar();

		const abertura = document.querySelector(".abertura") as HTMLElement;
		expect(reservasDe(abertura)).toEqual(FRASES_DA_ABERTURA);
		expect(textoAVista(abertura)).toBe(INCOMPLETO);
		// A ação que sobra fica logo embaixo da frase, onde estava o botão, como o
		// "Inscrever-se de novo" depois da saída.
		const lugar = lugarDoBotao();
		expect(reservasDe(lugar)).toEqual(["Confirmar a saída"]);
		expect(lugar.querySelector("button, form")).toBeNull();
		expect(
			screen.getByRole("link", { name: "Ir para o início" }).closest("li"),
		).toBe(lugar);
		// O item de baixo guarda a altura dele, com uma cópia invisível e fora do
		// leitor de tela: o espaço que sobra fica no fim do pé.
		const seguinte = lugar.nextElementSibling as HTMLElement;
		expect(seguinte.getAttribute("aria-hidden")).toBe("true");
		expect(seguinte.classList.contains("invisible")).toBe(true);
		expect(seguinte.textContent).toBe("Ir para o início");
	});

	it("com o código que a API recusa, a cópia do “Ir para o início” é o mesmo link, sem o endereço: quebra como ele, sem foco nem clique", async () => {
		sair.mockResolvedValue({ tipo: "link-invalido" });
		const router = await mostrar();
		await confirmar();
		const link = screen.getByRole("link", { name: "Ir para o início" });
		const copia = lugarDoBotao().nextElementSibling?.firstElementChild as
			| HTMLElement
			| undefined;

		// Na #152, quando o Firefox ainda quebrava o link em duas linhas a 390
		// px, um span com a mesma classe ficava numa: o item de baixo encolhia, e
		// a página também (a revisão do PR #146). A cópia é o mesmo elemento, com
		// a mesma classe e o mesmo texto, para seguir as regras dele e ter a
		// altura dele.
		expect(copia?.tagName).toBe("A");
		expect(copia?.className).toBe(link.className);
		expect(copia?.innerHTML).toBe(link.innerHTML);
		// Sem o href, ela não é link: nem o leitor de tela, que já não a vê pelo
		// aria-hidden do item, a acharia como link.
		expect(copia?.hasAttribute("href")).toBe(false);
		expect(
			screen.getAllByRole("link", { name: "Ir para o início", hidden: true }),
		).toEqual([link]);
		// Ela não recebe o foco, e o clique nela não leva a lugar nenhum.
		copia?.focus();
		expect(document.activeElement).toBe(link);
		await act(async () => {
			fireEvent.click(copia as HTMLElement, { detail: 1 });
		});
		expect(router.state.location.pathname).toBe("/newsletter/sair");
	});

	it.each([
		[
			"sem a API",
			{ codigo: CODIGO, comApi: false },
			"A newsletter ainda não funciona neste endereço do site.",
		],
		["com o link incompleto", { codigo: "abc", comApi: true }, INCOMPLETO],
	])(
		"%s, o título e o pé não mudam e não guardam lugar",
		async (_, props, abertura) => {
			const raiz = await paginaDoServidor(props);

			expect(raiz.querySelector("h1")?.textContent).toBe("Sair da newsletter");
			expect(raiz.querySelector(".abertura")?.textContent).toBe(abertura);
			expect(raiz.querySelector(".acoes-da-pagina")?.textContent).toBe(
				"Ir para o início",
			);
			// Sem o botão, não há espera: as ações não ganham um vão no fim.
			expect(raiz.querySelector(".cartaz-acao")?.textContent).toBe(
				"Ir para o início",
			);
			expect(lugarDaEspera(raiz)).toBeNull();
		},
	);

	it.each([
		["fora-do-ar", FORA_DO_AR],
		["sem-conexao", SEM_CONEXAO],
	] as const)(
		"com %s, o erro fica no lugar da frase, em negrito, e o botão fica onde estava, para tentar de novo",
		async (tipo, texto) => {
			sair.mockResolvedValue({ tipo });
			await mostrar();

			const confirmacao = await confirmar();

			// O erro fica na abertura, no lugar da explicação, e não embaixo das
			// ações: com duas colunas, o que entrava embaixo delas empurrava o
			// botão para cima, e o "Ir para o início" ficava embaixo do ponteiro.
			const abertura = document.querySelector(".abertura") as HTMLElement;
			expect(textoAVista(abertura)).toBe(texto);
			expect(paragrafoDe(texto).classList.contains("ainda-nao")).toBe(true);
			expect(naTela(EXPLICA)).toBeNull();
			expect(document.querySelector(".cartaz-acao")?.textContent).not.toContain(
				texto,
			);
			// O leitor de tela lê o erro uma vez, pelo aviso: a frase da abertura
			// não é uma região viva.
			expect(aviso()).toBe(texto);
			expect(screen.getAllByRole("status")).toHaveLength(1);
			expect(
				paragrafoDe(texto).closest(
					"[aria-live], [role='status'], [role='alert']",
				),
			).toBeNull();
			// O botão é o mesmo elemento, com o foco, e o pé guarda as mesmas frases.
			expect(botao()).toBe(confirmacao);
			expect(confirmacao.hasAttribute("aria-disabled")).toBe(false);
			expect(document.activeElement).toBe(confirmacao);
			expect(reservasDe(abertura)).toEqual(FRASES_DA_ABERTURA);
			expect(reservasDe(lugarDaEspera() as HTMLElement)).toEqual([CONFIRMANDO]);

			sair.mockResolvedValue({ tipo: "saiu" });
			await confirmar();
			expect(sair).toHaveBeenCalledTimes(2);
			expect(naTela(texto)).toBeNull();
			expect(paragrafoDe(SAIU)).toBeTruthy();
		},
	);

	it("na nova tentativa, a página volta à espera: a explicação no lugar do erro e a linha da espera", async () => {
		sair.mockResolvedValue({ tipo: "fora-do-ar" });
		await mostrar();
		const confirmacao = await confirmar();

		sair.mockReturnValue(new Promise(() => {}));
		await confirmar();

		expect(sair).toHaveBeenCalledTimes(2);
		expect(
			textoAVista(document.querySelector(".abertura") as HTMLElement),
		).toBe(EXPLICA);
		expect(naTela(FORA_DO_AR)).toBeNull();
		expect(textoAVista(lugarDaEspera() as HTMLElement)).toBe(CONFIRMANDO);
		expect(aviso()).toBe(CONFIRMANDO);
		expect(botao()).toBe(confirmacao);
		expect(confirmacao.getAttribute("aria-disabled")).toBe("true");
		expect(document.activeElement).toBe(confirmacao);
	});

	it("na nova tentativa, o erro que volta na hora só aparece com a espera meio segundo na tela, e o aviso lê de novo", async () => {
		sair.mockResolvedValue({ tipo: "sem-conexao" });
		await mostrar();
		const confirmacao = await confirmar();
		const abertura = document.querySelector(".abertura") as HTMLElement;
		expect(textoAVista(abertura)).toBe(SEM_CONEXAO);

		// A rede continua caída, e o pedido falha na hora: sem a espera, o mesmo
		// erro voltaria no mesmo quadro, e nada mostraria que a tentativa
		// aconteceu.
		relogioDeMentira();
		await confirmar();

		expect(textoAVista(abertura)).toBe(EXPLICA);
		expect(textoAVista(lugarDaEspera() as HTMLElement)).toBe(CONFIRMANDO);
		expect(aviso()).toBe(CONFIRMANDO);
		expect(confirmacao.getAttribute("aria-disabled")).toBe("true");
		// Um clique durante o meio segundo cai no botão à espera e não manda outro
		// pedido: o envio só fica livre quando o erro aparece.
		await passar(200);
		await confirmar();
		expect(sair).toHaveBeenCalledTimes(2);
		await passar(299);
		expect(textoAVista(abertura)).toBe(EXPLICA);
		expect(aviso()).toBe(CONFIRMANDO);

		await passar(1);
		expect(textoAVista(abertura)).toBe(SEM_CONEXAO);
		expect(textoAVista(lugarDaEspera() as HTMLElement)).toBeUndefined();
		expect(aviso()).toBe(SEM_CONEXAO);
		expect(botao()).toBe(confirmacao);
		expect(confirmacao.hasAttribute("aria-disabled")).toBe(false);
		expect(document.activeElement).toBe(confirmacao);
		expect(sair).toHaveBeenCalledTimes(2);
	});

	it("na nova tentativa, o erro que leva mais de meio segundo aparece assim que chega", async () => {
		sair.mockResolvedValue({ tipo: "fora-do-ar" });
		await mostrar();
		await confirmar();
		const abertura = document.querySelector(".abertura") as HTMLElement;

		let soltar: (resultado: ResultadoDaSaida) => void = () => {};
		sair.mockImplementation(
			() =>
				new Promise((resolver) => {
					soltar = resolver;
				}),
		);
		relogioDeMentira();
		await confirmar();
		await passar(600);
		expect(textoAVista(abertura)).toBe(EXPLICA);

		await act(async () => {
			soltar({ tipo: "fora-do-ar" });
		});
		expect(textoAVista(abertura)).toBe(FORA_DO_AR);
	});

	it.each([
		["depois da saída", "saiu"],
		["com o código que a API recusa", "link-invalido"],
		["com a API fora do ar", "fora-do-ar"],
		["com a rede caída", "sem-conexao"],
	] as const)(
		"%s, a linha da espera continua guardada, vazia, no fim das ações",
		async (_, tipo) => {
			sair.mockResolvedValue({ tipo });
			await mostrar();
			await confirmar();

			const espera = lugarDaEspera() as HTMLElement;
			expect(reservasDe(espera)).toEqual([CONFIRMANDO]);
			expect(textoAVista(espera)).toBeUndefined();
			expect(espera.parentElement?.lastElementChild).toBe(espera);
		},
	);

	it.each([
		["Inscrever-se de novo", "saiu", "newsletter"],
		["Ir para o início", "link-invalido", ""],
	] as const)(
		"o Enter logo depois de o “%s” nascer no lugar do botão não segue o link; meio segundo depois da troca, segue",
		async (nome, tipo, trecho) => {
			sair.mockResolvedValue({ tipo });
			const router = await mostrar();
			relogioDeMentira();
			await confirmar();
			const link = screen.getByRole("link", { name: nome });
			expect(document.activeElement).toBe(link);

			// No Chromium e no Firefox, o segundo Enter para no keydown do link
			// que nasceu no lugar do botão. Esse Enter não gera clique.
			for (const ms of [0, 499]) {
				await passar(ms);
				expect(fireEvent.keyDown(link, { key: "Enter" })).toBe(false);
				// Com o código recusado, o Tab segue a ordem nativa. Depois da
				// saída, outro teste confere a passagem imediata para "Edições".
				if (tipo === "link-invalido") {
					expect(fireEvent.keyDown(link, { key: "Tab" })).toBe(true);
				}
				// Este clique chega direto ao link, com detail 0 e sem keydown.
				await act(async () => {
					fireEvent.click(link, { detail: 0 });
				});
				expect(router.state.location.pathname).toBe("/newsletter/sair");
			}
			// A guarda só impede seguir o link: não manda pedido nem tira o foco.
			expect(sair).toHaveBeenCalledTimes(1);
			expect(document.activeElement).toBe(link);

			await passar(1);
			expect(fireEvent.keyDown(link, { key: "Enter" })).toBe(true);
			vi.useRealTimers();
			await act(async () => {
				fireEvent.click(link, { detail: 0 });
			});
			await screen.findByRole("heading", { level: 1, name: "Início" });
			expect(router.state.location.pathname).toBe("/");
			expect(router.state.location.hash).toBe(trecho);
		},
	);

	it("o meio segundo do Enter conta da troca, e não do foco: quem sai do link e volta segue com o Enter", async () => {
		sair.mockResolvedValue({ tipo: "saiu" });
		const router = await mostrar();
		relogioDeMentira();
		await confirmar();
		const deNovo = screen.getByRole("link", { name: "Inscrever-se de novo" });

		await passar(400);
		act(() => {
			screen.getByRole("link", { name: "Ir para o início" }).focus();
		});
		act(() => {
			deNovo.focus();
		});
		await passar(100);
		expect(fireEvent.keyDown(deNovo, { key: "Enter" })).toBe(true);
		vi.useRealTimers();
		await act(async () => {
			fireEvent.click(deNovo, { detail: 0 });
		});
		await screen.findByRole("heading", { level: 1, name: "Início" });
		expect(router.state.location.hash).toBe("newsletter");
	});

	it("depois da saída, o Enter no “Ir para o início”, que não nasceu no lugar do botão, segue na hora", async () => {
		sair.mockResolvedValue({ tipo: "saiu" });
		const router = await mostrar();
		await confirmar();
		const inicio = screen.getByRole("link", { name: "Ir para o início" });

		expect(fireEvent.keyDown(inicio, { key: "Enter" })).toBe(true);
		await act(async () => {
			fireEvent.click(inicio, { detail: 0 });
		});
		await screen.findByRole("heading", { level: 1, name: "Início" });
		expect(router.state.location.pathname).toBe("/");
	});

	it.each([
		["Inscrever-se de novo", "saiu"],
		["Ir para o início", "link-invalido"],
	] as const)(
		"o Enter segurado não segue o “%s” que nasce no lugar do botão, nem depois do meio segundo",
		async (nome, tipo) => {
			sair.mockResolvedValue({ tipo });
			await mostrar();
			relogioDeMentira();
			await confirmar();
			await passar(600);
			const link = screen.getByRole("link", { name: nome });

			// No Firefox, cada repetição do Enter segurado (o keydown com o repeat)
			// ativa o link, e quem segurou o Enter no botão saía da página depois da
			// guarda. A repetição não ativa o link; um Enter novo e as outras teclas
			// seguem como sempre.
			expect(fireEvent.keyDown(link, { key: "Enter", repeat: true })).toBe(
				false,
			);
			expect(fireEvent.keyDown(link, { key: "Enter" })).toBe(true);
			expect(document.activeElement).toBe(link);
			if (tipo === "link-invalido") {
				expect(fireEvent.keyDown(link, { key: "Tab", repeat: true })).toBe(
					true,
				);
			}
		},
	);

	it("depois da saída, o Enter segurado no “Ir para o início”, que não nasceu no lugar do botão, fica como no navegador", async () => {
		sair.mockResolvedValue({ tipo: "saiu" });
		await mostrar();
		await confirmar();

		expect(
			fireEvent.keyDown(
				screen.getByRole("link", { name: "Ir para o início" }),
				{ key: "Enter", repeat: true },
			),
		).toBe(true);
	});

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
		// O título não muda mais, e continua guardando o lugar (DESIGN.md):
		// tirar as reservas na resposta faria a frase e as ações subirem.
		const titulo = screen.getByRole("heading", {
			level: 1,
			name: "Sair da newsletter",
		});
		expect(
			[...titulo.querySelectorAll(":scope > [aria-hidden='true']")].map(
				(reserva) => reserva.textContent,
			),
		).toEqual(["Sair da newsletter", "Você saiu da newsletter."]);
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
			// Sem o botão, não há espera, nem o lugar dela.
			expect(lugarDaEspera()).toBeNull();
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
	it.each([
		["Inscrever-se de novo", "/#newsletter"],
		["Ir para o início", "/"],
	])(
		"não vai para a URL, para o armazenamento do navegador, para os cookies nem para o console, nem quando a página sai da tela pelo “%s”",
		async (link, destino) => {
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
			expect(paragrafoDe(SAIU)).toBeTruthy();
			// O roteador dos testes é de memória: o endereço e o estado dele não
			// chegam à janela, e cada um se confere à parte. Ele continua na entrada
			// da chegada, sem parâmetro, trecho ou estado novo com o código.
			expect(router.history.location.href).toBe(chegada);
			expect(router.history.length).toBe(1);
			expect(JSON.stringify(router.history.location.state)).not.toContain(
				CODIGO,
			);

			// A pessoa sai por um dos dois links, com um clique simples, e depois o
			// site inteiro sai da tela: o que a página gravasse ao sair também conta.
			// Os dois links levam à página inicial sem o código.
			await act(async () => {
				fireEvent.click(screen.getByRole("link", { name: link }), {
					detail: 1,
				});
			});
			await screen.findByRole("heading", { level: 1, name: "Início" });
			expect(router.history.location.href).toBe(destino);
			expect(JSON.stringify(router.history.location.state)).not.toContain(
				CODIGO,
			);
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
		},
	);
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
