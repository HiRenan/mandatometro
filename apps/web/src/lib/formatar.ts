const MESES = [
	"janeiro",
	"fevereiro",
	"março",
	"abril",
	"maio",
	"junho",
	"julho",
	"agosto",
	"setembro",
	"outubro",
	"novembro",
	"dezembro",
];

/**
 * "2026-11-09" vira "9 de novembro de 2026". Formata à mão, e não com o Intl,
 * para o servidor e o navegador escreverem igual na hidratação.
 */
export function formatarData(data: string): string {
	const [ano, mes, dia] = data.split("-").map(Number);
	return `${dia === 1 ? "1º" : dia} de ${MESES[mes - 1]} de ${ano}`;
}

export function plural(
	quantidade: number,
	singular: string,
	maisDeUm: string,
): string {
	return `${quantidade} ${quantidade === 1 ? singular : maisDeUm}`;
}

/**
 * O tamanho da trilha, com os números da faixa da página dela: "3 artigos · 6
 * min de leitura". A página inicial mostra acima do botão, antes de a pessoa ler.
 */
export function tamanhoDaTrilha(artigos: { minutos: number }[]): string {
	const minutos = artigos.reduce((soma, artigo) => soma + artigo.minutos, 0);
	return `${plural(artigos.length, "artigo", "artigos")} · ${minutos} min de leitura`;
}

/**
 * O endereço de um passo do caminho, pelo título, sem acento nem espaço:
 * "Sanção ou veto" vira "passo-sancao-ou-veto". O infográfico da trilha dá esse
 * id ao título do passo, e a página inicial leva até ele.
 */
export function idDoPasso(titulo: string): string {
	const palavras = titulo
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return `passo-${palavras}`;
}

/** O progresso na trilha em palavras, igual na lista das trilhas e na trilha. */
export function fraseDoProgresso(lidos: number, total: number): string {
	if (lidos === 0) {
		return "";
	}
	return lidos === total
		? "Você terminou a trilha."
		: `Você leu ${lidos} de ${total}.`;
}

/**
 * "art. 58" e "§ 2º" ficam numa linha só: o espaço depois de "art." e de "§"
 * vira o espaço que não quebra, e o número não fica sozinho na linha de baixo.
 */
export function semQuebrarCitacao(texto: string): string {
	return texto.replace(/(\barts?\.|§) (?=\d)/g, "$1\u00a0");
}

/** O site da fonte, como a pessoa reconhece: camara.leg.br, senado.leg.br. */
export function dominio(url: string): string {
	return new URL(url).hostname.replace(/^www\d*\./, "");
}

/**
 * O site da fonte em pedaços, cada um começando no ponto: "direitoshumanos",
 * ".dpu", ".def", ".br". Com a letra grande, abaixo de 20rem, a lista de fontes
 * põe uma quebra possível antes de cada ponto, e o endereço que não cabe na linha
 * quebra ali (o Renan, na #76: "Nos pontos").
 */
export function pedacosDoDominio(url: string): string[] {
	return dominio(url).split(/(?=\.)/);
}

/** As cinco fitas do Bonfim, na ordem em que aparecem juntas. */
export const FITAS = ["verde", "amarela", "azul", "rosa", "vermelha"] as const;

export type Fita = (typeof FITAS)[number];

/**
 * A fita de uma posição, a partir de 1: cada artigo, cada passo e cada trilha tem
 * a sua, pela ordem, e a sexta posição volta à primeira fita. Ninguém escolhe a
 * cor por assunto, partido ou humor.
 */
export function fitaDaPosicao(posicao: number): Fita {
	return FITAS[(posicao - 1) % FITAS.length];
}

/**
 * A classe que dá a um elemento a fita da posição dele: ela põe a cor na variável
 * --fita (index.css), que o número, o fio do desvio e o marcador leem.
 */
export function classeDaFita(posicao: number): string {
	return `fita-${fitaDaPosicao(posicao)}`;
}
