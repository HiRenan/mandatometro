import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O mapa da trilha é o fundo de todas as páginas (fundo.css): um ladrilho de
// curvas de nível que se repete. Este teste lê o mapa.svg que o
// imagens/mapa.mjs gravou e confere o que o olho cobraria: as curvas continuam
// de um ladrilho para o vizinho, e o arquivo pesa pouco.

const arquivo = (nome: string) =>
	readFileSync(new URL(`./${nome}`, import.meta.url), "utf8");

const svg = arquivo("mapa.svg");
const lado = Number(/ width="(\d+)"/.exec(svg)?.[1]);

type Ponto = { x: number; y: number };
type Linha = { comeco: Ponto; fim: Ponto; fechada: boolean };

/**
 * As linhas de um `d` do mapa.mjs: um `M` com a posição, as curvas em `q` e a
 * reta do fim em `l`, com números relativos, e o `z` da linha fechada.
 */
function linhasDoCaminho(d: string): Linha[] {
	const linhas: Linha[] = [];
	let comeco: Ponto | undefined;
	let onde: Ponto = { x: 0, y: 0 };
	let fechada = false;
	const guardar = () => {
		if (comeco) linhas.push({ comeco, fim: onde, fechada });
	};
	for (const [, comando, resto] of d.matchAll(/([Mqlz])([^Mqlz]*)/g)) {
		const numeros = (resto?.match(/-?\d+/g) ?? []).map(Number);
		if (comando === "M") {
			guardar();
			const [x = 0, y = 0] = numeros;
			comeco = { x, y };
			onde = comeco;
			fechada = false;
		} else if (comando === "z") {
			fechada = true;
		} else {
			// Cada curva leva o controle e o fim; a reta, só o fim.
			const tamanho = comando === "q" ? 4 : 2;
			for (let i = 0; i < numeros.length; i += tamanho) {
				onde = {
					x: onde.x + (numeros[i + tamanho - 2] ?? 0),
					y: onde.y + (numeros[i + tamanho - 1] ?? 0),
				};
			}
		}
	}
	guardar();
	return linhas;
}

const linhas = [...svg.matchAll(/ d="([^"]+)"/g)].flatMap(([, d]) =>
	linhasDoCaminho(d ?? ""),
);
const pontas = linhas
	.filter((linha) => !linha.fechada)
	.flatMap((linha) => [linha.comeco, linha.fim]);

const emOrdem = (numeros: number[]) => [...numeros].sort((a, b) => a - b);

describe("o mapa da trilha", () => {
	it("tem curvas abertas e fechadas, e nenhuma acaba no meio do ladrilho", () => {
		expect(linhas.some((linha) => linha.fechada)).toBe(true);
		expect(pontas.length).toBeGreaterThan(0);
		const soltas = pontas.filter(
			({ x, y }) => x !== 0 && x !== lado && y !== 0 && y !== lado,
		);
		expect(soltas).toEqual([]);
	});

	it("emenda com o ladrilho do lado: a curva que sai pela direita entra pela esquerda", () => {
		const naEsquerda = pontas.filter(({ x }) => x === 0).map(({ y }) => y);
		const naDireita = pontas.filter(({ x }) => x === lado).map(({ y }) => y);
		expect(naEsquerda.length).toBeGreaterThan(0);
		expect(emOrdem(naDireita)).toEqual(emOrdem(naEsquerda));
	});

	it("emenda com o ladrilho de baixo: a curva que sai por baixo entra por cima", () => {
		const emCima = pontas.filter(({ y }) => y === 0).map(({ x }) => x);
		const embaixo = pontas.filter(({ y }) => y === lado).map(({ x }) => x);
		expect(emCima.length).toBeGreaterThan(0);
		expect(emOrdem(embaixo)).toEqual(emOrdem(emCima));
	});

	it("é repetido pelo fundo.css no tamanho do ladrilho", () => {
		expect(arquivo("fundo.css")).toContain(
			`mask: url("./mapa.svg") 50% 0 / ${lado}px ${lado}px repeat;`,
		);
	});

	// O mapa sobe com a rolagem (movimento.css). Ele anda por um trecho fixo de
	// rolagem, e não pelo progresso da página inteira: assim, não salta quando a
	// página muda de altura com a pessoa parada. E a camada sobra embaixo o tanto
	// que ela sobe, para o mapa não acabar antes do fim da tela.
	it("anda por um trecho fixo da rolagem, e a camada sobra embaixo o tanto que sobe", () => {
		const movimento = arquivo("movimento.css");
		const sobe =
			/@keyframes mapa-anda \{\s*to \{\s*transform: translateY\(-(\d+)vh\);/.exec(
				movimento,
			)?.[1];
		const trecho =
			/animation-timeline: scroll\(root block\);\s*animation-range: 0 (\d+)vh;/.exec(
				movimento,
			)?.[1];
		const sobra = /inset: 0 0 -(\d+)vh;/.exec(arquivo("fundo.css"))?.[1];

		expect(Number(sobe)).toBeGreaterThan(0);
		expect(sobra).toBe(sobe);
		// Um décimo do que a página rola.
		expect(Number(trecho)).toBe(Number(sobe) * 10);
	});

	it("pesa menos de 20 kB", () => {
		expect(Buffer.byteLength(svg)).toBeLessThan(20_000);
	});
});
