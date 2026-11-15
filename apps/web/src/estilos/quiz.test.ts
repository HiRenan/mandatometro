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
