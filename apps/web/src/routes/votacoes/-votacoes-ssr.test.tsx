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
import type { DetalheVotacao } from "@/client";
import { NaoEncontrado } from "@/components/nao-encontrado";
import { PaginaDeErro } from "@/components/pagina-de-erro";
import {
	votacaoDeExemplo,
	votacaoSemVotosDeExemplo,
	votoNominalDeExemplo,
} from "@/lib/parlamentares/exemplos-de-teste";
import { Route as RotaRaiz } from "@/routes/__root";
import { Route as RotaDaVotacao } from "./$id";

// O HTML que o servidor manda na página de uma votação: o placar, o placar por
// partido e quem votou como, com o filtro do endereço, que funciona sem o
// JavaScript. O pedido passa pelo servidor do roteador, como no site, e o loader
// é o de verdade: aqui, a função do servidor (parlamentares.functions.ts) chama
// direto a leitura do servidor, como a função faz no site.

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
	"connect ECONNREFUSED http://10.0.0.5:8000/votacoes/139: SELECT email FROM conta WHERE email = 'fulano@example.com'";

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
function api(responder: () => Response) {
	const fetch = vi.fn(async () => responder());
	vi.stubGlobal("fetch", fetch);
	return fetch;
}

/** O documento de verdade da rota raiz (routes/__root.tsx). */
const Documento = (RotaRaiz.options as RootRouteOptions).shellComponent;

