// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
// O texto do arquivo da rota raiz, que o Vite entrega com o ?raw.
import rotaRaiz from "../routes/__root.tsx?raw";
import { CliqueNaTroca } from "./clique-na-troca";

afterEach(() => {
	cleanup();
	document.body.innerHTML = "";
	Reflect.deleteProperty(document, "activeViewTransition");
	Reflect.deleteProperty(document, "elementFromPoint");
});

/**
 * Uma página com um botão embaixo do ponteiro e uma troca rodando. O jsdom não
 * tem o activeViewTransition nem o elementFromPoint.
 */
function paginaTrocando() {
	const botao = document.createElement("button");
	botao.textContent = "Começar";
	document.body.append(botao);
	const cliques: MouseEvent[] = [];
	botao.addEventListener("click", (evento) => cliques.push(evento));
	const troca = { skipTransition: vi.fn() };
	Object.defineProperty(document, "activeViewTransition", {
		configurable: true,
		get: () => troca,
	});
	Object.defineProperty(document, "elementFromPoint", {
		configurable: true,
		value: () => botao,
	});
	return { cliques, troca };
}

/** Durante a troca, o navegador entrega o toque e o clique ao documento. */
function tocarEClicar() {
	document.documentElement.dispatchEvent(
		new Event("pointerdown", { bubbles: true }),
	);
	document.documentElement.dispatchEvent(
		new MouseEvent("click", {
			bubbles: true,
			detail: 1,
			clientX: 120,
			clientY: 300,
		}),
	);
}

describe("CliqueNaTroca", () => {
	it("montado, encerra a troca no toque e leva o clique à página nova", () => {
		const { cliques, troca } = paginaTrocando();
		render(<CliqueNaTroca />);

		tocarEClicar();

		expect(troca.skipTransition).toHaveBeenCalledTimes(1);
		expect(cliques).toHaveLength(1);
	});

	it("desmontado, deixa de ouvir o documento", () => {
		const { cliques, troca } = paginaTrocando();
		const { unmount } = render(<CliqueNaTroca />);
		unmount();

		tocarEClicar();

		expect(troca.skipTransition).not.toHaveBeenCalled();
		expect(cliques).toHaveLength(0);
	});

	// A rota raiz não é montada em teste nenhum (ela desenha o <html> inteiro):
	// este lê o arquivo, para a peça não sair do documento sem ninguém ver.
	it("está no documento de todas as páginas, na rota raiz", () => {
		expect(rotaRaiz).toContain("<CliqueNaTroca />");
	});
});
