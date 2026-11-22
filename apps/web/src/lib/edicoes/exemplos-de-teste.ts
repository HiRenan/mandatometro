import type {
	EdicaoPublica,
	FontePublica,
	ListaEdicoes,
	ResumoEdicao,
} from "@/client";

// Edições de mentira para os testes, no formato da API (GET /edicoes e
// GET /edicoes/{id}): os projetos, os textos e os endereços são inventados, sem
// pessoa nenhuma. O trecho com <b> confere que o texto da API aparece como texto.

/** A página da votação, coletada à 1h30 de 12/11 em UTC: 11/11 em Brasília. */
export const FONTE_DA_VOTACAO: FontePublica = {
	url: "https://www.camara.leg.br/votacoes/exemplo-1",
	coletado_em: "2026-11-12T01:30:00+00:00",
	trecho: "Aprovado o projeto, com <b>emenda</b> de redação.",
};

/** A mesma página, coletada de novo no dia seguinte. */
export const OUTRA_COLETA_DA_VOTACAO: FontePublica = {
	url: "https://www.camara.leg.br/votacoes/exemplo-1",
	coletado_em: "2026-11-13T15:00:00+00:00",
	trecho: null,
};

export const FONTE_DA_PROPOSICAO: FontePublica = {
	url: "https://www.camara.leg.br/proposicoes/exemplo-1",
	coletado_em: "2026-11-12T10:00:00+00:00",
	trecho: "Cria a Semana das Bibliotecas Escolares.",
};

export const FONTE_DO_SENADO: FontePublica = {
	url: "https://www25.senado.leg.br/web/atividade/materias/exemplo-2",
	coletado_em: "2026-11-13T12:00:00+00:00",
	trecho: null,
};

export const FONTE_DE_EDICAO_ANTIGA: FontePublica = {
	url: "https://www.camara.leg.br/proposicoes/exemplo-3",
	coletado_em: "2026-11-10T12:00:00+00:00",
	trecho: null,
};

/**
 * Uma edição de três itens: o primeiro com placar, duas coletas da mesma página e
 * o artigo da trilha; o segundo sem placar e com o resultado não classificado; o
 * terceiro de uma edição antiga, sem os fatos.
 */
export function edicaoDeExemplo(): EdicaoPublica {
	return {
		id: 7,
		titulo: "Jornal legislativo — 09 a 15/11/2026",
		inicio: "2026-11-09",
		fim: "2026-11-15",
		publicada_em: "2026-11-16T13:05:00+00:00",
		itens: [
			{
				ordem: 1,
				tipo: "votacao",
				titulo: "Câmara aprova a semana das bibliotecas escolares",
				texto:
					"O projeto cria uma semana dedicada às bibliotecas das escolas públicas.\n\nAgora o texto segue para o Senado, que pode aprovar, mudar ou rejeitar.",
				fatos: {
					votacoes: [
						{
							id: 701,
							data: "2026-11-11",
							resultado: "aprovada",
							placar: {
								sim: 312,
								nao: 141,
								abstencao: 3,
								obstrucao: 0,
								presidente: 1,
							},
							fontes: [FONTE_DA_VOTACAO],
							url_video: null,
						},
					],
				},
				fontes: [
					FONTE_DA_VOTACAO,
					OUTRA_COLETA_DA_VOTACAO,
					FONTE_DA_PROPOSICAO,
				],
				artigo: {
					titulo: "Onde o projeto começa",
					caminho: "/trilhas/processo-legislativo/onde-o-projeto-comeca",
				},
			},
			{
				ordem: 2,
				tipo: "votacao",
				titulo: "Senado vota um requerimento",
				texto:
					"O Senado votou um pedido sobre a ordem dos trabalhos da semana.",
				fatos: {
					votacoes: [
						{
							id: 702,
							data: "2026-11-12",
							resultado: "outro",
							placar: null,
							fontes: [FONTE_DO_SENADO],
							url_video: null,
						},
					],
				},
				fontes: [FONTE_DO_SENADO],
				artigo: null,
			},
			{
				ordem: 3,
				tipo: "votacao",
				titulo: "Um item de uma edição antiga",
				texto: "Este item saiu antes de a edição guardar os fatos da votação.",
				fatos: null,
				fontes: [FONTE_DE_EDICAO_ANTIGA],
				artigo: null,
			},
		],
	};
}

/** O dia, no formato da API, `semanas` semanas antes de `data`. */
function semanasAntes(data: string, semanas: number): string {
	const [ano, mes, dia] = data.split("-").map(Number);
	return new Date(Date.UTC(ano, mes - 1, dia - 7 * semanas))
		.toISOString()
		.slice(0, 10);
}

/**
 * Os resumos de `quantas` edições semanais, da mais nova para a mais antiga, a
 * começar pela semana de 9 a 15/11/2026, com ids que descem a partir de `total`.
 */
export function resumosDeExemplo(
	quantas: number,
	{ pular = 0, total = quantas } = {},
): ResumoEdicao[] {
	return Array.from({ length: quantas }, (_, indice) => {
		const semanas = pular + indice;
		const fim = semanasAntes("2026-11-15", semanas);
		return {
			id: total - semanas,
			titulo: `Jornal legislativo — semana ${total - semanas}`,
			inicio: semanasAntes("2026-11-09", semanas),
			fim,
			publicada_em: `${semanasAntes("2026-11-16", semanas)}T13:05:00+00:00`,
		};
	});
}

/** Uma página da lista, como a API manda. */
export function listaDeExemplo(
	total: number,
	{ limite = 20, deslocamento = 0 } = {},
): ListaEdicoes {
	const quantas = Math.max(0, Math.min(limite, total - deslocamento));
	return {
		edicoes: resumosDeExemplo(quantas, { pular: deslocamento, total }),
		total,
		limite,
		deslocamento,
	};
}
