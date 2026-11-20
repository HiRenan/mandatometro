import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	edicaoDeExemplo,
	listaDeExemplo,
} from "@/lib/edicoes/exemplos-de-teste";

// A API é um endereço de mentira, e o fetch é simulado, como no
// edicoes.server.test.ts. O busca.server.ts guarda o índice na memória do
// módulo: cada teste importa um módulo novo, sem a memória do anterior.
const ambiente = vi.hoisted(() => ({ API_URL: "https://api.exemplo.test" }));
vi.mock("@/env", () => ({ ENV: ambiente }));

async function servidorNovo() {
	vi.resetModules();
	return import("./busca.server");
}

/** A API com duas edições por padrão; `estado.fora` derruba a API. */
function api(
	lista: unknown = listaDeExemplo(2),
	detalhe = (id: number): unknown => ({ ...edicaoDeExemplo(), id }),
) {
	const estado = { fora: false };
	const fetch = vi.fn(async (pedido: Request) => {
		if (estado.fora) {
			throw new TypeError("connect ECONNREFUSED");
		}
		const { pathname } = new URL(pedido.url);
		const corpo =
			pathname === "/edicoes"
				? lista
				: detalhe(Number(pathname.split("/").at(-1)));
		return new Response(JSON.stringify(corpo), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	});
	vi.stubGlobal("fetch", fetch);
	return { fetch, estado };
}

async function confereRespostaInvalida(leitura: Promise<unknown>) {
	await expect(leitura).rejects.toHaveProperty(
		"message",
		"As edições não carregaram.",
	);
	expect(vi.mocked(console.error).mock.calls).toEqual([
		["[edicoes] A leitura das edições na API falhou: resposta-invalida."],
	]);
}

beforeEach(() => {
	ambiente.API_URL = "https://api.exemplo.test";
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("o índice das edições", () => {
	it("tem uma página por edição, com o período e uma seção por item, que leva a ele", async () => {
		api();
		const { indiceDasEdicoes } = await servidorNovo();

		const indice = await indiceDasEdicoes();

		expect(indice.tipo).toBe("edicoes");
		const [pagina] = indice.tipo === "edicoes" ? indice.paginas : [];
		expect(pagina).toEqual({
			tipo: "edicao",
			endereco: "/edicoes/2",
			titulo: "Jornal legislativo — 09 a 15/11/2026",
			resumo: "9 a 15 de novembro de 2026",
			abertura:
				"Câmara aprova a semana das bibliotecas escolares · Senado vota um requerimento · Um item de uma edição antiga",
			inicio: "2026-11-09",
			fim: "2026-11-15",
			secoes: [
				{
					id: "item-1",
					titulo: "Câmara aprova a semana das bibliotecas escolares",
					texto:
						"O projeto cria uma semana dedicada às bibliotecas das escolas públicas. Agora o texto segue para o Senado, que pode aprovar, mudar ou rejeitar.",
				},
				{
					id: "item-2",
					titulo: "Senado vota um requerimento",
					texto:
						"O Senado votou um pedido sobre a ordem dos trabalhos da semana.",
				},
				{
					id: "item-3",
					titulo: "Um item de uma edição antiga",
					texto:
						"Este item saiu antes de a edição guardar os fatos da votação.",
				},
			],
		});
	});

	it("leva o título e o texto de um ato, com o link dele", async () => {
		const ato = {
			...edicaoDeExemplo().itens[0],
			titulo: "Decreto altera o calendário de publicações",
			texto: "O ato muda as datas de publicação dos boletins.",
			fatos: { data_publicacao: "2026-11-12", votacoes: [] },
		};
		api(listaDeExemplo(1), (id) => ({
			...edicaoDeExemplo(),
			id,
			itens: [ato],
		}));
		const { indiceDasEdicoes } = await servidorNovo();

		expect(await indiceDasEdicoes()).toMatchObject({
			tipo: "edicoes",
			paginas: [
				{
					endereco: "/edicoes/1",
					secoes: [{ id: "item-1", titulo: ato.titulo, texto: ato.texto }],
				},
			],
		});
	});

	it("uma entrada nula na lista dá o erro de resposta inválida", async () => {
		api({ ...listaDeExemplo(1), edicoes: [null] });
		const { indiceDasEdicoes } = await servidorNovo();

		await confereRespostaInvalida(indiceDasEdicoes());
	});

	it.each([
		["texto nulo", { texto: null }],
		["título como objeto", { titulo: { detalhe: "dado interno inventado" } }],
	])("um item com %s dá o erro de resposta inválida", async (_, dados) => {
		api(listaDeExemplo(1), (id) => {
			const edicao = edicaoDeExemplo();
			return { ...edicao, id, itens: [{ ...edicao.itens[0], ...dados }] };
		});
		const { indiceDasEdicoes } = await servidorNovo();

		await confereRespostaInvalida(indiceDasEdicoes());
	});

	it("sem o API_URL, diz que não há edições, sem pedir nada", async () => {
		ambiente.API_URL = "";
		const { fetch } = api();
		const { indiceDasEdicoes } = await servidorNovo();

		expect(await indiceDasEdicoes()).toEqual({ tipo: "sem-api" });
		expect(fetch).not.toHaveBeenCalled();
	});

	it("guarda o índice por 5 minutos, e depois lê de novo", async () => {
		vi.useFakeTimers();
		const { fetch } = api();
		const { indiceDasEdicoes, TEMPO_NA_MEMORIA } = await servidorNovo();

		await indiceDasEdicoes();
		await vi.advanceTimersByTimeAsync(TEMPO_NA_MEMORIA - 1);
		await indiceDasEdicoes();

		expect(TEMPO_NA_MEMORIA).toBe(5 * 60 * 1000);
		expect(fetch).toHaveBeenCalledTimes(3);

		await vi.advanceTimersByTimeAsync(1);
		await indiceDasEdicoes();

		expect(fetch).toHaveBeenCalledTimes(6);
	});

	it("a falha não fica guardada: o pedido seguinte tenta de novo", async () => {
		const { fetch, estado } = api();
		const { indiceDasEdicoes } = await servidorNovo();
		estado.fora = true;

		await expect(indiceDasEdicoes()).rejects.toThrow(
			"As edições não carregaram.",
		);
		estado.fora = false;

		expect((await indiceDasEdicoes()).tipo).toBe("edicoes");
		expect(fetch).toHaveBeenCalledTimes(4);
	});

	it("dois pedidos ao mesmo tempo esperam a mesma leitura", async () => {
		const { fetch } = api();
		const { indiceDasEdicoes } = await servidorNovo();

		const [primeiro, segundo] = await Promise.all([
			indiceDasEdicoes(),
			indiceDasEdicoes(),
		]);

		expect(segundo).toBe(primeiro);
		expect(fetch).toHaveBeenCalledTimes(3);
	});
});
