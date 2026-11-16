// @vitest-environment jsdom
// biome-ignore-all lint/style/noNonNullAssertion: o quiz final de verdade existe, e o primeiro teste confere.

import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import {
	act,
	cleanup,
	fireEvent,
	type Matcher,
	render,
	screen,
	within,
} from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acharQuizFinal, trilhas } from "@/lib/conteudo/paginas.server";
import {
	comecarPiloto,
	concluirEtapa,
	lerPiloto,
	proximoPedido,
	QUIZ_DO_ANTES,
	registrarResposta,
} from "@/lib/piloto";
import { marcarLido } from "@/lib/progresso";
import { lerRespostas, responder } from "@/lib/respostas-do-quiz";
import { Route as RotaDoPiloto } from "@/routes/piloto";
import { PaginaDoPiloto, QuizFinal } from "./piloto";

// A rota do piloto lê do ENV, do varlock, se o site tem a API, e o ENV só
// existe no site. Nenhum pedido sai nestes testes: o envio fica para o
// envio-do-piloto.test.ts.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));

const TRILHA = "processo-legislativo";
const PAGINA = acharQuizFinal(trilhas, TRILHA)!;
const QUIZ_FINAL = `${TRILHA}/quiz-final`;
const CHAVES = [
	"mandatometro:piloto",
	"mandatometro:respostas-do-quiz",
	"mandatometro:artigos-lidos",
];

const ABERTURA =
	"Responda 12 perguntas sobre como nasce uma lei antes de ler a trilha. No fim dela, você responde as mesmas perguntas de novo. O site envia só quantas você acertou em cada vez: sem nome, sem e-mail e sem conta.";
const NOTAS = [
	"Nesta etapa, a resposta certa não aparece: ela fica para o quiz final, no fim da trilha.",
	"O piloto é para quem tem 18 anos ou mais. Quem tem menos pode ler a trilha e fazer o quiz final, que não envia nada.",
	"Num computador usado por mais gente, abra uma janela anônima antes de começar e deixe ela aberta até o quiz final.",
];
const CONCLUIDO = "Este navegador já participou do piloto. Obrigado!";
const ENCERRADO =
	"O piloto não está recebendo respostas agora. As perguntas continuam no quiz final, no fim da trilha.";
const SEM_API = "O piloto ainda não funciona neste endereço do site.";
const SEM_JS =
	"O piloto precisa do JavaScript do navegador ligado. Sem ele, nada é enviado.";
const OUTRA_PESSOA =
	"Outra pessoa usou este navegador? Comece do zero: o site apaga daqui os artigos lidos, as respostas dos quizzes e o piloto.";
const PRONTO = "Pronto: este navegador começou do zero.";
const FIM_DO_ANTES =
	"Agora leia a trilha: seis artigos curtos. No fim do último, o quiz final traz as mesmas perguntas, com a resposta certa, a explicação e a fonte de cada uma.";
const SEGUNDA_ETAPA =
	"Piloto, segunda etapa: são as mesmas 12 perguntas do começo. Vale a primeira resposta de cada uma. No fim, o site envia quantas você acertou, sem o seu nome.";
const TERMINE_O_ANTES =
	"Piloto: termine primeiro a primeira etapa, na página do piloto.";

/** Um site de mentira, com a página do piloto, o quiz final e os links deles. */
function criarRouter(inicio: string, comApi: boolean) {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const rotas = [
		createRoute({
			getParentRoute: () => raiz,
			path: "/piloto",
			component: () => <PaginaDoPiloto pagina={PAGINA} comApi={comApi} />,
		}),
		createRoute({
			getParentRoute: () => raiz,
			path: "/trilhas/$trilha/quiz-final",
			component: () => <QuizFinal pagina={PAGINA} comApi={comApi} />,
		}),
		createRoute({
			getParentRoute: () => raiz,
			path: "/trilhas/$trilha/$artigo",
			component: () => null,
		}),
		createRoute({
			getParentRoute: () => raiz,
			path: "/trilhas/$trilha",
			component: () => null,
		}),
		createRoute({
			getParentRoute: () => raiz,
			path: "/trilhas",
			component: () => null,
		}),
	];
	return createRouter({
		routeTree: raiz.addChildren(rotas),
		history: createMemoryHistory({ initialEntries: [inicio] }),
	});
}

/** A página do piloto, com o JavaScript já carregado. */
async function abrirOPiloto({ comApi = true } = {}) {
	render(<RouterProvider router={criarRouter("/piloto", comApi)} />);
	await screen.findByRole("heading", { level: 1, name: "Antes da trilha" });
}

