// @vitest-environment jsdom
import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consultarPerfil, consultarProgressoConta, sairConta } from "@/client";
import type { TrilhaNaLista } from "@/lib/conteudo";
import { Route as Perfil } from "./perfil";

// O perfil da conta (DESIGN.md, "Perfil da conta"), com duas trilhas inventadas.
// A saudação e a leitura chegam com a conta, cada uma no lugar que o HTML já
// guardava; a revisão da edição aparece só para a administradora.
const ambiente = vi.hoisted(() => ({ API_URL: "https://api.example.com" }));
vi.mock("@/env", () => ({ ENV: ambiente }));
// As mesmas funções também depois do vi.resetModules do teste da outra aba: o
// lib/progresso importa o cliente a cada pedido.
const cliente = vi.hoisted(() => ({
	consultarPerfil: vi.fn(),
	sairConta: vi.fn(),
	consultarProgressoConta: vi.fn(),
	alterarProgressoConta: vi.fn(),
}));
vi.mock("@/client", () => cliente);

const perfil = vi.mocked(consultarPerfil);
const sair = vi.mocked(sairConta);
const leitura = vi.mocked(consultarProgressoConta);

const SESSAO = "mandatometro:sessao-do-progresso";
const ESPELHO = "mandatometro:artigos-lidos-na-conta";

const ABERTURA =
	"A sua conta guarda os artigos que você leu. Comece uma trilha no celular e continue no computador, de onde parou.";
const SEM_RESPOSTA =
	"Não conseguimos abrir a sua conta agora. Confira a internet ou espere um pouco e tente de novo.";
const SEM_API = "A conta ainda não funciona neste endereço do site.";

const artigo = (trilha: string, slug: string, titulo: string) => ({
	trilha,
	slug,
	titulo,
	resumo: "Resumo inventado.",
	ordem: 1,
	fontes: [],
	minutos: 2,
});

// Duas trilhas inventadas, com dois e três artigos.
const TRILHAS: TrilhaNaLista[] = [
	{
		slug: "alfa",
		titulo: "Trilha Alfa",
		descricao: "Descrição inventada.",
		ordem: 1,
		artigos: [
			artigo("alfa", "primeiro", "Primeiro artigo"),
			artigo("alfa", "segundo", "Segundo artigo"),
		],
	},
	{
		slug: "beta",
		titulo: "Trilha Beta",
		descricao: "Descrição inventada.",
		ordem: 2,
		artigos: [
			artigo("beta", "terceiro", "Terceiro artigo"),
			artigo("beta", "quarto", "Quarto artigo"),
			artigo("beta", "quinto", "Quinto artigo"),
		],
	},
];
const TODOS = TRILHAS.flatMap((trilha) =>
	trilha.artigos.map((item) => `${item.trilha}/${item.slug}`),
);

const MARIA = { nome: "Maria Fictícia de Exemplo", papel: "comum" } as const;

beforeEach(() => {
	vi.clearAllMocks();
	localStorage.clear();
	ambiente.API_URL = "https://api.example.com";
	// A sincronia do progresso pede a leitura da conta e fica esperando: o
	// espelho que o teste grava no navegador não muda.
	leitura.mockImplementation(() => new Promise<never>(() => {}));
});

