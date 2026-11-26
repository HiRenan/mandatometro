import { afterEach, beforeEach, expect, it, vi } from "vitest";
import servidor from "./servidor.server";

const { start } = vi.hoisted(() => ({
	start: vi.fn<(pedido: Request) => Promise<Response>>(),
}));
vi.mock("@tanstack/react-start/server", () => ({
	createServerEntry: (entrada: unknown) => entrada,
	createStartHandler: () => start,
	defaultStreamHandler: vi.fn(),
}));

const ACAO = "https://example.com/_serverFn/acao";
const LIMITE = 24 * 1024;

beforeEach(() => {
	vi.spyOn(console, "warn").mockImplementation(() => {});
	vi.spyOn(console, "error").mockImplementation(() => {});
	start.mockImplementation(async (pedido) => {
		try {
			const dados =
				pedido.method === "GET"
					? JSON.parse(
							new URL(pedido.url).searchParams.get("payload") ?? "null",
						)
					: await pedido.json();
			return Response.json(dados);
		} catch (erro) {
			console.error(String(erro));
			return Response.json({ erro: String(erro) }, { status: 500 });
		}
	});
});

afterEach(() => {
	vi.restoreAllMocks();
	start.mockReset();
});

function fluxo(blocos: string[]) {
	const proximo = vi.fn((controle: ReadableStreamDefaultController) => {
		const bloco = blocos.shift();
		if (bloco === undefined) controle.close();
		else controle.enqueue(new TextEncoder().encode(bloco));
	});
	return {
		corpo: new ReadableStream({ pull: proximo }, { highWaterMark: 0 }),
		proximo,
	};
}

function post(body: BodyInit, cabecalhos?: HeadersInit, url = ACAO) {
	const headers = new Headers(cabecalhos);
	headers.set("Content-Type", "application/json");
	const opcoes = { method: "POST", headers, body, duplex: "half" as const };
	return new Request(url, opcoes);
}

async function conferirRecusa(
	resposta: Response,
	status: number,
	erro: string,
) {
	expect(resposta.status).toBe(status);
	expect(resposta.headers.get("Cache-Control")).toBe("no-store");
	expect(await resposta.json()).toEqual({ erro });
	expect(console.warn).toHaveBeenCalledExactlyOnceWith(
		`[server-functions] Pedido recusado: ${erro}.`,
	);
	expect(console.error).not.toHaveBeenCalled();
	expect(start).not.toHaveBeenCalled();
}

it("recusa tamanho declarado acima do teto antes de puxar o primeiro bloco", async () => {
	const { corpo, proximo } = fluxo(["{}"]);
	const resposta = await servidor.fetch(
		post(corpo, { "Content-Length": String(LIMITE + 1) }),
	);
	expect(proximo).not.toHaveBeenCalled();
	await conferirRecusa(resposta, 413, "corpo_grande");
});

it("recusa um fluxo sem tamanho declarado assim que ele excede o teto", async () => {
	const { corpo, proximo } = fluxo([
		"{}".padEnd(LIMITE / 2),
		" ".repeat(LIMITE / 2),
		" ",
		" ",
	]);
	const resposta = await servidor.fetch(post(corpo));
	expect(proximo).toHaveBeenCalledTimes(3);
	await conferirRecusa(resposta, 413, "corpo_grande");
});

it.each([ACAO, "https://example.com/_s%65rverFn/acao"])(
	"recusa JSON malformado sem repetir o corpo em %s",
	async (url) => {
		const marcador = "MARCADOR_FICTICIO";
		const resposta = await servidor.fetch(post(marcador, undefined, url));
		expect(await resposta.clone().text()).not.toContain(marcador);
		await conferirRecusa(resposta, 400, "corpo_invalido");
	},
);

it("também recusa JSON malformado na consulta GET da função", async () => {
	const marcador = "CONSULTA_FICTICIA";
	const resposta = await servidor.fetch(
		new Request(`${ACAO}?payload=${marcador}`),
	);
	expect(await resposta.clone().text()).not.toContain(marcador);
	await conferirRecusa(resposta, 400, "corpo_invalido");
});

it("encaminha o POST válido com os bytes no teto e conserva o agente", async () => {
	const json = JSON.stringify({ texto: "Uma opinião 🎲" });
	const bytes = new TextEncoder().encode(json).byteLength;
	const corpo = json.padEnd(json.length + LIMITE - bytes);
	const resposta = await servidor.fetch(
		post(corpo, { "User-Agent": "Navegador fictício" }),
	);
	expect(resposta.status).toBe(200);
	expect(await resposta.json()).toEqual({ texto: "Uma opinião 🎲" });
	expect(start).toHaveBeenCalledOnce();
	expect(start.mock.calls[0][0].headers.get("User-Agent")).toBe(
		"Navegador fictício",
	);
	expect(console.warn).not.toHaveBeenCalled();
});

it.each([
	new Request(ACAO),
	new Request(`${ACAO}?payload=%7B%7D`),
	post("{}", undefined, "https://example.com/opiniao"),
])("entrega as outras requisições intactas ao Start", async (pedido) => {
	start.mockResolvedValue(new Response(null, { status: 204 }));
	expect((await servidor.fetch(pedido)).status).toBe(204);
	expect(start.mock.calls[0][0]).toBe(pedido);
});
