// Gerado por vozes/gerar.mjs: não edite à mão.
//
// As falas que têm narração gravada em public/jogo/vo/. A tela só toca o que
// está aqui, e uma fala de fora segue sem voz (docs/jogo-das-comissoes.md).

export const VOZES: readonly string[] = [];

export function temVoz(id: string): boolean {
	return VOZES.includes(id);
}

export function enderecoDaVoz(id: string): string {
	return `/jogo/vo/${id}.mp3`;
}
