import {
	createRootRoute,
	createRouter,
	type RootRouteOptions,
} from "@tanstack/react-router";
import {
	createRequestHandler,
	defaultRenderHandler,
} from "@tanstack/react-router/ssr/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NaoEncontrado } from "@/components/nao-encontrado";
import { PaginaDeErro } from "@/components/pagina-de-erro";
import { Route as RotaRaiz } from "./__root";
import { Route as RotaAutenticada } from "./_autenticado";
import { Route as RotaDoPainel } from "./_autenticado/painel";
import { Route as RotaDosNumeros } from "./_autenticado/painel_.numeros";

// O HTML que o servidor manda em /painel e em /painel/numeros: o layout da
// administradora não roda no servidor (ssr: false), e o servidor do site não
// pede nada à API, nem com o cookie da pessoa no pedido. Sai só o "Verificando
// sua sessão…", com os cabeçalhos que tiram a página dos buscadores e do cache.
// Na produção da Vercel, a raiz não pede o noindex (lib/meta.ts): quem pede é o
// layout.

const ambiente = vi.hoisted(() => ({
	API_URL: "https://api.exemplo.test",
	VERCEL_ENV: "production",
}));
vi.mock("@/env", () => ({ ENV: ambiente }));
// O catálogo das trilhas dos números também é do navegador: o loader da página
// não roda no servidor.
const catalogo = vi.hoisted(() =>
	vi.fn(async () => {
		throw new Error("O servidor não pede o catálogo no /painel/numeros.");
	}),
);
vi.mock("@/lib/conteudo", () => ({ buscarTrilhas: catalogo }));

beforeEach(() => {
	vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

const { shellComponent, head, headers } = RotaRaiz.options as RootRouteOptions;

/** O site com a raiz de verdade e o layout e a página do painel, como no routeTree.gen.ts. */
function criarRouter() {
	const raiz = createRootRoute({ shellComponent, head, headers });
	const autenticado = RotaAutenticada.update({
		id: "/_autenticado",
		getParentRoute: () => raiz,
	} as never);
	return createRouter({
		routeTree: raiz.addChildren([
			autenticado.addChildren([
				RotaDoPainel.update({
					id: "/painel",
					path: "/painel",
					getParentRoute: () => autenticado,
				} as never),
				RotaDosNumeros.update({
					id: "/painel_/numeros",
					path: "/painel/numeros",
					getParentRoute: () => autenticado,
				} as never),
			]),
		]),
		defaultNotFoundComponent: NaoEncontrado,
		defaultErrorComponent: PaginaDeErro,
		isServer: true,
	});
}

async function pedir(caminho: string, cabecalhos: HeadersInit = {}) {
	const fetch = vi.fn(async () => {
		throw new Error("O servidor do site não pede nada à API no /painel.");
	});
	vi.stubGlobal("fetch", fetch);
	const resposta = await createRequestHandler({
		createRouter: criarRouter,
		request: new Request(`http://localhost${caminho}`, { headers: cabecalhos }),
	})(defaultRenderHandler);
	return { resposta, html: await resposta.text(), fetch };
}

describe("o /painel no servidor", () => {
	it("manda só a conferência da sessão, fora dos buscadores e do cache", async () => {
		const { resposta, html, fetch } = await pedir("/painel", {
			Cookie: "sessao=um-cookie-de-mentira",
		});

		expect(resposta.status).toBe(200);
		expect(resposta.headers.get("X-Robots-Tag")).toBe("noindex");
		expect(resposta.headers.get("Cache-Control")).toBe("no-store");
		expect(html).toMatch(/<meta name="robots" content="noindex"\/?>/);
		expect(html).toContain("Verificando sua sessão…");
		// Nem o título da tela nem pedido à API: a guarda e a página são do navegador.
		expect(html).not.toContain("Revisão da edição");
		expect(html).not.toContain("Carregando o rascunho");
		expect(fetch).not.toHaveBeenCalled();
	});

	it("nos números, manda só a conferência, sem os números nem o catálogo", async () => {
		const { resposta, html, fetch } = await pedir("/painel/numeros", {
			Cookie: "sessao=um-cookie-de-mentira",
		});

		expect(resposta.status).toBe(200);
		expect(resposta.headers.get("X-Robots-Tag")).toBe("noindex");
		expect(resposta.headers.get("Cache-Control")).toBe("no-store");
		expect(html).toMatch(/<meta name="robots" content="noindex"\/?>/);
		expect(html).toContain("Verificando sua sessão…");
		expect(html).not.toContain("Números do site");
		expect(html).not.toContain("Carregando os números");
		expect(fetch).not.toHaveBeenCalled();
		expect(catalogo).not.toHaveBeenCalled();
	});
});
