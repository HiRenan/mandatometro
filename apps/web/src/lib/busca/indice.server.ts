import type { Trilha } from "@/lib/conteudo/ler";
import { corpoEmHtml, trilhas } from "@/lib/conteudo/paginas.server";
import type {
	ArtigoNaBusca,
	PaginaNaBusca,
	TrilhaNaBusca,
} from "./paginas-na-busca";
import type { Secao } from "./procurar";

// O índice das trilhas e dos artigos para a busca, do mesmo conteúdo do build. O
// texto do artigo sai do HTML da página dele (corpoEmHtml), dividido pelos
// intertítulos: o id de cada seção é o do <h2> da página, e o link do resultado
// leva até ele. Ficam de fora o quiz, o infográfico e as fontes.

/** O intertítulo do artigo, com o id que o conversor de Markdown dá. */
const INTERTITULO = /<h2(?:\s+id="([^"]*)")?>([\s\S]*?)<\/h2>/;

/** As tags que separam blocos viram espaço; as do meio da frase, como <strong>, somem. */
const BLOCO =
	/<\/?(?:p|li|ul|ol|h[1-6]|blockquote|br|pre|div|table|tr|td|th)\b[^>]*>/gi;

const ENTIDADES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};

function lerEntidades(texto: string): string {
	return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entidade, nome) => {
		if (nome.startsWith("#x") || nome.startsWith("#X")) {
			return String.fromCodePoint(Number.parseInt(nome.slice(2), 16));
		}
		if (nome.startsWith("#")) {
			return String.fromCodePoint(Number(nome.slice(1)));
		}
		return ENTIDADES[nome.toLowerCase()] ?? entidade;
	});
}

/** O texto de um pedaço do HTML: sem as tags, com as entidades lidas e os espaços juntos. */
function textoDoHtml(html: string): string {
	return lerEntidades(html.replace(BLOCO, " ").replace(/<[^>]*>/g, ""))
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * As seções de um artigo, pelo HTML dele: a abertura, antes do primeiro
 * intertítulo, quando há, e uma seção por <h2>, com o id e o texto até o próximo.
 */
export function secoesDoHtml(html: string): Secao[] {
	// Depois da abertura, o split devolve, de cada <h2>, o id, o título e o texto.
	const partes: (string | undefined)[] = html.split(INTERTITULO);
	const secoes: Secao[] = [];
	const abertura = textoDoHtml(partes[0] ?? "");
	if (abertura) {
		secoes.push({ texto: abertura });
	}
	for (let indice = 1; indice < partes.length; indice += 3) {
		const [id, titulo = "", texto = ""] = partes.slice(indice, indice + 3);
		secoes.push({
			...(id && { id: lerEntidades(id) }),
			titulo: textoDoHtml(titulo),
			texto: textoDoHtml(texto),
		});
	}
	return secoes;
}

function montar(todas: Trilha[]): PaginaNaBusca[] {
	const dasTrilhas = todas.map(
		(trilha, indice): TrilhaNaBusca => ({
			tipo: "trilha",
			endereco: `/trilhas/${trilha.slug}`,
			titulo: trilha.titulo,
			resumo: trilha.descricao,
			secoes: [],
			posicao: indice + 1,
		}),
	);
	const artigos = todas.flatMap((trilha) =>
		trilha.artigos.map(
			(artigo, indice): ArtigoNaBusca => ({
				tipo: "artigo",
				endereco: `/trilhas/${trilha.slug}/${artigo.slug}`,
				titulo: artigo.titulo,
				resumo: artigo.resumo,
				secoes: secoesDoHtml(corpoEmHtml(artigo.corpo)),
				posicao: indice + 1,
				trilha: trilha.titulo,
			}),
		),
	);
	return [...dasTrilhas, ...artigos];
}

let indice: PaginaNaBusca[] | undefined;

/**
 * O índice das trilhas e dos artigos, na ordem do site: as trilhas e depois os
 * artigos, trilha por trilha. É montado uma vez por servidor, porque o conteúdo
 * só muda com um build novo.
 */
export function indiceDoConteudo(): PaginaNaBusca[] {
	indice ??= montar(trilhas);
	return indice;
}
