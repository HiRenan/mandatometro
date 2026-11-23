import { idDoPasso } from "./formatar";

/**
 * Os símbolos dos azulejos grandes (DESIGN.md): o desenho que diz o assunto de
 * cada trilha, na lista das trilhas, e de cada passo do caminho, na trilha e na
 * página inicial. São prédios e objetos das instituições, sem partido e sem
 * pessoa, escritos aqui em SVG, numa caixa de 100 por 100, sem arquivo de
 * imagem. O azulejo grande divide o desenho nas quatro peças
 * (components/azulejo.tsx), e a cor continua sendo a da posição.
 */

/** Uma parte do desenho: um caminho do SVG. */
export type Parte = {
	/** O caminho, na caixa de 100 por 100. */
	d: string;
	/** Os contornos de dentro viram buracos: as linhas da folha, a etiqueta do livro. */
	vazada?: true;
	/** A parte que é linha, e não área, com a grossura do traço: a seta das duas casas. */
	traco?: number;
	/** O giro da parte em volta do meio da caixa, em graus: a caneta deitada. */
	giro?: number;
};

/** Um retângulo pela ponta de cima à esquerda, a largura e a altura. */
function retangulo(x: number, y: number, largura: number, altura: number) {
	return `M${x} ${y}h${largura}v${altura}h${-largura}z`;
}

/**
 * Um círculo pelo centro e o raio. Ele corre no sentido contrário ao do
 * retângulo: um sobre o outro, no mesmo caminho, os dois fazem um buraco. Por
 * isso, as partes que se cruzam ficam em caminhos separados.
 */
function circulo(x: number, y: number, raio: number) {
	return `M${(x - raio).toFixed(1)} ${y.toFixed(1)}a${raio} ${raio} 0 1 0 ${2 * raio} 0a${raio} ${raio} 0 1 0 ${-2 * raio} 0z`;
}

/** Um polígono pelos pontos, com o x e o y de cada um, em fila. */
function poligono(...pontos: number[]) {
	let caminho = "";
	for (let i = 0; i < pontos.length; i += 2) {
		caminho += `${i === 0 ? "M" : "L"}${pontos[i]} ${pontos[i + 1]}`;
	}
	return `${caminho}z`;
}

const cheia = (d: string): Parte => ({ d });
const vazada = (d: string): Parte => ({ d, vazada: true });
const linha = (d: string, traco: number): Parte => ({ d, traco });
const girada = (giro: number, parte: Parte): Parte => ({ ...parte, giro });

/** As cadeiras do plenário: duas fileiras em meia-lua, de frente para a mesa. */
const CADEIRAS = [
	[20, 5],
	[36, 8],
]
	.flatMap(([raio, quantas]) =>
		Array.from({ length: quantas }, (_, vez) => {
			const angulo = (Math.PI * vez) / (quantas - 1);
			return circulo(
				50 - raio * Math.cos(angulo),
				70 - raio * Math.sin(angulo),
				6,
			);
		}),
	)
	.join("");

