// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
	acharArtigo,
	acharQuiz,
	acharQuizFinal,
	acharTrilha,
	inicio,
	listarTrilhas,
	trilhas,
} from "@/lib/conteudo/paginas.server";
import { lerEdicao, lerEdicoes } from "@/lib/edicoes/edicoes.server";
import {
	edicaoDeExemplo,
	listaDeExemplo,
} from "@/lib/edicoes/exemplos-de-teste";
import { TRILHA_DO_PILOTO } from "@/lib/piloto";
import { Route as RotaRaiz } from "@/routes/__root";
import { Route as RotaDaEdicao } from "@/routes/edicoes/$id";
import { Route as RotaDasEdicoes } from "@/routes/edicoes/index";
import { Route as RotaInicial } from "@/routes/index";
import { Route as RotaDeSair } from "@/routes/newsletter/sair";
import { Route as RotaDoPiloto } from "@/routes/piloto";
import { Route as RotaDoArtigo } from "@/routes/trilhas/$trilha/$artigo";
import { Route as RotaDaTrilha } from "@/routes/trilhas/$trilha/index";
import { Route as RotaDoQuiz } from "@/routes/trilhas/$trilha/quiz";
import { Route as RotaDoQuizFinal } from "@/routes/trilhas/$trilha/quiz-final";
import { Route as RotaDasTrilhas } from "@/routes/trilhas/index";

// O teto da letra grande mede a caixa do teto mais perto do título (o
// letra-com-teto e o caixa-do-teto, no index.css), e não a tela: o 100vw conta
// a barra de rolagem do Windows (15 px), e a palavra mais larga se partia na
// janela de computador estreita (a #139). No cabeçalho, na página e no rodapé,
// essa caixa é a caixa da página (routes/__root.tsx), em volta dos três, da
// largura da página sem a barra. O teste lê o HTML do servidor, porque o jsdom não desenha; a
// medida de verdade é no navegador, com a barra à vista.
//
// O 100cqi mede o contêiner da largura mais perto, e qualquer um no meio do
// caminho (um @container do Tailwind em volta do título, por exemplo) troca a
// largura da página pela dele (a #147). O jsdom não calcula o CSS: o teste
// reconhece o contêiner pelas regras do CSS do site que o criam, pelas classes
// do Tailwind que o criam e pelo style do elemento.

// O site com a API e sem ela, como nas prévias dos PRs: com o API_URL, ele tem
// as edições e a inscrição na newsletter; sem, o cartaz das edições diz que elas
// não aparecem neste endereço.
const ambiente = vi.hoisted(() => ({ API_URL: "https://api.exemplo.test" }));
vi.mock("@/env", () => ({ ENV: ambiente }));

/** O endereço da API de mentira, que o cliente gerado guarda ao carregar. */
const COM_API = ambiente.API_URL;

