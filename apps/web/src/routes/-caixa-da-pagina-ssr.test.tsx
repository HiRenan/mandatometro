// @vitest-environment jsdom
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	type AnyRoute,
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
// do Tailwind que o criam e pelo style do elemento. Os títulos que só o
// navegador desenha (o resultado de cada resposta do quiz e o fim do quiz e do
// piloto) não estão no HTML do servidor e ficam de fora.

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

/**
 * Cada regra de um CSS sem outra dentro: o seletor e as declarações. O @utility
 * do Tailwind faz a classe com o nome dele, e o seletor lido ("@utility nome"),
 * que o matches recusa, vira o dessa classe. Ela conta só sozinha, sem variante
 * na frente nem o ! de importante. Não são lidos o @utility funcional (o
 * caixa-*, com o --value(), que faz uma classe para cada valor) nem o @utility
 * com outra regra dentro.
 */
function lerRegras(texto: string) {
	return [...texto.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map(
		([, seletor = "", corpo = ""]) => ({
			seletor: seletor
				.trim()
				.replace(/\s+/g, " ")
				.replace(/^@utility (\S+)$/, '[class~="$1"]'),
			corpo,
		}),
	);
}

const regras = lerRegras(css);

/**
 * Uma declaração que faz o contêiner da largura: o container-type ou o
 * container, com o inline-size ou o size, ou com o valor numa variável, que pode
 * ser um dos dois.
 */
const FAZ_CONTEINER =
	/(?:^|[;\s])container(?:-type)?\s*:[^;]*(?:\bsize\b|\bvar\()/;

/**
 * Os seletores das regras do CSS que fazem um contêiner (o caixa-do-teto). O
 * @apply não é lido: o contêiner não vem por ele (o AGENTS.md).
 */
const CONTEINERES_DO_CSS = regras
	.filter(({ corpo }) => FAZ_CONTEINER.test(corpo))
	.map(({ seletor }) => seletor);

/**
 * As classes do Tailwind que fazem um contêiner da largura: o @container e o
 * @container-size, com nome ou sem (o @container/folha, o @container/[nome] e o
 * nome numa variável, o @container/(--nome)), o de valor livre com o size (o
 * @container-[size]) e a propriedade livre ([container-type:size]), com ou sem
 * variante na frente (o md:@container conta em toda largura) e com o ! de
 * importante, na frente ou no fim. No valor livre, o size pode vir logo depois
 * do _, que o Tailwind troca por espaço (o [container-type:_size]). O valor
 * numa variável pode ser um dos dois, e conta: o @container-(--tipo) e o
 * [container-type:var(--tipo)]. Dois limites, medidos com o Tailwind do
 * repositório. O valor em maiúsculas, como o [container-type:_SIZE], faz
 * contêiner e escapa: a flag i o pegaria, mas contaria também o @CONTAINER e o
 * [CONTAINER-TYPE:size], que o Tailwind não gera. E o [container:folha_size]
 * conta, mas não faz contêiner: são dois nomes, sem o tipo.
 */
const CONTEINER_DO_TAILWIND =
	/(?:^|:)!?(?:@container(?:-size|-\[[^\]]*(?:(?:\b|_)size|var\()[^\]]*\]|-\([^)]*\))?(?:\/(?:[\w-]+|\[[^\]]+\]|\([^)]+\)))?|\[container(?:-type)?:[^\]]*(?:(?:\b|_)size|var\()[^\]]*\])!?$/;

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

