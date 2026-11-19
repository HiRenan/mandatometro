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
import { lerEdicao, lerEdicoes } from "@/lib/edicoes/edicoes.server";
import {
	edicaoDeExemplo,
	listaDeExemplo,
} from "@/lib/edicoes/exemplos-de-teste";
import { Route as RotaRaiz } from "@/routes/__root";
import { Route as RotaDaEdicao } from "./$id";
import { Route as RotaDaLista } from "./index";

// O HTML que o servidor manda quando a API falha: a página de erro, com HTTP
// 500, e nada da falha, nem no texto nem no estado que o roteador grava no HTML
// para o navegador continuar dali. O pedido passa pelo servidor do roteador,
// como no site; o loader de cada rota chama direto a leitura do servidor, que,
// no site, a função do servidor (edicoes.functions.ts) chama do mesmo jeito.

const ambiente = vi.hoisted(() => ({ API_URL: "https://api.exemplo.test" }));
vi.mock("@/env", () => ({ ENV: ambiente }));

/** O que uma falha da API pode trazer e não pode chegar ao navegador. */
const SEGREDOS = ["10.0.0.5", "SELECT", "fulano@example.com"];
const MENSAGEM_DA_FALHA =
	"connect ECONNREFUSED http://10.0.0.5:8000/edicoes/7: SELECT email FROM inscrito WHERE email = 'fulano@example.com'";

beforeEach(() => {
	ambiente.API_URL = "https://api.exemplo.test";
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

/** Simula a API: cada pedido recebe a resposta de `responder`. */
function api(responder: () => Response) {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => responder()),
	);
}

const json = (status: number, corpo: unknown) =>
	new Response(JSON.stringify(corpo), {
		status,
		headers: { "Content-Type": "application/json" },
	});

/**
 * O documento de verdade da rota raiz (routes/__root.tsx): o <html>, com o
 * cabeçalho, o main e o rodapé. O options tem o tipo de uma rota qualquer.
 */
const Documento = (RotaRaiz.options as RootRouteOptions).shellComponent;

/** O site com as duas rotas das edições, como no router.tsx. */
function criarRouter() {
	const raiz = createRootRoute({ shellComponent: Documento });
	const lista = RotaDaLista.update({
		id: "/edicoes/",
		path: "/edicoes/",
		getParentRoute: () => raiz,
		loader: ({ deps }: { deps: { pagina: number } }) => lerEdicoes(deps.pagina),
	} as never);
	const edicao = RotaDaEdicao.update({
		id: "/edicoes/$id",
		path: "/edicoes/$id",
		getParentRoute: () => raiz,
		loader: ({ params }: { params: { id: string } }) => lerEdicao(params.id),
	} as never);
	return createRouter({
		routeTree: raiz.addChildren([lista, edicao]),
		defaultNotFoundComponent: NaoEncontrado,
		defaultErrorComponent: PaginaDeErro,
	});
}

/** Os links do cabeçalho, no HTML: a lista da navegação principal. */
function linksDoCabecalho(html: string) {
	return /<ul class="topo-links"[^>]*>(.*?)<\/ul>/s.exec(html)?.[1] ?? "";
}

/** Pede uma página ao servidor do roteador: o HTTP e o HTML. */
async function pedir(caminho: string) {
	const resposta = await createRequestHandler({
		createRouter: criarRouter,
		request: new Request(`http://localhost${caminho}`),
	})(defaultRenderHandler);
	return { status: resposta.status, html: await resposta.text() };
}

describe("o HTML das páginas das edições", () => {
	it("com a API fora do ar, a página de erro, com 500 e sem nada da falha", async () => {
		api(() => {
			throw new TypeError(MENSAGEM_DA_FALHA);
		});

		for (const caminho of ["/edicoes", "/edicoes/7"]) {
			const { status, html } = await pedir(caminho);

			expect(status, caminho).toBe(500);
			expect(html, caminho).toContain("A página não carregou");
			for (const segredo of SEGREDOS) {
				expect(html, `${caminho}: ${segredo}`).not.toContain(segredo);
			}
		}
	});

	it("o erro da API (503) também fica fora do HTML", async () => {
		api(() =>
			json(503, { erro: "servico_indisponivel", detalhe: MENSAGEM_DA_FALHA }),
		);

		const { status, html } = await pedir("/edicoes/7");

		expect(status).toBe(500);
		for (const segredo of SEGREDOS) {
			expect(html).not.toContain(segredo);
		}
	});

	it("a edição que não existe dá 404, com a página que leva às edições", async () => {
		api(() => json(404, { erro: "edicao_nao_encontrada" }));

		const { status, html } = await pedir("/edicoes/7");

		expect(status).toBe(404);
		expect(html).toContain("Página não encontrada");
		expect(html).toContain("Ver as edições");
	});

	it("a edição publicada vem inteira no HTML, com 200", async () => {
		api(() => json(200, edicaoDeExemplo()));

		const { status, html } = await pedir("/edicoes/7");

		expect(status).toBe(200);
		expect(html).toContain("Câmara aprova a semana das bibliotecas escolares");
		expect(html).toContain('href="#item-3"');
		// O trecho da fonte vai como texto: o <b> da fonte chega escapado.
		expect(html).toContain("&lt;b&gt;emenda&lt;/b&gt;");
		expect(html).not.toContain("<b>emenda</b>");
	});

	it("a edição com um ato mostra seu texto e o link do Diário Oficial", async () => {
		const edicao = edicaoDeExemplo();
		const fonte = "https://www.in.gov.br/ato-ficticio";
		edicao.itens[2] = {
			ordem: 3,
			titulo: "Ato de exemplo",
			texto: "Explicação editorial fictícia.",
			fatos: { votacoes: [], data_publicacao: "2026-11-12" },
			fontes: [
				{ url: fonte, coletado_em: "2026-11-16T00:00:00Z", trecho: null },
			],
			artigo: null,
		};
		api(() => json(200, edicao));

		const { status, html } = await pedir("/edicoes/7");

		expect(status).toBe(200);
		expect(html).toContain("Ato de exemplo");
		expect(html).toContain("Explicação editorial fictícia.");
		expect(html).toContain(`href="${fonte}"`);
		expect(html.match(/class="votacao"/g)).toHaveLength(2);
	});

	it("o cabeçalho leva às edições só onde o site tem o API_URL", async () => {
		api(() => json(200, listaDeExemplo(3)));

		const comApi = linksDoCabecalho((await pedir("/edicoes")).html);
		ambiente.API_URL = "";
		const semApi = linksDoCabecalho((await pedir("/edicoes")).html);

		expect(comApi).toContain('href="/trilhas"');
		expect(comApi).toContain('href="/edicoes"');
		expect(semApi).toContain('href="/trilhas"');
		expect(semApi).not.toContain("/edicoes");
	});

	it("sem o API_URL, a página diz que as edições não aparecem aqui, com 200", async () => {
		ambiente.API_URL = "";

		const { status, html } = await pedir("/edicoes");

		expect(status).toBe(200);
		expect(html).toContain(
			"As edições ainda não aparecem neste endereço do site.",
		);
	});
});
