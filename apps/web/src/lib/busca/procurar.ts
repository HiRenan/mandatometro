// A procura da busca do site, no navegador: sem acento, sem maiúscula e pelo
// começo de cada palavra. Não depende do servidor nem do React: o índice chega
// pronto, é preparado uma vez, e cada tecla procura nele. O texto digitado não
// sai daqui.

/** Os tipos de página, na ordem do empate: trilha, artigo e edição. */
export const TIPOS = ["trilha", "artigo", "edicao"] as const;

export type Tipo = (typeof TIPOS)[number];

/** Um pedaço da página: o intertítulo e o texto abaixo dele, até o próximo. */
export type Secao = {
	/** O id do intertítulo na página, para o link. A abertura não tem. */
	id?: string;
	/** O intertítulo, como está na página. */
	titulo?: string;
	/** O texto corrido, sem HTML. */
	texto: string;
};

/** Uma página no índice da busca. */
export type Documento = {
	tipo: Tipo;
	/** O endereço da página, como "/trilhas/constituicao/o-que-e". */
	endereco: string;
	titulo: string;
	/** A descrição da trilha, o resumo do artigo ou o período da edição. */
	resumo: string;
	/**
	 * O trecho quando a palavra só aparece no título, se não for o resumo: na
	 * edição, o período já está na linha do tipo, e o trecho mostra os itens.
	 */
	abertura?: string;
	secoes: Secao[];
};

/** Um pedaço do trecho: a palavra achada vai em negrito. */
export type Pedaco = { texto: string; achado: boolean };

export type Resultado<D extends Documento = Documento> = {
	documento: D;
	/** O link: a página, ou o intertítulo dela (#id). */
	endereco: string;
	/** O intertítulo para onde o link leva, quando leva a um. */
	secao?: string;
	trecho: Pedaco[];
};

/** Os pontos de cada lugar onde a palavra aparece. */
const PESOS = { titulo: 8, intertitulo: 5, resumo: 3, texto: 1 } as const;

/** A palavra inteira vale mais que o começo dela, sem passar de um lugar a outro. */
const INTEIRA = 1.5;

/** O tamanho do trecho, em caracteres, sem as reticências. */
export const TAMANHO_DO_TRECHO = 180;

/** Quanto do trecho vem antes da primeira palavra achada. */
const ANTES_DA_PALAVRA = 50;

/** Saem da busca quando há outra palavra nela. Já sem acento. */
const PALAVRAS_VAZIAS = new Set([
	"a",
	"o",
	"as",
	"os",
	"um",
	"uma",
	"uns",
	"umas",
	"e",
	"de",
	"da",
	"do",
	"das",
	"dos",
	"em",
	"na",
	"no",
	"nas",
	"nos",
	"num",
	"numa",
	"ao",
	"aos",
	"por",
	"pela",
	"pelo",
	"pelas",
	"pelos",
	"para",
	"pra",
	"com",
	"que",
	"se",
	"ou",
]);

/** Uma palavra do texto: onde ela está e a forma sem acento. */
type Palavra = { inicio: number; fim: number; forma: string };

type Campo = { texto: string; palavras: Palavra[] };

type SecaoPreparada = { secao: Secao; intertitulo: Campo; texto: Campo };

export type DocumentoPreparado<D extends Documento = Documento> = {
	documento: D;
	titulo: Campo;
	resumo: Campo;
	secoes: SecaoPreparada[];
};

/** Com as marcas: um texto em NFD guarda o acento junto da letra. */
const PALAVRA_DO_TEXTO = /[\p{L}\p{M}\p{N}]+/gu;

/** "Constituição" vira "constituicao". */
function semAcento(texto: string): string {
	return texto.normalize("NFD").toLowerCase().replace(/\p{M}/gu, "");
}

/**
 * As palavras de um texto, cada uma com o lugar dela no texto original: o
 * negrito do trecho cai na palavra como ela está, com o acento.
 */
function preparar(texto: string): Campo {
	const palavras: Palavra[] = [];
	for (const achado of texto.matchAll(PALAVRA_DO_TEXTO)) {
		const forma = semAcento(achado[0]);
		if (forma) {
			palavras.push({
				inicio: achado.index,
				fim: achado.index + achado[0].length,
				forma,
			});
		}
	}
	return { texto, palavras };
}

