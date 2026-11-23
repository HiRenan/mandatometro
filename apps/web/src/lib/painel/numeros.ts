import type {
	MediaEtapa,
	MediaPiloto,
	SituacaoPiloto,
	TotalDiario,
	TotalSemanal,
	TotalTrilha,
} from "@/lib/contrato-da-297";
import {
	comMilhares,
	dataEmBrasilia,
	diaEMes,
	formatarData,
	formatarDia,
} from "@/lib/formatar";

// Os números do painel (/painel/numeros), prontos para a tela. A conta é da API
// (a #297): aqui só se escrevem os números, as datas e as frases, e se mede a
// barra de cada valor. As duas somas da tela, os 30 dias das visitas e as
// leituras das trilhas, a Atena liberou em 23/11/2026: são somas simples, sem
// supressão envolvida.

/** Três horas, em milissegundos: Brasília fica no UTC−3 o ano todo desde 2019. */
const FUSO_DE_BRASILIA = 3 * 60 * 60 * 1000;

/** O número com uma casa, com vírgula, sem a casa quando ela é zero: 5.6 vira "5,6". */
function comUmaCasa(numero: number): string {
	const arredondado = Math.round(numero * 10) / 10;
	const [inteiro, casa] = Math.abs(arredondado).toFixed(1).split(".");
	const sinal = arredondado < 0 ? "-" : "";
	return `${sinal}${comMilhares(Number(inteiro))}${casa === "0" ? "" : `,${casa}`}`;
}

/** A porcentagem com uma casa: 46.67 vira "46,7%", e 72.0, "72%". */
export function porcentagem(valor: number): string {
	return `${comUmaCasa(valor)}%`;
}

/** A soma dos totais de uma lista, como as visitas dos 30 dias. */
export function somaDosTotais(lista: readonly { total: number }[]): number {
	return lista.reduce((soma, { total }) => soma + total, 0);
}

/**
 * A parte de cada valor no maior deles, de 0 a 1: o tamanho da barra. Sem valor
 * acima de zero, nenhuma barra aparece.
 */
export function partesDoMaior(valores: readonly number[]): number[] {
	const maior = Math.max(0, ...valores);
	return valores.map((valor) => (maior > 0 ? valor / maior : 0));
}

/**
 * O total da semana de hoje: a lista vai da primeira semana com evento até a
 * semana atual, com zero nas semanas vazias, e a última é a de hoje.
 */
export function fraseDaSemanaAtual(semanas: readonly TotalSemanal[]): string {
	return `${comMilhares(semanas.at(-1)?.total ?? 0)} nesta semana`;
}

/** O item de maior total, o primeiro quando empata, ou nenhum sem total acima de zero. */
export function oDeMaisTotal<T extends { total: number }>(
	lista: readonly T[],
): T | undefined {
	let maior: T | undefined;
	for (const item of lista) {
		if (item.total > (maior?.total ?? 0)) {
			maior = item;
		}
	}
	return maior;
}

/** O dia com mais visitas, o primeiro quando empata, ou nenhum sem visita. */
export function diaDeMaisVisitas(
	dias: readonly TotalDiario[],
): TotalDiario | undefined {
	return oDeMaisTotal(dias);
}

/** O dia curto, nas pontas dos gráficos: "2026-10-25" vira "25 out". */
export function diaCurto(dia: string): string {
	const { dia: numero, mes } = diaEMes(dia);
	return `${numero === "01" ? "1º" : Number(numero)} ${mes}`;
}

/**
 * As semanas em palavras, para quem não vê as colunas: a semana de hoje, que é a
 * última da lista, e a semana com mais. No número que é um mínimo, como as
 * contas ativas, a frase diz "pelo menos".
 */
export function fraseDasSemanas(
	semanas: readonly TotalSemanal[],
	{ minimo = false }: { minimo?: boolean } = {},
): string {
	const atual = semanas.at(-1);
	if (!atual) {
		return "Nenhum registro ainda.";
	}
	const quantos = (total: number) =>
		minimo && total > 0
			? `pelo menos ${comMilhares(total)}`
			: comMilhares(total);
	const hoje = quantos(atual.total);
	const comeco = `${hoje.charAt(0).toUpperCase()}${hoje.slice(1)} na semana de ${formatarDia(atual.semana)}`;
	const maior = oDeMaisTotal(semanas);
	if (semanas.length === 1 || !maior) {
		return `${comeco}.`;
	}
	if (maior === atual) {
		return `${comeco}, a semana com mais até agora.`;
	}
	return `${comeco}. A semana com mais foi a de ${formatarDia(maior.semana)}, com ${quantos(maior.total)}.`;
}

/**
 * Os 30 dias em palavras, para quem não vê as colunas: o período, as páginas
 * vistas e o dia com mais visitas.
 */
