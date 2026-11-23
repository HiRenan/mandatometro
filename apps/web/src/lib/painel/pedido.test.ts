import { afterEach, describe, expect, it, vi } from "vitest";
import { opcoes, pedir } from "./pedido";

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("o prazo dos pedidos sem os métodos de AbortSignal", () => {
	it("interrompe um pedido pendente após 30 segundos", async () => {
		vi.stubGlobal("AbortSignal", {});
		vi.useFakeTimers();
		const { signal } = opcoes(new AbortController().signal);
		const resposta = pedir(
			new Promise((_, rejeitar) => {
				signal.addEventListener("abort", () => rejeitar(signal.reason));
			}),
		);

		vi.advanceTimersByTime(29_999);
		expect(signal.aborted).toBe(false);
		vi.advanceTimersByTime(1);
		expect(signal.reason).toMatchObject({ name: "TimeoutError" });
		await expect(resposta).resolves.toEqual({ tipo: "sem-conexao" });
	});

	it("preserva o cancelamento da navegação e limpa o relógio", () => {
		vi.stubGlobal("AbortSignal", {});
		vi.useFakeTimers();
		const navegador = new AbortController();
		const { signal } = opcoes(navegador.signal);
		const motivo = new DOMException("A navegação mudou.", "AbortError");

		navegador.abort(motivo);

		expect(signal.aborted).toBe(true);
		expect(signal.reason).toBe(motivo);
		expect(vi.getTimerCount()).toBe(0);
		expect(opcoes(navegador.signal).signal.reason).toBe(motivo);
		expect(vi.getTimerCount()).toBe(0);
	});
});
