import { describe, expect, it } from "vitest";
import {
	type Documento,
	prepararIndice,
	procurar,
	type Resultado,
	TAMANHO_DO_TRECHO,
	termosDaBusca,
} from "./procurar";

// Páginas inventadas, só para os testes: os textos imitam o assunto do site, sem
// pessoa nenhuma.

function documento(
	dados: Partial<Documento> & Pick<Documento, "endereco" | "titulo">,
): Documento {
	return { tipo: "artigo", resumo: "", secoes: [], ...dados };
}

function buscar(documentos: Documento[], busca: string): Resultado[] {
	return procurar(prepararIndice(documentos), busca);
}

/** Os endereços dos resultados, na ordem. */
function enderecos(documentos: Documento[], busca: string): string[] {
	return buscar(documentos, busca).map((resultado) => resultado.endereco);
}

/** O trecho em texto corrido, com cada palavra achada entre asteriscos. */
function trechoEmTexto(resultado: Resultado): string {
	return resultado.trecho
		.map((pedaco) => (pedaco.achado ? `*${pedaco.texto}*` : pedaco.texto))
		.join("");
}

const CONSTITUICAO = documento({
	endereco: "/trilhas/constituicao/o-que-e",
	titulo: "O que é a Constituição",
	resumo: "A lei maior do país, que as outras leis seguem.",
});

describe("as palavras da busca", () => {
	it("ficam sem acento, sem maiúscula e sem repetição", () => {
		expect(termosDaBusca("  Votação  VOTAÇÃO, Câmara ")).toEqual([
			"votacao",
			"camara",
		]);
	});

	it("perdem as palavras vazias quando há outra palavra", () => {
		expect(termosDaBusca("o que é o veto de")).toEqual(["veto"]);
		expect(termosDaBusca("de")).toEqual(["de"]);
	});

	it("só com espaços ou sinais, não há palavra", () => {
		expect(termosDaBusca("")).toEqual([]);
		expect(termosDaBusca("   ")).toEqual([]);
		expect(termosDaBusca("?! — …")).toEqual([]);
	});
});

describe("a procura", () => {
	it("acha sem acento e sem maiúscula", () => {
		expect(enderecos([CONSTITUICAO], "constituicao")).toEqual([
			CONSTITUICAO.endereco,
		]);
		expect(enderecos([CONSTITUICAO], "CONSTITUIÇÃO")).toEqual([
			CONSTITUICAO.endereco,
		]);
		expect(enderecos([CONSTITUICAO], "Constituicão")).toEqual([
			CONSTITUICAO.endereco,
		]);
	});

	it("acha a palavra pelo começo, e não pelo meio", () => {
		expect(enderecos([CONSTITUICAO], "constitu")).toEqual([
			CONSTITUICAO.endereco,
		]);
		expect(enderecos([CONSTITUICAO], "tuicao")).toEqual([]);
	});

	it("a página tem que ter todas as palavras, em qualquer lugar dela", () => {
		const paginas = [
			documento({ endereco: "/so-o-veto", titulo: "O veto" }),
			documento({
				endereco: "/os-dois",
				titulo: "O veto",
				secoes: [{ texto: "A derrubada precisa da maioria absoluta." }],
			}),
		];

		expect(enderecos(paginas, "veto derrubada")).toEqual(["/os-dois"]);
		expect(enderecos(paginas, "derrubada veto")).toEqual(["/os-dois"]);
	});

	it("deixa as palavras vazias de fora, e procura uma sozinha pelo começo", () => {
		const paginas = [
			documento({ endereco: "/veto", titulo: "Veto" }),
			documento({ endereco: "/deputado", titulo: "Deputado" }),
		];

		expect(enderecos(paginas, "o veto de")).toEqual(["/veto"]);
		expect(enderecos(paginas, "de")).toEqual(["/deputado"]);
	});

	it("a busca vazia ou só com sinais não acha nada", () => {
		expect(enderecos([CONSTITUICAO], "")).toEqual([]);
		expect(enderecos([CONSTITUICAO], "?!")).toEqual([]);
	});
});

