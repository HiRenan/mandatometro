// @vitest-environment jsdom

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
	render,
	screen,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArtigoNaLista, Fonte, QuizNaPagina } from "@/lib/conteudo";
import { frasesDoAndamento } from "@/lib/quiz";
import { ChamadaDoQuiz } from "./chamada-do-quiz";
import { Quiz } from "./quiz";

const CHAVE = "mandatometro:respostas-do-quiz";

const constituicao: Fonte = {
	titulo: "Constituição Federal, art. 61",
	url: "https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art61",
	consultadoEm: "2026-11-12",
};

const camara: Fonte = {
	titulo: "Câmara dos Deputados, Entenda o processo legislativo",
	url: "https://www.camara.leg.br/entenda-o-processo-legislativo/",
	consultadoEm: "2026-11-12",
};

function artigo(slug: string, titulo: string, ordem: number): ArtigoNaLista {
	return {
		trilha: "processo-legislativo",
		slug,
		titulo,
		resumo: "Um resumo.",
		ordem,
		fontes: [constituicao],
		minutos: 2,
	};
}

const QUEM_PODE = artigo(
	"quem-pode-propor-uma-lei",
	"Quem pode propor uma lei",
	1,
);
const ONDE_COMECA = artigo("onde-o-projeto-comeca", "Onde o projeto começa", 2);

const INICIATIVA =
	"Você não tem mandato. Você pode apresentar um projeto de lei?";
const SENADORA =
	"Uma senadora apresenta um projeto de lei. Por qual Casa ele começa?";

const pagina: QuizNaPagina = {
	trilha: {
		slug: "processo-legislativo",
		titulo: "Processo legislativo",
		descricao: "Como uma ideia vira lei.",
		ordem: 1,
		artigos: [QUEM_PODE, ONDE_COMECA],
		quizDepoisDe: ONDE_COMECA.slug,
	},
	anterior: ONDE_COMECA,
	perguntas: [
		{
			artigo: { slug: QUEM_PODE.slug, titulo: QUEM_PODE.titulo, posicao: 1 },
			enunciado: INICIATIVA,
			opcoes: [
				"Não. Só quem tem mandato pode propor uma lei.",
				"Pode, pela iniciativa popular.",
			],
			certa: 1,
			explicacao: "Os cidadãos também podem propor leis (art. 61, § 2º).",
			fontes: [constituicao, camara],
		},
		{
			artigo: {
				slug: ONDE_COMECA.slug,
				titulo: ONDE_COMECA.titulo,
				posicao: 2,
			},
			enunciado: SENADORA,
			opcoes: [
				"Pelo Senado Federal.",
				"Pela Câmara dos Deputados.",
				"Pela Casa que ela escolher.",
			],
			certa: 0,
			explicacao: "Os projetos de um senador começam no Senado.",
			fontes: [camara],
		},
	],
};

const AS_DUAS = {
	[INICIATIVA]: "Pode, pela iniciativa popular.",
	[SENADORA]: "Pela Câmara dos Deputados.",
};

