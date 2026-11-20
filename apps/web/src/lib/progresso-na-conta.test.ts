// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { consultar, alterar, env } = vi.hoisted(() => ({
	consultar: vi.fn(),
	alterar: vi.fn(),
	env: { API_URL: "https://api.example.com" },
}));
vi.mock("@/client", () => ({
	consultarProgressoConta: consultar,
	alterarProgressoConta: alterar,
}));
vi.mock("@/env", () => ({ ENV: env }));

const CHAVE_VISITANTE = "mandatometro:artigos-lidos";
const PRIMEIRO = "leis/primeiro";
const SEGUNDO = "leis/segundo";
const OUTRA_TRILHA = "eleicoes/voto";

type Progresso = typeof import("./progresso");
let progresso: Progresso;
let parar: (() => void) | undefined;

const resposta = (...lidos: string[]) => ({
	data: { lidos },
	response: new Response(null, { status: 200 }),
});

function adiarResposta() {
	return Promise.withResolvers<ReturnType<typeof resposta>>();
}

async function visitar() {
	parar?.();
	vi.resetModules();
	progresso = await import("./progresso");
	parar = progresso.acompanharProgressoDaConta();
}

beforeEach(async () => {
	localStorage.clear();
	env.API_URL = "https://api.example.com";
	consultar.mockReset().mockResolvedValue(resposta());
	alterar.mockReset().mockResolvedValue(resposta());
	await visitar();
});

afterEach(() => {
	parar?.();
	parar = undefined;
});

