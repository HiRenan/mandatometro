// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { focarNoTitulo, outraPagina } from "./foco";

afterEach(() => {
	document.body.innerHTML = "";
});

function pagina() {
	document.body.innerHTML = `
		<a href="#conteudo">Pular para o conteúdo</a>
		<main id="conteudo" tabindex="-1">
			<h1>Processo legislativo</h1>
			<a href="/trilhas/processo-legislativo/quem-pode-propor-uma-lei">Começar</a>
			<section aria-labelledby="caminho">
				<h2 id="caminho">O caminho de um projeto de lei</h2>
			</section>
		</main>
		<footer><p id="rodape">Rodapé</p></footer>
	`;
}

describe("focarNoTitulo", () => {
	it("leva o foco para o h1 da página nova", () => {
		pagina();
		focarNoTitulo();
		expect(document.activeElement?.tagName).toBe("H1");
	});

	it("vai para o main quando a página não tem h1", () => {
		document.body.innerHTML = `<main id="conteudo" tabindex="-1"><p>Sem título</p></main>`;
		focarNoTitulo();
		expect(document.activeElement?.id).toBe("conteudo");
	});

	it("vai para o trecho do endereço (#caminho), para o Tab seguir dali", () => {
		pagina();
		focarNoTitulo("caminho");
		expect(document.activeElement?.id).toBe("caminho");
		expect(document.activeElement?.getAttribute("tabindex")).toBe("-1");
	});

	it("fica no h1 quando o trecho não existe ou está fora do conteúdo", () => {
		pagina();
		focarNoTitulo("nao-existe");
		expect(document.activeElement?.tagName).toBe("H1");
		focarNoTitulo("rodape");
		expect(document.activeElement?.tagName).toBe("H1");
	});
});

describe("outraPagina", () => {
	const em = (
		pathname: string,
		search: { uf?: string; partido?: string; pagina?: number } = {},
		hash?: string,
	) => ({
		pathname,
		search,
		hash,
	});

	it("a paginação dos votos muda de página e aponta para o título da lista", () => {
		const caminho = "/parlamentares/81-agata-cedrolume";
		const inicio = em(caminho);
		const primeira = em(caminho, {}, "votos");
		const segunda = em(caminho, { pagina: 2 }, "votos");
		expect(outraPagina(inicio, segunda)).toBe(true);
		expect(outraPagina(segunda, primeira)).toBe(true);
		expect(outraPagina(segunda, segunda)).toBe(false);
		expect(outraPagina(em("/edicoes"), em("/edicoes", { pagina: 2 }))).toBe(
			false,
		);
	});

	it("outro caminho é outra página, e a primeira também", () => {
		expect(outraPagina(em("/edicoes"), em("/votacoes/139"))).toBe(true);
		expect(outraPagina(undefined, em("/parlamentares"))).toBe(true);
	});

	it("outro estado na lista dos parlamentares é outra página", () => {
		expect(
			outraPagina(em("/parlamentares"), em("/parlamentares", { uf: "SC" })),
		).toBe(true);
		expect(
			outraPagina(
				em("/parlamentares", { uf: "SC" }),
				em("/parlamentares", { uf: "BA" }),
			),
		).toBe(true);
		expect(
			outraPagina(
				em("/parlamentares", { uf: "SC" }),
				em("/parlamentares", { uf: "SC" }),
			),
		).toBe(false);
	});

	it("o filtro da votação fica na mesma página", () => {
		expect(
			outraPagina(em("/votacoes/139"), em("/votacoes/139", { uf: "SC" })),
		).toBe(false);
		expect(
			outraPagina(
				em("/votacoes/139", { uf: "SC" }),
				em("/votacoes/139", { uf: "SC", partido: "PFT" }),
			),
		).toBe(false);
	});
});
