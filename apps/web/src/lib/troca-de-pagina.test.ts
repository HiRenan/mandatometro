// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
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

	it("a página não encontrada fica no fundo do bloco", () => {
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

	it("não anima a primeira carga nem um link para um trecho da mesma página", () => {
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
