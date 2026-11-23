// @vitest-environment jsdom

import {
	createBrowserHistory,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	type RouterHistory,
	RouterProvider,
} from "@tanstack/react-router";
import {
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
import type { ArquivoRevisao } from "@/client";
import {
	consultarPerfil,
	lerRascunho,
	publicarEdicao,
	salvarRevisao,
} from "@/client";
import {
	rascunhoDeExemplo,
	rascunhoPronto,
} from "@/lib/painel/exemplos-de-teste";
import { Route as Autenticado } from "@/routes/_autenticado";
import { Route as Painel } from "@/routes/_autenticado/painel";
import { NaoEncontrado } from "../nao-encontrado";
import { PaginaDeErro } from "../pagina-de-erro";

// A tela do painel com a guarda do layout, num site de mentira: o login, o
// perfil, as edições e a página não encontrada do site. A API fica simulada no
// cliente gerado: cada função devolve o que o cliente devolveria (os dados, o
// erro e a resposta, ou a resposta vazia sem conexão). Os rascunhos são
// inventados (lib/painel/exemplos-de-teste.ts).
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.example.com" } }));
vi.mock("@/client", () => ({
	consultarPerfil: vi.fn(),
	lerRascunho: vi.fn(),
	salvarRevisao: vi.fn(),
	publicarEdicao: vi.fn(),
}));

const perfil = vi.mocked(consultarPerfil);
const ler = vi.mocked(lerRascunho);
const salvar = vi.mocked(salvarRevisao);
const publicar = vi.mocked(publicarEdicao);

type Devolvido = { data?: unknown; error?: unknown; response?: Response };

/** O que o cliente devolve numa resposta da API. */
function resposta(status: number, corpo?: unknown): Devolvido {
	const response = new Response(null, { status });
	return response.ok ? { data: corpo, response } : { error: corpo, response };
}

/** O que o cliente devolve sem conexão: o erro, sem a resposta. */
const semConexao = (): Devolvido => ({
	error: new TypeError("Failed to fetch"),
});

/** Faz a função simulada devolver cada resultado uma vez, e o último dali em diante. */
function emSequencia(
	funcao: ReturnType<typeof vi.fn>,
	...resultados: (Devolvido | Promise<Devolvido>)[]
) {
	const fila = [...resultados];
	funcao.mockImplementation(async () =>
		fila.length > 1 ? fila.shift() : fila[0],
	);
}

const ADMINISTRADORA = { nome: "Pessoa fictícia", papel: "administradora" };
const COMUM = { nome: "Pessoa fictícia", papel: "comum" };

const SALVO = {
	situacao: "revisao_salva",
	edicao_id: 9,
	itens: 4,
	pendencias: ["revisao", "cobertura"],
	avisos: [],
};

/** Os textos do rascunho de exemplo, que nunca saem da página. */
const TEXTOS_DO_RASCUNHO = [
	"bibliotecas",
	"praças esportivas",
	"Redação pendente",
	"PL 1234",
	"horário de uma biblioteca",
	"comitê das bibliotecas",
];

let consoleChamado: ReturnType<typeof vi.spyOn>[] = [];

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
	Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	sessionStorage.clear();
	window.history.replaceState(null, "", "/");
	// O console fica mudo e anotado: nada do rascunho pode chegar a ele.
	consoleChamado = (["log", "info", "warn", "error", "debug"] as const).map(
		(nome) => vi.spyOn(console, nome).mockImplementation(() => {}),
	);
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.spyOn(window, "scrollBy").mockImplementation(() => {});
	vi.stubGlobal(
		"ResizeObserver",
		class {
			observe() {}
			disconnect() {}
		},
	);
	emSequencia(perfil, resposta(200, ADMINISTRADORA));
	emSequencia(ler, resposta(200, rascunhoDeExemplo()));
	emSequencia(salvar, resposta(200, SALVO));
	emSequencia(publicar, resposta(200, { situacao: "publicada", edicao_id: 9 }));
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	window.history.replaceState(null, "", "/");
});

