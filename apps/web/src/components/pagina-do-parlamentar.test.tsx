// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	Outlet,
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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
	DetalheParlamentar,
	FotoParlamentar,
	PatrimonioParlamentar,
	VotoParlamentar,
} from "@/client";
import type { PaginaDoParlamentar, Patrimonio } from "@/lib/parlamentares";
import {
	biografiaDeExemplo,
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
 * servidor nem o redirecionamento. A foto vai à parte, como o servidor manda.
 */
async function abrir(
	{ foto: fotoDaApi, ...parlamentar }: DetalheParlamentar,
	votos: VotoParlamentar[] = [votoDoParlamentarDeExemplo(139)],
	paginaAtual = 1,
	total = votos.length,
	patrimonio: Patrimonio = patrimonioNaPagina(),
	foto: FotoParlamentar | null = fotoDaApi,
) {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/parlamentares/$id",
		path: "/parlamentares/$id",
		getParentRoute: () => raiz,
		loader: (): PaginaDoParlamentar => ({
			tipo: "parlamentar",
			parlamentar,
			foto,
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
 * Cada eleição do patrimônio, parte por parte: o ano, o cargo e o lugar, o
 * resultado, o valor em destaque, a diferença (como o leitor de tela ouve e
 * como a tela mostra), o período da correção e os detalhes, com o arquivo do TSE.
 * Com a chave, cada eleição tem duas versões do valor, e o CSS mostra uma: aqui,
 * a dos reais de hoje ou, pedida, a do valor declarado.
 */
function eleicoes(vista: "de-hoje" | "declarado" = "de-hoje") {
	return Array.from(
		document.querySelectorAll(".eleicao-do-patrimonio"),
		(linha) => {
			const valor =
				linha.querySelector(`.valor-da-eleicao.so-${vista}`) ??
				linha.querySelector(".valor-da-eleicao");
			if (!valor) throw new Error("a eleição está sem o valor");
			const diferenca = valor.querySelector(".diferenca-da-eleicao");
			return {
				ano: linha.querySelector("h3")?.textContent,
				cargo: textos(linha, ".faixa > span"),
				resultado:
					linha.querySelector(".resultado-da-eleicao")?.textContent ?? null,
				valor: textos(
					valor,
					".destaque-do-valor, .legenda-do-valor, .sem-total-da-eleicao",
				),
				diferenca: diferenca && {
					leitor: lido(diferenca),
					tela: visto(diferenca),
				},
				periodo:
					valor.querySelector(".periodo-da-eleicao")?.textContent ?? null,
				detalhes: textos(
					linha,
					".declarado-na-eleicao > .sr-only, .detalhes-da-eleicao > :not(.declarado-na-eleicao)",
				),
			};
		},
	);
}

/** Cada linha do gráfico "Em reais de hoje": o ano, a parte da barra e o valor. */
function grafico() {
	return Array.from(document.querySelectorAll(".linha-do-grafico"), (linha) => [
		linha.querySelector(".ano-do-grafico")?.textContent,
		linha
			.querySelector<HTMLElement>(".barra-do-patrimonio")
			?.style.getPropertyValue("--parte") ?? null,
		linha.querySelector(".valor-do-grafico, .sem-valor-do-grafico")
			?.textContent,
	]);
}

function textos(dentro: Element, seletor: string) {
	return Array.from(
		dentro.querySelectorAll(seletor),
		(parte) => parte.textContent,
	);
}

/** O texto que o leitor de tela ouve: sem o que fica fora dele (aria-hidden). */
function lido(elemento: Element) {
	const copia = elemento.cloneNode(true) as Element;
	for (const fora of copia.querySelectorAll('[aria-hidden="true"]')) {
		fora.remove();
	}
	return copia.textContent;
}

/** O texto que a tela mostra: sem o que é só do leitor de tela (sr-only). */
function visto(elemento: Element) {
	const copia = elemento.cloneNode(true) as Element;
	for (const fora of copia.querySelectorAll(".sr-only")) {
		fora.remove();
	}
	return copia.textContent;
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

/**
 * Cada voto de "Como votou": o nome, o número e a regra, como o leitor de tela
 * lê. A barra fica de fora dele (barrasDeComoVotou).
 */
function comoVotou() {
	return Array.from(document.querySelectorAll(".tipo-de-voto"), (linha) =>
		Array.from(
			linha.querySelectorAll(":scope > :not([aria-hidden='true'])"),
			(celula) => celula.textContent,
		),
	);
}

/** A parte da barra de cada voto de "Como votou", ou nada, sem barra. */
function barrasDeComoVotou() {
	return Array.from(
		document.querySelectorAll(".tipo-de-voto"),
		(linha) =>
			linha
				.querySelector<HTMLElement>(".barra-do-tipo")
				?.style.getPropertyValue("--parte") ?? null,
	);
}

/**
 * Cada item da ficha do cartaz, como o leitor de tela lê: o rótulo, o valor e a
 * fonte. Os mandatos e as eleições vêm em lista, cada um com as partes dele (a
 * parte do mandato tem a classe do recuo com o quadradinho). A fonte com o dia
 * da coleta vem em duas linhas: a fonte e a coleta.
 */
function itensDaFicha() {
	return Array.from(document.querySelectorAll(".item-da-ficha"), (item) => {
		const valor = item.querySelector(".valor-da-ficha");
		const fonte = item.querySelector(".fonte-da-ficha");
		const itens = valor?.querySelectorAll("li") ?? [];
		return {
			rotulo: item.querySelector("dt")?.textContent,
			valor:
				itens.length > 0
					? Array.from(itens, (linha) =>
							textos(linha, ".faixa > .parte-do-mandato, :scope > span"),
						)
					: valor?.textContent,
			fonte: fonte && linhasDaFonte(fonte),
		};
	});
}

/** A fonte como o leitor de tela lê, com o dia da coleta, quando há, à parte. */
function linhasDaFonte(fonte: Element) {
	const coleta = fonte.querySelector(".coleta-da-ficha");
	if (!coleta) return lido(fonte);
	const semColeta = fonte.cloneNode(true) as Element;
	semColeta.querySelector(".coleta-da-ficha")?.remove();
	return [lido(semColeta)?.trim(), lido(coleta)];
}

/** As partes da faixa do cartaz, embaixo do nome. */
function faixaDoCartaz() {
	const faixa = document.querySelector(".cartaz-pe > p.rotulo");
	if (!faixa) throw new Error("o cartaz está sem a faixa");
	return textos(faixa, ".faixa > span");
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

	it("como votou: a barra de cada voto é a parte dele no total, fora do leitor de tela, com a frase que a explica", async () => {
		await abrir(detalheDeExemplo());

		// 12, 5, 1, 0, 0 e 2 dos 20 votos.
		expect(barrasDeComoVotou()).toEqual([
			"0.6",
			"0.25",
			"0.05",
			null,
			null,
			"0.1",
		]);
		const trilhos = document.querySelectorAll(".trilho-do-tipo");
		expect(trilhos).toHaveLength(6);
		for (const trilho of trilhos) {
			expect(trilho.getAttribute("aria-hidden")).toBe("true");
		}
		const legenda = document.querySelector(".legenda-das-barras");
		expect(legenda?.textContent).toBe(
			"A barra mostra a parte de cada voto no total de 20 votos registrados",
		);
		expect(legenda?.getAttribute("aria-hidden")).toBe("true");

		cleanup();
		await abrir(
			detalheDeExemplo({ contagem_votos: { ...CONTAGEM_ZERADA, sim: 1 } }),
		);
		expect(document.querySelector(".legenda-das-barras")?.textContent).toBe(
			"A barra mostra a parte de cada voto no total de 1 voto registrado",
		);
		expect(barrasDeComoVotou()[0]).toBe("1");
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
		expect(faixaDoCartaz()).toEqual(["Senado Federal", "Santa Catarina"]);
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

describe("a foto oficial no cartaz", () => {
	const NOME = "Ágata Cedrolume";

	it("vem depois do nome, com o nome no texto alternativo, a largura e a altura, sem o endereço da página e com o crédito da Casa", async () => {
		await abrir(detalheDeExemplo());

		const foto = screen.getByRole("img", { name: NOME });
		expect(foto.getAttribute("src")).toBe(
			"https://www.camara.leg.br/internet/deputado/bandep/90000123.jpg",
		);
		expect(foto.getAttribute("width")).toBe("300");
		expect(foto.getAttribute("height")).toBe("400");
		expect(foto.getAttribute("referrerpolicy")).toBe("no-referrer");
		const figura = screen.getByRole("figure");
		expect(figura.contains(foto)).toBe(true);
		expect(figura.querySelector(":scope > figcaption")?.textContent).toBe(
			"Foto: Câmara dos Deputados",
		);
		const titulo = screen.getByRole("heading", { level: 1, name: NOME });
		expect(
			titulo.compareDocumentPosition(foto) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(titulo.closest("section")?.classList).toContain("com-foto");
	});

	it("no Senado, o crédito é do Senado Federal", async () => {
		await abrir(
			detalheDeExemplo({ id: 501, nome: "Lia Quinemar", casa: "senado" }),
		);

		expect(
			screen.getByRole("img", { name: "Lia Quinemar" }).getAttribute("src"),
		).toBe("https://legis.senado.leg.br/senadores/fotos-oficiais/90000124");
		expect(screen.getByText("Foto: Senado Federal")).toBeTruthy();
	});

	it("a foto que não carrega sai, e a moldura fica com o azulejo cru, fora do leitor de tela, com o crédito escondido no mesmo lugar", async () => {
		await abrir(detalheDeExemplo());

		fireEvent.error(screen.getByRole("img", { name: NOME }));

		expect(screen.queryByRole("img", { name: NOME })).toBeNull();
		expect(screen.queryByRole("figure")).toBeNull();
		const foto = document.querySelector("figure.foto-oficial");
		expect(foto?.getAttribute("aria-hidden")).toBe("true");
		expect(foto?.querySelector(".moldura-da-foto")).toBeTruthy();
		// O CSS esconde o crédito da foto que falhou (estilos/parlamentares.test.ts):
		// ele continua na página, para o nome não subir.
		expect(
			screen
				.getByText("Foto: Câmara dos Deputados")
				.closest(".foto-que-falhou"),
		).toBe(foto);
		expect(screen.getByRole("heading", { level: 1, name: NOME })).toBeTruthy();
	});

	it("a foto que falhou antes de o JavaScript chegar também sai: o React não recebe mais o aviso da falha", async () => {
		vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(
			true,
		);
		vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(
			0,
		);

		await abrir(detalheDeExemplo());

		await waitFor(() =>
			expect(screen.queryByRole("img", { name: NOME })).toBeNull(),
		);
		expect(
			screen
				.getByText("Foto: Câmara dos Deputados")
				.closest(".foto-que-falhou"),
		).toBeTruthy();
	});

	it("a foto que chegou antes do JavaScript fica", async () => {
		vi.spyOn(HTMLImageElement.prototype, "complete", "get").mockReturnValue(
			true,
		);
		vi.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(
			300,
		);

		await abrir(detalheDeExemplo());

		expect(screen.getByRole("img", { name: NOME })).toBeTruthy();
		expect(screen.getByText("Foto: Câmara dos Deputados")).toBeTruthy();
	});

	it("sem a foto, o cartaz fica como antes, sem moldura nem crédito", async () => {
		await abrir(detalheDeExemplo(), undefined, 1, undefined, undefined, null);

		expect(document.querySelector(".foto-oficial")).toBeNull();
		expect(screen.queryByText(/^Foto:/)).toBeNull();
		expect(
			screen.getByRole("heading", { level: 1, name: NOME }).closest("section")
				?.classList,
		).not.toContain("com-foto");
	});
});

describe("a ficha no cartaz", () => {
	const NA_CAMARA = [
		"Fonte: Câmara dos Deputados",
		"Coletada em 20 de novembro de 2026.",
	];

	it("fica no pé do cartaz, depois do nome e da faixa, que leva só a Casa e o estado, e o título Ficha é só do leitor de tela", async () => {
		await abrir(detalheDeExemplo());

		const titulo = screen.getByRole("heading", { level: 2, name: "Ficha" });
		expect(titulo.classList).toContain("sr-only");
		const ficha = titulo.closest("section");
		expect(ficha?.parentElement?.classList).toContain("cartaz-pe");
		expect(ficha?.previousElementSibling?.classList).toContain("rotulo");
		expect(
			ficha?.querySelectorAll(":scope > dl > div.item-da-ficha"),
		).toHaveLength(7);
		expect(faixaDoCartaz()).toEqual(["Câmara dos Deputados", "Santa Catarina"]);
	});

	it("cada item, na ordem da tela, com o rótulo, o valor e a fonte", async () => {
		await abrir(detalheDeExemplo());

		expect(itensDaFicha()).toEqual([
			{
				rotulo: "Partido",
				valor: "PFT Partido Fictício do Trabalho",
				fonte: "Fonte: o último voto registrado.",
			},
			{
				rotulo: "Profissões",
				valor: "Professora e Advogada",
				fonte: NA_CAMARA,
			},
			{ rotulo: "Escolaridade", valor: "Superior", fonte: NA_CAMARA },
			{
				rotulo: "Mandatos",
				valor: [
					["57ª legislatura", "titular", "em exercício"],
					["56ª legislatura"],
				],
				fonte: "Fonte: Câmara dos Deputados.",
			},
			{
				rotulo: "Votos registrados",
				valor: "1",
				fonte:
					"Fonte: as votações nominais da Câmara dos Deputados. Ver os votos",
			},
			{
				rotulo: "Último patrimônio declarado",
				valor: `${reais("2,4 milhões")} em 2026`,
				fonte: [
					"Fonte: arquivo do TSE (ZIP) com os bens declarados em 2026",
					"Coletado em 20 de novembro de 2026.",
				],
			},
			{
				rotulo: "Eleições desde 2006",
				valor: [
					["2014", "Deputado estadual", "Ganhou pelo quociente partidário"],
					["2018", "Deputado federal", "Ganhou pela média"],
					["2022", "Deputado federal", "Ficou como suplente"],
					["2026", "Senador", "Ganhou"],
				],
				fonte: "Fonte: TSE. Ver o patrimônio de cada eleição",
			},
		]);
	});

	it("as fontes levam à página oficial da pessoa, ao arquivo do TSE da última eleição e, na própria página, aos votos e ao patrimônio de cada eleição", async () => {
		await abrir(detalheDeExemplo());

		const casa = screen.getAllByRole("link", { name: "Câmara dos Deputados" });
		expect(casa.map((link) => link.getAttribute("href"))).toEqual([
			"https://www.camara.leg.br/deputados/90000123",
			"https://www.camara.leg.br/deputados/90000123",
		]);
		expect(
			screen
				.getByRole("link", {
					name: "arquivo do TSE (ZIP) com os bens declarados em 2026",
				})
				.getAttribute("href"),
		).toBe(
			"https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2026.zip",
		);
		for (const [nome, trecho] of [
			["Ver os votos", "votos"],
			["Ver o patrimônio de cada eleição", "patrimonio"],
		]) {
			expect(
				screen.getByRole("link", { name: nome }).getAttribute("href"),
			).toBe(`#${trecho}`);
			expect(document.getElementById(trecho)?.tagName).toBe("H2");
		}
	});

	it("nenhum link das fontes vem seguido de pontuação, que começaria a linha de baixo quando ele quebra numa coluna estreita", async () => {
		await abrir(detalheDeExemplo());

		const links = Array.from(document.querySelectorAll(".fonte-da-ficha a"));
		expect(links).toHaveLength(5);
		for (const link of links) {
			expect(link.nextSibling?.textContent ?? "", lido(link) ?? "").not.toMatch(
				/^[,.;:]/,
			);
		}
	});

	it("sem o nome do partido, só a sigla; sem partido, a frase diz de onde ele viria, e a faixa fica só com a Casa e o estado", async () => {
		await abrir(detalheDeExemplo({ partido_nome: null }));
		expect(itensDaFicha()[0]).toEqual({
			rotulo: "Partido",
			valor: "PFT",
			fonte: "Fonte: o último voto registrado.",
		});

		cleanup();
		await abrir(detalheDeExemplo({ partido: null }));
		expect(itensDaFicha()[0]).toEqual({
			rotulo: "Partido",
			valor: "Sem partido nos dados usados",
			fonte: "O partido vem do último voto registrado.",
		});
		expect(faixaDoCartaz()).toEqual(["Câmara dos Deputados", "Santa Catarina"]);
		expect(document.querySelector(".cartaz-pe .para-quem")).toBeNull();
	});

	it("sem a biografia, a profissão e a escolaridade saem; com ela, o que a Casa não publica fica dito", async () => {
		await abrir(detalheDeExemplo({ biografia: null }));
		expect(itensDaFicha().map(({ rotulo }) => rotulo)).toEqual([
			"Partido",
			"Mandatos",
			"Votos registrados",
			"Último patrimônio declarado",
			"Eleições desde 2006",
		]);

		cleanup();
		await abrir(
			detalheDeExemplo({
				biografia: biografiaDeExemplo("camara", {
					profissoes: [],
					escolaridade: null,
				}),
			}),
		);
		expect(itensDaFicha().slice(1, 3)).toEqual([
			{
				rotulo: "Profissão",
				valor: "A Câmara dos Deputados não publica a profissão.",
				fonte: NA_CAMARA,
			},
			{
				rotulo: "Escolaridade",
				valor: "A Câmara dos Deputados não publica a escolaridade.",
				fonte: NA_CAMARA,
			},
		]);
	});

	it("no Senado, as fontes e o que falta falam do Senado Federal, e a profissão única vai no singular", async () => {
		await abrir(
			detalheDeExemplo({
				id: 501,
				nome: "Lia Quinemar",
				casa: "senado",
				biografia: biografiaDeExemplo("senado", {
					profissoes: ["Agricultora"],
					escolaridade: null,
				}),
			}),
		);
		const NO_SENADO = [
			"Fonte: Senado Federal",
			"Coletada em 20 de novembro de 2026.",
		];

		expect(itensDaFicha().slice(1, 5)).toEqual([
			{ rotulo: "Profissão", valor: "Agricultora", fonte: NO_SENADO },
			{
				rotulo: "Escolaridade",
				valor: "O Senado Federal não publica a escolaridade.",
				fonte: NO_SENADO,
			},
			expect.objectContaining({
				rotulo: "Mandatos",
				fonte: "Fonte: Senado Federal.",
			}),
			expect.objectContaining({
				fonte: "Fonte: as votações nominais do Senado Federal. Ver os votos",
			}),
		]);
		expect(
			screen
				.getAllByRole("link", { name: "Senado Federal" })[0]
				.getAttribute("href"),
		).toBe(
			"https://www25.senado.leg.br/web/senadores/senador/-/perfil/90000124",
		);
	});

	it("o mandato único vai no singular, e o mandato por outro estado leva o nome dele", async () => {
		await abrir(
			detalheDeExemplo({
				mandatos: [
					{
						legislatura: 55,
						uf: "PR",
						condicao: "Suplente",
						em_exercicio: false,
					},
				],
			}),
		);

		expect(itensDaFicha()[3]).toMatchObject({
			rotulo: "Mandato",
			valor: [["55ª legislatura", "Paraná", "suplente"]],
		});
	});

	it("sem mandato registrado, a linha dos mandatos sai da ficha", async () => {
		await abrir(detalheDeExemplo({ mandatos: [] }));

		expect(itensDaFicha().map(({ rotulo }) => rotulo)).toEqual([
			"Partido",
			"Profissões",
			"Escolaridade",
			"Votos registrados",
			"Último patrimônio declarado",
			"Eleições desde 2006",
		]);
	});

	it("sem voto registrado, a ficha diz em palavras, sem o link para os votos", async () => {
		await abrir(detalheDeExemplo(), []);

		expect(itensDaFicha()[4]).toEqual({
			rotulo: "Votos registrados",
			valor: "Nenhum voto registrado ainda",
			fonte: "Fonte: as votações nominais da Câmara dos Deputados.",
		});
		expect(screen.queryByRole("link", { name: "Ver os votos" })).toBeNull();
	});

	it("sem eleição ligada à pessoa, ou com o patrimônio que não carregou, o patrimônio e as eleições saem da ficha", async () => {
		const rotulos = () => itensDaFicha().map(({ rotulo }) => rotulo);
		const SEM_PATRIMONIO = [
			"Partido",
			"Profissões",
			"Escolaridade",
			"Mandatos",
			"Votos registrados",
		];

		await abrirComPatrimonio(patrimonioNaPagina({ eleicoes: [] }));
		expect(rotulos()).toEqual(SEM_PATRIMONIO);

		cleanup();
		await abrirComPatrimonio({ tipo: "indisponivel" });
		expect(rotulos()).toEqual(SEM_PATRIMONIO);
	});

	it("o último patrimônio é o da eleição mais nova com total, e a eleição sem resultado fica sem ele", async () => {
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({ ano: 2018 }),
					eleicaoDeExemplo({
						ano: 2022,
						total_centavos: null,
						total_corrigido_centavos: null,
					}),
				],
			}),
		);

		expect(itensDaFicha().slice(5)).toEqual([
			{
				rotulo: "Último patrimônio declarado",
				valor: `${reais("812 mil")} em 2018`,
				fonte: [
					"Fonte: arquivo do TSE (ZIP) com os bens declarados em 2018",
					"Coletado em 20 de novembro de 2026.",
				],
			},
			expect.objectContaining({
				valor: [
					["2018", "Deputado federal"],
					["2022", "Deputado federal"],
				],
			}),
		]);
	});

	it("a eleição por outro estado leva o nome dele, e a de presidente, Brasil", async () => {
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({ ano: 2018, uf: "PR" }),
					eleicaoDeExemplo({
						ano: 2022,
						cargo: { codigo: 1, nome: "Presidente" },
						uf: "BR",
					}),
					eleicaoDeExemplo({ ano: 2026 }),
				],
			}),
		);

		expect(itensDaFicha()[6].valor).toEqual([
			["2018", "Deputado federal, Paraná"],
			["2022", "Presidente, Brasil"],
			["2026", "Deputado federal"],
		]);
	});

	it("a página oficial fora dos sites da Casa fica escrita, sem link", async () => {
		await abrir(
			detalheDeExemplo({
				biografia: biografiaDeExemplo("camara", {
					fonte: {
						url: "https://outro.example.com/perfil",
						coletado_em: "2026-11-20T15:00:00+00:00",
					},
				}),
			}),
		);

		expect(itensDaFicha()[1].fonte).toEqual(NA_CAMARA);
		expect(
			screen.queryByRole("link", { name: "Câmara dos Deputados" }),
		).toBeNull();
	});

	it("o arquivo do TSE fora dos sites oficiais fica escrito, sem link e sem o ZIP", async () => {
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

		expect(itensDaFicha()[5]).toEqual({
			rotulo: "Último patrimônio declarado",
			valor: `${reais("812 mil")} em 2018`,
			fonte: ["Fonte: arquivo do TSE", "Coletado em 20 de novembro de 2026."],
		});
		expect(
			document.querySelectorAll(".item-da-ficha")[5].querySelector("a"),
		).toBeNull();
	});
});

describe("o patrimônio declarado ao TSE", () => {
	it("vem depois da ficha e antes de como votou; sem voto, antes da folha dos votos", async () => {
		const titulos = () =>
			screen
				.getAllByRole("heading", { level: 2 })
				.map((titulo) => titulo.textContent);

		await abrir(detalheDeExemplo());
		expect(titulos()).toEqual([
			"Ficha",
			"Patrimônio declarado ao TSE",
			"Como votou",
			"Votos",
		]);

		cleanup();
		await abrir(detalheDeExemplo(), []);
		expect(titulos()).toEqual([
			"Ficha",
			"Patrimônio declarado ao TSE",
			"Nenhum voto registrado ainda",
		]);
	});

	it("abre no valor declarado: a chave Mostrar os valores abre a coluna dos dados, com o valor declarado marcado", async () => {
		await abrir(detalheDeExemplo());

		const chave = within(blocoDoPatrimonio()).getByRole("group", {
			name: "Mostrar os valores",
		});
		expect(chave.tagName).toBe("FIELDSET");
		expect(chave.parentElement?.className).toBe("dados-do-patrimonio");
		expect(chave.parentElement?.firstElementChild).toBe(chave);
		const declarado = within(chave).getByRole<HTMLInputElement>("radio", {
			name: "Valor declarado",
		});
		const deHoje = within(chave).getByRole<HTMLInputElement>("radio", {
			name: "Em reais de hoje",
		});
		expect([declarado.checked, deHoje.checked]).toEqual([true, false]);
		expect(deHoje.name).toBe(declarado.name);
	});

	it("cada eleição traz o valor declarado, arredondado, antes da versão dos reais de hoje, que tem a diferença e o período", async () => {
		await abrir(detalheDeExemplo());

		expect(
			eleicoes("declarado").map(({ valor, diferenca, periodo }) => [
				valor,
				diferenca,
				periodo,
			]),
		).toEqual([
			[[reais("198 mil"), "valor declarado"], null, null],
			[[reais("812 mil"), "valor declarado"], null, null],
			[
				["Os dados do TSE desta eleição não trazem um total de bens."],
				null,
				null,
			],
			[[reais("2,4 milhões"), "valor declarado"], null, null],
		]);
		const [primeira, , semTotal] = document.querySelectorAll(
			".eleicao-do-patrimonio",
		);
		expect(
			Array.from(
				primeira.querySelectorAll(".valor-da-eleicao"),
				(versao) => versao.className,
			),
		).toEqual(["valor-da-eleicao so-declarado", "valor-da-eleicao so-de-hoje"]);
		// Sem o total, as duas versões diriam o mesmo: fica uma só.
		expect(
			Array.from(
				semTotal.querySelectorAll(".valor-da-eleicao"),
				(versao) => versao.className,
			),
		).toEqual(["valor-da-eleicao"]);
	});

	it("o gráfico, o aviso da diferença e o Como calculamos são só dos reais de hoje, e a frase da abertura sobre eles vem à parte", async () => {
		await abrir(detalheDeExemplo());
		const bloco = blocoDoPatrimonio();

		expect(
			Array.from(
				bloco.querySelectorAll(".dados-do-patrimonio > .so-de-hoje"),
				(parte) => parte.className,
			),
		).toEqual([
			"grafico-do-patrimonio so-de-hoje",
			"texto-do-patrimonio aviso-do-patrimonio so-de-hoje",
			"correcao-do-patrimonio so-de-hoje",
		]);
		expect(bloco.querySelector(".so-com-chave")?.textContent).toBe(
			" Para comparar anos diferentes, você pode ver cada total em reais de hoje, corrigido pela inflação até outubro de 2026.",
		);
	});

	it("sem a série do IPCA, ou sem eleição corrigida, não há chave nem segunda versão do valor", async () => {
		for (const patrimonio of [
			patrimonioNaPagina({ correcao_ipca: null }),
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({ ano: 2026, total_corrigido_centavos: null }),
				],
				correcao_ipca: correcaoDeExemplo({ mes_fim: "2026-09" }),
			}),
		]) {
			await abrirComPatrimonio(patrimonio);
			const bloco = blocoDoPatrimonio();

			expect(
				within(bloco).queryByRole("group", { name: "Mostrar os valores" }),
			).toBeNull();
			expect(
				bloco.querySelector(".so-declarado, .so-de-hoje, .so-com-chave"),
			).toBeNull();
			cleanup();
		}
	});

	it("cada eleição, da mais antiga para a mais nova: o ano, o cargo, o estado e o resultado, o valor de hoje, a diferença, o período, o declarado e o arquivo do TSE", async () => {
		await abrir(detalheDeExemplo());

		const arquivo = (ano: number) => [
			`Arquivo do TSE (ZIP) com os bens declarados em ${ano}`,
			"Coletado em 20 de novembro de 2026",
		];
		expect(eleicoes()).toEqual([
			{
				ano: "2014",
				cargo: ["Deputado estadual", "Santa Catarina"],
				resultado:
					"Ganhou a eleição pelo quociente partidário, a conta que reparte as vagas entre os partidos.",
				valor: [reais("352 mil"), "em reais de hoje"],
				diferenca: null,
				periodo: "Corrigido de outubro de 2014 a outubro de 2026",
				detalhes: [
					`Declarado em${SEM_QUEBRA}2014: ${reais("198.300,00")}`,
					...arquivo(2014),
				],
			},
			{
				ano: "2018",
				cargo: ["Deputado federal", "Santa Catarina"],
				resultado:
					"Ganhou a eleição pela média, a conta que reparte as vagas que sobram.",
				valor: [reais("1,1 milhão"), "em reais de hoje"],
				diferenca: {
					leitor: `${reais("748 mil")} a mais que em 2014, ou 212,4% a mais`,
					tela: `${reais("748 mil")} a mais que em 2014 (+212,4%)`,
				},
				periodo: "Corrigido de outubro de 2018 a outubro de 2026",
				detalhes: [
					`Declarado em${SEM_QUEBRA}2018: ${reais("812.400,00")}`,
					...arquivo(2018),
				],
			},
			{
				ano: "2022",
				cargo: ["Deputado federal", "Santa Catarina"],
				resultado: "Ficou como suplente.",
				valor: ["Os dados do TSE desta eleição não trazem um total de bens."],
				diferenca: null,
				periodo: null,
				detalhes: arquivo(2022),
			},
			{
				ano: "2026",
				cargo: ["Senador", "Santa Catarina"],
				resultado: "Ganhou a eleição.",
				valor: [reais("2,4 milhões"), "em reais de hoje"],
				diferenca: {
					leitor: `${reais("1,3 milhão")} a mais que em 2018, ou 119,4% a mais`,
					tela: `${reais("1,3 milhão")} a mais que em 2018 (+119,4%)`,
				},
				periodo: "Corrigido pela inflação de outubro de 2026",
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
		// O ano é o título de cada eleição, para quem anda pelos títulos, e o
		// "Como calculamos" vem depois delas.
		expect(
			within(blocoDoPatrimonio())
				.getAllByRole("heading", { level: 3 })
				.map((titulo) => titulo.textContent),
		).toEqual([
			"2014",
			"2018",
			"2022",
			"2026",
			"Como calculamos os reais de hoje",
		]);
		// As barras ficam só no gráfico do alto: a lista tem os números.
		expect(
			document.querySelector(".eleicoes-do-patrimonio .barra-do-patrimonio"),
		).toBeNull();
	});

	it("o gráfico dos valores de hoje vem entre a chave e a lista, numa régua só e fora do leitor de tela", async () => {
		await abrir(detalheDeExemplo());
		const desenho = blocoDoPatrimonio().querySelector(".grafico-do-patrimonio");

		expect(desenho?.getAttribute("aria-hidden")).toBe("true");
		expect(desenho?.previousElementSibling?.classList).toContain(
			"chave-dos-valores",
		);
		expect(desenho?.nextElementSibling?.classList).toContain(
			"eleicoes-do-patrimonio",
		);
		expect(desenho?.querySelector(".titulo-do-grafico")?.textContent).toBe(
			"Em reais de hoje",
		);
		expect(grafico()).toEqual([
			["2014", "0.1459", reais("352 mil")],
			["2018", "0.4558", reais("1,1 milhão")],
			["2022", null, "sem o valor de hoje"],
			["2026", "1", reais("2,4 milhões")],
		]);
	});

	it("depois da lista, o aviso da diferença; ele só aparece quando há uma, e a diferença zero tem a frase dela", async () => {
		const AVISO =
			"A diferença pode vir de compra, venda, herança ou doação de bens: sozinha, não diz por quê.";
		await abrir(detalheDeExemplo());

		const aviso = within(blocoDoPatrimonio()).getByText(AVISO);
		expect(aviso.classList).toContain("aviso-do-patrimonio");
		expect(aviso.previousElementSibling?.classList).toContain(
			"eleicoes-do-patrimonio",
		);

		cleanup();
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({ ano: 2014 }),
					eleicaoDeExemplo({ ano: 2018 }),
				],
			}),
		);
		expect(blocoDoPatrimonio().textContent).not.toContain(AVISO);

		cleanup();
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({ ano: 2014 }),
					eleicaoDeExemplo({
						ano: 2018,
						variacao: {
							ano_anterior: 2014,
							diferenca_centavos: 0,
							percentual: "0.0",
						},
					}),
				],
			}),
		);
		const mesmo = "O mesmo valor de 2014, em reais de hoje.";
		expect(eleicoes()[1].diferenca).toEqual({ leitor: mesmo, tela: mesmo });
		expect(blocoDoPatrimonio().textContent).toContain(AVISO);
	});

	it("a diferença a menos leva o sinal de menos na tela, e o leitor de tela ouve a menos", async () => {
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({ ano: 2018 }),
					eleicaoDeExemplo({
						ano: 2022,
						total_corrigido_centavos: 85_800_000,
						variacao: {
							ano_anterior: 2018,
							diferenca_centavos: -24_200_000,
							percentual: "-22.0",
						},
					}),
				],
			}),
		);

		expect(eleicoes()[1].diferenca).toEqual({
			leitor: `${reais("242 mil")} a menos que em 2018, ou 22,0% a menos`,
			tela: `${reais("242 mil")} a menos que em 2018 (−22,0%)`,
		});
	});

	it("o suplente de senador fala da chapa, e o resultado nulo não mostra nada", async () => {
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({
						ano: 2018,
						cargo: { codigo: 9, nome: "1º suplente" },
						resultado: "eleito",
					}),
					eleicaoDeExemplo({ ano: 2022, resultado: null }),
				],
			}),
		);

		expect(eleicoes().map(({ resultado }) => resultado)).toEqual([
			"A chapa ganhou a eleição.",
			null,
		]);
	});

	it("como calculamos: o método, uma frase por eleição corrigida com o link da Calculadora do Cidadão, e a série do IPCA", async () => {
		await abrir(detalheDeExemplo());
		const bloco = within(blocoDoPatrimonio());

		const correcao = bloco
			.getByRole("heading", {
				level: 3,
				name: "Como calculamos os reais de hoje",
			})
			.closest<HTMLElement>(".correcao-do-patrimonio");
		if (!correcao) throw new Error("o título fora da correção");
		expect(textos(correcao, ".calculo-da-eleicao > p")).toEqual([
			`De outubro de 2014 a outubro de 2026, os preços subiram 77,6%: cada ${reais("100")} de 2014 vale ${reais("177,57")} hoje.`,
			`De outubro de 2018 a outubro de 2026, os preços subiram 35,4%: cada ${reais("100")} de 2018 vale ${reais("135,40")} hoje.`,
			`Em outubro de 2026, os preços subiram 0,1%: cada ${reais("100")} de 2026 vale ${reais("100,14")} hoje.`,
		]);
		const calculadoras = within(correcao).getAllByRole("link", {
			name: /^Conferir na Calculadora do Cidadão/,
		});
		expect(calculadoras.map((link) => lido(link))).toEqual([
			"Conferir na Calculadora do Cidadão a correção de 2014",
			"Conferir na Calculadora do Cidadão a correção de 2018",
			"Conferir na Calculadora do Cidadão a correção de 2026",
		]);
		expect(calculadoras[1].getAttribute("href")).toBe(
			"https://www3.bcb.gov.br/CALCIDADAO/publico/corrigirPorIndice.do?method=corrigirPorIndice&dataInicial=10/2018&dataFinal=10/2026&valorCorrecao=100,00&selIndice=00433IPCA",
		);
	});

	it("com todos os totais corrigidos, a abertura diz até que mês vai a correção e o aviso e as fontes explicam os dados", async () => {
		await abrir(detalheDeExemplo());
		const bloco = blocoDoPatrimonio();

		expect(bloco.querySelector(".texto-do-patrimonio")?.textContent).toBe(
			"Quem se candidata entrega à Justiça Eleitoral uma lista dos próprios bens, como casas, carros e dinheiro no banco. Aqui está o total que Ágata Cedrolume declarou nas eleições gerais em que concorreu. Para comparar anos diferentes, você pode ver cada total em reais de hoje, corrigido pela inflação até outubro de 2026.",
		);
		const aviso = within(bloco).getByText(
			"É o valor que a própria pessoa declarou ao registrar a candidatura, e não o patrimônio de hoje. A Justiça Eleitoral dá acesso à declaração como ela foi entregue, e cada bem costuma entrar pelo preço de compra, como na declaração do Imposto de Renda: uma casa comprada há 20 anos pode aparecer pelo valor daquela época.",
		);
		const lista = bloco.querySelector<HTMLElement>(".eleicoes-do-patrimonio");
		if (!lista) throw new Error("sem a lista das eleições");
		// A abertura e o aviso numa coluna; na outra, a chave, o gráfico (fora do
		// leitor de tela), a lista e o resto, na ordem da tela larga.
		const [abertura, dados] = bloco.querySelectorAll(":scope > div");
		expect(aviso.parentElement).toBe(abertura);
		expect(abertura.lastElementChild).toBe(aviso);
		expect(Array.from(dados.children, (parte) => parte.className)).toEqual([
			"chave-dos-valores",
			"grafico-do-patrimonio so-de-hoje",
			"eleicoes-do-patrimonio",
			"texto-do-patrimonio aviso-do-patrimonio so-de-hoje",
			"texto-do-patrimonio nota-do-patrimonio",
			"correcao-do-patrimonio so-de-hoje",
			"fonte-das-regras",
		]);
		expect(within(lista).getAllByRole("listitem")).toHaveLength(4);
		expect(
			within(bloco).getByText(
				"Só aparecem as eleições em que deu para ligar, com segurança, a candidatura no TSE a Ágata Cedrolume. O arquivo de cada ano é o do TSE com os bens declarados naquela eleição, e não só os desta pessoa.",
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
		expect(
			within(bloco)
				.getByRole("link", { name: /^Lei 9\.250\/1995, art\.\s+25$/ })
				.getAttribute("href"),
		).toBe("https://www.planalto.gov.br/ccivil_03/leis/l9250.htm#art25");
		expect(bloco.querySelector(".fonte-das-regras")?.textContent).toMatch(
			/^Fontes das regras:/,
		);
	});

	it("as duas fontes mostram o dia em Brasília quando a coleta ocorre perto da meia-noite UTC", async () => {
		const eleicao = eleicaoDeExemplo();
		const correcao = correcaoDeExemplo();
		const coletado_em = "2026-11-21T01:30:00Z";
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [{ ...eleicao, fonte: { ...eleicao.fonte, coletado_em } }],
				correcao_ipca: {
					...correcao,
					fonte: { ...correcao.fonte, coletado_em },
				},
			}),
		);

		const bloco = within(blocoDoPatrimonio());
		expect(bloco.getByText("Coletado em 20 de novembro de 2026")).toBeTruthy();
		expect(bloco.getByText("Coletada em 20 de novembro de 2026")).toBeTruthy();
	});

	it("o declarado conserva o valor exato e só oferece quebras entre os grupos de milhar", async () => {
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({
						total_centavos: Number.MAX_SAFE_INTEGER,
						total_corrigido_centavos: null,
					}),
				],
			}),
		);

		const declarado = blocoDoPatrimonio().querySelector(
			".declarado-na-eleicao",
		);
		const texto = "Declarado em\u00a02018: R$\u00a090.071.992.547.409,91";
		expect(declarado?.querySelector(".sr-only")?.textContent).toBe(texto);
		const visual = declarado?.querySelector('[aria-hidden="true"]');
		expect(visual?.textContent).toBe(texto);
		const valor = visual?.querySelector(".valor-exato-da-eleicao");
		expect(
			Array.from(valor?.childNodes ?? [], (parte) =>
				parte.nodeName === "WBR" ? "quebra" : parte.textContent,
			),
		).toEqual([
			"R$\u00a090.",
			"quebra",
			"071.",
			"quebra",
			"992.",
			"quebra",
			"547.",
			"quebra",
			"409,91",
		]);
	});

	it("com uma eleição só, não há gráfico: não há com o que comparar", async () => {
		await abrirComPatrimonio(
			patrimonioNaPagina({ eleicoes: [eleicaoDeExemplo()] }),
		);

		expect(eleicoes()).toMatchObject([
			{ valor: [reais("1,1 milhão"), "em reais de hoje"] },
		]);
		expect(document.querySelector(".grafico-do-patrimonio")).toBeNull();
		expect(document.querySelector(".barra-do-patrimonio")).toBeNull();
	});

	it("o zero declarado aparece como R$ 0, sem barra no gráfico, e o valor muito menor que o maior fica com o traço mínimo", async () => {
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
				detalhes: [
					`Declarado em${SEM_QUEBRA}2006: ${reais("0,00")}`,
					expect.any(String),
					expect.any(String),
				],
			},
			{ valor: [reais("12 mil"), "em reais de hoje"] },
			{ valor: [reais("380 milhões"), "em reais de hoje"] },
		]);
		expect(grafico()).toEqual([
			["2006", null, reais("0")],
			["2010", "0.0001", reais("12 mil")],
			["2022", "1", reais("380 milhões")],
		]);
	});

	it("sem a série do IPCA: o valor declarado, sem gráfico, diferença nem cálculo, e a abertura diz por quê", async () => {
		await abrirComPatrimonio(patrimonioNaPagina({ correcao_ipca: null }));
		const bloco = blocoDoPatrimonio();

		expect(
			eleicoes().map(({ valor, diferenca, periodo }) => [
				valor,
				diferenca,
				periodo,
			]),
		).toEqual([
			[[reais("198 mil"), "sem a correção pela inflação"], null, null],
			[[reais("812 mil"), "sem a correção pela inflação"], null, null],
			[
				["Os dados do TSE desta eleição não trazem um total de bens."],
				null,
				null,
			],
			[[reais("2,4 milhões"), "sem a correção pela inflação"], null, null],
		]);
		expect(bloco.textContent).toContain(
			"declarou nas eleições gerais em que concorreu. Os valores aparecem como foram declarados, sem a correção pela inflação: a série do IPCA não está nos dados usados agora.",
		);
		expect(bloco.querySelector(".grafico-do-patrimonio")).toBeNull();
		expect(bloco.textContent).not.toContain("reais de hoje");
		expect(bloco.textContent).not.toContain("A correção usa o IPCA");
		expect(bloco.textContent).not.toContain("A diferença pode vir");
		expect(
			within(bloco).queryByRole("link", { name: /Banco Central/ }),
		).toBeNull();
	});

	it("a eleição sem a correção mostra o declarado no destaque e fica sem barra no gráfico, e as outras continuam com ela", async () => {
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

		expect(eleicoes().map(({ valor }) => valor)).toEqual([
			[reais("1,1 milhão"), "em reais de hoje"],
			[reais("550 mil"), "em reais de hoje"],
			[reais("2,4 milhões"), "sem a correção pela inflação"],
		]);
		expect(grafico()).toEqual([
			["2018", "1", reais("1,1 milhão")],
			["2022", "0.5", reais("550 mil")],
			["2026", null, "sem o valor de hoje"],
		]);
		// No valor declarado, a eleição sem a correção é como as outras.
		expect(eleicoes("declarado").map(({ valor }) => valor)).toEqual([
			[reais("812 mil"), "valor declarado"],
			[reais("812 mil"), "valor declarado"],
			[reais("2,4 milhões"), "valor declarado"],
		]);
		expect(bloco.textContent).toContain(
			"Para comparar anos diferentes, você pode ver os totais em reais de hoje, corrigidos pela inflação até setembro de 2026, quando a série do IPCA cobre a eleição.",
		);
		expect(bloco.textContent).toContain(
			"A correção usa o IPCA, a inflação oficial medida pelo IBGE, de outubro do ano da eleição até setembro de 2026.",
		);
	});

	it("com a série e nenhuma eleição corrigida, a linha mostra o declarado e a nota do IPCA não aparece", async () => {
		await abrirComPatrimonio(
			patrimonioNaPagina({
				eleicoes: [
					eleicaoDeExemplo({ ano: 2026, total_corrigido_centavos: null }),
				],
				correcao_ipca: correcaoDeExemplo({ mes_fim: "2026-09" }),
			}),
		);
		const bloco = blocoDoPatrimonio();
		const texto = bloco.textContent;

		expect(texto).toContain(
			"declarou nas eleições gerais em que concorreu.É o valor",
		);
		expect(texto).not.toContain("reais de hoje");
		expect(texto).not.toContain("a série do IPCA não está");
		expect(texto).toContain("sem a correção pela inflação");
		expect(bloco.querySelector(".correcao-do-patrimonio")).toBeNull();
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

	it("nenhuma palavra julga a diferença: ela vem em reais e em percentual, com a mais ou a menos, sem adjetivo", async () => {
		await abrir(detalheDeExemplo());
		const texto = blocoDoPatrimonio().textContent;

		expect(texto).toContain("a mais que em 2014");
		expect(texto).not.toMatch(
			/aument|diminu|cresc|dobr|enriquec|suspeit|evolu|salto|saltou|dispar|despenc|explod/i,
		);
	});
});