/** Prepara o índice uma vez, quando ele chega, para cada tecla procurar rápido. */
export function prepararIndice<D extends Documento>(
	documentos: D[],
): DocumentoPreparado<D>[] {
	return documentos.map((documento) => ({
		documento,
		titulo: preparar(documento.titulo),
		resumo: preparar(documento.resumo),
		secoes: documento.secoes.map((secao) => ({
			secao,
			intertitulo: preparar(secao.titulo ?? ""),
			texto: preparar(secao.texto),
		})),
	}));
}

/**
 * As palavras da busca: sem acento, sem maiúscula e sem repetição. As palavras
 * vazias ("o", "de", "que"…) saem quando há outra; sozinhas, ficam.
 */
export function termosDaBusca(busca: string): string[] {
	const termos = [...new Set(semAcento(busca).match(/[\p{L}\p{N}]+/gu))];
	const cheios = termos.filter((termo) => !PALAVRAS_VAZIAS.has(termo));
	return cheios.length > 0 ? cheios : termos;
}

function acha(palavra: Palavra, termos: string[]): boolean {
	return termos.some((termo) => palavra.forma.startsWith(termo));
}

/** Os pontos de uma palavra da busca num campo: o peso do lugar, ou 0. */
function pontosNoCampo(campo: Campo, termo: string, peso: number): number {
	let pontos = 0;
	for (const palavra of campo.palavras) {
		if (palavra.forma === termo) {
			return peso * INTEIRA;
		}
		if (palavra.forma.startsWith(termo)) {
			pontos = peso;
		}
	}
	return pontos;
}

function pontosNaSecao(secao: SecaoPreparada, termo: string): number {
	return Math.max(
		pontosNoCampo(secao.intertitulo, termo, PESOS.intertitulo),
		pontosNoCampo(secao.texto, termo, PESOS.texto),
	);
}

/**
 * O trecho de um texto: uns 180 caracteres em volta da primeira palavra achada
 * de `centro`, cortados entre palavras, com "…" onde o texto continua, e as
 * palavras de `marcadas` em negrito. Sem palavra achada, o começo do texto.
 */
function recortar(
	{ texto, palavras }: Campo,
	centro: string[],
	marcadas: string[],
): Pedaco[] {
	let inicio = 0;
	let fim = texto.length;
	if (texto.length > TAMANHO_DO_TRECHO) {
		const primeira = palavras.find((palavra) => acha(palavra, centro));
		const desejado = Math.min(
			(primeira?.inicio ?? 0) - ANTES_DA_PALAVRA,
			texto.length - TAMANHO_DO_TRECHO,
		);
		if (desejado > 0) {
			inicio =
				palavras.find((palavra) => palavra.inicio >= desejado)?.inicio ?? 0;
		}
		const limite = inicio + TAMANHO_DO_TRECHO;
		if (limite < texto.length) {
			fim =
				palavras.findLast((palavra) => palavra.fim <= limite)?.fim ?? limite;
		}
	}

	const pedacos: Pedaco[] = [];
	const juntar = (pedaco: string, achado: boolean) => {
		const ultimo = pedacos.at(-1);
		if (ultimo && ultimo.achado === achado) {
			ultimo.texto += pedaco;
		} else {
			pedacos.push({ texto: pedaco, achado });
		}
	};
	if (inicio > 0) {
		juntar("…", false);
	}
	let ponto = inicio;
	for (const palavra of palavras) {
		if (
			palavra.inicio < inicio ||
			palavra.fim > fim ||
			!acha(palavra, marcadas)
		) {
			continue;
		}
		if (palavra.inicio > ponto) {
			juntar(texto.slice(ponto, palavra.inicio), false);
		}
		juntar(texto.slice(palavra.inicio, palavra.fim), true);
		ponto = palavra.fim;
	}
	if (fim > ponto) {
		juntar(texto.slice(ponto, fim), false);
	}
	if (fim < texto.length) {
		juntar("…", false);
	}
	return pedacos;
}