/** O quiz final, com o JavaScript já carregado. */
async function abrirOQuizFinal({ comApi = true } = {}) {
	render(
		<RouterProvider
			router={criarRouter(`/trilhas/${TRILHA}/quiz-final`, comApi)}
		/>,
	);
	await screen.findByRole("heading", { level: 1, name: "Quiz final" });
}

/**
 * O HTML que o servidor manda: a página, que todo mundo vê, e o que vem dentro
 * do noscript, que o navegador só monta sem JavaScript.
 */
async function htmlDoServidor(inicio: string) {
	const router = criarRouter(inicio, true);
	await router.load();
	const html = renderToString(<RouterProvider router={router} />);
	const daPagina = document.createElement("div");
	daPagina.innerHTML = html
		.replaceAll("<noscript>", "<div data-noscript>")
		.replaceAll("</noscript>", "</div>");
	const blocos = [...daPagina.querySelectorAll<HTMLElement>("[data-noscript]")];
	for (const bloco of blocos) {
		bloco.remove();
	}
	return { html, daPagina, semJavaScript: blocos };
}

/** Hidrata o HTML do servidor e devolve o palco, conferindo que não deu erro. */
async function hidratar(inicio: string): Promise<HTMLElement> {
	const router = criarRouter(inicio, true);
	await router.load();
	const raiz = document.createElement("div");
	raiz.innerHTML = renderToString(<RouterProvider router={router} />);
	document.body.append(raiz);
	const erros = vi.fn();
	const consoleErro = vi.spyOn(console, "error");
	await act(async () => {
		hydrateRoot(raiz, <RouterProvider router={router} />, {
			onRecoverableError: erros,
		});
	});
	expect(erros).not.toHaveBeenCalled();
	expect(consoleErro).not.toHaveBeenCalled();
	const palco = raiz.querySelector<HTMLElement>(".quiz");
	if (!palco) {
		throw new Error("o palco não veio");
	}
	return palco;
}

/** O texto na tela, fora do aviso para o leitor de tela e das reservas. */
function naTela(texto: Matcher): HTMLElement {
	return screen.getByText(texto, {
		ignore: "[role=status], [aria-hidden=true], script, style",
	});
}

function foraDaTela(texto: string) {
	expect(
		screen.queryByText(texto, {
			ignore: "[role=status], [aria-hidden=true], script, style",
		}),
	).toBeNull();
}

/** O aviso para o leitor de tela. */
function aviso(): string {
	return document.querySelector(".quiz [role=status]")?.textContent ?? "";
}

function clicar(nome: string | RegExp) {
	fireEvent.click(screen.getByRole("button", { name: nome }), { detail: 1 });
}

/** Escolhe a certa ou outra opção da pergunta da vez e responde. */
function responderAPergunta(indice: number, certa: boolean) {
	const pergunta = PAGINA.perguntas[indice];
	const escolhida = certa
		? pergunta.certa
		: (pergunta.certa + 1) % pergunta.opcoes.length;
	fireEvent.click(
		screen.getByRole("radio", { name: pergunta.opcoes[escolhida] }),
	);
	fireEvent.click(screen.getByRole("button", { name: "Responder" }));
}

/**
 * Se cada opção da pergunta da vez está desligada. O fieldset desligado desliga
 * as opções sem mudar o atributo delas: vale o :disabled, que o navegador e o
 * leitor de tela usam.
 */
function travadas(): boolean[] {
	return screen
		.getAllByRole("radio")
		.map((radio) => radio.matches(":disabled"));
}

/** O texto de um elemento sem o que fica fora do leitor de tela. */
function textoLido(elemento: Element): string {
	const copia = elemento.cloneNode(true) as Element;
	for (const escondido of copia.querySelectorAll("[aria-hidden=true]")) {
		escondido.remove();
	}
	return copia.textContent?.trim() ?? "";
}

/** Os passos do piloto, cada um com o estado em palavras, como o leitor lê. */
function passos(): string[] {
	const lista = screen.getByRole("list", { name: "Etapas do piloto" });
	return within(lista)
		.getAllByRole("listitem")
		.map((passo) =>
			[...passo.querySelectorAll(":scope > :not([aria-hidden=true])")]
				.map(textoLido)
				.filter(Boolean)
				.join(" · "),
		);
}

function guardarOPiloto(piloto: object) {
	localStorage.setItem(
		"mandatometro:piloto",
		JSON.stringify({ versao: "processo-legislativo-final-v1", ...piloto }),
	);
}

