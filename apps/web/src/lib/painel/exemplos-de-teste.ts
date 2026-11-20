import type { ArquivoRevisao, ItemRevisao } from "@/client";

// Um rascunho de mentira para os testes do painel, no formato da API
// (GET /painel/edicoes/rascunho): os projetos, as votações, os atos e os
// endereços são inventados, sem pessoa nenhuma.

const BASE = "/trilhas/processo-legislativo/";

export const CATALOGO_DE_EXEMPLO: Record<string, string> = {
	[`${BASE}quem-pode-propor-uma-lei`]: "Quem pode propor uma lei",
	[`${BASE}onde-o-projeto-comeca`]: "Onde o projeto começa",
	[`${BASE}o-projeto-passa-pelas-comissoes`]: "O projeto passa pelas comissões",
	[`${BASE}o-plenario-vota-o-projeto`]: "O Plenário vota o projeto",
	[`${BASE}a-outra-casa-revisa-o-projeto`]: "A outra Casa revisa o projeto",
	[`${BASE}o-presidente-sanciona-ou-veta`]: "O presidente sanciona ou veta",
};

export const ARTIGO_DO_PLENARIO = `${BASE}o-plenario-vota-o-projeto`;

/** A votação revisada, com placar, a descrição oficial e o artigo confirmado. */
function votacaoRevisada(): ItemRevisao {
	return {
		id: 101,
		titulo: "Câmara aprova a semana das bibliotecas escolares",
		explicacao: [
			"A Câmara aprovou o projeto que cria a Semana das Bibliotecas Escolares.",
			"O texto segue para o Senado.",
		],
		artigo_caminho: ARTIGO_DO_PLENARIO,
		revisado: true,
		artigo_confirmado: true,
		excluir: false,
		motivo_exclusao: "",
		fatos: {
			versao: 1,
			proposicoes: [11],
			votacoes: [
				{
					id: 21,
					data: "2026-11-11",
					resultado: "aprovada",
					placar: {
						sim: 312,
						nao: 98,
						abstencao: 4,
						obstrucao: 0,
						presidente: 1,
					},
					fontes: [31],
				},
			],
			fontes: [31],
			origem: "revisao",
			pendencias: ["cobertura"],
		},
		fontes: [
			{
				id: 31,
				url: "https://dadosabertos.camara.leg.br/api/v2/votacoes/exemplo-1",
				url_publica: "https://www.camara.leg.br/votacoes/exemplo-1",
				coletado_em: "2026-11-12T01:30:00+00:00",
				trecho: "Aprovado o projeto, com emenda de redação.",
			},
		],
		contexto: {
			proposicoes: [
				{
					id: 11,
					sigla: "PL",
					numero: 1234,
					ano: 2026,
					ementa: "Cria a Semana das Bibliotecas Escolares.",
				},
			],
			votacoes: [
				{
					id: 21,
					casa: "camara",
					id_externo: "exemplo-1",
					descricao: "Aprovado o projeto, com emenda de redação.",
				},
			],
		},
	};
}

/** A votação sem texto ainda: a redação pendente, sem placar e no Senado. */
function votacaoSemTexto(): ItemRevisao {
	return {
		id: 102,
		titulo: "Senado vota o projeto das praças esportivas",
		explicacao: [
			"Redação pendente: explique o ato votado e o que a proposta prevê.",
		],
		artigo_caminho: null,
		revisado: false,
		artigo_confirmado: true,
		excluir: false,
		motivo_exclusao: "",
		fatos: {
			versao: 1,
			proposicoes: [12],
			votacoes: [
				{
					id: 22,
					data: "2026-11-12",
					resultado: "outro",
					placar: null,
					fontes: [32],
				},
			],
			fontes: [32],
			origem: "codigo",
			pendencias: ["redacao", "revisao", "cobertura"],
		},
		fontes: [
			{
				id: 32,
				url: "https://legis.senado.leg.br/dadosabertos/votacao/exemplo-2",
				url_publica: null,
				coletado_em: "2026-11-13T12:00:00+00:00",
				trecho: null,
			},
		],
		contexto: {
			avisos: [
				"O texto oficial fala de licença, afastamento ou saúde. Confira se é de uma pessoa; se for, exclua o item com excluir: true.",
			],
			proposicoes: [
				{
					id: 12,
					sigla: "PLS",
					numero: 77,
					ano: 2025,
					ementa: "Cria o programa de praças esportivas nos bairros.",
				},
			],
			votacoes: [
				{
					id: 22,
					casa: "senado",
					id_externo: "exemplo-2",
					descricao: "Votação do requerimento de urgência.",
				},
			],
		},
	};
}

