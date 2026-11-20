import { type PedidoTentativaPiloto, registrarTentativaPiloto } from "@/client";

// O envio de uma etapa do piloto, pelo cliente gerado da API
// (docs/medicao-do-piloto.md). A função daqui não lança erro: cada resposta vira
// um resultado, e quem manda decide se repete (lib/reenvio-do-piloto.ts). O
// código do piloto só vai no corpo do POST, e nada daqui o escreve no console, na
// URL ou em outro lugar.

/** Quanto a tela espera a API responder antes de desistir do pedido. */
const TEMPO_DE_ESPERA = 20_000;

/** As esperas antes de cada reenvio, em segundos; depois, um minuto a cada vez. */
const ESPERAS = [5, 15, 30, 60] as const;

export type ResultadoDoEnvio =
	/** A API guardou a etapa, ou já tinha guardado a primeira conclusão dela. */
	| { tipo: "recebida" }
	/** O piloto não recebe respostas (410): antes de ligar ou depois de acabar. */
	| { tipo: "encerrado" }
	/** A API recusou o pedido (413 ou 422): repetir o mesmo corpo não adianta. */
	| { tipo: "recusado" }
	/** Muitos envios no minuto (429). Os segundos vêm do Retry-After. */
	| { tipo: "limite"; segundos?: number }
	/**
	 * O serviço não confirmou a gravação (503 e o resto), ou o pedido não teve
	 * resposta com o aparelho conectado: dá para repetir.
	 */
	| { tipo: "fora-do-ar" }
	/** Sem internet no aparelho: o pedido sai de novo quando ela voltar. */
	| { tipo: "sem-conexao" };

/** Manda uma etapa concluída e diz o que a API respondeu. */
export async function enviarEtapa(
	pedido: PedidoTentativaPiloto,
): Promise<ResultadoDoEnvio> {
	// O relógio é daqui, e não o AbortSignal.timeout, que o Safari só tem a
	// partir da versão 16: num iPhone que parou no iOS 15, o envio não sairia.
	const desistir = new AbortController();
	const relogio = setTimeout(() => desistir.abort(), TEMPO_DE_ESPERA);
	try {
		const { response } = await registrarTentativaPiloto({
			body: pedido,
			signal: desistir.signal,
		});
		// Sem resposta, como sem internet ou com o tempo esgotado, o cliente
		// gerado devolve a resposta vazia, embora o tipo dele diga que ela
		// sempre vem.
		const resposta: Response | undefined = response;
		if (!resposta) {
			return semResposta();
		}
		if (resposta.ok) {
			return { tipo: "recebida" };
		}
		switch (resposta.status) {
			case 410:
				return { tipo: "encerrado" };
			case 413:
			case 422:
				return { tipo: "recusado" };
			case 429:
				return { tipo: "limite", ...segundosDaEspera(resposta) };
			default:
				return { tipo: "fora-do-ar" };
		}
	} catch {
		return semResposta();
	} finally {
		clearTimeout(relogio);
	}
}

/**
 * O pedido que ficou sem resposta. O navegador só sabe com certeza quando o
 * aparelho está sem internet (o `navigator.onLine` falso); conectado, a API não
 * aceitou a conexão ou não respondeu a tempo, como quando está fora do ar.
 */
function semResposta(): ResultadoDoEnvio {
	return navigator.onLine === false
		? { tipo: "sem-conexao" }
		: { tipo: "fora-do-ar" };
}

/** A espera antes do reenvio de número `vez`, a partir de 0, em segundos. */
export function esperaDoReenvio(vez: number): number {
	return ESPERAS[vez] ?? ESPERAS[ESPERAS.length - 1];
}

/** O Retry-After da API vem em segundos inteiros. */
function segundosDaEspera(resposta: Response): { segundos?: number } {
	const segundos = Number(resposta.headers.get("Retry-After"));
	return Number.isInteger(segundos) && segundos > 0 ? { segundos } : {};
}