/** O site de mentira, aberto em /painel, com a guarda e a página de verdade. */
function abrir({ history }: { history?: RouterHistory } = {}) {
	const raiz = createRootRoute({
		component: () => (
			<main id="conteudo">
				<Outlet />
			</main>
		),
	});
	// O layout e a página de verdade, ligados como no routeTree.gen.ts.
	const autenticado = Autenticado.update({
		id: "/_autenticado",
		getParentRoute: () => raiz,
	} as never);
	const painel = Painel.update({
		id: "/painel",
		path: "/painel",
		getParentRoute: () => autenticado,
	} as never);
	const pagina = (path: string, titulo: string) =>
		createRoute({
			getParentRoute: () => raiz,
			path,
			component: () => <h1>{titulo}</h1>,
		});
	const router = createRouter({
		routeTree: raiz.addChildren([
			autenticado.addChildren([painel]),
			pagina("/login", "Entrar na conta"),
			pagina("/perfil", "Meu perfil"),
			pagina("/painel/numeros", "Números do site"),
			pagina("/edicoes", "Edições"),
			pagina("/edicoes/$id", "Edição publicada"),
		]),
		history: history ?? createMemoryHistory({ initialEntries: ["/painel"] }),
		defaultNotFoundComponent: NaoEncontrado,
		defaultErrorComponent: PaginaDeErro,
	});
	render(<RouterProvider router={router} />);
	return router;
}

/** Abre o painel e espera o rascunho aparecer. */
async function abrirORascunho() {
	const router = abrir();
	await screen.findByRole("heading", { level: 1, name: "Revisão da edição" });
	await screen.findByRole("region", { name: /^Item 1:/ });
	return router;
}

const ficha = (posicao: number) =>
	screen.getByRole("region", { name: new RegExp(`^Item ${posicao}:`) });
const botao = (nome: string) => screen.getByRole("button", { name: nome });
const frase = () => document.getElementById("pe-da-revisao-mensagem");

/** O texto da página e o que o console recebeu, juntos. */
function oQueSaiuDaPagina() {
	return JSON.stringify(
		consoleChamado.flatMap((espiao) => espiao.mock.calls),
		(_, valor) => (valor instanceof Error ? valor.message : valor),
	);
}

/** A página não tem mais nenhum texto do rascunho. */
function semORascunhoNaPagina() {
	for (const texto of TEXTOS_DO_RASCUNHO) {
		expect(document.body.textContent).not.toContain(texto);
	}
}

