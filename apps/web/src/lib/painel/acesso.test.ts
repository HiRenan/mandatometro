import { isNotFound, isRedirect } from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ERRO_DA_GUARDA, exigirAdministradora } from "./acesso";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site. Aqui, a API é um endereço de mentira, e o fetch, simulado.
const ENV = vi.hoisted(() => ({ API_URL: "https://api.example.com" }));
vi.mock("@/env", () => ({ ENV }));

afterEach(() => {
	ENV.API_URL = "https://api.example.com";
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

function json(status: number, corpo: unknown) {
	return new Response(JSON.stringify(corpo), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

/** O que a guarda lança, ou undefined quando ela deixa passar. */
async function guarda(controle?: AbortController): Promise<unknown> {
	try {
		await exigirAdministradora({ abortController: controle });
		return undefined;
	} catch (erro) {
		return erro;
	}
}

describe("a guarda do painel", () => {
	it("deixa a administradora passar, com o cookie e sem cache", async () => {
		const { pedidos } = api(() =>
			json(200, { nome: "Pessoa fictícia", papel: "administradora" }),
		);
		expect(await guarda()).toBeUndefined();
		expect(pedidos).toHaveLength(1);
		expect(pedidos[0].url).toBe("https://api.example.com/contas/me");
		expect(pedidos[0].credentials).toBe("include");
		expect(pedidos[0].cache).toBe("no-store");
	});

	it("confere a sessão também sem AbortSignal.timeout nem AbortSignal.any", async () => {
		const { any, timeout } = AbortSignal;
		Reflect.set(AbortSignal, "any", undefined);
		Reflect.set(AbortSignal, "timeout", undefined);
		try {
			const { pedidos } = api(() => json(200, { papel: "administradora" }));
			expect(await guarda(new AbortController())).toBeUndefined();
			expect(pedidos).toHaveLength(1);
		} finally {
			Reflect.set(AbortSignal, "any", any);
			Reflect.set(AbortSignal, "timeout", timeout);
		}
	});

	it("leva quem não entrou ao login, no lugar do painel", async () => {
		api(() => json(401, { detail: "Sessão ausente ou expirada." }));
		const erro = await guarda();
		expect(isRedirect(erro)).toBe(true);
		expect(isRedirect(erro) && erro.options).toMatchObject({
			to: "/login",
			replace: true,
		});
	});

	it("dá a página não encontrada à conta comum e ao papel que a tela não conhece", async () => {
		for (const papel of ["comum", "revisora"]) {
			api(() => json(200, { nome: "Pessoa fictícia", papel }));
			expect(isNotFound(await guarda()), papel).toBe(true);
		}
	});

	it("dá o erro de mensagem fixa quando a API falha, sem o endereço dela", async () => {
		const respostas = [
			() => json(500, { detail: "Erro em https://api.example.com/interno" }),
			() => json(503, { detail: "Fora do ar." }),
			() => Promise.reject(new TypeError("Failed to fetch")),
			() => json(200, "não é um perfil"),
		];
		for (const responder of respostas) {
			api(responder);
			const erro = await guarda();
			expect(erro).toBeInstanceOf(Error);
			expect(isRedirect(erro) || isNotFound(erro)).toBe(false);
			expect(erro instanceof Error && erro.message).toBe(ERRO_DA_GUARDA);
		}
	});

	it("não pede nada sem a API configurada", async () => {
		ENV.API_URL = "";
		const { fetch } = api(() => json(200, {}));
		expect(await guarda()).toBeUndefined();
		expect(fetch).not.toHaveBeenCalled();
	});

	it("cancela o pedido quando a navegação muda", async () => {
		const controle = new AbortController();
		const { pedidos } = api(
			() =>
				new Promise<Response>((_, falhar) => {
					pedidos[0].signal.addEventListener("abort", () =>
						falhar(new DOMException("Cancelado.", "AbortError")),
					);
					controle.abort();
				}),
		);
		expect(await guarda(controle)).toBeInstanceOf(Error);
		expect(pedidos[0].signal.aborted).toBe(true);
	});
});
