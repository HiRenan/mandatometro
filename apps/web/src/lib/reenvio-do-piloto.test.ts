// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PedidoTentativaPiloto } from "@/client";
import { enviarEtapa, type ResultadoDoEnvio } from "./envio-do-piloto";
import {
	comecarComoOutraPessoa,
	comecarPiloto,
	concluirEtapa,
	lerPiloto,
	type Piloto,
	proximoPedido,
	registrarResposta,
} from "./piloto";
import {
	abrirPagina,
	type EstadoDoEnvio,
	enviarPendentes,
	esquecerEnvio,
	lerEnvio,
	situacaoDoEnvio,
	tentarDeNovo,
	useEnvioDoPiloto,
} from "./reenvio-do-piloto";

// O cliente da API lê o endereço dela ao ser importado, e o ENV do varlock só
// existe no site. O envio de verdade fica para o envio-do-piloto.test.ts: aqui,
// cada envio responde o que o teste mandar.
vi.mock("@/env", () => ({ ENV: { API_URL: "https://api.exemplo.test" } }));
vi.mock("./envio-do-piloto", async (original) => ({
	...(await original<typeof import("./envio-do-piloto")>()),
	enviarEtapa: vi.fn(),
}));

const enviar = vi.mocked(enviarEtapa);
let fechar: (() => void) | undefined;

beforeEach(() => {
	vi.useFakeTimers();
	enviar.mockReset();
});

afterEach(() => {
	cleanup();
	fechar?.();
	fechar = undefined;
	esquecerEnvio();
	vi.useRealTimers();
	localStorage.clear();
});

/** Cada envio responde o próximo resultado da lista; o último se repete. */
function respostas(...resultados: ResultadoDoEnvio[]) {
	for (const resultado of resultados) {
		enviar.mockResolvedValueOnce(resultado);
	}
	enviar.mockResolvedValue(resultados[resultados.length - 1]);
}

/** Um envio que só responde quando o teste mandar. */
function respostaPresa() {
	let responder: (resultado: ResultadoDoEnvio) => void = () => {};
	enviar.mockReturnValueOnce(
		new Promise((resolver) => {
			responder = resolver;
		}),
	);
	return (resultado: ResultadoDoEnvio) => responder(resultado);
}

/** O pedido de cada envio, na ordem. */
function enviados(): PedidoTentativaPiloto[] {
	return enviar.mock.calls.map(([pedido]) => pedido);
}

/** O antes concluído, à espera do envio. Devolve o pedido dele. */
function antesConcluido(acertos = 5): PedidoTentativaPiloto {
	comecarPiloto();
	concluirEtapa("antes", acertos);
	return proximoPedido() as PedidoTentativaPiloto;
}

/** Deixa as promessas andarem, sem passar o relógio. */
async function esperar() {
	await vi.advanceTimersByTimeAsync(0);
}