describe("a guarda do painel", () => {
	it("abre o rascunho para a administradora, depois de conferir a sessão", async () => {
		await abrirORascunho();
		expect(perfil).toHaveBeenCalledTimes(1);
		expect(ler).toHaveBeenCalledTimes(1);
		// O perfil vem antes do rascunho, e os dois levam o cookie, sem cache.
		expect(perfil.mock.invocationCallOrder[0]).toBeLessThan(
			ler.mock.invocationCallOrder[0],
		);
		for (const chamada of [perfil.mock.calls[0][0], ler.mock.calls[0][0]]) {
			expect(chamada).toMatchObject({
				credentials: "include",
				cache: "no-store",
			});
		}
		expect(screen.getByText("PL 1234/2026")).toBeTruthy();
		expect(
			screen.getByText("Na Câmara: Aprovado o projeto, com emenda de redação."),
		).toBeTruthy();
		expect(within(ficha(3)).getByText("Falta a privacidade")).toBeTruthy();
		expect(within(ficha(1)).getByText("Revisado")).toBeTruthy();
		expect(within(ficha(2)).getByText("Falta escrever")).toBeTruthy();
	});

	it("dá a página não encontrada à conta comum, sem pedir o rascunho", async () => {
		emSequencia(perfil, resposta(200, COMUM));
		abrir();
		await screen.findByRole("heading", { name: "Página não encontrada" });
		expect(ler).not.toHaveBeenCalled();
		semORascunhoNaPagina();
	});

	it("leva quem não entrou ao login, sem pedir o rascunho", async () => {
		emSequencia(perfil, resposta(401, { detail: "Sessão ausente." }));
		const router = abrir();
		await screen.findByRole("heading", { name: "Entrar na conta" });
		expect(router.state.location.pathname).toBe("/login");
		expect(ler).not.toHaveBeenCalled();
	});

	it("mostra a página de erro quando a sessão não pôde ser conferida", async () => {
		emSequencia(perfil, semConexao());
		abrir();
		await screen.findByRole("button", { name: "Tentar de novo" });
		expect(ler).not.toHaveBeenCalled();
	});

	describe.each([401, 404])("perda de acesso com %i", (status) => {
		it.each(["leitura", "releitura", "salvar", "publicar"] as const)(
			"mostra só a conferência da sessão enquanto a guarda responde (%s)",
			async (operacao) => {
				let responderGuarda!: (resultado: Devolvido) => void;
				const guarda = new Promise<Devolvido>((resolve) => {
					responderGuarda = resolve;
				});
				emSequencia(perfil, resposta(200, ADMINISTRADORA), guarda);
				const recusa = resposta(status, { detail: "Sem acesso." });
				if (operacao === "leitura") {
					emSequencia(ler, recusa);
					abrir();
				} else {
					emSequencia(ler, resposta(200, rascunhoPronto()), recusa);
					await abrirORascunho();
					if (operacao === "publicar") {
						emSequencia(publicar, recusa);
						fireEvent.click(botao("Publicar a edição"));
						fireEvent.click(botao("Publicar agora"));
					} else {
						if (operacao === "salvar") {
							emSequencia(salvar, recusa);
						}
						fireEvent.change(screen.getByLabelText("Título da edição"), {
							target: { value: "Título local por salvar" },
						});
						fireEvent.click(botao("Salvar a revisão"));
					}
				}

				await screen.findByText("Verificando sua sessão…");
				expect(perfil).toHaveBeenCalledTimes(2);
				const principal = screen.getByRole("main");
				expect(principal.textContent).toBe("Verificando sua sessão…");
				expect(
					principal.querySelector(".pagina-do-painel, .ficha-do-item, input"),
				).toBeNull();
				semORascunhoNaPagina();

				responderGuarda(
					status === 401
						? resposta(401, { detail: "Sessão ausente." })
						: resposta(200, COMUM),
				);
				await screen.findByRole("heading", {
					name: status === 401 ? "Entrar na conta" : "Página não encontrada",
				});
				semORascunhoNaPagina();
			},
		);
	});

	it("relê o rascunho sem os ajustes antigos quando a guarda confirma o acesso de novo", async () => {
		const antes = rascunhoPronto();
		const atual = { ...antes, titulo: "Rascunho que a API voltou a entregar" };
		emSequencia(ler, resposta(200, antes), resposta(200, atual));
		emSequencia(salvar, resposta(404, { detail: "Edição não encontrada." }));
		await abrirORascunho();
		fireEvent.change(screen.getByLabelText("Título da edição"), {
			target: { value: "Título por salvar" },
		});
		fireEvent.click(botao("Salvar a revisão"));

		await screen.findByDisplayValue(atual.titulo);
		expect(perfil).toHaveBeenCalledTimes(2);
		expect(ler).toHaveBeenCalledTimes(2);
		expect(screen.queryByDisplayValue("Título por salvar")).toBeNull();
	});
});

describe("os estados do rascunho", () => {
	it("diz quando não há rascunho, com o caminho para as edições", async () => {
		emSequencia(ler, resposta(200, null));
		abrir();
		await screen.findByText("Não há rascunho para revisar.");
		expect(
			screen.getByRole("link", { name: "Ver as edições publicadas" }),
		).toBeTruthy();
	});

	it("tenta de novo depois da falha na leitura", async () => {
		emSequencia(ler, semConexao(), resposta(200, rascunhoDeExemplo()));
		abrir();
		await screen.findByText(
			"Não deu para falar com o servidor. Confira a internet e tente de novo.",
		);
		fireEvent.click(botao("Tentar de novo"));
		await screen.findByRole("region", { name: /^Item 1:/ });
	});
});

describe("a ficha do item", () => {
	it("mostra o título inteiro do artigo escolhido no texto da caixa de confirmação", async () => {
		await abrirORascunho();
		const campos = within(ficha(1));
		const seletor = campos.getByLabelText("Artigo da trilha");
		const titulo = "O projeto passa pelas comissões";
		const artigo = campos.getByRole<HTMLOptionElement>("option", {
			name: titulo,
		});
		fireEvent.change(seletor, { target: { value: artigo.value } });

		expect(
			campos.getByRole("checkbox", { name: `Confirmo o artigo: ${titulo}` }),
		).toBeTruthy();
		fireEvent.change(seletor, { target: { value: "" } });
		expect(
			campos.queryByRole("checkbox", { name: /^Confirmo o artigo:/ }),
		).toBeNull();
	});

	it.each([
		[1, "https://www.camara.leg.br/votacoes/exemplo-1"],
		[3, "https://www.in.gov.br/web/dou/-/exemplo-3"],
	])("abre a fonte oficial do item %i em outra aba", async (posicao, url) => {
		await abrirORascunho();
		const fonte = within(ficha(posicao)).getByRole("link", {
			name: `Fonte oficial do item ${posicao} (abre em outra aba)`,
		});
		expect(fonte.getAttribute("href")).toBe(url);
		expect(fonte.getAttribute("target")).toBe("_blank");
		expect(fonte.getAttribute("rel")).toBe("noopener noreferrer");
	});
});

