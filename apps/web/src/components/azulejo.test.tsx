// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { azulejoDaPosicao, type Peca } from "@/lib/azulejos";
import { SIMBOLOS } from "@/lib/simbolos";
import { Azulejo, AzulejoGrande, Painel } from "./azulejo";

afterEach(cleanup);

const peca: Peca = { motivo: 1, volta: 2, fundo: "papel-2", desenho: "verde" };

describe("azulejo", () => {
	it("é só desenho: fica fora do leitor de tela, sem texto", () => {
		const { container } = render(<Azulejo peca={peca} />);
		const azulejo = container.firstElementChild;

		expect(azulejo?.getAttribute("aria-hidden")).toBe("true");
		expect(azulejo?.textContent).toBe("");
	});

	it("leva o motivo na classe, e o cru numa classe à parte", () => {
		const { container } = render(
			<>
				<Azulejo peca={peca} />
				<Azulejo peca={peca} cru />
			</>,
		);
		const [colorido, cru] = container.children;

		// As classes separadas: o CSS pinta o motivo pela "m1" e o cru pela "cru".
		expect(colorido.className).toBe("az m1");
		expect(cru.className).toBe("az m1 cru");
	});

	it("escreve o fundo, o desenho e a volta nas variáveis que o CSS lê", () => {
		const { container } = render(<Azulejo peca={peca} vez={3} />);
		const estilo = (container.firstElementChild as HTMLElement).style;

		expect(estilo.getPropertyValue("--a")).toBe("var(--papel-2)");
		expect(estilo.getPropertyValue("--b")).toBe("var(--fita-verde)");
		expect(estilo.getPropertyValue("--r")).toBe("2");
		expect(estilo.getPropertyValue("--i")).toBe("3");
	});
});

