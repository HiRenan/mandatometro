// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	cliqueDuranteATroca,
	molduraNaTela,
	sentidoDaTroca,
	tiposDaTroca,
	trilhaDaPaginaAberta,
} from "./troca-de-pagina";

const TRILHA = "/trilhas/processo-legislativo";
const trilhaAberta = {
	slug: "processo-legislativo",
	artigos: [
		{ slug: "quem-pode-propor-uma-lei" },
		{ slug: "onde-o-projeto-comeca" },
		{ slug: "o-projeto-passa-pelas-comissoes" },
	],
};

afterEach(() => {
	document.body.innerHTML = "";
});

describe("sentidoDaTroca", () => {
	it("avança quando a página fica mais para dentro do bloco", () => {
		expect(sentidoDaTroca("/", "/trilhas")).toBe("avancar");
		expect(sentidoDaTroca("/trilhas", TRILHA)).toBe("avancar");
		expect(sentidoDaTroca(TRILHA, `${TRILHA}/onde-o-projeto-comeca`)).toBe(
			"avancar",
		);
		// "Começar a trilha", na página inicial.
		expect(sentidoDaTroca("/", `${TRILHA}/quem-pode-propor-uma-lei`)).toBe(
			"avancar",
		);
	});

	it("volta quando a página fica mais para fora do bloco", () => {
		expect(sentidoDaTroca(`${TRILHA}/onde-o-projeto-comeca`, TRILHA)).toBe(
			"voltar",
		);
		expect(sentidoDaTroca(`${TRILHA}/onde-o-projeto-comeca`, "/")).toBe(
			"voltar",
		);
		expect(sentidoDaTroca(TRILHA, "/trilhas")).toBe("voltar");
		expect(sentidoDaTroca("/trilhas/", "/")).toBe("voltar");
	});

	it("entre dois artigos da trilha, segue a ordem dela", () => {
		const de = `${TRILHA}/onde-o-projeto-comeca`;
		expect(
			sentidoDaTroca(
				de,
				`${TRILHA}/o-projeto-passa-pelas-comissoes`,
				trilhaAberta,
			),
		).toBe("avancar");
		expect(
			sentidoDaTroca(de, `${TRILHA}/quem-pode-propor-uma-lei`, trilhaAberta),
		).toBe("voltar");
	});

	it("sem a ordem da trilha, ou com um artigo que não está nela, avança", () => {
		const de = `${TRILHA}/onde-o-projeto-comeca`;
		const para = `${TRILHA}/quem-pode-propor-uma-lei`;
		expect(sentidoDaTroca(de, para)).toBe("avancar");
		expect(
			sentidoDaTroca(de, `${TRILHA}/artigo-que-nao-existe`, trilhaAberta),
		).toBe("avancar");
		expect(
			sentidoDaTroca(
				"/trilhas/tres-poderes/o-que-faz-o-executivo",
				"/trilhas/tres-poderes/o-que-faz-o-legislativo",
				trilhaAberta,
			),
		).toBe("avancar");
	});

	it("o quiz fica entre o artigo depois do qual aparece e o seguinte", () => {
		const comQuiz = { ...trilhaAberta, quizDepoisDe: "onde-o-projeto-comeca" };
		const quiz = `${TRILHA}/quiz`;
		// O "Artigo anterior" do quiz, e qualquer artigo de antes dele.
		expect(
			sentidoDaTroca(quiz, `${TRILHA}/onde-o-projeto-comeca`, comQuiz),
		).toBe("voltar");
		expect(
			sentidoDaTroca(quiz, `${TRILHA}/quem-pode-propor-uma-lei`, comQuiz),
		).toBe("voltar");
		// O "Próximo artigo" do quiz.
		expect(
			sentidoDaTroca(
				quiz,
				`${TRILHA}/o-projeto-passa-pelas-comissoes`,
				comQuiz,
			),
		).toBe("avancar");
		// A chamada do quiz, no fim do artigo, e o voltar do navegador num artigo
		// de depois dele.
		expect(
			sentidoDaTroca(`${TRILHA}/onde-o-projeto-comeca`, quiz, comQuiz),
		).toBe("avancar");
		expect(
			sentidoDaTroca(
				`${TRILHA}/o-projeto-passa-pelas-comissoes`,
				quiz,
				comQuiz,
			),
		).toBe("voltar");
	});

	it("sem o lugar do quiz na trilha, ir ao quiz ou sair dele para um artigo avança", () => {
		const quiz = `${TRILHA}/quiz`;
		expect(
			sentidoDaTroca(quiz, `${TRILHA}/onde-o-projeto-comeca`, trilhaAberta),
		).toBe("avancar");
		expect(
			sentidoDaTroca(`${TRILHA}/onde-o-projeto-comeca`, quiz, trilhaAberta),
		).toBe("avancar");
		expect(
			sentidoDaTroca(quiz, `${TRILHA}/onde-o-projeto-comeca`, {
				...trilhaAberta,
				quizDepoisDe: "artigo-que-nao-existe",
			}),
		).toBe("avancar");
	});

	it("do quiz para a trilha é voltar, e da trilha para o quiz, avançar", () => {
		expect(sentidoDaTroca(`${TRILHA}/quiz`, TRILHA)).toBe("voltar");
		expect(sentidoDaTroca(TRILHA, `${TRILHA}/quiz`)).toBe("avancar");
	});

	it("a página não encontrada fica no fundo do bloco", () => {
		expect(sentidoDaTroca(TRILHA, "/pagina-que-nao-existe")).toBe("avancar");
		expect(sentidoDaTroca("/pagina-que-nao-existe", "/")).toBe("voltar");
	});
});

