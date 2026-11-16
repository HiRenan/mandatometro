import {
	inscreverNewsletter,
	type ResultadoInscricao,
	sairDaNewsletter,
} from "@/client";

// A inscrição e a saída da newsletter, pelo cliente gerado da API. As funções
// daqui não lançam erro: cada resposta vira um resultado, que a tela mostra em
// palavras. O e-mail só vai no corpo do POST, e nada daqui o escreve no console,
// na URL ou no armazenamento do navegador.

/** Quanto a tela espera a API responder antes de desistir do pedido. */
const TEMPO_DE_ESPERA = 20_000;

export type Situacao = ResultadoInscricao["situacao"];

const SITUACOES: readonly Situacao[] = [
	"edicao_enviada",
	"aguardando_edicao",
	"envio_indisponivel",
];

export type ResultadoDaInscricao =
	| { tipo: "inscrita"; situacao: Situacao }
	| { tipo: "email-invalido" }
	/** Os segundos vêm do Retry-After; sem ele, a tela pede um minuto. */
	| { tipo: "limite"; segundos?: number }
	| { tipo: "fora-do-ar" }
	| { tipo: "sem-conexao" };

export type ResultadoDaSaida =
	| { tipo: "saiu" }
	| { tipo: "link-invalido" }
	| { tipo: "fora-do-ar" }
	| { tipo: "sem-conexao" };

/**
 * O e-mail tem nome, @ e domínio com ponto, sem espaço no meio. A conferência
 * daqui só pega o que falta: a API confere o resto e responde 422, que a tela
 * mostra com a mesma mensagem. O acento passa, porque a API aceita.
 */
export function emailValido(texto: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto.trim());
}

/** O código de saída é o UUID que a API põe no link do fim de cada edição. */
export function codigoValido(codigo: string | undefined): codigo is string {
	return (
		codigo !== undefined &&
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			codigo,
		)
	);
}

export async function pedirInscricao(
	email: string,
): Promise<ResultadoDaInscricao> {
	const { data, response } = await inscreverNewsletter({
		body: { email: email.trim() },
		signal: AbortSignal.timeout(TEMPO_DE_ESPERA),
	});
	// Sem internet ou com o tempo esgotado, o cliente gerado devolve a resposta
	// vazia, embora o tipo dele diga que ela sempre vem.
	const resposta: Response | undefined = response;
	if (!resposta) {
		return { tipo: "sem-conexao" };
	}
	if (resposta.ok) {
		// O 200 vem depois de a inscrição ficar no banco: uma situação que a tela
		// não conhece ainda é uma inscrição feita, só sem a certeza do envio.
		const situacao =
			SITUACOES.find((conhecida) => conhecida === data?.situacao) ??
			"envio_indisponivel";
		return { tipo: "inscrita", situacao };
	}
	switch (resposta.status) {
		case 422:
			return { tipo: "email-invalido" };
		case 429:
			return { tipo: "limite", ...segundosDaEspera(resposta) };
		default:
			return { tipo: "fora-do-ar" };
	}
}

export async function pedirSaida(codigo: string): Promise<ResultadoDaSaida> {
	const { response } = await sairDaNewsletter({
		path: { codigo_saida: codigo },
		signal: AbortSignal.timeout(TEMPO_DE_ESPERA),
	});
	// Sem resposta, como na inscrição.
	const resposta: Response | undefined = response;
	if (!resposta) {
		return { tipo: "sem-conexao" };
	}
	// A API responde 200 também ao código já usado ou desconhecido, sem dizer se
	// ele estava na lista.
	if (resposta.ok) {
		return { tipo: "saiu" };
	}
	return resposta.status === 422
		? { tipo: "link-invalido" }
		: { tipo: "fora-do-ar" };
}

/** O Retry-After da API vem em segundos inteiros, de 1 a 60. */
function segundosDaEspera(resposta: Response): { segundos?: number } {
	const segundos = Number(resposta.headers.get("Retry-After"));
	return Number.isInteger(segundos) && segundos > 0 ? { segundos } : {};
}