type Achado<D extends Documento> = {
	resultado: Resultado<D>;
	pontos: number;
	posicao: number;
};

function somar(pontos: number[]): number {
	return pontos.reduce((soma, ponto) => soma + ponto, 0);
}

/**
 * Os pontos da página e o resultado, ou nada, se falta alguma palavra. Cada
 * palavra vale o melhor lugar onde aparece. O link vai ao alto com uma palavra
 * no título; senão, à seção de mais pontos. O título já está na tela: o trecho
 * sai do melhor lugar para as palavras que faltam nele e, com todas no título,
 * do melhor lugar fora dele. Sem nenhum, o trecho é o resumo.
 */
function avaliar<D extends Documento>(
	preparado: DocumentoPreparado<D>,
	termos: string[],
	posicao: number,
): Achado<D> | undefined {
	const { documento, titulo, resumo, secoes } = preparado;
	const porTermo = termos.map((termo) => ({
		termo,
		titulo: pontosNoCampo(titulo, termo, PESOS.titulo),
		resumo: pontosNoCampo(resumo, termo, PESOS.resumo),
		secoes: secoes.map((secao) => pontosNaSecao(secao, termo)),
	}));
	let pontos = 0;
	for (const termo of porTermo) {
		const melhor = Math.max(termo.titulo, termo.resumo, ...termo.secoes);
		if (melhor === 0) {
			return undefined;
		}
		pontos += melhor;
	}
	const noTitulo = porTermo.some((termo) => termo.titulo > 0);
	const foraDoTitulo = porTermo.filter((termo) => termo.titulo === 0);
	const doTrecho = foraDoTitulo.length > 0 ? foraDoTitulo : porTermo;
	const centro = doTrecho.map((termo) => termo.termo);
	const pontosDoResumo = somar(doTrecho.map((termo) => termo.resumo));
	const pontosDasSecoes = secoes.map((_, indice) =>
		somar(doTrecho.map((termo) => termo.secoes[indice])),
	);

	// A seção de mais pontos; no empate, a primeira.
	let melhorSecao = -1;
	pontosDasSecoes.forEach((ponto, indice) => {
		if (ponto > (pontosDasSecoes[melhorSecao] ?? 0)) {
			melhorSecao = indice;
		}
	});
	const secao = secoes[melhorSecao];
	const naSecao =
		secao !== undefined && pontosDasSecoes[melhorSecao] > pontosDoResumo;

	let trecho: Pedaco[];
	if (naSecao && secao.texto.texto) {
		trecho = recortar(secao.texto, centro, termos);
	} else if (pontosDoResumo > 0) {
		trecho = recortar(resumo, centro, termos);
	} else if (documento.abertura) {
		trecho = recortar(preparar(documento.abertura), [], []);
	} else {
		trecho = recortar(resumo, [], []);
	}

	const vaiASecao = !noTitulo && naSecao && secao.secao.id !== undefined;
	return {
		resultado: {
			documento,
			endereco: vaiASecao
				? `${documento.endereco}#${secao.secao.id}`
				: documento.endereco,
			...(vaiASecao && { secao: secao.secao.titulo }),
			trecho,
		},
		pontos,
		posicao,
	};
}

/**
 * Procura a busca no índice: as páginas com todas as palavras, da de mais
 * pontos para a de menos. No empate, a trilha, o artigo e a edição, cada um na
 * ordem do índice, que é a do site.
 */
export function procurar<D extends Documento>(
	indice: DocumentoPreparado<D>[],
	busca: string,
): Resultado<D>[] {
	const termos = termosDaBusca(busca);
	if (termos.length === 0) {
		return [];
	}
	const achados: Achado<D>[] = [];
	indice.forEach((preparado, posicao) => {
		const achado = avaliar(preparado, termos, posicao);
		if (achado) {
			achados.push(achado);
		}
	});
	achados.sort(
		(a, b) =>
			b.pontos - a.pontos ||
			TIPOS.indexOf(a.resultado.documento.tipo) -
				TIPOS.indexOf(b.resultado.documento.tipo) ||
			a.posicao - b.posicao,
	);
	return achados.map((achado) => achado.resultado);
}
