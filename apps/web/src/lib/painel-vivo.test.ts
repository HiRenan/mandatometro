// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	type Mock,
	vi,
} from "vitest";
import { painel } from "./azulejos";
import { usePainelVivo, virar, virarPendente } from "./painel-vivo";

/**
 * O movimento reduzido de mentira, porque o jsdom não tem o `matchMedia`. O
 * `mudar` troca a preferência e avisa a página, como o navegador. O
 * `mudarSemAviso` só troca: é o instante entre a pessoa mudar a preferência e o
 * navegador avisar a página.
 */
function preferencia(reduzido: boolean) {
	const ouvintes = new Set<() => void>();
	const consulta = {
		matches: reduzido,
		media: "(prefers-reduced-motion: reduce)",
		addEventListener: (_tipo: string, ouvinte: () => void) => {
			ouvintes.add(ouvinte);
		},
		removeEventListener: (_tipo: string, ouvinte: () => void) => {
			ouvintes.delete(ouvinte);
		},
	};
	vi.stubGlobal("matchMedia", () => consulta);
	return {
		mudarSemAviso(valor: boolean) {
			consulta.matches = valor;
		},
		mudar(valor: boolean) {
			consulta.matches = valor;
			for (const ouvinte of [...ouvintes]) {
				ouvinte();
			}
		},
	};
}

type Animacao = { terminar: () => void; cancel: Mock };

/**
 * O `animate` de mentira, porque o jsdom não anima: cada animação acaba quando
 * o teste chama o `terminar` dela.
 */
function animaNa(peca: Element) {
	const feitas: Animacao[] = [];
	const animate = vi.fn(() => {
		let terminar = () => {};
		const finished = new Promise<void>((pronta) => {
			terminar = pronta;
		});
		const animacao = { finished, terminar, cancel: vi.fn() };
		feitas.push(animacao);
		return animacao as unknown as Animation;
	});
	(peca as HTMLElement).animate = animate;
	return { animate, feitas };
}

/**
 * Um painel de oito peças, todas à vista e com o painel na tela, vivo pelo
 * `usePainelVivo`. Com o `animado`, cada peça ganha o `animate` de mentira.
 */
function montarPainel({
	sozinho = false,
	ondaAoChegar = false,
	animado = false,
} = {}) {
	const pecas = painel(7, 8);
	const elemento = document.createElement("div");
	elemento.append(...pecas.map(() => document.createElement("span")));
	document.body.append(elemento);
	// O jsdom não mede nada: as peças ficam à vista, e o painel, na tela.
	vi.spyOn(HTMLElement.prototype, "offsetParent", "get").mockReturnValue(
		document.body,
	);
	vi.spyOn(Element.prototype, "clientHeight", "get").mockReturnValue(400);
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			avisar: IntersectionObserverCallback;
			constructor(avisar: IntersectionObserverCallback) {
				this.avisar = avisar;
			}
			observe() {
				this.avisar(
					[{ isIntersecting: true } as IntersectionObserverEntry],
					this as unknown as IntersectionObserver,
				);
			}
			disconnect() {}
		},
	);
	const animacoes = [...elemento.children].map((peca) =>
		animado ? animaNa(peca) : undefined,
	);
	const caixa = { current: elemento };
	const trocar = vi.fn();
	const { unmount } = renderHook(() =>
		usePainelVivo(caixa, pecas, trocar, { sozinho, ondaAoChegar }),
	);
	return { elemento, animacoes, trocar, desmontar: unmount };
}

/** O ponteiro do mouse passa pela peça. */
function passarPor(peca: Element) {
	peca.dispatchEvent(
		new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }),
	);
}

/** O que um ouvinte lança: o jsdom não devolve o erro a quem disparou o evento. */
const erros: unknown[] = [];
function guardarErro(evento: ErrorEvent) {
	erros.push(evento.error);
	evento.preventDefault();
}

beforeEach(() => {
	erros.length = 0;
	window.addEventListener("error", guardarErro);
	vi.useFakeTimers({
		toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"],
	});
});

