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
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consultarPerfil } from "@/client";
import { buscarTrilhas } from "@/lib/conteudo";
import {
	consultarNumerosPainel,
	type NumerosPainel,
} from "@/lib/contrato-da-297";
import { Route as Autenticado } from "@/routes/_autenticado";
import { Route as Numeros } from "@/routes/_autenticado/painel_.numeros";
import { NaoEncontrado } from "../nao-encontrado";
import { PaginaDeErro } from "../pagina-de-erro";

// A tela dos números do painel com a guarda do layout, num site de mentira: o
// login, o perfil, a revisão e a página não encontrada. A API fica simulada no
// cliente: cada função devolve o que o cliente devolveria (os dados, o erro e
// a resposta, ou a resposta vazia sem conexão). Os números e as trilhas são
// inventados.
const ambiente = vi.hoisted(() => ({
	API_URL: "https://api.example.com" as string | undefined,
}));
vi.mock("@/env", () => ({ ENV: ambiente }));
vi.mock("@/client", () => ({ consultarPerfil: vi.fn() }));
vi.mock("@/lib/contrato-da-297", () => ({ consultarNumerosPainel: vi.fn() }));
vi.mock("@/lib/conteudo", () => ({ buscarTrilhas: vi.fn() }));

const perfil = vi.mocked(consultarPerfil);
const pedirNumeros = vi.mocked(consultarNumerosPainel);
const catalogo = vi.mocked(buscarTrilhas);

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

/** O catálogo das trilhas, como o loader recebe, com três trilhas inventadas. */
const TRILHAS = [
	{ slug: "alfa", titulo: "Trilha Alfa" },
	{ slug: "beta", titulo: "Trilha Beta" },
	{ slug: "gama", titulo: "Trilha Gama" },
];

/** Os 30 dias das visitas, de 25 de outubro a 23 de novembro, com o pico em 12/11. */
function diasDeExemplo() {
	return Array.from({ length: 30 }, (_, indice) => {
		const dia = new Date(Date.UTC(2026, 9, 25 + indice))
			.toISOString()
			.slice(0, 10);
		return { dia, total: dia === "2026-11-12" ? 214 : indice * 5 };
	});
}

/** Os números inventados, no formato do contrato da #297. */
function numerosDeExemplo(): NumerosPainel {
	return {
		pessoas: {
			contas: {
				total: 48,
				confirmadas: 41,
				novas_por_semana: [
					{ semana: "2026-11-02", total: 12 },
					{ semana: "2026-11-09", total: 30 },
					{ semana: "2026-11-16", total: 0 },
					{ semana: "2026-11-23", total: 6 },
				],
			},
			inscritos: {
				total: 112,
				novos_por_semana: [
					{ semana: "2026-11-09", total: 98 },
					{ semana: "2026-11-16", total: 0 },
					{ semana: "2026-11-23", total: 14 },
				],
			},
		},
		uso: {
			artigos_lidos_por_trilha: [
				{ trilha: "beta", total: 140 },
				{ trilha: "alfa", total: 212 },
				{ trilha: "gama", total: 0 },
			],
			trilhas_concluidas: [
				{ trilha: "alfa", total: 5 },
				{ trilha: "beta", total: 1 },
				{ trilha: "gama", total: 0 },
			],
			contas_ativas_por_semana: [
				{ semana: "2026-11-09", total: 25 },
				{ semana: "2026-11-16", total: 31 },
				{ semana: "2026-11-23", total: 19 },
			],
			contas_que_voltaram: 9,
		},
		visitas: {
			por_dia: diasDeExemplo(),
			paginas_mais_vistas: [
				{ caminho: "/", total: 820 },
				{ caminho: "/trilhas/alfa/primeiro", total: 310 },
				{ caminho: "/parlamentares/123", total: 41 },
			],
		},
		newsletter: {
			edicoes_publicadas: 3,
			ultima_publicada_em: "2026-11-16T13:37:00+00:00",
			inscritos_com_a_ultima_edicao: 98,
		},
		piloto: {
			versao_quiz: "processo-legislativo-final-v1",
			total_perguntas: 12,
			tentativas: { antes: 30, depois: 26, total: 56 },
			participacoes: {
				antes: 27,
				depois: 24,
				total: 31,
				pareadas: 20,
				somente_antes: 7,
				somente_depois: 4,
			},
			medias: {
				antes: {
					quantidade: 27,
					acertos: 5.6,
					percentual: 46.67,
					situacao: "disponivel",
				},
				depois: {
					quantidade: 24,
					acertos: 8.64,
					percentual: 72,
					situacao: "disponivel",
				},
			},
			pares: {
				quantidade: 20,
				antes: { acertos: 5.5, percentual: 45.83 },
				depois: { acertos: 8.5, percentual: 70.83 },
				diferenca_acertos: 3,
				diferenca_pontos_percentuais: 25,
				situacao: "disponivel",
			},
		},
		sistema: {
			parlamentares: 594,
			mandatos: 1203,
			proposicoes: 18432,
			votacoes: 2210,
			votos: 312480,
			atos: 950,
			videos: 120,
			proposicoes_com_tema: 15011,
			bens: 8020,
			meses_ipca: 400,
			ultimas_coletas: {
				camara: "2026-11-23T09:10:00+00:00",
				senado: "2026-11-23T09:40:00+00:00",
				diario_oficial: "2026-11-22T11:00:00+00:00",
				tse: null,
				banco_central: "2026-11-01T12:00:00+00:00",
			},
		},
	};
}