describe("o envio das etapas", () => {
	it("manda a etapa concluída e guarda que a API recebeu", async () => {
		const pedido = antesConcluido(5);
		respostas({ tipo: "recebida" });

		await enviarPendentes();

		expect(enviados()).toEqual([pedido]);
		expect(lerPiloto()).toMatchObject({ antes: { situacao: "recebida" } });
		expect(lerEnvio()).toEqual({ desfechos: { antes: "recebida" } });
	});

	it("manda o antes e depois o depois, um de cada vez, com o mesmo código", async () => {
		const antes = antesConcluido(5);
		concluirEtapa("depois", 9);
		respostas({ tipo: "recebida" });

		await enviarPendentes();

		expect(enviados()).toEqual([
			antes,
			{ ...antes, etapa: "depois", acertos: 9 },
		]);
		expect(lerPiloto()).toEqual({ fase: "concluido" });
		expect(lerEnvio().desfechos).toEqual({
			antes: "recebida",
			depois: "recebida",
		});
	});

	it("sem etapa concluída, não manda nada", async () => {
		await enviarPendentes();
		comecarPiloto();
		await enviarPendentes();

		expect(enviar).not.toHaveBeenCalled();
	});

	it("com o piloto encerrado (410), não manda mais nada", async () => {
		antesConcluido();
		concluirEtapa("depois", 9);
		respostas({ tipo: "encerrado" });

		await enviarPendentes();

		expect(enviar).toHaveBeenCalledTimes(1);
		expect(lerPiloto()).toEqual({ fase: "encerrado" });
		expect(lerEnvio().desfechos).toEqual({ antes: "encerrado" });
	});

	it("com o pedido recusado (413 ou 422), não repete e segue para a outra etapa", async () => {
		fechar = abrirPagina();
		antesConcluido();
		concluirEtapa("depois", 9);
		respostas({ tipo: "recusado" }, { tipo: "recebida" });

		await enviarPendentes();

		expect(enviar).toHaveBeenCalledTimes(2);
		expect(lerEnvio().desfechos).toEqual({
			antes: "recusado",
			depois: "recebida",
		});
		expect(vi.getTimerCount()).toBe(0);
	});

	it("fora do ar (503), repete o mesmo pedido em 5, 15, 30 e 60 segundos, e depois a cada minuto", async () => {
		fechar = abrirPagina();
		const pedido = antesConcluido();
		respostas({ tipo: "fora-do-ar" });

		await enviarPendentes();
		expect(lerEnvio().agora).toEqual({ tipo: "fora-do-ar" });

		for (const [segundos, vezes] of [
			[5, 2],
			[15, 3],
			[30, 4],
			[60, 5],
			[60, 6],
		]) {
			await vi.advanceTimersByTimeAsync(segundos * 1000 - 1);
			expect(enviar).toHaveBeenCalledTimes(vezes - 1);
			await vi.advanceTimersByTimeAsync(1);
			expect(enviar).toHaveBeenCalledTimes(vezes);
		}
		expect(
			new Set(enviados().map((enviado) => JSON.stringify(enviado))),
		).toEqual(new Set([JSON.stringify(pedido)]));
	});

	it("no limite (429), espera os segundos do Retry-After e, sem eles, um minuto", async () => {
		fechar = abrirPagina();
		antesConcluido();
		respostas({ tipo: "limite", segundos: 42 }, { tipo: "limite" });

		await enviarPendentes();
		expect(lerEnvio().agora).toEqual({ tipo: "limite", segundos: 42 });
		await vi.advanceTimersByTimeAsync(41_999);
		expect(enviar).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(enviar).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(59_999);
		expect(enviar).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(enviar).toHaveBeenCalledTimes(3);
	});

	it("sem conexão, manda de novo quando a internet volta", async () => {
		fechar = abrirPagina();
		antesConcluido();
		respostas({ tipo: "sem-conexao" }, { tipo: "recebida" });

		await enviarPendentes();
		expect(lerEnvio().agora).toEqual({ tipo: "sem-conexao" });
		window.dispatchEvent(new Event("online"));
		await esperar();

		expect(enviar).toHaveBeenCalledTimes(2);
		expect(lerEnvio()).toEqual({ desfechos: { antes: "recebida" } });
		expect(vi.getTimerCount()).toBe(0);
	});

	it("o Tentar de novo manda na hora, sem esperar o relógio", async () => {
		fechar = abrirPagina();
		antesConcluido();
		respostas({ tipo: "fora-do-ar" }, { tipo: "recebida" });

		await enviarPendentes();
		tentarDeNovo();
		await esperar();

		expect(enviar).toHaveBeenCalledTimes(2);
		expect(lerPiloto()).toMatchObject({ antes: { situacao: "recebida" } });
		expect(vi.getTimerCount()).toBe(0);
	});

	it("sem a página do piloto ou do quiz final aberta, não repete", async () => {
		antesConcluido();
		respostas({ tipo: "fora-do-ar" });

		await enviarPendentes();

		expect(vi.getTimerCount()).toBe(0);
	});

	it("ao fechar a página, o reenvio agendado não sai, e o erro dela não fica", async () => {
		fechar = abrirPagina();
		antesConcluido();
		respostas({ tipo: "fora-do-ar" });
		await enviarPendentes();

		fechar();

		expect(vi.getTimerCount()).toBe(0);
		expect(lerEnvio().agora).toBeUndefined();
		await vi.advanceTimersByTimeAsync(60_000);
		expect(enviar).toHaveBeenCalledTimes(1);
	});

	it("não manda o mesmo pedido duas vezes ao mesmo tempo", async () => {
		antesConcluido();
		const responder = respostaPresa();

		const primeiro = enviarPendentes();
		const segundo = enviarPendentes();
		expect(lerEnvio().agora).toEqual({ tipo: "enviando" });
		responder({ tipo: "recebida" });
		await Promise.all([primeiro, segundo]);

		expect(enviar).toHaveBeenCalledTimes(1);
	});

	it("o reenvio não sai se outra aba já mandou a etapa", async () => {
		fechar = abrirPagina();
		const pedido = antesConcluido();
		respostas({ tipo: "fora-do-ar" });
		await enviarPendentes();

		// A outra aba recebeu a resposta e guardou no navegador.
		registrarResposta(pedido, "recebida");
		await vi.advanceTimersByTimeAsync(5000);

		expect(enviar).toHaveBeenCalledTimes(1);
		expect(lerEnvio().agora).toBeUndefined();
	});

	it("a resposta que chega depois de outra pessoa começar não vale para ela", async () => {
		antesConcluido();
		const responder = respostaPresa();
		const envio = enviarPendentes();

		comecarComoOutraPessoa();
		esquecerEnvio();
		comecarPiloto();
		responder({ tipo: "encerrado" });
		await envio;

		expect(lerPiloto()).toMatchObject({
			fase: "participando",
			antes: { situacao: "respondendo" },
		});
		expect(lerEnvio()).toEqual({ desfechos: {} });
	});

	it("o pedido preso da pessoa anterior não segura o envio da próxima", async () => {
		antesConcluido(4);
		respostaPresa();
		void enviarPendentes();

		comecarComoOutraPessoa();
		esquecerEnvio();
		const daProxima = antesConcluido(8);
		respostas({ tipo: "recebida" });
		await enviarPendentes();

		expect(enviados()[1]).toEqual(daProxima);
		expect(lerPiloto()).toMatchObject({ antes: { situacao: "recebida" } });
		expect(lerEnvio()).toEqual({ desfechos: { antes: "recebida" } });
	});

	it("quando o pedido preso da pessoa anterior volta, ele não manda de novo o da próxima", async () => {
		antesConcluido(4);
		const responderAAnterior = respostaPresa();
		void enviarPendentes();
		comecarComoOutraPessoa();
		esquecerEnvio();
		antesConcluido(8);
		const responderAProxima = respostaPresa();
		const daProxima = enviarPendentes();

		responderAAnterior({ tipo: "fora-do-ar" });
		await esperar();
		responderAProxima({ tipo: "recebida" });
		await daProxima;

		expect(enviar).toHaveBeenCalledTimes(2);
		expect(lerEnvio()).toEqual({ desfechos: { antes: "recebida" } });
	});

	it("se o pedido guardado muda enquanto a API não responde, manda logo o de agora", async () => {
		fechar = abrirPagina();
		const antes = antesConcluido(4);
		concluirEtapa("depois", 6);
		const responder = respostaPresa();
		const envio = enviarPendentes();

		// Outra aba recebeu o antes enquanto este pedido esperava.
		registrarResposta(antes, "recebida");
		respostas({ tipo: "recebida" });
		responder({ tipo: "fora-do-ar" });
		await envio;

		expect(enviados().map((pedido) => pedido.etapa)).toEqual([
			"antes",
			"depois",
		]);
		expect(lerPiloto()).toEqual({ fase: "concluido" });
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe("o que a tela diz do envio de cada etapa", () => {
	const PARTICIPACAO = "b9d2fdc3-c198-433b-836d-b381de5a49d9";
	const NADA: EstadoDoEnvio = { desfechos: {} };

	function participando(
		antes: Extract<Piloto, { fase: "participando" }>["antes"],
		depois: Extract<Piloto, { fase: "participando" }>["depois"] = {
			situacao: "respondendo",
		},
	): Piloto {
		return { fase: "participando", participacao: PARTICIPACAO, antes, depois };
	}

	it("fora do piloto ou com a etapa por fazer, nada", () => {
		expect(situacaoDoEnvio("antes", { fase: "fora" }, NADA)).toBeUndefined();
		expect(
			situacaoDoEnvio("antes", participando({ situacao: "respondendo" }), NADA),
		).toBeUndefined();
	});

	it("com a etapa pendente, o que acontece agora, ou o envio que já vai sair", () => {
		const pendente = participando({ situacao: "pendente", acertos: 3 });

		expect(situacaoDoEnvio("antes", pendente, NADA)).toEqual({
			tipo: "enviando",
		});
		expect(
			situacaoDoEnvio("antes", pendente, {
				...NADA,
				agora: { tipo: "limite", segundos: 42 },
			}),
		).toEqual({ tipo: "limite", segundos: 42 });
	});

	it("depois da resposta, o que ficou guardado no navegador vale mais que a visita", () => {
		const comErro: EstadoDoEnvio = { ...NADA, agora: { tipo: "fora-do-ar" } };

		expect(
			situacaoDoEnvio("antes", participando({ situacao: "recebida" }), comErro),
		).toEqual({ tipo: "recebida" });
		expect(
			situacaoDoEnvio("antes", participando({ situacao: "perdida" }), comErro),
		).toEqual({ tipo: "recusado" });
		expect(situacaoDoEnvio("depois", { fase: "encerrado" }, comErro)).toEqual({
			tipo: "encerrado",
		});
	});

	it("com o depois resolvido, diz se a API recebeu ou recusou nesta visita", () => {
		expect(situacaoDoEnvio("depois", { fase: "concluido" }, NADA)).toEqual({
			tipo: "recebida",
		});
		expect(
			situacaoDoEnvio(
				"depois",
				{ fase: "concluido" },
				{ desfechos: { depois: "recusado" } },
			),
		).toEqual({ tipo: "recusado" });
	});
});

describe("a página que manda", () => {
	it("manda a etapa pendente quando abre, e não fora do piloto", async () => {
		antesConcluido();
		respostas({ tipo: "recebida" });

		const desligada = renderHook(() => useEnvioDoPiloto(false));
		await act(esperar);
		expect(enviar).not.toHaveBeenCalled();
		desligada.unmount();

		const { result } = renderHook(() => useEnvioDoPiloto(true));
		await act(esperar);

		expect(enviar).toHaveBeenCalledTimes(1);
		expect(result.current.desfechos).toEqual({ antes: "recebida" });
	});

	it("manda a etapa que termina com a página aberta", async () => {
		comecarPiloto();
		respostas({ tipo: "recebida" });
		renderHook(() => useEnvioDoPiloto(true));
		await act(esperar);
		expect(enviar).not.toHaveBeenCalled();

		await act(async () => {
			concluirEtapa("antes", 7);
			await esperar();
		});

		expect(enviados()).toMatchObject([{ etapa: "antes", acertos: 7 }]);
	});

	it("ao sair da página, o reenvio para", async () => {
		antesConcluido();
		respostas({ tipo: "fora-do-ar" });
		const pagina = renderHook(() => useEnvioDoPiloto(true));
		await act(esperar);
		expect(vi.getTimerCount()).toBe(1);

		pagina.unmount();

		expect(vi.getTimerCount()).toBe(0);
	});
});
