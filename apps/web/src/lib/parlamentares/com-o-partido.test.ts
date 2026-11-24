import { describe, expect, it } from "vitest";
import {
	contraOPartido,
	fraseDoPartido,
	legendaDaBarra,
	maisRecentes,
	motivoSemComparacao,
	textoDaMarca,
} from "./com-o-partido";
import {
	CONTAGEM_ZERADA,
	votoDoParlamentarDeExemplo,
} from "./exemplos-de-teste";

describe("a frase de Com o partido", () => {
	it("diz em quantas votações a pessoa votou com a maioria do partido e contra ela", () => {
		expect(
			fraseDoPartido({ comparaveis: 465, com_o_partido: 290, contra: 175 }),
		).toBe(
			"Votou com a maioria do partido em 290 de 465 votações, e contra ela em 175.",
		);
	});

	it("sem voto contra, termina nas votações", () => {
		expect(
			fraseDoPartido({ comparaveis: 29, com_o_partido: 29, contra: 0 }),
		).toBe("Votou com a maioria do partido em 29 de 29 votações.");
	});

	it("sem voto com a maioria, diz o zero, sem outra palavra", () => {
		expect(
			fraseDoPartido({ comparaveis: 3, com_o_partido: 0, contra: 3 }),
		).toBe(
			"Votou com a maioria do partido em 0 de 3 votações, e contra ela em 3.",
		);
	});

	it("com uma votação só, fica no singular", () => {
		expect(
			fraseDoPartido({ comparaveis: 1, com_o_partido: 1, contra: 0 }),
		).toBe("Votou com a maioria do partido em 1 de 1 votação.");
		expect(
			fraseDoPartido({ comparaveis: 1, com_o_partido: 0, contra: 1 }),
		).toBe(
			"Votou com a maioria do partido em 0 de 1 votação, e contra ela em 1.",
		);
	});

	it("escreve o milhar com o ponto", () => {
		expect(
			fraseDoPartido({ comparaveis: 1530, com_o_partido: 1290, contra: 240 }),
		).toBe(
			"Votou com a maioria do partido em 1.290 de 1.530 votações, e contra ela em 240.",
		);
	});
});

describe("a legenda da barra", () => {
	it("diz o total de votações comparadas, no singular com uma", () => {
		expect(legendaDaBarra(465)).toBe(
			"A barra mostra a parte com a maioria no total de 465 votações comparadas",
		);
		expect(legendaDaBarra(1)).toBe(
			"A barra mostra a parte com a maioria no total de 1 votação comparada",
		);
		expect(legendaDaBarra(1530)).toBe(
			"A barra mostra a parte com a maioria no total de 1.530 votações comparadas",
		);
	});
});

describe("o motivo, sem voto comparado", () => {
	it("só com registros que não entram na conta, diz quantos são e quais entram", () => {
		expect(
			motivoSemComparacao(
				{ ...CONTAGEM_ZERADA, presidente: 10, nao_votou: 20 },
				"Teo Brandal",
			),
		).toBe(
			"Nenhum dos 30 votos registrados de Teo Brandal é Sim, Não, Abstenção ou Obstrução, e só esses entram na conta.",
		);
		expect(
			motivoSemComparacao({ ...CONTAGEM_ZERADA, outro: 1 }, "Teo Brandal"),
		).toBe(
			"O único voto registrado de Teo Brandal não é Sim, Não, Abstenção nem Obstrução, e só esses entram na conta.",
		);
	});

	it("com votos que entram na conta, diz que nenhum pôde ser comparado", () => {
		for (const valor of ["sim", "nao", "abstencao", "obstrucao"] as const) {
			expect(
				motivoSemComparacao(
					{ ...CONTAGEM_ZERADA, [valor]: 1, nao_votou: 2 },
					"Lia Quinemar",
				),
				valor,
			).toBe(
				"Nenhum voto de Lia Quinemar pôde ser comparado com o do partido.",
			);
		}
	});
});