describe("azulejo grande", () => {
	it("tem quatro peças, fora do leitor de tela", () => {
		const { container } = render(
			<AzulejoGrande pecas={azulejoDaPosicao(1)} className="da-linha" />,
		);
		const grande = container.firstElementChild;

		expect(grande?.className).toBe("grande da-linha");
		expect(grande?.getAttribute("aria-hidden")).toBe("true");
		expect(grande?.querySelectorAll(".az")).toHaveLength(4);
	});

	it("começa cru quando pedem, com as quatro peças sem cor", () => {
		const { container } = render(
			<AzulejoGrande pecas={azulejoDaPosicao(1)} cru />,
		);

		expect(container.querySelectorAll(".az.cru")).toHaveLength(4);
	});

	it("com o símbolo, cada peça fica lisa e mostra o quarto dela do desenho", () => {
		const { container } = render(
			<AzulejoGrande
				pecas={azulejoDaPosicao(1)}
				simbolo="livro"
				className="da-linha"
			/>,
		);
		const grande = container.firstElementChild as HTMLElement;
		const pecas = [...grande.querySelectorAll<HTMLElement>(".az")];
		const desenhos = pecas.map((peca) => peca.querySelector("svg"));

		expect(grande.className).toBe("grande com-simbolo da-linha");
		expect(grande.dataset.simbolo).toBe("livro");
		// A peça lisa é o motivo 8: o desenho vem só do SVG, com a cor da posição.
		expect(pecas.map((peca) => peca.className)).toEqual(Array(4).fill("az m8"));
		expect(pecas[0].style.getPropertyValue("--b")).toBe("var(--tinta)");
		// Cada quarto da caixa de 100, com 1 de sobra em volta para a emenda.
		expect(desenhos.map((svg) => svg?.getAttribute("viewBox"))).toEqual([
			"-1 -1 52 52",
			"49 -1 52 52",
			"-1 49 52 52",
			"49 49 52 52",
		]);
		for (const svg of desenhos) {
			expect(svg?.getAttribute("aria-hidden")).toBe("true");
			expect(
				[...(svg?.querySelectorAll("path") ?? [])].map((parte) =>
					parte.getAttribute("d"),
				),
			).toEqual(SIMBOLOS.livro.map((parte) => parte.d));
		}
	});

	it("tem o desenho inteiro para pintar as emendas com as peças paradas", () => {
		const { container } = render(
			<AzulejoGrande pecas={azulejoDaPosicao(1)} simbolo="livro" />,
		);
		const inteiro = container.querySelector(".grande > svg");

		expect(inteiro?.getAttribute("viewBox")).toBe("0 0 100 100");
		expect(inteiro?.getAttribute("preserveAspectRatio")).toBe("none");
		expect(inteiro?.getAttribute("aria-hidden")).toBe("true");
		expect(inteiro?.getAttribute("focusable")).toBe("false");
		expect(
			[...(inteiro?.querySelectorAll("path") ?? [])].map((parte) =>
				parte.getAttribute("d"),
			),
		).toEqual(SIMBOLOS.livro.map((parte) => parte.d));
	});

	it("reserva o quarto de volta na lista e na sanfona aos azulejos da posição", () => {
		const css = readFileSync(
			join(dirname(fileURLToPath(import.meta.url)), "../estilos/movimento.css"),
			"utf8",
		);
		const quartoDeVolta = css.match(/([^{}]+)\{\s*rotate: 90deg;\s*\}/)?.[1];

		expect(quartoDeVolta).toContain(
			".trilha-da-lista:hover .trilha-cabeca > .da-linha:not(.com-simbolo)",
		);
		expect(quartoDeVolta).toContain(
			".sanfona details[open] .grande:not(.com-simbolo)",
		);
	});

	it("desenha os buracos, o traço e o giro de cada parte do símbolo", () => {
		const { container } = render(
			<>
				<AzulejoGrande pecas={azulejoDaPosicao(1)} simbolo="caneta" />
				<AzulejoGrande pecas={azulejoDaPosicao(2)} simbolo="duas-casas" />
			</>,
		);
		const [caneta, casas] = [...container.children].map((grande) => [
			...(grande.querySelector("svg")?.querySelectorAll("path") ?? []),
		]);

		expect(caneta[0].getAttribute("fill-rule")).toBe("evenodd");
		expect(caneta[0].getAttribute("transform")).toBe("rotate(35 50 50)");
		expect(caneta[2].getAttribute("transform")).toBeNull();
		expect(casas[3].getAttribute("class")).toBe("traco");
		expect(casas[3].getAttribute("stroke-width")).toBe("5");
		expect(casas[0].getAttribute("class")).toBeNull();
	});

	it("cru, o azulejo do símbolo fica sem cor e continua com o desenho", () => {
		const { container } = render(
			<AzulejoGrande pecas={azulejoDaPosicao(1)} simbolo="folha" cru />,
		);

		expect(container.querySelectorAll(".az.cru > svg")).toHaveLength(4);
	});
});

describe("painel", () => {
	it("tem as peças pedidas, em colunas, fora do leitor de tela", () => {
		const { container } = render(
			<Painel semente={7} colunas={4} quantas={24} className="mural" />,
		);
		const painel = container.firstElementChild as HTMLElement;

		expect(painel.className).toBe("painel mural");
		expect(painel.getAttribute("aria-hidden")).toBe("true");
		expect(painel.style.getPropertyValue("--col")).toBe("4");
		expect(painel.querySelectorAll(".az")).toHaveLength(24);
	});

	it("o servidor e o navegador desenham o mesmo painel", () => {
		const painel = <Painel semente={31} colunas={8} quantas={16} />;
		// O motivo e as variáveis de cada peça: o servidor e o navegador escrevem o
		// atributo style de jeitos diferentes, e o que importa é o que o CSS lê.
		const pecas = (caixa: Element) =>
			[...caixa.querySelectorAll<HTMLElement>(".az")].map((az) => [
				az.className,
				...["--a", "--b", "--r", "--i"].map((variavel) =>
					az.style.getPropertyValue(variavel),
				),
			]);
		const doServidor = document.createElement("div");
		doServidor.innerHTML = renderToStaticMarkup(painel);
		const { container } = render(painel);

		expect(pecas(doServidor)).toHaveLength(16);
		expect(pecas(container)).toEqual(pecas(doServidor));
	});

	it("com outra semente, o painel é outro", () => {
		const um = renderToStaticMarkup(
			<Painel semente={1} colunas={4} quantas={16} />,
		);
		const outro = renderToStaticMarkup(
			<Painel semente={2} colunas={4} quantas={16} />,
		);

		expect(um).not.toBe(outro);
	});
});
