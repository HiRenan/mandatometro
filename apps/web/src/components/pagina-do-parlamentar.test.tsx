// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	DetalheParlamentar,
	PatrimonioParlamentar,
	VotoParlamentar,
} from "@/client";
import type { PaginaDoParlamentar, Patrimonio } from "@/lib/parlamentares";
import {
	CONTAGEM_ZERADA,
	correcaoDeExemplo,
	detalheDeExemplo,
	eleicaoDeExemplo,
	patrimonioDeExemplo,
	votoDoParlamentarDeExemplo,
	votosDeExemplo,
} from "@/lib/parlamentares/exemplos-de-teste";
import { Route } from "@/routes/parlamentares/$id";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));

beforeEach(() => {
	// O jsdom não rola a janela.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

/**
 * A página de uma pessoa num site de mentira, já no endereço certo. A rota entra
 * na árvore como no routeTree.gen.ts, e os dados vêm prontos, sem a função do
 * servidor nem o redirecionamento.
 */
async function abrir(
	parlamentar: DetalheParlamentar,
	votos: VotoParlamentar[] = [votoDoParlamentarDeExemplo(139)],
	paginaAtual = 1,
	total = votos.length,
	patrimonio: Patrimonio = patrimonioNaPagina(),
) {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/parlamentares/$id",
		path: "/parlamentares/$id",
		getParentRoute: () => raiz,
		loader: (): PaginaDoParlamentar => ({
			tipo: "parlamentar",
			parlamentar,
			votos,
			total,
			pagina: paginaAtual,
			paginas: Math.max(1, Math.ceil(total / 20)),
			patrimonio,
		}),
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		history: createMemoryHistory({
			initialEntries: [`/parlamentares/${parlamentar.id}`],
		}),
	});
	render(<RouterProvider router={router} />);
	await screen.findByRole("heading", { level: 1, name: parlamentar.nome });
}

/** O patrimônio como a página recebe do servidor, com as quatro eleições de exemplo. */
function patrimonioNaPagina(
	mudancas: Partial<PatrimonioParlamentar> = {},
): Patrimonio {
	const { eleicoes, correcao_ipca } = patrimonioDeExemplo(mudancas);
	return { tipo: "patrimonio", eleicoes, correcao: correcao_ipca };
}

/** A página de Ágata Cedrolume, com um voto, e o patrimônio dado. */
function abrirComPatrimonio(patrimonio: Patrimonio) {
	return abrir(detalheDeExemplo(), undefined, 1, undefined, patrimonio);
}

/** O espaço que não quebra entre o "R$" e o número. */
const SEM_QUEBRA = "\u00a0";
const reais = (numero: string) => `R$${SEM_QUEBRA}${numero}`;

/**
 * Cada eleição do patrimônio, parte por parte: o ano, o cargo e o lugar, o valor
 * em destaque, a fração da barra (ou nada) e os detalhes, com o arquivo do TSE.
 */
function eleicoes() {
	return Array.from(
		document.querySelectorAll(".eleicao-do-patrimonio"),
		(linha) => ({
			ano: linha.querySelector("h3")?.textContent,
			cargo: textos(linha, ".faixa > span"),
			valor: textos(linha, ".valor-da-eleicao > p"),
			barra:
				linha
					.querySelector<HTMLElement>(".barra-do-patrimonio")
					?.style.getPropertyValue("--parte") ?? null,
			detalhes: textos(linha, ".detalhes-da-eleicao > *"),
		}),
	);
}

function textos(dentro: Element, seletor: string) {
	return Array.from(
		dentro.querySelectorAll(seletor),
		(parte) => parte.textContent,
	);
}

/** O bloco do patrimônio, pelo título. */
function blocoDoPatrimonio() {
	const titulo = screen.getByRole("heading", {
		level: 2,
		name: "Patrimônio declarado ao TSE",
	});
	const bloco = titulo.closest("section");
	if (!bloco) throw new Error("o título do patrimônio está fora de uma seção");
	return bloco;
}

/** Cada voto de "Como votou": o nome, o número e a regra, como o leitor de tela lê. */
function comoVotou() {
	return Array.from(document.querySelectorAll(".tipo-de-voto"), (linha) =>
		Array.from(linha.children, (celula) => celula.textContent),
	);
}

