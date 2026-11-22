import { isNotFound } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEMPO_DE_ESPERA } from "@/lib/edicoes/edicoes.server";
import {
	detalheDeExemplo,
	listaDeExemplo,
	votacaoDeExemplo,
	votosDeExemplo,
} from "./exemplos-de-teste";
import {
	ERRO_DOS_PARLAMENTARES,
	lerParlamentar,
	lerParlamentares,
	lerVotacao,
} from "./parlamentares.server";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site. Aqui, a API é um endereço de mentira, que cada teste pode
// apagar, e o fetch é simulado, como no edicoes.server.test.ts.
const ambiente = vi.hoisted(() => ({ API_URL: "https://api.exemplo.test" }));
vi.mock("@/env", () => ({ ENV: ambiente }));

/** O que uma falha da API pode trazer e não pode chegar ao navegador. */
const SEGREDOS = ["10.0.0.5", "SELECT", "fulano@example.com"];
const MENSAGEM_DA_FALHA =
	"connect ECONNREFUSED http://10.0.0.5:8000/parlamentares: SELECT email FROM conta WHERE email = 'fulano@example.com'";

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

/** A API de um parlamentar: o detalhe e a página de votos pedida, de `total` votos. */
function apiDoParlamentar(total: number) {
	return api((pedido) => {
		const endereco = new URL(pedido.url);
		if (endereco.pathname.endsWith("/votos")) {
			const deslocamento = Number(endereco.searchParams.get("deslocamento"));
			return json(200, votosDeExemplo(total, deslocamento));
		}
		return json(200, detalheDeExemplo());
	});
}

async function erroDe(promessa: Promise<unknown>): Promise<unknown> {
	try {
		await promessa;
	} catch (erro) {
		return erro;
	}
	throw new Error("a promessa terminou sem erro");
}

/** Confere o erro genérico: a mensagem fixa, a linha fixa no log e nada da falha. */
function confereErroGenerico(erro: unknown, motivo: string) {
	expect(erro).toBeInstanceOf(Error);
	expect((erro as Error).message).toBe(ERRO_DOS_PARLAMENTARES);
	expect(erros.mock.calls).toContainEqual([
		`[parlamentares] A leitura na API falhou: ${motivo}.`,
	]);
	const registrado = JSON.stringify(erros.mock.calls);
	for (const segredo of SEGREDOS) {
		expect((erro as Error).message).not.toContain(segredo);
		expect(registrado, "o log do servidor").not.toContain(segredo);
	}
}