describe("tiposDaTroca", () => {
	const troca = (de: string | undefined, para: string) => ({
		fromLocation: de === undefined ? undefined : { pathname: de },
		toLocation: { pathname: para },
		pathChanged: de !== para,
	});

	it("diz que é uma troca de folha, e o sentido dela", () => {
		expect(
			tiposDaTroca(troca("/", "/trilhas"), { molduraNaTela: false }),
		).toEqual(["folha", "avancar"]);
		expect(
			tiposDaTroca(troca(TRILHA, "/trilhas"), { molduraNaTela: false }),
		).toEqual(["folha", "voltar"]);
	});

	it("avisa quando o cabeçalho está na tela, para ele ficar parado", () => {
		expect(
			tiposDaTroca(troca("/", "/trilhas"), { molduraNaTela: true }),
		).toEqual(["folha", "avancar", "moldura-na-tela"]);
	});

	it("usa a ordem da trilha aberta entre dois artigos", () => {
		expect(
			tiposDaTroca(
				troca(
					`${TRILHA}/o-projeto-passa-pelas-comissoes`,
					`${TRILHA}/onde-o-projeto-comeca`,
				),
				{ trilhaAberta, molduraNaTela: false },
			),
		).toEqual(["folha", "voltar"]);
	});

	it("usa o lugar do quiz na trilha aberta", () => {
		expect(
			tiposDaTroca(troca(`${TRILHA}/quiz`, `${TRILHA}/onde-o-projeto-comeca`), {
				trilhaAberta: {
					...trilhaAberta,
					quizDepoisDe: "onde-o-projeto-comeca",
				},
				molduraNaTela: false,
			}),
		).toEqual(["folha", "voltar"]);
	});

	it("não anima a primeira carga nem um link para um trecho da mesma página", () => {
		expect(tiposDaTroca(troca(undefined, "/"), { molduraNaTela: true })).toBe(
			false,
		);
		expect(tiposDaTroca(troca(TRILHA, TRILHA), { molduraNaTela: true })).toBe(
			false,
		);
	});
});

describe("trilhaDaPaginaAberta", () => {
	it("pega a trilha dos dados do artigo que está na tela", () => {
		expect(
			trilhaDaPaginaAberta([
				{ routeId: "__root__", loaderData: undefined },
				{
					routeId: "/trilhas/$trilha/$artigo",
					loaderData: { trilha: trilhaAberta, posicao: 2 },
				},
			]),
		).toBe(trilhaAberta);
	});

	it("pega a trilha dos dados do quiz que está na tela", () => {
		const comQuiz = { ...trilhaAberta, quizDepoisDe: "onde-o-projeto-comeca" };
		expect(
			trilhaDaPaginaAberta([
				{ routeId: "__root__", loaderData: undefined },
				{
					routeId: "/trilhas/$trilha/quiz",
					loaderData: { trilha: comQuiz, perguntas: [] },
				},
			]),
		).toBe(comQuiz);
	});

	it("fora de um artigo e do quiz, não há trilha aberta", () => {
		expect(
			trilhaDaPaginaAberta([
				{ routeId: "__root__" },
				{ routeId: "/trilhas/$trilha/", loaderData: { slug: "x" } },
			]),
		).toBeUndefined();
	});
});

