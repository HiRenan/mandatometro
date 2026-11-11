import { describe, expect, it } from "vitest";
import {
	cabecalhosDaPagina,
	metaDaImagem,
	metaDaInicial,
	metaDaPagina,
} from "./meta";

const DESCRICAO_DA_INICIAL =
	"Entenda a política brasileira, um passo de cada vez, em artigos curtos e em linguagem simples, com a fonte oficial em cada explicação.";

describe("metaDaInicial", () => {
	it("põe o lema no título da aba e a frase da página na prévia do link", () => {
		expect(metaDaInicial()).toEqual([
			{ title: "Mandatômetro · o diário oficial político, simplificado" },
			{ name: "description", content: DESCRICAO_DA_INICIAL },
			{
				property: "og:title",
				content:
					"Mandatômetro: entenda a política brasileira, um passo de cada vez",
			},
			{ property: "og:description", content: DESCRICAO_DA_INICIAL },
			{ property: "og:type", content: "website" },
		]);
	});
});

describe("metaDaPagina", () => {
	it("continua com o nome do site depois do título da página", () => {
		expect(
			metaDaPagina({ titulo: "Trilhas", descricao: "Artigos curtos." })[0],
		).toEqual({ title: "Trilhas · Mandatômetro" });
	});
});

describe("metaDaImagem", () => {
	it("aponta a prévia pelo endereço completo do site, com ou sem a barra no fim", () => {
		for (const site of [
			"https://mandatometro.com.br",
			"https://mandatometro.com.br/",
		]) {
			expect(metaDaImagem(site)).toContainEqual({
				property: "og:image",
				content: "https://mandatometro.com.br/previa.png",
			});
		}
	});

	it("diz o tamanho, o tipo e o que a imagem mostra, e pede o cartão grande", () => {
		expect(metaDaImagem("http://localhost:3001")).toEqual([
			{ property: "og:image", content: "http://localhost:3001/previa.png" },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:image:type", content: "image/png" },
			{
				property: "og:image:alt",
				content:
					"Mandatômetro, o diário oficial político, simplificado. Entenda a política brasileira, um passo de cada vez.",
			},
			{ name: "twitter:card", content: "summary_large_image" },
		]);
	});
});

describe("cabecalhosDaPagina", () => {
	it("pede aos buscadores para não indexar a página fora da produção da Vercel", () => {
		for (const ambiente of ["preview", "development"]) {
			expect(cabecalhosDaPagina(ambiente)).toEqual({
				"X-Robots-Tag": "noindex",
			});
		}
	});

	it("não pede nada na produção nem fora da Vercel, no Docker e no pnpm dev", () => {
		for (const ambiente of ["production", undefined]) {
			expect(cabecalhosDaPagina(ambiente)).toBeUndefined();
		}
	});
});
