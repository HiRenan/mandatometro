import { compiler } from "markdown-to-jsx/html";
import { type Artigo, lerTrilhas, type Trilha } from "./ler";

// Só o servidor e os testes leem os arquivos. O navegador recebe a página
// pronta, pelas funções de paginas.functions.ts, sem o zod, o js-yaml e o
// markdown-to-jsx.

// O Vite junta os arquivos no build; um arquivo novo entra sem mexer no código.
const arquivos = import.meta.glob<string>("/conteudo/trilhas/*/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
});

export const trilhas: Trilha[] = lerTrilhas(arquivos);

/** O artigo nas listas e nos links: tudo, menos o texto. */
export type ArtigoNaLista = Omit<Artigo, "corpo">;

export type TrilhaNaLista = Omit<Trilha, "artigos"> & {
	artigos: ArtigoNaLista[];
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

function trilhaNaLista(trilha: Trilha): TrilhaNaLista {
	return { ...trilha, artigos: trilha.artigos.map(naLista) };
}

export function listarTrilhas(todas: Trilha[]): TrilhaNaLista[] {
	return todas.map(trilhaNaLista);
}

export function acharTrilha(
	todas: Trilha[],
	slug: string,
): TrilhaNaLista | undefined {
	const trilha = todas.find((trilha) => trilha.slug === slug);
	return trilha && trilhaNaLista(trilha);
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
