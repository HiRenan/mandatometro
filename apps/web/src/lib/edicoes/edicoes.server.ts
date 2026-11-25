import { notFound } from "@tanstack/react-router";
import {
	type EdicaoPublica,
	type ListaEdicoes,
	listarEdicoes,
	obterEdicao,
	type ResumoEdicao,
} from "@/client";
import { ENV } from "@/env";
import { idDaEdicao, POR_PAGINA } from "./pagina";

// A leitura das edições publicadas na API, pelo servidor do site: as páginas das
// edições chamam estas funções pelo edicoes.functions.ts, e o conteúdo já vem no
// HTML. O navegador nunca recebe a mensagem de uma falha: ela pode trazer um
// endereço interno, SQL ou o e-mail de um inscrito (o Renan, na revisão do PR
// #44). O servidor registra só uma linha fixa, com o motivo curto, e a página
// recebe o erro genérico, que o roteador mostra na página de erro, com HTTP 500.

/** Quanto o servidor espera a API responder antes de desistir. */
export const TEMPO_DE_ESPERA = 8_000;

/**
 * A única mensagem que vai ao navegador quando a leitura falha. O roteador
 * serializa só o `message` do erro, no HTML e na resposta da função do servidor.
 */
export const ERRO_DAS_EDICOES = "As edições não carregaram.";

export type PaginaDaLista =
	| { tipo: "sem-api" }
	| {
			tipo: "lista";
			/** Da publicação mais nova para a mais antiga, como a API manda. */
			edicoes: ResumoEdicao[];
			total: number;
			/** A página aberta, a partir de 1. */
			pagina: number;
			/** Quantas páginas a lista tem; sem edição, uma. */
			paginas: number;
	  };

export type EdicaoDaPagina =
	| { tipo: "sem-api" }
	| { tipo: "edicao"; edicao: EdicaoPublica };

/**
 * Uma página da lista das edições publicadas. Sem o API_URL, como na Vercel até
 * a API ter casa, as páginas dizem que as edições não estão neste endereço. A
 * página depois da última não existe.
 */
export async function lerEdicoes(pagina = 1): Promise<PaginaDaLista> {
	if (!ENV.API_URL) {
		return { tipo: "sem-api" };
	}
	const deslocamento = (pagina - 1) * POR_PAGINA;
	const { data, response } = await pedir((signal) =>
		listarEdicoes({ query: { limite: POR_PAGINA, deslocamento }, signal }),
	);
	if (response.status === 422) {
		throw notFound();
	}
	if (!response.ok) {
		falhou(`http-${response.status}`);
	}
	if (!pareceLista(data)) {
		falhou("resposta-invalida");
	}
	if (pagina > 1 && deslocamento >= data.total) {
		throw notFound();
	}
	return {
		tipo: "lista",
		edicoes: data.edicoes,
		total: data.total,
		pagina,
		paginas: Math.max(1, Math.ceil(data.total / POR_PAGINA)),
	};
}

/**
 * Uma edição publicada, pelo id do endereço. O rascunho e a edição que não
 * existe dão a mesma página não encontrada, como na API, e um id que não pode
 * ser de uma edição nem chega a ela.
 */
export async function lerEdicao(valor: unknown): Promise<EdicaoDaPagina> {
	if (!ENV.API_URL) {
		return { tipo: "sem-api" };
	}
	const id = idDaEdicao(valor);
	if (id === null) {
		throw notFound();
	}
	const { data, response } = await pedir((signal) =>
		obterEdicao({ path: { id }, signal }),
	);
	if (response.status === 404 || response.status === 422) {
		throw notFound();
	}
	if (!response.ok) {
		falhou(`http-${response.status}`);
	}
	if (!pareceEdicao(data)) {
		falhou("resposta-invalida");
	}
	return { tipo: "edicao", edicao: data };
}

/** Quantas edições a busca lê: a primeira página da lista, das mais novas. */
export const EDICOES_NA_BUSCA = 20;

type EdicoesDaBusca =
	| { tipo: "sem-api" }
	| {
			tipo: "edicoes";
			/** Da publicação mais nova para a mais antiga, como a lista. */
			edicoes: EdicaoPublica[];
	  };

/**
 * As edições mais novas, inteiras, para o índice da busca: a lista e cada edição
 * dela, ao mesmo tempo. A API não tem rota de busca, e o backend não muda com a
 * busca (#233). A edição que sumiu entre a lista e o pedido, como a despublicada,
 * fica de fora; outra falha dá o erro genérico, como nas páginas.
 */
