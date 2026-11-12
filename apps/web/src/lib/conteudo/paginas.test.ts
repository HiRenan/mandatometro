import { describe, expect, it } from "vitest";
import type { Trilha } from "./ler";
import {
	acharArtigo,
	acharTrilha,
	corpoEmHtml,
	inicio,
	listarTrilhas,
	trilhas,
} from "./paginas.server";

/** A trilha da pasta `slug`, como o servidor lê, ou um erro que diz qual pasta falta. */
function trilhaDe(slug: string): Trilha {
	const trilha = trilhas.find((trilha) => trilha.slug === slug);
	if (!trilha) {
		throw new Error(`falta a trilha conteudo/trilhas/${slug}`);
	}
	return trilha;
}

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
		const trilha = trilhaDe("processo-legislativo");
		const artigo = acharArtigo(trilhas, trilha.slug, trilha.artigos[0].slug);

		expect(acharTrilha(trilhas, trilha.slug)?.infografico).toEqual(
			trilha.infografico,
		);
		expect(trilha.infografico).toBeDefined();
		for (const naLista of listarTrilhas(trilhas)) {
			expect(naLista).not.toHaveProperty("infografico");
		}
		expect(artigo?.trilha).not.toHaveProperty("infografico");
		expect(inicio(trilhas)?.trilha).not.toHaveProperty("infografico");
	});
});

// A abertura e o caminho da página inicial falam da trilha do processo
// legislativo, qualquer que seja a posição dela em /trilhas.
describe("a página inicial", () => {
	it("mostra a trilha do processo legislativo, em qualquer posição da lista", () => {
		for (const lista of [trilhas, [...trilhas].reverse()]) {
			expect(inicio(lista)?.trilha.slug).toBe("processo-legislativo");
		}
	});

	it("leva a trilha como nas listas, sem o texto dos artigos", () => {
		const pagina = inicio(trilhas);

		expect(pagina?.trilha).toEqual(
			listarTrilhas(trilhas).find(
				(trilha) => trilha.slug === "processo-legislativo",
			),
		);
		for (const artigo of pagina?.trilha.artigos ?? []) {
			expect(artigo).not.toHaveProperty("corpo");
		}
	});

	// Sem o infográfico da trilha, a página inicial perde o caminho.
	it("leva o caminho resumido: de cada passo, só o título e os artigos", () => {
		const { infografico } = trilhaDe("processo-legislativo");
		const caminho = inicio(trilhas)?.caminho;

		expect(infografico).toBeDefined();
		expect(caminho).toEqual({
			titulo: infografico?.titulo,
			resumo: infografico?.resumo,
			passos: infografico?.passos.map(({ titulo, artigos }) => ({
				titulo,
				artigos,
			})),
		});
		for (const passo of caminho?.passos ?? []) {
			expect(Object.keys(passo).sort()).toEqual(["artigos", "titulo"]);
		}
	});

	it("fica sem o caminho quando a trilha não tem infográfico", () => {
		const { infografico: _, ...semInfografico } = trilhaDe(
			"processo-legislativo",
		);

		expect(inicio([semInfografico])).toEqual({
			trilha: listarTrilhas([semInfografico])[0],
		});
	});

	it("não existe sem a trilha do processo legislativo", () => {
		expect(inicio([])).toBeUndefined();
		expect(
			inicio(
				trilhas.filter((trilha) => trilha.slug !== "processo-legislativo"),
			),
		).toBeUndefined();
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
