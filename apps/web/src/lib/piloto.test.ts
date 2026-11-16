// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ModuloDoPiloto = typeof import("./piloto");
type ModuloDasRespostas = typeof import("./respostas-do-quiz");
type ModuloDoProgresso = typeof import("./progresso");

const CHAVE = "mandatometro:piloto";
const RESPOSTAS = "mandatometro:respostas-do-quiz";
const LIDOS = "mandatometro:artigos-lidos";
const QUIZ_FINAL = "processo-legislativo/quiz-final";
const UUID_V4 =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let piloto: ModuloDoPiloto;
let respostas: ModuloDasRespostas;
let progresso: ModuloDoProgresso;

beforeEach(async () => {
	localStorage.clear();
	vi.resetModules();
	piloto = await import("./piloto");
	respostas = await import("./respostas-do-quiz");
	progresso = await import("./progresso");
});

afterEach(() => {
	vi.restoreAllMocks();
});

function guardado() {
	return JSON.parse(localStorage.getItem(CHAVE) ?? "null");
}

function codigo(): string {
	const atual = piloto.lerPiloto();
	if (atual.fase !== "participando") {
		throw new Error(`o piloto devia estar participando, e está ${atual.fase}`);
	}
	return atual.participacao;
}

function bloquearArmazenamento() {
	const bloqueado = () => {
		throw new DOMException("bloqueado", "SecurityError");
	};
	vi.spyOn(Storage.prototype, "getItem").mockImplementation(bloqueado);
	vi.spyOn(Storage.prototype, "setItem").mockImplementation(bloqueado);
	vi.spyOn(Storage.prototype, "removeItem").mockImplementation(bloqueado);
}

