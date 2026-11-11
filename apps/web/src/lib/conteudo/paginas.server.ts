import { compiler } from "markdown-to-jsx/html";
import { trilhaDaInicial } from "./inicial";
import {
	type Artigo,
	type Infografico,
	lerTrilhas,
	type Passo,
	type Trilha,
} from "./ler";

// Só o servidor e os testes leem os arquivos. O navegador recebe a página
// pronta, pelas funções de paginas.functions.ts, sem o zod, o js-yaml e o
// markdown-to-jsx.

// O Vite junta os arquivos no build; um arquivo novo entra sem mexer no código.
// O conferir.ts lê os mesmos arquivos no começo do build: mudou este padrão,
// mude lá e no teste dele também.
const arquivos = import.meta.glob<string>("/conteudo/trilhas/*/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
});

export const trilhas: Trilha[] = lerTrilhas(arquivos);

/** O artigo nas listas e nos links: tudo, menos o texto. */
export type ArtigoNaLista = Omit<Artigo, "corpo">;

/** A trilha nas listas e no artigo: sem o texto dos artigos e sem o infográfico. */
export type TrilhaNaLista = Omit<Trilha, "artigos" | "infografico"> & {
	artigos: ArtigoNaLista[];
};

/** A trilha na página dela, com o infográfico, quando ela tem um. */
export type TrilhaNaPagina = TrilhaNaLista & { infografico?: Infografico };

/**
 * O caminho na página inicial: o título, o resumo e, de cada passo, o título e
 * os artigos que o explicam. O texto, os desvios e as fontes ficam na trilha.
 */
export type CaminhoNaInicial = Pick<Infografico, "titulo" | "resumo"> & {
	passos: Pick<Passo, "titulo" | "artigos">[];
};

/**
 * A página inicial: a trilha do processo legislativo, como nas listas, e o
 * caminho dela.
 */
export type PaginaInicial = {
	trilha: TrilhaNaLista;
	caminho?: CaminhoNaInicial;
};

export type ArtigoNaTrilha = {
	trilha: TrilhaNaLista;
	/** O texto vem em HTML, convertido do Markdown no servidor. */
	artigo: ArtigoNaLista & { html: string };
	/** A posição do artigo na trilha, a partir de 1. */
	posicao: number;
	anterior?: ArtigoNaLista;
	proximo?: ArtigoNaLista;
};

const opcoesDoMarkdown = {
	// O conteúdo vem do repositório, mas HTML solto no Markdown não vira HTML na página.
	disableParsingRawHTML: true,
	forceBlock: true,
	wrapper: null,
};

/** O texto do artigo, de Markdown para HTML. */
export function corpoEmHtml(corpo: string): string {
	return compiler(corpo, opcoesDoMarkdown);
}

function naLista({
	trilha,
	slug,
	titulo,
	resumo,
	ordem,
	fontes,
	minutos,
}: Artigo): ArtigoNaLista {
	return { trilha, slug, titulo, resumo, ordem, fontes, minutos };
}

function trilhaNaLista({
	slug,
	titulo,
	descricao,
	ordem,
	artigos,
}: Trilha): TrilhaNaLista {
	return { slug, titulo, descricao, ordem, artigos: artigos.map(naLista) };
}

export function listarTrilhas(todas: Trilha[]): TrilhaNaLista[] {
	return todas.map(trilhaNaLista);
}

export function inicio(todas: Trilha[]): PaginaInicial | undefined {
	const trilha = trilhaDaInicial(todas);
	if (!trilha) {
		return undefined;
	}
	const { infografico } = trilha;
	return {
		trilha: trilhaNaLista(trilha),
		...(infografico && {
			caminho: {
				titulo: infografico.titulo,
				resumo: infografico.resumo,
				passos: infografico.passos.map(({ titulo, artigos }) => ({
					titulo,
					artigos,
				})),
			},
		}),
	};
}

export function acharTrilha(
	todas: Trilha[],
	slug: string,
): TrilhaNaPagina | undefined {
	const trilha = todas.find((trilha) => trilha.slug === slug);
	if (!trilha) {
		return undefined;
	}
	const { infografico } = trilha;
	return { ...trilhaNaLista(trilha), ...(infografico && { infografico }) };
}

export function acharArtigo(
	todas: Trilha[],
	trilhaSlug: string,
	artigoSlug: string,
): ArtigoNaTrilha | undefined {
	const trilha = todas.find((trilha) => trilha.slug === trilhaSlug);
	const indice =
		trilha?.artigos.findIndex((artigo) => artigo.slug === artigoSlug) ?? -1;
	if (!trilha || indice === -1) {
		return undefined;
	}
	const artigo = trilha.artigos[indice];
	const anterior = trilha.artigos[indice - 1];
	const proximo = trilha.artigos[indice + 1];
	return {
		trilha: trilhaNaLista(trilha),
		artigo: { ...naLista(artigo), html: corpoEmHtml(artigo.corpo) },
		posicao: indice + 1,
		anterior: anterior && naLista(anterior),
		proximo: proximo && naLista(proximo),
	};
}