/** Os números que o site nunca põe fora da página: o console e o armazenamento. */
const NUMEROS_DA_PAGINA = [
	"312480",
	"312.480",
	"2.299",
	"18.432",
	"Trilha Alfa",
];

let consoleChamado: ReturnType<typeof vi.spyOn>[] = [];

beforeEach(() => {
	vi.clearAllMocks();
	ambiente.API_URL = "https://api.example.com";
	localStorage.clear();
	sessionStorage.clear();
	// O console fica mudo e anotado: nada dos números pode chegar a ele.
	consoleChamado = (["log", "info", "warn", "error", "debug"] as const).map(
		(nome) => vi.spyOn(console, nome).mockImplementation(() => {}),
	);
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	emSequencia(perfil, resposta(200, ADMINISTRADORA));
	emSequencia(pedirNumeros, resposta(200, numerosDeExemplo()));
	catalogo.mockResolvedValue(TRILHAS as never);
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

/** O site de mentira, aberto em /painel/numeros, com a guarda e a página de verdade. */
function abrir() {
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
	const numeros = Numeros.update({
		id: "/painel_/numeros",
		path: "/painel/numeros",
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
			autenticado.addChildren([numeros]),
			pagina("/login", "Entrar na conta"),
			pagina("/perfil", "Meu perfil"),
			pagina("/painel", "Revisão da edição"),
		]),
		history: createMemoryHistory({ initialEntries: ["/painel/numeros"] }),
		defaultNotFoundComponent: NaoEncontrado,
		defaultErrorComponent: PaginaDeErro,
	});
	render(<RouterProvider router={router} />);
	return router;
}

/** Abre a página e espera os números aparecerem. */
async function abrirOsNumeros() {
	const router = abrir();
	await screen.findByRole("heading", { level: 1, name: "Números do site" });
	await screen.findByRole("region", { name: "Visitas" });
	return router;
}

const secao = (nome: string) => screen.getByRole("region", { name: nome });

/** As linhas da lista embaixo do título: o nome e o valor de cada uma. */
const valoresDe = (titulo: HTMLElement) =>
	[...(titulo.nextElementSibling?.children ?? [])].map((linha) => [
		linha.querySelector("dt")?.textContent,
		linha.querySelector("dd")?.textContent,
	]);

/** Cada número do resumo: o nome, o número e a referência, na ordem do HTML. */
const resumo = () =>
	[...document.querySelectorAll(".resumo-dos-numeros > div")].map((grupo) =>
		[...grupo.children].map((filho) => filho.textContent),
	);