describe("a ordem", () => {
	it("vai pelo lugar da palavra: título, intertítulo, resumo e texto", () => {
		const paginas = [
			documento({
				endereco: "/no-texto",
				titulo: "Um",
				secoes: [{ texto: "Aqui se fala do veto." }],
			}),
			documento({ endereco: "/no-resumo", titulo: "Dois", resumo: "O veto." }),
			documento({
				endereco: "/no-intertitulo",
				titulo: "Três",
				secoes: [{ id: "o-veto", titulo: "O veto", texto: "Nada mais." }],
			}),
			documento({ endereco: "/no-titulo", titulo: "O veto" }),
		];

		expect(enderecos(paginas, "veto")).toEqual([
			"/no-titulo",
			"/no-intertitulo#o-veto",
			"/no-resumo",
			"/no-texto",
		]);
	});

	it("a palavra inteira passa à frente do começo dela, no mesmo lugar", () => {
		const paginas = [
			documento({ endereco: "/vetos", titulo: "Os vetos" }),
			documento({ endereco: "/veto", titulo: "O veto" }),
		];

		expect(enderecos(paginas, "veto")).toEqual(["/veto", "/vetos"]);
	});

	it("a palavra inteira não passa à frente de um lugar melhor", () => {
		const paginas = [
			documento({
				endereco: "/inteira-no-texto",
				titulo: "Um",
				secoes: [{ texto: "Fala do veto." }],
			}),
			documento({
				endereco: "/comeco-no-resumo",
				titulo: "Dois",
				resumo: "Os vetos.",
			}),
		];

		expect(enderecos(paginas, "veto")).toEqual([
			"/comeco-no-resumo",
			"/inteira-no-texto",
		]);
	});

	it("no empate, vem a trilha, depois o artigo e a edição, cada um na ordem do site", () => {
		const paginas = [
			documento({ tipo: "edicao", endereco: "/edicoes/2", titulo: "O veto" }),
			documento({ tipo: "artigo", endereco: "/artigo-b", titulo: "O veto" }),
			documento({ tipo: "artigo", endereco: "/artigo-a", titulo: "O veto" }),
			documento({ tipo: "trilha", endereco: "/trilha", titulo: "O veto" }),
		];

		expect(enderecos(paginas, "veto")).toEqual([
			"/trilha",
			"/artigo-b",
			"/artigo-a",
			"/edicoes/2",
		]);
	});
});

describe("o trecho", () => {
	const LONGO =
		"Primeiro vem uma frase comprida que fala de outros assuntos do Congresso Nacional e das comissões, antes de chegar ao ponto. " +
		"Depois, a Constituição explica como o projeto vira lei, passo a passo, com a votação nas duas casas e a sanção. " +
		"Por fim, o texto termina com mais uma frase longa sobre outros temas, que não importam aqui.";

	const COMPRIDO = documento({
		endereco: "/comprido",
		titulo: "Um texto comprido",
		resumo: "Um resumo curto.",
		secoes: [{ texto: LONGO }],
	});

	it("mostra uns 180 caracteres em volta da palavra, cortados entre palavras", () => {
		const [resultado] = buscar([COMPRIDO], "constituicao");
		const texto = trechoEmTexto(resultado);
		const recorte = texto.slice(1, -1).replaceAll("*", "");
		const inicio = LONGO.indexOf(recorte);

		expect(texto.startsWith("…")).toBe(true);
		expect(texto.endsWith("…")).toBe(true);
		expect(texto).toContain("*Constituição*");
		expect(recorte.length).toBeLessThanOrEqual(TAMANHO_DO_TRECHO);
		expect(recorte.length).toBeGreaterThan(TAMANHO_DO_TRECHO - 20);
		expect(recorte.indexOf("Constituição")).toBeGreaterThan(0);
		expect(inicio).toBeGreaterThan(0);
		expect(LONGO[inicio - 1]).toMatch(/[^\p{L}\p{N}]/u);
		expect(LONGO[inicio + recorte.length]).toMatch(/[^\p{L}\p{N}]/u);
	});

	it("marca cada palavra achada inteira, como está no texto", () => {
		const [resultado] = buscar([COMPRIDO], "constitu vota");

		expect(trechoEmTexto(resultado)).toContain(
			"a *Constituição* explica como o projeto vira lei, passo a passo, com a *votação* nas duas casas",
		);
	});

	it("o texto curto vai inteiro, sem reticências", () => {
		const curto = documento({
			endereco: "/curto",
			titulo: "Um",
			secoes: [{ texto: "A sanção transforma o projeto em lei." }],
		});

		expect(buscar([curto], "sancao")[0].trecho).toEqual([
			{ texto: "A ", achado: false },
			{ texto: "sanção", achado: true },
			{ texto: " transforma o projeto em lei.", achado: false },
		]);
	});

	it("com a palavra só no título, o trecho é o resumo, sem nada marcado", () => {
		const [resultado] = buscar(
			[
				documento({
					endereco: "/veto",
					titulo: "O veto",
					resumo: "Quando o presidente recusa um projeto aprovado.",
					secoes: [{ texto: "Outro assunto." }],
				}),
			],
			"veto",
		);

		expect(resultado.trecho).toEqual([
			{
				texto: "Quando o presidente recusa um projeto aprovado.",
				achado: false,
			},
		]);
	});

	it("com a palavra no resumo, marca o resumo", () => {
		const [resultado] = buscar(
			[
				documento({
					endereco: "/sancao",
					titulo: "Sanção",
					resumo: "Depois do veto, o Congresso decide.",
					secoes: [{ texto: "Sem a palavra aqui." }],
				}),
			],
			"veto",
		);

		expect(trechoEmTexto(resultado)).toBe(
			"Depois do *veto*, o Congresso decide.",
		);
	});
});

