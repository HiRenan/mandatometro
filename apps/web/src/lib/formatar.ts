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
	return `${formatarDia(data)} de ${Number(data.split("-")[0])}`;
}

/**
 * "2026-11-09" vira "9 de novembro", sem o ano: para quando o texto ao lado já
 * diz o ano, como a publicação na faixa da edição, ao lado do período.
 */
export function formatarDia(data: string): string {
	const [, mes, dia] = data.split("-").map(Number);
	return `${dia === 1 ? "1º" : dia} de ${MESES[mes - 1]}`;
}

/**
 * O período de uma edição, do primeiro ao último dia: "9 a 15 de novembro de
 * 2026", "30 de novembro a 6 de dezembro de 2026" ou, na virada do ano, as duas
 * datas inteiras. Um dia só é a data. À mão, como o formatarData.
 */
export function formatarPeriodo(inicio: string, fim: string): string {
	const [anoDoInicio, mesDoInicio, diaDoInicio] = inicio.split("-").map(Number);
	const [anoDoFim, mesDoFim] = fim.split("-").map(Number);
	if (anoDoInicio !== anoDoFim) {
		return `${formatarData(inicio)} a ${formatarData(fim)}`;
	}
	const ultimo = formatarData(fim);
	if (inicio === fim) {
		return ultimo;
	}
	const primeiro = diaDoInicio === 1 ? "1º" : String(diaDoInicio);
	if (mesDoInicio !== mesDoFim) {
		return `${primeiro} de ${MESES[mesDoInicio - 1]} a ${ultimo}`;
	}
	return `${primeiro} a ${ultimo}`;
}

/** Três horas, em milissegundos: Brasília fica no UTC−3 o ano todo desde 2019. */
const FUSO_DE_BRASILIA = 3 * 60 * 60 * 1000;

/**
 * O dia em Brasília de um horário da API ("2026-11-14T01:30:00+00:00" vira
 * "2026-11-13"), para o formatarData. A conta é à mão, com o UTC−3 fixo (o Brasil
 * não tem horário de verão desde 2019), para o servidor e o navegador escreverem
 * igual na hidratação, em qualquer fuso. Um horário que não se lê fica com os dez
 * primeiros caracteres.
 */
export function dataEmBrasilia(horario: string): string {
	const instante = Date.parse(horario);
	if (Number.isNaN(instante)) {
		return horario.slice(0, 10);
	}
	return new Date(instante - FUSO_DE_BRASILIA).toISOString().slice(0, 10);
}

const MESES_CURTOS = MESES.map((mes) => mes.slice(0, 3));

/**
 * O dia com dois algarismos e o mês abreviado, como na folhinha: "2026-11-08"
 * vira { dia: "08", mes: "nov" }. O CSS põe o mês em maiúsculas.
 */
export function diaEMes(data: string): { dia: string; mes: string } {
	const [, mes, dia] = data.split("-").map(Number);
	return {
		dia: String(dia).padStart(2, "0"),
		mes: MESES_CURTOS[mes - 1],
	};
}

/**
 * A posição da semana de um dia no calendário, de segunda a domingo, a partir
 * de 1: as semanas seguidas ficam em posições seguidas. É a posição de cada
 * edição para o classeDaFita e o azulejoDaPosicao: a cor muda de uma semana para
 * a outra nas cinco fitas, igual na lista e na página, e ninguém escolhe a cor
 * de uma edição (o Renan, na #39: sem vermelho de domingo).
 */
export function posicaoDaSemana(data: string): number {
	const [ano, mes, dia] = data.split("-").map(Number);
	const dias = Date.UTC(ano, mes - 1, dia) / 86_400_000;
	// 1º/1/1970 foi uma quinta: a segunda daquela semana é o dia -3.
	return Math.floor((dias + 3) / 7) + 1;
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