/** O antes concluído e recebido pela API, com o depois por fazer. */
function antesRecebido() {
	comecarPiloto();
	concluirEtapa("antes", 3);
	registrarResposta(proximoPedido()!, "recebida");
}

beforeEach(() => {
	localStorage.clear();
	// O jsdom não rola a janela.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	// O HTML hidratado fica fora do que o cleanup desmonta.
	document.body.replaceChildren();
	localStorage.clear();
	vi.restoreAllMocks();
});

describe("a página do piloto, no HTML do servidor", () => {
	it("manda a abertura, os passos e as notas, sem botão e sem as perguntas", async () => {
		const { html, daPagina, semJavaScript } = await htmlDoServidor("/piloto");

		expect(daPagina.querySelector("h1")?.textContent).toBe("Antes da trilha");
		expect(daPagina.textContent).toContain(ABERTURA);
		for (const nota of [...NOTAS, OUTRA_PESSOA]) {
			expect(daPagina.textContent).toContain(nota);
		}
		expect(daPagina.querySelectorAll("button")).toHaveLength(0);
		expect(daPagina.querySelectorAll(".quiz-cena .grande")).toHaveLength(12);
		// As perguntas do antes não vêm nem sem JavaScript: elas mostrariam a certa.
		expect(semJavaScript.map((bloco) => bloco.textContent?.trim())).toEqual([
			SEM_JS,
		]);
		for (const pergunta of PAGINA.perguntas) {
			expect(html).not.toContain(pergunta.enunciado);
			expect(html).not.toContain(pergunta.explicacao);
		}
	});

	it("guarda o lugar do botão com os três textos que ele pode ter, escondidos", async () => {
		const { daPagina } = await htmlDoServidor("/piloto");
		const lugar = daPagina.querySelector(".quiz-abertura .lugar-do-botao");

		expect(
			[...(lugar?.querySelectorAll("[aria-hidden=true].invisible") ?? [])].map(
				(texto) => texto.textContent?.trim(),
			),
		).toEqual(["Começar", "Continuar", "Ir para a trilha"]);
	});

	it("hidrata sem erro e mostra o Continuar com o antes pela metade", async () => {
		comecarPiloto();
		responder(
			QUIZ_DO_ANTES,
			PAGINA.perguntas[0].enunciado,
			PAGINA.perguntas[0].opcoes[0],
		);

		const palco = await hidratar("/piloto");

		expect(
			within(palco).getByRole("button", { name: "Continuar" }),
		).toBeTruthy();
		expect(palco.dataset.fase).toBe("abertura");
	});

	it("hidrata sem erro com o antes feito, com o passo dele feito e a ida para a trilha", async () => {
		antesRecebido();

		const palco = await hidratar("/piloto");

		expect(
			within(palco)
				.getByRole("link", { name: "Ir para a trilha" })
				.getAttribute("href"),
		).toBe(`/trilhas/${TRILHA}`);
		expect(passos()[0]).toBe("Antes da trilha · Feito");
	});
});