describe("salvar a revisão", () => {
	it("manda os campos editados e os de consulta como vieram, e diz o que falta", async () => {
		const depois = rascunhoDeExemplo();
		depois.versao_rascunho = "f".repeat(64);
		depois.itens[1] = {
			...depois.itens[1],
			id: 202,
			titulo: "Senado aprova a urgência das praças esportivas",
		};
		emSequencia(ler, resposta(200, rascunhoDeExemplo()), resposta(200, depois));
		emSequencia(
			salvar,
			resposta(200, {
				...SALVO,
				avisos: [
					"Confira o item 2: o texto pode citar parlamentar ou partido.",
				],
			}),
		);
		await abrirORascunho();

		const titulo = within(ficha(2)).getByLabelText("Título");
		fireEvent.change(titulo, {
			target: { value: "Senado aprova a urgência das praças esportivas" },
		});
		fireEvent.change(within(ficha(2)).getByLabelText("Explicação"), {
			target: {
				value: "O Senado aprovou a urgência.\n\nO projeto volta à pauta.",
			},
		});
		expect(within(ficha(2)).getByText("Por salvar")).toBeTruthy();
		expect(frase()?.textContent).toBe("Você tem alterações por salvar.");
		fireEvent.click(
			within(ficha(3)).getByRole("checkbox", {
				name: "Conferi a privacidade, e o ato fica na edição",
			}),
		);

		const salvarBotao = botao("Salvar a revisão");
		salvarBotao.focus();
		fireEvent.click(salvarBotao);
		await screen.findByText(/^Revisão salva\. Para publicar, falta/);

		expect(salvar).toHaveBeenCalledTimes(1);
		const [opcoes] = salvar.mock.calls[0];
		expect(opcoes).toMatchObject({
			path: { id: 9 },
			credentials: "include",
			cache: "no-store",
		});
		const enviado = opcoes.body as ArquivoRevisao;
		const original = rascunhoDeExemplo();
		expect(enviado.itens[1]).toMatchObject({
			titulo: "Senado aprova a urgência das praças esportivas",
			explicacao: ["O Senado aprovou a urgência.", "O projeto volta à pauta."],
			fatos: original.itens[1].fatos,
			fontes: original.itens[1].fontes,
			contexto: original.itens[1].contexto,
		});
		expect(enviado.versao_rascunho).toBe(original.versao_rascunho);
		// O rascunho novo volta à tela, com o aviso do salvar no item dele.
		expect(ler).toHaveBeenCalledTimes(2);
		expect(
			within(ficha(2)).getByText(
				"Confira o item 2: o texto pode citar parlamentar ou partido.",
			),
		).toBeTruthy();
		expect(document.activeElement).toBe(botao("Salvar a revisão"));
	});

	it("confere os campos antes de enviar e leva o foco ao campo que falta", async () => {
		await abrirORascunho();
		const titulo = within(ficha(1)).getByLabelText("Título");
		fireEvent.change(titulo, { target: { value: "  " } });
		fireEvent.click(botao("Salvar a revisão"));

		await waitFor(() => expect(document.activeElement).toBe(titulo));
		expect(salvar).not.toHaveBeenCalled();
		expect(titulo.getAttribute("aria-invalid")).toBe("true");
		const falta = document.getElementById(
			titulo.getAttribute("aria-describedby") ?? "",
		);
		expect(falta?.textContent).toBe("Escreva o título do item.");
		// O ato retido também pede a decisão sobre a privacidade.
		expect(frase()?.textContent).toBe(
			"A revisão não foi salva. Veja os avisos no item 1 e no item 3.",
		);
	});

	it("põe a recusa da API no item de que ela fala, com o foco nela", async () => {
		emSequencia(
			salvar,
			resposta(422, {
				detail:
					"Item 2: o campo explicação tem número que não está nos fatos enviados.",
			}),
		);
		await abrirORascunho();
		fireEvent.click(
			within(ficha(3)).getByRole("checkbox", {
				name: "Conferi a privacidade, e o ato fica na edição",
			}),
		);
		fireEvent.click(botao("Salvar a revisão"));

		const recusa = await within(ficha(2)).findByText(
			"Item 2: o campo explicação tem número que não está nos fatos enviados.",
		);
		await waitFor(() => expect(document.activeElement).toBe(recusa));
		expect(frase()?.textContent).toBe(
			"A revisão não foi salva. Veja o aviso no item 2.",
		);
		// A marcação continua na tela, por salvar.
		expect(
			within(ficha(3)).getByRole<HTMLInputElement>("checkbox", {
				name: "Conferi a privacidade, e o ato fica na edição",
			}).checked,
		).toBe(true);
	});

	it("junta o que a pessoa mudou ao rascunho que mudou no meio (409)", async () => {
		const atual = rascunhoDeExemplo();
		atual.versao_rascunho = "e".repeat(64);
		atual.itens[0] = {
			...atual.itens[0],
			explicacao: ["A outra gravação mudou este texto."],
		};
		emSequencia(ler, resposta(200, rascunhoDeExemplo()), resposta(200, atual));
		emSequencia(
			salvar,
			resposta(409, {
				detail:
					"Esse arquivo é antigo ou de outra edição. Exporte o rascunho atual.",
			}),
		);
		await abrirORascunho();
		fireEvent.change(within(ficha(1)).getByLabelText("Título"), {
			target: { value: "Meu título" },
		});
		fireEvent.click(
			within(ficha(3)).getByRole("checkbox", {
				name: "Conferi a privacidade, e o ato fica na edição",
			}),
		);
		fireEvent.click(botao("Salvar a revisão"));

		await waitFor(() =>
			expect(frase()?.textContent).toBe(
				"O rascunho mudou enquanto você revisava. Carregamos a versão atual e mantivemos o que você alterou. Confira e salve de novo.",
			),
		);
		await waitFor(() => expect(document.activeElement).toBe(frase()));
		expect(
			within(ficha(1)).getByLabelText<HTMLInputElement>("Título").value,
		).toBe("Meu título");
		expect(
			within(ficha(1)).getByLabelText<HTMLTextAreaElement>("Explicação").value,
		).toBe("A outra gravação mudou este texto.");
	});

	it.each([
		[1, "1 item que saiu da edição"],
		[2, "2 itens que saíram da edição"],
	] as const)(
		"avisa quando %i dos itens alterados ficaram de fora (409)",
		async (quantos, perda) => {
			const antes = rascunhoPronto();
			const atual = {
				...antes,
				versao_rascunho: "e".repeat(64),
				itens: antes.itens.slice(quantos),
			};
			emSequencia(ler, resposta(200, antes), resposta(200, atual));
			emSequencia(salvar, resposta(409));
			await abrirORascunho();
			for (let posicao = 1; posicao <= quantos; posicao++) {
				fireEvent.change(within(ficha(posicao)).getByLabelText("Título"), {
					target: { value: `Título que saiu do item ${posicao}` },
				});
			}
			fireEvent.change(within(ficha(1)).getByLabelText("Explicação"), {
				target: { value: "Outro campo do mesmo item." },
			});
			fireEvent.change(screen.getByLabelText("Título da edição"), {
				target: { value: "Título mantido na edição" },
			});
			fireEvent.click(botao("Salvar a revisão"));

			await screen.findByText(
				`O rascunho mudou enquanto você revisava. Carregamos a versão atual. O que você alterou em ${perda} ficou de fora; o resto foi mantido. Confira e salve de novo.`,
			);
			expect(
				screen.getByLabelText<HTMLInputElement>("Título da edição").value,
			).toBe("Título mantido na edição");
			expect(
				screen.queryByRole("region", { name: /Título que saiu/ }),
			).toBeNull();
			await waitFor(() => expect(document.activeElement).toBe(frase()));
		},
	);

	it.each([
		[false, ""],
		[true, "O que você alterou em 1 item que saiu da edição ficou de fora. "],
	] as const)(
		"avisa no 409 quando a conferência do ato deixou de existir (com item removido: %s)",
		async (saiuItem, retirada) => {
			const atual = rascunhoDeExemplo();
			atual.versao_rascunho = "e".repeat(64);
			delete atual.itens[2].privacidade_confirmada;
			if (saiuItem) {
				atual.itens.shift();
			}
			emSequencia(
				ler,
				resposta(200, rascunhoDeExemplo()),
				resposta(200, atual),
			);
			emSequencia(salvar, resposta(409));
			await abrirORascunho();
			if (saiuItem) {
				fireEvent.change(within(ficha(1)).getByLabelText("Título"), {
					target: { value: "Título que saiu" },
				});
			}
			const ato = within(ficha(3));
			fireEvent.change(ato.getByLabelText("Título"), {
				target: { value: "Título mantido no ato" },
			});
			fireEvent.click(
				ato.getByRole("checkbox", {
					name: "Conferi a privacidade, e o ato fica na edição",
				}),
			);
			fireEvent.click(botao("Salvar a revisão"));

			await screen.findByText(
				`O rascunho mudou enquanto você revisava. Carregamos a versão atual. ${retirada}A confirmação de privacidade ficou de fora em 1 ato que não precisa mais dessa conferência. O resto do que você alterou foi mantido. Confira e salve de novo.`,
			);
			const atoAtual = within(ficha(saiuItem ? 2 : 3));
			expect(atoAtual.getByLabelText<HTMLInputElement>("Título").value).toBe(
				"Título mantido no ato",
			);
			expect(
				atoAtual.queryByRole("checkbox", { name: /^Conferi a privacidade/ }),
			).toBeNull();
		},
	);

	it("avisa quando a edição foi publicada ou trocada no meio", async () => {
		emSequencia(ler, resposta(200, rascunhoDeExemplo()), resposta(200, null));
		emSequencia(
			salvar,
			resposta(409, { detail: "A edição publicada não pode ser revisada." }),
		);
		await abrirORascunho();
		fireEvent.click(
			within(ficha(3)).getByRole("checkbox", {
				name: "Conferi a privacidade, e o ato fica na edição",
			}),
		);
		fireEvent.click(botao("Salvar a revisão"));
		await screen.findByText(
			"Esta edição foi publicada ou trocada enquanto você revisava.",
		);
		semORascunhoNaPagina();
	});

	it("mantém as mudanças quando outra gravação segura a edição (503) ou a conexão cai", async () => {
		emSequencia(
			salvar,
			resposta(503, {
				detail: "Há outra gravação em andamento. Tente de novo.",
			}),
			semConexao(),
		);
		await abrirORascunho();
		const privacidade = within(ficha(3)).getByRole<HTMLInputElement>(
			"checkbox",
			{ name: "Conferi a privacidade, e o ato fica na edição" },
		);
		fireEvent.click(privacidade);

		fireEvent.click(botao("Salvar a revisão"));
		await waitFor(() =>
			expect(frase()?.textContent).toBe(
				"A revisão não foi salva. Há outra gravação em andamento. Tente de novo.",
			),
		);
		await waitFor(() => expect(document.activeElement).toBe(frase()));
		expect(privacidade.checked).toBe(true);

		fireEvent.click(botao("Salvar a revisão"));
		await waitFor(() =>
			expect(frase()?.textContent).toBe(
				"A revisão não foi salva. Não deu para falar com o servidor. Confira a internet e tente de novo.",
			),
		);
		expect(privacidade.checked).toBe(true);
		expect(ler).toHaveBeenCalledTimes(1);
	});

	it("tira o rascunho da tela quando o papel sai (404), e a guarda dá a página não encontrada", async () => {
		emSequencia(salvar, resposta(404, { detail: "Not Found" }));
		await abrirORascunho();
		emSequencia(perfil, resposta(200, COMUM));
		fireEvent.click(
			within(ficha(3)).getByRole("checkbox", {
				name: "Conferi a privacidade, e o ato fica na edição",
			}),
		);
		fireEvent.click(botao("Salvar a revisão"));
		await screen.findByRole("heading", { name: "Página não encontrada" });
		semORascunhoNaPagina();
		// Nada de "Sair sem salvar?" no caminho: o rascunho já tinha saído.
		expect(
			screen.queryByRole("dialog", { name: "Sair sem salvar?" }),
		).toBeNull();
	});

	it("leva ao login quando a sessão venceu no meio da revisão", async () => {
		emSequencia(salvar, resposta(404, { detail: "Not Found" }));
		const router = await abrirORascunho();
		emSequencia(perfil, resposta(401, { detail: "Sessão ausente." }));
		fireEvent.change(within(ficha(1)).getByLabelText("Título"), {
			target: { value: "Outro título" },
		});
		fireEvent.click(
			within(ficha(3)).getByRole("checkbox", {
				name: "Conferi a privacidade, e o ato fica na edição",
			}),
		);
		fireEvent.click(botao("Salvar a revisão"));
		await screen.findByRole("heading", { name: "Entrar na conta" });
		expect(router.state.location.pathname).toBe("/login");
	});
});