afterEach(() => {
	cleanup();
	window.removeEventListener("error", guardarErro);
	document.body.innerHTML = "";
	vi.useRealTimers();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("virar", () => {
	it("com o movimento reduzido, troca a peça na hora, e a desistência não faz nada", async () => {
		preferencia(true);
		const peca = document.createElement("span");
		const { animate } = animaNa(peca);
		const mudar = vi.fn();

		const desiste = virar(peca, mudar, 100);
		expect(mudar).toHaveBeenCalledTimes(1);
		desiste();
		await vi.advanceTimersByTimeAsync(1000);

		expect(mudar).toHaveBeenCalledTimes(1);
		expect(animate).not.toHaveBeenCalled();
	});

	it("num navegador sem o animate, troca a peça na hora, e a desistência não faz nada", async () => {
		preferencia(false);
		const mudar = vi.fn();

		const desiste = virar(document.createElement("span"), mudar, 100);
		expect(mudar).toHaveBeenCalledTimes(1);
		desiste();
		await vi.advanceTimersByTimeAsync(1000);

		expect(mudar).toHaveBeenCalledTimes(1);
	});
});

describe("virarPendente", () => {
	it("a virada feita na hora troca a peça e não fica no conjunto", () => {
		preferencia(true);
		const pendentes = new Set<() => void>();
		const mudar = vi.fn();

		virarPendente(pendentes, document.createElement("span"), mudar);
		virarPendente(pendentes, document.createElement("span"), mudar);

		expect(mudar).toHaveBeenCalledTimes(2);
		expect(pendentes.size).toBe(0);
	});

	it("a virada animada fica no conjunto até trocar a peça", async () => {
		preferencia(false);
		const peca = document.createElement("span");
		const { feitas } = animaNa(peca);
		const pendentes = new Set<() => void>();
		const mudar = vi.fn();

		virarPendente(pendentes, peca, mudar, 50);
		expect(pendentes.size).toBe(1);
		await vi.advanceTimersByTimeAsync(50);
		feitas[0]?.terminar();
		await vi.advanceTimersByTimeAsync(0);

		expect(mudar).toHaveBeenCalledTimes(1);
		expect(pendentes.size).toBe(0);
	});

	it("a desistência que fica no conjunto desfaz a virada que ainda não começou", async () => {
		preferencia(false);
		const peca = document.createElement("span");
		const { animate } = animaNa(peca);
		const pendentes = new Set<() => void>();
		const mudar = vi.fn();

		virarPendente(pendentes, peca, mudar, 50);
		for (const desiste of pendentes) {
			desiste();
		}
		await vi.advanceTimersByTimeAsync(1000);

		expect(animate).not.toHaveBeenCalled();
		expect(mudar).not.toHaveBeenCalled();
	});
});

describe("usePainelVivo", () => {
	it("num navegador sem o animate, a peça que o ponteiro toca troca no lugar, sem erro", () => {
		preferencia(false);
		const { elemento, trocar } = montarPainel();

		passarPor(elemento.children[2]);

		expect(erros).toEqual([]);
		expect(trocar).toHaveBeenCalledTimes(1);
		expect(trocar).toHaveBeenCalledWith(2, expect.any(Object));
	});

	it("a preferência liga com o painel virando: antes do aviso do navegador, a virada troca a peça no lugar, sem erro", async () => {
		const movimento = preferencia(false);
		const { elemento, animacoes, trocar } = montarPainel({
			sozinho: true,
			animado: true,
		});

		// A pessoa liga o movimento reduzido, e o navegador ainda não avisou a
		// página: a próxima virada, sozinha ou com o ponteiro, já não anima.
		movimento.mudarSemAviso(true);
		await vi.advanceTimersByTimeAsync(1400);
		passarPor(elemento.children[5]);

		expect(erros).toEqual([]);
		expect(trocar).toHaveBeenCalledTimes(2);
		expect(trocar).toHaveBeenLastCalledWith(5, expect.any(Object));
		for (const animacao of animacoes) {
			expect(animacao?.animate).not.toHaveBeenCalled();
		}
	});

	it("a preferência liga com a página aberta: o painel para de virar, sozinho e com o ponteiro, e desiste da virada pendente", async () => {
		const movimento = preferencia(false);
		const { elemento, animacoes, trocar } = montarPainel({
			sozinho: true,
			animado: true,
		});
		// Uma virada fica pendente, à espera do relógio.
		passarPor(elemento.children[1]);

		act(() => movimento.mudar(true));
		passarPor(elemento.children[3]);
		await vi.advanceTimersByTimeAsync(5000);

		expect(erros).toEqual([]);
		expect(trocar).not.toHaveBeenCalled();
		for (const animacao of animacoes) {
			expect(animacao?.animate).not.toHaveBeenCalled();
		}
	});

	it("a preferência desliga de novo: o painel volta a virar, sem erro", async () => {
		const movimento = preferencia(false);
		const { elemento, animacoes, trocar } = montarPainel({
			sozinho: true,
			animado: true,
		});
		act(() => movimento.mudar(true));

		act(() => movimento.mudar(false));
		passarPor(elemento.children[3]);
		await vi.advanceTimersByTimeAsync(0);
		animacoes[3]?.feitas[0]?.terminar();
		await vi.advanceTimersByTimeAsync(0);

		expect(erros).toEqual([]);
		expect(trocar).toHaveBeenCalledTimes(1);
		expect(trocar).toHaveBeenCalledWith(3, expect.any(Object));
		// A ida até ficar de lado e a volta com o desenho novo.
		expect(animacoes[3]?.animate).toHaveBeenCalledTimes(2);
	});

	it("aberto com o movimento reduzido, o painel fica parado e começa a virar quando a preferência desliga", async () => {
		const movimento = preferencia(true);
		const { elemento, animacoes, trocar } = montarPainel({
			sozinho: true,
			animado: true,
		});
		passarPor(elemento.children[6]);
		await vi.advanceTimersByTimeAsync(5000);
		expect(trocar).not.toHaveBeenCalled();
		expect(animacoes[6]?.animate).not.toHaveBeenCalled();

		act(() => movimento.mudar(false));
		passarPor(elemento.children[6]);
		await vi.advanceTimersByTimeAsync(0);

		expect(erros).toEqual([]);
		expect(animacoes[6]?.animate).toHaveBeenCalledTimes(1);
	});

	it("a onda da chegada é uma só, mesmo que a preferência ligue e desligue com o painel na tela", async () => {
		const movimento = preferencia(false);
		const { animacoes } = montarPainel({ ondaAoChegar: true, animado: true });
		await vi.advanceTimersByTimeAsync(1000);
		for (const animacao of animacoes) {
			expect(animacao?.animate).toHaveBeenCalledTimes(1);
		}

		act(() => movimento.mudar(true));
		act(() => movimento.mudar(false));
		await vi.advanceTimersByTimeAsync(1000);

		expect(erros).toEqual([]);
		for (const animacao of animacoes) {
			expect(animacao?.animate).toHaveBeenCalledTimes(1);
		}
	});

	it("ao desmontar, desfaz as viradas pendentes: a que espera não começa, e a que gira não troca a peça", async () => {
		preferencia(false);
		const { elemento, animacoes, trocar, desmontar } = montarPainel({
			animado: true,
		});
		passarPor(elemento.children[0]);
		await vi.advanceTimersByTimeAsync(0);
		// A peça 0 já gira, e a peça 4 ainda espera o relógio.
		passarPor(elemento.children[4]);

		desmontar();
		animacoes[0]?.feitas[0]?.terminar();
		await vi.advanceTimersByTimeAsync(1000);

		expect(erros).toEqual([]);
		expect(trocar).not.toHaveBeenCalled();
		// A peça 0 volta de lado, sem desenho novo; a 4 nem começa.
		expect(animacoes[0]?.animate).toHaveBeenCalledTimes(2);
		expect(animacoes[4]?.animate).not.toHaveBeenCalled();
	});
});
