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
	eleicaoDeExemplo,
	listaDeExemplo,
	patrimonioDeExemplo,
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

/**
 * A API de exemplo: a lista, a pessoa, a página de votos pedida, de `votos`
 * votos, e o patrimônio declarado, que `patrimonio` pode trocar por uma falha.
 */
function apiDeExemplo(
	votos = 25,
	patrimonio: () => Response = () => json(200, patrimonioDeExemplo()),
) {
	return api((pedido) => {
		const endereco = new URL(pedido.url);
		if (endereco.pathname === "/parlamentares") {
			return json(200, listaDeExemplo());
		}
		if (endereco.pathname.endsWith("/votos")) {
			const deslocamento = Number(endereco.searchParams.get("deslocamento"));
			return json(200, votosDeExemplo(votos, deslocamento));
		}
		if (endereco.pathname.endsWith("/patrimonio")) {
			return patrimonio();
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
	it.each(["fora do ar", "respondendo 500"])(
		"com a API %s, HTML de erro sem o detalhe interno",
		async (falha) => {
			api(() => {
				if (falha === "fora do ar") throw new TypeError(MENSAGEM_DA_FALHA);
				return json(500, { detalhe: MENSAGEM_DA_FALHA });
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
		},
	);

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
		// Depois do nome, a figura reúne a foto oficial e o crédito da Casa.
		const figura = /<figure class="foto-oficial"[^>]*>.*?<\/figure>/s.exec(
			html,
		);
		expect(figura?.index ?? -1).toBeGreaterThan(html.indexOf("</h1>"));
		const htmlDaFigura = figura?.[0] ?? "";
		const foto = /<img [^>]*>/.exec(htmlDaFigura)?.[0] ?? "";
		expect(foto).toContain(
			'src="https://www.camara.leg.br/internet/deputado/bandep/90000123.jpg"',
		);
		expect(foto).toContain('alt="Ágata Cedrolume"');
		expect(foto).toContain('width="300"');
		expect(foto).toContain('height="400"');
		expect(foto).toContain('referrerPolicy="no-referrer"');
		expect(htmlDaFigura).toContain(
			'<figcaption class="rotulo credito-da-foto">Foto: Câmara dos Deputados</figcaption>',
		);
		expect(html).toContain("57ª legislatura");
		// A regra de cada voto, com o artigo do regimento da Câmara, sem quebra
		// entre o "art." e o número.
		expect(html).toContain(
			'Votou a favor do que estava em votação.<span class="artigo-da-regra"> (Regimento Interno da Câmara, art. 187, § 1º)</span>',
		);
		expect(html.match(/<li class="voto-da-pessoa">/g)).toHaveLength(20);
		expect(html).toContain("Página 1 de 2");
		expect(html).toContain(`href="${CANONICO}?pagina=2#votos"`);
		expect(html).toMatch(/<h2 id="votos" tabindex="-1"[^>]*>Votos<\/h2>/);
		expect(html).toContain('href="/votacoes/139"');
	});

	it("o patrimônio declarado vem no HTML, entre os mandatos e como votou, com cada eleição e o arquivo do TSE", async () => {
		apiDeExemplo();

		const { status, html } = await pedir(CANONICO);

		expect(status).toBe(200);
		expect(html).toMatch(
			/<h2 id="patrimonio" class="subtitulo-condensado letra-com-teto \[--palavra:5\.26\]"[^>]*>Patrimônio declarado ao TSE<\/h2>/,
		);
		const mandatos = html.indexOf(">Mandatos</h2>");
		const patrimonio = html.indexOf(">Patrimônio declarado ao TSE</h2>");
		const comoVotou = html.indexOf(">Como votou</h2>");
		expect(mandatos).toBeGreaterThan(0);
		expect(patrimonio).toBeGreaterThan(mandatos);
		expect(comoVotou).toBeGreaterThan(patrimonio);
		expect(html.match(/<li class="eleicao-do-patrimonio">/g)).toHaveLength(4);
		expect(html).toContain("corrigido pela inflação até outubro de 2026.");
		expect(html).toContain('style="--parte:0.4558"');
		expect(html).toContain(
			'href="https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2018.zip"',
		);
	});

	it("só o patrimônio falha: a página abre com 200, o bloco diz que não carregou, e nada da falha chega ao HTML", async () => {
		apiDeExemplo(25, () => json(500, { detalhe: MENSAGEM_DA_FALHA }));

		const { status, html } = await pedir(CANONICO);

		expect(status).toBe(200);
		expect(html).toContain(
			"O patrimônio declarado não carregou agora. Recarregue a página para tentar de novo.",
		);
		expect(html).toContain(">Como votou</h2>");
		expect(html.match(/<li class="voto-da-pessoa">/g)).toHaveLength(20);
		for (const segredo of SEGREDOS) {
			expect(html, segredo).not.toContain(segredo);
		}
	});

	it("uma data de coleta inválida fica fora do HTML e o restante da página abre", async () => {
		const eleicao = eleicaoDeExemplo();
		apiDeExemplo(25, () =>
			json(
				200,
				patrimonioDeExemplo({
					eleicoes: [
						{
							...eleicao,
							fonte: { ...eleicao.fonte, coletado_em: "data inválida" },
						},
					],
				}),
			),
		);

		const { status, html } = await pedir(CANONICO);
		expect(status).toBe(200);
		expect(html).toContain("O patrimônio declarado não carregou agora.");
		expect(html).toContain(">Como votou</h2>");
		expect(html.match(/<li class="voto-da-pessoa">/g)).toHaveLength(20);
		expect(html).not.toMatch(
			/data inválida|Coletado em undefined|eleicao-do-patrimonio/,
		);
	});

	it("a segunda página de votos leva o número no título e volta à primeira sem o ?pagina", async () => {
		apiDeExemplo();

		const { status, html } = await pedir(`${CANONICO}?pagina=2#votos`);

		expect(status).toBe(200);
		expect(html).toContain(
			"<title>Ágata Cedrolume (página 2) · Mandatômetro</title>",
		);
		expect(html.match(/<li class="voto-da-pessoa">/g)).toHaveLength(5);
		expect(html).toMatch(
			new RegExp(`href="${CANONICO}#votos"[^>]*><span>Votos mais novos`),
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
			"O voto de cada parlamentar só fica registrado na votação nominal, feita em geral pelo painel eletrônico.",
		);
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
		// O mapa, os azulejos dos oito estados estreitos e a lista que fica no
		// lugar do mapa na tela estreita: 27, 8 e 27 links.
		expect(html.match(/href="\/parlamentares\?uf=[A-Z]{2}"/g)).toHaveLength(62);
		// No desenho, cada região é uma lista com o nome dela, já no HTML.
		expect(
			[...html.matchAll(/<g role="list" aria-label="([^"]+)"/g)].map(
				([, regiao]) => regiao,
			),
		).toEqual(["Norte", "Nordeste", "Sudeste", "Sul", "Centro-Oeste"]);
		expect(html).toContain("Escolha o seu estado.");
		// O campo "Estado" funciona sem JavaScript: o formulário pede a lista pelo GET.
		expect(html).toMatch(/<form [^>]*action="\/parlamentares" method="get"/);
	});

	it("o foco de teclado já vem no SVG para os 27 estados, por cima dos vizinhos e fora do leitor de tela", async () => {
		apiDeExemplo();
		const { html } = await pedir("/parlamentares");
		const svg = /class="desenho-do-brasil">(.*?)<\/svg>/s.exec(html)?.[1] ?? "";
		const camada = /<g class="focos-nativos" aria-hidden="true">(.*)/s.exec(
			svg,
		);
		expect(camada?.index ?? -1).toBeGreaterThan(
			svg.indexOf('class="contorno-do-brasil"'),
		);
		const focos = [
			...(camada?.[1] ?? "").matchAll(
				/<g class="foco-nativo[^"]*" data-uf="([A-Z]{2})">(.*?)<\/g>/g,
			),
		];
		expect(focos).toHaveLength(27);
		for (const [, uf, foco] of focos) {
			const link = new RegExp(`data-uf="${uf}"[^>]*><path id="([^"]+)"`).exec(
				svg,
			);
			expect(link?.[1], uf).toBeDefined();
			expect(
				[...foco.matchAll(/<use href="([^"]+)" class="([^"]+)"/g)].map(
					([, href, classe]) => [href, classe],
				),
				uf,
			).toEqual(
				["fio-claro", "anel", "estado"].map((classe) => [
					`#${link?.[1]}`,
					classe,
				]),
			);
		}
	});

	it("o crédito do mapa leva ao aviso da licença no HTML do servidor", async () => {
		apiDeExemplo();
		const { html } = await pedir("/parlamentares");
		const credito = /class="credito-do-mapa">(.*?)<\/p>/.exec(html)?.[1];
		expect(credito).toContain("Traçado dos estados: IBGE");
		expect(credito).toContain(
			'<a href="/licenca-do-tracado.txt">Licença MIT</a>',
		);
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

describe("o HTML da lista com as fotos e o link do cabeçalho", () => {
	/** O endereço da foto oficial de mentira de um nome, no site da Casa dele. */
	function enderecoDaFoto({ id, casa }: { id: number; casa: string }) {
		const numero = `9${String(id).padStart(7, "0")}`;
		return casa === "camara"
			? `https://www.camara.leg.br/internet/deputado/bandep/${numero}.jpg`
			: `https://legis.senado.leg.br/senadores/fotos-oficiais/${numero}`;
	}

	/** A API com a lista da #303, com a foto de cada nome, e a pessoa de exemplo. */
	function apiComFotos() {
		return api((pedido) => {
			const endereco = new URL(pedido.url);
			if (endereco.pathname === "/parlamentares") {
				return json(200, {
					parlamentares: listaDeExemplo().parlamentares.map((item) => ({
						...item,
						foto: {
							url: enderecoDaFoto(item),
							credito:
								item.casa === "camara"
									? "Câmara dos Deputados"
									: "Senado Federal",
						},
					})),
				});
			}
			if (endereco.pathname.endsWith("/votos")) {
				return json(200, votosDeExemplo(3));
			}
			if (endereco.pathname.endsWith("/patrimonio")) {
				return json(200, patrimonioDeExemplo());
			}
			return json(200, detalheDeExemplo());
		});
	}

	it("cada nome vem com o retrato antes do nome, fora do leitor de tela, com a foto lazy, sem o endereço da página e com o tamanho, e cada Casa com o crédito", async () => {
		apiComFotos();

		const { status, html } = await pedir("/parlamentares?uf=SC");

		expect(status).toBe(200);
		const nomes = [
			...html.matchAll(
				/<span class="retrato-na-lista" aria-hidden="true">(<img [^>]*>)<\/span><span class="nome">([^<]*)<\/span>/g,
			),
		];
		expect(nomes.map(([, , nome]) => nome)).toEqual([
			"Ágata Cedrolume",
			"Íris Dell&#x27;Ombre",
			"João-Pedro Varustel",
			"Lia Quinemar",
			"Otávio Belombre",
		]);
		const ids = [
			[81, "camara"],
			[82, "camara"],
			[83, "camara"],
			[501, "senado"],
			[502, "senado"],
		] as const;
		for (const [posicao, [id, casa]] of ids.entries()) {
			const foto = nomes[posicao]?.[1] ?? "";
			const endereco = enderecoDaFoto({ id, casa });
			expect(foto, String(id)).toContain(`src="${endereco}"`);
			for (const atributo of [
				'alt=""',
				'loading="lazy"',
				'decoding="async"',
				'referrerPolicy="no-referrer"',
				'width="300"',
				'height="400"',
			]) {
				expect(foto, `${id}: ${atributo}`).toContain(atributo);
			}
		}
		// Nenhuma foto é pedida antes da hora: sem o lazy, o React põe o preload
		// da imagem no <head>.
		const cabeca = /<head>(.*?)<\/head>/s.exec(html)?.[1] ?? "";
		expect(cabeca).not.toMatch(/as="image"|camara\.leg\.br|senado\.leg\.br/);
		expect(html).not.toMatch(/<link [^>]*(?:camara|senado)\.leg\.br/);
		for (const [casa, credito] of [
			["Câmara dos Deputados", "Fotos: Câmara dos Deputados"],
			["Senado Federal", "Fotos: Senado Federal"],
		]) {
			expect(html).toMatch(
				new RegExp(
					`>${casa}</h2><p class="rotulo credito-das-fotos">${credito}</p><ul role="list" class="nomes-da-casa" data-com-retratos="">`,
				),
			);
		}
	});

	it("sem as fotos nos dados, como na API de antes da #303, a lista vem como era", async () => {
		api(() =>
			json(200, {
				parlamentares: listaDeExemplo().parlamentares.map(
					({ foto: _, ...semFoto }) => semFoto,
				),
			}),
		);

		const { html } = await pedir("/parlamentares?uf=SC");

		expect(html).not.toMatch(/retrato-na-lista|credito-das-fotos|com-retratos/);
		expect(html).toContain(
			'<span class="nome">Ágata Cedrolume</span> <span class="partido">PFT</span>',
		);
	});

	/** As duas cópias do link "Parlamentares" no cabeçalho: a do meio e a de baixo. */
	function linksDoCabecalho(html: string) {
		const cabecalho = /<header class="moldura">(.*?)<\/header>/s.exec(html);
		return [
			...(cabecalho?.[1] ?? "").matchAll(
				/<a [^>]*href="\/parlamentares"[^>]*>Parlamentares<\/a>/g,
			),
		].map(([link]) => ({
			traco: link.includes('data-na-secao=""'),
			atual: link.includes('aria-current="page"'),
		}));
	}

	it.each([
		["na lista sem estado, com a página atual", "/parlamentares", true],
		["na lista de um estado", "/parlamentares?uf=SC", false],
		["na página da pessoa", CANONICO, false],
	])(
		"o link Parlamentares do cabeçalho fica com o traço %s",
		async (_, caminho, atual) => {
			apiComFotos();

			const { status, html } = await pedir(caminho);

			expect(status).toBe(200);
			expect(linksDoCabecalho(html)).toEqual([
				{ traco: true, atual },
				{ traco: true, atual },
			]);
		},
	);
});
