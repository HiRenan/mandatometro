// Desenha o mapa da trilha, o fundo do site: curvas de nível, como num mapa de
// trilha, num ladrilho quadrado que emenda com ele mesmo dos quatro lados. É
// só código, sem dependência e sem arte de fora, e o sorteio tem semente: o
// mesmo roteiro dá sempre o mesmo desenho.
//
// Uso: pnpm --filter web mapa
// Grava src/estilos/mapa.svg, que o estilos/fundo.css usa como máscara. Para
// mudar o mapa, mude este roteiro e gere de novo, sem editar o SVG.
import { writeFileSync } from "node:fs";

/** O lado do ladrilho, em px. O fundo.css repete o ladrilho neste tamanho. */
const LADO = 1400;
/** A grade em que o relevo é medido. Mais células, curvas mais lisas e mais peso. */
const CELULAS = 72;
/** Quantas curvas de nível entre o ponto mais baixo e o mais alto. */
const NIVEIS = 11;
/** De quantas em quantas curvas vem uma mestra, mais grossa. */
const MESTRA = 4;
const SEMENTE = 61;
const VOLTA = Math.PI * 2;

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
 * O relevo: uma soma de ondas com número inteiro de voltas no ladrilho. Por
 * isso a beirada de um ladrilho continua na do vizinho.
 */
function relevo() {
	const sorte = sorteio(SEMENTE);
	const ondas = [];
	while (ondas.length < 12) {
		const kx = Math.round((sorte() * 2 - 1) * 3);
		const ky = Math.round((sorte() * 2 - 1) * 3);
		if (kx === 0 && ky === 0) continue;
		ondas.push({
			kx,
			ky,
			fase: sorte() * VOLTA,
			forca: 1 / Math.hypot(kx, ky) ** 1.5,
		});
	}
	const f1 = sorte() * VOLTA;
	const f2 = sorte() * VOLTA;
	return (u, v) => {
		const x = u + 0.05 * Math.sin(VOLTA * v + f1);
		const y = v + 0.05 * Math.sin(VOLTA * u + f2);
		let altura = 0;
		for (const onda of ondas) {
			altura +=
				onda.forca * Math.sin(VOLTA * (onda.kx * x + onda.ky * y) + onda.fase);
		}
		return altura;
	};
}

/**
 * As linhas de um nível, pelos quadrados da grade (marching squares). Cada
 * linha é uma lista de pontos, em px; a fechada repete o primeiro no fim.
 */
function linhasDoNivel(grade, nivel) {
	const n = CELULAS;
	const passo = LADO / n;
	const pontos = new Map();
	const segmentos = [];
	const cruza = (chave, x, y) => {
		if (!pontos.has(chave)) pontos.set(chave, [x * passo, y * passo]);
		return chave;
	};
	for (let j = 0; j < n; j++) {
		for (let i = 0; i < n; i++) {
			const a = grade[j][i];
			const b = grade[j][i + 1];
			const c = grade[j + 1][i + 1];
			const d = grade[j + 1][i];
			const caso =
				(a > nivel ? 8 : 0) |
				(b > nivel ? 4 : 0) |
				(c > nivel ? 2 : 0) |
				(d > nivel ? 1 : 0);
			if (caso === 0 || caso === 15) continue;
			// Onde a curva cruza cada lado do quadrado: em cima, à direita, embaixo
			// e à esquerda. A chave é a aresta da grade, que dois quadrados dividem.
			const cima = () => cruza(`h${i},${j}`, i + (nivel - a) / (b - a), j);
			const direita = () =>
				cruza(`v${i + 1},${j}`, i + 1, j + (nivel - b) / (c - b));
			const baixo = () =>
				cruza(`h${i},${j + 1}`, i + (nivel - d) / (c - d), j + 1);
			const esquerda = () => cruza(`v${i},${j}`, i, j + (nivel - a) / (d - a));
			// Nos dois casos em sela (dois cantos opostos altos), o meio do quadrado
			// decide quais cantos a curva separa.
			const meioAlto = (a + b + c + d) / 4 > nivel;
			const separaCimaDireita = [
				[cima, direita],
				[esquerda, baixo],
			];
			const separaCimaEsquerda = [
				[esquerda, cima],
				[baixo, direita],
			];
			const pares = {
				1: [[esquerda, baixo]],
				2: [[baixo, direita]],
				3: [[esquerda, direita]],
				4: [[cima, direita]],
				5: meioAlto ? separaCimaEsquerda : separaCimaDireita,
				6: [[cima, baixo]],
				7: [[esquerda, cima]],
				8: [[esquerda, cima]],
				9: [[cima, baixo]],
				10: meioAlto ? separaCimaDireita : separaCimaEsquerda,
				11: [[cima, direita]],
				12: [[esquerda, direita]],
				13: [[baixo, direita]],
				14: [[esquerda, baixo]],
			}[caso];
			for (const [p, q] of pares) segmentos.push([p(), q()]);
		}
	}

	// Emenda os segmentos em linhas, pela aresta em que cada ponta cai.
	const porPonta = new Map();
	segmentos.forEach((segmento, indice) => {
		for (const chave of segmento) {
			if (!porPonta.has(chave)) porPonta.set(chave, []);
			porPonta.get(chave).push(indice);
		}
	});
	const usado = new Array(segmentos.length).fill(false);
	const seguir = (linha, naFrente) => {
		for (;;) {
			const ponta = naFrente ? linha[linha.length - 1] : linha[0];
			const proximo = porPonta.get(ponta).find((indice) => !usado[indice]);
			if (proximo === undefined) return;
			usado[proximo] = true;
			const [p, q] = segmentos[proximo];
			const outra = p === ponta ? q : p;
			if (naFrente) linha.push(outra);
			else linha.unshift(outra);
		}
	};
	const linhas = [];
	for (let indice = 0; indice < segmentos.length; indice++) {
		if (usado[indice]) continue;
		usado[indice] = true;
		const linha = [...segmentos[indice]];
		seguir(linha, true);
		seguir(linha, false);
		linhas.push(linha.map((chave) => pontos.get(chave)));
	}
	return linhas;
}