describe("publicar a edição", () => {
	it("só publica depois da confirmação na folha por cima", async () => {
		emSequencia(ler, resposta(200, rascunhoPronto()));
		await abrirORascunho();
		const publicarBotao = botao("Publicar a edição");
		expect(publicarBotao.getAttribute("aria-disabled")).toBeNull();
		expect(frase()?.textContent).toBe("A edição está pronta para publicar.");

		publicarBotao.focus();
		fireEvent.click(publicarBotao);
		const folha = screen.getByRole("dialog", { name: "Publicar a edição?" });
		expect(folha.hasAttribute("open")).toBe(true);
		expect(document.activeElement).toBe(
			within(folha).getByRole("button", { name: "Voltar à revisão" }),
		);
		fireEvent.click(
			within(folha).getByRole("button", { name: "Voltar à revisão" }),
		);
		await waitFor(() => expect(folha.hasAttribute("open")).toBe(false));
		await waitFor(() => expect(document.activeElement).toBe(publicarBotao));
		expect(publicar).not.toHaveBeenCalled();

		fireEvent.click(publicarBotao);
		fireEvent.click(
			within(
				screen.getByRole("dialog", { name: "Publicar a edição?" }),
			).getByRole("button", { name: "Publicar agora" }),
		);
		const publicada = await screen.findByText("Edição publicada.");
		expect(publicar).toHaveBeenCalledTimes(1);
		expect(publicar.mock.calls[0][0]).toMatchObject({
			path: { id: 9 },
			credentials: "include",
		});
		await waitFor(() =>
			expect(document.activeElement).toBe(publicada.parentElement),
		);
		expect(
			screen
				.getByRole("link", { name: "Ver a edição publicada" })
				.getAttribute("href"),
		).toBe("/edicoes/9");
	});

	it("diz quando a edição já estava publicada", async () => {
		emSequencia(ler, resposta(200, rascunhoPronto()));
		emSequencia(
			publicar,
			resposta(200, { situacao: "ja_publicada", edicao_id: 9 }),
		);
		await abrirORascunho();
		fireEvent.click(botao("Publicar a edição"));
		fireEvent.click(screen.getByRole("button", { name: "Publicar agora" }));
		await screen.findByText("Esta edição já estava publicada.");
	});

	it("não abre a folha enquanto falta alguma coisa, e diz o que falta", async () => {
		await abrirORascunho();
		const publicarBotao = botao("Publicar a edição");
		expect(publicarBotao.getAttribute("aria-disabled")).toBe("true");
		expect(publicarBotao.getAttribute("aria-describedby")).toBe(
			"pe-da-revisao-mensagem",
		);
		expect(frase()?.textContent).toBe(
			"Para publicar, falta escrever a explicação de 1 item, confirmar a revisão de 3 itens, conferir a privacidade de 1 ato e confirmar a cobertura da semana.",
		);
		fireEvent.click(publicarBotao);
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(publicar).not.toHaveBeenCalled();
	});

	it("não publica com alterações por salvar", async () => {
		emSequencia(ler, resposta(200, rascunhoPronto()));
		await abrirORascunho();
		fireEvent.change(within(ficha(1)).getByLabelText("Título"), {
			target: { value: "Outro título" },
		});
		expect(botao("Publicar a edição").getAttribute("aria-disabled")).toBe(
			"true",
		);
		expect(frase()?.textContent).toBe("Você tem alterações por salvar.");
	});

	it("não abre a folha quando falta só a revisão de um item", async () => {
		const rascunho = rascunhoPronto();
		rascunho.itens[0].revisado = false;
		rascunho.itens[0].fatos.pendencias = ["revisao"];
		emSequencia(ler, resposta(200, rascunho));
		await abrirORascunho();

		const publicarBotao = botao("Publicar a edição");
		expect(frase()?.textContent).toBe(
			"Para publicar, falta confirmar a revisão de 1 item.",
		);
		expect(publicarBotao.getAttribute("aria-disabled")).toBe("true");
		fireEvent.click(publicarBotao);
		expect(
			screen.queryByRole("dialog", { name: "Publicar a edição?" }),
		).toBeNull();
		expect(publicar).not.toHaveBeenCalled();
	});
});

