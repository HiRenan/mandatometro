import { describe, expect, it } from "vitest";
import {
	acharArtigo,
	acharTrilha,
	corpoEmHtml,
	listarTrilhas,
	trilhas,
} from "./paginas.server";

// Lê a pasta conteudo/trilhas de verdade: um arquivo mal formado derruba o teste.
describe("conteúdo das trilhas", () => {
	it("tem a trilha do processo legislativo, com artigos", () => {
		const trilha = acharTrilha(trilhas, "processo-legislativo");

		expect(trilha?.titulo).toBe("Processo legislativo");
		expect(trilha?.artigos.length).toBeGreaterThan(0);
	});

	it("liga cada artigo ao anterior e ao próximo da mesma trilha", () => {
		for (const trilha of trilhas) {
			trilha.artigos.forEach((artigo, indice) => {
				const achado = acharArtigo(trilhas, trilha.slug, artigo.slug);

				expect(achado?.trilha.slug).toBe(trilha.slug);
				expect(achado?.artigo.slug).toBe(artigo.slug);
				expect(achado?.posicao).toBe(indice + 1);
				expect(achado?.anterior?.slug).toBe(trilha.artigos[indice - 1]?.slug);
				expect(achado?.proximo?.slug).toBe(trilha.artigos[indice + 1]?.slug);
			});
		}
	});

	it("tem o infográfico do processo legislativo, da apresentação à sanção ou ao veto", () => {
		const passos = acharTrilha(trilhas, "processo-legislativo")?.infografico
			?.passos;

		expect(passos?.map((passo) => passo.titulo)).toEqual([
			"Apresentação",
			"Comissões",
			"Plenário",
			"A outra Casa",
			"Sanção ou veto",
		]);
	});

	it("cita em cada passo do infográfico o artigo da Constituição que ele explica", () => {
		const passos =
			acharTrilha(trilhas, "processo-legislativo")?.infografico?.passos ?? [];
		const constituicao = passos.map((passo) =>
			passo.fontes
				.map((fonte) =>
					/constituicao:1988-10-05;1988!(art\d+)$/.exec(fonte.url),
				)
				.filter((achado) => achado !== null)
				.map((achado) => achado[1]),
		);

		expect(constituicao).toEqual([
			["art61"],
			["art58"],
			["art47"],
			["art65"],
			["art66"],
		]);
	});

	it("define o plenário com o glossário do Congresso Nacional", () => {
		const plenario = acharTrilha(
			trilhas,
			"processo-legislativo",
		)?.infografico?.passos.find((passo) => passo.titulo === "Plenário");

		expect(plenario?.fontes).toContainEqual({
			titulo: "Congresso Nacional, Glossário legislativo, Plenário",
			url: "https://www.congressonacional.leg.br/legislacao-e-publicacoes/glossario-legislativo/-/legislativo/termo/plenario",
			consultadoEm: "2026-11-10",
		});
	});

	it("não acha trilha nem artigo que não existe", () => {
		const artigo = trilhas[0].artigos[0].slug;

		expect(acharTrilha(trilhas, "nao-existe")).toBeUndefined();
		expect(acharTrilha(trilhas, "constructor")).toBeUndefined();
		expect(
			acharArtigo(trilhas, "processo-legislativo", "nao-existe"),
		).toBeUndefined();
		expect(acharArtigo(trilhas, "nao-existe", artigo)).toBeUndefined();
	});
});

describe("o que vai para o navegador", () => {
	it("leva o texto só na página do artigo, já em HTML", () => {
		const trilha = trilhas[0];
		const artigo = trilha.artigos[0];
		const achado = acharArtigo(trilhas, trilha.slug, artigo.slug);

		expect(achado?.artigo.html).toBe(corpoEmHtml(artigo.corpo));
		expect(achado?.artigo).not.toHaveProperty("corpo");
		expect(achado?.proximo).not.toHaveProperty("corpo");
		for (const naLista of [
			...listarTrilhas(trilhas),
			...(achado ? [achado.trilha] : []),
		]) {
			for (const outro of naLista.artigos) {
				expect(outro).not.toHaveProperty("corpo");
			}
		}
	});

	it("leva o infográfico só na página da trilha", () => {
		const trilha = trilhas[0];
		const artigo = acharArtigo(trilhas, trilha.slug, trilha.artigos[0].slug);

		expect(acharTrilha(trilhas, trilha.slug)?.infografico).toEqual(
			trilha.infografico,
		);
		expect(trilha.infografico).toBeDefined();
		for (const naLista of listarTrilhas(trilhas)) {
			expect(naLista).not.toHaveProperty("infografico");
		}
		expect(artigo?.trilha).not.toHaveProperty("infografico");
	});
});

describe("corpoEmHtml", () => {
	it("converte seções, listas e links", () => {
		const html = corpoEmHtml(
			"Um parágrafo.\n\n## Uma seção\n\n- um item\n- [um link](https://www.camara.leg.br/)",
		);

		expect(html).toContain("<p>Um parágrafo.</p>");
		expect(html).toContain(">Uma seção</h2>");
		expect(html).toContain("<li>um item</li>");
		expect(html).toContain('<a href="https://www.camara.leg.br/">um link</a>');
	});

	it("não interpreta HTML solto e tira o link javascript:", () => {
		expect(
			corpoEmHtml(
				'Texto com <b>tag</b>, "aspas" e [link](javascript:alert(1)).',
			),
		).toBe(
			"<p>Texto com &lt;b&gt;tag&lt;/b&gt;, &quot;aspas&quot; e <a>link</a>.</p>",
		);
	});
});
