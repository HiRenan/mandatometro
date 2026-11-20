// Gerado por vozes/gerar.mjs: não edite à mão.
//
// As falas que têm narração gravada em public/jogo/vo/. A tela só toca o que
// está aqui, e uma fala de fora segue sem voz (docs/jogo-das-comissoes.md).

export const VOZES: readonly string[] = [
	"c1-01",
	"c1-02",
	"c1-03",
	"c1-04",
	"c1-05",
	"c1-06",
	"c1-07",
	"c2-01",
	"c2-02",
	"c2-03",
	"c2-04",
	"c2-05",
	"c2-06",
	"c2-07",
	"c2-08",
	"c2-09",
	"c2-10",
	"c2-11",
	"c3-01",
	"c3-02",
	"c3-03",
	"c3-04",
	"c3-05",
	"c3-06",
	"c3-07",
	"c3-08",
	"c3-09",
	"c4-01",
	"c4-02",
	"c4-03",
	"c4-04",
	"c4-05",
	"c4-06",
	"c4-07",
	"c4-08",
	"c4-09",
	"c4-10",
	"c4-11",
	"c4-12",
	"c5-01",
	"c5-02",
	"c5-03",
	"c5-04",
	"c5-05",
	"c5-06",
	"c5-07",
];

export function temVoz(id: string): boolean {
	return VOZES.includes(id);
}

export function enderecoDaVoz(id: string): string {
	return `/jogo/vo/${id}.mp3`;
}