describe("ao sair com alterações por salvar", () => {
	it("pergunta antes de seguir um link do site", async () => {
		const router = await abrirORascunho();
		fireEvent.change(within(ficha(1)).getByLabelText("Título"), {
			target: { value: "Outro título" },
		});
		fireEvent.click(screen.getByRole("link", { name: "Conta" }));
		const folha = await screen.findByRole("dialog", {
			name: "Sair sem salvar?",
		});
		await waitFor(() =>
			expect(document.activeElement).toBe(
				within(folha).getByRole("button", { name: "Continuar a revisão" }),
			),
		);
		fireEvent.click(
			within(folha).getByRole("button", { name: "Continuar a revisão" }),
		);
		await waitFor(() => expect(folha.hasAttribute("open")).toBe(false));
		expect(router.state.location.pathname).toBe("/painel");

		fireEvent.click(screen.getByRole("link", { name: "Conta" }));
		fireEvent.click(
			within(
				await screen.findByRole("dialog", { name: "Sair sem salvar?" }),
			).getByRole("button", { name: "Sair sem salvar" }),
		);
		await screen.findByRole("heading", { name: "Meu perfil" });
	});

	it("segue o link sem perguntar quando nada mudou", async () => {
		await abrirORascunho();
		fireEvent.click(screen.getByRole("link", { name: "Conta" }));
		await screen.findByRole("heading", { name: "Meu perfil" });
	});

	it("marca a revisão como a página aberta e leva aos números", async () => {
		await abrirORascunho();
		const navegacao = screen.getByRole("navigation", {
			name: "Páginas do painel",
		});
		expect(
			within(navegacao)
				.getByText("Revisão da edição")
				.getAttribute("aria-current"),
		).toBe("page");
		fireEvent.click(within(navegacao).getByRole("link", { name: "Números" }));
		await screen.findByRole("heading", { name: "Números do site" });
	});

	it("pergunta antes de ir aos números com alterações por salvar", async () => {
		const router = await abrirORascunho();
		fireEvent.change(within(ficha(1)).getByLabelText("Título"), {
			target: { value: "Outro título" },
		});
		fireEvent.click(screen.getByRole("link", { name: "Números" }));
		await screen.findByRole("dialog", { name: "Sair sem salvar?" });
		expect(router.state.location.pathname).toBe("/painel");
	});

	it("pede o aviso do navegador ao fechar ou recarregar a aba", async () => {
		window.history.replaceState(null, "", "/painel");
		abrir({ history: createBrowserHistory() });
		await screen.findByRole("region", { name: /^Item 1:/ });
		const fechar = () => {
			const evento = new Event("beforeunload", { cancelable: true });
			window.dispatchEvent(evento);
			return evento.defaultPrevented;
		};
		expect(fechar()).toBe(false);
		fireEvent.change(within(ficha(1)).getByLabelText("Título"), {
			target: { value: "Outro título" },
		});
		expect(fechar()).toBe(true);
	});
});