export const SIMBOLOS = {
	/** A Constituição: o livro fechado, com a etiqueta na capa e a fita da página. */
	livro: [
		vazada(
			retangulo(28, 12, 46, 72) +
				retangulo(36, 12, 4, 72) +
				retangulo(47, 26, 19, 11),
		),
		cheia(poligono(58, 84, 66, 84, 66, 96, 62, 92, 58, 96)),
	],
	/** Os Três Poderes: o frontão sobre três colunas. */
	colunas: [
		cheia(poligono(50, 10, 90, 30, 90, 36, 10, 36, 10, 30)),
		cheia(
			retangulo(18, 42, 12, 34) +
				retangulo(44, 42, 12, 34) +
				retangulo(70, 42, 12, 34),
		),
		cheia(retangulo(12, 80, 76, 8)),
	],
	/** Os direitos e deveres: a balança, com os dois pratos. */
	balanca: [
		cheia(circulo(50, 17, 5.5)),
		cheia(retangulo(47, 22, 6, 58)),
		cheia(retangulo(14, 25, 72, 5)),
		cheia(poligono(36, 88, 64, 88, 58, 80, 42, 80)),
		cheia(poligono(18, 30, 22, 30, 31, 58, 27, 58)),
		cheia(poligono(18, 30, 22, 30, 13, 58, 9, 58)),
		cheia(poligono(78, 30, 82, 30, 91, 58, 87, 58)),
		cheia(poligono(78, 30, 82, 30, 73, 58, 69, 58)),
		cheia("M6 58A14 12 0 0 0 34 58Z"),
		cheia("M66 58A14 12 0 0 0 94 58Z"),
	],
	/** O processo legislativo: o Congresso, com as duas torres, a tigela e a cúpula. */
	congresso: [
		cheia(retangulo(4, 64, 92, 10)),
		cheia(retangulo(43, 10, 6, 54)),
		cheia(retangulo(54, 10, 6, 54)),
		cheia(retangulo(49, 33, 5, 6)),
		cheia("M6 50A16 14 0 0 0 38 50Z"),
		cheia("M65 64A13 13 0 0 1 91 64Z"),
	],
	/** A apresentação: a folha do projeto, com a ponta dobrada e as linhas do texto. */
	folha: [
		vazada(
			"M24 10H58V32H78V90H24Z" +
				retangulo(32, 42, 38, 5) +
				retangulo(32, 53, 38, 5) +
				retangulo(32, 64, 38, 5) +
				retangulo(32, 75, 24, 5),
		),
		cheia(poligono(62, 10, 78, 26, 62, 26)),
	],
	/** As comissões: a mesa, com as cadeiras em volta. */
	mesa: [
		cheia(retangulo(26, 37, 48, 26)),
		cheia(
			retangulo(29, 22, 11, 9) +
				retangulo(44.5, 22, 11, 9) +
				retangulo(60, 22, 11, 9) +
				retangulo(29, 69, 11, 9) +
				retangulo(44.5, 69, 11, 9) +
				retangulo(60, 69, 11, 9) +
				retangulo(11, 45, 9, 10) +
				retangulo(80, 45, 9, 10),
		),
	],
	/** O plenário: as cadeiras em meia-lua, de frente para a mesa. */
	hemiciclo: [cheia(CADEIRAS), cheia(retangulo(40, 77, 20, 8))],
	/** A outra Casa: a tigela da Câmara, a cúpula do Senado e a seta de uma à outra. */
	"duas-casas": [
		cheia(retangulo(4, 72, 92, 8)),
		cheia("M6 58A17 14 0 0 0 40 58Z"),
		cheia("M60 72A15 15 0 0 1 90 72Z"),
		linha("M24 46Q46 17 68 38", 5),
		cheia(poligono(74.5, 44.5, 64, 42.5, 72.5, 34)),
	],
	/** A sanção ou o veto: a caneta-tinteiro, deitada sobre a linha da assinatura. */
	caneta: [
		girada(
			35,
			vazada(
				"M50 94L34 62V46H66V62Z" +
					circulo(50, 60, 4.5) +
					retangulo(48.5, 64.5, 3, 21.5),
			),
		),
		girada(35, cheia(retangulo(36, 10, 28, 32))),
		cheia(retangulo(6, 90, 40, 4)),
	],
} satisfies Record<string, readonly Parte[]>;

export type NomeDoSimbolo = keyof typeof SIMBOLOS;

/** O símbolo de cada trilha, pelo endereço dela. */
const SIMBOLO_DA_TRILHA = new Map<string, NomeDoSimbolo>([
	["constituicao-brasileira", "livro"],
	["tres-poderes", "colunas"],
	["direitos-e-deveres", "balanca"],
	["processo-legislativo", "congresso"],
]);

/** O símbolo de cada jogo, pelo nome da pasta do roteiro dele. */
const SIMBOLO_DO_JOGO = new Map<string, NomeDoSimbolo>([["comissoes", "mesa"]]);

/** O símbolo de cada passo do caminho, pelo endereço do passo (idDoPasso). */
const SIMBOLO_DO_PASSO = new Map<string, NomeDoSimbolo>([
	["passo-apresentacao", "folha"],
	["passo-comissoes", "mesa"],
	["passo-plenario", "hemiciclo"],
	["passo-a-outra-casa", "duas-casas"],
	["passo-sancao-ou-veto", "caneta"],
]);

/**
 * O símbolo de uma trilha. A trilha que não está no mapa fica sem símbolo, com o
 * azulejo da posição, e o teste de lib/simbolos.test.ts não deixa ela chegar ao
 * site assim.
 */
export function simboloDaTrilha(slug: string): NomeDoSimbolo | undefined {
	return SIMBOLO_DA_TRILHA.get(slug);
}

/** O símbolo de um passo do caminho, pelo título. Fora do mapa, fica sem. */
export function simboloDoPasso(titulo: string): NomeDoSimbolo | undefined {
	return SIMBOLO_DO_PASSO.get(idDoPasso(titulo));
}

/**
 * O símbolo de um jogo, pelo endereço dele. O jogo que não está no mapa fica sem
 * símbolo, com o azulejo da posição, e o teste de lib/simbolos.test.ts não deixa
 * ele chegar ao site assim.
 */
export function simboloDoJogo(slug: string): NomeDoSimbolo | undefined {
	return SIMBOLO_DO_JOGO.get(slug);
}
