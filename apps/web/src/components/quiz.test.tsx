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

async function mostrar(conteudo?: ReactNode) {
	render(<RouterProvider router={criarRouter(conteudo)} />);
	await screen.findAllByRole("group");
}

/** O HTML que o servidor manda, antes de o JavaScript carregar. */
async function htmlDoServidor(): Promise<HTMLElement> {
	const router = criarRouter();
	await router.load();
	const raiz = document.createElement("div");
	raiz.innerHTML = renderToString(<RouterProvider router={router} />);
	return raiz;
}

function pergunta(numero: number): HTMLElement {
	const item = screen
		.getByRole("group", { name: new RegExp(`^Pergunta ${numero} de 2 `) })
		.closest("li");
	if (!item) {
		throw new Error(`a pergunta ${numero} não está numa lista`);
	}
	return item;
}

function respostaDa(numero: number): HTMLDetailsElement {
	const detalhes = pergunta(numero).querySelector("details");
	if (!detalhes) {
		throw new Error(`a pergunta ${numero} não tem o "Ver a resposta"`);
	}
	return detalhes;
}

function escolherEResponder(numero: number, opcao: string): HTMLElement {
	fireEvent.click(within(pergunta(numero)).getByRole("radio", { name: opcao }));
	const botao = within(pergunta(numero)).getByRole("button", {
		name: "Responder",
	});
	botao.focus();
	fireEvent.click(botao);
	return botao;
}

/**
 * O texto na tela, fora do aviso para o leitor de tela, que repete o andamento,
 * e fora das frases escondidas que guardam a altura da linha do andamento.
 */
function naTela(texto: string): HTMLElement {
	return screen.getByText(texto, {
		ignore: "[role=status], [aria-hidden=true], script, style",
	});
}

function marcada(opcao: string): boolean {
	return (screen.getByRole("radio", { name: opcao }) as HTMLInputElement)
		.checked;
}

