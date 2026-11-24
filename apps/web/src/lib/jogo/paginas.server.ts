import { trilhas } from "../conteudo/paginas.server";
import { type Cena, type Jogo, lerJogos } from "./ler";
import { TRILHA_DO_JOGO } from "./trilha";

// Só o servidor e os testes leem os arquivos do roteiro. O navegador recebe a
// página pronta, pela função de paginas.functions.ts, sem o zod e o js-yaml.

// O Vite junta os arquivos no build; uma cena nova entra sem mexer no código.
// O conferir.ts lê os mesmos arquivos no começo do build: mudou este padrão,
// mude lá e no teste dele também.
const arquivos = import.meta.glob<string>("/conteudo/jogo/*/*.md", {
	query: "?raw",
	import: "default",
	eager: true,
});

/** Os artigos da trilha que as cenas podem apontar, com o título de cada um. */
const daTrilhaDoJogo = trilhas.find((trilha) => trilha.slug === TRILHA_DO_JOGO);

const artigosDaTrilha = new Map(
	(daTrilhaDoJogo?.artigos ?? []).map((artigo) => [artigo.slug, artigo.titulo]),
);

export const jogos: Jogo[] = lerJogos(
	arquivos,
	new Set(artigosDaTrilha.keys()),
);

/** O artigo da trilha que explica a cena, com o título para o link. */
type ArtigoDaCena = { slug: string; titulo: string };

/** A cena na página: o artigo vira slug e título, para a revelação linkar. */
export type CenaNaPagina = Omit<Cena, "artigo"> & { artigo: ArtigoDaCena };

/** O jogo na página, com a trilha de onde ele é a continuação. */
export type JogoNaPagina = Omit<Jogo, "cenas"> & {
	cenas: CenaNaPagina[];
	trilha: { slug: string; titulo: string };
};

/** Um jogo na lista de /jogos: o que a folha mostra, sem o roteiro inteiro. */
export type JogoNaLista = {
	slug: string;
	titulo: string;
	resumo: string;
	/** Quantas cenas o jogo tem. */
	cenas: number;
	/** Quantas decisões a pessoa toma, somando as de regra e as de opinião. */
	decisoes: number;
};

/**
 * Os jogos para a lista de /jogos, na ordem em que o roteiro foi lido, que é a
 * das pastas de conteudo/jogo/: a posição de cada um dá a cor e o azulejo da
 * folha dele.
 */
export function listarJogos(todos: Jogo[]): JogoNaLista[] {
	return todos.map((jogo) => ({
		slug: jogo.slug,
		titulo: jogo.titulo,
		resumo: jogo.resumo,
		cenas: jogo.cenas.length,
		decisoes: jogo.cenas.reduce(
			(soma, cena) =>
				soma + cena.passos.filter((passo) => passo.tipo === "decisao").length,
			0,
		),
	}));
}

/**
 * O jogo pelo nome da pasta, pronto para a página: cada cena com o título do
 * artigo que ela aponta. Sem a trilha do jogo no conteúdo, devolve undefined, e
 * a página não encontrada aparece.
 */
export function acharJogo(
	todos: Jogo[],
	slug: string,
): JogoNaPagina | undefined {
	const jogo = todos.find((um) => um.slug === slug);
	if (!jogo || !daTrilhaDoJogo) {
		return undefined;
	}
	return {
		...jogo,
		trilha: { slug: daTrilhaDoJogo.slug, titulo: daTrilhaDoJogo.titulo },
		cenas: jogo.cenas.map((cena) => ({
			...cena,
			artigo: {
				slug: cena.artigo,
				titulo: artigosDaTrilha.get(cena.artigo) ?? cena.artigo,
			},
		})),
	};
}
