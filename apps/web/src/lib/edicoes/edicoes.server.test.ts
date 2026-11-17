import { isNotFound } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	ERRO_DAS_EDICOES,
	lerEdicao,
	lerEdicoes,
	TEMPO_DE_ESPERA,
} from "./edicoes.server";
import { edicaoDeExemplo, listaDeExemplo } from "./exemplos-de-teste";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site. Aqui, a API é um endereço de mentira, que cada teste pode
// apagar, e o fetch é simulado, como no newsletter.test.ts.
const ambiente = vi.hoisted(() => ({ API_URL: "https://api.exemplo.test" }));
vi.mock("@/env", () => ({ ENV: ambiente }));

/** O que uma falha da API pode trazer e não pode chegar ao navegador. */
const SEGREDOS = ["10.0.0.5", "SELECT", "fulano@example.com"];
const MENSAGEM_DA_FALHA =
	"connect ECONNREFUSED http://10.0.0.5:8000/edicoes: SELECT email FROM inscrito WHERE email = 'fulano@example.com'";

let erros: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	ambiente.API_URL = "https://api.exemplo.test";
	erros = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

/** Simula a API: cada pedido recebe a resposta de `responder`, e o pedido fica guardado. */
function api(responder: (pedido: Request) => Response | Promise<Response>) {
	const pedidos: Request[] = [];
	const fetch = vi.fn(async (pedido: Request) => {
		pedidos.push(pedido);
		return responder(pedido);
	});
	vi.stubGlobal("fetch", fetch);
	return { fetch, pedidos };
}

