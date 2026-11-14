// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CARREGANDO, Carregando } from "./carregando";

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

/**
 * O site em volta do carregando: o cabeçalho, com um link, e o conteúdo, onde a
 * página fica. Quando ela demora, o carregando entra no lugar dela (router.tsx).
 */
function Site({ carregando }: { carregando: boolean }) {
	return (
		<>
			<header>
				<a href="/trilhas">Trilhas</a>
			</header>
			<main id="conteudo" tabIndex={-1}>
				{carregando ? (
					<Carregando />
				) : (
					<button type="button">Tentar de novo</button>
				)}
			</main>
		</>
	);
}

describe("o carregando", () => {
	it("diz em texto que a página está carregando, numa região role=status", () => {
		render(<Site carregando />);

		expect(CARREGANDO).toBe("Carregando a página…");
		expect(screen.getByRole("status").textContent).toBe(CARREGANDO);
	});

	it("a região entra vazia e recebe a frase depois, para o leitor de tela anunciar", () => {
		// O leitor de tela só anuncia o que muda numa região que já estava na página.
		const mudancas: MutationRecord[] = [];
		const observador = new MutationObserver((lista) => {
			mudancas.push(...lista);
		});
		observador.observe(document.body, {
			childList: true,
			subtree: true,
			characterData: true,
		});
		render(<Site carregando />);
		mudancas.push(...observador.takeRecords());
		observador.disconnect();

		const regiao = screen.getByRole("status");
		const entrouARegiao = mudancas.findIndex((mudanca) =>
			[...mudanca.addedNodes].some((no) => no.contains(regiao)),
		);
		const entrouAFrase = mudancas.findIndex(
			(mudanca) =>
				mudanca.target === regiao || mudanca.target.parentNode === regiao,
		);
		expect(entrouARegiao).toBeGreaterThanOrEqual(0);
		expect(entrouAFrase).toBeGreaterThan(entrouARegiao);
	});

	it("não tem nada girando: nem ícone, nem classe de animação", () => {
		// O CSS dele, sem animação nem transição, fica em carregando-css.test.ts.
		const { container } = render(<Site carregando />);

		expect(container.querySelector("svg")).toBeNull();
		expect(container.querySelector('[class*="animate"]')).toBeNull();
	});

	it("leva o foco para a frase quando ele saiu da tela com a página", () => {
		const { rerender } = render(<Site carregando={false} />);
		screen.getByRole("button", { name: "Tentar de novo" }).focus();

		rerender(<Site carregando />);

		expect(document.activeElement).toBe(screen.getByRole("status"));
	});

	it("com o foco, a frase entra na tela, mesmo se a pessoa tinha rolado a página", () => {
		// Com a letra grande, quem rola até o "Tentar de novo" fica, sem a página,
		// com o rodapé na tela, e a frase fica acima dela. Sem o preventScroll, o
		// navegador rola até a frase quando ela recebe o foco. O jsdom não rola:
		// o teste confere a chamada.
		const focar = vi.spyOn(HTMLElement.prototype, "focus");
		const { rerender } = render(<Site carregando={false} />);
		screen.getByRole("button", { name: "Tentar de novo" }).focus();
		focar.mockClear();

		rerender(<Site carregando />);

		const regiao = screen.getByRole("status");
		const naFrase = focar.mock.contexts.indexOf(regiao);
		expect(naFrase).toBeGreaterThanOrEqual(0);
		expect(focar.mock.calls[naFrase][0]?.preventScroll).not.toBe(true);
	});

	it("também leva o foco quando ele ficou na página escondida", () => {
		// Enquanto o carregando aparece, o React pode esconder a página que saiu
		// (display: none) sem tirá-la do documento, e o foco fica nela.
		const { rerender } = render(
			<main id="conteudo" tabIndex={-1}>
				<button type="button">Tentar de novo</button>
			</main>,
		);
		const botao = screen.getByRole("button", { name: "Tentar de novo" });
		botao.focus();

		rerender(
			<main id="conteudo" tabIndex={-1}>
				<button type="button" style={{ display: "none" }}>
					Tentar de novo
				</button>
				<Carregando />
			</main>,
		);

		expect(document.activeElement).toBe(screen.getByRole("status"));
	});

	it("deixa o foco num link do cabeçalho onde ele está", () => {
		const { rerender } = render(<Site carregando={false} />);
		const link = screen.getByRole("link", { name: "Trilhas" });
		link.focus();

		rerender(<Site carregando />);

		expect(document.activeElement).toBe(link);
	});
});
