// Gerado por vozes/gerar.mjs: não edite à mão.
//
// As falas que têm narração gravada em public/jogo/vo/<jogo>/. A tela só toca
// o que está aqui, e uma fala de fora segue sem voz
// (docs/jogo-das-comissoes.md). Cada item é "<jogo>/<id da fala>": o id se
// repete entre os jogos, e quem separa é a pasta.

export const VOZES: readonly string[] = [
	"comissoes/c1-01",
	"comissoes/c1-02",
	"comissoes/c1-03",
	"comissoes/c1-04",
	"comissoes/c1-05",
	"comissoes/c1-06",
	"comissoes/c1-07",
	"comissoes/c2-01",
	"comissoes/c2-02",
	"comissoes/c2-03",
	"comissoes/c2-04",
	"comissoes/c2-05",
	"comissoes/c2-06",
	"comissoes/c2-07",
	"comissoes/c2-08",
	"comissoes/c2-09",
	"comissoes/c2-10",
	"comissoes/c2-11",
	"comissoes/c3-01",
	"comissoes/c3-02",
	"comissoes/c3-03",
	"comissoes/c3-04",
	"comissoes/c3-05",
	"comissoes/c3-06",
	"comissoes/c3-07",
	"comissoes/c3-08",
	"comissoes/c3-09",
	"comissoes/c4-01",
	"comissoes/c4-02",
	"comissoes/c4-03",
	"comissoes/c4-04",
	"comissoes/c4-05",
	"comissoes/c4-06",
	"comissoes/c4-07",
	"comissoes/c4-08",
	"comissoes/c4-09",
	"comissoes/c4-10",
	"comissoes/c4-11",
	"comissoes/c4-12",
	"comissoes/c5-01",
	"comissoes/c5-02",
	"comissoes/c5-03",
	"comissoes/c5-04",
	"comissoes/c5-05",
	"comissoes/c5-06",
	"comissoes/c5-07",
];

export function temVoz(jogo: string, id: string): boolean {
	return VOZES.includes(`${jogo}/${id}`);
}

export function enderecoDaVoz(jogo: string, id: string): string {
	return `/jogo/vo/${jogo}/${id}.mp3`;
}