describe("a página do piloto", () => {
	it("abre com o título, os três passos e o Começar, sem resposta e sem código", async () => {
		await abrirOPiloto();

		expect(passos()).toEqual([
			"Antes da trilha · Você está aqui",
			"Os seis artigos",
			"O quiz final",
		]);
		expect(screen.getByRole("button", { name: "Começar" })).toBeTruthy();
		expect(naTela("12 perguntas")).toBeTruthy();
		expect(naTela("Duas etapas")).toBeTruthy();
		expect(naTela("Sem nome e sem e-mail")).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: "Recomeçar o quiz" }),
		).toBeNull();
		expect(lerPiloto()).toEqual({ fase: "fora" });
	});

	it("ao começar, sorteia o código e guarda cada resposta sem mostrar a certa", async () => {
		await abrirOPiloto();

		clicar("Começar");
		const piloto = lerPiloto();
		if (piloto.fase !== "participando") {
			throw new Error("o Começar devia entrar no piloto");
		}
		expect(
			screen.getByRole("group", { name: /^Pergunta 1 de 12 / }),
		).toBeTruthy();

		responderAPergunta(0, true);

		expect(
			screen.getByRole("group", { name: /^Pergunta 2 de 12 / }),
		).toBeTruthy();
		expect(aviso()).toBe("Pergunta 1: resposta guardada.");
		expect(document.querySelector(".quiz-retorno")).toBeNull();
		expect(document.body.textContent).not.toContain("Você acertou");
		expect(document.body.textContent).not.toContain(
			PAGINA.perguntas[0].explicacao,
		);
		expect(lerRespostas(QUIZ_DO_ANTES)).toEqual({
			[PAGINA.perguntas[0].enunciado]:
				PAGINA.perguntas[0].opcoes[PAGINA.perguntas[0].certa],
		});
		// O código fica só no navegador: nem na tela, nem no endereço.
		expect(document.body.innerHTML).not.toContain(piloto.participacao);
	});

	it("leva o foco ao enunciado de cada pergunta nova", async () => {
		await abrirOPiloto();
		clicar("Começar");

		responderAPergunta(0, false);

		expect(document.activeElement?.textContent).toBe(
			PAGINA.perguntas[1].enunciado,
		);
	});

	it("na última pergunta, conclui a primeira etapa com os acertos e chama para a trilha, sem dizer o total", async () => {
		await abrirOPiloto();
		clicar("Começar");

		for (const [indice] of PAGINA.perguntas.entries()) {
			responderAPergunta(indice, indice < 5);
		}

		const fim = document.querySelector<HTMLElement>(".quiz-fim");
		expect(
			screen.getByRole("heading", {
				level: 2,
				name: "Você terminou a primeira etapa.",
			}),
		).toBe(document.activeElement);
		expect(naTela(FIM_DO_ANTES)).toBeTruthy();
		expect(
			screen
				.getByRole("link", { name: "Começar a trilha" })
				.getAttribute("href"),
		).toBe(`/trilhas/${TRILHA}/quem-pode-propor-uma-lei`);
		expect(proximoPedido()).toMatchObject({ etapa: "antes", acertos: 5 });
		expect(fim?.textContent).not.toMatch(/\d/);
		expect(
			screen.queryByRole("button", { name: /Rever as respostas|Recomeçar/ }),
		).toBeNull();
		// O depois começa do zero no quiz final.
		expect(lerRespostas(QUIZ_FINAL)).toEqual({});
	});

	it("com o piloto encerrado no fim do antes, deixa rever as respostas, agora com a certa", async () => {
		await abrirOPiloto();
		clicar("Começar");
		for (const [indice] of PAGINA.perguntas.entries()) {
			responderAPergunta(indice, false);
		}

		// A API respondeu que o piloto não recebe respostas (o 410).
		act(() => {
			guardarOPiloto({ fase: "encerrado" });
			window.dispatchEvent(
				new StorageEvent("storage", { key: "mandatometro:piloto" }),
			);
		});
		clicar(/^Rever as respostas/);

		expect(
			screen.getByRole("group", { name: /^Pergunta 1 de 12 / }),
		).toBeTruthy();
		expect(naTela("Você errou.")).toBeTruthy();

		// Responder de novo mostra a resposta, como no quiz de sempre. Com a
		// resposta à vista, o nome de cada opção leva a marca dela: a escolha vai
		// pela posição.
		fireEvent.click(screen.getAllByRole("radio")[PAGINA.perguntas[0].certa]);
		fireEvent.click(screen.getByRole("button", { name: "Responder" }));
		expect(naTela("Você acertou.")).toBeTruthy();
	});

	it("no antes, a pergunta que outra aba já respondeu abre sem a resposta certa", async () => {
		await abrirOPiloto();
		clicar("Começar");
		// Outra aba deste navegador, no mesmo antes, responde a segunda pergunta.
		const segunda = PAGINA.perguntas[1];
		act(() => {
			responder(
				QUIZ_DO_ANTES,
				segunda.enunciado,
				segunda.opcoes[(segunda.certa + 1) % segunda.opcoes.length],
			);
		});

		responderAPergunta(0, true);

		expect(
			screen.getByRole("group", { name: /^Pergunta 2 de 12 / }),
		).toBeTruthy();
		foraDaTela("Você errou.");
		expect(screen.queryByText("Resposta certa")).toBeNull();
		expect(screen.getByRole("button", { name: "Responder" })).toBeTruthy();
	});

	it("na volta com o antes pela metade, continua da primeira pergunta sem resposta", async () => {
		comecarPiloto();
		responder(
			QUIZ_DO_ANTES,
			PAGINA.perguntas[0].enunciado,
			PAGINA.perguntas[0].opcoes[1],
		);
		await abrirOPiloto();

		clicar("Continuar");

		expect(
			screen.getByRole("group", { name: /^Pergunta 2 de 12 / }),
		).toBeTruthy();
	});

	it("com o antes feito, marca o passo e leva à trilha, sem outro Começar", async () => {
		comecarPiloto();
		concluirEtapa("antes", 3);
		await abrirOPiloto();

		expect(passos()).toEqual([
			"Antes da trilha · Feito",
			"Os seis artigos · Você está aqui",
			"O quiz final",
		]);
		expect(
			screen
				.getByRole("link", { name: "Ir para a trilha" })
				.getAttribute("href"),
		).toBe(`/trilhas/${TRILHA}`);
		expect(
			screen.queryByRole("button", { name: /^Começar$|^Continuar$/ }),
		).toBeNull();
	});

	it("com o piloto concluído, agradece e leva à trilha", async () => {
		guardarOPiloto({ fase: "concluido" });
		await abrirOPiloto();

		expect(naTela(CONCLUIDO)).toBeTruthy();
		expect(passos()).toEqual([
			"Antes da trilha · Feito",
			"Os seis artigos · Feito",
			"O quiz final · Feito",
		]);
		expect(screen.getByRole("link", { name: "Ir para a trilha" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Começar" })).toBeNull();
	});

	it("com o piloto encerrado, diz que ele não recebe respostas agora", async () => {
		guardarOPiloto({ fase: "encerrado" });
		await abrirOPiloto();

		expect(naTela(ENCERRADO)).toBeTruthy();
		expect(passos()).toEqual([
			"Antes da trilha",
			"Os seis artigos",
			"O quiz final",
		]);
		expect(screen.getByRole("link", { name: "Ir para a trilha" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Começar" })).toBeNull();
	});

	it("sem a API, avisa que o piloto não funciona neste endereço e não começa", async () => {
		await abrirOPiloto({ comApi: false });

		expect(naTela(SEM_API)).toBeTruthy();
		expect(screen.getByRole("link", { name: "Ir para a trilha" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Começar" })).toBeNull();
		expect(passos()[0]).toBe("Antes da trilha");
	});

	it("o Começar como outra pessoa apaga tudo o que o site guardou, e o foco fica no Pronto", async () => {
		marcarLido(`${TRILHA}/quem-pode-propor-uma-lei`);
		responder(`${TRILHA}/quiz`, "Uma pergunta?", "Uma opção.");
		comecarPiloto();
		concluirEtapa("antes", 4);
		await abrirOPiloto();

		const botao = screen.getByRole("button", {
			name: "Começar como outra pessoa",
		});
		expect(botao.closest("p")?.previousElementSibling?.textContent).toBe(
			OUTRA_PESSOA,
		);
		fireEvent.click(botao, { detail: 1 });

		for (const chave of CHAVES) {
			expect(localStorage.getItem(chave), chave).toBeNull();
		}
		expect(lerPiloto()).toEqual({ fase: "fora" });
		expect(document.activeElement?.textContent).toBe(PRONTO);
		expect(aviso()).toBe(PRONTO);
		expect(
			screen.queryByRole("button", { name: "Começar como outra pessoa" }),
		).toBeNull();
		expect(screen.getByRole("button", { name: "Começar" })).toBeTruthy();
		expect(passos()[0]).toBe("Antes da trilha · Você está aqui");
	});

	it("quando outra aba começa do zero, volta ao Começar", async () => {
		antesRecebido();
		await abrirOPiloto();
		expect(screen.getByRole("link", { name: "Ir para a trilha" })).toBeTruthy();

		act(() => {
			localStorage.clear();
			window.dispatchEvent(new StorageEvent("storage", { key: null }));
		});

		expect(screen.getByRole("button", { name: "Começar" })).toBeTruthy();
	});
});

describe("o quiz final, no piloto", () => {
	it("fora do piloto, é o quiz de sempre, sem linha do piloto", async () => {
		await abrirOQuizFinal();

		foraDaTela(SEGUNDA_ETAPA);
		foraDaTela(TERMINE_O_ANTES);
		clicar("Começar");
		responderAPergunta(0, false);
		// Trocar de opção depois de responder ainda vale: nada mede este quiz.
		expect(travadas()).not.toContain(true);
	});

	it("com o antes feito, diz que é a segunda etapa e trava a primeira resposta de cada pergunta", async () => {
		antesRecebido();
		await abrirOQuizFinal();

		expect(naTela(SEGUNDA_ETAPA)).toBeTruthy();
		clicar("Começar");
		responderAPergunta(0, false);

		// A resposta certa, a explicação e a fonte aparecem, como no quiz.
		expect(naTela("Você errou.")).toBeTruthy();
		expect(travadas()).not.toContain(false);
		expect(screen.getByRole("group", { name: /^Pergunta 1 de 12 / })).toBe(
			document.querySelector("fieldset:disabled"),
		);
	});

	it("no depois, o Recomeçar o quiz só aparece com a etapa concluída", async () => {
		antesRecebido();
		responder(
			QUIZ_FINAL,
			PAGINA.perguntas[0].enunciado,
			PAGINA.perguntas[0].opcoes[0],
		);
		await abrirOQuizFinal();

		expect(screen.getByRole("button", { name: "Continuar" })).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: "Recomeçar o quiz" }),
		).toBeNull();
	});

	it("na última resposta do depois, conclui a segunda etapa com os acertos e o mesmo código", async () => {
		antesRecebido();
		const piloto = lerPiloto();
		await abrirOQuizFinal();
		clicar("Começar");

		for (const [indice] of PAGINA.perguntas.entries()) {
			responderAPergunta(indice, indice % 2 === 0);
			clicar(/^(Próxima pergunta|Terminar)$/);
		}

		expect(proximoPedido()).toEqual({
			participacao: piloto.fase === "participando" && piloto.participacao,
			versao_quiz: "processo-legislativo-final-v1",
			etapa: "depois",
			acertos: 6,
		});
		expect(
			screen.getByRole("button", { name: "Recomeçar o quiz" }),
		).toBeTruthy();
	});

	it("com o antes pela metade, manda terminar o antes na página do piloto e não trava nem conclui nada", async () => {
		comecarPiloto();
		await abrirOQuizFinal();

		const linha = naTela(
			(_, elemento) => elemento?.textContent === TERMINE_O_ANTES,
		);
		expect(
			within(linha)
				.getByRole("link", { name: "na página do piloto" })
				.getAttribute("href"),
		).toBe("/piloto");
		foraDaTela(SEGUNDA_ETAPA);
		clicar("Começar");
		for (const [indice] of PAGINA.perguntas.entries()) {
			responderAPergunta(indice, true);
			expect(travadas()).not.toContain(true);
			clicar(/^(Próxima pergunta|Terminar)$/);
		}

		expect(lerPiloto()).toMatchObject({
			antes: { situacao: "respondendo" },
			depois: { situacao: "respondendo" },
		});
	});

	it("sem a API, ignora o piloto", async () => {
		antesRecebido();
		await abrirOQuizFinal({ comApi: false });

		foraDaTela(SEGUNDA_ETAPA);
		clicar("Começar");
		responderAPergunta(0, true);
		expect(travadas()).not.toContain(true);
	});

	it("com o piloto concluído, é o quiz de sempre", async () => {
		guardarOPiloto({ fase: "concluido" });
		await abrirOQuizFinal();

		foraDaTela(SEGUNDA_ETAPA);
		foraDaTela(TERMINE_O_ANTES);
	});

	it("hidrata sem erro com o depois em andamento", async () => {
		antesRecebido();

		const palco = await hidratar(`/trilhas/${TRILHA}/quiz-final`);

		expect(
			within(palco).getByText(SEGUNDA_ETAPA, {
				ignore: "[aria-hidden=true]",
			}),
		).toBeTruthy();
	});
});

describe("a rota do piloto", () => {
	it("abre a página do piloto com o quiz final de verdade", async () => {
		const raiz = createRootRoute({ component: () => <Outlet /> });
		const pagina = RotaDoPiloto.update({
			id: "/piloto",
			path: "/piloto",
			getParentRoute: () => raiz,
			loader: () => PAGINA,
		} as never);
		const router = createRouter({
			routeTree: raiz.addChildren([pagina]),
			history: createMemoryHistory({ initialEntries: ["/piloto"] }),
		});
		render(<RouterProvider router={router} />);

		await screen.findByRole("heading", { level: 1, name: "Antes da trilha" });
		expect(screen.getByRole("button", { name: "Começar" })).toBeTruthy();
	});

	it("fica fora dos buscadores", () => {
		const cabeca = RotaDoPiloto.options.head?.({} as never) as {
			meta: Array<Record<string, string>>;
		};

		expect(cabeca.meta).toContainEqual({ title: "Piloto · Mandatômetro" });
		expect(cabeca.meta).toContainEqual({ name: "robots", content: "noindex" });
		expect(RotaDoPiloto.options.headers?.({} as never)).toEqual({
			"X-Robots-Tag": "noindex",
		});
	});
});
