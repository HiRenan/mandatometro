import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	type EstiloDeTitulo,
	LARGURAS_DAS_LETRAS,
	PARES_MAIS_LARGOS,
} from "./larguras-das-letras";
import { trilhas } from "./paginas.server";

// Com a letra do navegador grande, cada título com teto (o letra-com-teto do
// index.css) diminui até a palavra mais larga dele caber na tela do celular: o
// --palavra é a largura dessa palavra, em em. Uma palavra mais larga que o --palavra
// não cabe nem no teto e se parte no meio. Este teste mede as palavras dos títulos
// do conteúdo e avisa quem escreve: o que fazer está em docs/conteudo-das-trilhas.md.

/** Um arquivo do código do site, a partir de src/. */
const codigo = (arquivo: string) =>
	readFileSync(new URL(`../../${arquivo}`, import.meta.url), "utf8");

const paginaDaTrilha = codigo("routes/trilhas/$trilha/index.tsx");
const listaDasTrilhas = codigo("routes/trilhas/index.tsx");
const paginaDoArtigo = codigo("routes/trilhas/$trilha/$artigo.tsx");
const css = codigo("index.css");

/**
 * A folga do teto: a palavra mais larga, mais 0,5%, cabe no --palavra. É a folga
 * do nome do site (nome-do-site.ts), para o arredondamento do navegador não partir
 * a palavra.
 */
const FOLGA = 1.005;

/**
 * A largura de uma palavra, em em, pela soma das letras, mais o que cada par de letras
 * vizinhas passa da soma das duas no navegador (o kerning que afasta, como em "4–").
 */
function largura(palavra: string, estilo: EstiloDeTitulo): number {
	const letras: Record<string, number> = LARGURAS_DAS_LETRAS[estilo];
	const pares: Record<string, number> = PARES_MAIS_LARGOS[estilo];
	const maisLarga = Math.max(...Object.values(letras));
	let soma = 0;
	let anterior = "";
	for (const letra of palavra.normalize("NFC")) {
		soma += (letras[letra] ?? maisLarga) + (pares[anterior + letra] ?? 0);
		anterior = letra;
	}
	return soma;
}

/** As palavras de um título, como a linha quebra: no espaço e depois do hífen. */
function palavras(titulo: string): string[] {
	return titulo.match(/[^\s‐‑-]+[‐‑-]?/g) ?? [];
}

