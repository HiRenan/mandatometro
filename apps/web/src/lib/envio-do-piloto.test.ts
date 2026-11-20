import { inspect } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PedidoTentativaPiloto } from "@/client";
import {
	enviarEtapa,
	esperaDoReenvio,
	type ResultadoDoEnvio,
} from "./envio-do-piloto";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site. Aqui, a API é um endereço de mentira, e o fetch, simulado.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));

const PEDIDO: PedidoTentativaPiloto = {
	participacao: "b9d2fdc3-c198-433b-836d-b381de5a49d9",
	versao_quiz: "processo-legislativo-final-v1",
	etapa: "antes",
	acertos: 7,
};

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

function json(status: number, corpo: unknown, cabecalhos = {}) {
	return new Response(JSON.stringify(corpo), {
		status,
		headers: { "Content-Type": "application/json", ...cabecalhos },
	});
}

describe("o envio de uma etapa do piloto", () => {
	it("manda os quatro campos só no corpo de um POST, com o código fora do endereço", async () => {
		const { pedidos } = api(() => json(200, { situacao: "recebida" }));

		expect(await enviarEtapa(PEDIDO)).toEqual({ tipo: "recebida" });

		expect(pedidos).toHaveLength(1);
		expect(pedidos[0].method).toBe("POST");
		expect(pedidos[0].url).toBe("https://api.exemplo.test/piloto/tentativas");
		expect(await pedidos[0].json()).toEqual(PEDIDO);
	});

	it("não escreve o código no console, com nenhuma resposta da API nem sem resposta", async () => {
		const escritas = (["log", "info", "warn", "error", "debug"] as const).map(
			(metodo) => vi.spyOn(console, metodo).mockImplementation(() => {}),
		);

		for (const status of [200, 410, 413, 422, 429, 503]) {
			api(() => json(status, {}));
			await enviarEtapa(PEDIDO);
		}
		api(() => Promise.reject(new TypeError("Failed to fetch")));
		await enviarEtapa(PEDIDO);

		// O inspect abre os objetos e os erros: o código dentro de um deles também
		// aparece no texto.
		const escrito = escritas
			.flatMap((espiao) => espiao.mock.calls)
			.map((argumentos) => inspect(argumentos, { depth: 10 }))
			.join("\n");
		expect(escrito).not.toContain(PEDIDO.participacao);
	});

	it("com o piloto encerrado (410), diz que ele não recebe respostas", async () => {
		api(() => json(410, { erro: "piloto_encerrado" }));

		expect(await enviarEtapa(PEDIDO)).toEqual({ tipo: "encerrado" });
	});

	it("com o pedido recusado (413 ou 422), diz que não adianta repetir", async () => {
		api(() => json(413, { erro: "corpo_muito_grande" }));
		expect(await enviarEtapa(PEDIDO)).toEqual({ tipo: "recusado" });

		api(() => json(422, { erro: "dados_invalidos" }));
		expect(await enviarEtapa(PEDIDO)).toEqual({ tipo: "recusado" });
	});

	it("no limite de tentativas (429), traz os segundos do Retry-After", async () => {
		api(() =>
			json(429, { erro: "limite_de_tentativas" }, { "Retry-After": "42" }),
		);
		expect(await enviarEtapa(PEDIDO)).toEqual({ tipo: "limite", segundos: 42 });

		api(() => json(429, { erro: "limite_de_tentativas" }));
		expect(await enviarEtapa(PEDIDO)).toEqual({ tipo: "limite" });

		api(() =>
			json(429, { erro: "limite_de_tentativas" }, { "Retry-After": "amanhã" }),
		);
		expect(await enviarEtapa(PEDIDO)).toEqual({ tipo: "limite" });
	});

	it("com o serviço fora do ar ou outra resposta, diz que dá para repetir", async () => {
		api(() => json(503, { erro: "servico_indisponivel" }));
		expect(await enviarEtapa(PEDIDO)).toEqual({ tipo: "fora-do-ar" });

		api(() => json(500, {}));
		expect(await enviarEtapa(PEDIDO)).toEqual({ tipo: "fora-do-ar" });
	});

	it("com o aparelho sem internet, diz que não houve conexão, sem lançar erro nem escrever no console", async () => {
		const consoleErro = vi.spyOn(console, "error");
		vi.stubGlobal("navigator", { onLine: false });
		api(() => Promise.reject(new TypeError("Failed to fetch")));

		expect(await enviarEtapa(PEDIDO)).toEqual({ tipo: "sem-conexao" });
		expect(consoleErro).not.toHaveBeenCalled();
	});

	it("com o aparelho conectado, o pedido que não chega à API ou esgota o tempo é como a API fora do ar", async () => {
		vi.stubGlobal("navigator", { onLine: true });
		api(() => Promise.reject(new TypeError("Failed to fetch")));
		expect(await enviarEtapa(PEDIDO)).toEqual({ tipo: "fora-do-ar" });

		api(() => Promise.reject(new DOMException("tempo", "TimeoutError")));
		expect(await enviarEtapa(PEDIDO)).toEqual({ tipo: "fora-do-ar" });
	});

	it("desiste do pedido depois de 20 segundos sem resposta, como com a API fora do ar", async () => {
		vi.useFakeTimers();
		vi.stubGlobal("navigator", { onLine: true });
		// Um pedido que só acaba quando o site desiste dele.
		api(
			(pedido) =>
				new Promise((_, rejeitar) => {
					pedido.signal.addEventListener("abort", () =>
						rejeitar(pedido.signal.reason),
					);
				}),
		);
		let resultado: ResultadoDoEnvio | undefined;
		void enviarEtapa(PEDIDO).then((recebido) => {
			resultado = recebido;
		});

		await vi.advanceTimersByTimeAsync(19_999);
		expect(resultado).toBeUndefined();

		await vi.advanceTimersByTimeAsync(1);
		expect(resultado).toEqual({ tipo: "fora-do-ar" });
	});

	it("com a resposta, não deixa o relógio da espera correndo", async () => {
		vi.useFakeTimers();
		api(() => json(200, { situacao: "recebida" }));

		await enviarEtapa(PEDIDO);

		expect(vi.getTimerCount()).toBe(0);
	});
});

describe("a espera do reenvio", () => {
	it("espera 5, 15, 30 e 60 segundos, e depois um minuto a cada vez", () => {
		expect([0, 1, 2, 3, 4, 10].map(esperaDoReenvio)).toEqual([
			5, 15, 30, 60, 60, 60,
		]);
	});
});
