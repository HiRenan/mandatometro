// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enderecoDoEfeito, lerSom, ligarSom, tocar } from "./som";

// A janela do jsdom é a mesma para todos os testes do arquivo: cada um começa
// com o armazenamento limpo (docs/codigo-do-site.md).

describe("som do jogo", () => {
	beforeEach(() => {
		window.localStorage.clear();
		window.sessionStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("começa ligado e guarda a escolha neste navegador", () => {
		expect(lerSom()).toBe(true);

		ligarSom(false);
		expect(lerSom()).toBe(false);

		ligarSom(true);
		expect(lerSom()).toBe(true);
	});

	it("não toca nada com o som desligado", () => {
		const falso = vi.fn();
		vi.stubGlobal("Audio", falso);
		ligarSom(false);

		tocar("carimbo");

		expect(falso).not.toHaveBeenCalled();
	});

	it("toca o efeito pelo endereço do arquivo, com o som ligado (o padrão)", () => {
		const play = vi.fn(() => Promise.resolve());
		const pedidos: string[] = [];
		const tocados: Array<{ volume: number }> = [];
		// O `new Audio(...)` precisa de uma função de verdade: uma seta lança.
		function AudioFalso(
			this: { volume: number; play: () => Promise<void> },
			src: string,
		) {
			pedidos.push(src);
			this.volume = 0;
			this.play = play;
			tocados.push(this);
		}
		vi.stubGlobal("Audio", AudioFalso);
		ligarSom(true);

		tocar("carimbo");

		expect(pedidos).toEqual(["/jogo/audio/sfx-carimbo.ogg"]);
		expect(play).toHaveBeenCalled();
		expect(tocados[0].volume).toBeGreaterThan(0);
	});

	it("segue o jogo quando o navegador recusa tocar", () => {
		vi.stubGlobal(
			"Audio",
			vi.fn(() => {
				throw new Error("sem permissão para tocar");
			}),
		);
		ligarSom(true);

		expect(() => tocar("painel")).not.toThrow();
	});

	it("guarda a escolha na memória quando o armazenamento está bloqueado", () => {
		vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
			throw new Error("armazenamento bloqueado");
		});
		vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
			throw new Error("armazenamento bloqueado");
		});

		ligarSom(false);

		expect(lerSom()).toBe(false);
	});

	it("tem um endereço por efeito, dentro de /jogo/audio/", () => {
		for (const efeito of [
			"texto",
			"carimbo",
			"campainha",
			"painel",
			"revelacao",
		] as const) {
			expect(enderecoDoEfeito(efeito)).toMatch(/^\/jogo\/audio\/sfx-.+\.ogg$/);
		}
	});
});
