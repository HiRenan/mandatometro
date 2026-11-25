// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JOGO_DAS_COMISSOES } from "@/lib/jogo/comissoes";
import type { JogoNaPagina } from "@/lib/jogo/paginas.server";
import { acharJogo, jogos } from "@/lib/jogo/paginas.server";
import { comecar } from "@/lib/jogo/partida";
import { CaminhosEmDebate } from "./caminhos-em-debate";
import { FimDoJogo } from "./fim-do-jogo";
import { PainelDeVotos } from "./painel-de-votos";
import { RelogioDoPrazo } from "./relogio-do-prazo";

// As peças que o roteiro de uma emenda precisa: a linha de quórum, o prazo
// dispensado, os caminhos em debate e a tela final sem a trilha. O que cada
// teste prende é a regra do produto, não o desenho.

beforeEach(() => {
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
	vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
	vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("o painel do plenário", () => {
	it("escreve o quórum junto do placar, e a linha fica fora do leitor de tela", () => {
		render(
			<PainelDeVotos
				painel={{
					tipo: "painel",
					modo: "nominal",
					sim: 472,
					nao: 22,
					quorum: 308,
					data: "2026-05-27",
					legenda: "O primeiro turno na Câmara.",
				}}
				aoAvancar={() => {}}
			/>,
		);

		expect(screen.getByText("Eram necessários 308 votos")).toBeTruthy();
		expect(document.querySelector(".jogo-quorum-linha")?.ariaHidden).toBe(
			"true",
		);
	});

	it("fica sem a linha quando o roteiro não traz quórum", () => {
		render(
			<PainelDeVotos
				painel={{
					tipo: "painel",
					modo: "nominal",
					sim: 12,
					nao: 3,
					data: "2026-05-27",
					legenda: "A votação na comissão.",
				}}
				aoAvancar={() => {}}
			/>,
		);

		expect(document.querySelector(".jogo-quorum")).toBe(null);
	});
});

describe("o relógio do prazo", () => {
	it("diz por que o prazo caiu, quando o Plenário o dispensou", () => {
		render(
			<RelogioDoPrazo
				relogio={{
					tipo: "relogio",
					sessoes: 5,
					fundamento: "art. 202 do Regimento da Câmara",
					legenda: "O interstício entre os dois turnos.",
					dispensa: "O Plenário aprovou o requerimento, e o intervalo caiu.",
				}}
				aoAvancar={() => {}}
			/>,
		);

		expect(
			screen.getByText(
				"O Plenário aprovou o requerimento, e o intervalo caiu.",
			),
		).toBeTruthy();
	});

	it("corre até o fim quando o roteiro não traz dispensa", () => {
		render(
			<RelogioDoPrazo
				relogio={{
					tipo: "relogio",
					sessoes: 5,
					fundamento: "art. 58 do Regimento da Câmara",
					legenda: "O prazo do recurso ao Plenário.",
				}}
				aoAvancar={() => {}}
			/>,
		);

		expect(document.querySelector(".jogo-dispensa")).toBe(null);
	});
});

describe("os caminhos em debate", () => {
	it("dá a cada caminho o mesmo cartão, com o que dizem a favor e contra", () => {
		render(
			<CaminhosEmDebate
				versoes={{
					tipo: "versoes",
					titulo: "Três caminhos em debate",
					caminhos: [
						{
							nome: "4x3",
							propoe: "4 dias de trabalho, 3 de folga, até 36 horas",
							aFavor: "Mais tempo livre e mais saúde",
							contra: "Custo alto e difícil para quem funciona todo dia",
						},
						{
							nome: "5x2 com transição",
							propoe: "2 folgas por semana, 42 horas e depois 40",
							aFavor: "Muda a rotina sem um salto brusco",
							contra: "Ainda pesa para o pequeno negócio",
						},
						{
							nome: "Regime flexível por hora trabalhada",
							propoe: "Opção entre o regime comum da CLT e um regime flexível",
							aFavor: "Pode acomodar horários variáveis",
							contra: "Pode tornar a renda menos previsível",
							etiqueta:
								"Depois da votação na comissão, foi apresentada no Senado.",
						},
					],
				}}
				aoAvancar={() => {}}
			/>,
		);

		const cartoes = document.querySelectorAll(".jogo-via");
		expect(cartoes.length).toBe(3);
		// Nenhum cartão é destacado: todos levam a mesma classe, sem variação.
		for (const cartao of cartoes) {
			expect(cartao.className).toBe("jogo-via");
			expect(cartao.textContent).toContain("O que dizem a favor");
			expect(cartao.textContent).toContain("O que dizem contra");
		}
	});
});

/** O jogo num site de mentira, para os `Link` da tela final funcionarem. */
function mostrarOFim(jogo: JogoNaPagina) {
	const raiz = createRootRoute({
		component: () => (
			<FimDoJogo
				jogo={jogo}
				partida={comecar()}
				comApi={false}
				aoJogarDeNovo={() => {}}
			/>
		),
	});
	const router = createRouter({
		routeTree: raiz,
		history: createMemoryHistory({ initialEntries: [`/jogos/${jogo.slug}`] }),
	});
	return render(<RouterProvider router={router} />);
}

function lerOJogo(): JogoNaPagina {
	const lido = acharJogo(jogos, JOGO_DAS_COMISSOES);
	if (!lido) {
		throw new Error("o roteiro do Jogo das Comissões não foi lido");
	}
	return lido;
}

describe("a tela final", () => {
	it("oferece rever a trilha no jogo que declara as lições", async () => {
		mostrarOFim(lerOJogo());

		expect(
			await screen.findByRole("link", { name: "Rever as lições da trilha" }),
		).toBeTruthy();
	});

	it("não oferece a trilha ao jogo que não declara as lições", async () => {
		const semTrilha: JogoNaPagina = { ...lerOJogo(), trilha: undefined };
		mostrarOFim(semTrilha);

		await screen.findByText("O caminho que você fez");
		expect(
			screen.queryByRole("link", { name: "Rever as lições da trilha" }),
		).toBe(null);
	});

	it("mostra a caixa datada do que ainda corre na Justiça", async () => {
		const jogo = lerOJogo();
		const comSituacao: JogoNaPagina = {
			...jogo,
			epilogo: {
				...jogo.epilogo,
				situacao: {
					data: "2026-11-25",
					paragrafos: ["O mérito das ações seguia pendente."],
				},
			},
		};
		mostrarOFim(comSituacao);

		expect(
			await screen.findByText("Situação em 25 de novembro de 2026"),
		).toBeTruthy();
		expect(
			screen.getByText("O mérito das ações seguia pendente."),
		).toBeTruthy();
	});
});
