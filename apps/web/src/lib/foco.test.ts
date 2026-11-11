// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { focarNoTitulo } from "./foco";

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
