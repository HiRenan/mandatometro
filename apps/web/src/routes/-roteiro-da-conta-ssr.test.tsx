// @vitest-environment jsdom
import {
	createRootRoute,
	createRoute,
	createRouter,
	type RootRouteOptions,
} from "@tanstack/react-router";
import {
	createRequestHandler,
	defaultRenderHandler,
} from "@tanstack/react-router/ssr/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ROTEIRO_DA_CONTA } from "@/components/header";
import { Route as RotaRaiz } from "@/routes/__root";

// O roteiro da conta no <head> do servidor (components/header.tsx): onde o site
// tem a API, ele marca o <html> antes da primeira pintura, e o cabeçalho já sai
// com "Conta" para quem entrou. O teste lê o HTML do servidor do roteador, com o
// documento e o <head> de verdade (routes/__root.tsx). A ordem entre o roteiro e
// a folha de estilo fica de fora: no Vitest, a folha sai sem o endereço e fica
// no lugar dela, e no build o React a põe no começo do <head>
// (docs/codigo-do-site.md).

// O endereço do site entra nas imagens de prévia do <head> (lib/meta.ts).
const ambiente = vi.hoisted(() => ({
	API_URL: "https://api.exemplo.test",
	APP_BASE_URL: "https://site.exemplo.test",
}));
vi.mock("@/env", () => ({ ENV: ambiente }));

const { shellComponent: Documento, head } =
	RotaRaiz.options as RootRouteOptions;

/** O site com uma página só, no documento de verdade, com o <head> da raiz. */
function criarRouter() {
	const raiz = createRootRoute({ shellComponent: Documento, head });
	return createRouter({
		routeTree: raiz.addChildren([
			createRoute({
				getParentRoute: () => raiz,
				path: "/",
				component: () => <h1>Página de exemplo</h1>,
			}),
		]),
		// O jsdom põe o document, e o roteador se acharia no navegador.
		isServer: true,
	});
}

afterEach(() => {
	ambiente.API_URL = "https://api.exemplo.test";
});

/** O <head> do HTML que o servidor manda. */
async function lerOHead() {
	const resposta = await createRequestHandler({
		createRouter: criarRouter,
		request: new Request("http://localhost/"),
	})(defaultRenderHandler);
	const pagina = new DOMParser().parseFromString(
		await resposta.text(),
		"text/html",
	);
	return pagina.head;
}

/** O roteiro da conta, se o <head> tiver. */
const roteiroDaConta = (cabeca: HTMLHeadElement) =>
	[...cabeca.querySelectorAll("script")].find((roteiro) =>
		roteiro.textContent?.includes(ROTEIRO_DA_CONTA),
	);

describe("o roteiro da conta no <head>", () => {
	it("onde o site tem a API, entra no <head>, antes do corpo da página", async () => {
		// O DOMParser põe no <body> o que vem depois do começo do corpo: no <head>,
		// o roteiro roda antes de o navegador desenhar o cabeçalho.
		expect(roteiroDaConta(await lerOHead())).toBeDefined();
	});

	it("sem a API, não entra: a conta não existe, e fica o Entrar", async () => {
		ambiente.API_URL = "";
		const cabeca = await lerOHead();

		expect(roteiroDaConta(cabeca)).toBeUndefined();
	});
});
