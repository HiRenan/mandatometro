import {
	createRootRoute,
	createRouter,
	type RootRouteOptions,
} from "@tanstack/react-router";
import {
	createRequestHandler,
	defaultRenderHandler,
} from "@tanstack/react-router/ssr/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NaoEncontrado } from "@/components/nao-encontrado";
import { PaginaDeErro } from "@/components/pagina-de-erro";
import {
	detalheDeExemplo,
	listaDeExemplo,
	votosDeExemplo,
} from "@/lib/parlamentares/exemplos-de-teste";
import { Route as RotaRaiz } from "@/routes/__root";
import { Route as RotaDoParlamentar } from "./$id";
import { Route as RotaDaLista } from "./index";

// O HTML que o servidor manda nas páginas dos parlamentares: a lista, a página
// de cada um e o redirecionamento do endereço antigo. O pedido passa pelo
// servidor do roteador, como no site, e o loader de cada rota é o de verdade:
// aqui, as funções do servidor (parlamentares.functions.ts) chamam direto a
// leitura do servidor, como a função faz no site.

const ambiente = vi.hoisted(() => ({ API_URL: "https://api.exemplo.test" }));
vi.mock("@/env", () => ({ ENV: ambiente }));
vi.mock("@/lib/parlamentares/parlamentares.functions", async () => {
	const servidor = await import("@/lib/parlamentares/parlamentares.server");
	return {
		buscarParlamentares: ({ data }: { data: { uf?: string } }) =>
			servidor.lerParlamentares(data.uf),
		buscarParlamentar: ({ data }: { data: { id: string; pagina: number } }) =>
			servidor.lerParlamentar(data.id, data.pagina),
		buscarVotacao: ({ data }: { data: { id: string } }) =>
			servidor.lerVotacao(data.id),
	};
});

/** O que uma falha da API pode trazer e não pode chegar ao navegador. */
const SEGREDOS = ["10.0.0.5", "SELECT", "fulano@example.com"];
const MENSAGEM_DA_FALHA =
	"connect ECONNREFUSED http://10.0.0.5:8000/parlamentares: SELECT email FROM conta WHERE email = 'fulano@example.com'";
const CANONICO = "/parlamentares/81-agata-cedrolume";

