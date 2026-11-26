import { getRequestHeader } from "@tanstack/react-start/server";
import { registrarOpiniao } from "@/client";
import { ENV } from "@/env";
import { OPINIAO_FORA_DO_AR, type PedidoDaOpiniao } from "./opiniao";

export async function entregarOpiniao(pedido: PedidoDaOpiniao) {
	if (!ENV.API_URL) {
		throw new Error(OPINIAO_FORA_DO_AR);
	}
	// Só o agente de usuário segue do pedido original para a detecção de robôs.
	const agente = getRequestHeader("user-agent");
	const signal = AbortSignal.timeout(8_000);
	const resposta: Response | undefined = await registrarOpiniao({
		body: pedido,
		credentials: "omit",
		headers: agente ? { "User-Agent": agente } : undefined,
		signal,
	})
		.then(({ response }) => response)
		.catch(() => undefined);

	switch (resposta?.status) {
		case 204:
			return "enviada";
		case 413:
		case 422:
			return "texto-invalido";
		case 429:
			return "limite";
		default: {
			const motivo = resposta
				? `http-${resposta.status}`
				: signal.aborted
					? "tempo-esgotado"
					: "sem-resposta";
			console.error(`[opiniao] O envio à API falhou: ${motivo}.`);
			throw new Error(OPINIAO_FORA_DO_AR);
		}
	}
}
