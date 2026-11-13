import { describe, expect, it } from "vitest";
import type { Artigo, Fonte, Trilha } from "./ler";
import {
	acharArtigo,
	acharQuiz,
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

	it("tem o quiz do processo legislativo depois do artigo 3, com duas perguntas de cada artigo", () => {
		const trilha = trilhaDe("processo-legislativo");
		const quiz = acharQuiz(trilhas, "processo-legislativo");

		expect(trilha.quiz?.depoisDe).toBe("o-projeto-passa-pelas-comissoes");
		expect(quiz?.anterior.slug).toBe(trilha.artigos[2]?.slug);
		expect(quiz?.perguntas.map((pergunta) => pergunta.artigo.posicao)).toEqual([
			1, 1, 2, 2, 3, 3,
		]);
	});

	it("chama para o quiz do processo legislativo só no artigo 3 e na página da trilha", () => {
		const trilha = trilhaDe("processo-legislativo");
		const chamada = { perguntas: 6, artigos: [1, 2, 3] };

		expect(acharTrilha(trilhas, trilha.slug)?.quiz).toEqual(chamada);
		expect(
			trilha.artigos.map(
				(artigo) => acharArtigo(trilhas, trilha.slug, artigo.slug)?.quiz,
			),
		).toEqual([undefined, undefined, chamada]);
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
	it("leva o caminho inteiro: de cada passo, o texto, os desvios, as fontes e os artigos", () => {
		const { infografico } = trilhaDe("processo-legislativo");
		const caminho = inicio(trilhas)?.caminho;

		expect(infografico).toBeDefined();
		expect(caminho).toEqual(infografico);
		for (const passo of caminho?.passos ?? []) {
			expect(Object.keys(passo).sort()).toEqual([
				"artigos",
				"desvios",
				"fontes",
				"texto",
				"titulo",
			]);
			// Cada passo tem a fonte oficial do que afirma.
			expect(passo.fontes.length).toBeGreaterThan(0);
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

// Uma trilha de exemplo, com o quiz depois do segundo de três artigos, e outra
// sem quiz. O quiz de verdade tem o teste dele, mais abaixo.
const constituicao: Fonte = {
	titulo: "Constituição Federal, art. 61",
	url: "https://normas.leg.br/?urn=urn:lex:br:federal:constituicao:1988-10-05;1988!art61",
	consultadoEm: "2026-11-12",
};

function artigoDeExemplo(trilha: string, slug: string, ordem: number): Artigo {
	return {
		trilha,
		slug,
		titulo: `Artigo ${slug}`,
		resumo: "Um resumo.",
		ordem,
		fontes: [constituicao],
		corpo: "Um texto curto.",
		minutos: 1,
	};
}

const comQuiz: Trilha = {
	slug: "com-quiz",
	titulo: "Com quiz",
	descricao: "Uma trilha com quiz.",
	ordem: 1,
	artigos: ["primeiro", "segundo", "terceiro"].map((slug, indice) =>
		artigoDeExemplo("com-quiz", slug, indice + 1),
	),
	quiz: {
		depoisDe: "segundo",
		perguntas: [
			{
				artigo: "segundo",
				enunciado: "Por onde começa um projeto de lei de um deputado?",
				opcoes: [
					{ texto: "Pelo Senado Federal.", certa: false },
					{ texto: "Pela Câmara dos Deputados.", certa: true },
				],
				explicacao: "Em regra, o projeto começa na Câmara dos Deputados.",
				fontes: [constituicao],
			},
			{
				artigo: "primeiro",
				enunciado: "Quem pode propor uma lei?",
				opcoes: [
					{ texto: "Os cidadãos, entre outros.", certa: true },
					{ texto: "Só os deputados.", certa: false },
					{ texto: "Só o presidente da República.", certa: false },
				],
				explicacao: "A Constituição lista quem pode propor (art. 61).",
				fontes: [constituicao],
			},
			{
				artigo: "segundo",
				enunciado: "Para onde vai o projeto depois da Câmara?",
				opcoes: [
					{ texto: "Para o Senado Federal.", certa: true },
					{ texto: "Para o arquivo.", certa: false },
				],
				explicacao: "A outra Casa revê o projeto.",
				fontes: [constituicao],
			},
		],
	},
};

const semQuiz: Trilha = {
	slug: "sem-quiz",
	titulo: "Sem quiz",
	descricao: "Uma trilha sem quiz.",
	ordem: 2,
	artigos: [artigoDeExemplo("sem-quiz", "unico", 1)],
};

const exemplos = [comQuiz, semQuiz];

describe("o quiz da trilha", () => {
	it("leva à página do quiz as perguntas, com a certa pela posição e o artigo de cada uma", () => {
		const quiz = acharQuiz(exemplos, "com-quiz");

		expect(quiz?.trilha).toEqual(listarTrilhas([comQuiz])[0]);
		expect(quiz?.perguntas[0]).toEqual({
			artigo: { slug: "segundo", titulo: "Artigo segundo", posicao: 2 },
			enunciado: "Por onde começa um projeto de lei de um deputado?",
			opcoes: ["Pelo Senado Federal.", "Pela Câmara dos Deputados."],
			certa: 1,
			explicacao: "Em regra, o projeto começa na Câmara dos Deputados.",
			fontes: [constituicao],
		});
		expect(quiz?.perguntas.map((pergunta) => pergunta.certa)).toEqual([
			1, 0, 0,
		]);
	});

	it("põe no rodapé do quiz o artigo do depoisDe e o seguinte da trilha", () => {
		const quiz = acharQuiz(exemplos, "com-quiz");

		expect(quiz?.anterior.slug).toBe("segundo");
		expect(quiz?.proximo?.slug).toBe("terceiro");
	});

	it("fica sem o próximo quando o quiz vem depois do último artigo", () => {
		const noFim: Trilha = {
			...comQuiz,
			quiz: comQuiz.quiz && { ...comQuiz.quiz, depoisDe: "terceiro" },
		};

		expect(acharQuiz([noFim], "com-quiz")).not.toHaveProperty("proximo");
	});

	it("não acha o quiz de uma trilha sem quiz ou que não existe", () => {
		expect(acharQuiz(exemplos, "sem-quiz")).toBeUndefined();
		expect(acharQuiz(exemplos, "nao-existe")).toBeUndefined();
		expect(acharQuiz(exemplos, "constructor")).toBeUndefined();
	});

	it("chama para o quiz na página da trilha e no artigo do depoisDe, com as perguntas e os artigos delas", () => {
		const chamada = { perguntas: 3, artigos: [1, 2] };

		expect(acharTrilha(exemplos, "com-quiz")?.quiz).toEqual(chamada);
		expect(acharArtigo(exemplos, "com-quiz", "segundo")?.quiz).toEqual(chamada);
		expect(acharArtigo(exemplos, "com-quiz", "primeiro")).not.toHaveProperty(
			"quiz",
		);
		expect(acharArtigo(exemplos, "com-quiz", "terceiro")).not.toHaveProperty(
			"quiz",
		);
	});

	// A troca de página usa o lugar do quiz para saber se a pessoa avança ou volta
	// (lib/troca-de-pagina.ts). As perguntas continuam só na página do quiz.
	it("diz, em toda página da trilha, depois de qual artigo o quiz aparece", () => {
		expect(listarTrilhas(exemplos)).toEqual([
			expect.objectContaining({ slug: "com-quiz", quizDepoisDe: "segundo" }),
			expect.not.objectContaining({ quizDepoisDe: expect.anything() }),
		]);
		expect(acharQuiz(exemplos, "com-quiz")?.trilha.quizDepoisDe).toBe(
			"segundo",
		);
		expect(
			acharArtigo(exemplos, "com-quiz", "terceiro")?.trilha.quizDepoisDe,
		).toBe("segundo");
		expect(acharTrilha(exemplos, "com-quiz")?.quizDepoisDe).toBe("segundo");
		expect(acharTrilha(exemplos, "sem-quiz")).not.toHaveProperty(
			"quizDepoisDe",
		);
	});

	it("não leva nada do quiz às trilhas sem quiz, às listas e à página inicial", () => {
		expect(acharTrilha(exemplos, "sem-quiz")).not.toHaveProperty("quiz");
		expect(acharArtigo(exemplos, "sem-quiz", "unico")).not.toHaveProperty(
			"quiz",
		);
		for (const naLista of listarTrilhas(exemplos)) {
			expect(naLista).not.toHaveProperty("quiz");
		}
		expect(
			acharArtigo(exemplos, "com-quiz", "segundo")?.trilha,
		).not.toHaveProperty("quiz");
		expect(inicio(trilhas)?.trilha).not.toHaveProperty("quiz");
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