describe("progresso com conta opcional", () => {
	it("mantém o armazenamento de visitante e nunca pede a API sem indicação de sessão", async () => {
		progresso.marcarLido(PRIMEIRO);
		progresso.marcarLido(PRIMEIRO);
		expect(localStorage.getItem(CHAVE_VISITANTE)).toBe(
			JSON.stringify([PRIMEIRO]),
		);
		expect(localStorage.length).toBe(1);
		await visitar();
		const apagadas = progresso.recomecarTrilha("leis");
		progresso.restaurarLidos(apagadas);
		expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO]));
		expect(consultar).not.toHaveBeenCalled();
		expect(alterar).not.toHaveBeenCalled();
	});

	it("com API_URL vazio, usa só o armazenamento original mesmo com uma sessão anotada", async () => {
		progresso.anotarEntradaNaConta();
		env.API_URL = "";
		await visitar();
		progresso.marcarLido(PRIMEIRO);
		expect(localStorage.getItem(CHAVE_VISITANTE)).toBe(
			JSON.stringify([PRIMEIRO]),
		);
		expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO]));
		expect(consultar).not.toHaveBeenCalled();
		expect(alterar).not.toHaveBeenCalled();
	});

	it("junta as marcas de visitante uma vez e na próxima visita respeita uma remoção de outro aparelho", async () => {
		progresso.marcarLido(PRIMEIRO);
		progresso.marcarLido("entrada antiga inválida");
		progresso.anotarEntradaNaConta();
		expect(alterar).not.toHaveBeenCalled();

		alterar.mockResolvedValueOnce(resposta(PRIMEIRO, OUTRA_TRILHA));
		await visitar();
		await vi.waitFor(() => {
			expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO, OUTRA_TRILHA]));
		});
		expect(alterar).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				body: { marcar: [PRIMEIRO] },
				cache: "no-store",
				credentials: "include",
				signal: expect.any(AbortSignal),
			}),
		);
		expect(localStorage.getItem(CHAVE_VISITANTE)).toBeNull();
		expect(consultar).not.toHaveBeenCalled();

		consultar.mockResolvedValueOnce(resposta(OUTRA_TRILHA));
		await visitar();
		await vi.waitFor(() => {
			expect(progresso.lerLidos()).toEqual(new Set([OUTRA_TRILHA]));
		});
		expect(consultar).toHaveBeenCalledTimes(1);
		expect(alterar).toHaveBeenCalledTimes(1);
	});

	it("retoma a importação de visitante na próxima visita se ela falhar", async () => {
		progresso.marcarLido(PRIMEIRO);
		progresso.anotarEntradaNaConta();
		alterar.mockRejectedValueOnce(new Error("Falha de rede"));
		await visitar();
		expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO]));
		expect(alterar).toHaveBeenCalledTimes(1);

		alterar.mockResolvedValueOnce(resposta(PRIMEIRO, SEGUNDO));
		await visitar();
		await vi.waitFor(() => {
			expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO, SEGUNDO]));
		});
		expect(alterar).toHaveBeenCalledTimes(2);
		expect(localStorage.getItem(CHAVE_VISITANTE)).toBeNull();
	});

	it("marca e desmarca sem esperar a consulta e envia as mudanças na ordem", async () => {
		consultar.mockResolvedValueOnce(resposta(PRIMEIRO));
		progresso.anotarEntradaNaConta();
		await visitar();
		await vi.waitFor(() => {
			expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO]));
		});

		const leitura = adiarResposta();
		const gravacao = adiarResposta();
		consultar.mockReturnValueOnce(leitura.promise);
		alterar.mockReturnValueOnce(gravacao.promise);
		await visitar();
		progresso.desmarcarLido(PRIMEIRO);
		progresso.marcarLido(SEGUNDO);
		expect(progresso.lerLidos()).toEqual(new Set([SEGUNDO]));
		expect(alterar).not.toHaveBeenCalled();

		leitura.resolve(resposta(PRIMEIRO, OUTRA_TRILHA));
		await vi.waitFor(() => {
			expect(progresso.lerLidos()).toEqual(new Set([OUTRA_TRILHA, SEGUNDO]));
		});
		expect(alterar).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				body: { marcar: [SEGUNDO], desmarcar: [PRIMEIRO] },
			}),
		);
		progresso.desmarcarLido(SEGUNDO);
		expect(alterar).toHaveBeenCalledTimes(1);
		gravacao.resolve(resposta(OUTRA_TRILHA, SEGUNDO));
		await vi.waitFor(() => {
			expect(alterar).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({ body: { desmarcar: [SEGUNDO], marcar: [] } }),
			);
		});
		expect(progresso.lerLidos()).toEqual(new Set([OUTRA_TRILHA]));
	});

	it("recomeça a trilha e desfaz em lotes, preservando as outras trilhas", async () => {
		consultar.mockResolvedValueOnce(resposta(PRIMEIRO, SEGUNDO, OUTRA_TRILHA));
		progresso.anotarEntradaNaConta();
		await visitar();
		await vi.waitFor(() => expect(progresso.lerLidos().size).toBe(3));

		const reinicio = adiarResposta();
		alterar.mockReturnValueOnce(reinicio.promise);
		const apagadas = progresso.recomecarTrilha("leis");
		expect(progresso.lerLidos()).toEqual(new Set([OUTRA_TRILHA]));
		expect(alterar).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				body: { marcar: [], desmarcar: [PRIMEIRO, SEGUNDO] },
			}),
		);
		progresso.restaurarLidos(apagadas);
		expect(progresso.lerLidos()).toEqual(
			new Set([OUTRA_TRILHA, PRIMEIRO, SEGUNDO]),
		);
		reinicio.resolve(resposta(OUTRA_TRILHA));
		await vi.waitFor(() => {
			expect(alterar).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					body: { marcar: [PRIMEIRO, SEGUNDO], desmarcar: [] },
				}),
			);
		});
	});

	it("mantém o clique durante a falha e na próxima visita reconcilia pela conta", async () => {
		const erro = vi.spyOn(console, "error").mockImplementation(() => {});
		const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
		try {
			progresso.anotarEntradaNaConta();
			consultar.mockResolvedValueOnce(resposta(OUTRA_TRILHA));
			await visitar();
			await vi.waitFor(() =>
				expect(progresso.lerLidos().has(OUTRA_TRILHA)).toBe(true),
			);

			alterar.mockRejectedValueOnce(new Error("Falha de rede"));
			expect(() => progresso.marcarLido(PRIMEIRO)).not.toThrow();
			expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO, OUTRA_TRILHA]));

			consultar.mockResolvedValueOnce(resposta(OUTRA_TRILHA));
			await visitar();
			await vi.waitFor(() => {
				expect(progresso.lerLidos()).toEqual(new Set([OUTRA_TRILHA]));
			});
			expect(alterar).toHaveBeenCalledTimes(1);
			expect(erro).not.toHaveBeenCalled();
			expect(aviso).not.toHaveBeenCalled();
		} finally {
			erro.mockRestore();
			aviso.mockRestore();
		}
	});

	it("apaga o espelho ao sair ou excluir, cancela pedidos e protege a próxima conta", async () => {
		progresso.anotarEntradaNaConta();
		consultar.mockResolvedValueOnce(resposta(PRIMEIRO));
		await visitar();
		await vi.waitFor(() =>
			expect(progresso.lerLidos().has(PRIMEIRO)).toBe(true),
		);

		const consultaAntiga = adiarResposta();
		consultar.mockReturnValueOnce(consultaAntiga.promise);
		await visitar();
		const sinal = consultar.mock.lastCall?.[0].signal;
		const apagadas = progresso.recomecarTrilha("leis");
		progresso.encerrarProgressoNaConta();
		progresso.restaurarLidos(apagadas);
		expect(progresso.lerLidos().size).toBe(0);
		expect(localStorage.length).toBe(0);
		expect(sinal.aborted).toBe(true);
		consultaAntiga.resolve(resposta(PRIMEIRO));

		await visitar();
		expect(progresso.lerLidos().size).toBe(0);
		expect(consultar).toHaveBeenCalledTimes(2);
		expect(alterar).not.toHaveBeenCalled();
		progresso.marcarLido(SEGUNDO);
		progresso.anotarEntradaNaConta();
		await visitar();
		expect(alterar).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ body: { marcar: [SEGUNDO] } }),
		);
	});

	it("descarta o espelho quando a sessão expira", async () => {
		progresso.anotarEntradaNaConta();
		consultar.mockResolvedValueOnce(resposta(PRIMEIRO));
		await visitar();
		await vi.waitFor(() =>
			expect(progresso.lerLidos().has(PRIMEIRO)).toBe(true),
		);

		consultar.mockResolvedValueOnce({
			response: new Response(null, { status: 401 }),
		});
		await visitar();
		await vi.waitFor(() => expect(progresso.lerLidos().size).toBe(0));
		expect(localStorage.length).toBe(0);
		progresso.marcarLido(SEGUNDO);
		expect(localStorage.getItem(CHAVE_VISITANTE)).toBe(
			JSON.stringify([SEGUNDO]),
		);
		expect(alterar).not.toHaveBeenCalled();
	});

	it("começar como outra pessoa no piloto limpa o navegador sem apagar a conta", async () => {
		const leitura = adiarResposta();
		progresso.marcarLido(PRIMEIRO);
		progresso.anotarEntradaNaConta();
		alterar.mockReturnValueOnce(leitura.promise);
		await visitar();
		const { comecarComoOutraPessoa } = await import("./piloto");
		expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO]));
		comecarComoOutraPessoa();
		leitura.resolve(resposta(PRIMEIRO, OUTRA_TRILHA));
		await leitura.promise;
		expect(progresso.lerLidos().size).toBe(0);
		expect(alterar).toHaveBeenCalledTimes(1);

		consultar.mockResolvedValueOnce(resposta(PRIMEIRO, OUTRA_TRILHA));
		await visitar();
		await vi.waitFor(() => {
			expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO, OUTRA_TRILHA]));
		});
		expect(alterar).toHaveBeenCalledTimes(1);
	});
});