describe("molduraNaTela", () => {
	function cabecalho(embaixo: number) {
		document.body.innerHTML = `<header class="moldura"></header><footer class="moldura"></footer>`;
		const moldura = document.querySelector("header.moldura");
		if (!moldura) {
			throw new Error("sem o cabeçalho");
		}
		moldura.getBoundingClientRect = () => ({ bottom: embaixo }) as DOMRect;
	}

	it("é verdade quando um pedaço do cabeçalho aparece na tela", () => {
		cabecalho(114);
		expect(molduraNaTela()).toBe(true);
		cabecalho(3);
		expect(molduraNaTela()).toBe(true);
	});

	it("é mentira com a página rolada para baixo dele, ou sem cabeçalho", () => {
		cabecalho(-20);
		expect(molduraNaTela()).toBe(false);
		document.body.innerHTML = `<footer class="moldura"></footer>`;
		expect(molduraNaTela()).toBe(false);
	});
});

describe("cliqueDuranteATroca", () => {
	let desligar: (() => void) | undefined;

	afterEach(() => {
		desligar?.();
		desligar = undefined;
		Reflect.deleteProperty(document, "activeViewTransition");
		Reflect.deleteProperty(document, "elementFromPoint");
	});

	/**
	 * Uma página com um botão embaixo do ponteiro e, se pedido, uma troca
	 * rodando. O jsdom não tem o activeViewTransition nem o elementFromPoint.
	 */
	function pagina({ trocando }: { trocando: boolean }) {
		document.body.innerHTML = "<button>Começar</button>";
		const botao = document.querySelector("button");
		if (!botao) {
			throw new Error("sem o botão");
		}
		const cliques: MouseEvent[] = [];
		botao.addEventListener("click", (evento) => cliques.push(evento));
		const troca = { skipTransition: vi.fn() };
		Object.defineProperty(document, "activeViewTransition", {
			configurable: true,
			get: () => (trocando ? troca : null),
		});
		Object.defineProperty(document, "elementFromPoint", {
			configurable: true,
			value: () => botao,
		});
		desligar = cliqueDuranteATroca();
		return { botao, cliques, troca };
	}

	// Durante a troca, o navegador entrega o toque e o clique ao documento.
	function tocar() {
		document.documentElement.dispatchEvent(
			new Event("pointerdown", { bubbles: true }),
		);
	}

	function clicar(alvo: Element, detail: number) {
		alvo.dispatchEvent(
			new MouseEvent("click", {
				bubbles: true,
				detail,
				clientX: 120,
				clientY: 340,
			}),
		);
	}

	it("no toque, encerra a troca, e o clique segue para o que está embaixo do ponteiro", () => {
		const { cliques, troca } = pagina({ trocando: true });

		tocar();
		clicar(document.documentElement, 1);

		expect(troca.skipTransition).toHaveBeenCalledTimes(1);
		expect(
			cliques.map(({ detail, clientX, clientY }) => [detail, clientX, clientY]),
		).toEqual([[1, 120, 340]]);
	});

	it("deixa de fora o segundo clique de um clique duplo", () => {
		const { cliques, troca } = pagina({ trocando: true });

		tocar();
		clicar(document.documentElement, 2);

		expect(troca.skipTransition).toHaveBeenCalledTimes(1);
		expect(cliques).toHaveLength(0);
	});

	it("sem troca rodando, não mexe no clique", () => {
		const { cliques, troca } = pagina({ trocando: false });

		tocar();
		clicar(document.documentElement, 1);

		expect(troca.skipTransition).not.toHaveBeenCalled();
		expect(cliques).toHaveLength(0);
	});

	it("não repete o clique que já chegou a uma peça da página", () => {
		const { botao, cliques } = pagina({ trocando: true });

		tocar();
		clicar(botao, 1);

		expect(cliques).toHaveLength(1);
	});

	it("vale para um clique só: o seguinte, sem toque durante a troca, não segue", () => {
		const { cliques } = pagina({ trocando: true });

		tocar();
		clicar(document.documentElement, 1);
		clicar(document.documentElement, 1);

		expect(cliques).toHaveLength(1);
	});

	it("num navegador sem o activeViewTransition, não faz nada", () => {
		const { cliques } = pagina({ trocando: false });
		Reflect.deleteProperty(document, "activeViewTransition");

		expect(tocar).not.toThrow();
		clicar(document.documentElement, 1);

		expect(cliques).toHaveLength(0);
	});

	it("desligado, não encerra a troca nem manda o clique", () => {
		const { cliques, troca } = pagina({ trocando: true });
		desligar?.();

		tocar();
		clicar(document.documentElement, 1);

		expect(troca.skipTransition).not.toHaveBeenCalled();
		expect(cliques).toHaveLength(0);
	});
});