describe("sem o API_URL", () => {
	it("as três páginas dizem que não há parlamentares neste endereço, sem chamar a API", async () => {
		ambiente.API_URL = "";
		const { fetch } = api(() => json(200, listaDeExemplo()));

		expect(await lerParlamentares("SC")).toEqual({ tipo: "sem-api" });
		expect(await lerParlamentar("81", 1)).toEqual({ tipo: "sem-api" });
		expect(await lerVotacao("139")).toEqual({ tipo: "sem-api" });
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe("a lista dos parlamentares", () => {
	it("conta os deputados e os senadores de cada um dos 27 estados, numa chamada só", async () => {
		const { pedidos } = api(() => json(200, listaDeExemplo()));

		const lista = await lerParlamentares(undefined);

		expect(pedidos.map((pedido) => pedido.url)).toEqual([
			"https://api.exemplo.test/parlamentares",
		]);
		if (lista.tipo !== "lista") throw new Error("sem a lista");
		expect(lista.estados).toHaveLength(27);
		expect(lista.estados.find((estado) => estado.sigla === "SC")).toEqual({
			sigla: "SC",
			deputados: 3,
			senadores: 2,
		});
		expect(lista.estados.find((estado) => estado.sigla === "BA")).toEqual({
			sigla: "BA",
			deputados: 1,
			senadores: 0,
		});
		// A pessoa sem mandato em exercício, com a UF nula, não entra em estado nenhum.
		const total = lista.estados.reduce(
			(soma, estado) => soma + estado.deputados + estado.senadores,
			0,
		);
		expect(total).toBe(6);
		expect(lista.escolhido).toBeNull();
	});

	it("com um estado, manda só os nomes dele, separados pela Casa, na ordem da API", async () => {
		api(() => json(200, listaDeExemplo()));

		const lista = await lerParlamentares("SC");

		if (lista.tipo !== "lista" || !lista.escolhido)
			throw new Error("sem o estado");
		expect(lista.escolhido.sigla).toBe("SC");
		expect(lista.escolhido.camara.map((item) => item.id)).toEqual([81, 82, 83]);
		expect(lista.escolhido.senado.map((item) => item.id)).toEqual([501, 502]);
	});

	it("uma sigla que não é estado abre o mapa, sem estado escolhido", async () => {
		api(() => json(200, listaDeExemplo()));

		const lista = await lerParlamentares("XX");

		expect(lista.tipo === "lista" && lista.escolhido).toBeNull();
	});
});

describe("a página do parlamentar", () => {
	it("pede o parlamentar e a primeira página de votos ao mesmo tempo", async () => {
		const { pedidos } = apiDoParlamentar(25);

		const pagina = await lerParlamentar("81-agata-cedrolume", 1);

		expect(pedidos.map((pedido) => pedido.url).sort()).toEqual([
			"https://api.exemplo.test/parlamentares/81",
			"https://api.exemplo.test/parlamentares/81/votos?limite=20&deslocamento=0",
		]);
		expect(pagina).toMatchObject({
			tipo: "parlamentar",
			parlamentar: { id: 81 },
			total: 25,
			pagina: 1,
			paginas: 2,
		});
		expect(pagina.tipo === "parlamentar" && pagina.votos).toHaveLength(20);
	});

	it("a segunda página pede os votos a partir do 21º", async () => {
		const { pedidos } = apiDoParlamentar(25);

		const pagina = await lerParlamentar("81", 2);

		expect(pedidos.map((pedido) => pedido.url)).toContain(
			"https://api.exemplo.test/parlamentares/81/votos?limite=20&deslocamento=20",
		);
		expect(pagina.tipo === "parlamentar" && pagina.votos).toHaveLength(5);
	});

	it("sem voto, a página tem uma página só", async () => {
		apiDoParlamentar(0);

		expect(await lerParlamentar("81", 1)).toMatchObject({
			total: 0,
			paginas: 1,
		});
	});

	it("a página depois da última não existe", async () => {
		apiDoParlamentar(20);

		expect(isNotFound(await erroDe(lerParlamentar("81", 2)))).toBe(true);
	});

	it("o fim de endereço que não começa por um id válido nem chega à API", async () => {
		const { fetch } = apiDoParlamentar(1);

		for (const valor of ["081", "0", "abc", "-81", "2147483648", "81 "]) {
			expect(isNotFound(await erroDe(lerParlamentar(valor, 1))), valor).toBe(
				true,
			);
		}
		expect(fetch).not.toHaveBeenCalled();
	});

	it("o 404 e o 422 da API dão a página não encontrada", async () => {
		for (const status of [404, 422]) {
			api((pedido) =>
				pedido.url.includes("/votos")
					? json(200, votosDeExemplo(0))
					: json(status, { erro: "parlamentar_nao_encontrado" }),
			);
			expect(
				isNotFound(await erroDe(lerParlamentar("81", 1))),
				String(status),
			).toBe(true);
		}
	});
});

describe("a página da votação", () => {
	it("pede a votação pelo id e devolve a votação inteira", async () => {
		const { pedidos } = api(() => json(200, votacaoDeExemplo()));

		const pagina = await lerVotacao("139");

		expect(pedidos.map((pedido) => pedido.url)).toEqual([
			"https://api.exemplo.test/votacoes/139",
		]);
		expect(pagina).toMatchObject({ tipo: "votacao", votacao: { id: 139 } });
	});

	it("o 404 e o 422 da API dão a página não encontrada, e o id inválido nem chega a ela", async () => {
		for (const status of [404, 422]) {
			api(() => json(status, { erro: "votacao_nao_encontrada" }));
			expect(isNotFound(await erroDe(lerVotacao("139"))), String(status)).toBe(
				true,
			);
		}
		const { fetch } = api(() => json(200, votacaoDeExemplo()));
		expect(isNotFound(await erroDe(lerVotacao("139-nome")))).toBe(true);
		expect(fetch).not.toHaveBeenCalled();
	});
});

describe("quando a API falha", () => {
	const leituras = [
		["a lista", () => lerParlamentares("SC")],
		["o parlamentar", () => lerParlamentar("81", 1)],
		["a votação", () => lerVotacao("139")],
	] as const;

	it.each(leituras)(
		"%s: o 500 e o 503 viram o erro genérico, sem nada do corpo da API",
		async (_, ler) => {
			for (const status of [500, 503]) {
				api(() => json(status, { detalhe: MENSAGEM_DA_FALHA }));
				confereErroGenerico(await erroDe(ler()), `http-${status}`);
			}
		},
	);

	it.each(leituras)(
		"%s: a conexão recusada vira o erro genérico",
		async (_, ler) => {
			api(() => {
				throw new TypeError(MENSAGEM_DA_FALHA);
			});

			confereErroGenerico(await erroDe(ler()), "sem-resposta");
		},
	);

	it.each(leituras)(
		"%s: a resposta em outro formato vira o erro genérico",
		async (_, ler) => {
			api(() => json(200, { parlamentares: [{ id: "81" }], votos: "SELECT" }));

			confereErroGenerico(await erroDe(ler()), "resposta-invalida");
		},
	);

	it("a API que não responde no tempo vira o erro genérico", async () => {
		vi.useFakeTimers();
		api(
			(pedido) =>
				new Promise((_, recusar) => {
					pedido.signal.addEventListener("abort", () =>
						recusar(new DOMException(MENSAGEM_DA_FALHA, "AbortError")),
					);
				}),
		);

		const leitura = erroDe(lerVotacao("139"));
		await vi.advanceTimersByTimeAsync(TEMPO_DE_ESPERA);

		confereErroGenerico(await leitura, "tempo-esgotado");
	});
});