describe("a guarda dos números", () => {
	it("abre os números para a administradora, depois de conferir a sessão", async () => {
		await abrirOsNumeros();
		expect(perfil).toHaveBeenCalledTimes(1);
		expect(pedirNumeros).toHaveBeenCalledTimes(1);
		// O perfil vem antes dos números, e os dois levam o cookie, sem cache.
		expect(perfil.mock.invocationCallOrder[0]).toBeLessThan(
			pedirNumeros.mock.invocationCallOrder[0],
		);
		expect(pedirNumeros.mock.calls[0][0]).toMatchObject({
			credentials: "include",
			cache: "no-store",
		});
	});

	it("dá a página não encontrada à conta comum, sem pedir os números", async () => {
		emSequencia(perfil, resposta(200, COMUM));
		abrir();
		await screen.findByRole("heading", { name: "Página não encontrada" });
		expect(pedirNumeros).not.toHaveBeenCalled();
	});

	it("leva quem não entrou ao login, sem pedir os números", async () => {
		emSequencia(perfil, resposta(401, { detail: "Sessão ausente." }));
		const router = abrir();
		await screen.findByRole("heading", { name: "Entrar na conta" });
		expect(router.state.location.pathname).toBe("/login");
		expect(pedirNumeros).not.toHaveBeenCalled();
	});

	describe.each([401, 404])("perda de acesso com %i", (status) => {
		it("mostra só a conferência da sessão enquanto a guarda responde", async () => {
			let responderGuarda!: (resultado: Devolvido) => void;
			const guarda = new Promise<Devolvido>((resolve) => {
				responderGuarda = resolve;
			});
			emSequencia(perfil, resposta(200, ADMINISTRADORA), guarda);
			emSequencia(pedirNumeros, resposta(status, { detail: "Sem acesso." }));
			abrir();

			await screen.findByText("Verificando sua sessão…");
			expect(perfil).toHaveBeenCalledTimes(2);
			const principal = screen.getByRole("main");
			expect(principal.textContent).toBe("Verificando sua sessão…");
			expect(principal.querySelector(".pagina-dos-numeros")).toBeNull();

			responderGuarda(
				status === 401
					? resposta(401, { detail: "Sessão ausente." })
					: resposta(200, COMUM),
			);
			await screen.findByRole("heading", {
				name: status === 401 ? "Entrar na conta" : "Página não encontrada",
			});
			expect(pedirNumeros).toHaveBeenCalledTimes(1);
		});
	});

	it("pede os números de novo quando a guarda confirma o acesso", async () => {
		emSequencia(
			pedirNumeros,
			resposta(404, { detail: "Not Found" }),
			resposta(200, numerosDeExemplo()),
		);
		await abrirOsNumeros();
		expect(perfil).toHaveBeenCalledTimes(2);
		expect(pedirNumeros).toHaveBeenCalledTimes(2);
	});
});

describe("os estados dos números", () => {
	it("diz que carrega enquanto a API não responde", async () => {
		pedirNumeros.mockImplementation(() => new Promise(() => {}) as never);
		abrir();
		const carregando = await screen.findByRole("status");
		expect(carregando.textContent).toBe("Carregando os números…");
	});

	it("diz quando a falha veio, e tenta de novo", async () => {
		emSequencia(pedirNumeros, semConexao(), resposta(200, numerosDeExemplo()));
		abrir();
		await screen.findByText("Os números não carregaram.");
		expect(
			screen.getByText(
				"Não deu para falar com o servidor. Confira a internet e tente de novo.",
			),
		).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		await screen.findByRole("region", { name: "Visitas" });
		expect(pedirNumeros).toHaveBeenCalledTimes(2);
	});

	it("sem o API_URL, diz que os números não funcionam ali, sem pedir nada", async () => {
		ambiente.API_URL = "";
		abrir();
		await screen.findByText("Os números não funcionam neste endereço do site.");
		expect(perfil).not.toHaveBeenCalled();
		expect(pedirNumeros).not.toHaveBeenCalled();
	});
});

