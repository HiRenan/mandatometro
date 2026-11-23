import { describe, expect, it } from "vitest";
import type { MediaEtapa, SituacaoPiloto } from "@/lib/contrato-da-297";
import { comMilhares } from "@/lib/formatar";
import {
	diaDeMaisVisitas,
	diferencaNaTela,
	fraseDaColeta,
	fraseDaSemanaAtual,
	fraseDasVisitas,
	fraseDosQueVoltaram,
	horaEmBrasilia,
	mediaNaTela,
	partesDoMaior,
	porcentagem,
	somaDosTotais,
	trilhasDoUso,
} from "./numeros";

// Os números chegam prontos da API (a #297). A tela só escreve: o milhar, a
// porcentagem, as datas e as frases. As duas somas são as que a Atena liberou em
// 23/11/2026: os 30 dias das visitas e as leituras das trilhas.

describe("os números em pt-BR", () => {
	it("o milhar leva o ponto", () => {
		expect(comMilhares(48)).toBe("48");
		expect(comMilhares(3204)).toBe("3.204");
		expect(comMilhares(312480)).toBe("312.480");
		expect(comMilhares(1_000_000)).toBe("1.000.000");
	});

	it("a porcentagem tem uma casa, com vírgula, e perde o zero da casa", () => {
		expect(porcentagem(46.67)).toBe("46,7%");
		expect(porcentagem(72)).toBe("72%");
		expect(porcentagem(71.96)).toBe("72%");
		expect(porcentagem(0)).toBe("0%");
	});
});

describe("as somas da tela", () => {
	it("soma os dias das visitas e as leituras das trilhas", () => {
		expect(
			somaDosTotais([
				{ dia: "2026-11-21", total: 120 },
				{ dia: "2026-11-22", total: 0 },
				{ dia: "2026-11-23", total: 84 },
			]),
		).toBe(204);
		expect(somaDosTotais([])).toBe(0);
	});
});

describe("as barras", () => {
	it("cada valor é a parte do maior", () => {
		expect(partesDoMaior([0, 50, 100, 25])).toEqual([0, 0.5, 1, 0.25]);
	});

	it("sem valor acima de zero, nenhuma barra", () => {
		expect(partesDoMaior([0, 0])).toEqual([0, 0]);
		expect(partesDoMaior([])).toEqual([]);
	});
});

describe("as semanas e os dias", () => {
	it("a semana atual é a última da lista, que vai até a semana de hoje", () => {
		expect(
			fraseDaSemanaAtual([
				{ semana: "2026-11-09", total: 12 },
				{ semana: "2026-11-16", total: 6 },
			]),
		).toBe("6 nesta semana");
		expect(fraseDaSemanaAtual([])).toBe("0 nesta semana");
	});

	it("o dia de mais visitas é o primeiro com o maior total", () => {
		expect(
			diaDeMaisVisitas([
				{ dia: "2026-11-10", total: 30 },
				{ dia: "2026-11-12", total: 214 },
				{ dia: "2026-11-13", total: 214 },
			]),
		).toEqual({ dia: "2026-11-12", total: 214 });
	});

	it("sem visita, não há dia de mais visitas", () => {
		expect(diaDeMaisVisitas([{ dia: "2026-11-10", total: 0 }])).toBeUndefined();
		expect(diaDeMaisVisitas([])).toBeUndefined();
	});

	it("a frase das visitas diz o período, a soma e o dia de mais visitas", () => {
		expect(
			fraseDasVisitas([
				{ dia: "2026-10-25", total: 10 },
				{ dia: "2026-11-12", total: 214 },
				{ dia: "2026-11-23", total: 980 },
			]),
		).toBe(
			"De 25 de outubro a 23 de novembro, 1.204 páginas vistas. O dia com mais visitas foi 23 de novembro, com 980.",
		);
		expect(fraseDasVisitas([{ dia: "2026-11-23", total: 0 }])).toBe(
			"Em 23 de novembro, nenhuma página vista.",
		);
	});

	it("a hora vem no horário de Brasília", () => {
		expect(horaEmBrasilia("2026-11-23T17:05:00+00:00")).toBe("14h05");
		expect(horaEmBrasilia("2026-11-24T02:30:00Z")).toBe("23h30");
	});

	it("a coleta diz o dia e a hora em Brasília, ou que nunca aconteceu", () => {
		expect(fraseDaColeta("2026-11-23T09:10:00+00:00")).toBe(
			"23 de novembro de 2026, às 6h10",
		);
		expect(fraseDaColeta(null)).toBe("Nunca coletada");
	});
});