beforeEach(() => {
	ambiente.API_URL = "https://api.exemplo.test";
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

const json = (status: number, corpo: unknown) =>
	new Response(JSON.stringify(corpo), {
		status,
		headers: { "Content-Type": "application/json" },
	});

/** Simula a API: cada pedido recebe a resposta de `responder`. */
function api(responder: (pedido: Request) => Response) {
	const fetch = vi.fn(async (pedido: Request) => responder(pedido));
	vi.stubGlobal("fetch", fetch);
	return fetch;
}

/** A API de exemplo: a lista, a pessoa e a página de votos pedida, de `votos` votos. */
function apiDeExemplo(votos = 25) {
	return api((pedido) => {
		const endereco = new URL(pedido.url);
		if (endereco.pathname === "/parlamentares") {
			return json(200, listaDeExemplo());
		}
		if (endereco.pathname.endsWith("/votos")) {
			const deslocamento = Number(endereco.searchParams.get("deslocamento"));
			return json(200, votosDeExemplo(votos, deslocamento));
		}
		return json(200, detalheDeExemplo());
	});
}

/** O documento de verdade da rota raiz (routes/__root.tsx). */
const Documento = (RotaRaiz.options as RootRouteOptions).shellComponent;

/** O site com as duas rotas dos parlamentares, como no router.tsx. */
function criarRouter() {
	const raiz = createRootRoute({ shellComponent: Documento });
	const lista = RotaDaLista.update({
		id: "/parlamentares/",
		path: "/parlamentares/",
		getParentRoute: () => raiz,
	} as never);
	const parlamentar = RotaDoParlamentar.update({
		id: "/parlamentares/$id",
		path: "/parlamentares/$id",
		getParentRoute: () => raiz,
	} as never);
	return createRouter({
		routeTree: raiz.addChildren([lista, parlamentar]),
		defaultNotFoundComponent: NaoEncontrado,
		defaultErrorComponent: PaginaDeErro,
	});
}

/** Pede uma página ao servidor do roteador: o HTTP, o Location e o HTML. */
async function pedir(caminho: string) {
	const resposta = await createRequestHandler({
		createRouter: criarRouter,
		request: new Request(`http://localhost${caminho}`),
	})(defaultRenderHandler);
	return {
		status: resposta.status,
		location: resposta.headers.get("Location"),
		html: (await resposta.text()).replaceAll("<!-- -->", ""),
	};
}

/** O conteúdo de uma meta do <head>, pelo name. */
function meta(html: string, nome: string) {
	return new RegExp(`<meta name="${nome}" content="([^"]*)"`).exec(html)?.[1];
}

describe("o HTML das páginas dos parlamentares", () => {
	it("com a API fora do ar, a página de erro, com 500 e sem nada da falha", async () => {
		api(() => {
			throw new TypeError(MENSAGEM_DA_FALHA);
		});

		for (const caminho of [
			"/parlamentares",
			"/parlamentares?uf=SC",
			CANONICO,
		]) {
			const { status, html } = await pedir(caminho);

			expect(status, caminho).toBe(500);
			expect(html, caminho).toContain("A página não carregou");
			expect(html, caminho).toContain("Os parlamentares não carregaram.");
			for (const segredo of SEGREDOS) {
				expect(html, `${caminho}: ${segredo}`).not.toContain(segredo);
			}
		}
	});

	it("o parlamentar que não existe dá 404, com a página que leva aos parlamentares", async () => {
		api(() => json(404, { erro: "parlamentar_nao_encontrado" }));

		const { status, html } = await pedir("/parlamentares/999-ninguem");

		expect(status).toBe(404);
		expect(html).toContain("Página não encontrada");
		expect(html).toContain('href="/parlamentares"');
		expect(html).toContain("Ver os parlamentares");
	});

	it("o fim de endereço sem um id válido dá 404 sem chamar a API", async () => {
		const fetch = apiDeExemplo();

		for (const caminho of ["/parlamentares/abc", "/parlamentares/081-nome"]) {
			expect((await pedir(caminho)).status, caminho).toBe(404);
		}
		expect(fetch).not.toHaveBeenCalled();
	});

	it("o endereço só com o id, ou com outro nome, leva ao endereço certo por um 301, com a mesma página de votos", async () => {
		apiDeExemplo();

		expect(await pedir("/parlamentares/81")).toMatchObject({
			status: 301,
			location: CANONICO,
		});
		expect(await pedir("/parlamentares/81-nome-antigo?pagina=2")).toMatchObject(
			{
				status: 301,
				location: `${CANONICO}?pagina=2`,
			},
		);
	});

	it("a página da pessoa vem inteira no HTML: o cartaz, os mandatos, como votou e a primeira página de votos", async () => {
		apiDeExemplo();

		const { status, html } = await pedir(CANONICO);

		expect(status).toBe(200);
		expect(html).toContain("<title>Ágata Cedrolume · Mandatômetro</title>");
		expect(meta(html, "description")).toBe(
			"Câmara dos Deputados, Santa Catarina, PFT. Os mandatos, como votou e cada voto registrado, com a página oficial de cada votação.",
		);
		expect(html).toMatch(
			/<h1 class="titulo-de-folha letra-com-teto"[^>]*>Ágata Cedrolume<\/h1>/,
		);
		expect(html).toContain("57ª legislatura");
		// A regra de cada voto, com o artigo do regimento da Câmara, sem quebra
		// entre o "art." e o número.
		expect(html).toContain(
			'Votou a favor do que estava em votação.<span class="artigo-da-regra"> (Regimento Interno da Câmara, art. 187, § 1º)</span>',
		);
		expect(html.match(/<li class="voto-da-pessoa">/g)).toHaveLength(20);
		expect(html).toContain("Página 1 de 2");
		expect(html).toContain(`href="${CANONICO}?pagina=2"`);
		expect(html).toContain('href="/votacoes/139"');
	});

	it("a segunda página de votos leva o número no título e volta à primeira sem o ?pagina", async () => {
		apiDeExemplo();

		const { status, html } = await pedir(`${CANONICO}?pagina=2`);

		expect(status).toBe(200);
		expect(html).toContain(
			"<title>Ágata Cedrolume (página 2) · Mandatômetro</title>",
		);
		expect(html.match(/<li class="voto-da-pessoa">/g)).toHaveLength(5);
		expect(html).toMatch(
			new RegExp(`href="${CANONICO}"[^>]*><span>Votos mais novos`),
		);
	});

	it("a página de votos depois da última dá 404", async () => {
		apiDeExemplo(20);

		expect((await pedir(`${CANONICO}?pagina=2`)).status).toBe(404);
	});

	it("sem voto registrado, a folha explica a votação simbólica, com o nome da pessoa", async () => {
		apiDeExemplo(0);

		const { status, html } = await pedir(CANONICO);

		expect(status).toBe(200);
		expect(html).toContain("Nenhum voto registrado ainda");
		expect(html).toContain(
			"Os dados usados ainda não têm votos de Ágata Cedrolume.",
		);
		expect(html).toContain(
			'href="/trilhas/processo-legislativo/o-plenario-vota-o-projeto"',
		);
		expect(html).not.toContain("voto-da-pessoa");
	});

	it("a lista sem estado: o mapa com os 27 estados, cada um com o número de deputados", async () => {
		apiDeExemplo();

		const { status, html } = await pedir("/parlamentares");

		expect(status).toBe(200);
		expect(html).toContain("<title>Parlamentares · Mandatômetro</title>");
		// O mapa e a lista que fica no lugar dele na tela estreita: duas vezes
		// cada estado.
		expect(html.match(/href="\/parlamentares\?uf=[A-Z]{2}"/g)).toHaveLength(54);
		expect(html).toContain("Escolha o seu estado.");
		// O campo "Estado" funciona sem JavaScript: o formulário pede a lista pelo GET.
		expect(html).toMatch(/<form [^>]*action="\/parlamentares" method="get"/);
	});

	it("a lista com Santa Catarina: as contas no título da aba, o estado aberto no mapa e os nomes de cada Casa", async () => {
		apiDeExemplo();

		const { status, html } = await pedir("/parlamentares?uf=SC");

		expect(status).toBe(200);
		expect(html).toContain(
			"<title>Parlamentares de Santa Catarina · Mandatômetro</title>",
		);
		expect(meta(html, "description")).toBe(
			"3 deputados federais e 2 senadores de Santa Catarina em exercício, com o partido e como cada um votou.",
		);
		expect(html).toContain("3 deputados federais e 2 senadores em exercício.");
		expect(
			html.match(
				/aria-current="page"[^>]*href="\/parlamentares\?uf=SC"|href="\/parlamentares\?uf=SC"[^>]*aria-current="page"/g,
			),
		).toHaveLength(2);
		expect(html).toContain('href="/parlamentares/82-iris-dellombre"');
		expect(html).toContain('href="/parlamentares/501-lia-quinemar"');
		// Quem não tem partido nos dados aparece com o traço, e o leitor de tela
		// ouve o porquê.
		expect(html).toContain(
			'<span aria-hidden="true">—</span><span class="sr-only">sem partido registrado</span>',
		);
		// Os nomes da Bahia ficam fora.
		expect(html).not.toContain("Rui Tavaquil");
	});

	it("sem o API_URL, as páginas dizem que os parlamentares não aparecem aqui, com 200", async () => {
		ambiente.API_URL = "";
		const fetch = apiDeExemplo();

		for (const caminho of [
			"/parlamentares",
			"/parlamentares?uf=SC",
			"/parlamentares/81",
		]) {
			const { status, html } = await pedir(caminho);

			expect(status, caminho).toBe(200);
			expect(html, caminho).toContain(
				"Os parlamentares ainda não aparecem neste endereço do site.",
			);
		}
		expect(fetch).not.toHaveBeenCalled();
	});
});