/** O ato que o filtro de pessoal reteve: pede a privacidade conferida. */
function atoRetido(): ItemRevisao {
	return {
		id: 103,
		titulo: "Portaria muda o horário de uma biblioteca pública",
		explicacao: ["Uma portaria mudou o horário de atendimento da biblioteca."],
		artigo_caminho: null,
		revisado: false,
		artigo_confirmado: true,
		excluir: false,
		motivo_exclusao: "",
		privacidade_confirmada: false,
		fatos: {
			versao: 2,
			ato_id: 41,
			data_publicacao: "2026-11-12",
			fontes: [33],
			hash_ato: "a".repeat(64),
			origem: "codigo",
			pendencias: ["revisao", "cobertura"],
		},
		fontes: [
			{
				id: 33,
				url: "https://www.in.gov.br/web/dou/-/exemplo-3",
				url_publica: "https://www.in.gov.br/web/dou/-/exemplo-3",
				coletado_em: "2026-11-12T09:00:00+00:00",
				trecho: null,
			},
		],
		contexto: {
			avisos: [
				"Item 3 (ato_de_pessoal). Confira a privacidade do ato. Exclua o item com motivo ou confirme que ele fica.",
			],
			motivo_retencao: "ato_de_pessoal",
		},
	};
}

/** O ato comum, sem retenção. */
function atoComum(): ItemRevisao {
	return {
		id: 104,
		titulo: "Decreto cria o comitê das bibliotecas escolares",
		explicacao: ["O decreto cria um comitê para acompanhar as bibliotecas."],
		artigo_caminho: null,
		revisado: false,
		artigo_confirmado: true,
		excluir: false,
		motivo_exclusao: "",
		fatos: {
			versao: 2,
			ato_id: 42,
			data_publicacao: "2026-11-13",
			fontes: [34],
			hash_ato: "b".repeat(64),
			origem: "modelo",
			pendencias: ["revisao", "cobertura"],
		},
		fontes: [
			{
				id: 34,
				url: "https://www.in.gov.br/web/dou/-/exemplo-4",
				url_publica: "https://www.in.gov.br/web/dou/-/exemplo-4",
				coletado_em: "2026-11-13T09:00:00+00:00",
				trecho: null,
			},
		],
		contexto: {},
	};
}

/**
 * Um rascunho de quatro itens, na ordem do arquivo: a votação revisada, a
 * votação com a redação pendente, o ato retido e o ato comum. A cobertura da
 * semana ainda não foi confirmada.
 */
export function rascunhoDeExemplo(): ArquivoRevisao {
	return {
		versao: 1,
		edicao_id: 9,
		versao_rascunho: "c".repeat(64),
		inicio: "2026-11-09",
		fim: "2026-11-15",
		titulo: "Jornal legislativo — 09 a 15/11/2026",
		cobertura_confirmada: false,
		artigos_disponiveis: CATALOGO_DE_EXEMPLO,
		itens: [votacaoRevisada(), votacaoSemTexto(), atoRetido(), atoComum()],
	};
}

/**
 * O mesmo rascunho pronto para publicar: tudo revisado, a privacidade do ato
 * conferida e a cobertura confirmada.
 */
export function rascunhoPronto(): ArquivoRevisao {
	const rascunho = rascunhoDeExemplo();
	return {
		...rascunho,
		versao_rascunho: "d".repeat(64),
		cobertura_confirmada: true,
		itens: rascunho.itens.map((item) => ({
			...item,
			explicacao:
				item.id === 102
					? ["O Senado aprovou a urgência do projeto das praças esportivas."]
					: item.explicacao,
			revisado: true,
			...("privacidade_confirmada" in item
				? { privacidade_confirmada: true }
				: {}),
			fatos: { ...item.fatos, pendencias: [] },
		})),
	};
}