function json(status: number, corpo: unknown) {
	return new Response(JSON.stringify(corpo), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

/** O erro com que a promessa termina, para conferir o que ele leva. */
async function erroDe(promessa: Promise<unknown>): Promise<unknown> {
	try {
		await promessa;
	} catch (erro) {
		return erro;
	}
	throw new Error("a promessa terminou sem erro");
}

/** Confere o erro genérico: a mensagem fixa, sem nada da falha, nem no log. */
function confereErroGenerico(erro: unknown) {
	expect(erro).toBeInstanceOf(Error);
	expect((erro as Error).message).toBe(ERRO_DAS_EDICOES);
	expect(erros).toHaveBeenCalled();
	const registrado = JSON.stringify(erros.mock.calls);
	for (const segredo of SEGREDOS) {
		expect((erro as Error).message).not.toContain(segredo);
		expect(registrado, "o log do servidor").not.toContain(segredo);
	}
}

describe("sem o API_URL", () => {
	it("a lista e a edição dizem que não há edições neste endereço, sem chamar a API", async () => {
		ambiente.API_URL = "";
		const { fetch } = api(() => json(200, listaDeExemplo(3)));

		expect(await lerEdicoes(1)).toEqual({ tipo: "sem-api" });
		expect(await lerEdicao("7")).toEqual({ tipo: "sem-api" });
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe("a lista das edições", () => {
	it("a primeira página pede as vinte mais novas, e a segunda começa na vigésima primeira", async () => {
		const { pedidos } = api((pedido) => {
			const deslocamento = Number(
				new URL(pedido.url).searchParams.get("deslocamento"),
			);
			return json(200, listaDeExemplo(45, { deslocamento }));
		});

		const primeira = await lerEdicoes(1);
		const segunda = await lerEdicoes(2);

		expect(pedidos.map((pedido) => new URL(pedido.url).search)).toEqual([
			"?limite=20&deslocamento=0",
			"?limite=20&deslocamento=20",
		]);
		expect(
			pedidos.every((pedido) => pedido.signal instanceof AbortSignal),
		).toBe(true);
		expect(primeira).toMatchObject({
			tipo: "lista",
			total: 45,
			pagina: 1,
			paginas: 3,
		});
		expect(segunda).toMatchObject({
			tipo: "lista",
			total: 45,
			pagina: 2,
			paginas: 3,
		});
		if (segunda.tipo === "lista") {
			expect(segunda.edicoes).toHaveLength(20);
			expect(segunda.edicoes[0].id).toBe(25);
		}
	});

	it("sem edição publicada, a primeira página volta vazia", async () => {
		api(() => json(200, listaDeExemplo(0)));

		expect(await lerEdicoes(1)).toEqual({
			tipo: "lista",
			edicoes: [],
			total: 0,
			pagina: 1,
			paginas: 1,
		});
	});

	it("a página depois da última não existe", async () => {
		api((pedido) => {
			const deslocamento = Number(
				new URL(pedido.url).searchParams.get("deslocamento"),
			);
			return json(200, listaDeExemplo(21, { deslocamento }));
		});

		expect(await lerEdicoes(2)).toMatchObject({ tipo: "lista", paginas: 2 });
		expect(isNotFound(await erroDe(lerEdicoes(3)))).toBe(true);
	});

	it("a página que a API recusa (422) dá a página não encontrada, sem registrar falha", async () => {
		// O site confere o ?pagina antes de pedir, e o 422 fica como defesa, como
		// na edição: um pedido que a API não aceita não é a API fora do ar.
		api(() => json(422, { erro: "dados_invalidos" }));

		expect(isNotFound(await erroDe(lerEdicoes(1)))).toBe(true);
		expect(erros).not.toHaveBeenCalled();
	});

	it("a API fora do ar não leva a mensagem dela ao navegador nem ao log", async () => {
		api(() => {
			throw new TypeError(MENSAGEM_DA_FALHA);
		});

		confereErroGenerico(await erroDe(lerEdicoes(1)));
	});

	it("a resposta sem a forma de uma lista também dá o erro genérico", async () => {
		api(() => json(200, { pagina: "nada" }));

		confereErroGenerico(await erroDe(lerEdicoes(1)));
	});
});

describe("uma edição", () => {
	it("a edição publicada volta inteira", async () => {
		const { pedidos } = api(() => json(200, edicaoDeExemplo()));

		expect(await lerEdicao("7")).toEqual({
			tipo: "edicao",
			edicao: edicaoDeExemplo(),
		});
		expect(new URL(pedidos[0].url).pathname).toBe("/edicoes/7");
	});

	it("o rascunho e a edição que não existe dão a página não encontrada", async () => {
		for (const status of [404, 422]) {
			api(() => json(status, { erro: "edicao_nao_encontrada" }));

			expect(isNotFound(await erroDe(lerEdicao("7"))), String(status)).toBe(
				true,
			);
		}
		expect(erros).not.toHaveBeenCalled();
	});

	it("um id que não pode ser de uma edição nem chega à API", async () => {
		const { fetch } = api(() => json(200, edicaoDeExemplo()));

		for (const id of [
			"abc",
			"0",
			"-1",
			"1.5",
			"07",
			"99999999999",
			"",
			undefined,
		]) {
			expect(isNotFound(await erroDe(lerEdicao(id))), String(id)).toBe(true);
		}
		expect(fetch).not.toHaveBeenCalled();
	});

	it("a API fora do ar não leva a mensagem dela ao navegador nem ao log", async () => {
		api(() => {
			throw new TypeError(MENSAGEM_DA_FALHA);
		});

		confereErroGenerico(await erroDe(lerEdicao("7")));
	});

	it("o erro da API (503) também fica no servidor, sem o corpo da resposta", async () => {
		api(() =>
			json(503, { erro: "servico_indisponivel", detalhe: MENSAGEM_DA_FALHA }),
		);

		const erro = await erroDe(lerEdicao("7"));

		confereErroGenerico(erro);
		expect(JSON.stringify(erros.mock.calls)).toContain("http-503");
	});

	it("a resposta sem a forma de uma edição também dá o erro genérico", async () => {
		api(() => json(200, { titulo: "sem os itens" }));

		confereErroGenerico(await erroDe(lerEdicao("7")));
	});

	it("a API lenta: o servidor desiste depois do tempo de espera", async () => {
		vi.useFakeTimers();
		const { pedidos } = api(
			(pedido) =>
				new Promise((_, recusar) => {
					pedido.signal.addEventListener("abort", () =>
						recusar(pedido.signal.reason),
					);
				}),
		);
		let terminou = false;
		const leitura = lerEdicao("7").finally(() => {
			terminou = true;
		});
		const erro = erroDe(leitura);

		await vi.advanceTimersByTimeAsync(TEMPO_DE_ESPERA - 1);
		expect(terminou).toBe(false);
		await vi.advanceTimersByTimeAsync(1);

		confereErroGenerico(await erro);
		expect(pedidos[0].signal.aborted).toBe(true);
		expect(TEMPO_DE_ESPERA).toBe(8_000);
	});
});
