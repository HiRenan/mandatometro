import { type Artigo, lerTrilhas, type Trilha } from "./ler";

export type { Artigo, Fonte, Trilha } from "./ler";

// O Vite junta os arquivos no build; um arquivo novo entra sem mexer no código.
const arquivos = import.meta.glob<string>("/conteudo/trilhas/*/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
});

export const trilhas: Trilha[] = lerTrilhas(arquivos);

export function buscarTrilha(slug: string): Trilha | undefined {
	return trilhas.find((trilha) => trilha.slug === slug);
}

export type ArtigoNaTrilha = {
	trilha: Trilha;
	artigo: Artigo;
	/** A posição do artigo na trilha, a partir de 1. */
	posicao: number;
	anterior?: Artigo;
	proximo?: Artigo;
};

export function buscarArtigo(
	trilhaSlug: string,
	artigoSlug: string,
): ArtigoNaTrilha | undefined {
	const trilha = buscarTrilha(trilhaSlug);
	const indice =
		trilha?.artigos.findIndex((artigo) => artigo.slug === artigoSlug) ?? -1;
	if (!trilha || indice === -1) {
		return undefined;
	}
	return {
		trilha,
		artigo: trilha.artigos[indice],
		posicao: indice + 1,
		anterior: trilha.artigos[indice - 1],
		proximo: trilha.artigos[indice + 1],
	};
}