beforeEach(() => {
	// A página de erro registra a falha da API no console.
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

/**
 * O CSS do site, sem os comentários: o index.css e os de estilos/. Os caminhos
 * vão pelo node:path, porque o URL do jsdom não serve ao node:fs.
 */
const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = [
	join(src, "index.css"),
	...readdirSync(join(src, "estilos"))
		.filter((nome) => nome.endsWith(".css"))
		.map((nome) => join(src, "estilos", nome)),
]
	.map((arquivo) =>
		readFileSync(arquivo, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
	)
	.join("\n");

/** Cada regra do CSS sem outra dentro: o seletor e as declarações. */
const regras = [...css.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map(
	([, seletor = "", corpo = ""]) => ({
		seletor: seletor.trim().replace(/\s+/g, " "),
		corpo,
	}),
);

/**
 * Uma declaração que faz o contêiner da largura: o container-type ou o
 * container, com o inline-size ou o size.
 */
const FAZ_CONTEINER = /(?:^|[;\s])container(?:-type)?\s*:[^;]*\bsize\b/;

/** Os seletores das regras do CSS que fazem um contêiner (o caixa-do-teto). */
const CONTEINERES_DO_CSS = regras
	.filter(({ corpo }) => FAZ_CONTEINER.test(corpo))
	.map(({ seletor }) => seletor);

/**
 * As classes do Tailwind que fazem um contêiner da largura: o @container e o
 * @container-size, com nome ou sem (o @container/folha), o de valor livre com o
 * size (o @container-[size]) e a propriedade livre ([container-type:size]),
 * com ou sem variante na frente (o md:@container conta em toda largura).
 */
const CONTEINER_DO_TAILWIND =
	/(?:^|:)(?:@container(?:-size)?|@container-\[[^\]]*\bsize\])(?:\/[\w-]+)?$|(?:^|:)\[container(?:-type)?:[^\]]*\bsize\]$/;

/**
 * Os títulos com teto: as regras do CSS em que a letra para na palavra mais
 * larga (o --palavra). São o letra-com-teto, os intertítulos do artigo (o
 * .texto h2) e o resultado do quiz.
 */
const TITULOS_COM_TETO = regras
	.filter(({ corpo }) =>
		/(?:^|[;\s])font-size\s*:[^;]*var\(--palavra\)/.test(corpo),
	)
	.map(({ seletor }) => seletor)
	.join(", ");

/** Se o elemento é um contêiner da largura: pelo CSS, pelo Tailwind ou pelo style. */
function eConteiner(elemento: Element) {
	return (
		CONTEINERES_DO_CSS.some((seletor) => elemento.matches(seletor)) ||
		[...elemento.classList].some((classe) =>
			CONTEINER_DO_TAILWIND.test(classe),
		) ||
		FAZ_CONTEINER.test(elemento.getAttribute("style") ?? "")
	);
}

/** O contêiner da largura mais perto do título, que o 100cqi dele mede. */
function conteinerEmVolta(titulo: Element) {
	let elemento = titulo.parentElement;
	while (elemento && !eConteiner(elemento)) {
		elemento = elemento.parentElement;
	}
	return elemento;
}

const json = (status: number, corpo: unknown) =>
	new Response(JSON.stringify(corpo), {
		status,
		headers: { "Content-Type": "application/json" },
	});

/**
 * A API das edições: a lista com três edições e, no lugar de cada uma, a edição
 * de exemplo.
 */
function apiDasEdicoes(pedido: Request) {
	return new URL(pedido.url).pathname === "/edicoes"
		? json(200, listaDeExemplo(3))
		: json(200, edicaoDeExemplo());
}

/** O documento de verdade da rota raiz: o <html>, com o cabeçalho, o main e o rodapé. */
const Documento = (RotaRaiz.options as RootRouteOptions).shellComponent;

/** O loader de uma página da trilha recebe o endereço dela. */
type NaTrilha = { params: { trilha: string } };

/** O site inteiro, como no router.tsx: cada página, a 404 e a página de erro. */
function criarRouter() {
	const raiz = createRootRoute({ shellComponent: Documento });
	/**
	 * As opções de uma rota no site de mentira: o caminho do routeTree.gen.ts e
	 * o loader que lê direto do servidor, sem a função do servidor.
	 */
	const naRaiz = (caminho: string, loader?: (contexto: never) => unknown) =>
		({
			id: caminho,
			path: caminho,
			getParentRoute: () => raiz,
			...(loader && { loader }),
		}) as never;
	return createRouter({
		routeTree: raiz.addChildren([
			RotaInicial.update(naRaiz("/", () => inicio(trilhas))),
			RotaDasTrilhas.update(naRaiz("/trilhas/", () => listarTrilhas(trilhas))),
			RotaDaTrilha.update(
				naRaiz("/trilhas/$trilha/", ({ params }: NaTrilha) =>
					acharTrilha(trilhas, params.trilha),
				),
			),
			RotaDoArtigo.update(
				naRaiz(
					"/trilhas/$trilha/$artigo",
					({ params }: { params: { trilha: string; artigo: string } }) =>
						acharArtigo(trilhas, params.trilha, params.artigo),
				),
			),
			RotaDoQuiz.update(
				naRaiz("/trilhas/$trilha/quiz", ({ params }: NaTrilha) =>
					acharQuiz(trilhas, params.trilha),
				),
			),
			RotaDoQuizFinal.update(
				naRaiz("/trilhas/$trilha/quiz-final", ({ params }: NaTrilha) =>
					acharQuizFinal(trilhas, params.trilha),
				),
			),
			RotaDoPiloto.update(
				naRaiz("/piloto", () => acharQuizFinal(trilhas, TRILHA_DO_PILOTO)),
			),
			RotaDeSair.update(naRaiz("/newsletter/sair")),
			RotaDasEdicoes.update(
				naRaiz("/edicoes/", ({ deps }: { deps: { pagina: number } }) =>
					lerEdicoes(deps.pagina),
				),
			),
			RotaDaEdicao.update(
				naRaiz("/edicoes/$id", ({ params }: { params: { id: string } }) =>
					lerEdicao(params.id),
				),
			),
		]),
		defaultNotFoundComponent: NaoEncontrado,
		defaultErrorComponent: PaginaDeErro,
		// O jsdom põe o document, e o roteador se acharia no navegador: a página
		// não encontrada sairia com 200, e a de erro nem chegaria ao HTML.
		isServer: true,
	});
}

/** Pede uma página ao servidor do roteador: o HTTP e o HTML lido. */
async function pedir(
	caminho: string,
	{ api = apiDasEdicoes, semApi = false }: Pick<Pagina, "api" | "semApi"> = {},
) {
	ambiente.API_URL = semApi ? "" : COM_API;
	vi.stubGlobal(
		"fetch",
		vi.fn(async (pedido: Request) => api(pedido)),
	);
	const resposta = await createRequestHandler({
		createRouter: criarRouter,
		request: new Request(`http://localhost${caminho}`),
	})(defaultRenderHandler);
	return {
		status: resposta.status,
		pagina: new DOMParser().parseFromString(await resposta.text(), "text/html"),
	};
}

/** Uma página pedida ao servidor: o endereço, o HTTP e a API em volta. */
type Pagina = {
	/** A página, no nome do teste. */
	nome: string;
	caminho: string;
	status: number;
	/** A API das edições, se não for a de exemplo. */
	api?: (pedido: Request) => Response;
	/** O site sem o API_URL. */
	semApi?: boolean;
};

/**
 * As páginas que abrem: a inicial, cada trilha com os artigos e os quizzes, o
 * piloto, a saída da newsletter, a lista das edições e uma edição.
 */
const QUE_ABREM = [
	"/",
	"/trilhas",
	...trilhas.flatMap(({ slug, artigos }) => [
		`/trilhas/${slug}`,
		...artigos.map((artigo) => `/trilhas/${slug}/${artigo.slug}`),
		...(acharQuiz(trilhas, slug) ? [`/trilhas/${slug}/quiz`] : []),
		...(acharQuizFinal(trilhas, slug) ? [`/trilhas/${slug}/quiz-final`] : []),
	]),
	"/piloto",
	"/newsletter/sair",
	"/edicoes",
	"/edicoes/7",
];

/**
 * Cada página do site, com o HTTP dela: as que abrem, com a API e sem ela, a
 * lista sem edição, a página não encontrada (o endereço e a edição que não
 * existem) e a página de erro (a API fora do ar).
 */
const PAGINAS: Pagina[] = [
	...QUE_ABREM.map((caminho) => ({ nome: caminho, caminho, status: 200 })),
	...QUE_ABREM.map((caminho) => ({
		nome: `${caminho}, sem a API`,
		caminho,
		status: 200,
		semApi: true,
	})),
	{
		nome: "/edicoes, sem edição",
		caminho: "/edicoes",
		status: 200,
		api: () => json(200, listaDeExemplo(0)),
	},
	{
		nome: "/pagina-que-nao-existe",
		caminho: "/pagina-que-nao-existe",
		status: 404,
	},
	{
		nome: "/edicoes/9, que não existe",
		caminho: "/edicoes/9",
		status: 404,
		api: () => json(404, { erro: "edicao_nao_encontrada" }),
	},
	{
		nome: "/edicoes/8, com a API fora do ar",
		caminho: "/edicoes/8",
		status: 500,
		api: () => {
			throw new TypeError("A API não respondeu.");
		},
	},
];

describe("a caixa da página", () => {
	it("é a caixa do teto do nome, no cabeçalho e no rodapé, e do título da página", async () => {
		const { pagina } = await pedir("/pagina-que-nao-existe");
		const caixa = pagina.getElementById("conteudo")?.parentElement;
		const titulos = [...pagina.querySelectorAll(".letra-com-teto")];

		expect(titulos.map((titulo) => titulo.textContent?.trim())).toEqual([
			"Mandatômetro",
			"Página não encontrada",
			"Mandatômetro",
		]);
		expect(caixa?.classList.contains("caixa-do-teto")).toBe(true);
		for (const titulo of titulos) {
			expect(conteinerEmVolta(titulo), titulo.textContent ?? "").toBe(caixa);
		}
	});

	it.each(PAGINAS)(
		"é o contêiner mais perto de cada título com teto em $nome",
		async ({ caminho, status, api, semApi }) => {
			const { status: http, pagina } = await pedir(caminho, { api, semApi });
			const caixa = pagina.getElementById("conteudo")?.parentElement;
			const titulos = [...pagina.querySelectorAll(TITULOS_COM_TETO)];

			expect(http).toBe(status);
			// O nome, no cabeçalho e no rodapé, e ao menos um título da página.
			expect(titulos.length).toBeGreaterThanOrEqual(3);
			for (const titulo of titulos) {
				const onde = titulo.textContent?.trim();
				const conteiner = conteinerEmVolta(titulo);
				if (titulo.classList.contains("teto-pela-caixa")) {
					// O título que vem da API mede a folha em volta dele, também uma
					// caixa do teto.
					expect(conteiner?.classList.contains("caixa-do-teto"), onde).toBe(
						true,
					);
					expect(conteiner, onde).not.toBe(caixa);
				} else {
					expect(conteiner, onde).toBe(caixa);
				}
			}
		},
	);

	it("o título que vem da API tem o teto pela folha, na lista e na edição", async () => {
		// Assim, os testes de cada página passam pelos dois lados da conferência.
		for (const caminho of ["/edicoes", "/edicoes/7"]) {
			const { pagina } = await pedir(caminho);
			const pelaCaixa = pagina.querySelectorAll(
				".letra-com-teto.teto-pela-caixa",
			);

			expect(pelaCaixa.length, caminho).toBeGreaterThan(0);
		}
	});

	it("o contêiner vem da regra do CSS, da classe do Tailwind ou do style", () => {
		const elemento = (html: string) => {
			const pedaco = new DOMParser().parseFromString(html, "text/html");
			return pedaco.body.firstElementChild ?? pedaco.body;
		};
		const conteineres = [
			'<div class="caixa-do-teto"></div>',
			'<div class="@container"></div>',
			'<div class="@container/folha"></div>',
			'<div class="@container-size"></div>',
			'<div class="md:@container"></div>',
			'<div class="@container-[inline-size]"></div>',
			'<div class="[container-type:inline-size]"></div>',
			'<div class="[container:folha/size]"></div>',
			'<div style="container-type: inline-size"></div>',
			'<div style="color: red; container: folha / size"></div>',
		];
		const outros = [
			'<div class="container"></div>',
			'<div class="@container-normal"></div>',
			'<div class="[container-type:normal]"></div>',
			'<div class="[container:folha]"></div>',
			'<div style="container-name: folha"></div>',
			'<div class="caixa grid"></div>',
		];

		for (const html of conteineres) {
			expect(eConteiner(elemento(html)), html).toBe(true);
		}
		for (const html of outros) {
			expect(eConteiner(elemento(html)), html).toBe(false);
		}
	});
});