describe("a tela larga", () => {
	/** As partes de um bloco, pelo que o CSS das duas colunas usa: o id ou a classe. */
	const partes = (bloco: Element) =>
		Array.from(bloco.children, (parte) => parte.id || parte.className);

	it("o corpo e o patrimônio têm as classes e a ordem que as duas colunas usam: o título e a abertura de um lado, os dados do outro", async () => {
		await abrir(detalheDeExemplo());
		const bloco = blocoDoPatrimonio();
		const corpo = bloco.parentElement;

		expect(corpo?.className).toBe(
			"artigos corpo-dos-parlamentares corpo-do-parlamentar",
		);
		expect(corpo?.firstElementChild).toBe(bloco);
		expect(bloco.classList).toContain("patrimonio-declarado");
		expect(partes(bloco)).toEqual([
			"patrimonio",
			"abertura-do-patrimonio",
			"dados-do-patrimonio",
		]);
		expect(
			corpo?.querySelector(".votos-do-parlamentar > .voto-da-pessoa"),
		).not.toBeNull();
	});

	it("sem eleição, a frase do patrimônio fica no lugar dos dados; sem voto, a folha dos votos vem logo depois, no corpo", async () => {
		await abrir(
			detalheDeExemplo(),
			[],
			1,
			undefined,
			patrimonioNaPagina({ eleicoes: [] }),
		);
		const bloco = blocoDoPatrimonio();

		expect(partes(bloco)).toEqual(["patrimonio", "texto-do-patrimonio"]);
		expect(bloco.nextElementSibling?.className).toBe("sem-votos");
		expect(bloco.parentElement?.classList).toContain("corpo-do-parlamentar");
	});
});