function guardarResposta(enunciado: string, opcao: string) {
	localStorage.setItem(
		CHAVE,
		JSON.stringify({
			"processo-legislativo/quiz": {
				tentativas: [{ respostas: { [enunciado]: opcao } }],
			},
		}),
	);
}

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe("o quiz", () => {
	it("mostra cada pergunta num grupo, com o enunciado na legenda e uma opção por rádio", async () => {
		await mostrar();

		expect(
			screen.getByRole("group", { name: `Pergunta 1 de 2 ${INICIATIVA}` }),
		).toBeTruthy();
		expect(
			screen.getByRole("group", { name: `Pergunta 2 de 2 ${SENADORA}` }),
		).toBeTruthy();
		expect(
			within(pergunta(2))
				.getAllByRole("radio")
				.map((radio) => radio.closest("label")?.textContent),
		).toEqual(pagina.perguntas[1].opcoes);
	});

	it("manda no HTML do servidor a resposta de cada pergunta, que abre sem JavaScript", async () => {
		const raiz = await htmlDoServidor();
		const respostas = [...raiz.querySelectorAll("details")];

		expect(respostas.map((detalhes) => detalhes.open)).toEqual([false, false]);
		expect(respostas[0].querySelector("summary")?.textContent).toBe(
			"Ver a resposta",
		);
		expect(respostas[0].textContent).toContain(
			"Resposta certa: Pode, pela iniciativa popular.",
		);
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
	});

	it("deixa fora do HTML do servidor o Responder, que só funciona com JavaScript, e o resultado", async () => {
		const raiz = await htmlDoServidor();

		expect(raiz.querySelectorAll("button")).toHaveLength(0);
		expect(raiz.textContent).not.toMatch(/Você (acertou|errou)/);
	});

	it("guarda no HTML do servidor a altura da frase mais alta do andamento, escondida do leitor de tela", async () => {
		const raiz = await htmlDoServidor();
		const reservas = [...raiz.querySelectorAll("[aria-hidden=true]")].filter(
			(elemento) => elemento.textContent?.startsWith("Você "),
		);
		const linha = reservas[0]?.parentElement;

		// No celular com a letra grande, a frase quebra em duas linhas. Com todas
		// as frases no mesmo lugar da grade, invisíveis, a linha já tem a altura
		// da mais alta, e as perguntas não descem quando o andamento aparece.
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

	it("hidrata sem erro, com a resposta guardada marcada e o andamento", async () => {
		guardarResposta(INICIATIVA, "Pode, pela iniciativa popular.");
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

		expect(erros).not.toHaveBeenCalled();
		expect(consoleErro).not.toHaveBeenCalled();
		expect(marcada("Pode, pela iniciativa popular.")).toBe(true);
		expect(naTela("Você respondeu 1 de 2.")).toBeTruthy();
		expect(
			within(raiz).getAllByRole("button", { name: "Responder" }),
		).toHaveLength(2);
		// O resultado fica dentro do "Ver a resposta", fechado, e nada pula.
		expect(respostaDa(1).open).toBe(false);
		expect(respostaDa(1).textContent).toContain("Você acertou.");
		raiz.remove();
	});

	it("ao acertar, abre a resposta com o resultado, avisa o leitor de tela e deixa o foco no botão", async () => {
		await mostrar();

		const botao = escolherEResponder(1, "Pode, pela iniciativa popular.");

		expect(respostaDa(1).open).toBe(true);
		expect(within(respostaDa(1)).getByText("Você acertou.")).toBeTruthy();
		expect(screen.getByRole("status").textContent).toBe(
			"Pergunta 1: você acertou.",
		);
		expect(document.activeElement).toBe(botao);
	});

	it("ao errar, diz que errou e mostra a resposta certa, na tela e no aviso", async () => {
		await mostrar();

		escolherEResponder(2, "Pela Câmara dos Deputados.");

		expect(within(respostaDa(2)).getByText("Você errou.")).toBeTruthy();
		expect(respostaDa(2).textContent).toContain(
			"Resposta certa: Pelo Senado Federal.",
		);
		expect(screen.getByRole("status").textContent).toBe(
			"Pergunta 2: você errou. A resposta certa é: Pelo Senado Federal.",
		);
	});

	it("pede uma opção quando a pessoa responde sem escolher", async () => {
		await mostrar();

		fireEvent.click(
			within(pergunta(1)).getByRole("button", { name: "Responder" }),
		);

		expect(
			within(pergunta(1)).getByText("Escolha uma opção antes de responder."),
		).toBeTruthy();
		expect(screen.getByRole("status").textContent).toBe(
			"Escolha uma opção antes de responder.",
		);
		expect(respostaDa(1).open).toBe(false);
	});

	it("guarda a resposta só no navegador, sem nenhuma requisição", async () => {
		const pedidos = vi.spyOn(globalThis, "fetch");
		const xhr = vi.spyOn(XMLHttpRequest.prototype, "open");
		await mostrar();

		escolherEResponder(1, "Pode, pela iniciativa popular.");

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

		escolherEResponder(1, "Não. Só quem tem mandato pode propor uma lei.");
		expect(naTela("Você respondeu 1 de 2.")).toBeTruthy();

		escolherEResponder(2, "Pelo Senado Federal.");
		expect(naTela("Você terminou o quiz.")).toBeTruthy();
		expect(document.body.textContent).not.toMatch(
			/acertos|pontos|\bnota\b|ranking/i,
		);
	});

	it("vale a última resposta quando a pessoa troca de opção e responde de novo", async () => {
		await mostrar();

		escolherEResponder(2, "Pela Câmara dos Deputados.");
		escolherEResponder(2, "Pelo Senado Federal.");

		expect(within(respostaDa(2)).getByText("Você acertou.")).toBeTruthy();
		expect(within(respostaDa(2)).queryByText("Você errou.")).toBeNull();
	});

	it("recomeça com a tela limpa e desfaz sem perder as respostas", async () => {
		await mostrar();
		escolherEResponder(1, "Pode, pela iniciativa popular.");

		fireEvent.click(screen.getByRole("button", { name: "Recomeçar o quiz" }));

		expect(naTela("Você recomeçou o quiz.")).toBeTruthy();
		expect(screen.getByRole("status").textContent).toBe(
			"Você recomeçou o quiz.",
		);
		expect(
			screen
				.getAllByRole("radio")
				.some((radio) => (radio as HTMLInputElement).checked),
		).toBe(false);
		expect(respostaDa(1).open).toBe(false);

		fireEvent.click(screen.getByRole("button", { name: "Desfazer" }));

		expect(marcada("Pode, pela iniciativa popular.")).toBe(true);
		expect(naTela("Você respondeu 1 de 2.")).toBeTruthy();
	});

	it("num clique duplo no Recomeçar o quiz, fica com o recomeço, e o Desfazer funciona com um clique depois", async () => {
		await mostrar();
		escolherEResponder(1, "Pode, pela iniciativa popular.");
		const botao = screen.getByRole("button", { name: "Recomeçar o quiz" });

		// Num clique duplo, o navegador manda dois cliques, e o segundo vem com o
		// detail 2. Ele cairia no "Desfazer", que aparece no mesmo botão.
		fireEvent.click(botao, { detail: 1 });
		fireEvent.click(botao, { detail: 2 });

		expect(naTela("Você recomeçou o quiz.")).toBeTruthy();
		expect(screen.getByRole("status").textContent).toBe(
			"Você recomeçou o quiz.",
		);
		expect(
			screen
				.getAllByRole("radio")
				.some((radio) => (radio as HTMLInputElement).checked),
		).toBe(false);

		fireEvent.click(screen.getByRole("button", { name: "Desfazer" }), {
			detail: 1,
		});

		expect(marcada("Pode, pela iniciativa popular.")).toBe(true);
		expect(naTela("Você respondeu 1 de 2.")).toBeTruthy();
	});

	it("pelo teclado, recomeça e desfaz um depois do outro, com o foco no mesmo botão", async () => {
		await mostrar();
		escolherEResponder(1, "Pode, pela iniciativa popular.");
		const botao = screen.getByRole("button", { name: "Recomeçar o quiz" });
		botao.focus();

		// O Enter e o espaço chegam ao botão como um clique com o detail 0.
		fireEvent.click(botao, { detail: 0 });

		expect(botao.textContent).toBe("Desfazer");
		expect(naTela("Você recomeçou o quiz.")).toBeTruthy();
		expect(document.activeElement).toBe(botao);

		fireEvent.click(botao, { detail: 0 });

		expect(botao.textContent).toBe("Recomeçar o quiz");
		expect(marcada("Pode, pela iniciativa popular.")).toBe(true);
		expect(document.activeElement).toBe(botao);
	});

	it("leva ao artigo de onde sai a resposta, para rever", async () => {
		await mostrar();

		expect(
			within(respostaDa(1))
				.getByRole("link", { name: "Artigo 1: Quem pode propor uma lei" })
				.getAttribute("href"),
		).toBe("/trilhas/processo-legislativo/quem-pode-propor-uma-lei");
	});

	it("chama as fontes de cada resposta pelo número delas", async () => {
		await mostrar();

		expect(within(respostaDa(1)).getByText("Fontes oficiais")).toBeTruthy();
		expect(within(respostaDa(2)).getByText("Fonte oficial")).toBeTruthy();
	});

	it("no rodapé, leva ao artigo anterior e, sem próximo artigo, de volta à trilha", async () => {
		await mostrar();
		const rodape = screen.getByRole("navigation", {
			name: "Artigos da trilha",
		});

		expect(
			within(rodape)
				.getAllByRole("link")
				.map((link) => [link.getAttribute("href"), link.textContent]),
		).toEqual([
			[
				"/trilhas/processo-legislativo/onde-o-projeto-comeca",
				"Artigo anteriorOnde o projeto começa",
			],
			[
				"/trilhas/processo-legislativo",
				"Fim da trilhaVoltar para Processo legislativo",
			],
		]);
	});

	it("no rodapé, leva ao próximo artigo quando a trilha continua", async () => {
		const proximo = artigo(
			"o-projeto-passa-pelas-comissoes",
			"O projeto passa pelas comissões",
			3,
		);
		await mostrar(<Quiz {...pagina} proximo={proximo} />);
		const rodape = screen.getByRole("navigation", {
			name: "Artigos da trilha",
		});

		expect(
			within(rodape)
				.getByRole("link", { name: /Próximo artigo/ })
				.getAttribute("href"),
		).toBe("/trilhas/processo-legislativo/o-projeto-passa-pelas-comissoes");
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
	});
});