describe("o piloto no navegador", () => {
	it("começa fora do piloto, sem nada guardado", () => {
		expect(piloto.lerPiloto()).toEqual({ fase: "fora" });
		expect(piloto.proximoPedido()).toBeUndefined();
	});

	it("ao começar, sorteia um UUIDv4 e guarda só ele, a versão e as etapas", () => {
		piloto.comecarPiloto();

		expect(codigo()).toMatch(UUID_V4);
		expect(guardado()).toEqual({
			versao: "processo-legislativo-final-v1",
			fase: "participando",
			participacao: codigo(),
			antes: { situacao: "respondendo" },
			depois: { situacao: "respondendo" },
		});
	});

	// O randomUUID só existe em página segura (HTTPS ou localhost), e o
	// getRandomValues, em qualquer uma.
	it("sem o randomUUID, sorteia o UUIDv4 pelo getRandomValues", () => {
		const original = globalThis.crypto;
		vi.stubGlobal("crypto", {
			getRandomValues: original.getRandomValues.bind(original),
		});
		try {
			piloto.comecarPiloto();
			expect(codigo()).toMatch(UUID_V4);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("não troca o código quando o navegador já participa, como num segundo Começar em outra aba", () => {
		piloto.comecarPiloto();
		const primeiro = codigo();

		piloto.comecarPiloto();

		expect(codigo()).toBe(primeiro);
	});

	it("ao começar, apaga as respostas guardadas do antes e abre uma tentativa nova no quiz final", () => {
		respostas.responder(piloto.QUIZ_DO_ANTES, "Uma pergunta?", "Uma opção.");
		respostas.responder(QUIZ_FINAL, "Uma pergunta?", "Outra opção.");
		respostas.responder("processo-legislativo/quiz", "Outra pergunta?", "Sim.");

		piloto.comecarPiloto();

		expect(respostas.lerRespostas(piloto.QUIZ_DO_ANTES)).toEqual({});
		expect(respostas.lerRespostas(QUIZ_FINAL)).toEqual({});
		// O quiz da trilha não entra no piloto e fica como estava.
		expect(respostas.lerRespostas("processo-legislativo/quiz")).toEqual({
			"Outra pergunta?": "Sim.",
		});
	});

	it("guarda a etapa concluída com os acertos e monta o pedido com exatamente os quatro campos", () => {
		piloto.comecarPiloto();

		expect(piloto.concluirEtapa("antes", 7)).toBe(true);

		expect(piloto.lerPiloto()).toMatchObject({
			antes: { situacao: "pendente", acertos: 7 },
		});
		expect(piloto.proximoPedido()).toEqual({
			participacao: codigo(),
			versao_quiz: "processo-legislativo-final-v1",
			etapa: "antes",
			acertos: 7,
		});
	});

	it("vale a primeira conclusão de cada etapa", () => {
		piloto.comecarPiloto();
		piloto.concluirEtapa("antes", 7);

		expect(piloto.concluirEtapa("antes", 12)).toBe(false);
		expect(piloto.proximoPedido()?.acertos).toBe(7);
	});

	it("ao concluir o antes, abre uma tentativa nova no quiz final, para o depois começar do zero", () => {
		piloto.comecarPiloto();
		respostas.responder(QUIZ_FINAL, "Uma pergunta?", "Uma opção.");

		piloto.concluirEtapa("antes", 3);

		expect(respostas.lerRespostas(QUIZ_FINAL)).toEqual({});
	});

	it("não conclui o depois antes do antes, nem fora do piloto", () => {
		expect(piloto.concluirEtapa("depois", 5)).toBe(false);
		piloto.comecarPiloto();

		expect(piloto.concluirEtapa("depois", 5)).toBe(false);
		expect(piloto.lerPiloto()).toMatchObject({
			depois: { situacao: "respondendo" },
		});
	});

	it("manda o antes antes do depois, e o depois com o mesmo código", () => {
		piloto.comecarPiloto();
		piloto.concluirEtapa("antes", 4);
		piloto.concluirEtapa("depois", 9);

		expect(piloto.proximoPedido()?.etapa).toBe("antes");
		piloto.registrarResposta(
			piloto.proximoPedido() as NonNullable<
				ReturnType<typeof piloto.proximoPedido>
			>,
			"recebida",
		);

		expect(piloto.proximoPedido()).toEqual({
			participacao: codigo(),
			versao_quiz: "processo-legislativo-final-v1",
			etapa: "depois",
			acertos: 9,
		});
	});

	it("com o depois recebido, apaga o código e os pedidos, e guarda só que o navegador participou", () => {
		piloto.comecarPiloto();
		piloto.concluirEtapa("antes", 4);
		piloto.registrarResposta(
			piloto.proximoPedido() as NonNullable<
				ReturnType<typeof piloto.proximoPedido>
			>,
			"recebida",
		);
		piloto.concluirEtapa("depois", 9);
		const depois = piloto.proximoPedido();

		piloto.registrarResposta(depois as NonNullable<typeof depois>, "recebida");

		expect(guardado()).toEqual({
			versao: "processo-legislativo-final-v1",
			fase: "concluido",
		});
		expect(JSON.stringify(guardado())).not.toContain(depois?.participacao);
	});

	it("com o piloto encerrado (410), apaga o código e os pedidos", () => {
		piloto.comecarPiloto();
		piloto.concluirEtapa("antes", 4);
		const antes = piloto.proximoPedido();

		piloto.registrarResposta(antes as NonNullable<typeof antes>, "encerrado");

		expect(guardado()).toEqual({
			versao: "processo-legislativo-final-v1",
			fase: "encerrado",
		});
		expect(piloto.proximoPedido()).toBeUndefined();
	});

	it("com o pedido recusado (413 ou 422), não manda a etapa de novo, e o depois ainda vale", () => {
		piloto.comecarPiloto();
		piloto.concluirEtapa("antes", 4);
		const antes = piloto.proximoPedido();

		piloto.registrarResposta(antes as NonNullable<typeof antes>, "recusado");

		expect(piloto.lerPiloto()).toMatchObject({
			fase: "participando",
			antes: { situacao: "perdida" },
		});
		expect(piloto.proximoPedido()).toBeUndefined();
		expect(piloto.concluirEtapa("depois", 8)).toBe(true);
	});

	it("ignora a resposta de um pedido que não é mais o guardado, como o de outra pessoa", () => {
		piloto.comecarPiloto();
		piloto.concluirEtapa("antes", 4);
		const daPessoaAnterior = piloto.proximoPedido();
		piloto.comecarComoOutraPessoa();
		piloto.comecarPiloto();
		// Os mesmos acertos: só o código separa as duas pessoas.
		piloto.concluirEtapa("antes", 4);

		piloto.registrarResposta(
			daPessoaAnterior as NonNullable<typeof daPessoaAnterior>,
			"encerrado",
		);

		expect(piloto.lerPiloto()).toMatchObject({
			fase: "participando",
			antes: { situacao: "pendente", acertos: 4 },
		});
	});

	it("ignora a resposta de um pedido com outros acertos, como o de outra aba que recomeçou", () => {
		piloto.comecarPiloto();
		piloto.concluirEtapa("antes", 4);
		const pedido = piloto.proximoPedido();

		piloto.registrarResposta(
			{ ...(pedido as NonNullable<typeof pedido>), acertos: 5 },
			"encerrado",
		);

		expect(piloto.lerPiloto()).toMatchObject({
			antes: { situacao: "pendente", acertos: 4 },
		});
	});

	it("ignora o que não for desse formato ou de outra versão", () => {
		for (const bruto of [
			"não é JSON",
			"[]",
			JSON.stringify({ versao: "outra-versao", fase: "concluido" }),
			JSON.stringify({
				versao: "processo-legislativo-final-v1",
				fase: "participando",
				participacao: "nao-e-um-uuid",
				antes: { situacao: "respondendo" },
				depois: { situacao: "respondendo" },
			}),
			JSON.stringify({
				versao: "processo-legislativo-final-v1",
				fase: "participando",
				participacao: "b9d2fdc3-c198-433b-836d-b381de5a49d9",
				antes: { situacao: "pendente", acertos: 13 },
				depois: { situacao: "respondendo" },
			}),
		]) {
			localStorage.setItem(CHAVE, bruto);
			expect(piloto.lerPiloto(), bruto).toEqual({ fase: "fora" });
		}
	});

	it("devolve o mesmo objeto enquanto nada muda", () => {
		piloto.comecarPiloto();

		expect(piloto.lerPiloto()).toBe(piloto.lerPiloto());
	});

	it("funciona com o armazenamento bloqueado e lembra o piloto até sair da página", () => {
		bloquearArmazenamento();

		piloto.comecarPiloto();
		piloto.concluirEtapa("antes", 6);

		expect(piloto.proximoPedido()?.acertos).toBe(6);
	});
});

describe("começar como outra pessoa", () => {
	it("apaga os artigos lidos, as respostas dos quizzes, o histórico deles e o piloto", () => {
		progresso.marcarLido("processo-legislativo/quem-pode-propor-uma-lei");
		respostas.responder("processo-legislativo/quiz", "Uma?", "Sim.");
		respostas.recomecarQuiz("processo-legislativo/quiz");
		respostas.responder(QUIZ_FINAL, "Outra?", "Não.");
		piloto.comecarPiloto();
		piloto.concluirEtapa("antes", 2);

		piloto.comecarComoOutraPessoa();

		expect(localStorage.getItem(CHAVE)).toBeNull();
		expect(localStorage.getItem(RESPOSTAS)).toBeNull();
		expect(localStorage.getItem(LIDOS)).toBeNull();
		expect(piloto.lerPiloto()).toEqual({ fase: "fora" });
		expect(progresso.lerLidos().size).toBe(0);
		expect(respostas.lerRespostas(QUIZ_FINAL)).toEqual({});
		// Sem o histórico, o Desfazer do recomeço não traz nada de volta.
		respostas.desfazerRecomeco("processo-legislativo/quiz");
		expect(respostas.lerRespostas("processo-legislativo/quiz")).toEqual({});
	});

	it("apaga também o que só estava na memória, com o armazenamento bloqueado", () => {
		bloquearArmazenamento();
		progresso.marcarLido("processo-legislativo/quem-pode-propor-uma-lei");
		piloto.comecarPiloto();
		// Depois do Começar, que já abre uma tentativa nova no quiz final.
		respostas.responder(QUIZ_FINAL, "Outra?", "Não.");
		respostas.responder("processo-legislativo/quiz", "Uma?", "Sim.");

		piloto.comecarComoOutraPessoa();

		expect(piloto.lerPiloto()).toEqual({ fase: "fora" });
		expect(progresso.lerLidos().size).toBe(0);
		expect(respostas.lerRespostas(QUIZ_FINAL)).toEqual({});
		expect(respostas.lerRespostas("processo-legislativo/quiz")).toEqual({});
	});

	it("depois de apagar, o próximo Começar sorteia outro código", () => {
		piloto.comecarPiloto();
		const anterior = codigo();

		piloto.comecarComoOutraPessoa();
		piloto.comecarPiloto();

		expect(codigo()).not.toBe(anterior);
	});
});

describe("o usePiloto", () => {
	it("atualiza quando a pessoa começa e quando outra aba apaga tudo", () => {
		const { result } = renderHook(() => piloto.usePiloto());
		expect(result.current).toEqual({ fase: "fora" });

		act(() => piloto.comecarPiloto());
		expect(result.current.fase).toBe("participando");

		// Outra aba apagou tudo: o navegador avisa as outras com a chave apagada.
		act(() => {
			localStorage.clear();
			window.dispatchEvent(new StorageEvent("storage", { key: null }));
		});
		expect(result.current).toEqual({ fase: "fora" });
	});

	it("atualiza quando outra aba conclui uma etapa", () => {
		piloto.comecarPiloto();
		const { result } = renderHook(() => piloto.usePiloto());

		act(() => {
			localStorage.setItem(
				CHAVE,
				JSON.stringify({ ...guardado(), antes: { situacao: "recebida" } }),
			);
			window.dispatchEvent(new StorageEvent("storage", { key: CHAVE }));
		});

		expect(result.current).toMatchObject({ antes: { situacao: "recebida" } });
	});
});
