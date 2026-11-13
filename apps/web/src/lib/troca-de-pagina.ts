/**
 * A troca de página: a página nova aparece azulejo por azulejo, num giro de
 * relógio em cada peça; quem volta vê o giro ao contrário. As páginas ficam em
 * ordem, como as folhas de um bloco: a inicial em cima, depois a lista das
 * trilhas, cada trilha e os artigos dela, com o quiz no lugar dele entre os
 * artigos. Aqui fica só o sentido de cada troca, que o router passa ao navegador
 * como tipo da View Transition (router.tsx). O movimento fica em
 * estilos/movimento.css.
 */

export type Sentido = "avancar" | "voltar";

/** A trilha da página aberta, com os artigos na ordem dela e o lugar do quiz. */
export type TrilhaAberta = {
	slug: string;
	artigos: ReadonlyArray<{ slug: string }>;
	/** O artigo depois do qual o quiz aparece, quando a trilha tem quiz. */
	quizDepoisDe?: string;
};

/** O fim do endereço do quiz de uma trilha: /trilhas/{trilha}/quiz. */
const QUIZ = "quiz";

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
 * é avançar; o contrário é voltar. O quiz fica entre o artigo depois do qual
 * aparece e o seguinte: do quiz para o "Artigo anterior" é voltar. O botão
 * voltar do navegador segue a mesma regra: o que vale é o lugar da página no
 * bloco, e não a ordem da visita. Sem a ordem da trilha, duas páginas dela
 * contam como avançar.
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
		const doArtigo = (slug: string) =>
			trilhaAberta.artigos.findIndex((artigo) => artigo.slug === slug);
		const posicao = (slug: string) => {
			if (slug !== QUIZ) {
				return doArtigo(slug);
			}
			const antes =
				trilhaAberta.quizDepoisDe === undefined
					? -1
					: doArtigo(trilhaAberta.quizDepoisDe);
			return antes < 0 ? -1 : antes + 0.5;
		};
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
 * cabeçalho está na tela, `moldura-na-tela`, para ele ficar parado enquanto a
 * página troca. Sem página de origem (a primeira carga) ou sem
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
 * A trilha do artigo ou do quiz que está na tela, pelos dados que o router já
 * carregou para a página, para comparar a posição de duas páginas da trilha.
 * Fora de um artigo e do quiz, não há.
 */
export function trilhaDaPaginaAberta(
	matches: ReadonlyArray<{ routeId: string; loaderData?: unknown }>,
): TrilhaAberta | undefined {
	const daPagina = matches.find(
		(match) =>
			match.routeId === "/trilhas/$trilha/$artigo" ||
			match.routeId === "/trilhas/$trilha/quiz",
	);
	// Os dois loaders devolvem a trilha como nas listas (lib/conteudo), com os
	// artigos na ordem e o lugar do quiz.
	return (daPagina?.loaderData as { trilha?: TrilhaAberta } | undefined)
		?.trilha;
}

/** Se o cabeçalho aparece na tela, nem que seja um pedaço. */
export function molduraNaTela(): boolean {
	const moldura = document.querySelector("header.moldura");
	return moldura ? moldura.getBoundingClientRect().bottom > 0 : false;
}