export function fraseDasVisitas(dias: readonly TotalDiario[]): string {
	const primeiro = dias.at(0);
	const ultimo = dias.at(-1);
	if (!primeiro || !ultimo) {
		return "Nenhuma página vista nos últimos 30 dias.";
	}
	const periodo =
		primeiro.dia === ultimo.dia
			? `Em ${formatarDia(ultimo.dia)}`
			: `De ${formatarDia(primeiro.dia)} a ${formatarDia(ultimo.dia)}`;
	const soma = somaDosTotais(dias);
	const maior = diaDeMaisVisitas(dias);
	if (soma === 0 || !maior) {
		return `${periodo}, nenhuma página vista.`;
	}
	const paginas = soma === 1 ? "página vista" : "páginas vistas";
	return `${periodo}, ${comMilhares(soma)} ${paginas}. O dia com mais visitas foi ${formatarDia(maior.dia)}, com ${comMilhares(maior.total)}.`;
}

/** A hora de um horário da API em Brasília: "2026-11-23T17:05:00Z" vira "14h05". */
export function horaEmBrasilia(horario: string): string {
	const instante = Date.parse(horario);
	if (Number.isNaN(instante)) {
		return "";
	}
	const [horas, minutos] = new Date(instante - FUSO_DE_BRASILIA)
		.toISOString()
		.slice(11, 16)
		.split(":");
	return `${Number(horas)}h${minutos}`;
}

/** O dia e a hora de um horário da API, em Brasília: "16 de novembro de 2026, às 10h37". */
function diaEHora(horario: string): string {
	return `${formatarData(dataEmBrasilia(horario))}, às ${horaEmBrasilia(horario)}`;
}

/** A última coleta de uma fonte, em Brasília, ou que ela nunca aconteceu. */
export function fraseDaColeta(horario: string | null): string {
	return horario ? diaEHora(horario) : "Nunca coletada";
}

/** Quando a última edição saiu, ou que nenhuma saiu ainda. */
export function fraseDaUltimaEdicao(horario: string | null): string {
	return horario
		? `A última saiu em ${diaEHora(horario)}.`
		: "Nenhuma edição publicada ainda.";
}

/**
 * Quando a tela leu os números, na faixa: a hora da resposta, em Brasília. A API
 * não manda a hora dela, e a página não guarda os números entre as visitas.
 */
export function fraseDaLeitura(instante: string): string {
	return `Lidos em ${formatarDia(dataEmBrasilia(instante))}, às ${horaEmBrasilia(instante)}`;
}

/** O que a tela diz no lugar de uma média que a API não manda. */
const FRASE_DA_SITUACAO: Record<SituacaoPiloto, string> = {
	sem_respostas: "Ninguém respondeu esta etapa ainda.",
	amostra_pequena:
		"Poucas respostas: a média só aparece a partir de 5 pessoas.",
	protecao_de_subgrupo:
		"A média não aparece para não revelar um grupo pequeno.",
	disponivel: "A média não veio nesta resposta.",
};

export type MediaNaTela =
	| { tipo: "numero"; porcentagem: string; acertos: string }
	| { tipo: "frase"; frase: string };

/**
 * A média de uma etapa do piloto: a porcentagem de acertos e os acertos em
 * média, ou a frase da situação quando a API não manda o número (o grupo
 * pequeno). Nunca um zero no lugar do número que não veio.
 */
export function mediaNaTela(
	media: Pick<MediaEtapa, "acertos" | "percentual" | "situacao">,
	totalDePerguntas: number,
): MediaNaTela {
	if (
		media.situacao === "disponivel" &&
		media.percentual !== null &&
		media.acertos !== null
	) {
		return {
			tipo: "numero",
			porcentagem: porcentagem(media.percentual),
			acertos: `${comUmaCasa(media.acertos)} de ${totalDePerguntas} perguntas`,
		};
	}
	return { tipo: "frase", frase: FRASE_DA_SITUACAO[media.situacao] };
}

/** A diferença dos pares, de antes para depois da trilha, em palavras. */
export function diferencaNaTela(pares: {
	diferenca_pontos_percentuais: number | null;
	situacao: SituacaoPiloto;
}): string {
	const diferenca = pares.diferenca_pontos_percentuais;
	if (pares.situacao !== "disponivel" || diferenca === null) {
		return FRASE_DA_SITUACAO[pares.situacao];
	}
	const pontos = Math.round(diferenca * 10) / 10;
	if (pontos === 0) {
		return "a mesma média antes e depois da trilha";
	}
	const quantos = comUmaCasa(Math.abs(pontos));
	const unidade = quantos === "1" ? "ponto percentual" : "pontos percentuais";
	return `${quantos} ${unidade} a ${pontos > 0 ? "mais" : "menos"} depois da trilha`;
}

/** Quem fez as duas etapas do piloto e quem fez uma só. */
export function fraseDasParticipacoes({
	pareadas,
	somente_antes,
	somente_depois,
}: {
	pareadas: number;
	somente_antes: number;
	somente_depois: number;
}): string {
	const fizeram =
		pareadas === 1
			? "1 pessoa fez"
			: `${comMilhares(pareadas)} pessoas fizeram`;
	return `${fizeram} as duas etapas, ${comMilhares(somente_antes)} só o antes e ${comMilhares(somente_depois)} só o depois.`;
}

