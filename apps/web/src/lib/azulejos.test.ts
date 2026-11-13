import { describe, expect, it } from "vitest";
import {
	azulejoDaPosicao,
	azulejoGrande,
	corNoCss,
	fitaDaPeca,
	MOTIVOS,
	PARES,
	painel,
	paresDaFita,
	pecaSorteada,
	sementeDe,
	sorteio,
} from "./azulejos";
import { FITAS } from "./formatar";

const ehFita = (cor: string) => (FITAS as readonly string[]).includes(cor);

describe("azulejos", () => {
	it("desenha o mesmo painel com a mesma semente, no servidor e no navegador", () => {
		expect(painel(7, 96)).toEqual(painel(7, 96));
		expect(painel(7, 96)).not.toEqual(painel(8, 96));
	});

	it("nenhum azulejo leva duas fitas", () => {
		for (const [fundo, desenho] of PARES) {
			expect(ehFita(fundo) && ehFita(desenho), `${fundo} e ${desenho}`).toBe(
				false,
			);
		}
	});

	it("nenhum azulejo grande leva duas fitas, em nenhuma cor e em nenhum desenho", () => {
		// As posições dão a volta: doze cores e dez desenhos passam por todos, duas vezes.
		for (let cor = 0; cor < 12; cor++) {
			for (let desenho = 0; desenho < 10; desenho++) {
				for (const { fundo, desenho: traco } of azulejoGrande(desenho, cor)) {
					expect(
						ehFita(fundo) && ehFita(traco),
						`cor ${cor}, desenho ${desenho}: ${fundo} e ${traco}`,
					).toBe(false);
				}
			}
		}
	});

	it("nenhum azulejo tem o desenho da cor do fundo", () => {
		for (const [fundo, desenho] of PARES) {
			expect(fundo).not.toBe(desenho);
		}
	});

	it("cada fita tem os seus pares, para a peça mudar de desenho sem mudar de cor", () => {
		for (const fita of FITAS) {
			const pares = paresDaFita(fita);
			expect(pares.length).toBeGreaterThan(1);
			for (const par of pares) {
				expect(par).toContain(fita);
			}
		}
	});

	it("as cinco fitas aparecem juntas no começo de todo painel", () => {
		// O começo é o que a faixa do celular mostra: 12 peças no cartaz, 8 no rodapé.
		for (let semente = 0; semente < 300; semente++) {
			for (const juntas of [8, 12]) {
				const comeco = painel(semente, 96, juntas).slice(0, juntas);
				const fitas = new Set(comeco.map(fitaDaPeca));
				for (const fita of FITAS) {
					expect(fitas.has(fita), `semente ${semente}, ${fita}`).toBe(true);
				}
			}
		}
	});

	it("sorteia só motivos e voltas que o CSS desenha", () => {
		const sorte = sorteio(3);
		for (let vez = 0; vez < 200; vez++) {
			const peca = pecaSorteada(sorte);
			expect(MOTIVOS).toContain(peca.motivo);
			expect([0, 1, 2, 3]).toContain(peca.volta);
		}
	});

	it("troca o desenho de uma peça sem trocar a fita dela", () => {
		const sorte = sorteio(5);
		for (let vez = 0; vez < 50; vez++) {
			expect(fitaDaPeca(pecaSorteada(sorte, "rosa"))).toBe("rosa");
		}
	});

	it("dá a cada trilha a sua semente, sempre a mesma", () => {
		expect(sementeDe("processo-legislativo")).toBe(
			sementeDe("processo-legislativo"),
		);
		expect(sementeDe("processo-legislativo")).not.toBe(
			sementeDe("tres-poderes"),
		);
	});

	it("o azulejo grande tem quatro peças da mesma cor", () => {
		const pecas = azulejoGrande(0, 2);

		expect(pecas).toHaveLength(4);
		expect(new Set(pecas.map((peca) => peca.fundo))).toEqual(new Set(["azul"]));
	});

	it("o azulejo do artigo leva a fita da posição, e a sexta volta à primeira", () => {
		expect(
			[1, 2, 3, 4, 5, 6].map((posicao) => azulejoDaPosicao(posicao)[0].fundo),
		).toEqual(["verde", "amarela", "azul", "rosa", "vermelha", "verde"]);
	});

	it("escreve a cor de cada peça com a variável do site", () => {
		expect(corNoCss("verde")).toBe("var(--fita-verde)");
		expect(corNoCss("papel-2")).toBe("var(--papel-2)");
		expect(corNoCss("tinta")).toBe("var(--tinta)");
	});
});
