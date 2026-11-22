import type {
	ContagemVotosParlamentar,
	DetalheParlamentar,
	DetalheVotacao,
	ListaParlamentares,
	ListaVotosParlamentar,
	ParlamentarPublico,
	VotoNominal,
	VotoParlamentar,
} from "@/client";

// Parlamentares e votações de mentira para os testes, no formato da API
// (GET /parlamentares, /parlamentares/{id}, /parlamentares/{id}/votos e
// /votacoes/{id}). Os nomes, os partidos, os projetos e os endereços são
// inventados: nenhum é de pessoa ou de partido de verdade.

export const CONTAGEM_ZERADA: ContagemVotosParlamentar = {
	sim: 0,
	nao: 0,
	abstencao: 0,
	obstrucao: 0,
	presidente: 0,
	nao_votou: 0,
	outro: 0,
};

export function parlamentarDeExemplo(
	mudancas: Partial<ParlamentarPublico> = {},
): ParlamentarPublico {
	return {
		id: 81,
		nome: "Ágata Cedrolume",
		casa: "camara",
		uf: "SC",
		partido: "PFT",
		...mudancas,
	};
}

/**
 * A lista de GET /parlamentares: em Santa Catarina, três deputados (um sem voto
 * registrado, com o partido nulo) e dois senadores; na Bahia, um deputado; e uma
 * pessoa sem mandato em exercício, com a UF nula, que não entra em estado nenhum.
 */
export function listaDeExemplo(): ListaParlamentares {
	return {
		parlamentares: [
			parlamentarDeExemplo(),
			parlamentarDeExemplo({
				id: 82,
				nome: "Íris Dell'Ombre",
				partido: "PNX",
			}),
			parlamentarDeExemplo({
				id: 83,
				nome: "João-Pedro Varustel",
				partido: null,
			}),
			parlamentarDeExemplo({
				id: 501,
				nome: "Lia Quinemar",
				casa: "senado",
				partido: "PRV",
			}),
			parlamentarDeExemplo({
				id: 502,
				nome: "Otávio Belombre",
				casa: "senado",
				partido: "PFT",
			}),
			parlamentarDeExemplo({
				id: 90,
				nome: "Rui Tavaquil",
				uf: "BA",
				partido: "PRV",
			}),
			parlamentarDeExemplo({ id: 91, nome: "Sem Mandato", uf: null }),
		],
	};
}

export function detalheDeExemplo(
	mudancas: Partial<DetalheParlamentar> = {},
): DetalheParlamentar {
	return {
		...parlamentarDeExemplo(),
		mandatos: [
			{ legislatura: 57, uf: "SC", condicao: "Titular", em_exercicio: true },
			{ legislatura: 56, uf: "SC", condicao: null, em_exercicio: false },
		],
		contagem_votos: {
			...CONTAGEM_ZERADA,
			sim: 12,
			nao: 5,
			abstencao: 1,
			nao_votou: 2,
		},
		...mudancas,
	};
}

export function votoDoParlamentarDeExemplo(
	votacao: number,
	mudancas: Partial<VotoParlamentar> = {},
): VotoParlamentar {
	return {
		data: "2026-11-20",
		descricao: `Votação nominal em turno único da matéria ${votacao}.`,
		resultado: "aprovada",
		proposicoes: [
			{
				sigla: "PL",
				numero: 812,
				ano: 2026,
				ementa: "Cria a Semana das Bibliotecas Comunitárias.",
			},
		],
		url_oficial: `https://www.exemplo.leg.br/votacao/${votacao}`,
		coletado_em: "2026-11-21T01:30:00+00:00",
		votacao_id: votacao,
		valor: "sim",
		...mudancas,
	};
}

/** Uma página de GET /parlamentares/{id}/votos, com `total` votos ao todo. */
export function votosDeExemplo(
	total: number,
	deslocamento = 0,
	limite = 20,
): ListaVotosParlamentar {
	const quantos = Math.max(0, Math.min(limite, total - deslocamento));
	return {
		votos: Array.from({ length: quantos }, (_, posicao) =>
			votoDoParlamentarDeExemplo(139 - deslocamento - posicao),
		),
		total,
		limite,
		deslocamento,
	};
}

export function votoNominalDeExemplo(
	mudancas: Partial<VotoNominal> = {},
): VotoNominal {
	return {
		parlamentar_id: 81,
		nome: "Ágata Cedrolume",
		partido: "PFT",
		uf: "SC",
		valor: "sim",
		...mudancas,
	};
}

/**
 * A votação de GET /votacoes/{id}: uma votação da Câmara com cinco votos, em
 * dois estados e três partidos, um deles sem partido.
 */
export function votacaoDeExemplo(
	mudancas: Partial<DetalheVotacao> = {},
): DetalheVotacao {
	const votos: VotoNominal[] = [
		votoNominalDeExemplo(),
		votoNominalDeExemplo({
			parlamentar_id: 82,
			nome: "Íris Dell'Ombre",
			partido: "PNX",
			valor: "nao",
		}),
		votoNominalDeExemplo({
			parlamentar_id: 83,
			nome: "João-Pedro Varustel",
			partido: null,
			valor: "nao_votou",
		}),
		votoNominalDeExemplo({
			parlamentar_id: 90,
			nome: "Rui Tavaquil",
			partido: "PRV",
			uf: "BA",
			valor: "sim",
		}),
		votoNominalDeExemplo({
			parlamentar_id: 92,
			nome: "Sara Varombre",
			partido: "PRV",
			uf: "BA",
			valor: "presidente",
		}),
	];
	return {
		id: 139,
		data: "2026-11-20",
		descricao:
			"Votação nominal em turno único do projeto, com o texto do relator.",
		resultado: "aprovada",
		proposicoes: [
			{
				sigla: "PL",
				numero: 812,
				ano: 2026,
				ementa: "Cria a Semana das Bibliotecas Comunitárias.",
			},
		],
		url_oficial: "https://www.exemplo.leg.br/votacao/139",
		url_video: null,
		coletado_em: "2026-11-21T01:30:00+00:00",
		casa: "camara",
		placar: {
			...CONTAGEM_ZERADA,
			sim: 2,
			nao: 1,
			presidente: 1,
			nao_votou: 1,
		},
		placar_por_partido: [
			{
				partido: "PFT",
				placar: { ...CONTAGEM_ZERADA, sim: 1 },
			},
			{
				partido: "PNX",
				placar: { ...CONTAGEM_ZERADA, nao: 1 },
			},
			{
				partido: "PRV",
				placar: { ...CONTAGEM_ZERADA, sim: 1, presidente: 1 },
			},
			{
				partido: null,
				placar: { ...CONTAGEM_ZERADA, nao_votou: 1 },
			},
		],
		votos,
		...mudancas,
	};
}

/** Uma votação sem o voto de cada um, como a simbólica: o placar fica zerado. */
export function votacaoSemVotosDeExemplo(): DetalheVotacao {
	return votacaoDeExemplo({
		id: 140,
		placar: CONTAGEM_ZERADA,
		placar_por_partido: [],
		votos: [],
	});
}
