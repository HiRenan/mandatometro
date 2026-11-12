/**
 * A troca de página, como na folhinha de parede: quem avança arranca a folha da
 * tela, e a página nova já está embaixo; quem volta põe a folha de volta no
 * bloco. Aqui fica só o sentido de cada troca, que o router passa ao navegador
 * como tipo da View Transition (router.tsx). O movimento fica no index.css.
 */

export type Sentido = "avancar" | "voltar";

/** A trilha do artigo aberto, com os artigos na ordem dela. */
export type TrilhaAberta = {
	slug: string;
	artigos: ReadonlyArray<{ slug: string }>;
};

/** O que o router diz de cada troca (o `locationChangeInfo` do TanStack Router). */
export type Troca = {
	fromLocation?: { pathname: string };
	toLocation: { pathname: string };
	pathChanged: boolean;
};

type Lugar = { fundura: number; trilha?: string; artigo?: string };

/**
 * Onde a página fica no bloco: a inicial em cima, depois a lista das trilhas,
 * cada trilha e os artigos dela. Um endereço que não é de nenhuma, como o da
 * página não encontrada, fica no fundo.
 */
function lugarNoBloco(caminho: string): Lugar {
	const partes = caminho.split("/").filter(Boolean);
	if (partes.length === 0) {
		return { fundura: 0 };
	}
	if (partes[0] !== "trilhas" || partes.length > 3) {
		return { fundura: 4 };
	}
	return { fundura: partes.length, trilha: partes[1], artigo: partes[2] };
}

/**
 * Ir mais para dentro do bloco, ou para um artigo mais adiante na mesma trilha,
 * é avançar; o contrário é voltar. O botão voltar do navegador segue a mesma
 * regra: o que vale é o lugar da página no bloco, e não a ordem da visita. Sem
 * a ordem da trilha, dois artigos contam como avançar.
 */
export function sentidoDaTroca(
	de: string,
	para: string,
	trilhaAberta?: TrilhaAberta,
): Sentido {
	const origem = lugarNoBloco(de);
	const destino = lugarNoBloco(para);
	if (origem.fundura !== destino.fundura) {
		return destino.fundura < origem.fundura ? "voltar" : "avancar";
	}
	if (
		origem.artigo &&
		destino.artigo &&
		trilhaAberta &&
		origem.trilha === trilhaAberta.slug &&
		destino.trilha === trilhaAberta.slug
	) {
		const posicao = (slug: string) =>
			trilhaAberta.artigos.findIndex((artigo) => artigo.slug === slug);
		const daOrigem = posicao(origem.artigo);
		const doDestino = posicao(destino.artigo);
		if (daOrigem >= 0 && doDestino >= 0 && doDestino < daOrigem) {
			return "voltar";
		}
	}
	return "avancar";
}

/**
 * Os tipos da View Transition de uma troca: `folha`, o sentido e, quando o
 * cartão preto do cabeçalho está na tela, `moldura-na-tela`, para ele ficar
 * parado enquanto a folha sai. Sem página de origem (a primeira carga) ou sem
 * mudar de página (um link para um trecho da mesma página, como #caminho), não
 * há troca de folha, e o `false` diz ao router para não animar.
 */
export function tiposDaTroca(
	troca: Troca,
	{
		trilhaAberta,
		molduraNaTela,
	}: { trilhaAberta?: TrilhaAberta; molduraNaTela: boolean },
): string[] | false {
	if (!troca.fromLocation || !troca.pathChanged) {
		return false;
	}
	const tipos = [
		"folha",
		sentidoDaTroca(
			troca.fromLocation.pathname,
			troca.toLocation.pathname,
			trilhaAberta,
		),
	];
	if (molduraNaTela) {
		tipos.push("moldura-na-tela");
	}
	return tipos;
}

/**
 * A trilha do artigo que está na tela, pelos dados que o router já carregou para
 * ele, para comparar a posição de dois artigos. Fora de um artigo, não há.
 */
export function trilhaDoArtigoAberto(
	matches: ReadonlyArray<{ routeId: string; loaderData?: unknown }>,
): TrilhaAberta | undefined {
	const doArtigo = matches.find(
		(match) => match.routeId === "/trilhas/$trilha/$artigo",
	);
	// O loader do artigo devolve um ArtigoNaTrilha (lib/conteudo), com a trilha.
	return (doArtigo?.loaderData as { trilha?: TrilhaAberta } | undefined)
		?.trilha;
}

/** Se o cartão preto do cabeçalho aparece na tela, nem que seja um pedaço. */
export function molduraNaTela(): boolean {
	const moldura = document.querySelector("header.moldura");
	return moldura ? moldura.getBoundingClientRect().bottom > 0 : false;
}
