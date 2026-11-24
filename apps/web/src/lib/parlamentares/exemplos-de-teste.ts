import type {
	BiografiaParlamentar,
	ContagemVotosParlamentar,
	CorrecaoIpca,
	DetalheParlamentar,
	DetalheVotacao,
	EleicaoPatrimonio,
	ListaParlamentares,
	ListaVotosParlamentar,
	ParlamentarPublico,
	PatrimonioParlamentar,
	VotoNominal,
	VotoParlamentar,
} from "@/client";

// Parlamentares e votações de mentira para os testes, no formato da API
// (GET /parlamentares, /parlamentares/{id}, /parlamentares/{id}/votos,
// /parlamentares/{id}/patrimonio e /votacoes/{id}). Os nomes, os partidos, os
// projetos, os valores declarados e os endereços das votações são inventados:
// nenhum é de pessoa ou de partido de verdade. Os endereços do patrimônio seguem
// o formato público dos arquivos do TSE e da série do Banco Central.

export const CONTAGEM_ZERADA: ContagemVotosParlamentar = {
	sim: 0,
	nao: 0,
	abstencao: 0,
	obstrucao: 0,
	presidente: 0,
	nao_votou: 0,
	outro: 0,
};

function parlamentarDeExemplo(
	mudancas: Partial<ParlamentarPublico> = {},
): ParlamentarPublico {
	const casa = mudancas.casa ?? "camara";
	return {
		id: 81,
		nome: "Ágata Cedrolume",
		casa,
		uf: "SC",
		partido: "PFT",
		foto:
			casa === "camara"
				? {
						url: "https://www.camara.leg.br/internet/deputado/bandep/90000123.jpg",
						credito: "Câmara dos Deputados",
					}
				: {
						url: "https://legis.senado.leg.br/senadores/fotos-oficiais/90000124",
						credito: "Senado Federal",
					},
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

/**
 * A biografia oficial de mentira, com a página da Casa da pessoa: duas
 * profissões, a escolaridade e a coleta de 20 de novembro de 2026.
 */
export function biografiaDeExemplo(
	casa: DetalheParlamentar["casa"] = "camara",
	mudancas: Partial<BiografiaParlamentar> = {},
): BiografiaParlamentar {
	return {
		profissoes: ["Professora", "Advogada"],
		escolaridade: "Superior",
		fonte: {
			url:
				casa === "camara"
					? "https://www.camara.leg.br/deputados/90000123"
					: "https://www25.senado.leg.br/web/senadores/senador/-/perfil/90000124",
			coletado_em: "2026-11-20T15:00:00+00:00",
		},
		...mudancas,
	};
}

export function detalheDeExemplo(
	mudancas: Partial<DetalheParlamentar> = {},
): DetalheParlamentar {
	const parlamentar = parlamentarDeExemplo(mudancas);
	return {
		...parlamentar,
		// O nome por extenso é o da sigla: sem a sigla, sem o nome.
		partido_nome: parlamentar.partido ? "Partido Fictício do Trabalho" : null,
		biografia: biografiaDeExemplo(parlamentar.casa),
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
		// A comparação com o partido (a #328): dois votos ficaram sem maioria.
		com_o_partido: { comparaveis: 16, com_o_partido: 14, contra: 2 },
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
		temas: [],
		url_oficial: `https://www.exemplo.leg.br/votacao/${votacao}`,
		coletado_em: "2026-11-21T01:30:00+00:00",
		votacao_id: votacao,
		valor: "sim",
		partido: "PFT",
		maioria_do_partido: "sim",
		com_o_partido: true,
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

/**
 * GET /parlamentares/{id}/votos?com_o_partido=false&limite=5: os votos contra a
 * maioria do partido, do mais novo para o mais antigo, `total` ao todo. A pessoa
 * trocou de partido: o voto mais novo é do PFT, e os de antes, do PFB.
 */
export function votosContraDeExemplo(total = 2): ListaVotosParlamentar {
	return {
		votos: Array.from({ length: Math.min(5, total) }, (_, posicao) =>
			votoDoParlamentarDeExemplo(137 - posicao * 9, {
				data: `2026-11-${String(18 - posicao * 3).padStart(2, "0")}`,
				proposicoes: [
					{
						sigla: "PL",
						numero: 730 + posicao,
						ano: 2026,
						ementa: "Cria o Dia das Hortas Escolares.",
					},
				],
				valor: posicao % 2 === 0 ? "nao" : "sim",
				partido: posicao === 0 ? "PFT" : "PFB",
				maioria_do_partido: posicao % 2 === 0 ? "sim" : "nao",
				com_o_partido: false,
			}),
		),
		total,
		limite: 5,
		deslocamento: 0,
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
		temas: [],
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

/**
 * Uma eleição do patrimônio declarado (GET /parlamentares/{id}/patrimonio): em
 * 2018, para deputado federal por Santa Catarina, R$ 812.400,00 declarados e R$
 * 1.100.000,00 em reais de hoje. Os valores são inventados.
 */
export function eleicaoDeExemplo(
	mudancas: Partial<EleicaoPatrimonio> = {},
): EleicaoPatrimonio {
	const ano = mudancas.ano ?? 2018;
	const total =
		mudancas.total_centavos === undefined
			? 81_240_000
			: mudancas.total_centavos;
	const corrigido =
		mudancas.total_corrigido_centavos === undefined
			? 110_000_000
			: mudancas.total_corrigido_centavos;
	let fator: number | null = null;
	if (total !== null && corrigido !== null) {
		fator = total > 0 ? corrigido / total : 1;
	}

	return {
		ano,
		cargo: { codigo: 6, nome: "Deputado federal" },
		uf: "SC",
		total_centavos: total,
		fonte: {
			url: `https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_${ano}.zip`,
			coletado_em: "2026-11-20T15:00:00+00:00",
		},
		mes_inicio: `${ano}-10`,
		total_corrigido_centavos: corrigido,
		resultado: null,
		fator_ipca: fator?.toFixed(4) ?? null,
		alta_ipca_percentual:
			fator === null ? null : ((fator - 1) * 100).toFixed(1),
		variacao: null,
		...mudancas,
	};
}

/** A correção pelo IPCA até outubro de 2026, com a série 433 do Banco Central. */
export function correcaoDeExemplo(
	mudancas: Partial<CorrecaoIpca> = {},
): CorrecaoIpca {
	return {
		indice: "IPCA",
		mes_fim: "2026-10",
		fonte: {
			url: "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json",
			coletado_em: "2026-11-22T13:00:00+00:00",
		},
		...mudancas,
	};
}

/**
 * O patrimônio de Ágata Cedrolume: quatro eleições, de 2014 a 2026, uma delas
 * (2022) sem total nos dados do TSE, cada uma com o resultado. A diferença de
 * 2018 é para 2014, e a de 2026, para 2018: a eleição sem total fica de fora da
 * comparação, como na API.
 */
export function patrimonioDeExemplo(
	mudancas: Partial<PatrimonioParlamentar> = {},
): PatrimonioParlamentar {
	return {
		eleicoes: [
			eleicaoDeExemplo({
				ano: 2014,
				cargo: { codigo: 7, nome: "Deputado estadual" },
				total_centavos: 19_830_000,
				total_corrigido_centavos: 35_212_300,
				resultado: "eleito_por_qp",
			}),
			eleicaoDeExemplo({
				ano: 2018,
				resultado: "eleito_por_media",
				variacao: {
					ano_anterior: 2014,
					diferenca_centavos: 74_787_700,
					percentual: "212.4",
				},
			}),
			eleicaoDeExemplo({
				ano: 2022,
				total_centavos: null,
				total_corrigido_centavos: null,
				resultado: "suplente",
			}),
			eleicaoDeExemplo({
				ano: 2026,
				cargo: { codigo: 5, nome: "Senador" },
				total_centavos: 241_000_000,
				total_corrigido_centavos: 241_337_400,
				resultado: "eleito",
				variacao: {
					ano_anterior: 2018,
					diferenca_centavos: 131_337_400,
					percentual: "119.4",
				},
			}),
		],
		correcao_ipca: correcaoDeExemplo(),
		...mudancas,
	};
}
