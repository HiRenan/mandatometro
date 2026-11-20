import { afterEach, describe, expect, it, vi } from "vitest";
import {
	codigoValido,
	emailValido,
	pedirInscricao,
	pedirSaida,
} from "./newsletter";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site. Aqui, a API é um endereço de mentira, e o fetch, simulado.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));

const CODIGO = "123e4567-e89b-42d3-a456-426614174000";

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

/** Simula a API: cada pedido recebe a resposta de `responder`, e o pedido fica guardado. */
function api(responder: () => Response | Promise<Response>) {
	const pedidos: Request[] = [];
	const fetch = vi.fn(async (pedido: Request) => {
		pedidos.push(pedido);
		return responder();
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

describe("o e-mail", () => {
	it("aceita um endereço com nome, @ e domínio, mesmo com acento e com espaço em volta", () => {
		expect(emailValido("pessoa@example.com")).toBe(true);
		expect(emailValido("nome.sobrenome+jornal@example.com")).toBe(true);
		// A API aceita o endereço com acento: a tela não barra o que ela aceita.
		expect(emailValido("ação@example.com")).toBe(true);
		expect(emailValido("  pessoa@example.com \n")).toBe(true);
	});

	it("recusa o vazio e o que não tem as três partes", () => {
		for (const texto of [
			"",
			"   ",
			"pessoa",
			"pessoa@",
			"@example.com",
			"pessoa@example",
			"pessoa@example.",
			"pessoa@.com",
			"pessoa @example.com",
			"pessoa@exa mple.com",
			"pessoa@@example.com",
		]) {
			expect(emailValido(texto), texto).toBe(false);
		}
	});
});

describe("o código de saída", () => {
	it("aceita o UUID que a API manda no link, em minúsculas ou maiúsculas", () => {
		expect(codigoValido(CODIGO)).toBe(true);
		expect(codigoValido(CODIGO.toUpperCase())).toBe(true);
	});

	it("recusa a falta do código e o código mal formado", () => {
		for (const codigo of [
			undefined,
			"",
			"abc",
			CODIGO.slice(1),
			`${CODIGO}0`,
			CODIGO.replaceAll("-", ""),
			`{${CODIGO}}`,
			` ${CODIGO}`,
			"../../health",
		]) {
			expect(codigoValido(codigo), String(codigo)).toBe(false);
		}
	});
});

describe("a inscrição", () => {
	it("manda à API um POST com o JSON só com o e-mail", async () => {
		const { pedidos } = api(() => json(200, { situacao: "aguardando_edicao" }));

		await pedirInscricao("  pessoa@example.com ");

		expect(pedidos).toHaveLength(1);
		const [pedido] = pedidos;
		expect(pedido.method).toBe("POST");
		expect(pedido.url).toBe("https://api.exemplo.test/newsletter/inscricoes");
		expect(pedido.headers.get("Content-Type")).toBe("application/json");
		expect(await pedido.text()).toBe('{"email":"pessoa@example.com"}');
	});

	it.each([
		"edicao_enviada",
		"aguardando_edicao",
		"envio_indisponivel",
	] as const)("com o 200 e %s, a inscrição foi feita", async (situacao) => {
		api(() => json(200, { situacao }));

		expect(await pedirInscricao("pessoa@example.com")).toEqual({
			tipo: "inscrita",
			situacao,
		});
	});

	it("com uma situação que a tela não conhece, a inscrição foi feita, sem a certeza do envio", async () => {
		api(() => json(200, { situacao: "outra" }));

		expect(await pedirInscricao("pessoa@example.com")).toEqual({
			tipo: "inscrita",
			situacao: "envio_indisponivel",
		});
	});

	it("com o 422, o e-mail é inválido", async () => {
		api(() => json(422, { erro: "dados_invalidos" }));

		expect(await pedirInscricao("pessoa@example")).toEqual({
			tipo: "email-invalido",
		});
	});

	it("com o 429, a espera vem do Retry-After, em segundos", async () => {
		api(() =>
			json(429, { erro: "limite_de_inscricoes" }, { "Retry-After": "42" }),
		);
		expect(await pedirInscricao("pessoa@example.com")).toEqual({
			tipo: "limite",
			segundos: 42,
		});

		api(() => json(429, { erro: "limite_de_inscricoes" }));
		expect(await pedirInscricao("pessoa@example.com")).toEqual({
			tipo: "limite",
		});

		for (const espera of ["logo", "0", "1.5"]) {
			api(() =>
				json(429, { erro: "limite_de_inscricoes" }, { "Retry-After": espera }),
			);
			expect(await pedirInscricao("pessoa@example.com"), espera).toEqual({
				tipo: "limite",
			});
		}
	});

	it.each([503, 500, 404])(
		"com o %i, o serviço está fora do ar",
		async (status) => {
			api(() => json(status, { erro: "servico_indisponivel" }));

			expect(await pedirInscricao("pessoa@example.com")).toEqual({
				tipo: "fora-do-ar",
			});
		},
	);

	it("sem resposta, como na falta de internet ou no tempo esgotado, não há conexão", async () => {
		api(() => Promise.reject(new TypeError("Failed to fetch")));
		expect(await pedirInscricao("pessoa@example.com")).toEqual({
			tipo: "sem-conexao",
		});

		api(() =>
			Promise.reject(
				new DOMException("The operation timed out.", "TimeoutError"),
			),
		);
		expect(await pedirInscricao("pessoa@example.com")).toEqual({
			tipo: "sem-conexao",
		});
	});
});

describe("a saída", () => {
	it("manda à API um POST sem corpo, com o código no caminho", async () => {
		const { pedidos } = api(() => new Response(null, { status: 200 }));

		await pedirSaida(CODIGO);

		expect(pedidos).toHaveLength(1);
		const [pedido] = pedidos;
		expect(pedido.method).toBe("POST");
		expect(pedido.url).toBe(
			`https://api.exemplo.test/newsletter/saida/${CODIGO}`,
		);
		expect(await pedido.text()).toBe("");
	});

	it("com o 200, a pessoa saiu, também com um código já usado", async () => {
		api(() => new Response(null, { status: 200 }));

		expect(await pedirSaida(CODIGO)).toEqual({ tipo: "saiu" });
	});

	it("com o 422, o link é inválido", async () => {
		api(() => json(422, { erro: "dados_invalidos" }));

		expect(await pedirSaida(CODIGO)).toEqual({ tipo: "link-invalido" });
	});

	it("com o 503, o serviço está fora do ar", async () => {
		api(() => json(503, { erro: "servico_indisponivel" }));

		expect(await pedirSaida(CODIGO)).toEqual({ tipo: "fora-do-ar" });
	});

	it("sem resposta, não há conexão", async () => {
		api(() => Promise.reject(new TypeError("Failed to fetch")));

		expect(await pedirSaida(CODIGO)).toEqual({ tipo: "sem-conexao" });
	});
});

describe("o tempo de espera", () => {
	it("a inscrição e a saída desistem do pedido depois de 20 segundos", async () => {
		// O sinal do tempo já vem esgotado: o pedido que o segue também vem.
		const tempo = vi
			.spyOn(AbortSignal, "timeout")
			.mockImplementation(() => AbortSignal.abort());
		const { pedidos } = api(() => new Response(null, { status: 200 }));

		await pedirInscricao("pessoa@example.com");
		await pedirSaida(CODIGO);

		expect(tempo.mock.calls).toEqual([[20_000], [20_000]]);
		expect(pedidos.map((pedido) => pedido.signal.aborted)).toEqual([
			true,
			true,
		]);
	});
});
