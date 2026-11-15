import { FITAS, type Fita } from "./formatar";

/**
 * Os azulejos do site (DESIGN.md): cada peça tem um fundo, um motivo desenhado
 * por cima e uma volta, de 0 a 3 quartos. Aqui fica só o desenho de cada peça,
 * em dados: quem pinta é o CSS (estilos/azulejos.css), com gradientes, sem
 * imagem. O sorteio tem semente, e o servidor e o navegador desenham o mesmo
 * painel.
 *
 * As regras das cores: cada azulejo leva uma cor de fita só, com tinta ou papel,
 * e as cinco fitas aparecem juntas em todo painel. Nenhuma cor é de partido,
 * de assunto ou de humor: quem escolhe é o sorteio ou a posição.
 */

/** As cores de uma peça: o papel e os dois tons dele, a tinta e as cinco fitas. */
export type Cor = "papel" | "papel-2" | "papel-3" | "tinta" | Fita;

export type Peca = {
	/** O motivo, de 1 a 10 (o 8 é a peça lisa, só com o fundo). */
	motivo: number;
	/** Quantos quartos de volta o motivo dá, de 0 a 3. */
	volta: number;
	fundo: Cor;
	desenho: Cor;
};

/** A cor de uma peça no CSS: a variável do globals.css. */
export function corNoCss(cor: Cor): string {
	return (FITAS as readonly string[]).includes(cor)
		? `var(--fita-${cor})`
		: `var(--${cor})`;
}

/** A fita de uma peça, quando ela tem cor. A peça de papel e tinta não tem. */
export function fitaDaPeca({ fundo, desenho }: Peca): Fita | undefined {
	return FITAS.find((fita) => fita === fundo || fita === desenho);
}

/**
 * Os pares de fundo e desenho. Poucos ficam quietos, papel sobre papel, para o
 * painel respirar; os outros levam uma fita, e cada fita tem os seus.
 */
export const PARES: ReadonlyArray<readonly [Cor, Cor]> = [
	["papel-2", "papel-3"],
	["papel-2", "papel-3"],
	["papel-3", "papel-2"],
	["papel-2", "tinta"],
	["tinta", "papel"],
	["verde", "tinta"],
	["verde", "papel"],
	["papel-2", "verde"],
	["amarela", "tinta"],
	["amarela", "tinta"],
	["papel-2", "amarela"],
	["tinta", "amarela"],
	["azul", "papel"],
	["azul", "tinta"],
	["papel-2", "azul"],
	["rosa", "tinta"],
	["rosa", "papel"],
	["papel-2", "rosa"],
	["tinta", "rosa"],
	["vermelha", "papel"],
	["vermelha", "tinta"],
	["papel-2", "vermelha"],
];

/** Os pares de cada fita, para trocar o desenho de uma peça sem trocar a cor. */
export function paresDaFita(fita: Fita): ReadonlyArray<readonly [Cor, Cor]> {
	return PARES.filter(([fundo, desenho]) => fundo === fita || desenho === fita);
}

/** Os motivos, com os mais calmos repetidos: eles saem mais vezes no sorteio. */
export const MOTIVOS: readonly number[] = [
	1, 1, 1, 2, 2, 3, 3, 4, 5, 6, 6, 7, 7, 8, 9, 10,
];