/** Um site de mentira, com a página do quiz e as rotas dos links dela. */
function criarRouter(conteudo: ReactNode = <Quiz {...pagina} />) {
	const raiz = createRootRoute({ component: () => <Outlet /> });
	const rotas = [
		createRoute({
			getParentRoute: () => raiz,
			path: "/trilhas/$trilha/quiz",
			component: () => conteudo,
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
	];
	return createRouter({
		routeTree: raiz.addChildren(rotas),
		history: createMemoryHistory({
			initialEntries: ["/trilhas/processo-legislativo/quiz"],
		}),
	});
}

/** A página do quiz, com o JavaScript já carregado: a abertura. */
async function mostrar(conteudo?: ReactNode) {
	render(<RouterProvider router={criarRouter(conteudo)} />);
	await screen.findByRole("heading", { level: 1, name: "Quiz da trilha" });
}

/**
 * O HTML que o servidor manda, antes de o JavaScript carregar: a página, que
 * todo mundo vê, e o que vem dentro do noscript, que o navegador só monta sem
 * JavaScript.
 */
async function htmlDoServidor(): Promise<{
	daPagina: HTMLElement;
	semJavaScript: HTMLElement;
}> {
	const router = criarRouter();
	await router.load();
	const html = renderToString(<RouterProvider router={router} />);
	const daPagina = document.createElement("div");
	daPagina.innerHTML = html
		.replaceAll("<noscript>", "<div data-noscript>")
		.replaceAll("</noscript>", "</div>");
	const blocos = [...daPagina.querySelectorAll<HTMLElement>("[data-noscript]")];
	if (blocos.length !== 1) {
		throw new Error(`esperava um noscript, e vieram ${blocos.length}`);
	}
	blocos[0].remove();
	return { daPagina, semJavaScript: blocos[0] };
}

/** O botão da abertura e do fim que leva às perguntas. */
function botaoDeComecar(): HTMLElement {
	return screen.getByRole("button", {
		name: /^(Começar|Continuar|Rever as respostas)$/,
	});
}

function comecar() {
	fireEvent.click(botaoDeComecar(), { detail: 1 });
}

/** A pergunta que está na tela. */
function pergunta(numero: number): HTMLElement {
	return screen.getByRole("group", {
		name: new RegExp(`^Pergunta ${numero} de 2 `),
	});
}

/** O rádio de uma opção. Depois da resposta, o nome dele leva também a marca. */
function opcao(texto: string): HTMLInputElement {
	return screen.getByRole("radio", {
		name: (nome) => nome.startsWith(texto),
	}) as HTMLInputElement;
}

function escolherEResponder(texto: string) {
	fireEvent.click(opcao(texto));
	fireEvent.click(screen.getByRole("button", { name: "Responder" }));
}

/** "Próxima pergunta" ou, na última, "Terminar". */
function seguir() {
	fireEvent.click(
		screen.getByRole("button", { name: /^(Próxima pergunta|Terminar)$/ }),
		{ detail: 1 },
	);
}

/** Responde as duas perguntas e chega ao fim. */
function irAteOFim() {
	comecar();
	escolherEResponder("Pode, pela iniciativa popular.");
	seguir();
	escolherEResponder("Pelo Senado Federal.");
	seguir();
}

/** A folha da resposta da pergunta que está na tela. */
function folhaDaResposta(): HTMLElement {
	const folha = document.querySelector<HTMLElement>(".quiz-retorno");
	if (!folha) {
		throw new Error("a resposta não está na tela");
	}
	return folha;
}

function algumaMarcada(): boolean {
	return screen
		.getAllByRole("radio")
		.some((radio) => (radio as HTMLInputElement).checked);
}

/**
 * O texto na tela, fora do aviso para o leitor de tela, que repete o andamento,
 * e fora das frases escondidas que guardam o tamanho da linha.
 */
function naTela(texto: string): HTMLElement {
	return screen.getByText(texto, {
		ignore: "[role=status], [aria-hidden=true], script, style",
	});
}

/** A linha do "Recomeçar o quiz": os controles que estão nela. */
function controlesDaLinha(botao: HTMLElement): Element[] {
	const linha = botao.closest(".recomeco");
	if (!linha) {
		throw new Error('o "Recomeçar o quiz" saiu da linha .recomeco');
	}
	return [...linha.querySelectorAll("a, button, input, summary")];
}

function guardarRespostas(respostas: Record<string, string>) {
	localStorage.setItem(
		CHAVE,
		JSON.stringify({
			"processo-legislativo/quiz": { tentativas: [{ respostas }] },
		}),
	);
}

function guardadas(): Record<string, string> {
	const tentativas = JSON.parse(localStorage.getItem(CHAVE) ?? "{}")[
		"processo-legislativo/quiz"
	]?.tentativas;
	return tentativas?.at(-1)?.respostas ?? {};
}

beforeEach(() => {
	localStorage.clear();
	// O jsdom não rola a janela.
	vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("o quiz, no HTML do servidor", () => {
	it("manda a abertura sem botão: o Começar só funciona com JavaScript", async () => {
		const { daPagina, semJavaScript } = await htmlDoServidor();

		expect(daPagina.querySelector("h1")?.textContent).toBe("Quiz da trilha");
		expect(daPagina.textContent).toContain("2 perguntas");
		expect(daPagina.querySelectorAll("button")).toHaveLength(0);
		expect(semJavaScript.querySelectorAll("button")).toHaveLength(0);
		// As perguntas só vêm dentro do noscript.
		expect(daPagina.querySelectorAll("fieldset")).toHaveLength(0);
	});

	it("manda no noscript cada pergunta num grupo, com um rádio por opção, e a resposta, que abre sem JavaScript", async () => {
		const { semJavaScript } = await htmlDoServidor();
		const grupos = [...semJavaScript.querySelectorAll("fieldset")];
		const respostas = [...semJavaScript.querySelectorAll("details")];

		expect(
			grupos.map((grupo) => grupo.querySelector("legend")?.textContent),
		).toEqual([`Pergunta 1 de 2 ${INICIATIVA}`, `Pergunta 2 de 2 ${SENADORA}`]);
		expect(
			[...grupos[1].querySelectorAll("label")].map(
				(rotulo) => rotulo.querySelector(".quiz-texto")?.textContent,
			),
		).toEqual(pagina.perguntas[1].opcoes);
		// Os rádios de uma pergunta têm o mesmo nome, e os da outra, outro nome.
		const nomes = grupos.map((grupo) =>
			[...grupo.querySelectorAll("input")].map((radio) => {
				expect(radio.type).toBe("radio");
				return radio.name;
			}),
		);
		expect(nomes.map((dosRadios) => dosRadios.length)).toEqual([2, 3]);
		expect(new Set(nomes[0]).size).toBe(1);
		expect(new Set(nomes[1]).size).toBe(1);
		expect(nomes[0][0]).not.toBe(nomes[1][0]);

		expect(respostas.map((detalhes) => detalhes.open)).toEqual([false, false]);
		expect(respostas[0].querySelector("summary")?.textContent).toBe(
			"Ver a resposta",
		);
		expect(respostas[0].textContent).toContain(
			"Resposta certa: Pode, pela iniciativa popular.",
		);
		// A citação não quebra de linha no meio: o espaço dela é o que não quebra.
		expect(respostas[0].textContent).toContain(
			"Os cidadãos também podem propor leis (art. 61, § 2º).",
		);
		expect(
			[...respostas[0].querySelectorAll("a")].map((link) =>
				link.getAttribute("href"),
			),
		).toEqual([
			"/trilhas/processo-legislativo/quem-pode-propor-uma-lei",
			constituicao.url,
			camara.url,
		]);
		expect(respostas[0].textContent).toContain("Fontes oficiais");
		expect(respostas[1].textContent).toContain("Fonte oficial");
	});

	it("deixa o resultado fora do HTML do servidor", async () => {
		const { daPagina, semJavaScript } = await htmlDoServidor();

		expect(daPagina.textContent).not.toMatch(/Você (acertou|errou)/);
		expect(semJavaScript.textContent).not.toMatch(/Você (acertou|errou)/);
	});

	it("guarda o lugar do Começar com os três textos que o botão pode ter, escondidos e sem botão", async () => {
		const { daPagina } = await htmlDoServidor();
		const lugar = daPagina.querySelector(".quiz-comeco");
		const reservas = [...(lugar?.children ?? [])];

		// "Rever as respostas" vai em duas linhas no celular com a letra grande. Com
		// os três textos no mesmo lugar da grade, invisíveis, o lugar já tem a altura
		// do mais alto, e nada desce quando o botão aparece, depois do JavaScript.
		expect(lugar?.classList.contains("lugar-do-botao")).toBe(true);
		expect(reservas.map((reserva) => reserva.textContent?.trim())).toEqual([
			"Começar",
			"Continuar",
			"Rever as respostas",
		]);
		expect(
			reservas.every(
				(reserva) =>
					reserva.tagName === "SPAN" &&
					reserva.getAttribute("aria-hidden") === "true" &&
					reserva.classList.contains("botao") &&
					reserva.classList.contains("invisible"),
			),
		).toBe(true);
	});

	it("guarda a altura da frase mais alta do andamento, escondida do leitor de tela", async () => {
		const { daPagina } = await htmlDoServidor();
		const reservas = [
			...daPagina.querySelectorAll("[aria-hidden=true]"),
		].filter((elemento) => elemento.textContent?.startsWith("Você "));
		const linha = reservas[0]?.parentElement;

		// No celular com a letra grande, a frase quebra em duas linhas. Com todas
		// as frases no mesmo lugar da grade, invisíveis, a linha já tem o tamanho
		// da maior, e nada sai do lugar quando o andamento aparece.
		expect(reservas.map((reserva) => reserva.textContent)).toEqual(
			frasesDoAndamento(2),
		);
		expect(
			reservas.every(
				(reserva) =>
					reserva.parentElement === linha &&
					reserva.classList.contains("invisible"),
			),
		).toBe(true);
		expect(linha?.textContent).toBe(frasesDoAndamento(2).join(""));
	});

	it("hidrata sem erro, com o andamento guardado, o Continuar e o Recomeçar o quiz", async () => {
		guardarRespostas({ [INICIATIVA]: "Pode, pela iniciativa popular." });
		const router = criarRouter();
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
		const palco = raiz.querySelector<HTMLElement>(".quiz");
		if (!palco) {
			throw new Error("o palco do quiz não veio");
		}

		expect(erros).not.toHaveBeenCalled();
		expect(consoleErro).not.toHaveBeenCalled();
		expect(
			within(palco).getByText("Você respondeu 1 de 2.", {
				ignore: "[aria-hidden=true]",
			}),
		).toBeTruthy();
		expect(
			within(palco)
				.getAllByRole("button")
				.map((botao) => botao.textContent?.trim()),
		).toEqual(["Recomeçar o quiz", "Continuar"]);
		// A tela continua a da abertura: nada troca de lugar com a hidratação.
		expect(palco.dataset.fase).toBe("abertura");
		expect(within(palco).queryAllByRole("radio")).toHaveLength(0);
		raiz.remove();
	});
});

describe("o quiz", () => {
	it("abre com o Começar e o mosaico, um azulejo por pergunta, fora do leitor de tela", async () => {
		await mostrar();

		expect(botaoDeComecar().textContent?.trim()).toBe("Começar");
		expect(
			screen.queryByRole("button", { name: "Recomeçar o quiz" }),
		).toBeNull();
		expect(screen.queryAllByRole("group")).toHaveLength(0);
		const cena = document.querySelector(".quiz-cena");
		expect(cena?.getAttribute("aria-hidden")).toBe("true");
		expect(cena?.querySelectorAll(".grande")).toHaveLength(2);
		// O andamento também tem um quadradinho por pergunta, só desenho.
		const andamento = document.querySelector(".quiz-andamento");
		expect(andamento?.getAttribute("aria-hidden")).toBe("true");
		expect(andamento?.children).toHaveLength(2);
	});

	it("mostra uma pergunta por vez, num grupo, com o enunciado na legenda e uma opção por rádio", async () => {
		await mostrar();

		comecar();

		expect(screen.getAllByRole("group")).toHaveLength(1);
		expect(
			screen.getByRole("group", { name: `Pergunta 1 de 2 ${INICIATIVA}` }),
		).toBeTruthy();
		expect(
			within(pergunta(1))
				.getAllByRole("radio", { name: /./ })
				.map((radio) => radio.closest("label")?.textContent),
		).toEqual([
			"ANão. Só quem tem mandato pode propor uma lei.",
			"BPode, pela iniciativa popular.",
		]);
		expect(
			within(pergunta(1)).getByRole("radio", {
				name: "Pode, pela iniciativa popular.",
			}),
		).toBeTruthy();
		// O foco vai para o enunciado, e o leitor de tela continua dali.
		expect(document.activeElement).toBe(
			screen.getByRole("heading", { level: 2, name: INICIATIVA }),
		);
	});

	it("ao acertar, mostra o resultado, avisa o leitor de tela e leva o foco ao resultado", async () => {
		await mostrar();
		comecar();

		escolherEResponder("Pode, pela iniciativa popular.");

		const resultado = within(folhaDaResposta()).getByText("Você acertou.");
		expect(screen.getByRole("status").textContent).toBe(
			"Pergunta 1: você acertou.",
		);
		expect(document.activeElement).toBe(resultado);
		// Depois da resposta, o "Responder" sai, e a opção certa vem marcada.
		expect(screen.queryByRole("button", { name: "Responder" })).toBeNull();
		expect(
			screen.getByRole("radio", {
				name: "Pode, pela iniciativa popular. Resposta certa",
			}),
		).toBeTruthy();
	});

	it("ao errar, diz que errou e mostra a resposta certa, na tela e no aviso", async () => {
		await mostrar();
		comecar();
		escolherEResponder("Pode, pela iniciativa popular.");
		seguir();

		escolherEResponder("Pela Câmara dos Deputados.");

		expect(within(folhaDaResposta()).getByText("Você errou.")).toBeTruthy();
		expect(folhaDaResposta().textContent).toContain(
			"Resposta certa: Pelo Senado Federal.",
		);
		expect(screen.getByRole("status").textContent).toBe(
			"Pergunta 2: você errou. A resposta certa é: Pelo Senado Federal.",
		);
		// O estado de cada opção vem escrito nela, e não só na cor.
		expect(
			screen.getByRole("radio", {
				name: "Pelo Senado Federal. Resposta certa",
			}),
		).toBeTruthy();
		expect(
			screen.getByRole("radio", {
				name: "Pela Câmara dos Deputados. Sua resposta",
			}),
		).toBeTruthy();
		expect(
			screen.getByRole("radio", { name: "Pela Casa que ela escolher." }),
		).toBeTruthy();
	});

	it("pede uma opção quando a pessoa responde sem escolher", async () => {
		await mostrar();
		comecar();

		fireEvent.click(screen.getByRole("button", { name: "Responder" }));

		expect(naTela("Escolha uma opção antes de responder.")).toBeTruthy();
		expect(screen.getByRole("status").textContent).toBe(
			"Escolha uma opção antes de responder.",
		);
		expect(document.querySelector(".quiz-retorno")).toBeNull();
		expect(localStorage.getItem(CHAVE)).toBeNull();
	});

	it("guarda a resposta só no navegador, sem nenhuma requisição", async () => {
		const pedidos = vi.spyOn(globalThis, "fetch");
		const xhr = vi.spyOn(XMLHttpRequest.prototype, "open");
		await mostrar();
		comecar();

		escolherEResponder("Pode, pela iniciativa popular.");

		expect(pedidos).not.toHaveBeenCalled();
		expect(xhr).not.toHaveBeenCalled();
		expect(JSON.parse(localStorage.getItem(CHAVE) ?? "")).toEqual({
			"processo-legislativo/quiz": {
				tentativas: [
					{ respostas: { [INICIATIVA]: "Pode, pela iniciativa popular." } },
				],
			},
		});
	});

	it("mostra o andamento sem total de acertos, até o fim", async () => {
		await mostrar();
		comecar();
		const quadradinhos = () =>
			[...document.querySelectorAll<HTMLElement>(".quiz-andamento li")].map(
				(quadradinho) => quadradinho.dataset.estado,
			);
		expect(quadradinhos()).toEqual(["falta", "falta"]);

		// O quadradinho ganha cor por responder, e não por acertar.
		escolherEResponder("Não. Só quem tem mandato pode propor uma lei.");
		expect(naTela("Você respondeu 1 de 2.")).toBeTruthy();
		expect(quadradinhos()).toEqual(["feito", "falta"]);
		expect(document.body.textContent).not.toMatch(
			/acertos|pontos|\bnota\b|ranking|placar/i,
		);

		seguir();
		escolherEResponder("Pelo Senado Federal.");
		expect(naTela("Você terminou o quiz.")).toBeTruthy();
		expect(quadradinhos()).toEqual(["feito", "feito"]);

		seguir();
		expect(document.body.textContent).not.toMatch(
			/acertos|pontos|\bnota\b|ranking|placar/i,
		);
	});

	// O mosaico é desenho e não conta acertos: o azulejo de uma pergunta ganha cor
	// quando ela é respondida, do mesmo jeito com a resposta certa e com a errada.
	it.each([
		["errada", "Não. Só quem tem mandato pode propor uma lei."],
		["certa", "Pode, pela iniciativa popular."],
	])(
		"pinta o azulejo do mosaico da pergunta respondida, com a resposta %s",
		async (_qual, resposta) => {
			await mostrar();
			// As peças sem cor de cada azulejo do mosaico, na ordem das perguntas.
			const crus = () =>
				[...document.querySelectorAll(".mosaico .grande")].map(
					(azulejo) => azulejo.querySelectorAll(".az.cru").length,
				);
			// Na abertura, o mosaico é a capa, inteiro e em cor.
			expect(crus()).toEqual([0, 0]);

			comecar();
			expect(crus()).toEqual([4, 4]);

			escolherEResponder(resposta);
			expect(crus()).toEqual([0, 4]);
		},
	);

	it("passa para a pergunta seguinte, sem nada marcado e com o foco no enunciado dela", async () => {
		await mostrar();
		comecar();
		escolherEResponder("Pode, pela iniciativa popular.");

		seguir();

		expect(screen.getAllByRole("group")).toHaveLength(1);
		expect(pergunta(2)).toBeTruthy();
		expect(algumaMarcada()).toBe(false);
		expect(document.querySelector(".quiz-retorno")).toBeNull();
		expect(document.activeElement).toBe(
			screen.getByRole("heading", { level: 2, name: SENADORA }),
		);
		// Na última pergunta, o botão da resposta leva ao fim.
		escolherEResponder("Pelo Senado Federal.");
		expect(screen.getByRole("button", { name: "Terminar" })).toBeTruthy();
	});

	it("fecha a resposta quando a pessoa troca de opção, e vale a última que ela responde", async () => {
		await mostrar();
		comecar();
		escolherEResponder("Pode, pela iniciativa popular.");
		seguir();
		escolherEResponder("Pela Câmara dos Deputados.");
		expect(within(folhaDaResposta()).getByText("Você errou.")).toBeTruthy();

		fireEvent.click(opcao("Pelo Senado Federal."));

		expect(document.querySelector(".quiz-retorno")).toBeNull();
		expect(screen.getByRole("button", { name: "Responder" })).toBeTruthy();
		// Até ela responder de novo, fica guardada a resposta de antes.
		expect(guardadas()[SENADORA]).toBe("Pela Câmara dos Deputados.");

		fireEvent.click(screen.getByRole("button", { name: "Responder" }));

		expect(within(folhaDaResposta()).getByText("Você acertou.")).toBeTruthy();
		expect(within(folhaDaResposta()).queryByText("Você errou.")).toBeNull();
		expect(guardadas()[SENADORA]).toBe("Pelo Senado Federal.");
	});

	it("leva ao artigo de onde sai a resposta, para rever, e chama as fontes pelo número delas", async () => {
		await mostrar();
		comecar();

		escolherEResponder("Pode, pela iniciativa popular.");

		expect(
			within(folhaDaResposta())
				.getByRole("link", { name: "Artigo 1: Quem pode propor uma lei" })
				.getAttribute("href"),
		).toBe("/trilhas/processo-legislativo/quem-pode-propor-uma-lei");
		expect(within(folhaDaResposta()).getByText("Fontes oficiais")).toBeTruthy();
		expect(
			within(folhaDaResposta())
				.getAllByRole("link")
				.map((link) => link.getAttribute("href")),
		).toEqual([
			"/trilhas/processo-legislativo/quem-pode-propor-uma-lei",
			constituicao.url,
			camara.url,
		]);

		seguir();
		escolherEResponder("Pelo Senado Federal.");

		expect(within(folhaDaResposta()).getByText("Fonte oficial")).toBeTruthy();
	});

	it("no fim, diz que a pessoa terminou, leva o foco ao título e mostra os artigos para rever", async () => {
		await mostrar();

		irAteOFim();

		const titulo = screen.getByRole("heading", {
			level: 2,
			name: "Você terminou o quiz.",
		});
		expect(document.activeElement).toBe(titulo);
		expect(screen.queryAllByRole("group")).toHaveLength(0);
		const fim = titulo.closest<HTMLElement>(".quiz-fim");
		if (!fim) {
			throw new Error("o título do fim saiu da tela do fim");
		}
		expect(
			within(fim)
				.getAllByRole("link")
				.map((link) => [link.getAttribute("href"), link.textContent?.trim()]),
		).toEqual([
			[
				"/trilhas/processo-legislativo/quem-pode-propor-uma-lei",
				"Artigo 1 Quem pode propor uma lei",
			],
			[
				"/trilhas/processo-legislativo/onde-o-projeto-comeca",
				"Artigo 2 Onde o projeto começa",
			],
			["/trilhas/processo-legislativo", "Voltar para Processo legislativo"],
		]);
	});

	it("na volta à página com o quiz pela metade, continua da primeira pergunta sem resposta", async () => {
		guardarRespostas({ [INICIATIVA]: "Pode, pela iniciativa popular." });
		await mostrar();

		expect(botaoDeComecar().textContent?.trim()).toBe("Continuar");
		expect(naTela("Você respondeu 1 de 2.")).toBeTruthy();

		comecar();

		expect(pergunta(2)).toBeTruthy();
		expect(algumaMarcada()).toBe(false);
		expect(document.querySelector(".quiz-retorno")).toBeNull();
	});

	it("na volta à página com o quiz terminado, revê cada resposta desde a primeira", async () => {
		guardarRespostas(AS_DUAS);
		await mostrar();

		expect(botaoDeComecar().textContent?.trim()).toBe("Rever as respostas");
		expect(naTela("Você terminou o quiz.")).toBeTruthy();

		comecar();

		expect(pergunta(1)).toBeTruthy();
		expect(opcao("Pode, pela iniciativa popular.").checked).toBe(true);
		expect(within(folhaDaResposta()).getByText("Você acertou.")).toBeTruthy();

		seguir();

		expect(opcao("Pela Câmara dos Deputados.").checked).toBe(true);
		expect(within(folhaDaResposta()).getByText("Você errou.")).toBeTruthy();
	});

	it("recomeça no fim com a tela limpa", async () => {
		await mostrar();
		irAteOFim();

		fireEvent.click(screen.getByRole("button", { name: "Recomeçar o quiz" }), {
			detail: 1,
		});

		expect(
			screen.getByRole("heading", { level: 2, name: "Você recomeçou o quiz." }),
		).toBeTruthy();
		expect(screen.getByRole("status").textContent).toBe(
			"Você recomeçou o quiz.",
		);
		expect(botaoDeComecar().textContent?.trim()).toBe("Começar");

		// Quem começa de novo encontra a primeira pergunta sem nada marcado.
		comecar();

		expect(pergunta(1)).toBeTruthy();
		expect(algumaMarcada()).toBe(false);
		expect(document.querySelector(".quiz-retorno")).toBeNull();
	});

	it("desfaz o recomeço sem perder as respostas", async () => {
		guardarRespostas(AS_DUAS);
		await mostrar();

		fireEvent.click(screen.getByRole("button", { name: "Recomeçar o quiz" }), {
			detail: 1,
		});

		expect(naTela("Você recomeçou o quiz.")).toBeTruthy();
		expect(botaoDeComecar().textContent?.trim()).toBe("Começar");

		fireEvent.click(screen.getByRole("button", { name: "Desfazer" }), {
			detail: 1,
		});

		expect(naTela("Você terminou o quiz.")).toBeTruthy();
		expect(screen.getByRole("status").textContent).toBe(
			"Você terminou o quiz.",
		);
		expect(botaoDeComecar().textContent?.trim()).toBe("Rever as respostas");
		expect(guardadas()).toEqual(AS_DUAS);
	});

	it("num clique duplo no Recomeçar o quiz, fica com o recomeço, e o Desfazer funciona com um clique depois", async () => {
		await mostrar();
		irAteOFim();
		const botao = screen.getByRole("button", { name: "Recomeçar o quiz" });

		// Num clique duplo, o navegador manda dois cliques, e o segundo vem com o
		// detail 2. Ele cairia no "Desfazer", que aparece no mesmo botão.
		fireEvent.click(botao, { detail: 1 });
		fireEvent.click(botao, { detail: 2 });

		expect(botao.textContent).toBe("Desfazer");
		expect(
			screen.getByRole("heading", { level: 2, name: "Você recomeçou o quiz." }),
		).toBeTruthy();
		expect(screen.getByRole("status").textContent).toBe(
			"Você recomeçou o quiz.",
		);
		expect(guardadas()).toEqual({});

		fireEvent.click(botao, { detail: 1 });

		expect(botao.textContent).toBe("Recomeçar o quiz");
		expect(
			screen.getByRole("heading", { level: 2, name: "Você terminou o quiz." }),
		).toBeTruthy();
		expect(Object.keys(guardadas())).toHaveLength(2);
	});

	// O "Desfazer" não pode sair de onde o "Recomeçar o quiz" estava, e nenhum
	// outro controle pode aparecer ali: o segundo clique de um clique duplo
	// cairia nele. O botão que leva às perguntas também deixa esse clique de
	// fora, para ele não começar o quiz se cair lá.
	it("deixa o Desfazer no lugar do Recomeçar o quiz, sozinho na linha dele, na abertura e no fim", async () => {
		guardarRespostas(AS_DUAS);
		await mostrar();
		const naAbertura = screen.getByRole("button", { name: "Recomeçar o quiz" });
		const linha = naAbertura.closest(".recomeco");
		expect(controlesDaLinha(naAbertura)).toEqual([naAbertura]);

		fireEvent.click(naAbertura, { detail: 1 });
		fireEvent.click(naAbertura, { detail: 2 });

		expect(naAbertura.isConnected).toBe(true);
		expect(naAbertura.textContent).toBe("Desfazer");
		expect(naAbertura.closest(".recomeco")).toBe(linha);
		expect(controlesDaLinha(naAbertura)).toEqual([naAbertura]);

		// O segundo clique, se caísse no "Começar", não começava o quiz.
		fireEvent.click(botaoDeComecar(), { detail: 2 });
		expect(screen.queryAllByRole("group")).toHaveLength(0);
		expect(naAbertura.textContent).toBe("Desfazer");

		fireEvent.click(naAbertura, { detail: 1 });
		comecar();
		seguir();
		seguir();
		const noFim = screen.getByRole("button", { name: "Recomeçar o quiz" });
		const linhaDoFim = noFim.closest(".recomeco");
		expect(controlesDaLinha(noFim)).toEqual([noFim]);

		fireEvent.click(noFim, { detail: 1 });
		fireEvent.click(noFim, { detail: 2 });

		expect(noFim.isConnected).toBe(true);
		expect(noFim.textContent).toBe("Desfazer");
		expect(noFim.closest(".recomeco")).toBe(linhaDoFim);
		expect(controlesDaLinha(noFim)).toEqual([noFim]);
	});

	it("pelo teclado, recomeça e desfaz um depois do outro, com o foco no mesmo botão", async () => {
		guardarRespostas(AS_DUAS);
		await mostrar();
		const botao = screen.getByRole("button", { name: "Recomeçar o quiz" });
		botao.focus();

		// O Enter e o espaço chegam ao botão como um clique com o detail 0.
		fireEvent.click(botao, { detail: 0 });

		expect(botao.textContent).toBe("Desfazer");
		expect(naTela("Você recomeçou o quiz.")).toBeTruthy();
		expect(document.activeElement).toBe(botao);

		fireEvent.click(botao, { detail: 0 });

		expect(botao.textContent).toBe("Recomeçar o quiz");
		expect(naTela("Você terminou o quiz.")).toBeTruthy();
		expect(document.activeElement).toBe(botao);
	});

	it("depois que a pessoa começa a responder de novo, o recomeço não se desfaz mais", async () => {
		guardarRespostas(AS_DUAS);
		await mostrar();
		fireEvent.click(screen.getByRole("button", { name: "Recomeçar o quiz" }), {
			detail: 1,
		});

		irAteOFim();

		expect(screen.queryByRole("button", { name: "Desfazer" })).toBeNull();
		expect(
			screen.getByRole("button", { name: "Recomeçar o quiz" }),
		).toBeTruthy();
	});

	it("embaixo do palco, leva ao artigo anterior e, sem próximo artigo, de volta à trilha", async () => {
		await mostrar();
		const rodape = screen.getByRole("navigation", {
			name: "Artigos da trilha",
		});

		expect(
			within(rodape)
				.getAllByRole("link")
				.map((link) => [
					link.getAttribute("href"),
					link.querySelector(".rotulo")?.textContent,
					link.querySelector("strong")?.textContent,
				]),
		).toEqual([
			[
				"/trilhas/processo-legislativo/onde-o-projeto-comeca",
				"Artigo anterior",
				"Onde o projeto começa",
			],
			[
				"/trilhas/processo-legislativo",
				"Fim da trilha",
				"Voltar para Processo legislativo",
			],
		]);
	});

	it("embaixo do palco, leva ao próximo artigo quando a trilha continua", async () => {
		const proximo = artigo(
			"o-projeto-passa-pelas-comissoes",
			"O projeto passa pelas comissões",
			3,
		);
		const trilha = {
			...pagina.trilha,
			artigos: [...pagina.trilha.artigos, proximo],
		};
		await mostrar(<Quiz {...pagina} trilha={trilha} proximo={proximo} />);
		const rodape = screen.getByRole("navigation", {
			name: "Artigos da trilha",
		});

		expect(
			within(rodape)
				.getAllByRole("link")
				.map((link) => [
					link.getAttribute("href"),
					link.querySelector(".rotulo")?.textContent,
					link.querySelector("strong")?.textContent,
				]),
		).toEqual([
			[
				"/trilhas/processo-legislativo/onde-o-projeto-comeca",
				"Artigo anterior",
				"Onde o projeto começa",
			],
			[
				"/trilhas/processo-legislativo/o-projeto-passa-pelas-comissoes",
				"Próximo artigo",
				"O projeto passa pelas comissões",
			],
		]);
	});
});

describe("a chamada do quiz", () => {
	it("diz quantas perguntas e de quais artigos, e leva à página do quiz", async () => {
		render(
			<RouterProvider
				router={criarRouter(
					<ChamadaDoQuiz
						trilha="processo-legislativo"
						quiz={{ perguntas: 6, artigos: [1, 2, 3] }}
					/>,
				)}
			/>,
		);
		const chamada = await screen.findByRole("region", {
			name: "Quiz da trilha",
		});

		expect(
			within(chamada).getByText(
				"6 perguntas sobre os artigos 1 a 3, com a resposta certa, a explicação e a fonte oficial de cada uma.",
			),
		).toBeTruthy();
		expect(
			within(chamada)
				.getByRole("link", { name: "Responder o quiz" })
				.getAttribute("href"),
		).toBe("/trilhas/processo-legislativo/quiz");
		// Um azulejo por pergunta, só desenho: fica fora do leitor de tela e não diz
		// nada sobre acertos.
		const azulejos = chamada.querySelector(".chamada-azulejos");
		expect(azulejos?.getAttribute("aria-hidden")).toBe("true");
		expect(azulejos?.children).toHaveLength(6);
	});
});
