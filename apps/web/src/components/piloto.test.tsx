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
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { acharQuizFinal, trilhas } from "@/lib/conteudo/paginas.server";
import { enviarEtapa, type ResultadoDoEnvio } from "@/lib/envio-do-piloto";
import {
	comecarPiloto,
	concluirEtapa,
	lerPiloto,
	proximoPedido,
	QUIZ_DO_ANTES,
	registrarResposta,
} from "@/lib/piloto";
import { marcarLido } from "@/lib/progresso";
import { enviarPendentes, esquecerEnvio } from "@/lib/reenvio-do-piloto";
import { lerRespostas, responder } from "@/lib/respostas-do-quiz";
import { Route as RotaDoPiloto } from "@/routes/piloto";
import { PaginaDoPiloto, QuizFinal } from "./piloto";

// A rota do piloto lê do ENV, do varlock, se o site tem a API, e o ENV só
// existe no site. Nenhum pedido sai nestes testes: o envio de verdade fica para
// o envio-do-piloto.test.ts, e aqui cada envio responde o que o teste mandar.
// Sem resposta combinada, ele fica esperando a API.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));
vi.mock("@/lib/envio-do-piloto", async (original) => ({
	...(await original<typeof import("@/lib/envio-do-piloto")>()),
	enviarEtapa: vi.fn(),
}));

const enviar = vi.mocked(enviarEtapa);

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
const ENCERRADO_NO_ENVIO =
	"O piloto não está recebendo respostas agora, e esta etapa não foi enviada. As perguntas continuam aqui para você aprender.";
const FORA_DO_AR =
	"Não conseguimos enviar agora. O site guarda a etapa neste navegador e tenta de novo daqui a pouco.";
const SEM_CONEXAO =
	"Sem conexão, a etapa não foi enviada. Ela fica guardada neste navegador e sai quando a internet voltar.";
const RECUSADO =
	"Não deu para enviar esta etapa, e o site não vai tentar de novo. As suas respostas continuam aqui.";
const UUID_V4 =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

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

// As raízes hidratadas: o cleanup do Testing Library não as desmonta.
const hidratadas: Root[] = [];

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
		hidratadas.push(
			hydrateRoot(raiz, <RouterProvider router={router} />, {
				onRecoverableError: erros,
			}),
		);
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

/** Cada envio responde o próximo resultado da lista; o último se repete. */
function respostasDaApi(...resultados: ResultadoDoEnvio[]) {
	for (const resultado of resultados) {
		enviar.mockResolvedValueOnce(resultado);
	}
	enviar.mockResolvedValue(resultados[resultados.length - 1]);
}

/** Um envio que só responde quando o teste mandar. */
function respostaPresa() {
	let responder: (resultado: ResultadoDoEnvio) => void = () => {};
	enviar.mockReturnValueOnce(
		new Promise((resolver) => {
			responder = resolver;
		}),
	);
	return async (resultado: ResultadoDoEnvio) => {
		await act(async () => responder(resultado));
	};
}

/** Deixa a resposta da API chegar à tela. */
async function esperarAApi() {
	await act(async () => {});
}

/** Começa e termina o antes, com as `certas` primeiras respostas certas. */
function terminarOAntes(certas = 5) {
	clicar("Começar");
	for (const [indice] of PAGINA.perguntas.entries()) {
		responderAPergunta(indice, indice < certas);
	}
}