/** Os números de um comando, juntos: o sinal de menos já separa. */
function numeros(lista) {
	return lista
		.map((numero, indice) => (indice > 0 && numero >= 0 ? " " : "") + numero)
		.join("");
}

/**
 * A linha em curvas, no `d` do SVG: cada ponto é o controle de uma curva que
 * vai de um meio de segmento ao seguinte. Os números são inteiros e relativos,
 * para o arquivo pesar pouco; cada um parte da posição já arredondada, e o erro
 * não se soma ao longo da linha.
 */
function caminho(linha) {
	const fechada =
		linha.length > 3 &&
		linha[0][0] === linha[linha.length - 1][0] &&
		linha[0][1] === linha[linha.length - 1][1];
	const pontos = fechada ? linha.slice(0, -1) : linha;
	if (pontos.length < 5) return "";
	const meio = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
	const inteiro = ([x, y]) => [Math.round(x), Math.round(y)];

	let onde = inteiro(
		fechada ? meio(pontos[pontos.length - 1], pontos[0]) : pontos[0],
	);
	let d = `M${numeros(onde)}`;
	const curvas = [];
	const ate = fechada ? pontos.length : pontos.length - 1;
	for (let i = fechada ? 0 : 1; i < ate; i++) {
		const controle = inteiro(pontos[i]);
		const fim = inteiro(meio(pontos[i], pontos[(i + 1) % pontos.length]));
		curvas.push(
			numeros([
				controle[0] - onde[0],
				controle[1] - onde[1],
				fim[0] - onde[0],
				fim[1] - onde[1],
			]),
		);
		onde = fim;
	}
	// O `q` vale para todas as curvas seguintes: entre uma e outra, só o espaço
	// que o sinal de menos não dá.
	d += `q${curvas.map((curva, i) => (i > 0 && !curva.startsWith("-") ? " " : "") + curva).join("")}`;
	if (fechada) return `${d}z`;
	const ultimo = inteiro(pontos[pontos.length - 1]);
	return `${d}l${numeros([ultimo[0] - onde[0], ultimo[1] - onde[1]])}`;
}

/** O SVG do ladrilho: as curvas finas, mais fracas, e as mestras, mais grossas. */
function mapa() {
	const altura = relevo();
	const n = CELULAS;
	const grade = [];
	let minimo = Number.POSITIVE_INFINITY;
	let maximo = Number.NEGATIVE_INFINITY;
	for (let j = 0; j <= n; j++) {
		grade.push([]);
		for (let i = 0; i <= n; i++) {
			// A última fileira repete a primeira: é a mesma beirada.
			const h = altura((i % n) / n, (j % n) / n);
			grade[j].push(h);
			minimo = Math.min(minimo, h);
			maximo = Math.max(maximo, h);
		}
	}
	const finas = [];
	const mestras = [];
	for (let k = 0; k < NIVEIS; k++) {
		const nivel = minimo + ((k + 0.5) * (maximo - minimo)) / NIVEIS;
		const destino = k % MESTRA === MESTRA - 1 ? mestras : finas;
		for (const linha of linhasDoNivel(grade, nivel)) {
			destino.push(caminho(linha));
		}
	}
	return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="${LADO}" height="${LADO}" viewBox="0 0 ${LADO} ${LADO}"><g fill="none" stroke="#000" stroke-linecap="round"><path stroke-width="1" stroke-opacity=".62" d="${finas.join("")}"/><path stroke-width="1.7" d="${mestras.join("")}"/></g></svg>\n`;
}

const svg = mapa();
writeFileSync(new URL("../src/estilos/mapa.svg", import.meta.url), svg);
console.log(`src/estilos/mapa.svg: ${svg.length} bytes`);
