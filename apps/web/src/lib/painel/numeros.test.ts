import { describe, expect, it } from "vitest";
import type { MediaEtapa, TotalDiario, TotalTrilha } from "@/client";
import { comMilhares } from "@/lib/formatar";
import {
	diaCurto,
	diaDeMaisVisitas,
	diferencaNaTela,
	fraseDaColeta,
	fraseDaLeitura,
	fraseDaSemanaAtual,
	fraseDasConclusoes,
	fraseDasParticipacoes,
	fraseDasSemanas,
	fraseDasTentativas,
	fraseDasTrilhasLidas,
	fraseDasVisitas,
	fraseDaUltimaEdicao,
	fraseDosLidos,
	fraseDosPares,
	fraseDosQueVoltaram,
	horaEmBrasilia,
	linkDoCaminho,
	mediaNaTela,
	nomeDoCaminho,
	partesDoMaior,
	porcentagem,
	type SituacaoPiloto,
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
		const dias: TotalDiario[] = [
			{ dia: "2026-11-21", total: 120 },
			{ dia: "2026-11-22", total: 0 },
			{ dia: "2026-11-23", total: 84 },
		];
		const lidos: TotalTrilha[] = [
			{ trilha: "tres-poderes", total: 31 },
			{ trilha: "processo-legislativo", total: 9 },
		];
		expect(somaDosTotais(dias)).toBe(204);
		expect(somaDosTotais(lidos)).toBe(40);
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

	it("as pontas do gráfico levam o dia curto", () => {
		expect(diaCurto("2026-10-25")).toBe("25 out");
		expect(diaCurto("2026-11-01")).toBe("1º nov");
	});

	it("a faixa diz quando os números foram lidos, em Brasília", () => {
		expect(fraseDaLeitura("2026-11-23T17:05:00.000Z")).toBe(
			"Lidos em 23 de novembro, às 14h05",
		);
		expect(fraseDaLeitura("2026-11-24T01:30:00.000Z")).toBe(
			"Lidos em 23 de novembro, às 22h30",
		);
	});
});