describe("o rascunho fica só na página", () => {
	it("não vai para o console, a URL nem o armazenamento", async () => {
		emSequencia(
			salvar,
			resposta(422, {
				detail:
					"Item 1: o campo título tem número que não está nos fatos enviados.",
			}),
			resposta(200, SALVO),
		);
		const router = await abrirORascunho();
		fireEvent.change(within(ficha(1)).getByLabelText("Título"), {
			target: { value: "Câmara aprova as bibliotecas em 2027" },
		});
		fireEvent.click(
			within(ficha(3)).getByRole("checkbox", {
				name: "Conferi a privacidade, e o ato fica na edição",
			}),
		);
		fireEvent.click(botao("Salvar a revisão"));
		await within(ficha(1)).findByText(
			"Item 1: o campo título tem número que não está nos fatos enviados.",
		);
		fireEvent.click(screen.getAllByRole("link", { name: /bibliotecas/ })[0]);

		const saida = oQueSaiuDaPagina();
		for (const texto of [...TEXTOS_DO_RASCUNHO, "2027"]) {
			expect(saida).not.toContain(texto);
		}
		expect(router.state.location.pathname).toBe("/painel");
		expect(router.state.location.searchStr).toBe("");
		expect(localStorage.length).toBe(0);
		expect(sessionStorage.length).toBe(0);
		// O índice só leva ao trecho do item, pela posição.
		expect(window.location.href).not.toMatch(/bibliotec|2027/);
	});
});
