// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	acharQuiz,
	acharQuizFinal,
	acharTrilha,
	trilhas,
} from "@/lib/conteudo/paginas.server";
import { idDoArtigo } from "@/lib/progresso";
import { Route } from "@/routes/trilhas/$trilha/index";

const CHAVE = "mandatometro:artigos-lidos";
const RESPOSTAS = "mandatometro:respostas-do-quiz";
const TRILHA = "processo-legislativo";
/**
 * Os artigos da trilha de verdade, na ordem, como o navegador guarda os lidos.
 * Com todos eles lidos, a trilha está terminada.
 */
const ARTIGOS = (acharTrilha(trilhas, TRILHA)?.artigos ?? []).map(idDoArtigo);

beforeEach(() => {
	// O jsdom não rola a janela.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	window.localStorage.clear();
	vi.restoreAllMocks();
});

const lidos = () => JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");

/**
 * A página da trilha num site de mentira, com a trilha de verdade e os artigos
 * já lidos. A rota entra na árvore como no routeTree.gen.ts, e os dados vêm do
 * paginas.server.ts, sem a função do servidor.
 */
function abrir(jaLidos: string[], trilha = TRILHA) {
	window.localStorage.setItem(CHAVE, JSON.stringify(jaLidos));
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const pagina = Route.update({
		id: "/trilhas/$trilha/",
		path: "/trilhas/$trilha/",
		getParentRoute: () => raiz,
		loader: () => acharTrilha(trilhas, trilha),
	} as never);
	const router = createRouter({
		routeTree: raiz.addChildren([pagina]),
		history: createMemoryHistory({ initialEntries: [`/trilhas/${trilha}`] }),
	});
	render(<RouterProvider router={router} />);
}

/** As perguntas do quiz de verdade da trilha. */
function perguntasDoQuiz() {
	const quiz = acharQuiz(trilhas, TRILHA);
	if (!quiz) {
		throw new Error(`a trilha ${TRILHA} ficou sem quiz`);
	}
	return quiz.perguntas;
}

/** As perguntas do quiz final de verdade da trilha. */
function perguntasDoQuizFinal() {
	const quiz = acharQuizFinal(trilhas, TRILHA);
	if (!quiz) {
		throw new Error(`a trilha ${TRILHA} ficou sem quiz final`);
	}
	return quiz.perguntas;
}

/** As respostas das `quantas` primeiras perguntas, todas na primeira opção. */
function respostasDe(
	perguntas: { enunciado: string; opcoes: string[] }[],
	quantas = perguntas.length,
): Record<string, string> {
	return Object.fromEntries(
		perguntas
			.slice(0, quantas)
			.map((pergunta) => [pergunta.enunciado, pergunta.opcoes[0]]),
	);
}

/**
 * Guarda no navegador a resposta das `quantas` primeiras perguntas do quiz e,
 * quando vêm, as do quiz final, como as páginas dos dois guardam.
 */
function responderOQuiz(quantas: number, doQuizFinal?: number) {
	guardarRespostas(
		respostasDe(perguntasDoQuiz(), quantas),
		doQuizFinal === undefined
			? undefined
			: respostasDe(perguntasDoQuizFinal(), doQuizFinal),
	);
}

/**
 * Guarda no navegador as respostas, do enunciado para o texto da opção, como a
 * página do quiz e a do quiz final guardam.
 */
function guardarRespostas(
	respostas: Record<string, string>,
	doQuizFinal?: Record<string, string>,
) {
	window.localStorage.setItem(
		RESPOSTAS,
		JSON.stringify({
			[`${TRILHA}/quiz`]: { tentativas: [{ respostas }] },
			...(doQuizFinal && {
				[`${TRILHA}/quiz-final`]: {
					tentativas: [{ respostas: doQuizFinal }],
				},
			}),
		}),
	);
}

/** A linha do botão, embaixo da descrição: os controles que estão nela. */
function controlesDaLinha(botao: HTMLElement): Element[] {
	const linha = botao.closest(".recomeco");
	if (!linha) {
		throw new Error('o "Recomeçar a trilha" saiu da linha .recomeco');
	}
	return [...linha.querySelectorAll("a, button, input, summary")];
}

