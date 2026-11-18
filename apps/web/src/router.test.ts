// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRouter } from "./router";

type Router = ReturnType<typeof getRouter>;

afterEach(() => {
	Reflect.deleteProperty(document, "startViewTransition");
	Reflect.deleteProperty(document, "activeViewTransition");
	vi.unstubAllGlobals();
});

/**
 * Uma troca de página que o navegador pula antes de começar a animar, como
 * quando a pessoa volta pelo navegador logo depois de tocar num link: a promessa
 * `ready` dela rejeita com um AbortError. O jsdom não tem as View Transitions.
 */
function trocaPulada() {
	const pulada = new DOMException("Transition was skipped", "AbortError");
	Object.defineProperty(document, "startViewTransition", {
		configurable: true,
		value: (
			atualizar: (() => Promise<void>) | { update: () => Promise<void> },
		) => {
			const troca = {
				ready: Promise.reject(pulada),
				updateCallbackDone: (typeof atualizar === "function"
					? atualizar
					: atualizar.update)(),
				finished: Promise.resolve(),
				skipTransition: () => {},
			};
			Object.defineProperty(document, "activeViewTransition", {
				configurable: true,
				get: () => troca,
			});
			return troca;
		},
	});
	// Sem os tipos de transição: o router começa a troca sem eles.
	vi.stubGlobal("CSS", { supports: () => false });
}

/** As rejeições que ninguém tratou, enquanto `fazer` roda e logo depois. */
async function soltasDurante(fazer: () => Promise<unknown>) {
	const soltas: unknown[] = [];
	const anotar = (motivo: unknown) => soltas.push(motivo);
	process.on("unhandledRejection", anotar);
	try {
		await fazer();
		await new Promise((pronto) => setTimeout(pronto, 20));
	} finally {
		process.off("unhandledRejection", anotar);
	}
	return soltas;
}

describe("o router do site", () => {
	it("quando o navegador pula a troca de página, o AbortError dela não fica solto no console", async () => {
		trocaPulada();
		const router = getRouter();
		const novaPagina = vi.fn(async () => {});

		const soltas = await soltasDurante(() =>
			router.startViewTransition(novaPagina),
		);

		// A página nova chega do mesmo jeito: só o erro da troca pulada some.
		expect(novaPagina).toHaveBeenCalledTimes(1);
		expect(soltas).toEqual([]);
	});
});

/** A rolagem da página, que o jsdom não muda sozinho. */
function rolar(y: number) {
	Object.defineProperty(window, "scrollY", { configurable: true, value: y });
}

/** Os tipos que o router passa ao navegador em cada troca de página. */
function tiposDaTroca(router: Router) {
	const troca = router.options.defaultViewTransition;
	if (typeof troca !== "object" || typeof troca.types !== "function") {
		throw new Error("o router não dá os tipos da troca");
	}
	return troca.types;
}

/** Um link para `caminho`, sem carregar a página: só o histórico muda. */
async function abrir(router: Router, caminho: string) {
	router.history.push(caminho);
	// O histórico do TanStack Router grava o endereço no navegador logo depois.
	await new Promise((pronto) => setTimeout(pronto, 0));
}

