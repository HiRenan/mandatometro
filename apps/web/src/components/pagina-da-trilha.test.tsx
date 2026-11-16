// @vitest-environment jsdom

import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acharQuiz, acharTrilha, trilhas } from "@/lib/conteudo/paginas.server";
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

/**
 * Guarda no navegador a resposta das `quantas` primeiras perguntas do quiz, como
 * a página do quiz guarda.
 */
function responderOQuiz(quantas: number) {
	guardarRespostas(
		Object.fromEntries(
			perguntasDoQuiz()
				.slice(0, quantas)
				.map((pergunta) => [pergunta.enunciado, pergunta.opcoes[0]]),
		),
	);
}

/**
 * Guarda no navegador as respostas, do enunciado para o texto da opção, como a
 * página do quiz guarda.
 */
function guardarRespostas(respostas: Record<string, string>) {
	window.localStorage.setItem(
		RESPOSTAS,
		JSON.stringify({ [`${TRILHA}/quiz`]: { tentativas: [{ respostas }] } }),
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
			"Ver as outras trilhas",
		]);
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

	it("com a trilha e o quiz terminados, o botão leva às outras trilhas", async () => {
		responderOQuiz(perguntasDoQuiz().length);
		abrir(ARTIGOS);
		const botao = await screen.findByRole("link", {
			name: "Ver as outras trilhas",
		});

		expect(botao.closest(".lugar-do-botao")).toBeTruthy();
		expect(botao.getAttribute("href")).toBe("/trilhas");
		expect(
			screen.queryByRole("link", { name: "Responder o quiz da trilha" }),
		).toBeNull();
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
