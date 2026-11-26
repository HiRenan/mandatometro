// Desenha a coluna de azulejos das margens, o fundo do site no computador:
// doze peças tom sobre tom, uma embaixo da outra, que o estilos/fundo.css
// repete de cima a baixo em cada margem a partir de 768 px. As peças usam os
// motivos dos azulejos do site (estilos/azulejos.css) em Papel 2 e Papel 3,
// sem cor de fita: é o azulejo cru, papel sobre papel. É só código, sem
// dependência e sem arte de fora, e o sorteio tem semente: o mesmo roteiro dá
// sempre o mesmo desenho.
//
// Uso: pnpm --filter web margem
// Grava src/estilos/margem.svg. Para mudar a coluna, mude este roteiro e gere
// de novo, sem editar o SVG.
import { writeFileSync } from "node:fs";

/** Os dois tons do azulejo cru (packages/ui/src/styles/globals.css). */
const PAPEL_2 = "#ebe4d2";
const PAPEL_3 = "#d8cfb8";
/** Quantas peças a coluna tem antes de se repetir. */
const PECAS = 12;
/** O rejunte entre duas peças, em centésimos da peça: 2 px numa peça de 66 px. */
const REJUNTE = 3;
/** A parte das peças com o desenho em Papel 3 sobre o Papel 2; as outras, ao contrário. */
const CLARAS = 0.7;
const SEMENTE = 357;

/** Um sorteio com semente (mulberry32), o mesmo do lib/azulejos.ts. */
function sorteio(semente) {
	let a = semente;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Os motivos de estilos/azulejos.css, numa caixa de 100 por 100, sem a volta.
 * O raio de cada círculo é o do gradiente de lá, que conta a porcentagem sobre
 * a distância até o canto mais longe.
 */
const MOTIVOS = {
	quarto: (b) => `<path d="M0 0H99.3A99.3 99.3 0 0 1 0 99.3Z" fill="${b}"/>`,
	meiaLua: (b) => `<path d="M0.6 0A49.4 49.4 0 0 0 99.4 0Z" fill="${b}"/>`,
	triangulo: (b) => `<path d="M0 0H100L0 100Z" fill="${b}"/>`,
	circulo: (b) => `<circle cx="50" cy="50" r="34.6" fill="${b}"/>`,
	listras: (b) =>
		[0, 25, 50, 75]
			.map((x) => `<rect x="${x}" width="12.5" height="100" fill="${b}"/>`)
			.join(""),
	arco: (b) =>
		`<path d="M49.4 0H99.3A99.3 99.3 0 0 1 0 99.3V49.4A49.4 49.4 0 0 0 49.4 0Z" fill="${b}"/>`,
	opostos: (b) =>
		`<path d="M0 0H69.3A69.3 69.3 0 0 1 0 69.3Z" fill="${b}"/><path d="M100 100H30.7A69.3 69.3 0 0 1 100 30.7Z" fill="${b}"/>`,
	pontos: (b) =>
		[
			[25, 25],
			[75, 25],
			[25, 75],
			[75, 75],
		]
			.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10.6" fill="${b}"/>`)
			.join(""),
	metade: (b) => `<rect width="50" height="100" fill="${b}"/>`,
	liso: () => "",
};
const NOMES = Object.keys(MOTIVOS);

const sortear = sorteio(SEMENTE);
const escala = (100 - REJUNTE) / 100;
const pecas = [];
let anterior = "";
for (let i = 0; i < PECAS; i++) {
	// Duas peças vizinhas nunca repetem o motivo.
	let nome;
	do {
		nome = NOMES[Math.floor(sortear() * NOMES.length)];
	} while (nome === anterior);
	anterior = nome;
	const volta = Math.floor(sortear() * 4) * 90;
	const [fundo, desenho] =
		sortear() < CLARAS ? [PAPEL_2, PAPEL_3] : [PAPEL_3, PAPEL_2];
	// Cada peça é desenhada na caixa de 100 e encolhe para deixar o rejunte em
	// volta. A volta gira a peça inteira, e o fundo quadrado não muda com ela.
	const y = i * 100 + REJUNTE / 2;
	pecas.push(
		`<g transform="translate(${REJUNTE / 2} ${y}) scale(${escala}) rotate(${volta} 50 50)"><rect width="100" height="100" fill="${fundo}"/>${MOTIVOS[nome](desenho)}</g>`,
	);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="0 0 100 ${PECAS * 100}" width="100" height="${PECAS * 100}">${pecas.join("")}</svg>\n`;
writeFileSync(new URL("../src/estilos/margem.svg", import.meta.url), svg);
console.log(`src/estilos/margem.svg: ${svg.length} bytes`);
