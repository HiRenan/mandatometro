// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type RespostasDoQuiz = typeof import("./respostas-do-quiz");

const CHAVE = "mandatometro:respostas-do-quiz";
const QUIZ = "processo-legislativo/quiz";
const ONDE_COMECA =
	"Uma senadora apresenta um projeto de lei. Por qual Casa do Congresso ele começa?";
const RECURSO = "O que pode levar esse projeto a ser votado pelo Plenário?";

let guardadas: RespostasDoQuiz;

beforeEach(async () => {
	localStorage.clear();
	vi.resetModules();
	guardadas = await import("./respostas-do-quiz");
});

afterEach(() => {
	vi.restoreAllMocks();
});

function guardado() {
	return JSON.parse(localStorage.getItem(CHAVE) ?? "null");
}

function Contador() {
	const respostas = guardadas.useRespostasDoQuiz(QUIZ);
	return <p>{`${Object.keys(respostas).length} respostas`}</p>;
}

function bloquearArmazenamento() {
	const bloqueado = () => {
		throw new DOMException("bloqueado", "SecurityError");
	};
	vi.spyOn(Storage.prototype, "getItem").mockImplementation(bloqueado);
	vi.spyOn(Storage.prototype, "setItem").mockImplementation(bloqueado);
}

describe("as respostas do quiz", () => {
	it("dá ao quiz da trilha o id que o navegador guarda", () => {
		expect(guardadas.idDoQuiz("processo-legislativo")).toBe(QUIZ);
	});

	it("começa sem nenhuma resposta", () => {
		expect(guardadas.lerRespostas(QUIZ)).toEqual({});
	});

	it("guarda só o enunciado e o texto da opção escolhida, numa tentativa", () => {
		guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal.");

		expect(guardado()).toEqual({
			[QUIZ]: {
				tentativas: [{ respostas: { [ONDE_COMECA]: "Pelo Senado Federal." } }],
			},
		});
		expect(guardadas.lerRespostas(QUIZ)).toEqual({
			[ONDE_COMECA]: "Pelo Senado Federal.",
		});
	});

	it("vale a última resposta de cada pergunta", () => {
		guardadas.responder(QUIZ, ONDE_COMECA, "Pela Câmara dos Deputados.");
		guardadas.responder(QUIZ, RECURSO, "Um recurso.");
		guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal.");

		expect(guardadas.lerRespostas(QUIZ)).toEqual({
			[ONDE_COMECA]: "Pelo Senado Federal.",
			[RECURSO]: "Um recurso.",
		});
	});

	it("separa as respostas de cada quiz", () => {
		guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal.");
		guardadas.responder("eleicoes/quiz", ONDE_COMECA, "Pela Câmara.");

		expect(guardadas.lerRespostas(QUIZ)).toEqual({
			[ONDE_COMECA]: "Pelo Senado Federal.",
		});
		expect(guardadas.lerRespostas("eleicoes/quiz")).toEqual({
			[ONDE_COMECA]: "Pela Câmara.",
		});
	});

	it("devolve o mesmo objeto enquanto nada muda", () => {
		guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal.");

		expect(guardadas.lerRespostas(QUIZ)).toBe(guardadas.lerRespostas(QUIZ));
		expect(guardadas.lerRespostas("outro/quiz")).toBe(
			guardadas.lerRespostas("outro/quiz"),
		);
	});

	it("ignora o que não for desse formato", () => {
		localStorage.setItem(CHAVE, "{quebrado");
		expect(guardadas.lerRespostas(QUIZ)).toEqual({});

		localStorage.setItem(CHAVE, JSON.stringify([QUIZ]));
		expect(guardadas.lerRespostas(QUIZ)).toEqual({});

		localStorage.setItem(
			CHAVE,
			JSON.stringify({ [QUIZ]: { tentativas: "nenhuma" } }),
		);
		expect(guardadas.lerRespostas(QUIZ)).toEqual({});

		localStorage.setItem(
			CHAVE,
			JSON.stringify({
				[QUIZ]: {
					tentativas: [
						{
							respostas: {
								[ONDE_COMECA]: "Pelo Senado Federal.",
								[RECURSO]: 3,
							},
						},
					],
				},
			}),
		);
		expect(guardadas.lerRespostas(QUIZ)).toEqual({
			[ONDE_COMECA]: "Pelo Senado Federal.",
		});
	});

	it("funciona sem erro com o armazenamento bloqueado e lembra a resposta até sair da página", () => {
		bloquearArmazenamento();

		expect(guardadas.lerRespostas(QUIZ)).toEqual({});
		expect(() =>
			guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal."),
		).not.toThrow();
		expect(guardadas.lerRespostas(QUIZ)).toEqual({
			[ONDE_COMECA]: "Pelo Senado Federal.",
		});
	});

	it("não mexe nos artigos lidos, e o Recomeçar a trilha não mexe nas respostas", async () => {
		const progresso = await import("./progresso");
		progresso.marcarLido("processo-legislativo/quem-pode-propor-uma-lei");
		guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal.");

		progresso.recomecarTrilha("processo-legislativo");

		expect(guardadas.lerRespostas(QUIZ)).toEqual({
			[ONDE_COMECA]: "Pelo Senado Federal.",
		});
	});
});