/** O --palavra de um título, lido da linha do código com as classes dele. */
function tetoNoCodigo(
	codigo: string,
	arquivo: string,
	classes: string[],
): number {
	const linha = codigo
		.split("\n")
		.find((l) => classes.every((c) => l.split(/[\s"'`]+/).includes(c)));
	const numero = linha && /\[--palavra:([\d.]+)\]/.exec(linha)?.[1];
	if (!numero) {
		throw new Error(
			`não achei o [--palavra:…] do título com ${classes.join(" ")} em ${arquivo}`,
		);
	}
	return Number(numero);
}

/** O --palavra do intertítulo, no bloco do .texto h2 do index.css. */
function tetoDoIntertitulo(): number {
	const numero = /\.texto h2 \{[^}]*--palavra:\s*([\d.]+)/.exec(css)?.[1];
	if (!numero) {
		throw new Error("não achei o --palavra do .texto h2 em src/index.css");
	}
	return Number(numero);
}

type Teto = { lugar: string; estilo: EstiloDeTitulo; palavra: number };

const TETOS = {
	trilha: {
		lugar: "no título da trilha",
		estilo: "titulo-condensado",
		palavra: tetoNoCodigo(paginaDaTrilha, "routes/trilhas/$trilha/index.tsx", [
			"titulo-condensado",
			"letra-com-teto",
		]),
	},
	trilhaNaLista: {
		lugar: "no título da trilha, em /trilhas",
		estilo: "subtitulo-condensado",
		palavra: tetoNoCodigo(listaDasTrilhas, "routes/trilhas/index.tsx", [
			"subtitulo-condensado",
			"letra-com-teto",
		]),
	},
	artigo: {
		lugar: "no título do artigo",
		estilo: "titulo-condensado",
		palavra: tetoNoCodigo(
			paginaDoArtigo,
			"routes/trilhas/$trilha/$artigo.tsx",
			["titulo-condensado", "letra-com-teto"],
		),
	},
	folha: {
		lugar: "no título da folha, na página da trilha",
		estilo: "subtitulo-condensado",
		palavra: tetoNoCodigo(paginaDaTrilha, "routes/trilhas/$trilha/index.tsx", [
			"subtitulo-condensado",
			"letra-com-teto",
		]),
	},
	intertitulo: {
		lugar: "no intertítulo (##)",
		estilo: "subtitulo-condensado",
		palavra: tetoDoIntertitulo(),
	},
} satisfies Record<string, Teto>;

const emEm = (n: number) => n.toFixed(2).replace(".", ",");

/** As palavras de um texto que, com a folga, passam de um dos tetos. */
function largasDe(arquivo: string, texto: string, tetos: Teto[]): string[] {
	const largas: string[] = [];
	for (const palavra of palavras(texto)) {
		for (const teto of tetos) {
			const precisa = largura(palavra, teto.estilo) * FOLGA;
			if (precisa > teto.palavra) {
				largas.push(
					`${arquivo}: "${palavra}" precisa de ${emEm(precisa)} em ${teto.lugar}, e o teto é ${emEm(teto.palavra)} em`,
				);
			}
		}
	}
	return largas;
}

describe("a régua das letras", () => {
	it("bate com a largura medida no navegador", () => {
		// Medidas na página, no Edge: "fundamentais?" no título do artigo e no da folha.
		expect(largura("fundamentais?", "titulo-condensado")).toBeCloseTo(5.636, 2);
		expect(largura("fundamentais?", "subtitulo-condensado")).toBeCloseTo(
			5.93,
			2,
		);
	});

	it("conta o par que o navegador alarga", () => {
		// Medidas no Edge, como as letras da tabela: o algarismo junto de um traço fica
		// 0,04 em mais largo que a soma das duas letras.
		expect(largura("4–", "titulo-condensado")).toBeCloseTo(0.843, 3);
		expect(largura("1-", "subtitulo-condensado")).toBeCloseTo(0.7641, 3);
	});

	it("mede igual a letra com o acento junto ou separado", () => {
		const junto = "Constituição".normalize("NFC");
		const separado = "Constituição".normalize("NFD");
		expect(largura(separado, "titulo-condensado")).toBe(
			largura(junto, "titulo-condensado"),
		);
	});

	it("conta a letra fora da tabela como a mais larga", () => {
		const maisLarga = Math.max(
			...Object.values(LARGURAS_DAS_LETRAS["titulo-condensado"]),
		);
		expect(largura("☃", "titulo-condensado")).toBe(maisLarga);
	});

	it("separa as palavras no espaço e depois do hífen", () => {
		expect(palavras("Procuradoria-Geral da República?")).toEqual([
			"Procuradoria-",
			"Geral",
			"da",
			"República?",
		]);
	});
});

describe("as palavras dos títulos", () => {
	it("cabem no teto da letra grande", () => {
		const largas: string[] = [];
		for (const trilha of trilhas) {
			const pasta = `conteudo/trilhas/${trilha.slug}`;
			largas.push(
				...largasDe(`${pasta}/trilha.md`, trilha.titulo, [
					TETOS.trilha,
					TETOS.trilhaNaLista,
				]),
			);
			for (const artigo of trilha.artigos) {
				const arquivo = `${pasta}/${artigo.slug}.md`;
				largas.push(
					...largasDe(arquivo, artigo.titulo, [TETOS.artigo, TETOS.folha]),
				);
				for (const [, intertitulo] of artigo.corpo.matchAll(/^##\s+(.+)$/gm)) {
					largas.push(...largasDe(arquivo, intertitulo, [TETOS.intertitulo]));
				}
			}
		}
		expect(
			largas,
			"Troque a palavra por uma mais curta, ou meça o teto de novo: veja docs/conteudo-das-trilhas.md",
		).toEqual([]);
	});
});