describe("o link", () => {
	const ARTIGO = documento({
		endereco: "/trilhas/processo/como-nasce",
		titulo: "Como nasce uma lei",
		resumo: "O caminho de uma ideia até virar lei.",
		secoes: [
			{ texto: "A abertura, sem intertítulo, fala da iniciativa." },
			{
				id: "quando-o-comeco-e-na-camara",
				titulo: "Quando o começo é na Câmara",
				texto: "Os deputados votam primeiro.",
			},
			{
				id: "a-sancao",
				titulo: "A sanção",
				texto: "Depois, a Presidência pode vetar uma parte do texto da Câmara.",
			},
		],
	});

	it("com a palavra no título, leva ao alto da página", () => {
		const [resultado] = buscar([ARTIGO], "nasce");

		expect(resultado.endereco).toBe(ARTIGO.endereco);
		expect(resultado.secao).toBeUndefined();
	});

	it("com a palavra num intertítulo, leva a ele, e o intertítulo vai junto", () => {
		const [resultado] = buscar([ARTIGO], "camara");

		expect(resultado.endereco).toBe(
			`${ARTIGO.endereco}#quando-o-comeco-e-na-camara`,
		);
		expect(resultado.secao).toBe("Quando o começo é na Câmara");
		expect(trechoEmTexto(resultado)).toBe("Os deputados votam primeiro.");
	});

	it("com a palavra no texto de uma seção, leva ao intertítulo dela", () => {
		const [resultado] = buscar([ARTIGO], "vetar");

		expect(resultado.endereco).toBe(`${ARTIGO.endereco}#a-sancao`);
		expect(resultado.secao).toBe("A sanção");
		expect(trechoEmTexto(resultado)).toContain("pode *vetar* uma parte");
	});

	it("com a palavra no texto antes do primeiro intertítulo, leva ao alto", () => {
		const [resultado] = buscar([ARTIGO], "iniciativa");

		expect(resultado.endereco).toBe(ARTIGO.endereco);
		expect(resultado.secao).toBeUndefined();
	});

	it("com as palavras no título e no texto, leva ao alto e mostra o texto", () => {
		const [resultado] = buscar([ARTIGO], "lei deputados");

		expect(resultado.endereco).toBe(ARTIGO.endereco);
		expect(resultado.secao).toBeUndefined();
		expect(trechoEmTexto(resultado)).toBe("Os *deputados* votam primeiro.");
	});

	it("leva à seção de mais pontos", () => {
		const [resultado] = buscar([ARTIGO], "camara votam");

		expect(resultado.endereco).toBe(
			`${ARTIGO.endereco}#quando-o-comeco-e-na-camara`,
		);
	});

	it("na edição, leva ao item", () => {
		const edicao = documento({
			tipo: "edicao",
			endereco: "/edicoes/7",
			titulo: "Jornal legislativo — 09 a 15/11/2026",
			resumo: "9 a 15 de novembro de 2026",
			secoes: [
				{
					id: "item-1",
					titulo: "Câmara aprova a semana das bibliotecas escolares",
					texto: "O projeto cria uma semana dedicada às bibliotecas.",
				},
				{
					id: "item-3",
					titulo: "Senado vota um requerimento",
					texto: "O Senado votou um pedido sobre a ordem dos trabalhos.",
				},
			],
		});

		expect(enderecos([edicao], "requerimento")).toEqual(["/edicoes/7#item-3"]);
	});
});
