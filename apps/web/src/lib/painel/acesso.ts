import { notFound, redirect } from "@tanstack/react-router";
import { consultarPerfil } from "@/client";
import { ENV } from "@/env";

// A guarda do painel. O cookie da sessão é da API, e só o navegador o envia:
// o servidor do site nunca vê a conta, e por isso o layout _autenticado.tsx não
// roda no servidor (ssr: false). O rascunho só é pedido depois desta conferência.

/** Quanto a guarda espera a API responder antes de desistir. */
const PRAZO = 15_000;

/**
 * A mensagem fixa do erro da guarda. A página de erro não a mostra, e ela não
 * leva a resposta nem o endereço da API.
 */
export const ERRO_DA_GUARDA = "A sessão não pôde ser conferida.";

export type Acesso =
	| "administradora"
	| "sem-sessao"
	| "sem-acesso"
	| "indisponivel";

/**
 * Quem está no navegador, para o painel: a administradora, quem não entrou, a
 * conta sem o papel (comum ou com o papel revogado) ou a API que não respondeu.
 * Um papel que a tela não conhece não abre o painel.
 */
export async function consultarAcesso(signal?: AbortSignal): Promise<Acesso> {
	const prazo = AbortSignal.timeout(PRAZO);
	const { data, response } = await consultarPerfil({
		credentials: "include",
		cache: "no-store",
		signal: signal ? AbortSignal.any([signal, prazo]) : prazo,
	});
	// Sem internet ou com o prazo esgotado, o cliente gerado devolve a resposta
	// vazia, embora o tipo dele diga que ela sempre vem.
	const resposta: Response | undefined = response;
	if (resposta?.status === 401) {
		return "sem-sessao";
	}
	// Uma resposta sem o papel é uma API com defeito, e não uma conta comum.
	if (resposta?.ok && typeof data?.papel === "string") {
		return data.papel === "administradora" ? "administradora" : "sem-acesso";
	}
	return "indisponivel";
}

/**
 * O beforeLoad do painel: sem conta, o login; com a conta comum ou o papel
 * revogado, a página não encontrada, como a API, que responde 404 a quem não é
 * administradora; com a API fora do ar, a página de erro, com "Tentar de novo".
 * Sem o API_URL, como nas prévias, nada é pedido, e a página diz que o painel
 * não funciona naquele endereço.
 */
export async function exigirAdministradora({
	abortController,
}: {
	abortController?: AbortController;
} = {}): Promise<void> {
	if (!ENV.API_URL) {
		return;
	}
	const acesso = await consultarAcesso(abortController?.signal);
	if (acesso === "sem-sessao") {
		throw redirect({ to: "/login", replace: true });
	}
	if (acesso === "sem-acesso") {
		throw notFound();
	}
	if (acesso === "indisponivel") {
		throw new Error(ERRO_DA_GUARDA);
	}
}