/** O primeiro elemento de um pedaço de HTML. */
function elemento(html: string) {
	const pedaco = new DOMParser().parseFromString(html, "text/html");
	return pedaco.body.firstElementChild ?? pedaco.body;
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

/**
 * A rota raiz de verdade: o documento (o <html>, com o cabeçalho, o main e o
 * rodapé) e o layout em volta de todas as páginas, se o __root.tsx tiver um.
 */
const { shellComponent: Documento, component: LayoutDaRaiz } =
	RotaRaiz.options as RootRouteOptions;

/** O loader de uma página da trilha recebe o endereço dela. */
type NaTrilha = { params: { trilha: string } };

/**
 * O site inteiro, como no router.tsx: cada página, a 404 e a página de erro.
 * Cada rota fica dentro da mãe que tem no site, como no routeTree.gen.ts. A
 * página de um layout (um conta.tsx ou um _autenticado.tsx, com o <Outlet />)
 * entra nas filhas dele, com o caminho a partir dele, e o teste vê o que o
 * layout põe em volta da página:
 *
 * RotaDaConta.update(naRaiz("/conta")).addChildren([
 * 	RotaDoPerfil.update(dentroDe(RotaDaConta, "/perfil")),
 * ])
 *
 * O layout sem caminho (o _autenticado) leva só o id, sem o path, como no
 * routeTree.gen.ts, e a página dele abre pelo caminho dela (o /painel):
 *
 * RotaAutenticada.update({
 * 	id: "/_autenticado",
 * 	getParentRoute: () => raiz,
 * } as never).addChildren([
 * 	RotaDoPainel.update(dentroDe(RotaAutenticada, "/painel")),
 * ])
 *
 * Alguns casos pedem mais na montagem:
 * - o layout com o beforeLoad que manda para outro lugar quem não tem conta
 *   leva o beforeLoad: undefined no update, ou um beforeLoad que devolve uma
 *   conta inventada, se as páginas leem a conta do contexto;
 * - a página que está só no .lazy.tsx leva o mesmo .lazy(() =>
 *   import("@/routes/x.lazy").then((d) => d.Route)) do routeTree.gen.ts;
 * - a página com ssr: false leva o ssr: true no update;
 * - o grupo, como em (grupo)/x.tsx, e o sufixo _, como em conta_.editar.tsx,
 *   têm o id diferente do path: no lugar do dentroDe, o update leva os dois do
 *   routeTree.gen.ts, com o getParentRoute da mãe.
 *
 * A rota sem página (sem o component, no arquivo dela e no .lazy.tsx), como o
 * índice que só redireciona e a rota do servidor, entra aqui e fica fora do
 * QUE_ABREM. A raiz leva o documento e o layout do __root.tsx, mas o
 * beforeLoad e o loader dele não rodam neste teste.
 */
function criarRouter() {
	const raiz = createRootRoute({
		shellComponent: Documento,
		component: LayoutDaRaiz,
	});
	/**
	 * As opções de uma rota no site de mentira: a mãe, o caminho a partir dela,
	 * como no routeTree.gen.ts, e o loader que lê direto do servidor, sem a
	 * função do servidor.
	 */
	const dentroDe = (
		mae: AnyRoute,
		caminho: string,
		loader?: (contexto: never) => unknown,
	) =>
		({
			id: caminho,
			path: caminho,
			getParentRoute: () => mae,
			...(loader && { loader }),
		}) as never;
	const naRaiz = (caminho: string, loader?: (contexto: never) => unknown) =>
		dentroDe(raiz, caminho, loader);
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

/**
 * O id de uma rota, no texto do arquivo dela: o do createFileRoute("…"), em
 * que o gerador de rotas do TanStack escreve o id que dá à rota, ou o do
 * createLazyFileRoute, de um .lazy.tsx, que repete o da rota dele. A busca fica
 * presa ao = de quem recebe a rota, como no export const Route =
 * createFileRoute("…") que o gerador escreve: um comentário com outro
 * createFileRoute não engana a guarda, e as outras formas que o gerador aceita
 * (o Route com o tipo escrito e a rota com outro nome, exportada como Route)
 * contam. Um arquivo sem ele (o __root.tsx, um .functions.ts ou um teste sem o
 * "-") não é rota.
 */
function idDaRota(texto: string) {
	return texto.match(/=\s*create(?:Lazy)?FileRoute\(\s*(["'`])(.*?)\1/)?.[2];
}

/**
 * A mãe de uma rota no site, como o gerador de rotas do TanStack a acha: a de
 * id mais comprido que começa o dela até uma barra (o layout /conta é a mãe do
 * /conta/perfil). O id de índice acaba na barra (o /edicoes/) e não começa
 * outro até uma barra: não é mãe. Sem mãe, a rota fica na raiz (o __root__).
 */
function maeNoSite(id: string, ids: string[]) {
	const maes = ids.filter((mae) => id.startsWith(`${mae}/`));
	return maes.sort((a, b) => b.length - a.length)[0] ?? "__root__";
}

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
			expect(
				conteinerEmVolta(titulo),
				`${titulo.textContent?.trim()}: há um contêiner de largura entre o título e a caixa da página`,
			).toBe(caixa);
		}
	});

	it.each(PAGINAS)(
		"é o contêiner mais perto de cada título com teto em $nome",
		async ({ caminho, status, api, semApi }) => {
			const { status: http, pagina } = await pedir(caminho, { api, semApi });
			const caixa = pagina.getElementById("conteudo")?.parentElement;
			const titulos = [...pagina.querySelectorAll(TITULOS_COM_TETO)];

			expect(http).toBe(status);
			expect(
				titulos.length,
				"A página precisa do nome no cabeçalho e no rodapé e de ao menos um título com o letra-com-teto",
			).toBeGreaterThanOrEqual(3);
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
					expect(
						conteiner,
						`${onde}: há um contêiner de largura entre o título e a caixa da página`,
					).toBe(caixa);
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
		const conteineres = [
			'<div class="caixa-do-teto"></div>',
			'<div class="@container"></div>',
			'<div class="@container/folha"></div>',
			'<div class="@container-size"></div>',
			'<div class="md:@container"></div>',
			'<div class="@container-[inline-size]"></div>',
			'<div class="[container-type:inline-size]"></div>',
			'<div class="[container:folha/size]"></div>',
			// O ! de importante, na frente ou no fim, e o valor numa variável.
			'<div class="@container!"></div>',
			'<div class="!@container"></div>',
			'<div class="md:@container/folha!"></div>',
			'<div class="md:!@container-size"></div>',
			'<div class="@container-(--tipo)"></div>',
			'<div class="@container-[var(--tipo)]"></div>',
			'<div class="[container-type:inline-size]!"></div>',
			'<div class="![container-type:inline-size]"></div>',
			'<div class="[container-type:var(--tipo)]"></div>',
			// O _, que o Tailwind troca por espaço, logo antes do size, e o nome
			// entre colchetes.
			'<div class="[container:folha_/_size]"></div>',
			'<div class="[container-type:_size]"></div>',
			'<div class="@container-[_size]"></div>',
			'<div class="@container/[nome]"></div>',
			// O nome numa variável.
			'<div class="@container/(--nome)"></div>',
			'<div style="container-type: inline-size"></div>',
			'<div style="color: red; container: folha / size"></div>',
			'<div style="container-type: var(--tipo)"></div>',
		];
		const outros = [
			'<div class="container"></div>',
			'<div class="@container-normal"></div>',
			'<div class="@container-normal!"></div>',
			'<div class="[container-type:normal]"></div>',
			'<div class="![container-type:normal]"></div>',
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

	it("a regra do @utility do Tailwind é a da classe que ele faz", () => {
		// Um @utility que faz um contêiner e um com o teto.
		const [caixa, titulo] = lerRegras(`
			@utility caixa-b10 { container-type: inline-size; }
			@utility titulo-b10 {
				font-size: min(var(--letra), calc(100cqi / var(--palavra)));
			}
		`);

		expect(FAZ_CONTEINER.test(caixa.corpo)).toBe(true);
		expect(
			elemento('<div class="cartaz caixa-b10"></div>').matches(caixa.seletor),
		).toBe(true);
		expect(
			elemento('<div class="caixa-b100"></div>').matches(caixa.seletor),
		).toBe(false);
		expect(
			elemento('<h1 class="titulo-b10"></h1>').matches(titulo.seletor),
		).toBe(true);
	});

	it("o id de uma rota é o do createFileRoute dela, que o gerador do TanStack escreve", () => {
		// O id não vem do nome do arquivo: o gerador põe o conta/route.tsx na
		// /conta, o noticias.$id.tsx na /noticias/$id e o .lazy.tsx na rota dele.
		expect(
			idDaRota('export const Route = createFileRoute("/conta")({});'),
		).toBe("/conta");
		expect(
			idDaRota("export const Route = createFileRoute('/noticias/$id')({});"),
		).toBe("/noticias/$id");
		expect(
			idDaRota('export const Route = createLazyFileRoute("/ajuda")({});'),
		).toBe("/ajuda");
		// Um comentário com outro createFileRoute antes do de verdade.
		expect(
			idDaRota(
				'// Antes era o createFileRoute("/piloto").\nexport const Route = createFileRoute("/sobre")({});',
			),
		).toBe("/sobre");
		// As outras formas que o gerador aceita: o Route com o tipo escrito e a
		// rota com outro nome, exportada como Route.
		expect(
			idDaRota('export const Route: Rota = createFileRoute("/sobre")({});'),
		).toBe("/sobre");
		expect(
			idDaRota(
				'const Sobre = createFileRoute("/sobre")({});\nexport { Sobre as Route };',
			),
		).toBe("/sobre");
		// O __root.tsx e o arquivo que não é rota, como um .functions.ts.
		expect(
			idDaRota("export const Route = createRootRouteWithContext()({});"),
		).toBeUndefined();
		expect(
			idDaRota("export const acao = createServerFn().handler(() => 1);"),
		).toBeUndefined();
	});

	it("a mãe de uma rota é a de id mais comprido que começa o dela, como no gerador do TanStack", () => {
		const ids = [
			"/",
			"/conta",
			"/conta/",
			"/conta/perfil",
			"/conta/perfil/foto",
			"/contas",
			"/_autenticado",
			"/_autenticado/painel",
			"/edicoes/",
			"/edicoes/$id",
		];

		expect(
			Object.fromEntries(ids.map((id) => [id, maeNoSite(id, ids)])),
		).toEqual({
			"/": "__root__",
			"/conta": "__root__",
			// O índice e as páginas de um layout ficam dentro dele.
			"/conta/": "/conta",
			"/conta/perfil": "/conta",
			"/conta/perfil/foto": "/conta/perfil",
			// O /conta começa outro id só até uma barra.
			"/contas": "__root__",
			"/_autenticado": "__root__",
			"/_autenticado/painel": "/_autenticado",
			// O id de índice, que acaba na barra, não é mãe.
			"/edicoes/": "__root__",
			"/edicoes/$id": "__root__",
		});
	});

	it("cada rota de src/routes está no criarRouter, dentro da mãe dela, e a que tem página abre por um endereço do QUE_ABREM", () => {
		// As rotas que o gerador de rotas do TanStack lê: os .ts e os .tsx de
		// src/routes com o createFileRoute, fora o que começa com "-" (o arquivo
		// ou a pasta), como este teste. O id de cada uma é o do createFileRoute,
		// e não o nome do arquivo (o idDaRota). Assim, uma rota nova não fica sem
		// a conferência do contêiner, nem a página de um layout sem ele em volta.
		const pasta = join(src, "routes");
		const textos = readdirSync(pasta, { recursive: true, encoding: "utf8" })
			.map((arquivo) => arquivo.replaceAll("\\", "/"))
			.filter(
				(arquivo) =>
					/\.tsx?$/.test(arquivo) &&
					!arquivo.split("/").some((parte) => parte.startsWith("-")),
			)
			.map((arquivo) => readFileSync(join(pasta, arquivo), "utf8"));
		const arquivos = [
			...new Set(textos.map(idDaRota).filter((id) => id !== undefined)),
		].sort();
		// As rotas com página: o component no arquivo dela ou no .lazy.tsx dela,
		// que tem o mesmo id. A rota sem página (o índice que só redireciona, a
		// rota do servidor) não abre pelo QUE_ABREM. Fica sem essa conferência a
		// página sem a palavra component no arquivo, com as opções vindas de outro
		// arquivo.
		const comPagina = new Set(
			textos.filter((texto) => /\bcomponent\b/.test(texto)).map(idDaRota),
		);
		const router = criarRouter();
		const rotas: Record<string, AnyRoute> = router.routesById;
		const montadas = Object.keys(rotas)
			.filter((id) => id !== "__root__")
			.sort();
		// As rotas que não estão dentro da mãe que têm no site, e onde elas vão.
		const foraDaMae = montadas
			.map((id) => ({ id, mae: maeNoSite(id, arquivos) }))
			.filter(({ id, mae }) => rotas[id].parentRoute.id !== mae)
			.map(({ id, mae }) => `${id} dentro de ${mae}`);
		// As rotas que cada endereço do QUE_ABREM abre: a da página e o layout em
		// volta dela.
		const abertas = new Set(
			QUE_ABREM.flatMap((caminho) =>
				router.getMatchedRoutes(caminho)[0].map(({ id }) => id),
			),
		);

		expect(
			montadas,
			"Cada arquivo de rota entra no criarRouter deste teste, com o id do createFileRoute dele",
		).toEqual(arquivos);
		expect(
			foraDaMae,
			"Cada rota entra no criarRouter deste teste dentro da mãe que tem no site: a página de um layout vai no addChildren dele, com o dentroDe",
		).toEqual([]);
		expect(
			montadas.filter((id) => comPagina.has(id) && !abertas.has(id)),
			"Cada rota com página abre por um endereço do QUE_ABREM deste teste: ponha nele um da rota que falta",
		).toEqual([]);
	});
});
