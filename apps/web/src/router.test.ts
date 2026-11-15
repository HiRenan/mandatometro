// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { getRouter } from "./router";

afterEach(() => {
	Reflect.deleteProperty(document, "startViewTransition");
	Reflect.deleteProperty(document, "activeViewTransition");
	vi.unstubAllGlobals();
});

/**
 * Uma troca de página que o navegador pula antes de começar a animar, como
 * quando a pessoa volta pelo navegador logo depois de tocar num link: a promessa
 * `ready` dela rejeita com um AbortError. O jsdom não tem as View Transitions.
 */
function trocaPulada() {
	const pulada = new DOMException("Transition was skipped", "AbortError");
	Object.defineProperty(document, "startViewTransition", {
		configurable: true,
		value: (
			atualizar: (() => Promise<void>) | { update: () => Promise<void> },
		) => {
			const troca = {
				ready: Promise.reject(pulada),
				updateCallbackDone: (typeof atualizar === "function"
					? atualizar
					: atualizar.update)(),
				finished: Promise.resolve(),
				skipTransition: () => {},
			};
			Object.defineProperty(document, "activeViewTransition", {
				configurable: true,
				get: () => troca,
			});
			return troca;
		},
	});
	// Sem os tipos de transição: o router começa a troca sem eles.
	vi.stubGlobal("CSS", { supports: () => false });
}

/** As rejeições que ninguém tratou, enquanto `fazer` roda e logo depois. */
async function soltasDurante(fazer: () => Promise<unknown>) {
	const soltas: unknown[] = [];
	const anotar = (motivo: unknown) => soltas.push(motivo);
	process.on("unhandledRejection", anotar);
	try {
		await fazer();
		await new Promise((pronto) => setTimeout(pronto, 20));
	} finally {
		process.off("unhandledRejection", anotar);
	}
	return soltas;
}

describe("o router do site", () => {
	it("quando o navegador pula a troca de página, o AbortError dela não fica solto no console", async () => {
		trocaPulada();
		const router = getRouter();
		const novaPagina = vi.fn(async () => {});

		const soltas = await soltasDurante(() =>
			router.startViewTransition(novaPagina),
		);

		// A página nova chega do mesmo jeito: só o erro da troca pulada some.
		expect(novaPagina).toHaveBeenCalledTimes(1);
		expect(soltas).toEqual([]);
	});
});
