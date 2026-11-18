import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O fio da opção do quiz (quiz.css). O Renan, na #89: antes da resposta, o fio
// não usa o verde nem o vermelho, que são as cores da resposta certa e da
// errada. Este teste lê o CSS, porque a regra é de cor e o jsdom não desenha.

const css = readFileSync(new URL("./quiz.css", import.meta.url), "utf8");

/** O corpo da primeira regra de um seletor. */
function regra(seletor: string): string {
	const comeco = css.indexOf(`${seletor} {`);
	if (comeco < 0) {
		throw new Error(`o quiz.css não tem a regra ${seletor}`);
	}
	return css.slice(comeco, css.indexOf("}", comeco));
}

/** Um bloco inteiro, como um @media, com as regras de dentro. */
function bloco(cabeca: string): string {
	const comeco = css.indexOf(`${cabeca} {`);
	if (comeco < 0) {
		throw new Error(`o quiz.css não tem o bloco ${cabeca}`);
	}
	let fundo = 0;
	for (let i = css.indexOf("{", comeco); i < css.length; i++) {
		if (css[i] === "{") {
			fundo++;
		} else if (css[i] === "}" && --fundo === 0) {
			return css.slice(comeco, i + 1);
		}
	}
	throw new Error(`o bloco ${cabeca} não fecha`);
}

describe("o fio da opção do quiz", () => {
	it("antes da resposta, só leva a rosa, a amarela e a azul", () => {
		const fios = [...css.matchAll(/--fio: var\(--fita-([a-z]+)\);/g)].map(
			([, fita]) => fita,
		);

		expect(fios).toEqual(["rosa", "amarela", "azul"]);
	});

	it("é o que o ponteiro e a opção escolhida mostram, e não a cor da letra", () => {
		for (const seletor of [
			".quiz-opcao:hover",
			".quiz-opcao:has(input:checked)",
		]) {
			expect(regra(seletor), seletor).toContain("var(--fio)");
			expect(regra(seletor), seletor).not.toMatch(/var\(--(c|fita-[a-z]+)\)/);
		}
	});

	it("o verde e o vermelho ficam para a resposta certa e a errada", () => {
		expect(regra('.quiz .quiz-opcao[data-estado="certa"]')).toContain(
			"var(--fita-verde)",
		);
		expect(regra('.quiz .quiz-opcao[data-estado="errada"]')).toContain(
			"var(--fita-vermelha)",
		);
	});
});

// O pé do palco (o andamento) fica preso embaixo numa tela alta. Na abertura com
// a linha do piloto, que deixa a abertura mais alta, o pé preso cobria o
// "Começar" no celular pequeno (375 × 667): ali ele fica solto, depois do botão.
// O quiz da trilha e o quiz final do público, sem a linha, continuam iguais.
describe("o pé do palco", () => {
	it("fica preso numa tela alta, menos na abertura com a linha do piloto", () => {
		const alta = bloco("@media (height >= 40rem)");

		expect(alta).toMatch(/\.quiz-pe \{\s*position: sticky;/);
		expect(alta).toMatch(
			/\.quiz\[data-linha\]\[data-fase="abertura"\] \.quiz-pe \{\s*position: static;/,
		);
	});
});

// Os quadradinhos do andamento ficam numa fileira enquanto cabem. A 320 px, os
// doze do quiz final quebravam em 11 e 1, e o de baixo ficava sozinho. A conta
// usa as medidas do CSS: se o quadradinho ou o vão mudar, a tela de cada bloco
// muda junto.
describe("os quadradinhos do andamento", () => {
	const lado = Number(
		regra(".quiz-andamento li").match(/width: ([\d.]+)rem;/)?.[1],
	);
	const vao = Number(regra(".quiz-andamento").match(/gap: ([\d.]+)rem;/)?.[1]);
	/** A largura de uma fileira de `n` quadradinhos, em rem. */
	const fileira = (n: number) => n * lado + (n - 1) * vao;
	/** As margens do celular, 20 px de cada lado, em rem, com a letra de `px`. */
	const margens = (px: number) => 40 / px;
	const rem = (valor: number) => `${Math.round(valor * 1000) / 1000}rem`;

	it("onde os doze não cabem numa fileira, vão em duas de seis", () => {
		const estreita = bloco(
			`@media (width < ${rem(fileira(12) + margens(16))})`,
		);

		expect(estreita).toMatch(/grid-template-columns: repeat\(6, /);
	});

	it("com a letra acima de 200%, onde nem seis cabem, as fileiras ficam de três", () => {
		const estreitissima = bloco(
			`@media (width < ${rem(fileira(6) + margens(32))})`,
		);

		expect(estreitissima).toMatch(/grid-template-columns: repeat\(3, /);
	});
});

// O título do palco ("Quiz da trilha", "Quiz final" ou "Antes da trilha"). Fora
// da abertura, ele virava uma etiqueta pequena acima da contagem e do título do
// fim, e etiqueta acima de título não entra no site (a #136). Ele continua no
// HTML, com o nome do palco e a ordem dos títulos para o leitor de tela, mas sai
// da vista: quem vê lê o nome do quiz no pé, com o andamento.
describe("o título do palco fora da abertura", () => {
	it("sai da vista, sem virar etiqueta", () => {
		const fora = regra('.quiz:not([data-fase="abertura"]) .quiz-titulo');

		for (const declaracao of [
			"position: absolute;",
			"width: 1px;",
			"height: 1px;",
			"overflow: hidden;",
			"clip-path: inset(50%);",
			"white-space: nowrap;",
		]) {
			expect(fora).toContain(declaracao);
		}
		expect(fora).not.toMatch(/font-size|text-transform|letter-spacing|color:/);
	});

	it("abaixo de 62rem, o palco guarda o lugar do mosaico, e o título só guarda lugar na abertura", () => {
		// Sem os comentários, que também falam dos seletores.
		const celular = bloco("@media (width < 62rem)").replace(
			/\/\*[\s\S]*?\*\//g,
			"",
		);

		// Na pergunta e na resposta, a altura do mosaico no canto: a contagem para
		// antes dele, e o enunciado começa embaixo.
		expect(celular).toMatch(
			/\.quiz:is\(\[data-fase="pergunta"\], \[data-fase="resposta"\]\) \.quiz-palco \{\s*padding-top: [^;]*var\(--canto\)/,
		);
		expect(celular).toMatch(
			/\.quiz:is\(\[data-fase="pergunta"\], \[data-fase="resposta"\]\) \.quiz-contagem \{\s*max-width: calc\(100% - var\(--canto\)/,
		);
		// No fim, a altura do mosaico inteiro.
		expect(celular).toMatch(
			/\.quiz\[data-fase="fim"\] \.quiz-palco \{\s*padding-top: [^;]*var\(--capa\)/,
		);
		// O título só guarda lugar onde fica à vista: na abertura, embaixo do
		// mosaico inteiro.
		const doTitulo = [
			...celular.matchAll(/([^{}]*\.quiz-titulo[^{}]*)\{/g),
		].map(([, seletor]) => seletor.trim());
		expect(doTitulo).toEqual(['.quiz[data-fase="abertura"] .quiz-titulo']);
		expect(celular).toMatch(
			/\.quiz\[data-fase="abertura"\] \.quiz-titulo \{\s*padding-top: [^;]*var\(--capa\)/,
		);
	});
});