/** O site com a rota da votação, como no router.tsx. */
function criarRouter() {
	const raiz = createRootRoute({ shellComponent: Documento });
	const votacao = RotaDaVotacao.update({
		id: "/votacoes/$id",
		path: "/votacoes/$id",
		getParentRoute: () => raiz,
	} as never);
	return createRouter({
		routeTree: raiz.addChildren([votacao]),
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

/** Os grupos de quem votou como: o nome, o número e se vêm abertos. */
function grupos(html: string) {
	return [
		...html.matchAll(
			/<details([^>]*)><summary><span class="nome-do-grupo">([^<]+)<\/span> <span class="numero-do-grupo">(\d+)<\/span>/g,
		),
	].map(([, atributos, nome, numero]) => [
		nome,
		Number(numero),
		/\bopen=""/.test(atributos) ? "aberto" : "fechado",
	]);
}

/** Os nomes da lista de quem votou como, na ordem da página. */
function nomes(html: string) {
	return [
		...html.matchAll(
			/<li><a [^>]*href="\/parlamentares\/[^"]+"[^>]*>([^<]+)<\/a>/g,
		),
	].map(([, nome]) => nome);
}

/** Uma votação com `quantos` votos Sim, em Santa Catarina, menos o último, na Bahia. */
function votacaoGrande(quantos: number): DetalheVotacao {
	return votacaoDeExemplo({
		votos: Array.from({ length: quantos }, (_, posicao) =>
			votoNominalDeExemplo({
				parlamentar_id: 1000 + posicao,
				nome: `Pessoa Inventada ${posicao + 1}`,
				uf: posicao === quantos - 1 ? "BA" : "SC",
			}),
		),
	});
}

describe("o HTML da página da votação", () => {
	it("com a API fora do ar, a página de erro, com 500 e sem nada da falha", async () => {
		api(() => {
			throw new TypeError(MENSAGEM_DA_FALHA);
		});

		const { status, html } = await pedir("/votacoes/139");

		expect(status).toBe(500);
		expect(html).toContain("A página não carregou");
		expect(html).toContain("Os parlamentares não carregaram.");
		for (const segredo of SEGREDOS) {
			expect(html, segredo).not.toContain(segredo);
		}
	});

	it("a votação que não existe dá 404, e o id com nome nem chega à API", async () => {
		for (const status of [404, 422]) {
			api(() => json(status, { erro: "votacao_nao_encontrada" }));

			const resposta = await pedir("/votacoes/139");

			expect(resposta.status, String(status)).toBe(404);
			expect(resposta.html).toContain("Ver os parlamentares");
		}
		const fetch = api(() => json(200, votacaoDeExemplo()));
		expect((await pedir("/votacoes/139-nome")).status).toBe(404);
		expect(fetch).not.toHaveBeenCalled();
	});

	it("a votação vem inteira no HTML: o cartaz, o placar, o placar por partido e os grupos abertos", async () => {
		api(() => json(200, votacaoDeExemplo()));

		const { status, html } = await pedir("/votacoes/139");

		expect(status).toBe(200);
		expect(html).toContain("<title>PL 812/2026 · Mandatômetro</title>");
		expect(html).toContain(
			'<meta name="description" content="Câmara dos Deputados, 20 de novembro de 2026: aprovada. O placar, o placar por partido e quem votou como, com a página oficial da votação."/>',
		);
		expect(html).toContain("Cria a Semana das Bibliotecas Comunitárias.");
		expect(html).toContain('href="https://www.exemplo.leg.br/votacao/139"');
		// O plenário é desenho: o placar, logo abaixo, diz o mesmo em texto.
		expect(html).toMatch(/<div aria-hidden="true" class="painel-da-votacao">/);
		expect(html).toMatch(/<h2 id="placar"[^>]*>Placar<\/h2>/);
		expect(html).toContain(
			'<caption class="sr-only">Quantos votos de cada tipo cada partido deu nesta votação</caption>',
		);
		expect(html).toContain("Mostrando 5 de 5 nomes");
		expect(grupos(html)).toEqual([
			["Sim", 2, "aberto"],
			["Não", 1, "aberto"],
			["Presidência", 1, "aberto"],
			["Não votou", 1, "aberto"],
		]);
		expect(html).toContain('href="/parlamentares/81-agata-cedrolume"');
		// Sem o JavaScript, o filtro manda o ?uf e o ?partido ao mesmo endereço.
		expect(html).toMatch(/<form class="filtro-dos-votos" method="get">/);
		expect(html).not.toContain("Limpar os filtros");
	});

	it("o filtro do endereço mostra só o estado escolhido, com o campo marcado e o Limpar os filtros", async () => {
		api(() => json(200, votacaoDeExemplo()));

		const { html } = await pedir("/votacoes/139?uf=BA");

		expect(html).toContain("Mostrando 2 de 5 nomes");
		expect(nomes(html)).toEqual(["Rui Tavaquil", "Sara Varombre"]);
		expect(html).toContain('<option value="BA" selected="">Bahia</option>');
		expect(html).toMatch(
			/<a [^>]*href="\/votacoes\/139"[^>]*><span>Limpar os filtros/,
		);
	});

	it("o filtro de quem não tem partido e o filtro sem nome nenhum", async () => {
		api(() => json(200, votacaoDeExemplo()));

		const semPartido = await pedir("/votacoes/139?partido=sem-partido");
		const nenhum = await pedir("/votacoes/139?uf=SC&partido=PRV");

		expect(nomes(semPartido.html)).toEqual(["João-Pedro Varustel"]);
		expect(semPartido.html).toContain("Mostrando 1 de 5 nomes");
		expect(nenhum.html).toContain("Mostrando 0 de 5 nomes");
		expect(nenhum.html).toContain("Nenhum nome com esses filtros.");
	});

	it("um filtro que não aparece na votação fica de fora, como sem filtro", async () => {
		api(() => json(200, votacaoDeExemplo()));

		const { status, html } = await pedir("/votacoes/139?uf=RR&partido=PZZ");

		expect(status).toBe(200);
		expect(html).toContain("Mostrando 5 de 5 nomes");
		expect(html).not.toContain("Limpar os filtros");
	});

	it("um valor que não é estado nem partido sai do endereço, pelo redirecionamento do roteador", async () => {
		// O validateSearch da rota deixa de fora o valor estranho, e o roteador
		// refaz o endereço sem ele: o <b> nem chega à página.
		api(() => json(200, votacaoDeExemplo()));

		expect(await pedir("/votacoes/139?partido=%3Cb%3E&uf=ba")).toMatchObject({
			status: 307,
			location: "/votacoes/139?uf=BA",
		});
	});

	it("acima de 100 nomes, os grupos vêm fechados; com o filtro que deixa até 100, abertos", async () => {
		api(() => json(200, votacaoGrande(101)));

		const todos = await pedir("/votacoes/139");
		const deSantaCatarina = await pedir("/votacoes/139?uf=SC");

		expect(grupos(todos.html)).toEqual([["Sim", 101, "fechado"]]);
		expect(grupos(deSantaCatarina.html)).toEqual([["Sim", 100, "aberto"]]);
	});

	it("sem o voto de cada um, como na votação simbólica, a página explica por quê", async () => {
		api(() => json(200, votacaoSemVotosDeExemplo()));

		const { status, html } = await pedir("/votacoes/140");

		expect(status).toBe(200);
		expect(html).toContain("O placar não está disponível nos dados usados.");
		expect(html).toContain(
			"Esta votação não tem o voto de cada parlamentar nos dados usados.",
		);
		expect(html).toContain(
			'href="/trilhas/processo-legislativo/o-plenario-vota-o-projeto"',
		);
		expect(html).not.toContain("painel-da-votacao");
		expect(html).not.toContain("Placar por partido");
		expect(html).not.toContain("filtro-dos-votos");
	});

	it("sem o API_URL, a página diz que os parlamentares não aparecem aqui, com 200", async () => {
		ambiente.API_URL = "";
		const fetch = api(() => json(200, votacaoDeExemplo()));

		const { status, html } = await pedir("/votacoes/139");

		expect(status).toBe(200);
		expect(html).toContain(
			"Os parlamentares ainda não aparecem neste endereço do site.",
		);
		expect(fetch).not.toHaveBeenCalled();
	});
});
