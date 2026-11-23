import type { AnyRouter } from "@tanstack/react-router";
import { ENV } from "@/env";

// A contagem das páginas vistas (a #298): a cada página, o navegador avisa a
// API, sem o cookie (credentials: "omit"), e a API soma 1 no dia e no caminho.
// O pedido leva só o caminho: nada aqui diz quem visitou. Sem JavaScript, a
// visita não conta, e a página continua igual. O aviso não espera a resposta,
// e uma falha não aparece para quem visita.

/** Quanto o aviso espera a API antes de desistir. */
const PRAZO = 10_000;

/** O painel e as telas da conta, que não contam. A API também os ignora. */
const FORA_DA_CONTAGEM =
	/^\/(?:painel|perfil|login|cadastro|newsletter\/sair)(?:\/|$)/;

/**
 * O caminho que a visita manda, ou nulo no painel e nas telas da conta. O
 * caminho do router já vem sem a busca e sem o trecho, e a API só aceita assim.
 */
export function caminhoQueConta(caminho: string): string | null {
	return FORA_DA_CONTAGEM.test(caminho) ? null : caminho;
}

/** Avisa a API da página vista. Só onde o site tem o API_URL. */
export async function avisarVisita(pathname: string): Promise<void> {
	const caminho = caminhoQueConta(pathname);
	if (!ENV.API_URL || caminho === null) {
		return;
	}
	try {
		// O cliente da API fica fora do pacote que toda página baixa, como no
		// progresso (lib/progresso.ts): ele chega depois, só para o aviso.
		const { registrarVisita } = await import("@/client");
		await registrarVisita({
			body: { caminho },
			credentials: "omit",
			keepalive: true,
			signal: AbortSignal.timeout(PRAZO),
		});
	} catch {
		// A visita é um complemento: sem rede ou sem API, a página segue igual.
	}
}

/**
 * Os routers que já contaram a página da primeira carga. No dev, o React em
 * modo estrito monta o efeito do contador, desmonta e monta de novo, e a
 * primeira página contava duas vezes.
 */
const jaContaram = new WeakSet<object>();

/**
 * Conta a página aberta agora e, depois, cada página nova do router. A troca
 * que muda só a busca ou o trecho do endereço não conta de novo, nem ligar o
 * contador outra vez no mesmo router. Devolve a função que para de contar.
 */
export function acompanharVisitas(
	router: Pick<AnyRouter, "state" | "subscribe">,
	avisar: (caminho: string) => unknown = avisarVisita,
): () => void {
	if (!jaContaram.has(router)) {
		jaContaram.add(router);
		avisar(router.state.location.pathname);
	}
	return router.subscribe(
		"onResolved",
		({ fromLocation, pathChanged, toLocation }) => {
			if (fromLocation && pathChanged) {
				avisar(toLocation.pathname);
			}
		},
	);
}
