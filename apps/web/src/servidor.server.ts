import type { Register } from "@tanstack/react-router";
import { getNormalizedURL } from "@tanstack/react-router/ssr/server";
import {
	createServerEntry,
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";

const tratar = createStartHandler(defaultStreamHandler);
const LIMITE_DO_CORPO = 24 * 1024;
// O Start não decodifica o payload da consulta acima desse tamanho.
const LIMITE_DO_PAYLOAD_GET = 1_000_000;

function caminhoDeServerFunction(url: URL): boolean {
	const { url: normalizada, handledProtocolRelativeURL } =
		getNormalizedURL(url);
	return (
		!handledProtocolRelativeURL &&
		normalizada.pathname.startsWith("/_serverFn/")
	);
}

function recusar(erro: "corpo_grande" | "corpo_invalido"): Response {
	console.warn(`[server-functions] Pedido recusado: ${erro}.`);
	return Response.json(
		{ erro },
		{
			status: erro === "corpo_grande" ? 413 : 400,
			headers: { "Cache-Control": "no-store" },
		},
	);
}

async function conferirCorpo(pedido: Request): Promise<Request | Response> {
	if (Number(pedido.headers.get("Content-Length")) > LIMITE_DO_CORPO) {
		return recusar("corpo_grande");
	}

	const leitor = pedido.body?.getReader();
	const buffer = new Uint8Array(LIMITE_DO_CORPO);
	let tamanho = 0;
	try {
		if (leitor) {
			while (true) {
				const { done, value } = await leitor.read();
				if (done) break;
				if (tamanho + value.byteLength > LIMITE_DO_CORPO) {
					return recusar("corpo_grande");
				}
				buffer.set(value, tamanho);
				tamanho += value.byteLength;
			}
		}

		const corpo = buffer.subarray(0, tamanho);
		if (pedido.headers.get("Content-Type")?.includes("application/json")) {
			// O Start recebe o JSON já conferido e ainda faz sua própria desserialização.
			JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(corpo));
		}
		return leitor
			? new Request(pedido.url, {
					method: pedido.method,
					headers: pedido.headers,
					signal: pedido.signal,
					body: corpo,
				})
			: pedido;
	} catch {
		return recusar("corpo_invalido");
	} finally {
		leitor?.releaseLock();
	}
}

export default createServerEntry<Register>({
	async fetch(pedido, opcoes) {
		if (pedido.method === "GET") {
			const url = new URL(pedido.url);
			const payload = url.searchParams.get("payload");
			if (
				payload &&
				payload.length <= LIMITE_DO_PAYLOAD_GET &&
				caminhoDeServerFunction(url)
			) {
				try {
					JSON.parse(payload);
				} catch {
					return recusar("corpo_invalido");
				}
			}
			return tratar(pedido, opcoes);
		}
		if (
			pedido.method !== "POST" ||
			!caminhoDeServerFunction(new URL(pedido.url))
		) {
			return tratar(pedido, opcoes);
		}
		const conferido = await conferirCorpo(pedido);
		if (conferido instanceof Response) return conferido;
		return tratar(conferido, opcoes);
	},
});