export async function lerEdicoesDaBusca(): Promise<EdicoesDaBusca> {
	if (!ENV.API_URL) {
		return { tipo: "sem-api" };
	}
	const { data, response } = await pedir((signal) =>
		listarEdicoes({
			query: { limite: EDICOES_NA_BUSCA, deslocamento: 0 },
			signal,
		}),
	);
	if (!response.ok) {
		falhou(`http-${response.status}`);
	}
	if (!pareceLista(data)) {
		falhou("resposta-invalida");
	}
	const edicoes = await Promise.all(
		data.edicoes.map(async ({ id }) => {
			const { data: edicao, response } = await pedir((signal) =>
				obterEdicao({ path: { id }, signal }),
			);
			if (response.status === 404) {
				return undefined;
			}
			if (!response.ok) {
				falhou(`http-${response.status}`);
			}
			if (!pareceEdicao(edicao)) {
				falhou("resposta-invalida");
			}
			return edicao;
		}),
	);
	return {
		tipo: "edicoes",
		edicoes: edicoes.filter((edicao) => edicao !== undefined),
	};
}

/**
 * Um pedido à API com o tempo de espera. O relógio é daqui, com o
 * AbortController, como no envio do piloto: ele para quando a resposta chega.
 * Sem resposta (a API não aceitou a conexão ou passou do tempo), o cliente
 * gerado não lança: devolve a resposta vazia, embora o tipo dele diga que ela
 * sempre vem, e a falha do fetch no `error`, com o endereço da API.
 */
async function pedir<T>(
	chamar: (signal: AbortSignal) => Promise<{
		data?: T;
		error?: unknown;
		response?: Response | undefined;
	}>,
): Promise<{ data: T | undefined; response: Response }> {
	const desistir = new AbortController();
	const relogio = setTimeout(() => desistir.abort(), TEMPO_DE_ESPERA);
	let resultado: Awaited<ReturnType<typeof chamar>>;
	try {
		resultado = await chamar(desistir.signal);
	} catch {
		// Se algo lançar mesmo assim, a mensagem fica de fora, como a do `error`.
		falhou("sem-resposta");
	} finally {
		clearTimeout(relogio);
	}
	// O `error` não sai daqui: nem para o navegador, nem para o log.
	const resposta: Response | undefined = resultado.response;
	if (!resposta) {
		falhou(desistir.signal.aborted ? "tempo-esgotado" : "sem-resposta");
	}
	return { data: resultado.data, response: resposta };
}

/**
 * Registra a falha no servidor numa linha fixa, só com o motivo curto (como
 * `http-503` ou `tempo-esgotado`), e lança o erro genérico. Nunca vai ao log a
 * exceção, o corpo da resposta nem o endereço da API.
 */
function falhou(motivo: string): never {
	console.error(`[edicoes] A leitura das edições na API falhou: ${motivo}.`);
	throw new Error(ERRO_DAS_EDICOES);
}

function pareceLista(dados: unknown): dados is ListaEdicoes {
	return (
		ehObjeto(dados) &&
		typeof dados.total === "number" &&
		Number.isSafeInteger(dados.total) &&
		dados.total >= 0 &&
		Array.isArray(dados.edicoes) &&
		dados.edicoes.every(pareceResumo)
	);
}

function pareceEdicao(dados: unknown): dados is EdicaoPublica {
	return (
		pareceResumo(dados) &&
		"itens" in dados &&
		Array.isArray(dados.itens) &&
		dados.itens.every(pareceItem)
	);
}

function pareceResumo(dados: unknown): dados is ResumoEdicao {
	return (
		ehObjeto(dados) &&
		typeof dados.id === "number" &&
		idDaEdicao(dados.id) !== null &&
		typeof dados.titulo === "string" &&
		pareceDia(dados.inicio) &&
		pareceDia(dados.fim) &&
		typeof dados.publicada_em === "string"
	);
}

function pareceDia(valor: unknown): boolean {
	if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
		return false;
	}
	const dia = new Date(valor);
	return (
		Number.isFinite(dia.getTime()) && dia.toISOString().slice(0, 10) === valor
	);
}

function pareceItem(dados: unknown): boolean {
	return (
		ehObjeto(dados) &&
		Number.isSafeInteger(dados.ordem) &&
		(dados.tipo === "votacao" || dados.tipo === "ato") &&
		typeof dados.titulo === "string" &&
		typeof dados.texto === "string" &&
		Array.isArray(dados.fontes) &&
		dados.fontes.every(pareceFonte) &&
		(dados.artigo === null ||
			(ehObjeto(dados.artigo) &&
				typeof dados.artigo.titulo === "string" &&
				typeof dados.artigo.caminho === "string"))
	);
}

function pareceFonte(dados: unknown): boolean {
	return (
		ehObjeto(dados) &&
		typeof dados.url === "string" &&
		typeof dados.coletado_em === "string" &&
		(dados.trecho === null || typeof dados.trecho === "string")
	);
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}