describe("recomeçar o quiz e desfazer", () => {
	it("recomeça numa tentativa nova e guarda a anterior", () => {
		guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal.");

		guardadas.recomecarQuiz(QUIZ);

		expect(guardadas.lerRespostas(QUIZ)).toEqual({});
		expect(guardado()[QUIZ].tentativas).toEqual([
			{ respostas: { [ONDE_COMECA]: "Pelo Senado Federal." } },
			{ respostas: {} },
		]);
	});

	it("não abre outra tentativa quando a última ainda não tem resposta", () => {
		guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal.");

		guardadas.recomecarQuiz(QUIZ);
		guardadas.recomecarQuiz(QUIZ);

		expect(guardado()[QUIZ].tentativas).toHaveLength(2);
	});

	it("desfaz o recomeço sem perder o que foi respondido depois", () => {
		guardadas.responder(QUIZ, ONDE_COMECA, "Pela Câmara dos Deputados.");
		guardadas.responder(QUIZ, RECURSO, "Um pedido do presidente.");
		guardadas.recomecarQuiz(QUIZ);
		guardadas.responder(QUIZ, RECURSO, "Um recurso.");

		guardadas.desfazerRecomeco(QUIZ);

		expect(guardadas.lerRespostas(QUIZ)).toEqual({
			[ONDE_COMECA]: "Pela Câmara dos Deputados.",
			[RECURSO]: "Um recurso.",
		});
		expect(guardado()[QUIZ].tentativas).toHaveLength(1);
	});

	it("não desfaz nada quando há uma tentativa só", () => {
		guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal.");

		guardadas.desfazerRecomeco(QUIZ);

		expect(guardado()[QUIZ].tentativas).toEqual([
			{ respostas: { [ONDE_COMECA]: "Pelo Senado Federal." } },
		]);
	});

	it("recomeça e desfaz com o armazenamento bloqueado", () => {
		bloquearArmazenamento();
		guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal.");

		guardadas.recomecarQuiz(QUIZ);
		expect(guardadas.lerRespostas(QUIZ)).toEqual({});

		guardadas.desfazerRecomeco(QUIZ);
		expect(guardadas.lerRespostas(QUIZ)).toEqual({
			[ONDE_COMECA]: "Pelo Senado Federal.",
		});
	});
});

describe("useRespostasDoQuiz", () => {
	it("no servidor, mostra o quiz sem respostas", () => {
		guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal.");

		expect(renderToString(<Contador />)).toContain("0 respostas");
	});

	it("hidrata sem erro e mostra as respostas depois", async () => {
		guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal.");
		const raiz = document.createElement("div");
		raiz.innerHTML = renderToString(<Contador />);
		document.body.append(raiz);
		const erros = vi.fn();
		const consoleErro = vi.spyOn(console, "error");

		await act(async () => {
			hydrateRoot(raiz, <Contador />, { onRecoverableError: erros });
		});

		expect(erros).not.toHaveBeenCalled();
		expect(consoleErro).not.toHaveBeenCalled();
		expect(raiz.textContent).toBe("1 respostas");
		raiz.remove();
	});

	it("atualiza quando a pessoa responde, recomeça e desfaz", () => {
		const { result } = renderHook(() => guardadas.useRespostasDoQuiz(QUIZ));
		expect(result.current).toEqual({});

		act(() => guardadas.responder(QUIZ, ONDE_COMECA, "Pelo Senado Federal."));
		expect(result.current).toEqual({ [ONDE_COMECA]: "Pelo Senado Federal." });

		act(() => guardadas.recomecarQuiz(QUIZ));
		expect(result.current).toEqual({});

		act(() => guardadas.desfazerRecomeco(QUIZ));
		expect(result.current).toEqual({ [ONDE_COMECA]: "Pelo Senado Federal." });
	});

	it("atualiza quando outra aba responde", () => {
		const { result } = renderHook(() => guardadas.useRespostasDoQuiz(QUIZ));

		act(() => {
			localStorage.setItem(
				CHAVE,
				JSON.stringify({
					[QUIZ]: {
						tentativas: [
							{ respostas: { [ONDE_COMECA]: "Pelo Senado Federal." } },
						],
					},
				}),
			);
			window.dispatchEvent(new StorageEvent("storage", { key: CHAVE }));
		});

		expect(result.current).toEqual({ [ONDE_COMECA]: "Pelo Senado Federal." });
	});
});