describe("a página do parlamentar", () => {
	it("como votou: o número e a regra de cada voto, com o artigo do Regimento da Câmara", async () => {
		await abrir(detalheDeExemplo());

		expect(comoVotou()).toEqual([
			[
				"Sim",
				"12",
				"Votou a favor do que estava em votação. (Regimento Interno da Câmara, art. 187, § 1º)",
			],
			[
				"Não",
				"5",
				"Votou contra o que estava em votação. (Regimento Interno da Câmara, art. 187, § 1º)",
			],
			[
				"Abstenção",
				"1",
				"Estava na votação e não votou a favor nem contra. (Regimento Interno da Câmara, art. 180, § 2º)",
			],
			[
				"Obstrução",
				"0",
				"Deixou de votar numa estratégia do partido ou do bloco, comunicada à Mesa na Câmara e declarada pela liderança no Senado. (Regimento Interno da Câmara, art. 82, § 6º)",
			],
			[
				"Presidência",
				"0",
				"Presidia a sessão. Na votação aberta, quem preside só vota para desempatar; por isso, este registro aparece à parte e não conta como Sim nem como Não. (Regimento Interno da Câmara, art. 17, § 1º)",
			],
			[
				"Não votou",
				"2",
				"Não registrou voto. Pode ter faltado ou estado na sessão sem votar; o site não guarda o motivo.",
			],
		]);
		expect(
			screen
				.getByRole("link", {
					name: "Regimento Interno da Câmara dos Deputados",
				})
				.getAttribute("href"),
		).toBe(
			"https://www2.camara.leg.br/atividade-legislativa/legislacao/regimento-interno-da-camara-dos-deputados",
		);
	});

	it("no Senado, a regra cita o Regimento do Senado, e o Outro registro aparece quando passa de zero, sem artigo", async () => {
		await abrir(
			detalheDeExemplo({
				id: 501,
				nome: "Lia Quinemar",
				casa: "senado",
				contagem_votos: { ...CONTAGEM_ZERADA, sim: 3, outro: 1 },
			}),
		);
		const linhas = comoVotou();

		expect(linhas[0]).toEqual([
			"Sim",
			"3",
			"Votou a favor do que estava em votação. (Regimento Interno do Senado, art. 294)",
		]);
		expect(linhas.at(-1)).toEqual([
			"Outro registro",
			"1",
			"A fonte usou um código que o site ainda não classifica.",
		]);
		expect(
			screen.getByRole("link", { name: "Regimento Interno do Senado Federal" }),
		).toBeTruthy();
		expect(screen.getByText("Senado Federal")).toBeTruthy();
	});

	it("cada voto leva a quem votou como, com um nome de link só dele, e à página oficial só quando ela existe", async () => {
		await abrir(detalheDeExemplo(), [
			votoDoParlamentarDeExemplo(139),
			votoDoParlamentarDeExemplo(138, {
				valor: "nao",
				url_oficial: null,
				proposicoes: [],
				data: "2026-11-19",
			}),
		]);
		const [primeiro, segundo] = screen
			.getAllByRole("listitem", {
				name: undefined,
			})
			.filter((item) => item.classList.contains("voto-da-pessoa"));

		expect(
			within(primeiro)
				.getByRole("link", {
					name: "Ver quem votou na votação de 20 de novembro de 2026: PL 812/2026",
				})
				.getAttribute("href"),
		).toBe("/votacoes/139");
		expect(
			within(primeiro).getByRole("link", {
				name: "Página oficial da votação de 20 de novembro de 2026: PL 812/2026",
			}),
		).toBeTruthy();
		expect(within(primeiro).getByText("Sim")).toBeTruthy();
		// Sem proposição, o título é o dia, e o texto é a descrição oficial.
		expect(
			within(segundo).getByRole("heading", {
				level: 3,
				name: "Votação de 19 de novembro",
			}),
		).toBeTruthy();
		expect(
			within(segundo).getByText(
				"Votação nominal em turno único da matéria 138.",
			),
		).toBeTruthy();
		expect(
			within(segundo).queryByRole("link", { name: /Página oficial/ }),
		).toBeNull();
	});

	it.each([
		[1, "Votos mais antigos", "?pagina=2#votos"],
		[2, "Votos mais novos", "#votos"],
	])(
		"da página %i, o link leva ao título dos votos",
		async (pagina, nome, fim) => {
			await abrir(
				detalheDeExemplo(),
				votosDeExemplo(25, (pagina - 1) * 20).votos,
				pagina,
				25,
			);

			const titulo = screen.getByRole("heading", { level: 2, name: "Votos" });
			expect(titulo.id).toBe("votos");
			expect(titulo.getAttribute("tabindex")).toBe("-1");
			expect(
				screen.getByRole("link", { name: nome }).getAttribute("href"),
			).toBe(`/parlamentares/81-agata-cedrolume${fim}`);
		},
	);
});

