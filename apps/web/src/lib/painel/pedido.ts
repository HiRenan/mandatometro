import { sinalComPrazo } from "@/lib/prazo";

// Os pedidos do painel à API: a revisão (use-revisao.ts) e os números
// (use-numeros.ts). Cada pedido leva o cookie da sessão, que é da API
// (credentials: "include"), não fica no cache do navegador e tem prazo.

/** Quanto a tela espera a API antes de desistir. O salvar espera a trava da edição. */
const PRAZO = 30_000;

export const SEM_CONEXAO =
	"Não deu para falar com o servidor. Confira a internet e tente de novo.";
const FALHA_DA_API = "A API não respondeu como esperado. Tente de novo.";

/** A mensagem que a API manda nos erros do painel (ErroPainel), quando é texto. */
function detalheDe(erro: unknown): string | undefined {
	return typeof erro === "object" &&
		erro !== null &&
		"detail" in erro &&
		typeof erro.detail === "string"
		? erro.detail
		: undefined;
}

/** A resposta de um pedido do painel, reduzida ao que a tela usa. */
export type Resposta<T> =
	| { tipo: "ok"; dados: T }
	| { tipo: "erro"; status: number; detalhe: string | undefined }
	| { tipo: "sem-conexao" };

export async function pedir<T>(
	pedido: Promise<{ data?: T; error?: unknown; response?: Response }>,
): Promise<Resposta<T>> {
	try {
		const { data, error, response } = await pedido;
		// Sem internet ou com o prazo esgotado, o cliente gerado devolve a resposta
		// vazia, embora o tipo dele diga que ela sempre vem.
		const resposta: Response | undefined = response;
		if (!resposta) {
			return { tipo: "sem-conexao" };
		}
		if (resposta.ok && data !== undefined) {
			return { tipo: "ok", dados: data };
		}
		return { tipo: "erro", status: resposta.status, detalhe: detalheDe(error) };
	} catch {
		return { tipo: "sem-conexao" };
	}
}

/** As opções de todo pedido do painel: o cookie da API, sem cache e com prazo. */
export function opcoes(sinal: AbortSignal) {
	return {
		credentials: "include",
		cache: "no-store",
		signal: sinalComPrazo(PRAZO, sinal),
	} as const;
}

/** A API do painel responde 401 sem sessão e 404 a quem não é administradora. */
export function acessoRecusado(status: number): boolean {
	return status === 401 || status === 404;
}

/**
 * A frase de quando a API recusa ou falha: a mensagem dela, como a do 503
 * ("Há outra gravação em andamento. Tente de novo."), ou a frase geral quando a
 * resposta não traz mensagem, como a de um servidor no caminho.
 */
export function falhaDe(resposta: Resposta<unknown>): string {
	if (resposta.tipo === "sem-conexao") {
		return SEM_CONEXAO;
	}
	return (resposta.tipo === "erro" && resposta.detalhe) || FALHA_DA_API;
}
