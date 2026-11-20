import type { Documento } from "./procurar";

// As páginas no índice da busca, com o que a linha do resultado mostra além do
// título e do trecho. O servidor monta o índice (indice.server.ts e
// busca.server.ts), e a caixa da busca (components/busca.tsx) lê.

/** Uma trilha: a posição em Trilhas dá o número e a fita. */
export type TrilhaNaBusca = Documento & { tipo: "trilha"; posicao: number };

/** Um artigo: a posição na trilha dá o número e a fita, e a trilha vai junto. */
export type ArtigoNaBusca = Documento & {
	tipo: "artigo";
	posicao: number;
	/** O título da trilha do artigo. */
	trilha: string;
};

/** Uma edição publicada: o período vai na linha do tipo, e o fim dá a fita da semana. */
export type EdicaoNaBusca = Documento & {
	tipo: "edicao";
	inicio: string;
	fim: string;
};

export type PaginaNaBusca = TrilhaNaBusca | ArtigoNaBusca | EdicaoNaBusca;