describe("as semanas em palavras", () => {
	it("diz a semana de hoje e a semana com mais", () => {
		expect(
			fraseDasSemanas([
				{ semana: "2026-11-09", total: 30 },
				{ semana: "2026-11-16", total: 12 },
				{ semana: "2026-11-23", total: 6 },
			]),
		).toBe(
			"6 na semana de 23 de novembro. A semana com mais foi a de 9 de novembro, com 30.",
		);
	});

	it("quando a semana de hoje é a com mais, diz uma vez", () => {
		expect(
			fraseDasSemanas([
				{ semana: "2026-11-16", total: 2 },
				{ semana: "2026-11-23", total: 9 },
			]),
		).toBe("9 na semana de 23 de novembro, a semana com mais até agora.");
		expect(fraseDasSemanas([{ semana: "2026-11-23", total: 6 }])).toBe(
			"6 na semana de 23 de novembro.",
		);
	});

	it("no número que é um mínimo, diz pelo menos", () => {
		expect(
			fraseDasSemanas(
				[
					{ semana: "2026-11-16", total: 25 },
					{ semana: "2026-11-23", total: 19 },
				],
				{ minimo: true },
			),
		).toBe(
			"Pelo menos 19 na semana de 23 de novembro. A semana com mais foi a de 16 de novembro, com pelo menos 25.",
		);
		expect(
			fraseDasSemanas(
				[
					{ semana: "2026-11-16", total: 4 },
					{ semana: "2026-11-23", total: 0 },
				],
				{ minimo: true },
			),
		).toBe(
			"0 na semana de 23 de novembro. A semana com mais foi a de 16 de novembro, com pelo menos 4.",
		);
	});

	it("sem semana, diz que não há registro", () => {
		expect(fraseDasSemanas([])).toBe("Nenhum registro ainda.");
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

	it("as participações dizem quem fez as duas etapas e quem fez uma só", () => {
		expect(
			fraseDasParticipacoes({
				pareadas: 20,
				somente_antes: 7,
				somente_depois: 4,
			}),
		).toBe("20 pessoas fizeram as duas etapas, 7 só o antes e 4 só o depois.");
		expect(
			fraseDasParticipacoes({
				pareadas: 1,
				somente_antes: 0,
				somente_depois: 2,
			}),
		).toBe("1 pessoa fez as duas etapas, 0 só o antes e 2 só o depois.");
	});

	it("as tentativas de uma etapa vêm com as pessoas que as fizeram", () => {
		expect(fraseDasTentativas(1203, 980)).toBe(
			"1.203 tentativas de 980 pessoas",
		);
		expect(fraseDasTentativas(1, 1)).toBe("1 tentativa de 1 pessoa");
		expect(fraseDasTentativas(0, 0)).toBe("Nenhuma tentativa");
	});

	it("os pares dizem as duas médias e a diferença, ou a frase da situação", () => {
		expect(
			fraseDosPares({
				antes: { acertos: 5.5, percentual: 45.83 },
				depois: { acertos: 8.5, percentual: 70.83 },
				diferenca_pontos_percentuais: 25,
				situacao: "disponivel",
			}),
		).toBe(
			"A média foi de 45,8% antes e de 70,8% depois: 25 pontos percentuais a mais depois da trilha.",
		);
		expect(
			fraseDosPares({
				antes: { acertos: null, percentual: null },
				depois: { acertos: null, percentual: null },
				diferenca_pontos_percentuais: null,
				situacao: "protecao_de_subgrupo",
			}),
		).toBe("A média não aparece para não revelar um grupo pequeno.");
		// Sem respostas, a frase fala das duas etapas, e não de uma.
		expect(
			fraseDosPares({
				antes: { acertos: null, percentual: null },
				depois: { acertos: null, percentual: null },
				diferenca_pontos_percentuais: null,
				situacao: "sem_respostas",
			}),
		).toBe("Ninguém fez as duas etapas ainda.");
	});
});

describe("a newsletter", () => {
	it("diz quando saiu a última edição, ou que nenhuma saiu", () => {
		expect(fraseDaUltimaEdicao("2026-11-16T13:37:00+00:00")).toBe(
			"A última saiu em 16 de novembro de 2026, às 10h37.",
		);
		expect(fraseDaUltimaEdicao(null)).toBe("Nenhuma edição publicada ainda.");
	});
});

describe("as páginas mais vistas", () => {
	it("a página inicial ganha o nome, e as outras ficam pelo caminho", () => {
		expect(nomeDoCaminho("/")).toBe("Página inicial");
		expect(nomeDoCaminho("/trilhas/constituicao")).toBe(
			"/trilhas/constituicao",
		);
	});

	it("só um caminho deste site vira link", () => {
		expect(linkDoCaminho("/votacoes/139")).toBe("/votacoes/139");
		expect(linkDoCaminho("//outro-site.example.com")).toBeNull();
		expect(linkDoCaminho("https://outro-site.example.com")).toBeNull();
		expect(linkDoCaminho("javascript:alert(1)")).toBeNull();
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
	it("o resumo diz em quantas trilhas houve leitura", () => {
		expect(
			fraseDasTrilhasLidas([
				{ trilha: "constituicao", total: 140 },
				{ trilha: "processo-legislativo", total: 212 },
				{ trilha: "tres-poderes", total: 0 },
			]),
		).toBe("em 2 trilhas");
		expect(fraseDasTrilhasLidas([{ trilha: "constituicao", total: 1 }])).toBe(
			"em 1 trilha",
		);
		expect(fraseDasTrilhasLidas([{ trilha: "constituicao", total: 0 }])).toBe(
			"em nenhuma trilha",
		);
	});

	it("cada trilha diz os artigos lidos e as contas que a concluíram", () => {
		expect(fraseDosLidos(3204)).toBe("3.204 artigos lidos");
		expect(fraseDosLidos(1)).toBe("1 artigo lido");
		expect(fraseDosLidos(0)).toBe("Nenhum artigo lido");
		expect(fraseDasConclusoes(5)).toBe("5 contas concluíram a trilha");
		expect(fraseDasConclusoes(1)).toBe("1 conta concluiu a trilha");
		expect(fraseDasConclusoes(0)).toBe("Nenhuma conta concluiu a trilha");
	});

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
