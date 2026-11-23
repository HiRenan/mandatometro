import type { Options } from "@/client";
import { client } from "@/client/client.gen";

// PROVISÓRIO: o contrato que a Atena aprovou para a #297, no formato que o
// cliente gerado (`pnpm generate:client`) vai ter, com os mesmos nomes. Sai na
// junção com a develop, quando o cliente trouxer o GET /painel/numeros e o
// POST /visitas: quem importa daqui passa a importar de "@/client".

export type TotalSemanal = {
	/** A segunda-feira da semana, em Brasília (AAAA-MM-DD). */
	semana: string;
	total: number;
};

export type TotalTrilha = {
	/** O slug da trilha no catálogo público. */
	trilha: string;
	total: number;
};

export type TotalDiario = {
	/** O dia, em Brasília (AAAA-MM-DD). */
	dia: string;
	total: number;
};

export type TotalPagina = {
	caminho: string;
	total: number;
};

export type SituacaoPiloto =
	| "sem_respostas"
	| "amostra_pequena"
	| "disponivel"
	| "protecao_de_subgrupo";

export type MediaPiloto = {
	acertos: number | null;
	percentual: number | null;
};

export type MediaEtapa = MediaPiloto & {
	quantidade: number;
	situacao: SituacaoPiloto;
};

export type NumerosPainel = {
	pessoas: {
		contas: {
			total: number;
			confirmadas: number;
			novas_por_semana: Array<TotalSemanal>;
		};
		inscritos: {
			total: number;
			novos_por_semana: Array<TotalSemanal>;
		};
	};
	uso: {
		artigos_lidos_por_trilha: Array<TotalTrilha>;
		trilhas_concluidas: Array<TotalTrilha>;
		contas_ativas_por_semana: Array<TotalSemanal>;
		contas_que_voltaram: number;
	};
	visitas: {
		por_dia: Array<TotalDiario>;
		paginas_mais_vistas: Array<TotalPagina>;
	};
	newsletter: {
		edicoes_publicadas: number;
		inscritos_com_a_ultima_edicao: number | null;
		ultima_publicada_em: string | null;
	};
	piloto: {
		versao_quiz: string;
		total_perguntas: number;
		tentativas: { antes: number; depois: number; total: number };
		participacoes: {
			antes: number;
			depois: number;
			total: number;
			pareadas: number;
			somente_antes: number;
			somente_depois: number;
		};
		medias: { antes: MediaEtapa; depois: MediaEtapa };
		pares: {
			quantidade: number;
			antes: MediaPiloto;
			depois: MediaPiloto;
			diferenca_acertos: number | null;
			diferenca_pontos_percentuais: number | null;
			situacao: SituacaoPiloto;
		};
	};
	sistema: {
		parlamentares: number;
		mandatos: number;
		proposicoes: number;
		votacoes: number;
		votos: number;
		atos: number;
		videos: number;
		proposicoes_com_tema: number;
		bens: number;
		meses_ipca: number;
		ultimas_coletas: {
			camara: string | null;
			senado: string | null;
			diario_oficial: string | null;
			tse: string | null;
			banco_central: string | null;
		};
	};
};

type ConsultarNumerosPainelData = {
	body?: never;
	path?: never;
	query?: never;
	url: "/painel/numeros";
};

export const consultarNumerosPainel = <ThrowOnError extends boolean = false>(
	options?: Options<ConsultarNumerosPainelData, ThrowOnError>,
) =>
	(options?.client ?? client).get<{ 200: NumerosPainel }, unknown, ThrowOnError>(
		{ url: "/painel/numeros", ...options },
	);

type RegistrarVisitaData = {
	body: { caminho: string };
	path?: never;
	query?: never;
	url: "/visitas";
};

export const registrarVisita = <ThrowOnError extends boolean = false>(
	options: Options<RegistrarVisitaData, ThrowOnError>,
) =>
	(options.client ?? client).post<{ 204: void }, unknown, ThrowOnError>({
		url: "/visitas",
		...options,
		headers: {
			"Content-Type": "application/json",
			...options.headers,
		},
	});