describe("a folha dos números", () => {
	it("mostra o resumo, a hora da leitura e as seis seções, na ordem", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(new Date("2026-11-23T17:05:00Z"));
		await abrirOsNumeros();

		expect(screen.getByText("Lidos em 23 de novembro, às 14h05")).toBeTruthy();
		expect(resumo()).toEqual([
			["Contas", "48", "6 nesta semana"],
			["Inscritos na newsletter", "112", "14 nesta semana"],
			["Páginas vistas", "2.299", "nos últimos 30 dias"],
			["Artigos lidos", "352", "em 2 trilhas"],
		]);
		expect(
			screen
				.getAllByRole("heading", { level: 2 })
				.map((titulo) => titulo.textContent),
		).toEqual(["Visitas", "Pessoas", "Uso", "Newsletter", "Piloto", "Sistema"]);
	});

	it("as visitas trazem a frase, a tabela dos 30 dias e as páginas mais vistas", async () => {
		await abrirOsNumeros();
		const visitas = secao("Visitas");
		expect(
			within(visitas).getByText(
				"De 25 de outubro a 23 de novembro, 2.299 páginas vistas. O dia com mais visitas foi 12 de novembro, com 214.",
			),
		).toBeTruthy();
		const tabela = within(visitas).getByRole("table", {
			name: "Páginas vistas por dia",
		});
		expect(within(tabela).getAllByRole("row")).toHaveLength(31);
		const pico = within(tabela).getByRole("rowheader", {
			name: "12 de novembro",
		});
		expect(pico.parentElement?.textContent).toBe("12 de novembro214");

		const paginas = within(visitas).getByRole("list", {
			name: "Páginas mais vistas",
		});
		expect(
			within(paginas)
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual([
			"Página inicial820",
			"/trilhas/alfa/primeiro310",
			"/parlamentares/12341",
		]);
		expect(
			within(paginas)
				.getByRole("link", { name: "Página inicial" })
				.getAttribute("href"),
		).toBe("/");
	});

	it("os gráficos ficam fora do leitor de tela, cada um com a frase e a tabela", async () => {
		await abrirOsNumeros();
		const graficos = [...document.querySelectorAll(".colunas")];
		expect(graficos).toHaveLength(4);
		for (const grafico of graficos) {
			expect(grafico.getAttribute("aria-hidden")).toBe("true");
			const bloco = grafico.closest(".grafico-de-colunas");
			expect(
				bloco?.querySelector(".frase-do-grafico")?.textContent,
			).toBeTruthy();
			expect(bloco?.querySelector("details table")).toBeTruthy();
		}
		// O zero fica sem coluna: dos 30 dias, o primeiro teve zero visita.
		const dias = secao("Visitas").querySelectorAll(".colunas li");
		expect(dias).toHaveLength(30);
		expect(dias[0].querySelector(".coluna")).toBeNull();
		expect(dias[1].querySelector(".coluna")).toBeTruthy();
	});

	it("as pessoas e o uso dizem as semanas, e o mínimo leva o pelo menos", async () => {
		await abrirOsNumeros();
		const pessoas = secao("Pessoas");
		expect(
			within(pessoas).getByText(
				"6 na semana de 23 de novembro. A semana com mais foi a de 9 de novembro, com 30.",
			),
		).toBeTruthy();
		expect(
			within(pessoas).getByText(
				"14 na semana de 23 de novembro. A semana com mais foi a de 9 de novembro, com 98.",
			),
		).toBeTruthy();

		const uso = secao("Uso");
		expect(
			within(uso).getByText(
				"Pelo menos 19 na semana de 23 de novembro. A semana com mais foi a de 16 de novembro, com pelo menos 31.",
			),
		).toBeTruthy();
		expect(
			within(uso).getByText(
				"Pelo menos 9 contas voltaram depois da semana do cadastro.",
			),
		).toBeTruthy();
	});

	it("as trilhas vêm na ordem do catálogo, com o nome, as leituras e as conclusões", async () => {
		await abrirOsNumeros();
		const trilhas = within(secao("Uso")).getByRole("list", {
			name: "Por trilha",
		});
		expect(
			within(trilhas)
				.getAllByRole("listitem")
				.map((item) => item.textContent),
		).toEqual([
			"1Trilha Alfa212 artigos lidos5 contas concluíram a trilha",
			"2Trilha Beta140 artigos lidos1 conta concluiu a trilha",
			"3Trilha GamaNenhum artigo lidoNenhuma conta concluiu a trilha",
		]);
		// O número da trilha é a posição dela, na fita, fora do leitor de tela.
		const [primeira] = within(trilhas).getAllByRole("listitem");
		expect(primeira.classList.contains("fita-verde")).toBe(true);
		expect(
			primeira.querySelector(".numeral")?.getAttribute("aria-hidden"),
		).toBe("true");
	});

	it("sem o catálogo, a trilha aparece pelo slug", async () => {
		catalogo.mockRejectedValue(new Error("O catálogo não veio."));
		await abrirOsNumeros();
		const trilhas = within(secao("Uso")).getByRole("list", {
			name: "Por trilha",
		});
		expect(within(trilhas).getAllByRole("listitem")[0].textContent).toBe(
			"1beta140 artigos lidos1 conta concluiu a trilha",
		);
	});

	it("a newsletter, o piloto e o sistema trazem os números da API", async () => {
		await abrirOsNumeros();
		const newsletter = secao("Newsletter");
		expect(
			within(newsletter).getByText(
				"A última saiu em 16 de novembro de 2026, às 10h37.",
			),
		).toBeTruthy();

		const piloto = secao("Piloto");
		expect(
			valoresDe(
				within(piloto).getByRole("heading", { name: "Tentativas e pessoas" }),
			),
		).toEqual([
			["Antes da trilha", "30 tentativas de 27 pessoas"],
			["Depois da trilha", "26 tentativas de 24 pessoas"],
			["No total", "56 tentativas de 31 pessoas"],
		]);
		expect(within(piloto).getByText("46,7%")).toBeTruthy();
		expect(within(piloto).getByText("72%")).toBeTruthy();
		expect(
			within(piloto).getByText(
				"Em média, 8,6 de 12 perguntas, com 24 pessoas.",
			),
		).toBeTruthy();
		expect(
			within(piloto).getByText(
				"20 pessoas fizeram as duas etapas, 7 só o antes e 4 só o depois.",
			),
		).toBeTruthy();
		expect(
			within(piloto).getByText(
				"A média foi de 45,8% antes e de 70,8% depois: 25 pontos percentuais a mais depois da trilha.",
			),
		).toBeTruthy();

		const sistema = secao("Sistema");
		const banco = valoresDe(
			within(sistema).getByRole("heading", { name: "No banco" }),
		);
		expect(banco.map(([nome]) => nome)).toEqual([
			"Parlamentares",
			"Mandatos",
			"Proposições",
			"Proposições com tema",
			"Votações",
			"Votos",
			"Atos do Diário Oficial",
			"Vídeos das sessões",
			"Bens declarados ao TSE",
			"Meses do IPCA",
		]);
		expect(banco).toContainEqual(["Votos", "312.480"]);
		const coletas = valoresDe(
			within(sistema).getByRole("heading", { name: "Últimas coletas" }),
		);
		expect(coletas).toContainEqual(["TSE", "Nunca coletada"]);
		expect(coletas).toContainEqual([
			"Câmara dos Deputados",
			"23 de novembro de 2026, às 6h10",
		]);
	});

	it("a média que a API não manda vira a frase da situação, e nunca o zero", async () => {
		const numeros = numerosDeExemplo();
		numeros.piloto.medias.depois = {
			quantidade: 3,
			acertos: null,
			percentual: null,
			situacao: "amostra_pequena",
		};
		numeros.piloto.pares = {
			quantidade: 3,
			antes: { acertos: null, percentual: null },
			depois: { acertos: null, percentual: null },
			diferenca_acertos: null,
			diferenca_pontos_percentuais: null,
			situacao: "protecao_de_subgrupo",
		};
		emSequencia(pedirNumeros, resposta(200, numeros));
		await abrirOsNumeros();
		const piloto = secao("Piloto");
		expect(
			within(piloto).getByText(
				"Poucas respostas: a média só aparece a partir de 5 pessoas.",
			),
		).toBeTruthy();
		expect(
			within(piloto).getByText(
				"A média não aparece para não revelar um grupo pequeno.",
			),
		).toBeTruthy();
		expect(piloto.textContent).not.toMatch(/(^|\D)0(,0)?%/);
		expect(piloto.querySelectorAll(".barra-dos-numeros")).toHaveLength(1);
	});

	it("sem edição publicada, a newsletter diz isso, sem número nulo", async () => {
		const numeros = numerosDeExemplo();
		numeros.newsletter = {
			edicoes_publicadas: 0,
			ultima_publicada_em: null,
			inscritos_com_a_ultima_edicao: null,
		};
		emSequencia(pedirNumeros, resposta(200, numeros));
		await abrirOsNumeros();
		const newsletter = secao("Newsletter");
		expect(
			within(newsletter).getByText("Nenhuma edição publicada ainda."),
		).toBeTruthy();
		expect(newsletter.textContent).not.toMatch(/null|undefined|NaN/);
	});
});

describe("a navegação do painel", () => {
	it("marca os números como a página aberta e leva à revisão", async () => {
		await abrirOsNumeros();
		const navegacao = screen.getByRole("navigation", {
			name: "Páginas do painel",
		});
		expect(
			within(navegacao).getByText("Números").getAttribute("aria-current"),
		).toBe("page");
		expect(
			within(navegacao)
				.getByRole("link", { name: "Revisão da edição" })
				.getAttribute("href"),
		).toBe("/painel");
		expect(
			screen.getByRole("link", { name: "Conta" }).getAttribute("href"),
		).toBe("/perfil");
	});
});

describe("os números ficam só na página", () => {
	it("não vão para o console, a URL nem o armazenamento", async () => {
		const router = await abrirOsNumeros();
		const saida = JSON.stringify(
			consoleChamado.flatMap((espiao) => espiao.mock.calls),
		);
		for (const texto of NUMEROS_DA_PAGINA) {
			expect(saida).not.toContain(texto);
		}
		expect(router.state.location.pathname).toBe("/painel/numeros");
		expect(router.state.location.searchStr).toBe("");
		expect(localStorage.length).toBe(0);
		expect(sessionStorage.length).toBe(0);
	});
});