/** As tentativas de uma etapa do piloto e as pessoas que as fizeram. */
export function fraseDasTentativas(
	tentativas: number,
	pessoas: number,
): string {
	if (tentativas === 0) {
		return "Nenhuma tentativa";
	}
	const deQuem = `${comMilhares(pessoas)} ${pessoas === 1 ? "pessoa" : "pessoas"}`;
	return `${comMilhares(tentativas)} ${tentativas === 1 ? "tentativa" : "tentativas"} de ${deQuem}`;
}

/**
 * Quem fez as duas etapas: a média antes e depois e a diferença, ou a frase da
 * situação quando a API não manda os números.
 */
export function fraseDosPares(pares: {
	antes: MediaPiloto;
	depois: MediaPiloto;
	diferenca_pontos_percentuais: number | null;
	situacao: SituacaoPiloto;
}): string {
	const antes = pares.antes.percentual;
	const depois = pares.depois.percentual;
	if (
		pares.situacao !== "disponivel" ||
		pares.diferenca_pontos_percentuais === null ||
		antes === null ||
		depois === null
	) {
		// Sem respostas, a frase das médias fala de uma etapa; a dos pares, das duas.
		return pares.situacao === "sem_respostas"
			? "Ninguém fez as duas etapas ainda."
			: FRASE_DA_SITUACAO[pares.situacao];
	}
	return `A média foi de ${porcentagem(antes)} antes e de ${porcentagem(depois)} depois: ${diferencaNaTela(pares)}.`;
}

/**
 * Quem voltou depois da semana do cadastro. O número é um mínimo: o login vem
 * das sessões que ainda estão guardadas.
 */
export function fraseDosQueVoltaram(quantas: number): string {
	if (quantas === 0) {
		return "Nenhuma volta registrada depois da semana do cadastro.";
	}
	return quantas === 1
		? "Pelo menos 1 conta voltou depois da semana do cadastro."
		: `Pelo menos ${comMilhares(quantas)} contas voltaram depois da semana do cadastro.`;
}

/** Em quantas trilhas houve leitura, para o resumo: "em 2 trilhas". */
export function fraseDasTrilhasLidas(lidos: readonly TotalTrilha[]): string {
	const quantas = lidos.filter(({ total }) => total > 0).length;
	if (quantas === 0) {
		return "em nenhuma trilha";
	}
	return quantas === 1 ? "em 1 trilha" : `em ${quantas} trilhas`;
}

/** Os artigos lidos de uma trilha, nas contas. */
export function fraseDosLidos(quantos: number): string {
	if (quantos === 0) {
		return "Nenhum artigo lido";
	}
	return quantos === 1
		? "1 artigo lido"
		: `${comMilhares(quantos)} artigos lidos`;
}

/** As contas que marcaram todos os artigos de uma trilha. */
export function fraseDasConclusoes(quantas: number): string {
	if (quantas === 0) {
		return "Nenhuma conta concluiu a trilha";
	}
	return quantas === 1
		? "1 conta concluiu a trilha"
		: `${comMilhares(quantas)} contas concluíram a trilha`;
}

/** O nome de uma página mais vista: o caminho, e a inicial pelo nome. */
export function nomeDoCaminho(caminho: string): string {
	return caminho === "/" ? "Página inicial" : caminho;
}

/**
 * O link de uma página mais vista: só um caminho deste site, que começa com uma
 * barra só. A API só conta as páginas públicas, e a tela confere de novo.
 */
export function linkDoCaminho(caminho: string): string | null {
	return caminho.startsWith("/") && !caminho.startsWith("//") ? caminho : null;
}

export type TrilhaNoUso = {
	slug: string;
	titulo: string;
	/** A posição da trilha no catálogo do site, a partir de 1: a fita dela. */
	posicao: number;
	lidos: number;
	concluidas: number;
};

/**
 * As trilhas do uso, com o nome e a ordem do catálogo do site: a posição dá a
 * fita, a mesma da lista das trilhas. Uma trilha que o catálogo não tem vai no
 * fim, com o slug.
 */
export function trilhasDoUso(
	lidos: readonly TotalTrilha[],
	concluidas: readonly TotalTrilha[],
	catalogo: readonly { slug: string; titulo: string }[],
): TrilhaNoUso[] {
	const slugs = [
		...new Set([...lidos, ...concluidas].map(({ trilha }) => trilha)),
	];
	const conhecidas = catalogo
		.map((trilha, indice) => ({ ...trilha, posicao: indice + 1 }))
		.filter(({ slug }) => slugs.includes(slug));
	const desconhecidas = slugs
		.filter((slug) => !catalogo.some((trilha) => trilha.slug === slug))
		.map((slug, indice) => ({
			slug,
			titulo: slug,
			posicao: catalogo.length + indice + 1,
		}));
	const total = (lista: readonly TotalTrilha[], slug: string) =>
		lista.find(({ trilha }) => trilha === slug)?.total ?? 0;
	return [...conhecidas, ...desconhecidas].map(({ slug, titulo, posicao }) => ({
		slug,
		titulo,
		posicao,
		lidos: total(lidos, slug),
		concluidas: total(concluidas, slug),
	}));
}