// A #164: na volta pelo navegador para uma página rolada, o cabeçalho da página
// de antes voava até o da nova, lá no alto, fora da tela, e deixava uma faixa de
// papel no lugar.
describe("o cabeçalho na troca de página", () => {
	const TRILHA = "/trilhas/processo-legislativo";
	const ARTIGO = `${TRILHA}/o-plenario-vota-o-projeto`;

	beforeEach(() => {
		window.history.replaceState(null, "", "/");
		rolar(0);
		// O cabeçalho no alto da página, com 72 px de altura: sobe com a rolagem.
		document.body.innerHTML = `<header class="moldura"></header>`;
		const moldura = document.querySelector("header.moldura");
		if (!moldura) {
			throw new Error("sem o cabeçalho");
		}
		moldura.getBoundingClientRect = () =>
			({ bottom: 72 - window.scrollY }) as DOMRect;
	});

	afterEach(() => {
		document.body.innerHTML = "";
		rolar(0);
	});

	/** Uma visita a uma página, com a chave e o lugar dela no histórico. */
	function visita(
		router: Router,
		caminho: string,
		chave: string,
		indice: number,
	) {
		return router.parseLocation({
			href: caminho,
			pathname: caminho,
			search: "",
			hash: "",
			state: { __TSR_key: chave, __TSR_index: indice },
		});
	}

	/** O que o router diz da troca, como o `getLocationChangeInfo` dele. */
	function troca(
		de: ReturnType<typeof visita>,
		para: ReturnType<typeof visita>,
	) {
		return {
			fromLocation: de,
			toLocation: para,
			pathChanged: de.pathname !== para.pathname,
			hrefChanged: de.href !== para.href,
			hashChanged: de.hash !== para.hash,
		};
	}

	it("na volta do navegador para a trilha rolada, o cabeçalho fica sem o nome e vai com a página de antes", () => {
		const router = getRouter();
		const trilha = visita(router, TRILHA, "trilha", 1);
		const artigo = visita(router, ARTIGO, "artigo", 2);
		// A pessoa sai da trilha rolada para o artigo, que abre no alto.
		rolar(1592);
		router.emit({ type: "onBeforeLoad", ...troca(trilha, artigo) });
		rolar(0);

		// Na volta, o router devolve a trilha rolada, com o cabeçalho fora da tela.
		expect(tiposDaTroca(router)(troca(artigo, trilha))).toEqual([
			"folha",
			"voltar",
		]);
	});

	it("num link, com o cabeçalho na tela, ele fica parado na troca", () => {
		const router = getRouter();
		const trilha = visita(router, TRILHA, "trilha", 1);
		const artigo = visita(router, ARTIGO, "artigo", 2);

		expect(tiposDaTroca(router)(troca(trilha, artigo))).toEqual([
			"folha",
			"avancar",
			"moldura-na-tela",
		]);
	});

	// A #172: o "Receber por e-mail" das edições leva à folha da newsletter, no fim
	// da página inicial. O router abre a página no trecho, dentro da troca: com o
	// nome, o cabeçalho de antes voava até o alto dela e deixava a faixa de papel.
	it("num link para um trecho de outra página, como o /#newsletter, o cabeçalho fica sem o nome e vai com a página de antes", async () => {
		const router = getRouter();
		await abrir(router, "/edicoes");
		const edicoes = router.parseLocation(router.history.location);
		await abrir(router, "/#newsletter");
		const newsletter = router.parseLocation(router.history.location);

		expect(newsletter.hash).toBe("newsletter");
		expect(tiposDaTroca(router)(troca(edicoes, newsletter))).toEqual([
			"folha",
			"voltar",
		]);
	});

	it("num link para um trecho da mesma página, não há troca", async () => {
		const router = getRouter();
		await abrir(router, "/edicoes/5");
		const edicao = router.parseLocation(router.history.location);
		await abrir(router, "/edicoes/5#item-2");
		const item = router.parseLocation(router.history.location);

		expect(tiposDaTroca(router)(troca(edicao, item))).toBe(false);
	});

	it("na volta do navegador sem a rolagem guardada, como depois de recarregar a página, o cabeçalho fica sem o nome", async () => {
		const router = getRouter();
		await abrir(router, TRILHA);
		await abrir(router, ARTIGO);
		const artigo = router.parseLocation(router.history.location);

		const voltou = new Promise<void>((pronto) => {
			const parar = router.history.subscribe(({ action }) => {
				if (action.type === "BACK") {
					parar();
					pronto();
				}
			});
		});
		router.history.back();
		await voltou;

		const trilha = router.parseLocation(router.history.location);
		expect(trilha.pathname).toBe(TRILHA);
		expect(tiposDaTroca(router)(troca(artigo, trilha))).toEqual([
			"folha",
			"voltar",
		]);
	});
});
