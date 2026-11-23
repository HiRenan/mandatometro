import { describe, expect, it } from "vitest";
import { classeDaRegiao, ESTADOS, REGIOES, type Regiao } from "./estados";

const siglasDa = (regiao: Regiao) =>
	ESTADOS.filter((estado) => estado.regiao === regiao)
		.map((estado) => estado.sigla)
		.sort();

describe("as regiões dos estados", () => {
	it("cada região tem os estados do IBGE: 7 no Norte, 9 no Nordeste, 4 no Sudeste, 3 no Sul e 4 no Centro-Oeste", () => {
		expect(siglasDa("Norte")).toEqual([
			"AC",
			"AM",
			"AP",
			"PA",
			"RO",
			"RR",
			"TO",
		]);
		expect(siglasDa("Nordeste")).toEqual([
			"AL",
			"BA",
			"CE",
			"MA",
			"PB",
			"PE",
			"PI",
			"RN",
			"SE",
		]);
		expect(siglasDa("Sudeste")).toEqual(["ES", "MG", "RJ", "SP"]);
		expect(siglasDa("Sul")).toEqual(["PR", "RS", "SC"]);
		expect(siglasDa("Centro-Oeste")).toEqual(["DF", "GO", "MS", "MT"]);
		expect(new Set(ESTADOS.map((estado) => estado.sigla)).size).toBe(27);
	});

	it("as fitas vão pela ordem do IBGE: Norte verde, Nordeste amarela, Sudeste azul, Sul rosa e Centro-Oeste vermelha", () => {
		expect(REGIOES.map(classeDaRegiao)).toEqual([
			"fita-verde",
			"fita-amarela",
			"fita-azul",
			"fita-rosa",
			"fita-vermelha",
		]);
	});

	it("a ordem do mapa, que é a do Tab: as regiões na ordem do IBGE e, em cada uma, os nomes em ordem alfabética", () => {
		const naOrdem = [...ESTADOS].sort(
			(a, b) =>
				REGIOES.indexOf(a.regiao) - REGIOES.indexOf(b.regiao) ||
				a.nome.localeCompare(b.nome, "pt-BR"),
		);

		expect(ESTADOS.map((estado) => estado.sigla)).toEqual(
			naOrdem.map((estado) => estado.sigla),
		);
	});
});
