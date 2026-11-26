import { afterEach, expect, it, vi } from "vitest";
import { OPINIAO_FORA_DO_AR } from "./opiniao";
import { entregarOpiniao } from "./opiniao.server";

vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.example.com" } }));
vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeader: (nome: string) => {
		if (nome === "user-agent") return "Navegador de teste";
		if (nome === "cookie") return "sessao_conta=exemplo";
		return undefined;
	},
}));

const PEDIDO = {
	texto: "A trilha ficou clara.",
	nota: 5,
	partes: ["trilhas" as const],
	site: "",
};

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

it("chama a API com JSON e sem cookie, encaminhando o agente de usuário", async () => {
	const fetch = vi.fn(
		async (_pedido: Request) => new Response(null, { status: 204 }),
	);
	vi.stubGlobal("fetch", fetch);
	expect(await entregarOpiniao(PEDIDO)).toBe("enviada");
	const pedido = fetch.mock.calls[0][0];
	expect(pedido.url).toBe("https://api.example.com/opinioes");
	expect(pedido.method).toBe("POST");
	expect(pedido.credentials).toBe("omit");
	expect(pedido.headers.has("Cookie")).toBe(false);
	expect(pedido.headers.get("User-Agent")).toBe("Navegador de teste");
	expect(await pedido.json()).toEqual(PEDIDO);
});

it.each([
	[413, "texto-invalido"],
	[422, "texto-invalido"],
	[429, "limite"],
])("transforma a resposta %i no estado fixo %s", async (status, estado) => {
	vi.stubGlobal("fetch", async () => new Response(null, { status }));
	expect(await entregarOpiniao(PEDIDO)).toBe(estado);
});

it("devolve e registra só a mensagem fixa quando a API falha", async () => {
	const log = vi.spyOn(console, "error").mockImplementation(() => {});
	vi.stubGlobal("fetch", async () =>
		Response.json({ erro: PEDIDO }, { status: 503 }),
	);
	await expect(entregarOpiniao(PEDIDO)).rejects.toThrow(OPINIAO_FORA_DO_AR);
	expect(log.mock.calls).toEqual([
		["[opiniao] O envio à API falhou: http-503."],
	]);
});
