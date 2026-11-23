import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lerArquivosDasTrilhas } from "./conteudo/conferir";
import { lerTrilhas } from "./conteudo/ler";
import { jogos } from "./jogo/paginas.server";
import { simboloDaTrilha, simboloDoJogo, simboloDoPasso } from "./simbolos";

// A pasta do site (apps/web), onde fica a pasta conteudo/.
const RAIZ_DO_SITE = fileURLToPath(new URL("../..", import.meta.url));

// As trilhas de verdade: a trilha, o passo ou o jogo novo sem símbolo para o
// teste.
const trilhas = lerTrilhas(lerArquivosDasTrilhas(RAIZ_DO_SITE));
const comCaminho = trilhas.filter((trilha) => trilha.infografico);

describe("os símbolos dos azulejos", () => {
	it("cada trilha tem o seu símbolo, e nenhuma repete o de outra", () => {
		expect(trilhas.length).toBeGreaterThan(0);
		for (const { slug } of trilhas) {
			expect(simboloDaTrilha(slug), `a trilha ${slug}`).toBeDefined();
		}
		expect(new Set(trilhas.map(({ slug }) => simboloDaTrilha(slug))).size).toBe(
			trilhas.length,
		);
	});

	it("cada passo do caminho tem o seu símbolo, e nenhum repete o de outro", () => {
		expect(comCaminho.length).toBeGreaterThan(0);
		for (const trilha of comCaminho) {
			const passos = trilha.infografico?.passos ?? [];
			for (const { titulo } of passos) {
				expect(simboloDoPasso(titulo), `o passo ${titulo}`).toBeDefined();
			}
			expect(
				new Set(passos.map(({ titulo }) => simboloDoPasso(titulo))).size,
			).toBe(passos.length);
		}
	});

	// O símbolo de um jogo pode ser o de um passo do caminho: o Jogo das
	// Comissões fica na mesa das comissões, o passo que ele conta.
	it("cada jogo tem o símbolo da casa que ele conta", () => {
		expect(jogos.length).toBeGreaterThan(0);
		for (const { slug } of jogos) {
			expect(simboloDoJogo(slug), `o jogo ${slug}`).toBeDefined();
		}
		expect(
			Object.fromEntries(jogos.map(({ slug }) => [slug, simboloDoJogo(slug)])),
		).toEqual({ comissoes: "mesa" });
	});

	it("dá a cada trilha e a cada passo o símbolo que o Renan escolheu", () => {
		expect(
			Object.fromEntries(
				trilhas.map(({ slug }) => [slug, simboloDaTrilha(slug)]),
			),
		).toEqual({
			"constituicao-brasileira": "livro",
			"tres-poderes": "colunas",
			"direitos-e-deveres": "balanca",
			"processo-legislativo": "congresso",
		});
		expect(
			comCaminho.flatMap(
				(trilha) =>
					trilha.infografico?.passos.map(({ titulo }) => [
						titulo,
						simboloDoPasso(titulo),
					]) ?? [],
			),
		).toEqual([
			["Apresentação", "folha"],
			["Comissões", "mesa"],
			["Plenário", "hemiciclo"],
			["A outra Casa", "duas-casas"],
			["Sanção ou veto", "caneta"],
		]);
	});

	it("sem símbolo no mapa, não inventa um: o azulejo fica com o da posição", () => {
		expect(simboloDaTrilha("uma-trilha-nova")).toBeUndefined();
		expect(simboloDaTrilha("constructor")).toBeUndefined();
		expect(simboloDoPasso("Um passo novo")).toBeUndefined();
		expect(simboloDoJogo("um-jogo-novo")).toBeUndefined();
		expect(simboloDoJogo("constructor")).toBeUndefined();
	});
});
