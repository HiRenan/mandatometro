import { describe, expect, it } from "vitest";
import { buscarArtigo, buscarTrilha, trilhas } from ".";

// Lê a pasta conteudo/trilhas de verdade: um arquivo mal formado derruba o teste.
describe("conteúdo das trilhas", () => {
	it("tem a trilha do processo legislativo, com artigos", () => {
		const trilha = buscarTrilha("processo-legislativo");

		expect(trilha?.titulo).toBe("Processo legislativo");
		expect(trilha?.artigos.length).toBeGreaterThan(0);
	});

	it("liga cada artigo ao anterior e ao próximo da mesma trilha", () => {
		for (const trilha of trilhas) {
			trilha.artigos.forEach((artigo, indice) => {
				const achado = buscarArtigo(trilha.slug, artigo.slug);

				expect(achado?.trilha.slug).toBe(trilha.slug);
				expect(achado?.artigo.slug).toBe(artigo.slug);
				expect(achado?.posicao).toBe(indice + 1);
				expect(achado?.anterior?.slug).toBe(trilha.artigos[indice - 1]?.slug);
				expect(achado?.proximo?.slug).toBe(trilha.artigos[indice + 1]?.slug);
			});
		}
	});

	it("não acha trilha nem artigo que não existe", () => {
		const artigo = trilhas[0].artigos[0].slug;

		expect(buscarTrilha("nao-existe")).toBeUndefined();
		expect(buscarTrilha("constructor")).toBeUndefined();
		expect(buscarArtigo("processo-legislativo", "nao-existe")).toBeUndefined();
		expect(buscarArtigo("nao-existe", artigo)).toBeUndefined();
	});
});