afterEach(() => {
	cleanup();
	localStorage.clear();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

/** A resposta do GET /contas/me. */
function resposta(status: number, conta?: typeof MARIA | object) {
	return {
		data: conta,
		request: new Request("https://api.example.com/contas/me"),
		response: new Response(null, { status }),
	} as never;
}

/** A resposta do GET /contas/progresso. */
function lidosNaConta(status: number, lidos?: string[]) {
	return {
		data: lidos && { lidos },
		request: new Request("https://api.example.com/contas/progresso"),
		response: new Response(null, { status }),
	} as never;
}

/** A leitura da conta que espera o teste responder ou fazer a rede falhar. */
type LeituraPendente = {
	responder: (valor: never) => void;
	recusar: (erro: Error) => void;
};

function esperarLeitura(): LeituraPendente {
	let responder: LeituraPendente["responder"] = () => {};
	let recusar: LeituraPendente["recusar"] = () => {};
	leitura.mockReturnValue(
		new Promise<never>((resolver, rejeitar) => {
			responder = resolver;
			recusar = rejeitar;
		}),
	);
	return {
		responder: (valor) => responder(valor),
		recusar: (erro) => recusar(erro),
	};
}

/** A sessão anotada neste navegador e os artigos lidos no espelho da conta. */
function gravarLidos(ids: string[]) {
	localStorage.setItem(SESSAO, crypto.randomUUID());
	localStorage.setItem(ESPELHO, JSON.stringify(ids));
}

/** A sessão anotada pela entrada, num navegador que ainda não tem o espelho. */
function entrarSemCopia() {
	localStorage.setItem(SESSAO, crypto.randomUUID());
}

/** O /perfil num site de mentira, com as páginas para onde ele leva. */
function abrir() {
	const raiz = createRootRoute();
	const pagina = (path: string) =>
		createRoute({ getParentRoute: () => raiz, path, component: () => null });
	const router = createRouter({
		routeTree: raiz.addChildren([
			createRoute({
				getParentRoute: () => raiz,
				path: "/perfil",
				loader: () => TRILHAS,
				component: Perfil.options.component,
			}),
			pagina("/painel"),
			pagina("/termo"),
			pagina("/trilhas"),
			pagina("/trilhas/$trilha"),
			pagina("/trilhas/$trilha/$artigo"),
		]),
		history: createMemoryHistory({ initialEntries: ["/perfil"] }),
	});
	// O jsdom não rola a página, e o router tenta rolar ao abrir.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	render(<RouterProvider router={router} />);
}

/** O que o leitor de tela ouve da saudação. */
const saudacao = () =>
	document.querySelector(".saudacao .sr-only")?.textContent ?? null;

/** A frase à vista de cada trilha do quadro. */
const frasesDasTrilhas = () =>
	[...document.querySelectorAll(".perfil-trilha-progresso > p")].map(
		(frase) => frase.textContent,
	);

/** Cada azulejo de artigo: se está cru (as quatro peças) e se tem o visto. */
const azulejos = () =>
	[...document.querySelectorAll(".perfil-azulejos > li")].map((azulejo) => ({
		cru: [...azulejo.querySelectorAll(".az")].every((peca) =>
			peca.classList.contains("cru"),
		),
		visto: azulejo.querySelector(".marca-de-lido") !== null,
	}));

const CRU = { cru: true, visto: false };
const LIDO = { cru: false, visto: true };

/** As cópias invisíveis que guardam o lugar de um texto, no HTML desde o começo. */
const copias = (lugar: Element) =>
	[...lugar.querySelectorAll(':scope > [aria-hidden="true"]')].map((copia) =>
		copia.textContent?.trim(),
	);

describe("o perfil antes de a conta responder", () => {
	it("espera a conta com os azulejos crus, sem nome e sem botão, mesmo com lidos no navegador", async () => {
		perfil.mockReturnValue(new Promise<never>(() => {}));
		gravarLidos(["alfa/primeiro"]);
		abrir();

		expect((await screen.findByRole("status")).textContent).toBe(
			"Verificando sua sessão…",
		);
		expect(saudacao()).toBe("Olá!");
		expect(azulejos()).toEqual([CRU, CRU, CRU, CRU, CRU]);
		expect(frasesDasTrilhas()).toEqual(["", ""]);
		expect(
			screen.queryByRole("link", { name: /Começar|Continuar/ }),
		).toBeNull();
		expect(screen.queryByText(/Você entrou como/)).toBeNull();
	});

	it("guarda desde o começo o lugar de cada frase e do botão, e os mesmos nós recebem a conta", async () => {
		let responderConta: (valor: never) => void = () => {};
		perfil.mockReturnValue(
			new Promise<never>((resolver) => {
				responderConta = resolver;
			}),
		);
		gravarLidos(["alfa/primeiro"]);
		abrir();

		const status = await screen.findByRole("status");
		const pe = document.querySelector(".cartaz-pe") as HTMLElement;
		const abertura = pe.querySelector(".abertura") as HTMLElement;
		const lugarDoBotao = pe.querySelector(".lugar-do-botao") as HTMLElement;
		const [alfa, beta] = document.querySelectorAll(".perfil-trilha-progresso");

		expect(copias(abertura)).toEqual([ABERTURA, SEM_API, SEM_RESPOSTA]);
		expect(copias(status.parentElement as HTMLElement)).toEqual([
			"Verificando sua sessão…",
			"Você ainda não leu nenhum artigo.",
			"Você leu 4 de 5 artigos.",
			"Você leu os 5 artigos.",
		]);
		expect(copias(lugarDoBotao)).toEqual([
			"Começar pelo primeiro artigo",
			"Continuar de onde parou: Primeiro artigo",
			"Continuar de onde parou: Segundo artigo",
			"Continuar de onde parou: Terceiro artigo",
			"Continuar de onde parou: Quarto artigo",
			"Continuar de onde parou: Quinto artigo",
			"Ver as trilhas",
		]);
		expect(copias(alfa as Element)).toEqual([
			"Você ainda não começou esta trilha.",
			"Você leu 1 de 2.",
			"Você terminou a trilha.",
		]);
		expect(copias(beta as Element)).toEqual([
			"Você ainda não começou esta trilha.",
			"Você leu 2 de 3.",
			"Você terminou a trilha.",
		]);

		await act(async () => responderConta(resposta(200, MARIA)));
		await screen.findByText("Você entrou como Maria Fictícia de Exemplo.");

		expect(screen.getByRole("status")).toBe(status);
		expect(status.textContent).toBe("Você leu 1 de 5 artigos.");
		expect(document.querySelector(".cartaz-pe .lugar-do-botao")).toBe(
			lugarDoBotao,
		);
		expect(lugarDoBotao.querySelector("a")?.textContent?.trim()).toBe(
			"Continuar de onde parou: Segundo artigo",
		);
	});
});

describe("o perfil com a conta aberta", () => {
	it("diz o nome, a leitura e onde continuar, sem a revisão da edição", async () => {
		perfil.mockResolvedValue(resposta(200, MARIA));
		gravarLidos(["alfa/primeiro"]);
		abrir();

		await screen.findByText("Você entrou como Maria Fictícia de Exemplo.");
		expect(saudacao()).toBe("Olá, Maria.");
		expect(screen.getByRole("status").textContent).toBe(
			"Você leu 1 de 5 artigos.",
		);
		expect(frasesDasTrilhas()).toEqual([
			"Você leu 1 de 2.",
			"Você ainda não começou esta trilha.",
		]);
		// As peças viram num efeito, depois do quadro em que o nome aparece.
		await waitFor(() => expect(azulejos()).toEqual([LIDO, CRU, CRU, CRU, CRU]));
		expect(
			screen
				.getByRole("link", { name: "Continuar de onde parou: Segundo artigo" })
				.getAttribute("href"),
		).toBe("/trilhas/alfa/segundo");
		expect(
			screen.queryByRole("link", { name: "Revisar a edição da semana" }),
		).toBeNull();
	});

	it("leva a administradora à revisão da edição", async () => {
		perfil.mockResolvedValue(
			resposta(200, { nome: "Ana Fictícia", papel: "administradora" }),
		);
		gravarLidos([]);
		abrir();

		const link = await screen.findByRole("link", {
			name: "Revisar a edição da semana",
		});
		expect(link.getAttribute("href")).toBe("/painel");
	});

	it("sem nada lido, começa pelo primeiro artigo", async () => {
		perfil.mockResolvedValue(resposta(200, MARIA));
		gravarLidos([]);
		abrir();

		const botao = await screen.findByRole("link", {
			name: "Começar pelo primeiro artigo",
		});
		expect(botao.getAttribute("href")).toBe("/trilhas/alfa/primeiro");
		expect(screen.getByRole("status").textContent).toBe(
			"Você ainda não leu nenhum artigo.",
		);
		expect(frasesDasTrilhas()).toEqual([
			"Você ainda não começou esta trilha.",
			"Você ainda não começou esta trilha.",
		]);
		expect(azulejos()).toEqual([CRU, CRU, CRU, CRU, CRU]);
	});

	it("com tudo lido, leva às trilhas e mostra todos os azulejos com o visto", async () => {
		perfil.mockResolvedValue(resposta(200, MARIA));
		gravarLidos(TODOS);
		abrir();

		const botao = await screen.findByRole("link", { name: "Ver as trilhas" });
		expect(botao.getAttribute("href")).toBe("/trilhas");
		expect(screen.getByRole("status").textContent).toBe(
			"Você leu os 5 artigos.",
		);
		expect(frasesDasTrilhas()).toEqual([
			"Você terminou a trilha.",
			"Você terminou a trilha.",
		]);
		await waitFor(() =>
			expect(azulejos()).toEqual([LIDO, LIDO, LIDO, LIDO, LIDO]),
		);
	});

	it("mostra o que a conta guarda e leva ao termo, à troca de senha e à exclusão", async () => {
		perfil.mockResolvedValue(resposta(200, MARIA));
		gravarLidos([]);
		abrir();
		await screen.findByText("Você entrou como Maria Fictícia de Exemplo.");

		const conta = screen.getByRole("region", { name: "Sua conta" });
		expect(conta.querySelector(".perfil-texto")?.textContent).toBe(
			"A conta guarda o seu nome, o seu e-mail, um código da sua senha (nunca a senha), os dados opcionais que você escolheu dar e os artigos que você leu. As respostas dos quizzes ficam só neste navegador, e a newsletter é uma inscrição à parte.",
		);
		expect(conta.querySelector(".perfil-nota")?.textContent).toBe(
			"Você recebe no e-mail um link para criar a senha nova. Depois, entre de novo em cada aparelho.",
		);
		const endereco = (nome: string) =>
			screen.getByRole("link", { name: nome }).getAttribute("href");
		expect(endereco("Ler o termo da conta")).toBe("/termo#o-que-guarda");
		expect(endereco("Trocar a senha")).toBe("/cadastro/recuperar");
		expect(endereco("Excluir conta")).toBe("/cadastro/excluir");
		expect(endereco("contato@mandatometro.com.br")).toBe(
			"mailto:contato@mandatometro.com.br",
		);
		expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
			"Meu perfil",
		);
	});
});

describe("a primeira leitura da conta neste navegador", () => {
	it("sem a cópia da conta, espera a leitura sem número, sem frase de trilha, sem cor e sem botão, e depois mostra a leitura certa", async () => {
		perfil.mockResolvedValue(resposta(200, MARIA));
		const pendente = esperarLeitura();
		entrarSemCopia();
		abrir();

		await screen.findByText("Você entrou como Maria Fictícia de Exemplo.");
		await waitFor(() => expect(leitura).toHaveBeenCalledTimes(1));
		const status = screen.getByRole("status");
		expect(status.textContent).toBe("Verificando sua sessão…");
		expect(frasesDasTrilhas()).toEqual(["", ""]);
		expect(azulejos()).toEqual([CRU, CRU, CRU, CRU, CRU]);
		expect(
			screen.queryByRole("link", { name: /Começar|Continuar|Ver as trilhas/ }),
		).toBeNull();

		await act(async () =>
			pendente.responder(
				lidosNaConta(200, ["alfa/primeiro", "alfa/segundo", "beta/terceiro"]),
			),
		);
		await waitFor(() =>
			expect(status.textContent).toBe("Você leu 3 de 5 artigos."),
		);
		expect(frasesDasTrilhas()).toEqual([
			"Você terminou a trilha.",
			"Você leu 1 de 3.",
		]);
		await waitFor(() =>
			expect(azulejos()).toEqual([LIDO, LIDO, LIDO, CRU, CRU]),
		);
		expect(
			screen
				.getByRole("link", { name: "Continuar de onde parou: Quarto artigo" })
				.getAttribute("href"),
		).toBe("/trilhas/beta/quarto");
	});

	it.each<[string, (pendente: LeituraPendente) => void]>([
		[
			"a API responde com erro",
			({ responder }) => responder(lidosNaConta(500)),
		],
		["a rede falha", ({ recusar }) => recusar(new TypeError("A rede falhou."))],
		[
			"a API não tem a leitura",
			({ responder }) => responder(lidosNaConta(404)),
		],
	])(
		"quando %s, o erro fica no lugar da abertura, com o Tentar de novo, e a leitura não aparece",
		async (_, falhar) => {
			perfil.mockResolvedValue(resposta(200, MARIA));
			const pendente = esperarLeitura();
			entrarSemCopia();
			abrir();
			// A falha chega depois de a página mostrar a espera, como no navegador.
			await screen.findByText("Você entrou como Maria Fictícia de Exemplo.");
			await waitFor(() => expect(leitura).toHaveBeenCalledTimes(1));
			expect(screen.getByRole("status").textContent).toBe(
				"Verificando sua sessão…",
			);

			await act(async () => falhar(pendente));

			const erro = await screen.findByText(SEM_RESPOSTA, { selector: "p" });
			expect(erro.classList.contains("ainda-nao")).toBe(true);
			expect(
				screen
					.getByRole("link", { name: "Tentar de novo" })
					.getAttribute("href"),
			).toBe("/perfil");
			expect(screen.getByRole("status").textContent).toBe("");
			expect(frasesDasTrilhas()).toEqual(["", ""]);
			expect(azulejos()).toEqual([CRU, CRU, CRU, CRU, CRU]);
			expect(
				screen.queryByRole("link", {
					name: /Começar|Continuar|Ver as trilhas/,
				}),
			).toBeNull();
			// A conta respondeu: o nome continua, e só a leitura fica de fora.
			expect(saudacao()).toBe("Olá, Maria.");
		},
	);

	it("com a cópia desta sessão no navegador, abre com ela sem esperar a leitura", async () => {
		perfil.mockResolvedValue(resposta(200, MARIA));
		gravarLidos(["alfa/primeiro"]);
		abrir();

		await screen.findByText("Você entrou como Maria Fictícia de Exemplo.");
		await waitFor(() => expect(leitura).toHaveBeenCalledTimes(1));
		expect(screen.getByRole("status").textContent).toBe(
			"Você leu 1 de 5 artigos.",
		);
		expect(frasesDasTrilhas()).toEqual([
			"Você leu 1 de 2.",
			"Você ainda não começou esta trilha.",
		]);
		expect(
			screen
				.getByRole("link", { name: "Continuar de onde parou: Segundo artigo" })
				.getAttribute("href"),
		).toBe("/trilhas/alfa/segundo");
	});
});

describe("a sessão que acaba depois de a conta responder", () => {
	// Como a outra aba apaga ou troca a chave: o navegador avisa esta aba pelo
	// evento do armazenamento.
	function outraAba(mudar: () => void) {
		mudar();
		window.dispatchEvent(new StorageEvent("storage", { key: SESSAO }));
	}

	it.each<[string, (pendente: LeituraPendente) => void]>([
		[
			"a saída ou a exclusão em outra aba apagam a chave da sessão",
			() =>
				outraAba(() => {
					localStorage.removeItem(ESPELHO);
					localStorage.removeItem(SESSAO);
				}),
		],
		[
			"uma entrada nova em outra aba troca a chave da sessão",
			() =>
				outraAba(() => {
					localStorage.removeItem(ESPELHO);
					localStorage.setItem(SESSAO, crypto.randomUUID());
				}),
		],
		[
			"a leitura da conta recebe 401",
			({ responder }) => responder(lidosNaConta(401)),
		],
	])(
		"quando %s, tira o nome e as marcas da tela e vai para o login",
		async (_, acabar) => {
			const trocar = vi.fn();
			vi.stubGlobal("location", { ...window.location, replace: trocar });
			perfil.mockResolvedValue(resposta(200, MARIA));
			const pendente = esperarLeitura();
			gravarLidos(["alfa/primeiro"]);
			abrir();
			await screen.findByText("Você entrou como Maria Fictícia de Exemplo.");
			await waitFor(() =>
				expect(azulejos()).toEqual([LIDO, CRU, CRU, CRU, CRU]),
			);
			await waitFor(() => expect(leitura).toHaveBeenCalledTimes(1));

			await act(async () => acabar(pendente));

			await waitFor(() => expect(trocar).toHaveBeenCalledWith("/login"));
			expect(screen.queryByText(/Você entrou como/)).toBeNull();
			expect(saudacao()).toBe("Olá!");
			expect(azulejos()).toEqual([CRU, CRU, CRU, CRU, CRU]);
			expect(
				screen.queryByRole("link", {
					name: /Começar|Continuar|Ver as trilhas/,
				}),
			).toBeNull();
		},
	);

	it("quando a saída vem de outra aba, vai para o login sem mostrar antes a leitura vazia ao lado do nome", async () => {
		const trocar = vi.fn();
		vi.stubGlobal("location", { ...window.location, replace: trocar });
		perfil.mockResolvedValue(resposta(200, MARIA));
		const pendente = esperarLeitura();
		entrarSemCopia();
		abrir();
		await screen.findByText("Você entrou como Maria Fictícia de Exemplo.");
		await waitFor(() => expect(leitura).toHaveBeenCalledTimes(1));
		await act(async () =>
			pendente.responder(lidosNaConta(200, ["alfa/primeiro"])),
		);
		expect(screen.getByRole("status").textContent).toBe(
			"Você leu 1 de 5 artigos.",
		);

		// A outra aba é outro documento, com o próprio lib/progresso. O que ela
		// grava chega aqui um evento por chave, na ordem das gravações, e só
		// quando o valor muda.
		const escritas: [string, string | null][] = [];
		const apagar = vi
			.spyOn(Storage.prototype, "removeItem")
			.mockImplementation((chave) => {
				escritas.push([chave, null]);
			});
		const gravar = vi
			.spyOn(Storage.prototype, "setItem")
			.mockImplementation((chave, valor) => {
				escritas.push([chave, valor]);
			});
		vi.resetModules();
		const outraAba = await import("@/lib/progresso");
		outraAba.encerrarProgressoNaConta();
		apagar.mockRestore();
		gravar.mockRestore();

		const frases: (string | null)[] = [];
		for (const [chave, valor] of escritas) {
			const antes = localStorage.getItem(chave);
			if (valor === null) localStorage.removeItem(chave);
			else localStorage.setItem(chave, valor);
			if (localStorage.getItem(chave) === antes) continue;
			act(() => {
				window.dispatchEvent(new StorageEvent("storage", { key: chave }));
			});
			frases.push(screen.getByRole("status").textContent);
		}

		expect(frases).toEqual([
			"Verificando sua sessão…",
			"Verificando sua sessão…",
		]);
		expect(trocar).toHaveBeenCalledWith("/login");
	});
});

describe("o perfil sem a conta", () => {
	it.each([
		["a API responde com erro", () => perfil.mockResolvedValue(resposta(500))],
		[
			"a rede falha",
			() => perfil.mockRejectedValue(new TypeError("A rede falhou.")),
		],
	])(
		"quando %s, o erro fica no lugar da abertura, com o Tentar de novo",
		async (_, falhar) => {
			falhar();
			abrir();

			const erro = await screen.findByText(SEM_RESPOSTA, { selector: "p" });
			expect(erro.classList.contains("ainda-nao")).toBe(true);
			expect(
				screen
					.getByRole("link", { name: "Tentar de novo" })
					.getAttribute("href"),
			).toBe("/perfil");
			expect(screen.getByRole("status").textContent).toBe("");
			expect(screen.queryByText(/Você entrou como/)).toBeNull();
		},
	);

	it("sem a API, diz que a conta não funciona neste endereço e leva às trilhas", async () => {
		ambiente.API_URL = "";
		abrir();

		await screen.findByText(SEM_API, { selector: "p" });
		expect(
			screen.getByRole("link", { name: "Ver as trilhas" }).getAttribute("href"),
		).toBe("/trilhas");
		expect(screen.getByRole("status").textContent).toBe("");
		expect(screen.queryByRole("button", { name: "Sair" })).toBeNull();
		expect(perfil).not.toHaveBeenCalled();
	});

	it("sem sessão, manda para o login sem mostrar nada da conta", async () => {
		const trocar = vi.fn();
		vi.stubGlobal("location", { ...window.location, replace: trocar });
		perfil.mockResolvedValue(resposta(401));
		gravarLidos(["alfa/primeiro"]);
		abrir();

		await waitFor(() => expect(trocar).toHaveBeenCalledWith("/login"));
		expect(azulejos()).toEqual([CRU, CRU, CRU, CRU, CRU]);
		expect(screen.queryByText(/Você entrou como/)).toBeNull();
	});
});

describe("o Sair do perfil", () => {
	it("fica desligado enquanto a API confirma, e o segundo clique não manda outro pedido", async () => {
		perfil.mockResolvedValue(resposta(200, MARIA));
		sair.mockReturnValue(new Promise<never>(() => {}));
		gravarLidos([]);
		abrir();

		const botao = await screen.findByRole("button", { name: "Sair" });
		fireEvent.click(botao);
		await waitFor(() =>
			expect(botao.getAttribute("aria-disabled")).toBe("true"),
		);
		fireEvent.click(botao);
		expect(sair).toHaveBeenCalledTimes(1);
	});

	it("quando a saída falha, diz em palavras, e a conta continua aberta neste navegador", async () => {
		perfil.mockResolvedValue(resposta(200, MARIA));
		sair.mockResolvedValue({
			response: new Response(null, { status: 500 }),
		} as never);
		gravarLidos(["alfa/primeiro"]);
		abrir();

		fireEvent.click(await screen.findByRole("button", { name: "Sair" }));
		expect((await screen.findByRole("alert")).textContent).toBe(
			"Não deu para sair. Confira a internet ou espere um pouco e tente de novo.",
		);
		expect(localStorage.getItem(SESSAO)).not.toBeNull();
		expect(
			screen
				.getByRole("button", { name: "Sair" })
				.getAttribute("aria-disabled"),
		).toBeNull();
	});
});