describe("a marca do voto contra a maioria do partido", () => {
	const contra = votoDoParlamentarDeExemplo(139, {
		valor: "nao",
		partido: "PFB",
		maioria_do_partido: "sim",
		com_o_partido: false,
	});

	it("leva a sigla do dia e o voto da maioria", () => {
		expect(contraOPartido(contra)).toEqual({ partido: "PFB", maioria: "sim" });
		expect(textoDaMarca({ partido: "PFB", maioria: "sim" })).toBe(
			"Contra a maioria do PFB, que votou Sim",
		);
	});

	it("escreve cada voto da maioria pelo nome dele", () => {
		expect(
			(["nao", "abstencao", "obstrucao"] as const).map((maioria) =>
				textoDaMarca({ partido: "PFT", maioria }),
			),
		).toEqual([
			"Contra a maioria do PFT, que votou Não",
			"Contra a maioria do PFT, que votou Abstenção",
			"Contra a maioria do PFT, que votou Obstrução",
		]);
	});

	it("vale para os quatro votos que entram na conta", () => {
		for (const valor of ["sim", "abstencao", "obstrucao"] as const) {
			expect(
				contraOPartido({ ...contra, valor, maioria_do_partido: "nao" }),
				valor,
			).toEqual({ partido: "PFB", maioria: "nao" });
		}
	});

	it("não aparece no voto com a maioria, fora da conta ou da API de antes", () => {
		const casos = {
			"com a maioria": {
				...contra,
				valor: "sim" as const,
				com_o_partido: true,
			},
			"fora da comparação": { ...contra, com_o_partido: null },
			"da API de antes": votoDoParlamentarDeExemplo(139, { valor: "nao" }),
		};
		for (const [caso, voto] of Object.entries(casos)) {
			expect(contraOPartido(voto), caso).toBeNull();
		}
	});

	it("não aparece sem a sigla ou sem a maioria", () => {
		const casos = {
			"sigla nula": { ...contra, partido: null },
			"sigla vazia": { ...contra, partido: "" },
			"sem a sigla": { ...contra, partido: undefined },
			"maioria nula": { ...contra, maioria_do_partido: null },
			"sem a maioria": { ...contra, maioria_do_partido: undefined },
		};
		for (const [caso, voto] of Object.entries(casos)) {
			expect(contraOPartido(voto), caso).toBeNull();
		}
	});

	it("não aparece com a sigla ou a maioria fora do formato", () => {
		const casos = {
			"sigla em número": { ...contra, partido: 81 },
			"sigla em objeto": { ...contra, partido: { sigla: "PFB" } },
			"maioria fora dos quatro votos": {
				...contra,
				maioria_do_partido: "presidente",
			},
			"comparação em texto": { ...contra, com_o_partido: "false" },
		};
		for (const [caso, voto] of Object.entries(casos)) {
			expect(contraOPartido(voto as never), caso).toBeNull();
		}
	});

	it("não aparece quando os dados se contradizem", () => {
		const casos = {
			"o voto igual ao da maioria": { ...contra, valor: "sim" },
			"a pessoa não votou": { ...contra, valor: "nao_votou" },
			"a pessoa presidia": { ...contra, valor: "presidente" },
			"outro registro": { ...contra, valor: "outro" },
		} as const;
		for (const [caso, voto] of Object.entries(casos)) {
			expect(contraOPartido(voto), caso).toBeNull();
		}
	});
});

describe("a linha dos mais recentes", () => {
	it("aparece quando há mais votos contra do que a lista mostra", () => {
		expect(maisRecentes(5, 175)).toBe("Os 5 mais recentes de 175");
		expect(maisRecentes(5, 1240)).toBe("Os 5 mais recentes de 1.240");
		expect(maisRecentes(1, 9)).toBe("O mais recente de 9");
	});

	it("fica de fora quando a lista mostra todos", () => {
		expect(maisRecentes(5, 5)).toBeNull();
		expect(maisRecentes(3, 3)).toBeNull();
	});
});
