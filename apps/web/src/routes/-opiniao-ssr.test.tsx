import {
	createRootRoute,
	createRouter,
	type RootRouteOptions,
} from "@tanstack/react-router";
import {
	createRequestHandler,
	defaultRenderHandler,
} from "@tanstack/react-router/ssr/server";
import { afterEach, expect, it, vi } from "vitest";
import { OPINIAO_FORA_DO_AR } from "@/lib/opiniao";
import { Route as RotaRaiz } from "./__root";
import { Route as Opiniao } from "./opiniao";

const ambiente = vi.hoisted(() => ({
	API_URL: "https://api.example.com" as string | undefined,
	APP_BASE_URL: "https://example.com",
}));
vi.mock("@/env", () => ({ ENV: ambiente }));
vi.mock("@/lib/opiniao.functions", () => ({ enviarOpiniao: vi.fn() }));

afterEach(() => vi.unstubAllGlobals());

async function pedir(comApi: boolean) {
	ambiente.API_URL = comApi ? "https://api.example.com" : undefined;
	const fetch = vi.fn();
	vi.stubGlobal("fetch", fetch);
	const { shellComponent, head, headers } =
		RotaRaiz.options as RootRouteOptions;
	const raiz = createRootRoute({ shellComponent, head, headers });
	const opiniao = Opiniao.update({
		id: "/opiniao",
		path: "/opiniao",
		getParentRoute: () => raiz,
	} as never);
	const resposta = await createRequestHandler({
		createRouter: () =>
			createRouter({ routeTree: raiz.addChildren([opiniao]), isServer: true }),
		request: new Request("https://example.com/opiniao"),
	})(defaultRenderHandler);
	expect(resposta.status).toBe(200);
	expect(fetch).not.toHaveBeenCalled();
	return resposta.text();
}

it("manda o formulário no HTML, com a isca escondida e o aviso sem JavaScript", async () => {
	const html = await pedir(true);
	expect(html).toContain("Dê sua opinião");
	expect(html.match(/<fieldset/g)).toHaveLength(2);
	expect(html.match(/type="radio"/g)).toHaveLength(5);
	expect(html.match(/type="checkbox"/g)).toHaveLength(4);
	expect(html).toMatch(/<textarea[^>]*required/);
	expect(html).toMatch(/<label hidden="">Seu site<input[^>]+name="site"/);
	expect(html).toContain('href="mailto:contato@mandatometro.com.br"');
	expect(html).toContain("<noscript>");
	expect(html).toContain(
		"Para enviar sua opinião, ligue o JavaScript do navegador.",
	);
	expect(html).toMatch(/<form[^>]+action="javascript:/);
	expect(html).toMatch(/<footer[\s\S]+href="\/opiniao"/);
});

it("sem API, o HTML avisa da indisponibilidade e fica sem formulário ou link no rodapé", async () => {
	const html = await pedir(false);
	expect(html).toContain("Dê sua opinião");
	expect(html).toContain(OPINIAO_FORA_DO_AR);
	expect(html).not.toContain('name="site"');
	expect(html).not.toContain('href="/opiniao"');
});
