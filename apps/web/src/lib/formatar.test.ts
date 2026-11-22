import { describe, expect, it } from "vitest";
import {
	classeDaFita,
	dataEmBrasilia,
	diaEMes,
	dominio,
	fitaDaPosicao,
	formatarData,
	formatarDia,
	formatarMes,
	formatarPeriodo,
	fraseDoProgresso,
	idDoPasso,
	pedacosDoDominio,
	plural,
	posicaoDaSemana,
	tamanhoDaTrilha,
} from "./formatar";

describe("formatarData", () => {
	it("escreve a data por extenso, sem depender do fuso", () => {
		expect(formatarData("2026-11-09")).toBe("9 de novembro de 2026");
		expect(formatarData("2026-03-01")).toBe("1º de março de 2026");
	});
});

describe("formatarMes", () => {
	it("escreve o mês e o ano por extenso", () => {
		expect(formatarMes("2026-10")).toBe("outubro de 2026");
		expect(formatarMes("2014-01")).toBe("janeiro de 2014");
		expect(formatarMes("2025-12")).toBe("dezembro de 2025");
	});
});

describe("plural", () => {
	it("concorda a palavra com a quantidade", () => {
		expect(plural(1, "artigo", "artigos")).toBe("1 artigo");
		expect(plural(3, "artigo", "artigos")).toBe("3 artigos");
		expect(plural(0, "artigo", "artigos")).toBe("0 artigos");
	});
});

describe("dominio", () => {
	it("mostra o site da fonte sem o www", () => {
		expect(
			dominio("https://www.camara.leg.br/entenda-o-processo-legislativo/"),
		).toBe("camara.leg.br");
		expect(
			dominio("https://www12.senado.leg.br/noticias/glossario-legislativo"),
		).toBe("senado.leg.br");
		expect(
			dominio(
				"https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art61",
			),
		).toBe("normas.leg.br");
	});
});

describe("pedacosDoDominio", () => {
	it("parte o site da fonte antes de cada ponto, para a linha quebrar ali", () => {
		expect(
			pedacosDoDominio("https://direitoshumanos.dpu.def.br/defensoria/"),
		).toEqual(["direitoshumanos", ".dpu", ".def", ".br"]);
		expect(
			pedacosDoDominio("https://www.congressonacional.leg.br/materias"),
		).toEqual(["congressonacional", ".leg", ".br"]);
	});

	it("junta os pedaços no mesmo texto do dominio", () => {
		const url = "https://www12.senado.leg.br/noticias/glossario-legislativo";
		expect(pedacosDoDominio(url).join("")).toBe(dominio(url));
	});
});

describe("a fita da posição", () => {
	it("segue a ordem das cinco fitas e volta à primeira na sexta posição", () => {
		expect([1, 2, 3, 4, 5, 6].map(fitaDaPosicao)).toEqual([
			"verde",
			"amarela",
			"azul",
			"rosa",
			"vermelha",
			"verde",
		]);
	});

	it("dá a classe que põe a cor da fita no elemento", () => {
		expect(classeDaFita(1)).toBe("fita-verde");
		expect(classeDaFita(5)).toBe("fita-vermelha");
		expect(classeDaFita(7)).toBe("fita-amarela");
	});
});

describe("fraseDoProgresso", () => {
	it("diz quantos artigos a pessoa leu, e nada antes do primeiro", () => {
		expect(fraseDoProgresso(0, 3)).toBe("");
		expect(fraseDoProgresso(1, 3)).toBe("Você leu 1 de 3.");
		expect(fraseDoProgresso(3, 3)).toBe("Você terminou a trilha.");
	});
});

describe("tamanhoDaTrilha", () => {
	it("diz quantos artigos a trilha tem e quantos minutos de leitura somam", () => {
		const artigos = [{ minutos: 2 }, { minutos: 2 }, { minutos: 2 }];
		expect(tamanhoDaTrilha(artigos)).toBe("3 artigos · 6 min de leitura");
		expect(tamanhoDaTrilha([{ minutos: 3 }])).toBe(
			"1 artigo · 3 min de leitura",
		);
	});
});

