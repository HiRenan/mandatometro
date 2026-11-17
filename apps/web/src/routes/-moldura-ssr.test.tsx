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
import { describe, expect, it, vi } from "vitest";
import { NaoEncontrado } from "@/components/nao-encontrado";
import { Route as RotaRaiz } from "@/routes/__root";

// O teto da letra grande mede a caixa do teto mais perto do título (o
// letra-com-teto e o caixa-do-teto, no index.css), e não a tela: o 100vw conta
// a barra de rolagem do Windows (15 px), e a palavra mais larga se partia na
// janela de computador estreita (a #139). No cabeçalho, na página e no rodapé,
// essa caixa é a moldura do documento (routes/__root.tsx), da largura da página
// sem a barra. O teste lê o HTML do servidor, porque o jsdom não desenha; a
// medida de verdade é no navegador, com a barra à vista.

vi.mock("@/env", () => ({ ENV: { API_URL: "" } }));

/** O documento de verdade da rota raiz: o <html>, com o cabeçalho, o main e o rodapé. */
const Documento = (RotaRaiz.options as RootRouteOptions).shellComponent;

/** Pede uma página ao servidor do roteador e lê o HTML dela. */
async function pedir(caminho: string) {
	const resposta = await createRequestHandler({
		createRouter: () =>
			createRouter({
				routeTree: createRootRoute({ shellComponent: Documento }),
				defaultNotFoundComponent: NaoEncontrado,
			}),
		request: new Request(`http://localhost${caminho}`),
	})(defaultRenderHandler);
	return new DOMParser().parseFromString(await resposta.text(), "text/html");
}

describe("a moldura da página", () => {
	it("é a caixa do teto do nome, no cabeçalho e no rodapé, e do título da página", async () => {
		const pagina = await pedir("/pagina-que-nao-existe");
		const moldura = pagina.getElementById("conteudo")?.parentElement;
		const titulos = [...pagina.querySelectorAll(".letra-com-teto")];

		expect(titulos.map((titulo) => titulo.textContent?.trim())).toEqual([
			"Mandatômetro",
			"Página não encontrada",
			"Mandatômetro",
		]);
		expect(moldura?.classList.contains("caixa-do-teto")).toBe(true);
		for (const titulo of titulos) {
			expect(titulo.closest(".caixa-do-teto"), titulo.textContent ?? "").toBe(
				moldura,
			);
		}
	});
});
