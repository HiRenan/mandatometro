import { describe, expect, it } from "vitest";
import {
	CONTAGEM_ZERADA,
	votacaoDeExemplo,
	votoNominalDeExemplo,
} from "./exemplos-de-teste";
import {
	ABERTOS_ATE,
	agruparPorVoto,
	EXPLICACAO_DO_VOTO,
	filtrarVotos,
	gruposAbertos,
	opcoesDoFiltro,
	partidoDaBusca,
	SEM_PARTIDO,
	totalDaContagem,
	VALORES,
	valoresDaContagem,
} from "./votos";

const { votos } = votacaoDeExemplo();

describe("os grupos de quem votou como", () => {
	it("seguem a ordem do placar, sem o grupo vazio", () => {
		expect(
			agruparPorVoto(votos).map(({ valor, votos }) => [
				valor,
				votos.map((voto) => voto.parlamentar_id),
			]),
		).toEqual([
			["sim", [81, 90]],
			["nao", [82]],
			["presidente", [92]],
			["nao_votou", [83]],
		]);
	});

	it("vêm abertos até 100 nomes e fechados acima disso", () => {
		expect(ABERTOS_ATE).toBe(100);
		expect(gruposAbertos(81)).toBe(true);
		expect(gruposAbertos(100)).toBe(true);
		expect(gruposAbertos(101)).toBe(false);
		expect(gruposAbertos(513)).toBe(false);
	});
});

describe("os filtros", () => {
	it("filtram pelo estado, pelo partido e pelos dois juntos", () => {
		const ids = (filtro: Parameters<typeof filtrarVotos>[1]) =>
			filtrarVotos(votos, filtro).map((voto) => voto.parlamentar_id);

		expect(ids({})).toEqual([81, 82, 83, 90, 92]);
		expect(ids({ uf: "BA" })).toEqual([90, 92]);
		expect(ids({ partido: "PRV" })).toEqual([90, 92]);
		expect(ids({ uf: "SC", partido: "PRV" })).toEqual([]);
		expect(ids({ partido: SEM_PARTIDO })).toEqual([83]);
	});

	it("as opções trazem só o que aparece na votação, em ordem, e o sem partido à parte", () => {
		expect(opcoesDoFiltro(votos)).toEqual({
			ufs: ["BA", "SC"],
			partidos: ["PFT", "PNX", "PRV"],
			semPartido: true,
		});
		expect(opcoesDoFiltro([votoNominalDeExemplo()]).semPartido).toBe(false);
	});

	it("o partido do endereço fica como veio, e o valor estranho é ignorado", () => {
		expect(partidoDaBusca("PFT")).toBe("PFT");
		expect(partidoDaBusca("PCdoX")).toBe("PCdoX");
		expect(partidoDaBusca(SEM_PARTIDO)).toBe(SEM_PARTIDO);
		for (const valor of ["", " PFT", "<b>", "P".repeat(21), 7, undefined]) {
			expect(partidoDaBusca(valor), String(valor)).toBeUndefined();
		}
	});
});

describe("as contagens e as explicações", () => {
	it("o Outro registro só aparece quando passa de zero", () => {
		expect(valoresDaContagem(CONTAGEM_ZERADA)).not.toContain("outro");
		expect(valoresDaContagem({ ...CONTAGEM_ZERADA, outro: 1 })).toContain(
			"outro",
		);
		expect(totalDaContagem({ ...CONTAGEM_ZERADA, sim: 2, outro: 1 })).toBe(3);
	});

	it("cada regra traz o artigo dos dois regimentos; o que descreve os dados, nenhum", () => {
		for (const valor of VALORES) {
			const { artigos } = EXPLICACAO_DO_VOTO[valor];
			const descreveOsDados = valor === "nao_votou" || valor === "outro";
			expect(
				artigos.map((artigo) => artigo.casa),
				valor,
			).toEqual(descreveOsDados ? [] : ["camara", "senado"]);
		}
	});
});