describe("idDoPasso", () => {
	it("faz o endereço do passo pelo título, sem acento nem espaço", () => {
		expect(idDoPasso("Apresentação")).toBe("passo-apresentacao");
		expect(idDoPasso("Plenário")).toBe("passo-plenario");
		expect(idDoPasso("A outra Casa")).toBe("passo-a-outra-casa");
		expect(idDoPasso("Sanção ou veto")).toBe("passo-sancao-ou-veto");
	});
});

describe("formatarPeriodo", () => {
	it("no mesmo mês, escreve o mês e o ano uma vez", () => {
		expect(formatarPeriodo("2026-11-09", "2026-11-15")).toBe(
			"9 a 15 de novembro de 2026",
		);
	});

	it("na virada do mês, escreve os dois meses", () => {
		expect(formatarPeriodo("2026-11-30", "2026-12-06")).toBe(
			"30 de novembro a 6 de dezembro de 2026",
		);
	});

	it("na virada do ano, escreve os dois anos", () => {
		expect(formatarPeriodo("2026-12-28", "2027-01-03")).toBe(
			"28 de dezembro de 2026 a 3 de janeiro de 2027",
		);
	});

	it("o primeiro dia do mês é 1º, e um dia só é a data", () => {
		expect(formatarPeriodo("2026-12-01", "2026-12-07")).toBe(
			"1º a 7 de dezembro de 2026",
		);
		expect(formatarPeriodo("2026-11-26", "2026-12-01")).toBe(
			"26 de novembro a 1º de dezembro de 2026",
		);
		expect(formatarPeriodo("2026-11-15", "2026-11-15")).toBe(
			"15 de novembro de 2026",
		);
	});

	it("o dia sem o ano, para quando o texto ao lado já diz o ano", () => {
		expect(formatarDia("2026-11-16")).toBe("16 de novembro");
		expect(formatarDia("2026-12-01")).toBe("1º de dezembro");
	});
});

describe("dataEmBrasilia", () => {
	it("dá o dia em Brasília, três horas antes do UTC, sem depender do fuso", () => {
		expect(dataEmBrasilia("2026-11-14T01:30:00+00:00")).toBe("2026-11-13");
		expect(dataEmBrasilia("2026-11-14T03:00:00Z")).toBe("2026-11-14");
		expect(dataEmBrasilia("2026-11-13T22:30:00-03:00")).toBe("2026-11-13");
		// O Python manda os microssegundos.
		expect(dataEmBrasilia("2026-11-16T13:05:00.123456+00:00")).toBe(
			"2026-11-16",
		);
	});

	it("uma data que não é data fica com os dez primeiros caracteres", () => {
		expect(dataEmBrasilia("2026-11-16 algo")).toBe("2026-11-16");
	});
});

describe("diaEMes", () => {
	it("dá o dia com dois algarismos e o mês abreviado, como na folhinha", () => {
		expect(diaEMes("2026-11-15")).toEqual({ dia: "15", mes: "nov" });
		expect(diaEMes("2026-03-08")).toEqual({ dia: "08", mes: "mar" });
	});
});

describe("posicaoDaSemana", () => {
	/** O dia, `dias` dias depois de `data`. */
	function depois(data: string, dias: number): string {
		const [ano, mes, dia] = data.split("-").map(Number);
		return new Date(Date.UTC(ano, mes - 1, dia + dias))
			.toISOString()
			.slice(0, 10);
	}

	it("a semana de segunda a domingo tem uma posição só", () => {
		const domingo = posicaoDaSemana("2026-11-15");
		expect(posicaoDaSemana("2026-11-09")).toBe(domingo);
		expect(posicaoDaSemana("2026-11-12")).toBe(domingo);
	});

	it("a segunda depois do domingo já é a semana seguinte", () => {
		expect(posicaoDaSemana("2026-11-16")).toBe(
			posicaoDaSemana("2026-11-15") + 1,
		);
		expect(posicaoDaSemana("2026-11-22")).toBe(
			posicaoDaSemana("2026-11-15") + 1,
		);
	});

	it("cinco semanas seguidas levam as cinco fitas", () => {
		const fitas = [0, 1, 2, 3, 4].map((semana) =>
			fitaDaPosicao(posicaoDaSemana(depois("2026-11-15", 7 * semana))),
		);
		expect(new Set(fitas).size).toBe(5);
		expect(posicaoDaSemana("2026-11-15")).toBeGreaterThan(0);
	});
});