/**
 * O botão de continuar, no lugar dele no cartaz da trilha. A chamada do quiz
 * final, mais embaixo, tem um link com o mesmo texto e o mesmo endereço.
 */
async function botaoDeContinuar(nome: string): Promise<HTMLElement> {
	const lugar = await waitFor(() => {
		const achado = document.querySelector<HTMLElement>(
			".cartaz-acao .lugar-do-botao",
		);
		if (!achado) {
			throw new Error("o cartaz da trilha ainda não apareceu");
		}
		return achado;
	});
	return within(lugar).findByRole("link", { name: nome });
}

/** Os textos das cópias invisíveis que guardam o lugar do botão de continuar. */
function reservasDoBotao(): (string | undefined)[] {
	const lugar = document.querySelector(".cartaz-acao .lugar-do-botao");
	if (!lugar) {
		throw new Error("o botão de continuar ficou sem o lugar dele");
	}
	return [
		...lugar.querySelectorAll("span.botao.invisible[aria-hidden=true]"),
	].map((reserva) => reserva.textContent?.trim());
}

describe("página da trilha", () => {
	it("reúne a contagem de artigos, a duração e a fonte em um parágrafo", async () => {
		abrir([]);
		const fonte = await screen.findByText("Fonte oficial em cada explicação");
		const paragrafo = fonte.closest("p:not(.faixa)");
		expect(paragrafo?.textContent).toMatch(/\d+ artigos?/);
		expect(paragrafo?.textContent).toMatch(/\d+ min de leitura/);
	});

	// O servidor não sabe o que a pessoa leu nem o que ela respondeu, e manda
	// "Começar pelo primeiro artigo". No celular, o botão fica em cima da lista dos
	// artigos: se o lugar dele não guardasse a altura do texto mais alto, a lista
	// pulava quando o botão trocava de texto, depois que o JavaScript carrega.
	it("guarda o lugar do botão de continuar com todos os textos que ele pode ter", async () => {
		abrir([]);
		const botao = await screen.findByRole("link", {
			name: "Começar pelo primeiro artigo",
		});
		const artigos = acharTrilha(trilhas, TRILHA)?.artigos ?? [];

		expect(artigos.length).toBeGreaterThan(0);
		expect(botao.closest(".lugar-do-botao")).toBeTruthy();
		expect(reservasDoBotao()).toEqual([
			"Começar pelo primeiro artigo",
			...artigos.map((artigo) => `Continuar de onde parou: ${artigo.titulo}`),
			"Responder o quiz da trilha",
			"Responder o quiz final",
			"Ver as outras trilhas",
		]);
	});

	// Depois dos artigos, a chamada do quiz da trilha e, embaixo dela, a do quiz
	// final, que vem depois do último artigo.
	it("chama para o quiz da trilha e, embaixo, para o quiz final", async () => {
		abrir([]);
		const final = await screen.findByRole("region", { name: "Quiz final" });
		const doMeio = screen.getByRole("region", { name: "Quiz da trilha" });

		expect(
			doMeio.compareDocumentPosition(final) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(final.closest("section.artigos")).toBeTruthy();
		expect(
			within(final)
				.getByRole("link", { name: "Responder o quiz final" })
				.getAttribute("href"),
		).toBe(`/trilhas/${TRILHA}/quiz-final`);
	});

	// Dentro do número, o visto apaga a cor dele (.numeral:has(.marca-de-lido), no
	// index.css).
	it("põe o visto do artigo lido dentro do número dele", async () => {
		abrir([ARTIGOS[0]]);
		await screen.findByRole("link", { name: /^Continuar de onde parou: / });
		const vistos = document.querySelectorAll("svg.marca-de-lido");

		expect(vistos).toHaveLength(1);
		expect(vistos[0].closest(".numeral")?.textContent).toBe("1");
	});

	// Com a trilha terminada, o lugar do botão leva ao que vem depois dela: ao
	// quiz, enquanto falta alguma resposta, e depois às outras trilhas.
	it("com a trilha terminada e o quiz sem resposta, o botão leva ao quiz da trilha", async () => {
		abrir(ARTIGOS);
		const botao = await screen.findByRole("link", {
			name: "Responder o quiz da trilha",
		});

		expect(screen.getByText("Você terminou a trilha.")).toBeTruthy();
		expect(botao.closest(".lugar-do-botao")).toBeTruthy();
		expect(botao.getAttribute("href")).toBe(`/trilhas/${TRILHA}/quiz`);
		expect(
			screen.queryByRole("link", { name: /^(Começar|Continuar) / }),
		).toBeNull();
	});

	it("com a trilha terminada e uma pergunta do quiz sem resposta, o botão continua levando ao quiz", async () => {
		responderOQuiz(perguntasDoQuiz().length - 1);
		abrir(ARTIGOS);
		const botao = await screen.findByRole("link", {
			name: "Responder o quiz da trilha",
		});

		expect(botao.getAttribute("href")).toBe(`/trilhas/${TRILHA}/quiz`);
		expect(
			screen.queryByRole("link", { name: "Ver as outras trilhas" }),
		).toBeNull();
	});

	it("com a trilha e o quiz terminados e o quiz final sem resposta, o botão leva ao quiz final", async () => {
		responderOQuiz(perguntasDoQuiz().length);
		abrir(ARTIGOS);
		const botao = await botaoDeContinuar("Responder o quiz final");

		expect(botao.getAttribute("href")).toBe(`/trilhas/${TRILHA}/quiz-final`);
		expect(
			screen.queryByRole("link", { name: "Responder o quiz da trilha" }),
		).toBeNull();
	});

	it("com a trilha e o quiz terminados e uma pergunta do quiz final sem resposta, o botão continua levando ao quiz final", async () => {
		responderOQuiz(perguntasDoQuiz().length, perguntasDoQuizFinal().length - 1);
		abrir(ARTIGOS);
		const botao = await botaoDeContinuar("Responder o quiz final");

		expect(botao.getAttribute("href")).toBe(`/trilhas/${TRILHA}/quiz-final`);
		expect(
			screen.queryByRole("link", { name: "Ver as outras trilhas" }),
		).toBeNull();
	});

	// O quiz da trilha vem antes: com ele pela metade, o botão leva a ele, mesmo
	// com o quiz final respondido.
	it("com o quiz final respondido e o quiz da trilha pela metade, o botão leva ao quiz da trilha", async () => {
		responderOQuiz(1, perguntasDoQuizFinal().length);
		abrir(ARTIGOS);
		const botao = await screen.findByRole("link", {
			name: "Responder o quiz da trilha",
		});

		expect(botao.closest(".lugar-do-botao")).toBeTruthy();
		expect(botao.getAttribute("href")).toBe(`/trilhas/${TRILHA}/quiz`);
	});

	it("com a trilha, o quiz e o quiz final terminados, o botão leva às outras trilhas", async () => {
		responderOQuiz(perguntasDoQuiz().length, perguntasDoQuizFinal().length);
		abrir(ARTIGOS);
		const botao = await screen.findByRole("link", {
			name: "Ver as outras trilhas",
		});

		expect(botao.closest(".lugar-do-botao")).toBeTruthy();
		expect(botao.getAttribute("href")).toBe("/trilhas");
		expect(
			botao.closest(".lugar-do-botao")?.querySelectorAll("a"),
		).toHaveLength(1);
	});

	// Uma resposta cujo texto não está mais entre as opções do arquivo conta como
	// sem resposta, como na página do quiz.
	it("com todas as respostas guardadas, mas uma com um texto que mudou no arquivo, o botão continua levando ao quiz", async () => {
		const perguntas = perguntasDoQuiz();
		guardarRespostas({
			...Object.fromEntries(
				perguntas.map((pergunta) => [pergunta.enunciado, pergunta.opcoes[0]]),
			),
			[perguntas[0].enunciado]: "Uma opção que mudou no arquivo",
		});
		abrir(ARTIGOS);
		const botao = await screen.findByRole("link", {
			name: "Responder o quiz da trilha",
		});

		expect(perguntas).toHaveLength(6);
		expect(botao.getAttribute("href")).toBe(`/trilhas/${TRILHA}/quiz`);
		expect(
			screen.queryByRole("link", { name: "Ver as outras trilhas" }),
		).toBeNull();
	});

	it("numa trilha sem quiz, terminada, o botão leva às outras trilhas", async () => {
		const semQuiz = trilhas.find((trilha) => !trilha.quiz);
		if (!semQuiz) {
			throw new Error("o teste precisa de uma trilha sem quiz");
		}
		abrir(semQuiz.artigos.map(idDoArtigo), semQuiz.slug);
		const botao = await screen.findByRole("link", {
			name: "Ver as outras trilhas",
		});

		expect(botao.closest(".lugar-do-botao")).toBeTruthy();
		expect(botao.getAttribute("href")).toBe("/trilhas");
		// Sem quiz, o lugar não guarda a altura do botão do quiz.
		expect(reservasDoBotao()).not.toContain("Responder o quiz da trilha");
		expect(reservasDoBotao()).not.toContain("Responder o quiz final");
		expect(reservasDoBotao().at(-1)).toBe("Ver as outras trilhas");
	});

	it("num clique duplo no Recomeçar a trilha, a trilha recomeça, e o Desfazer funciona com um clique depois", async () => {
		abrir(ARTIGOS.slice(0, 2));
		const botao = await screen.findByRole("button", {
			name: "Recomeçar a trilha",
		});
		expect(ARTIGOS.length).toBeGreaterThan(2);
		expect(screen.getByText(`Você leu 2 de ${ARTIGOS.length}.`)).toBeTruthy();

		// O navegador marca com 2 o segundo clique de um clique duplo.
		fireEvent.click(botao, { detail: 1 });
		fireEvent.click(botao, { detail: 2 });

		expect(botao.textContent).toBe("Desfazer");
		expect(screen.getByRole("status").textContent).toBe(
			"Você recomeçou a trilha.",
		);
		expect(lidos()).toEqual([]);

		fireEvent.click(botao, { detail: 1 });

		expect(botao.textContent).toBe("Recomeçar a trilha");
		expect(screen.getByRole("status").textContent).toBe(
			`Você leu 2 de ${ARTIGOS.length}.`,
		);
		expect(lidos()).toEqual(ARTIGOS.slice(0, 2));
	});

	// Com a trilha terminada, o botão do lugar leva ao quiz, e vira "Começar pelo
	// primeiro artigo" depois do recomeço. Nenhum dos dois pode aparecer onde o
	// "Recomeçar a trilha" estava: o segundo clique de um clique duplo cairia
	// nele, e a pessoa sairia da página sem o "Desfazer".
	it("com a trilha terminada, o Desfazer fica no lugar do Recomeçar a trilha, sozinho na linha dele", async () => {
		abrir(ARTIGOS);
		const botao = await screen.findByRole("button", {
			name: "Recomeçar a trilha",
		});
		expect(screen.getByText("Você terminou a trilha.")).toBeTruthy();
		expect(controlesDaLinha(botao)).toEqual([botao]);
		const linha = botao.closest(".recomeco");
		expect(linha?.tagName).toBe("DIV");

		fireEvent.click(botao, { detail: 1 });
		fireEvent.click(botao, { detail: 2 });

		// O mesmo botão, na mesma linha, e mais nenhum controle nela.
		expect(botao.isConnected).toBe(true);
		expect(botao.textContent).toBe("Desfazer");
		expect(botao.closest(".recomeco")).toBe(linha);
		expect(controlesDaLinha(botao)).toEqual([botao]);
		expect(lidos()).toEqual([]);

		// O botão de continuar apareceu, fora da linha do "Desfazer".
		const comecar = screen.getByRole("link", {
			name: "Começar pelo primeiro artigo",
		});
		expect(linha?.contains(comecar)).toBe(false);

		fireEvent.click(botao, { detail: 1 });

		expect(botao.textContent).toBe("Recomeçar a trilha");
		expect(lidos()).toEqual(ARTIGOS);
	});
});
