import { compiler } from "markdown-to-jsx/html";
import { trilhaDaInicial } from "./inicial";
import {
	type Artigo,
	type Infografico,
	lerTrilhas,
	type Pergunta,
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

/**
 * A trilha nas listas e no artigo: sem o texto dos artigos, o infográfico e o
 * quiz.
 */
export type TrilhaNaLista = Omit<Trilha, "artigos" | "infografico" | "quiz"> & {
	artigos: ArtigoNaLista[];
};

/**
 * A chamada para o quiz, no fim do artigo depois do qual ele aparece e na
 * página da trilha: quantas perguntas ele tem e de quais artigos.
 */
export type ChamadaDoQuiz = {
	perguntas: number;
	/** As posições dos artigos das perguntas na trilha, da menor para a maior. */
	artigos: number[];
};

/** A trilha na página dela, com o infográfico e a chamada do quiz, quando ela tem. */
export type TrilhaNaPagina = TrilhaNaLista & {
	infografico?: Infografico;
	quiz?: ChamadaDoQuiz;
};

/** Uma pergunta na página do quiz. As opções são só os textos, e a certa, a posição. */
export type PerguntaNaPagina = Omit<Pergunta, "artigo" | "opcoes"> & {
	/** O artigo de onde sai a resposta, para a pessoa rever. */
	artigo: { slug: string; titulo: string; posicao: number };
	opcoes: string[];
	certa: number;
};

/**
 * A página do quiz. A resposta certa vai junto, porque ela aparece no HTML do
 * servidor: sem JavaScript, a pessoa abre a resposta de cada pergunta.
 */
export type QuizNaPagina = {
	trilha: TrilhaNaLista;
	/** O artigo depois do qual o quiz aparece. */
	anterior: ArtigoNaLista;
	/** O artigo que vem depois dele na trilha, quando há. */
	proximo?: ArtigoNaLista;
	perguntas: PerguntaNaPagina[];
};

/**
 * O caminho na página inicial: o infográfico da trilha inteiro. O passo a passo
 * da página mostra, de cada passo, o texto, os desvios, as fontes e os artigos
 * que o explicam.
 */
export type CaminhoNaInicial = Infografico;

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
	/** A chamada do quiz, só no artigo depois do qual ele aparece. */
	quiz?: ChamadaDoQuiz;
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
		...(infografico && { caminho: infografico }),
	};
}

/** A posição do artigo na trilha, a partir de 1. */
function posicaoNaTrilha(trilha: Trilha, slug: string): number {
	return trilha.artigos.findIndex((artigo) => artigo.slug === slug) + 1;
}

/** A chamada do quiz da trilha, quando ela tem um. */
function chamadaDoQuiz(trilha: Trilha): ChamadaDoQuiz | undefined {
	const { quiz } = trilha;
	if (!quiz) {
		return undefined;
	}
	const posicoes = quiz.perguntas.map((pergunta) =>
		posicaoNaTrilha(trilha, pergunta.artigo),
	);
	return {
		perguntas: quiz.perguntas.length,
		artigos: [...new Set(posicoes)].sort((a, b) => a - b),
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
	const quiz = chamadaDoQuiz(trilha);
	return {
		...trilhaNaLista(trilha),
		...(infografico && { infografico }),
		...(quiz && { quiz }),
	};
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
	const quiz =
		trilha.quiz?.depoisDe === artigo.slug ? chamadaDoQuiz(trilha) : undefined;
	return {
		trilha: trilhaNaLista(trilha),
		artigo: { ...naLista(artigo), html: corpoEmHtml(artigo.corpo) },
		posicao: indice + 1,
		anterior: anterior && naLista(anterior),
		proximo: proximo && naLista(proximo),
		...(quiz && { quiz }),
	};
}

export function acharQuiz(
	todas: Trilha[],
	slug: string,
): QuizNaPagina | undefined {
	const trilha = todas.find((trilha) => trilha.slug === slug);
	if (!trilha?.quiz) {
		return undefined;
	}
	// O leitor (ler.ts) já conferiu que o depoisDe e o artigo de cada pergunta
	// existem na trilha.
	const depoisDe = posicaoNaTrilha(trilha, trilha.quiz.depoisDe);
	const proximo = trilha.artigos[depoisDe];
	return {
		trilha: trilhaNaLista(trilha),
		anterior: naLista(trilha.artigos[depoisDe - 1]),
		...(proximo && { proximo: naLista(proximo) }),
		perguntas: trilha.quiz.perguntas.map(({ artigo, opcoes, ...pergunta }) => {
			const posicao = posicaoNaTrilha(trilha, artigo);
			return {
				...pergunta,
				artigo: {
					slug: artigo,
					titulo: trilha.artigos[posicao - 1].titulo,
					posicao,
				},
				opcoes: opcoes.map((opcao) => opcao.texto),
				certa: opcoes.findIndex((opcao) => opcao.certa),
			};
		}),
	};
}
