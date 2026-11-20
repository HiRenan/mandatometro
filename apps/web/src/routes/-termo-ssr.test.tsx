// @vitest-environment jsdom
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
import { formatarData } from "@/lib/formatar";
import { VERSAO_DO_TERMO } from "@/lib/termo";
import { Route as RotaRaiz } from "@/routes/__root";
import { Route as RotaDoTermo } from "./termo";

// A página do termo pelo servidor do roteador, com o documento de verdade (o
// <html>, o cabeçalho e o rodapé): é o HTML que o cadastro abre em outra aba e o
// que chega a quem está sem JavaScript. A rota é independente da API, e a
// leitura de progresso da moldura só roda no navegador com sessão anotada.

const ambiente = vi.hoisted(() => ({ API_URL: "https://api.exemplo.test" }));
vi.mock("@/env", () => ({ ENV: ambiente }));

/** O documento de verdade da rota raiz (routes/__root.tsx). */
const Documento = (RotaRaiz.options as RootRouteOptions).shellComponent;

/** O site só com a página do termo, como no router.tsx. */
function criarRouter() {
	const raiz = createRootRoute({ shellComponent: Documento });
	return createRouter({
		routeTree: raiz.addChildren([
			RotaDoTermo.update({
				id: "/termo",
				path: "/termo",
				getParentRoute: () => raiz,
			} as never),
		]),
		// O jsdom põe o document, e o roteador se acharia no navegador.
		isServer: true,
	});
}

/** A API fora do ar: cada pedido falha, e o teste conta quantos saíram. */
const pedidosAApi = vi.fn(async () => {
	throw new TypeError("A API não respondeu.");
});

beforeEach(() => {
	pedidosAApi.mockClear();
	vi.stubGlobal("fetch", pedidosAApi);
});

afterEach(() => {
	vi.unstubAllGlobals();
	ambiente.API_URL = "https://api.exemplo.test";
});

/** Pede o /termo ao servidor do roteador: o HTTP e o HTML lido. */
async function pedirOTermo() {
	const resposta = await createRequestHandler({
		createRouter: criarRouter,
		request: new Request("http://localhost/termo"),
	})(defaultRenderHandler);
	return {
		status: resposta.status,
		pagina: new DOMParser().parseFromString(await resposta.text(), "text/html"),
	};
}

const AS_NOVE_PARTES = [
	"Para que serve a conta",
	"O que a conta guarda",
	"O que fica de fora da conta",
	"Quem vê os seus dados",
	"Os serviços que usamos",
	"Por quanto tempo e como apagar",
	"Os seus direitos e o contato",
	"Menores de idade",
	"Quando este termo muda",
];

describe("o HTML da página do termo", () => {
	it.each([
		["com o API_URL", "https://api.exemplo.test"],
		["sem o API_URL", ""],
	])(
		"abre %s, com o texto, a versão e a data, sem pedir nada à API",
		async (_, endereco) => {
			ambiente.API_URL = endereco;
			const { status, pagina } = await pedirOTermo();
			const folha = pagina.querySelector("article");
			const datas = folha?.querySelectorAll("time") ?? [];

			expect(status).toBe(200);
			expect(pagina.title).toBe("Termo de consentimento · Mandatômetro");
			expect(folha?.querySelector("h1")?.textContent).toBe(
				"Termo de consentimento",
			);
			// A faixa e a parte 9 mostram a mesma versão que a API pede no cadastro.
			const versao = {
				datetime: VERSAO_DO_TERMO,
				texto: formatarData(VERSAO_DO_TERMO),
			};
			expect(
				Array.from(datas, (data) => ({
					datetime: data.getAttribute("datetime"),
					texto: data.textContent,
				})),
			).toEqual([versao, versao]);
			expect(datas[0]?.closest(".faixa")?.textContent).toMatch(
				/^Versão de \d+º? de [a-zç]+ de \d{4}Leitura de \d+ min$/,
			);
			expect(
				[...(folha?.querySelectorAll("section > h2") ?? [])].map(
					(titulo) => titulo.textContent,
				),
			).toEqual(AS_NOVE_PARTES);
			expect(folha?.textContent).toContain(
				"A conta é para quem tem 12 anos ou mais.",
			);
			expect(
				folha
					?.querySelector('a[href="mailto:contato@mandatometro.com.br"]')
					?.textContent?.trim(),
			).toBe("contato@mandatometro.com.br");
			expect(pedidosAApi).not.toHaveBeenCalled();
		},
	);

	it.each([
		[
			"o-que-guarda",
			"Se você escolher descrever o seu gênero, guardamos também o que você escrever.",
		],
		[
			"quem-ve",
			"Os registros de erro do site e da API não levam o nome, o e-mail, a senha nem os dados opcionais. Os registros de acesso guardam dados do pedido, como o endereço de internet (IP).",
		],
		[
			"servicos",
			"o GitHub roda a rotina que tenta de novo os e-mails da conta que não saíram",
		],
		[
			"apagar",
			"Se o envio não der certo nesse prazo, paramos de tentar, e a limpeza automática apaga o endereço, sem o comprovante.",
		],
		[
			"contato",
			"O que ainda fica por um tempo, o endereço do comprovante e o histórico do banco, está na parte 6.",
		],
	])("traz no HTML o trecho de #%s", async (id, trecho) => {
		const { pagina } = await pedirOTermo();

		expect(pagina.getElementById(id)?.textContent).toContain(trecho);
	});
});
