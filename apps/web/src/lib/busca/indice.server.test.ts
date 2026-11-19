import { describe, expect, it } from "vitest";
import {
	acharArtigo,
	corpoEmHtml,
	trilhas,
} from "@/lib/conteudo/paginas.server";
import { indiceDoConteudo, secoesDoHtml } from "./indice.server";

const indice = indiceDoConteudo();
const dasTrilhas = indice.filter((pagina) => pagina.tipo === "trilha");
const artigos = indice.filter((pagina) => pagina.tipo === "artigo");

describe("o índice das trilhas e dos artigos", () => {
	it("tem cada trilha e cada artigo do conteúdo, na ordem do site", () => {
		expect(indice.map((pagina) => pagina.endereco)).toEqual([
			...trilhas.map((trilha) => `/trilhas/${trilha.slug}`),
			...trilhas.flatMap((trilha) =>
				trilha.artigos.map(
					(artigo) => `/trilhas/${trilha.slug}/${artigo.slug}`,
				),
			),
		]);
		expect(dasTrilhas).toHaveLength(trilhas.length);
	});

	it("dá a cada trilha a posição em Trilhas, e a cada artigo a posição e o título da trilha", () => {
		const [primeira] = trilhas;
		const dela = artigos.filter((pagina) => pagina.trilha === primeira.titulo);

		expect(dasTrilhas.map((pagina) => pagina.posicao)).toEqual(
			trilhas.map((_, indice) => indice + 1),
		);
		expect(dasTrilhas[0]).toMatchObject({
			titulo: primeira.titulo,
			resumo: primeira.descricao,
			secoes: [],
		});
		expect(dela.map((pagina) => pagina.posicao)).toEqual(
			primeira.artigos.map((_, indice) => indice + 1),
		);
		expect(dela[0]).toMatchObject({
			titulo: primeira.artigos[0].titulo,
			resumo: primeira.artigos[0].resumo,
		});
	});

	it("divide cada artigo pelos intertítulos, com o id do <h2> da página dele", () => {
		let intertitulos = 0;
		for (const trilha of trilhas) {
			for (const artigo of trilha.artigos) {
				const html =
					acharArtigo(trilhas, trilha.slug, artigo.slug)?.artigo.html ?? "";
				const ids = [...html.matchAll(/<h2 id="([^"]+)"/g)].map(
					(achado) => achado[1],
				);
				const noIndice = artigos.find(
					(pagina) =>
						pagina.endereco === `/trilhas/${trilha.slug}/${artigo.slug}`,
				);

				expect(
					noIndice?.secoes.flatMap((secao) => (secao.id ? [secao.id] : [])),
				).toEqual(ids);
				intertitulos += ids.length;
			}
		}
		expect(intertitulos).toBeGreaterThan(0);
	});

	it("guarda o texto sem tag nem entidade", () => {
		const texto = JSON.stringify(indice);

		expect(texto).not.toMatch(/<\/?[a-z]/i);
		expect(texto).not.toMatch(/&[#a-z0-9]+;/i);
	});

	it("deixa o quiz de fora", () => {
		const pergunta = trilhas.find((trilha) => trilha.quiz)?.quiz?.perguntas[0];

		expect(pergunta?.enunciado).toBeTruthy();
		expect(JSON.stringify(indice)).not.toContain(pergunta?.enunciado);
	});
});

describe("as seções do HTML de um artigo", () => {
	it("tiram as tags, leem as entidades e juntam os espaços", () => {
		const html = corpoEmHtml(
			"Abertura com **negrito**, um [link](https://exemplo.test) e P&D.\n\n## Quando o começo é na Câmara\n\n- Um item\n- Outro <item>\n",
		);

		expect(secoesDoHtml(html)).toEqual([
			{ texto: "Abertura com negrito, um link e P&D." },
			{
				id: "quando-o-comeco-e-na-camara",
				titulo: "Quando o começo é na Câmara",
				texto: "Um item Outro <item>",
			},
		]);
	});

	it("o artigo que começa num intertítulo não tem a abertura", () => {
		expect(secoesDoHtml(corpoEmHtml("## Um começo\n\nO texto."))).toEqual([
			{ id: "um-comeco", titulo: "Um começo", texto: "O texto." },
		]);
	});
});