describe("o patrimônio declarado ao TSE", () => {
	it("vem depois dos mandatos e antes de como votou; sem voto, antes da folha dos votos", async () => {
		const titulos = () =>
			screen
				.getAllByRole("heading", { level: 2 })
				.map((titulo) => titulo.textContent);

		await abrir(detalheDeExemplo());
		expect(titulos()).toEqual([
			"Mandatos",
			"Patrimônio declarado ao TSE",
			"Como votou",
			"Votos",
		]);

		cleanup();
		await abrir(detalheDeExemplo(), []);
		expect(titulos()).toEqual([
			"Mandatos",
			"Patrimônio declarado ao TSE",
			"Nenhum voto registrado ainda",
		]);
	});

	it("cada eleição, da mais antiga para a mais nova: o ano, o cargo e o estado, o valor de hoje com a barra, o declarado e o arquivo do TSE", async () => {
		await abrir(detalheDeExemplo());

		const arquivo = (ano: number) => [
			`Arquivo do TSE (ZIP) com os bens declarados em ${ano}`,
			"Coletado em 20 de novembro de 2026",
		];
		expect(eleicoes()).toEqual([
			{
				ano: "2014",
				cargo: ["Deputado estadual", "Santa Catarina"],
				valor: [reais("352 mil"), "em reais de hoje"],
				barra: "0.1459",
				detalhes: [
					`Declarado em${SEM_QUEBRA}2014: ${reais("198.300,00")}`,
					...arquivo(2014),
				],
			},
			{
				ano: "2018",
				cargo: ["Deputado federal", "Santa Catarina"],
				valor: [reais("1,1 milhão"), "em reais de hoje"],
				barra: "0.4558",
				detalhes: [
					`Declarado em${SEM_QUEBRA}2018: ${reais("812.400,00")}`,
					...arquivo(2018),
				],
			},
			{
				ano: "2022",
				cargo: ["Deputado federal", "Santa Catarina"],
				valor: ["Os dados do TSE desta eleição não trazem um total de bens."],
				barra: null,
				detalhes: arquivo(2022),
			},
			{
				ano: "2026",
				cargo: ["Senador", "Santa Catarina"],
				valor: [reais("2,4 milhões"), "em reais de hoje"],
				barra: "1",
				detalhes: [
					`Declarado em${SEM_QUEBRA}2026: ${reais("2.410.000,00")}`,
					...arquivo(2026),
				],
			},
		]);
		expect(
			screen
				.getByRole("link", {
					name: "Arquivo do TSE (ZIP) com os bens declarados em 2018",
				})
				.getAttribute("href"),
		).toBe(
			"https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2018.zip",
		);
		// O ano é o título de cada eleição, para quem anda pelos títulos.
		expect(
			within(blocoDoPatrimonio())
				.getAllByRole("heading", { level: 3 })
				.map((titulo) => titulo.textContent),
		).toEqual(["2014", "2018", "2022", "2026"]);
		// A barra é enfeite para o leitor de tela: o número já está escrito.
		for (const barra of document.querySelectorAll(".barra-do-patrimonio")) {
			expect(barra.getAttribute("aria-hidden")).toBe("true");
		}
	});

	it("a abertura diz até que mês vai a correção, o aviso vem logo antes da lista, e as fontes levam à série do Banco Central e à lei", async () => {
		await abrir(detalheDeExemplo());
		const bloco = blocoDoPatrimonio();

		expect(
			within(bloco).getByText(
				"Quem se candidata entrega à Justiça Eleitoral uma lista dos próprios bens, como casas, carros e dinheiro no banco. Aqui está o total que Ágata Cedrolume declarou nas eleições gerais em que concorreu. Para comparar anos diferentes, cada total aparece também em reais de hoje, corrigido pela inflação até outubro de 2026.",
			),
		).toBeTruthy();
		const aviso = within(bloco).getByText(
			"É o valor que a própria pessoa declarou ao registrar a candidatura, e não o patrimônio de hoje. A Justiça Eleitoral publica a declaração como recebeu, sem avaliar os bens, e cada bem costuma entrar pelo preço de compra: uma casa comprada há 20 anos pode aparecer pelo valor daquela época.",
		);
		const lista = within(bloco).getByRole("list");
		expect(aviso.nextElementSibling).toBe(lista);
		expect(within(lista).getAllByRole("listitem")).toHaveLength(4);
		expect(
			within(bloco).getByText(
				"Só aparecem as eleições em que deu para ligar, com segurança, a candidatura no TSE a Ágata Cedrolume. O arquivo de cada ano traz as declarações de todas as candidaturas daquela eleição.",
			),
		).toBeTruthy();
		expect(
			within(bloco).getByText(
				"A correção usa o IPCA, a inflação oficial medida pelo IBGE, de outubro do ano de cada eleição até outubro de 2026.",
			),
		).toBeTruthy();
		expect(
			within(bloco)
				.getByRole("link", { name: "Série do IPCA no Banco Central" })
				.getAttribute("href"),
		).toBe(
			"https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json",
		);
		expect(
			within(bloco).getByText("Coletada em 22 de novembro de 2026"),
		).toBeTruthy();
		expect(
			within(bloco)
				.getByRole("link", {
					name: (nome) => nome.startsWith("Lei 9.504/1997, art."),
				})
				.getAttribute("href"),
		).toBe("https://www.planalto.gov.br/ccivil_03/leis/l9504.htm#art11");
	});

	it("com uma eleição só, não há barra: não há com o que comparar", async () => {
		await abrirComPatrimonio(
			patrimonioNaPagina({ eleicoes: [eleicaoDeExemplo()] }),
		);

		expect(eleicoes()).toMatchObject([
			{ valor: [reais("1,1 milhão"), "em reais de hoje"], barra: null },
		]);
		expect(document.querySelector(".barra-do-patrimonio")).toBeNull();
	});

	it("o zero declarado aparece como R$ 0, sem barra, e o valor muito menor que o maior fica com o traço mínimo", async () => {
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({
						ano: 2006,
						total_centavos: 0,
						total_corrigido_centavos: 0,
					}),
					eleicaoDeExemplo({
						ano: 2010,
						total_centavos: 600_000,
						total_corrigido_centavos: 1_200_000,
					}),
					eleicaoDeExemplo({
						ano: 2022,
						total_centavos: 30_000_000_000,
						total_corrigido_centavos: 38_000_000_000,
					}),
				],
			}),
		);

		expect(eleicoes()).toMatchObject([
			{
				valor: [reais("0"), "em reais de hoje"],
				barra: null,
				detalhes: [
					`Declarado em${SEM_QUEBRA}2006: ${reais("0,00")}`,
					expect.any(String),
					expect.any(String),
				],
			},
			{ valor: [reais("12 mil"), "em reais de hoje"], barra: "0.0001" },
			{ valor: [reais("380 milhões"), "em reais de hoje"], barra: "1" },
		]);
	});

	it("sem a série do IPCA: o valor declarado, sem barras, e a abertura diz por quê", async () => {
		await abrirComPatrimonio(patrimonioNaPagina({ correcao_ipca: null }));
		const bloco = blocoDoPatrimonio();

		expect(eleicoes().map(({ valor, barra }) => [valor, barra])).toEqual([
			[[reais("198 mil"), "sem a correção pela inflação"], null],
			[[reais("812 mil"), "sem a correção pela inflação"], null],
			[["Os dados do TSE desta eleição não trazem um total de bens."], null],
			[[reais("2,4 milhões"), "sem a correção pela inflação"], null],
		]);
		expect(bloco.textContent).toContain(
			"declarou nas eleições gerais em que concorreu. Os valores aparecem como foram declarados, sem a correção pela inflação: a série do IPCA não está nos dados usados agora.",
		);
		expect(bloco.textContent).not.toContain("reais de hoje");
		expect(bloco.textContent).not.toContain("A correção usa o IPCA");
		expect(
			within(bloco).queryByRole("link", { name: /Banco Central/ }),
		).toBeNull();
	});

	it("a eleição sem a correção mostra o declarado no destaque, e as outras continuam com a barra", async () => {
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({ ano: 2018 }),
					eleicaoDeExemplo({ ano: 2022, total_corrigido_centavos: 55_000_000 }),
					eleicaoDeExemplo({
						ano: 2026,
						total_centavos: 241_000_000,
						total_corrigido_centavos: null,
					}),
				],
				correcao_ipca: correcaoDeExemplo({ mes_fim: "2026-09" }),
			}),
		);
		const bloco = blocoDoPatrimonio();

		expect(eleicoes().map(({ valor, barra }) => [valor, barra])).toEqual([
			[[reais("1,1 milhão"), "em reais de hoje"], "1"],
			[[reais("550 mil"), "em reais de hoje"], "0.5"],
			[[reais("2,4 milhões"), "sem a correção pela inflação"], null],
		]);
		expect(bloco.textContent).toContain(
			"corrigido pela inflação até setembro de 2026.",
		);
		expect(bloco.textContent).toContain(
			"de outubro do ano de cada eleição até setembro de 2026.",
		);
	});

	it("com a série e nenhuma eleição corrigida, a abertura não promete os reais de hoje", async () => {
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({ ano: 2026, total_corrigido_centavos: null }),
				],
				correcao_ipca: correcaoDeExemplo({ mes_fim: "2026-09" }),
			}),
		);
		const texto = blocoDoPatrimonio().textContent;

		expect(texto).toContain(
			"declarou nas eleições gerais em que concorreu.É o valor",
		);
		expect(texto).not.toContain("reais de hoje");
		expect(texto).not.toContain("a série do IPCA não está");
		expect(texto).toContain(
			"de outubro do ano de cada eleição até setembro de 2026.",
		);
	});

	it("sem eleição ligada à pessoa, a explicação curta, com o nome dela", async () => {
		await abrirComPatrimonio(patrimonioNaPagina({ eleicoes: [] }));
		const bloco = blocoDoPatrimonio();

		expect(
			within(bloco).getByText(
				"Os dados usados ainda não têm a declaração de bens de Ágata Cedrolume. Uma eleição só aparece aqui quando dá para ligar, com segurança, a candidatura no TSE a esta pessoa.",
			),
		).toBeTruthy();
		expect(within(bloco).queryByRole("list")).toBeNull();
		expect(bloco.textContent).not.toContain("É o valor que a própria pessoa");
	});

	it("o patrimônio que não carregou: o bloco diz em palavras, e o resto da página continua", async () => {
		await abrirComPatrimonio({ tipo: "indisponivel" });
		const bloco = blocoDoPatrimonio();

		expect(bloco.textContent).toBe(
			"Patrimônio declarado ao TSEO patrimônio declarado não carregou agora. Recarregue a página para tentar de novo.",
		);
		expect(
			screen.getByRole("heading", { level: 2, name: "Como votou" }),
		).toBeTruthy();
	});

	it("o arquivo fora dos sites oficiais fica escrito, sem link e sem o ZIP", async () => {
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({
						fonte: {
							url: "https://outro.example.com/bens.zip",
							coletado_em: "2026-11-20T15:00:00+00:00",
						},
					}),
				],
			}),
		);

		expect(eleicoes()[0].detalhes).toEqual([
			`Declarado em${SEM_QUEBRA}2018: ${reais("812.400,00")}`,
			"Arquivo do TSE",
			"Coletado em 20 de novembro de 2026",
		]);
		expect(screen.queryByRole("link", { name: /Arquivo do TSE/ })).toBeNull();
	});

	it("nenhuma palavra julga o número: sem subida, queda nem percentual", async () => {
		await abrir(detalheDeExemplo());

		expect(blocoDoPatrimonio().textContent).not.toMatch(
			/aument|diminu|cresc|caiu|enriquec|ganh|perd|suspeit|evolu|varia|%/i,
		);
	});
});