/** Um sorteio com semente (mulberry32): a mesma semente dá sempre os mesmos números. */
export function sorteio(semente: number): () => number {
	let a = semente;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A semente de um texto, como o endereço da trilha: cada trilha tem o seu painel. */
export function sementeDe(texto: string): number {
	let semente = 2166136261;
	for (const letra of texto) {
		semente = Math.imul(semente ^ (letra.codePointAt(0) ?? 0), 16777619);
	}
	return semente >>> 0;
}

function sortear<T>(lista: readonly T[], sorte: () => number): T {
	return lista[Math.floor(sorte() * lista.length)];
}

/** Uma peça sorteada. Com `fita`, a peça fica com a cor dela e muda só o desenho. */
export function pecaSorteada(sorte: () => number, fita?: Fita): Peca {
	const motivo = sortear(MOTIVOS, sorte);
	const [fundo, desenho] = sortear(fita ? paresDaFita(fita) : PARES, sorte);
	return { motivo, volta: Math.floor(sorte() * 4), fundo, desenho };
}

/**
 * As peças de um painel, na ordem da leitura. As primeiras (`juntas`) têm as
 * cinco fitas: é o que aparece na faixa do celular, que mostra só o começo do
 * painel. Quando o sorteio deixa uma fita de fora, ela entra no lugar de uma
 * peça quieta ou de uma cor repetida, pelo mesmo sorteio.
 */
export function painel(semente: number, quantas: number, juntas = 12): Peca[] {
	const sorte = sorteio(semente);
	const pecas = Array.from({ length: quantas }, () => pecaSorteada(sorte));
	const comeco = pecas.slice(0, Math.min(juntas, quantas));
	if (comeco.length >= FITAS.length) {
		for (const fita of FITAS) {
			if (comeco.some((peca) => fitaDaPeca(peca) === fita)) {
				continue;
			}
			// O lugar da fita que faltou: uma peça sem cor, ou de uma cor que sobra.
			const quantasDe = (outra: Fita | undefined) =>
				comeco.filter((peca) => fitaDaPeca(peca) === outra).length;
			const livres = comeco.flatMap((peca, indice) => {
				const dela = fitaDaPeca(peca);
				return dela === undefined || quantasDe(dela) > 1 ? [indice] : [];
			});
			const lugar = sortear(livres, sorte);
			const nova = pecaSorteada(sorte, fita);
			pecas[lugar] = nova;
			comeco[lugar] = nova;
		}
	}
	return pecas;
}

/**
 * Os desenhos do azulejo grande, de quatro peças (o motivo e a volta de cada
 * uma): o ponto de partida, o grupo, a tigela, a cúpula e os dois lados. As
 * duas últimas lembram as cúpulas do Congresso e as duas Casas.
 */
export const DESENHOS: ReadonlyArray<
	ReadonlyArray<readonly [motivo: number, volta: number]>
> = [
	[
		[1, 2],
		[1, 3],
		[1, 1],
		[1, 0],
	],
	[
		[4, 0],
		[4, 0],
		[4, 0],
		[4, 0],
	],
	[
		[9, 0],
		[9, 0],
		[1, 1],
		[1, 0],
	],
	[
		[1, 2],
		[1, 3],
		[5, 1],
		[5, 1],
	],
	[
		[3, 0],
		[3, 1],
		[3, 3],
		[3, 2],
	],
];

/**
 * As cores do azulejo grande, pela posição: as cinco fitas na ordem e, na sexta,
 * a tinta. O desenho por cima é tinta ou papel, o que tiver mais contraste.
 */
const CORES_DOS_GRANDES: ReadonlyArray<readonly [Cor, Cor]> = [
	["verde", "tinta"],
	["amarela", "tinta"],
	["azul", "papel"],
	["rosa", "tinta"],
	["vermelha", "papel"],
	["tinta", "papel"],
];

/**
 * As quatro peças de um azulejo grande. O `desenho` e a `cor` são posições e
 * dão a volta: o sexto desenho é o primeiro de novo, e a sétima cor, a primeira.
 */
export function azulejoGrande(desenho: number, cor: number): Peca[] {
	const [fundo, tinta] = CORES_DOS_GRANDES[cor % CORES_DOS_GRANDES.length];
	return DESENHOS[desenho % DESENHOS.length].map(([motivo, volta]) => ({
		motivo,
		volta,
		fundo,
		desenho: tinta,
	}));
}

/**
 * O azulejo grande de uma posição, a partir de 1: o do artigo na trilha e o da
 * trilha na lista. A cor é a fita da posição, e os desenhos se alternam para
 * dois vizinhos não ficarem iguais.
 */
export function azulejoDaPosicao(posicao: number): Peca[] {
	const DESENHO_DA_POSICAO = [0, 4, 1, 3, 2];
	const indice = posicao - 1;
	return azulejoGrande(
		DESENHO_DA_POSICAO[indice % DESENHO_DA_POSICAO.length],
		indice % FITAS.length,
	);
}
