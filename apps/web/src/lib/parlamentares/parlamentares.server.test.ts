import { isNotFound } from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEMPO_DE_ESPERA } from "@/lib/edicoes/edicoes.server";
import {
	correcaoDeExemplo,
	detalheDeExemplo,
	eleicaoDeExemplo,
	listaDeExemplo,
	patrimonioDeExemplo,
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

/**
 * A API de um parlamentar: o detalhe, que `detalhe` pode trocar, a página de
 * votos pedida, de `total` votos, e o patrimônio declarado, que `patrimonio`
 * pode trocar, como por uma falha.
 */
function apiDoParlamentar(
	total: number,
	patrimonio: (pedido: Request) => Response | Promise<Response> = () =>
		json(200, patrimonioDeExemplo()),
	detalhe: unknown = detalheDeExemplo(),
) {
	return api((pedido) => {
		const endereco = new URL(pedido.url);
		if (endereco.pathname.endsWith("/votos")) {
			const deslocamento = Number(endereco.searchParams.get("deslocamento"));
			return json(200, votosDeExemplo(total, deslocamento));
		}
		if (endereco.pathname.endsWith("/patrimonio")) {
			return patrimonio(pedido);
		}
		return json(200, detalhe);
	});
}

/** As eleições de exemplo com um campo trocado, no corpo que a API manda. */
function comEleicao(mudancas: Record<string, unknown>) {
	return () =>
		json(200, {
			...patrimonioDeExemplo(),
			eleicoes: [{ ...eleicaoDeExemplo(), ...mudancas }],
		});
}

/** A variação de 2018 de exemplo, com um campo trocado. */
function comVariacao(mudancas: Record<string, unknown>) {
	return comEleicao({
		variacao: {
			ano_anterior: 2014,
			diferenca_centavos: 74_787_700,
			percentual: "212.4",
			...mudancas,
		},
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
	it("pede o parlamentar, a primeira página de votos e o patrimônio ao mesmo tempo", async () => {
		const { pedidos } = apiDoParlamentar(25);

		const pagina = await lerParlamentar("81-agata-cedrolume", 1);

		expect(pedidos.map((pedido) => pedido.url).sort()).toEqual([
			"https://api.exemplo.test/parlamentares/81",
			"https://api.exemplo.test/parlamentares/81/patrimonio",
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
		const { eleicoes, correcao_ipca } = patrimonioDeExemplo();
		expect(pagina.tipo === "parlamentar" && pagina.patrimonio).toEqual({
			tipo: "patrimonio",
			eleicoes,
			correcao: correcao_ipca,
		});
		expect(erros).not.toHaveBeenCalled();
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

describe("a foto oficial na página do parlamentar", () => {
	const FOTO_DA_CAMARA =
		"https://www.camara.leg.br/internet/deputado/bandep/90000123.jpg";
	const FOTO_DO_SENADO =
		"https://legis.senado.leg.br/senadores/fotos-oficiais/90000124";

	it("a foto das duas Casas chega à página no endereço e com o crédito de cada uma, fora dos dados da pessoa", async () => {
		apiDoParlamentar(3);
		const deputada = await lerParlamentar("81", 1);

		expect(deputada.tipo === "parlamentar" && deputada.foto).toEqual({
			url: FOTO_DA_CAMARA,
			credito: "Câmara dos Deputados",
		});
		expect(
			deputada.tipo === "parlamentar" && "foto" in deputada.parlamentar,
		).toBe(false);

		apiDoParlamentar(
			3,
			undefined,
			detalheDeExemplo({ id: 501, nome: "Lia Quinemar", casa: "senado" }),
		);
		const senadora = await lerParlamentar("501", 1);

		expect(senadora.tipo === "parlamentar" && senadora.foto).toEqual({
			url: FOTO_DO_SENADO,
			credito: "Senado Federal",
		});
		expect(erros).not.toHaveBeenCalled();
	});

	const fotos = [
		["em http", { url: FOTO_DA_CAMARA.replace("https:", "http:") }],
		[
			"de outro site",
			{ url: FOTO_DA_CAMARA.replace("leg.br/", "leg.br.exemplo.test/") },
		],
		["em outro caminho", { url: FOTO_DA_CAMARA.replace(".jpg", ".png") }],
		[
			"com volta no caminho",
			{ url: FOTO_DA_CAMARA.replace("bandep/", "bandep/../../outra/") },
		],
		["com busca", { url: `${FOTO_DA_CAMARA}?tamanho=grande` }],
		["com âncora", { url: `${FOTO_DA_CAMARA}#rosto` }],
		[
			"fora da forma exata do endereço",
			{ url: FOTO_DA_CAMARA.replace("https://www.", "HTTPS://WWW.") },
		],
		["com porta", { url: FOTO_DA_CAMARA.replace("leg.br/", "leg.br:8443/") }],
		[
			"com usuário",
			{ url: FOTO_DA_CAMARA.replace("https://", "https://quem@") },
		],
		[
			"com senha",
			{ url: FOTO_DA_CAMARA.replace("https://", "https://:senha@") },
		],
		["com o crédito trocado", { credito: "Senado Federal" }],
		["da outra Casa", { url: FOTO_DO_SENADO, credito: "Senado Federal" }],
		["com o endereço em número", { url: 90000123 }],
		["com um texto que não é endereço", { url: "não é um endereço" }],
	] as const;

	it.each(fotos)(
		"a foto %s fica de fora, com a linha fixa no log, sem o endereço, e a página abre inteira",
		async (_, mudancas) => {
			const detalhe = detalheDeExemplo();
			apiDoParlamentar(3, undefined, {
				...detalhe,
				foto: { ...detalhe.foto, ...mudancas },
			});

			const pagina = await lerParlamentar("81", 1);

			expect(pagina).toMatchObject({
				tipo: "parlamentar",
				parlamentar: { id: 81 },
				foto: null,
				total: 3,
				patrimonio: { tipo: "patrimonio" },
			});
			expect(erros.mock.calls).toEqual([
				["[parlamentares] A foto não veio no formato esperado."],
			]);
		},
	);

	it("a foto que não é objeto também fica de fora, com a linha fixa", async () => {
		apiDoParlamentar(3, undefined, {
			...detalheDeExemplo(),
			foto: FOTO_DA_CAMARA,
		});

		expect(await lerParlamentar("81", 1)).toMatchObject({ foto: null });
		expect(erros.mock.calls).toEqual([
			["[parlamentares] A foto não veio no formato esperado."],
		]);
	});

	it("sem a foto nos dados, como na API antes da #291, a página abre sem ela e sem linha no log", async () => {
		const { foto: _, ...semFoto } = detalheDeExemplo();
		for (const detalhe of [semFoto, { ...semFoto, foto: null }]) {
			apiDoParlamentar(3, undefined, detalhe);

			expect(await lerParlamentar("81", 1)).toMatchObject({
				tipo: "parlamentar",
				foto: null,
			});
		}
		expect(erros).not.toHaveBeenCalled();
	});
});

describe("o patrimônio declarado na página do parlamentar", () => {
	it("sem os campos novos, como na API antes da #291, cada um vale nulo, e o bloco abre sem linha no log", async () => {
		const {
			resultado: _r,
			fator_ipca: _f,
			alta_ipca_percentual: _a,
			variacao: _v,
			...semOsNovos
		} = eleicaoDeExemplo();
		apiDoParlamentar(3, () =>
			json(200, { ...patrimonioDeExemplo(), eleicoes: [semOsNovos] }),
		);

		const pagina = await lerParlamentar("81", 1);

		expect(pagina.tipo === "parlamentar" && pagina.patrimonio).toEqual({
			tipo: "patrimonio",
			eleicoes: [
				{
					...semOsNovos,
					resultado: null,
					fator_ipca: null,
					alta_ipca_percentual: null,
					variacao: null,
				},
			],
			correcao: correcaoDeExemplo(),
		});
		expect(erros).not.toHaveBeenCalled();
	});

	it("sem a série do IPCA, a correção fica nula; sem eleição ligada à pessoa, a lista fica vazia", async () => {
		apiDoParlamentar(3, () => json(200, { eleicoes: [], correcao_ipca: null }));

		const pagina = await lerParlamentar("81", 1);

		expect(pagina.tipo === "parlamentar" && pagina.patrimonio).toEqual({
			tipo: "patrimonio",
			eleicoes: [],
			correcao: null,
		});
		expect(erros).not.toHaveBeenCalled();
	});

	const falhas = [
		["o 500", () => json(500, { detalhe: MENSAGEM_DA_FALHA }), "http-500"],
		["o 503", () => json(503, { detalhe: MENSAGEM_DA_FALHA }), "http-503"],
		[
			"o 404 com a pessoa na API",
			() => json(404, { detail: MENSAGEM_DA_FALHA }),
			"http-404",
		],
		[
			"a conexão recusada",
			() => {
				throw new TypeError(MENSAGEM_DA_FALHA);
			},
			"sem-resposta",
		],
		[
			"o corpo em outro formato",
			() => json(200, { eleicoes: "SELECT", correcao_ipca: null }),
			"resposta-invalida",
		],
		[
			"um total negativo",
			() =>
				json(
					200,
					patrimonioDeExemplo({
						eleicoes: [eleicaoDeExemplo({ total_centavos: -1 })],
					}),
				),
			"resposta-invalida",
		],
		[
			"um total com fração de centavo",
			() =>
				json(
					200,
					patrimonioDeExemplo({
						eleicoes: [eleicaoDeExemplo({ total_corrigido_centavos: 10.5 })],
					}),
				),
			"resposta-invalida",
		],
		[
			"um estado que não existe",
			() =>
				json(200, {
					...patrimonioDeExemplo(),
					eleicoes: [{ ...eleicaoDeExemplo(), uf: "XX" }],
				}),
			"resposta-invalida",
		],
		[
			"o cargo sem nome",
			() =>
				json(
					200,
					patrimonioDeExemplo({
						eleicoes: [eleicaoDeExemplo({ cargo: { codigo: 6, nome: " " } })],
					}),
				),
			"resposta-invalida",
		],
		[
			"um mês fora do calendário",
			() =>
				json(
					200,
					patrimonioDeExemplo({
						correcao_ipca: correcaoDeExemplo({ mes_fim: "2026-13" }),
					}),
				),
			"resposta-invalida",
		],
		[
			"uma coleta do TSE com texto em vez de data e hora",
			() => {
				const eleicao = eleicaoDeExemplo();
				return json(
					200,
					patrimonioDeExemplo({
						eleicoes: [
							{
								...eleicao,
								fonte: { ...eleicao.fonte, coletado_em: "data inválida" },
							},
						],
					}),
				);
			},
			"resposta-invalida",
		],
		[
			"uma coleta do IPCA num dia que não existe",
			() => {
				const correcao = correcaoDeExemplo();
				return json(
					200,
					patrimonioDeExemplo({
						correcao_ipca: {
							...correcao,
							fonte: {
								...correcao.fonte,
								coletado_em: "2026-02-30T01:30:00Z",
							},
						},
					}),
				);
			},
			"resposta-invalida",
		],
		[
			"uma coleta do IPCA sem horário",
			() => {
				const correcao = correcaoDeExemplo();
				return json(
					200,
					patrimonioDeExemplo({
						correcao_ipca: {
							...correcao,
							fonte: { ...correcao.fonte, coletado_em: "2026-11-20" },
						},
					}),
				);
			},
			"resposta-invalida",
		],
		[
			"outro índice",
			() =>
				json(200, {
					...patrimonioDeExemplo(),
					correcao_ipca: { ...correcaoDeExemplo(), indice: "INPC" },
				}),
			"resposta-invalida",
		],
		[
			"o cargo sem o código",
			comEleicao({ cargo: { nome: "Deputado federal" } }),
			"resposta-invalida",
		],
		[
			"um resultado fora da lista",
			comEleicao({ resultado: "eleita" }),
			"resposta-invalida",
		],
		[
			"o fator com duas casas",
			comEleicao({ fator_ipca: "1.35" }),
			"resposta-invalida",
		],
		[
			"o fator em número, e não em texto",
			comEleicao({ fator_ipca: 1.354 }),
			"resposta-invalida",
		],
		[
			"o fator negativo",
			comEleicao({ fator_ipca: "-1.3540" }),
			"resposta-invalida",
		],
		[
			"o fator grande demais para a conta exata",
			comEleicao({ fator_ipca: "900719925474.0993" }),
			"resposta-invalida",
		],
		[
			"a alta com duas casas",
			comEleicao({ alta_ipca_percentual: "35.40" }),
			"resposta-invalida",
		],
		[
			"a alta com o sinal de mais",
			comEleicao({ alta_ipca_percentual: "+35.4" }),
			"resposta-invalida",
		],
		[
			"a variação em texto",
			comEleicao({ variacao: "+212.4%" }),
			"resposta-invalida",
		],
		[
			"a variação para uma eleição que não é anterior",
			comVariacao({ ano_anterior: 2018 }),
			"resposta-invalida",
		],
		[
			"a diferença com fração de centavo",
			comVariacao({ diferenca_centavos: 10.5 }),
			"resposta-invalida",
		],
		[
			"o percentual sem a casa decimal",
			comVariacao({ percentual: "212" }),
			"resposta-invalida",
		],
		[
			"a variação sem o percentual",
			comVariacao({ percentual: undefined }),
			"resposta-invalida",
		],
	] as const;

	it.each(falhas)(
		"só o patrimônio falha, com %s: a página abre, o bloco fica indisponível e o log tem só a linha fixa",
		async (_, responder, motivo) => {
			apiDoParlamentar(3, responder);

			const pagina = await lerParlamentar("81", 1);

			expect(pagina).toMatchObject({
				tipo: "parlamentar",
				total: 3,
				patrimonio: { tipo: "indisponivel" },
			});
			expect(erros.mock.calls).toEqual([
				[`[parlamentares] O patrimônio não carregou: ${motivo}.`],
			]);
			const registrado = JSON.stringify([erros.mock.calls, pagina]);
			for (const segredo of SEGREDOS) {
				expect(registrado, segredo).not.toContain(segredo);
			}
		},
	);

	it("o patrimônio que não chega no tempo fica indisponível, e a página abre", async () => {
		vi.useFakeTimers();
		apiDoParlamentar(
			3,
			(pedido) =>
				new Promise((_, recusar) => {
					pedido.signal.addEventListener("abort", () =>
						recusar(new DOMException(MENSAGEM_DA_FALHA, "AbortError")),
					);
				}),
		);

		const leitura = lerParlamentar("81", 1);
		await vi.advanceTimersByTimeAsync(TEMPO_DE_ESPERA);

		expect(await leitura).toMatchObject({
			tipo: "parlamentar",
			patrimonio: { tipo: "indisponivel" },
		});
		expect(erros.mock.calls).toEqual([
			["[parlamentares] O patrimônio não carregou: tempo-esgotado."],
		]);
	});

	it("a pessoa que não existe dá a página não encontrada, sem uma linha do patrimônio no log", async () => {
		api(() => json(404, { erro: "parlamentar_nao_encontrado" }));

		expect(isNotFound(await erroDe(lerParlamentar("81", 1)))).toBe(true);
		expect(erros).not.toHaveBeenCalled();
	});

	it("a página que falha inteira registra só a falha da página", async () => {
		api(() => json(500, { detalhe: MENSAGEM_DA_FALHA }));

		confereErroGenerico(await erroDe(lerParlamentar("81", 1)), "http-500");
		expect(erros.mock.calls).toEqual([
			["[parlamentares] A leitura na API falhou: http-500."],
		]);
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