beforeEach(() => {
	localStorage.clear();
	enviar.mockReset();
	enviar.mockReturnValue(new Promise(() => {}));
	// O jsdom não rola a janela.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	// O HTML hidratado fica fora do que o cleanup desmonta: sem desmontar, a
	// página continua ouvindo o piloto e mandaria o envio do teste seguinte.
	for (const raiz of hidratadas.splice(0)) {
		act(() => raiz.unmount());
	}
	document.body.replaceChildren();
	esquecerEnvio();
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

	// Nas perguntas, o título do palco sai da vista, e o pé diz o nome do antes,
	// que não se confunde com o quiz final, das mesmas 12 perguntas (a #136).
	it("nas perguntas, o pé diz que é o antes da trilha", async () => {
		await abrirOPiloto();
		const nomeNoPe = () =>
			document.querySelector(".quiz-pe .quiz-nome")?.textContent ?? null;
		expect(nomeNoPe()).toBeNull();

		clicar("Começar");

		expect(nomeNoPe()).toBe("Antes da trilha");
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

	it("depois do Começar como outra pessoa, o pedido da anterior que ainda espera a API não segura o da próxima", async () => {
		comecarPiloto();
		concluirEtapa("antes", 4);
		await abrirOPiloto();
		// O pedido dela espera a API: o envio destes testes não responde.
		expect(enviar).toHaveBeenCalledTimes(1);

		clicar("Começar como outra pessoa");
		terminarOAntes(2);

		expect(enviar).toHaveBeenCalledTimes(2);
		const [[anterior], [proxima]] = enviar.mock.calls;
		expect(proxima).toMatchObject({ etapa: "antes", acertos: 2 });
		expect(proxima.participacao).not.toBe(anterior.participacao);
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
		// A abertura do público: o pé preso e a linha do "Recomeçar o quiz"
		// guardada, como no quiz da trilha.
		expect(document.querySelector(".quiz")?.hasAttribute("data-linha")).toBe(
			false,
		);
		expect(document.querySelector(".quiz-abertura .recomeco")).not.toBeNull();
		clicar("Começar");
		responderAPergunta(0, false);
		// Trocar de opção depois de responder ainda vale: nada mede este quiz.
		expect(travadas()).not.toContain(true);
	});

	// A página do piloto promete a quem tem menos de 18 anos que o quiz final não
	// envia nada.
	it("fora do piloto, as 12 respostas não mandam nada nem guardam o piloto", async () => {
		enviar.mockResolvedValue({ tipo: "recebida" });
		await abrirOQuizFinal();

		clicar("Começar");
		for (const [indice] of PAGINA.perguntas.entries()) {
			responderAPergunta(indice, true);
			await esperarAApi();
			expect(enviar).not.toHaveBeenCalled();
			expect(localStorage.getItem("mandatometro:piloto")).toBeNull();
			clicar(/^(Próxima pergunta|Terminar)$/);
		}

		expect(naTela("Você terminou o quiz.")).toBeTruthy();
		expect(enviar).not.toHaveBeenCalled();
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

	// A linha do piloto deixa a abertura mais alta, e no celular pequeno o pé preso
	// cobria o "Começar": o palco avisa o CSS (estilos/quiz.css), que deixa o pé
	// solto na abertura. No depois, a abertura também não guarda a linha do
	// "Recomeçar o quiz", que ali nunca aparece.
	it("no depois, o palco marca a linha do piloto, e a abertura não guarda a linha do Recomeçar o quiz", async () => {
		antesRecebido();
		await abrirOQuizFinal();

		expect(naTela(SEGUNDA_ETAPA)).toBeTruthy();
		expect(document.querySelector(".quiz")?.hasAttribute("data-linha")).toBe(
			true,
		);
		expect(document.querySelector(".quiz-abertura .recomeco")).toBeNull();
	});

	it("com o antes pela metade, o palco também marca a linha, e o Recomeçar o quiz continua com a linha dele", async () => {
		comecarPiloto();
		responder(
			QUIZ_FINAL,
			PAGINA.perguntas[0].enunciado,
			PAGINA.perguntas[0].opcoes[0],
		);
		await abrirOQuizFinal();

		expect(document.querySelector(".quiz")?.hasAttribute("data-linha")).toBe(
			true,
		);
		expect(
			screen
				.getByRole("button", { name: "Recomeçar o quiz" })
				.closest(".quiz-abertura .recomeco"),
		).not.toBeNull();
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

describe("o envio das etapas", () => {
	it("no fim do antes, manda a etapa e diz, na tela e ao leitor de tela, que enviou e que recebemos, sem tirar o foco do título", async () => {
		const responder = respostaPresa();
		await abrirOPiloto();
		terminarOAntes(5);

		const titulo = screen.getByRole("heading", {
			level: 2,
			name: "Você terminou a primeira etapa.",
		});
		expect(naTela("Enviando a primeira etapa…")).toBeTruthy();
		expect(aviso()).toBe("Enviando a primeira etapa…");
		const [pedido] = enviar.mock.calls[0];
		expect(pedido).toEqual({
			participacao: expect.stringMatching(UUID_V4),
			versao_quiz: "processo-legislativo-final-v1",
			etapa: "antes",
			acertos: 5,
		});
		expect(document.body.innerHTML).not.toContain(pedido.participacao);

		await responder({ tipo: "recebida" });

		expect(naTela("Recebemos a primeira etapa.")).toBeTruthy();
		expect(aviso()).toBe("Recebemos a primeira etapa.");
		expect(document.activeElement).toBe(titulo);
		expect(lerPiloto()).toMatchObject({ antes: { situacao: "recebida" } });
	});

	it.each([
		{ resultado: { tipo: "fora-do-ar" }, texto: FORA_DO_AR, tentar: true },
		{ resultado: { tipo: "sem-conexao" }, texto: SEM_CONEXAO, tentar: true },
		{
			resultado: { tipo: "limite", segundos: 42 },
			texto: "Muitos envios neste minuto. O site tenta de novo em 42 segundos.",
			tentar: false,
		},
		{
			resultado: { tipo: "limite", segundos: 1 },
			texto: "Muitos envios neste minuto. O site tenta de novo em 1 segundo.",
			tentar: false,
		},
		{
			resultado: { tipo: "limite" },
			texto: "Muitos envios neste minuto. O site tenta de novo em um minuto.",
			tentar: false,
		},
		{ resultado: { tipo: "recusado" }, texto: RECUSADO, tentar: false },
		{
			resultado: { tipo: "encerrado" },
			texto: ENCERRADO_NO_ENVIO,
			tentar: false,
		},
	] satisfies {
		resultado: ResultadoDoEnvio;
		texto: string;
		tentar: boolean;
	}[])(
		"com a resposta $resultado.tipo, diz o que houve com a etapa",
		async ({ resultado, texto, tentar }) => {
			respostasDaApi(resultado);
			await abrirOPiloto();
			terminarOAntes();
			await esperarAApi();

			expect(naTela(texto)).toBeTruthy();
			expect(aviso()).toBe(texto);
			expect(
				screen.queryByRole("button", { name: "Tentar de novo" }) !== null,
			).toBe(tentar);
		},
	);

	it("com o piloto encerrado (410), a etapa sai do navegador e as respostas podem ser revistas", async () => {
		respostasDaApi({ tipo: "encerrado" });
		await abrirOPiloto();
		terminarOAntes();
		await esperarAApi();

		expect(lerPiloto()).toEqual({ fase: "encerrado" });
		expect(
			screen.getByRole("button", { name: /^Rever as respostas/ }),
		).toBeTruthy();
	});

	it("o Tentar de novo manda na hora e fica no lugar, desligado, enquanto espera; com a resposta, o foco fica na frase", async () => {
		respostasDaApi({ tipo: "fora-do-ar" });
		await abrirOPiloto();
		terminarOAntes();
		await esperarAApi();
		const responder = respostaPresa();
		const tentar = screen.getByRole("button", { name: "Tentar de novo" });
		tentar.focus();

		clicar("Tentar de novo");

		expect(enviar).toHaveBeenCalledTimes(2);
		expect(naTela("Enviando a primeira etapa…")).toBeTruthy();
		expect(tentar.getAttribute("aria-disabled")).toBe("true");
		expect(document.activeElement).toBe(tentar);
		// Desligado, ele não manda outro pedido.
		clicar("Tentar de novo");
		expect(enviar).toHaveBeenCalledTimes(2);

		await responder({ tipo: "recebida" });

		expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
		expect(document.activeElement?.textContent).toBe(
			"Recebemos a primeira etapa.",
		);
	});

	it("com outra falha depois do Tentar de novo, o botão volta a valer, com o foco nele", async () => {
		respostasDaApi({ tipo: "fora-do-ar" });
		await abrirOPiloto();
		terminarOAntes();
		await esperarAApi();
		const tentar = screen.getByRole("button", { name: "Tentar de novo" });
		tentar.focus();

		clicar("Tentar de novo");
		await esperarAApi();

		expect(naTela(FORA_DO_AR)).toBeTruthy();
		expect(tentar.getAttribute("aria-disabled")).toBeNull();
		expect(document.activeElement).toBe(tentar);
	});

	it("quando o site manda de novo sozinho, o Tentar de novo fica no lugar, desligado e com o foco", async () => {
		respostasDaApi({ tipo: "sem-conexao" });
		await abrirOPiloto();
		terminarOAntes();
		await esperarAApi();
		const responder = respostaPresa();
		const tentar = screen.getByRole("button", { name: "Tentar de novo" });
		tentar.focus();

		// A internet voltou: o pedido sai sem o clique.
		act(() => {
			window.dispatchEvent(new Event("online"));
		});

		expect(enviar).toHaveBeenCalledTimes(2);
		expect(naTela("Enviando a primeira etapa…")).toBeTruthy();
		expect(tentar.isConnected).toBe(true);
		expect(tentar.getAttribute("aria-disabled")).toBe("true");
		expect(document.activeElement).toBe(tentar);

		await responder({ tipo: "recebida" });

		expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
		expect(document.activeElement?.textContent).toBe(
			"Recebemos a primeira etapa.",
		);
	});

	it("no limite, o Tentar de novo sai e não volta quando o site manda de novo", async () => {
		respostasDaApi({ tipo: "fora-do-ar" }, { tipo: "limite", segundos: 42 });
		await abrirOPiloto();
		terminarOAntes();
		await esperarAApi();
		clicar("Tentar de novo");
		await esperarAApi();
		expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();

		// Passados os 42 segundos, o relógio manda de novo.
		respostaPresa();
		act(() => {
			void enviarPendentes();
		});

		expect(enviar).toHaveBeenCalledTimes(3);
		expect(naTela("Enviando a primeira etapa…")).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
	});

	it("na volta à página do piloto, manda o antes que ficou e diz como foi", async () => {
		comecarPiloto();
		concluirEtapa("antes", 3);
		respostasDaApi({ tipo: "recebida" });

		await abrirOPiloto();
		await esperarAApi();

		expect(enviar).toHaveBeenCalledTimes(1);
		expect(naTela("Recebemos a primeira etapa.")).toBeTruthy();
		expect(screen.getByRole("link", { name: "Ir para a trilha" })).toBeTruthy();
	});

	it("hidrata sem erro com o antes por mandar, e a linha do envio chega depois", async () => {
		comecarPiloto();
		concluirEtapa("antes", 3);

		const palco = await hidratar("/piloto");

		expect(
			within(palco).getByText("Enviando a primeira etapa…", {
				ignore: "[role=status], [aria-hidden=true]",
			}),
		).toBeTruthy();
	});

	it("no fim do quiz final, manda a segunda etapa e agradece quando a API recebe", async () => {
		antesRecebido();
		const responder = respostaPresa();
		await abrirOQuizFinal();
		clicar("Começar");
		for (const [indice] of PAGINA.perguntas.entries()) {
			responderAPergunta(indice, indice < 7);
			clicar(/^(Próxima pergunta|Terminar)$/);
		}

		expect(naTela("Enviando a segunda etapa…")).toBeTruthy();
		expect(enviar.mock.calls[0][0]).toMatchObject({
			etapa: "depois",
			acertos: 7,
		});

		await responder({ tipo: "recebida" });

		expect(
			naTela("Recebemos a segunda etapa. Obrigado por participar do piloto."),
		).toBeTruthy();
		expect(lerPiloto()).toEqual({ fase: "concluido" });
	});

	it("com o antes por mandar, o quiz final manda o antes primeiro e mostra só a segunda etapa", async () => {
		comecarPiloto();
		concluirEtapa("antes", 3);
		respostasDaApi({ tipo: "recebida" });

		await abrirOQuizFinal();
		await esperarAApi();

		expect(enviar.mock.calls.map(([pedido]) => pedido.etapa)).toEqual([
			"antes",
		]);
		expect(naTela(SEGUNDA_ETAPA)).toBeTruthy();
		foraDaTela("Recebemos a primeira etapa.");
	});

	it("o 410 do antes, mandado do quiz final, encerra também o depois", async () => {
		comecarPiloto();
		concluirEtapa("antes", 3);
		respostasDaApi({ tipo: "encerrado" });

		await abrirOQuizFinal();
		await esperarAApi();

		expect(naTela(ENCERRADO_NO_ENVIO)).toBeTruthy();
		foraDaTela(SEGUNDA_ETAPA);
		clicar("Começar");
		responderAPergunta(0, false);
		expect(travadas()).not.toContain(true);
	});

	it("sem a API, nada sai, nem da página do piloto nem do quiz final", async () => {
		comecarPiloto();
		concluirEtapa("antes", 3);

		await abrirOPiloto({ comApi: false });
		await esperarAApi();
		cleanup();
		await abrirOQuizFinal({ comApi: false });
		await esperarAApi();

		expect(enviar).not.toHaveBeenCalled();
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
