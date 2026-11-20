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
const CHAVE_CONTA = "mandatometro:artigos-lidos-na-conta";
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

const falha = (status: number) => ({
	response: new Response(null, { status }),
});

function aguardarTurno() {
	return new Promise((resolver) => setTimeout(resolver, 0));
}

function voltarParaAba() {
	document.dispatchEvent(new Event("visibilitychange"));
}

function instalarTravaEntreAbas() {
	let fim = Promise.resolve();
	Object.defineProperty(navigator, "locks", {
		configurable: true,
		value: {
			request<T>(
				_nome: string,
				{ signal }: { signal: AbortSignal },
				trabalho: () => Promise<T>,
			) {
				const proximo = fim.then(() => {
					signal.throwIfAborted();
					return trabalho();
				});
				fim = proximo.then(
					() => {},
					() => {},
				);
				return proximo;
			},
		},
	});
}

function adiarResposta() {
	type Resposta = ReturnType<typeof resposta>;
	let resolver!: (valor: Resposta) => void;
	const promise = new Promise<Resposta>((resolve) => {
		resolver = resolve;
	});
	return { promise, resolve: resolver };
}

async function visitar() {
	parar?.();
	vi.resetModules();
	progresso = await import("./progresso");
	parar = progresso.acompanharProgressoDaConta();
	await vi.dynamicImportSettled();
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
	Reflect.deleteProperty(navigator, "locks");
	vi.restoreAllMocks();
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
		await vi.waitFor(() => {
			expect(alterar).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					body: { marcar: [], desmarcar: [PRIMEIRO, SEGUNDO] },
				}),
			);
		});
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

	it("descarta o Desfazer de um recomeço de visitante ao entrar numa conta", async () => {
		progresso.marcarLido(PRIMEIRO);
		const apagadas = progresso.recomecarTrilha("leis");
		progresso.anotarEntradaNaConta();
		progresso.restaurarLidos(apagadas);
		await vi.dynamicImportSettled();
		expect(progresso.lerLidos().size).toBe(0);
		expect(localStorage.getItem(CHAVE_CONTA)).toBeNull();
		expect(alterar).not.toHaveBeenCalled();
	});

	it("invalida o Desfazer de visitante mesmo depois de entrar e voltar a sair", () => {
		progresso.marcarLido(PRIMEIRO);
		const apagadas = progresso.recomecarTrilha("leis");
		progresso.anotarEntradaNaConta();
		progresso.encerrarProgressoNaConta();
		progresso.restaurarLidos(apagadas);
		expect(progresso.lerLidos().size).toBe(0);
		expect(localStorage.length).toBe(0);
	});

	it("aguarda o POST de outra aba antes de enviar o recomeço", async () => {
		instalarTravaEntreAbas();
		progresso.anotarEntradaNaConta();
		await visitar();
		const primeiraAba = progresso;
		await visitar();
		await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(2));
		const gravacao = adiarResposta();
		alterar.mockReturnValueOnce(gravacao.promise);
		primeiraAba.marcarLido(PRIMEIRO);
		await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(1));
		expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO]));
		progresso.recomecarTrilha("leis");
		try {
			expect(progresso.lerLidos().size).toBe(0);
			await aguardarTurno();
			expect(alterar).toHaveBeenCalledTimes(1);
		} finally {
			gravacao.resolve(resposta(PRIMEIRO));
		}
		await vi.waitFor(() => {
			expect(alterar).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					body: { marcar: [], desmarcar: [PRIMEIRO] },
				}),
			);
		});
		expect(progresso.lerLidos().size).toBe(0);
	});

	it("lê e consome a união de visitante sob a mesma trava nas duas abas", async () => {
		instalarTravaEntreAbas();
		progresso.marcarLido(PRIMEIRO);
		progresso.anotarEntradaNaConta();
		const uniao = adiarResposta();
		alterar.mockReturnValueOnce(uniao.promise);
		await visitar();
		await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(1));
		consultar.mockResolvedValueOnce(resposta(PRIMEIRO));
		await visitar();
		try {
			await aguardarTurno();
			expect(alterar).toHaveBeenCalledTimes(1);
			expect(consultar).not.toHaveBeenCalled();
			expect(localStorage.getItem(CHAVE_VISITANTE)).not.toBeNull();
		} finally {
			uniao.resolve(resposta(PRIMEIRO));
		}
		await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(1));
		expect(alterar).toHaveBeenCalledTimes(1);
		expect(localStorage.getItem(CHAVE_VISITANTE)).toBeNull();
	});

	it("libera a trava para outra aba quando o prazo do pedido acaba", async () => {
		instalarTravaEntreAbas();
		progresso.anotarEntradaNaConta();
		await visitar();
		const primeiraAba = progresso;
		await visitar();
		await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(2));
		const prazo = new AbortController();
		const prazoDePedido = vi
			.spyOn(AbortSignal, "timeout")
			.mockReturnValueOnce(prazo.signal);
		alterar.mockImplementationOnce(
			({ signal }: { signal: AbortSignal }) =>
				new Promise((_, rejeitar) => {
					signal.addEventListener("abort", () => rejeitar(signal.reason), {
						once: true,
					});
				}),
		);
		primeiraAba.marcarLido(PRIMEIRO);
		await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(1));
		expect(prazoDePedido).toHaveBeenCalledWith(10_000);
		progresso.marcarLido(SEGUNDO);
		try {
			await aguardarTurno();
			expect(alterar).toHaveBeenCalledTimes(1);
		} finally {
			prazo.abort(new DOMException("Prazo do teste", "TimeoutError"));
		}
		await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(2));
	});

	it("relê ao voltar à aba e conserva as ações da aba enquanto a resposta está pendente", async () => {
		const visibilidade = vi.spyOn(document, "visibilityState", "get");
		progresso.anotarEntradaNaConta();
		await visitar();
		await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(1));
		const leitura = adiarResposta();
		const gravacao = adiarResposta();
		consultar.mockReturnValueOnce(leitura.promise);
		alterar.mockReturnValueOnce(gravacao.promise);
		visibilidade.mockReturnValue("hidden");
		voltarParaAba();
		await aguardarTurno();
		expect(consultar).toHaveBeenCalledTimes(1);
		visibilidade.mockReturnValue("visible");
		voltarParaAba();
		await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(2));
		progresso.marcarLido(PRIMEIRO);
		leitura.resolve(resposta(OUTRA_TRILHA));
		try {
			await vi.waitFor(() => {
				expect(progresso.lerLidos()).toEqual(new Set([OUTRA_TRILHA, PRIMEIRO]));
				expect(alterar).toHaveBeenCalledTimes(1);
			});
		} finally {
			gravacao.resolve(resposta(OUTRA_TRILHA, PRIMEIRO));
		}
	});

	it("uma releitura espera o POST da outra aba e mantém a marca enquanto espera", async () => {
		instalarTravaEntreAbas();
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
		progresso.anotarEntradaNaConta();
		await visitar();
		const primeiraAba = progresso;
		await visitar();
		await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(2));
		const gravacao = adiarResposta();
		alterar.mockReturnValueOnce(gravacao.promise);
		consultar.mockResolvedValueOnce(resposta(PRIMEIRO, OUTRA_TRILHA));
		primeiraAba.marcarLido(PRIMEIRO);
		await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(1));
		voltarParaAba();
		try {
			await aguardarTurno();
			expect(consultar).toHaveBeenCalledTimes(2);
			expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO]));
		} finally {
			gravacao.resolve(resposta(PRIMEIRO));
		}
		await vi.waitFor(() => {
			expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO, OUTRA_TRILHA]));
			expect(consultar).toHaveBeenCalledTimes(3);
		});
	});

	it.each(["antes", "depois"])(
		"a segunda aba relê sem apagar uma ação enfileirada %s do gatilho",
		async (quando) => {
			instalarTravaEntreAbas();
			vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
			progresso.anotarEntradaNaConta();
			await visitar();
			const primeiraAba = progresso;
			await visitar();
			await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(2));
			const primeira = adiarResposta();
			const proxima = adiarResposta();
			const leitura = adiarResposta();
			alterar
				.mockReturnValueOnce(primeira.promise)
				.mockReturnValueOnce(proxima.promise);
			consultar.mockReturnValueOnce(leitura.promise);
			primeiraAba.marcarLido(PRIMEIRO);
			await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(1));
			if (quando === "antes") primeiraAba.marcarLido(SEGUNDO);
			voltarParaAba();
			if (quando === "depois") primeiraAba.marcarLido(SEGUNDO);
			primeira.resolve(resposta(PRIMEIRO));
			try {
				if (quando === "antes") {
					await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(2));
					expect(consultar).toHaveBeenCalledTimes(2);
					proxima.resolve(resposta(PRIMEIRO, SEGUNDO));
				}
				await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(3));
				leitura.resolve(
					quando === "antes" ? resposta(PRIMEIRO, SEGUNDO) : resposta(PRIMEIRO),
				);
				await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(2));
				expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO, SEGUNDO]));
			} finally {
				proxima.resolve(resposta(PRIMEIRO, SEGUNDO));
				leitura.resolve(resposta(PRIMEIRO, SEGUNDO));
			}
		},
	);

	it.each([429, 500, 503, "rede", "prazo"])(
		"guarda uma falha %s até a próxima ação e envia os dois artigos",
		async (erro) => {
			progresso.anotarEntradaNaConta();
			await visitar();
			await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(1));
			if (typeof erro === "number") alterar.mockResolvedValueOnce(falha(erro));
			else if (erro === "rede")
				alterar.mockRejectedValueOnce(new TypeError("Falha de rede"));
			else
				alterar.mockRejectedValueOnce(
					new DOMException("Prazo", "TimeoutError"),
				);
			progresso.marcarLido(PRIMEIRO);
			await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(1));
			await aguardarTurno();
			expect(alterar).toHaveBeenCalledTimes(1);
			progresso.marcarLido(SEGUNDO);
			await vi.waitFor(() => {
				expect(alterar).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						body: { marcar: [PRIMEIRO, SEGUNDO], desmarcar: [] },
					}),
				);
			});
		},
	);

	it.each([409, 422])(
		"descarta o lote recusado (%s) e envia a ação seguinte",
		async (status) => {
			progresso.anotarEntradaNaConta();
			await visitar();
			await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(1));
			alterar.mockResolvedValueOnce(falha(status));
			progresso.marcarLido(PRIMEIRO);
			await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(1));
			await aguardarTurno();
			progresso.marcarLido(SEGUNDO);
			await vi.waitFor(() => {
				expect(alterar).toHaveBeenNthCalledWith(
					2,
					expect.objectContaining({
						body: { marcar: [SEGUNDO], desmarcar: [] },
					}),
				);
			});
		},
	);

	it("uma ação mais nova no mesmo artigo substitui a que falhou enquanto estava em voo", async () => {
		progresso.anotarEntradaNaConta();
		await visitar();
		await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(1));
		let rejeitar!: (erro: Error) => void;
		alterar.mockReturnValueOnce(
			new Promise((_, rejeita) => {
				rejeitar = rejeita;
			}),
		);
		progresso.marcarLido(PRIMEIRO);
		await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(1));
		progresso.desmarcarLido(PRIMEIRO);
		rejeitar(new Error("Falha de rede"));
		await vi.waitFor(() => {
			expect(alterar).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					body: { marcar: [], desmarcar: [PRIMEIRO] },
				}),
			);
		});
	});

	it("a releitura é um gatilho para tentar a escrita que falhou", async () => {
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
		progresso.anotarEntradaNaConta();
		await visitar();
		await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(1));
		alterar
			.mockResolvedValueOnce(falha(503))
			.mockResolvedValueOnce(resposta(PRIMEIRO));
		progresso.marcarLido(PRIMEIRO);
		await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(1));
		await aguardarTurno();
		voltarParaAba();
		await vi.waitFor(() => {
			expect(consultar).toHaveBeenCalledTimes(2);
			expect(alterar).toHaveBeenCalledTimes(2);
		});
		expect(progresso.lerLidos()).toEqual(new Set([PRIMEIRO]));
	});

	it.each([
		{
			caso: "uma releitura de outra aba não cancela a nova tentativa do artigo",
			substituiu: false,
		},
		{
			caso: "uma ação mais nova de outra aba substitui a retentativa do artigo",
			substituiu: true,
		},
	])("$caso", async ({ substituiu }) => {
		instalarTravaEntreAbas();
		vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
		progresso.anotarEntradaNaConta();
		await visitar();
		const primeiraAba = progresso;
		await visitar();
		await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(2));
		alterar.mockResolvedValueOnce(falha(503));
		primeiraAba.marcarLido(PRIMEIRO);
		await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(1));
		await aguardarTurno();
		if (substituiu) {
			progresso.desmarcarLido(PRIMEIRO);
			await vi.waitFor(() => expect(alterar).toHaveBeenCalledTimes(2));
		}
		voltarParaAba();
		await vi.waitFor(() => expect(consultar).toHaveBeenCalledTimes(3));
		await aguardarTurno();
		const esperados = substituiu ? [] : [PRIMEIRO];
		expect(primeiraAba.lerLidos()).toEqual(new Set(esperados));
		primeiraAba.marcarLido(SEGUNDO);
		esperados.push(SEGUNDO);
		await vi.waitFor(() => {
			expect(alterar).toHaveBeenNthCalledWith(
				substituiu ? 3 : 2,
				expect.objectContaining({
					body: { marcar: esperados, desmarcar: [] },
				}),
			);
		});
		expect(primeiraAba.lerLidos()).toEqual(new Set(esperados));
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
		await aguardarTurno();
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