describe("o piloto", () => {
	const media = (
		situacao: SituacaoPiloto,
		percentual: number | null,
		acertos: number | null,
	): MediaEtapa => ({ quantidade: 23, situacao, percentual, acertos });

	it("a média disponível vem em porcentagem e em acertos", () => {
		expect(mediaNaTela(media("disponivel", 46.67, 5.6), 12)).toEqual({
			tipo: "numero",
			porcentagem: "46,7%",
			acertos: "5,6 de 12 perguntas",
		});
	});

	it("a média suprimida vem com a frase da situação, nunca com o zero", () => {
		expect(mediaNaTela(media("amostra_pequena", null, null), 12)).toEqual({
			tipo: "frase",
			frase: "Poucas respostas: a média só aparece a partir de 5 pessoas.",
		});
		expect(mediaNaTela(media("protecao_de_subgrupo", null, null), 12)).toEqual({
			tipo: "frase",
			frase: "A média não aparece para não revelar um grupo pequeno.",
		});
		expect(mediaNaTela(media("sem_respostas", null, null), 12)).toEqual({
			tipo: "frase",
			frase: "Ninguém respondeu esta etapa ainda.",
		});
	});

	it("a diferença dos pares vem em pontos percentuais, em palavras", () => {
		const pares = (diferenca: number | null, situacao: SituacaoPiloto) => ({
			diferenca_pontos_percentuais: diferenca,
			situacao,
		});
		expect(diferencaNaTela(pares(25.33, "disponivel"))).toBe(
			"25,3 pontos percentuais a mais depois da trilha",
		);
		expect(diferencaNaTela(pares(-4, "disponivel"))).toBe(
			"4 pontos percentuais a menos depois da trilha",
		);
		expect(diferencaNaTela(pares(0, "disponivel"))).toBe(
			"a mesma média antes e depois da trilha",
		);
		expect(diferencaNaTela(pares(null, "amostra_pequena"))).toBe(
			"Poucas respostas: a média só aparece a partir de 5 pessoas.",
		);
	});
});

describe("os números que são mínimos", () => {
	it("quem voltou é contado como mínimo", () => {
		expect(fraseDosQueVoltaram(9)).toBe(
			"Pelo menos 9 contas voltaram depois da semana do cadastro.",
		);
		expect(fraseDosQueVoltaram(1)).toBe(
			"Pelo menos 1 conta voltou depois da semana do cadastro.",
		);
		expect(fraseDosQueVoltaram(0)).toBe(
			"Nenhuma volta registrada depois da semana do cadastro.",
		);
	});
});

describe("as trilhas", () => {
	const catalogo = [
		{ slug: "processo-legislativo", titulo: "Processo legislativo" },
		{ slug: "constituicao", titulo: "A Constituição" },
		{ slug: "tres-poderes", titulo: "Os Três Poderes" },
	];

	it("o nome e a posição vêm do catálogo do site, na ordem dele", () => {
		expect(
			trilhasDoUso(
				[
					{ trilha: "constituicao", total: 140 },
					{ trilha: "processo-legislativo", total: 212 },
				],
				[
					{ trilha: "constituicao", total: 3 },
					{ trilha: "processo-legislativo", total: 5 },
				],
				catalogo,
			),
		).toEqual([
			{
				slug: "processo-legislativo",
				titulo: "Processo legislativo",
				posicao: 1,
				lidos: 212,
				concluidas: 5,
			},
			{
				slug: "constituicao",
				titulo: "A Constituição",
				posicao: 2,
				lidos: 140,
				concluidas: 3,
			},
		]);
	});

	it("a trilha que o catálogo não tem vai no fim, com o slug", () => {
		expect(
			trilhasDoUso(
				[
					{ trilha: "nova-trilha", total: 4 },
					{ trilha: "tres-poderes", total: 8 },
				],
				[],
				catalogo,
			),
		).toEqual([
			{
				slug: "tres-poderes",
				titulo: "Os Três Poderes",
				posicao: 3,
				lidos: 8,
				concluidas: 0,
			},
			{
				slug: "nova-trilha",
				titulo: "nova-trilha",
				posicao: 4,
				lidos: 4,
				concluidas: 0,
			},
		]);
	});

	it("sem o catálogo, as trilhas ficam na ordem da API, pelo slug", () => {
		expect(
			trilhasDoUso([{ trilha: "constituicao", total: 1 }], [], []),
		).toEqual([
			{
				slug: "constituicao",
				titulo: "constituicao",
				posicao: 1,
				lidos: 1,
				concluidas: 0,
			},
		]);
	});
});
