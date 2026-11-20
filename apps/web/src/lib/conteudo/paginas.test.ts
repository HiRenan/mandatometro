import { describe, expect, it } from "vitest";
import type { Artigo, Fonte, Trilha } from "./ler";
import {
	acharArtigo,
	acharQuiz,
	acharQuizFinal,
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

	it("liga cada passo do infográfico do processo legislativo aos artigos que o explicam", () => {
		const passos =
			acharTrilha(trilhas, "processo-legislativo")?.infografico?.passos ?? [];

		expect(passos.map((passo) => passo.artigos)).toEqual([
			["quem-pode-propor-uma-lei", "onde-o-projeto-comeca"],
			["o-projeto-passa-pelas-comissoes"],
			["o-plenario-vota-o-projeto"],
			["onde-o-projeto-comeca", "a-outra-casa-revisa-o-projeto"],
			["o-presidente-sanciona-ou-veta"],
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

		expect(acharTrilha(trilhas, trilha.slug)?.quiz).toMatchObject(chamada);
		expect(
			trilha.artigos.map(
				(artigo) => acharArtigo(trilhas, trilha.slug, artigo.slug)?.quiz,
			),
		).toEqual([undefined, undefined, chamada, undefined, undefined, undefined]);
	});

	it("tem o quiz final do processo legislativo, com duas perguntas de cada artigo, na ordem da trilha", () => {
		const trilha = trilhaDe("processo-legislativo");
		const posicoes = trilha.quizFinal?.perguntas.map(
			(pergunta) =>
				trilha.artigos.findIndex((artigo) => artigo.slug === pergunta.artigo) +
				1,
		);

		expect(posicoes).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
	});

	it("leva o quiz final do processo legislativo à página dele, depois do último artigo", () => {
		const trilha = trilhaDe("processo-legislativo");
		const quizFinal = acharQuizFinal(trilhas, "processo-legislativo");

		expect(quizFinal?.anterior.slug).toBe(trilha.artigos.at(-1)?.slug);
		expect(quizFinal).not.toHaveProperty("proximo");
		expect(quizFinal?.perguntas).toHaveLength(12);
		expect(
			quizFinal?.perguntas.map((pergunta) => pergunta.artigo.posicao),
		).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
	});

	it("chama para o quiz final do processo legislativo só no último artigo e na página da trilha", () => {
		const trilha = trilhaDe("processo-legislativo");
		const chamada = { perguntas: 12, artigos: [1, 2, 3, 4, 5, 6] };

		expect(acharTrilha(trilhas, trilha.slug)?.quizFinal).toMatchObject(chamada);
		expect(
			trilha.artigos.map(
				(artigo) => acharArtigo(trilhas, trilha.slug, artigo.slug)?.quizFinal,
			),
		).toEqual([undefined, undefined, undefined, undefined, undefined, chamada]);
	});

	it("não repete no quiz final uma pergunta do quiz do meio", () => {
		const trilha = trilhaDe("processo-legislativo");
		const doMeio = new Set(
			trilha.quiz?.perguntas.map((pergunta) => pergunta.enunciado),
		);

		expect(trilha.quizFinal?.perguntas.length).toBeGreaterThan(0);
		expect(
			trilha.quizFinal?.perguntas.filter((pergunta) =>
				doMeio.has(pergunta.enunciado),
			),
		).toEqual([]);
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

	// As perguntas do quiz final vão inteiras só à página dele. A página da trilha
	// leva o enunciado e as opções, sem a certa, como no quiz do meio; as listas,
	// a página inicial, os artigos e o quiz do meio não levam nada delas.
	it("leva as perguntas do quiz final do processo legislativo só à página dele e, sem a certa, à da trilha", () => {
		const trilha = trilhaDe("processo-legislativo");
		const enunciados =
			trilha.quizFinal?.perguntas.map((pergunta) => pergunta.enunciado) ?? [];
		const paginas = [
			...listarTrilhas(trilhas),
			inicio(trilhas),
			...trilha.artigos.map((artigo) =>
				acharArtigo(trilhas, trilha.slug, artigo.slug),
			),
			acharQuiz(trilhas, trilha.slug),
		];

		expect(
			acharQuizFinal(trilhas, trilha.slug)?.perguntas.map(
				(pergunta) => pergunta.enunciado,
			),
		).toEqual(enunciados);
		expect(
			acharTrilha(trilhas, trilha.slug)?.quizFinal?.perguntasSemACerta.map(
				(pergunta) => pergunta.enunciado,
			),
		).toEqual(enunciados);
		expect(enunciados).toHaveLength(12);
		for (const pagina of paginas) {
			const json = JSON.stringify(pagina);
			for (const enunciado of enunciados) {
				expect(json).not.toContain(enunciado);
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

		expect(acharTrilha(exemplos, "com-quiz")?.quiz).toEqual({
			...chamada,
			perguntasSemACerta: expect.any(Array),
		});
		expect(acharArtigo(exemplos, "com-quiz", "segundo")?.quiz).toEqual(chamada);
		expect(acharArtigo(exemplos, "com-quiz", "primeiro")).not.toHaveProperty(
			"quiz",
		);
		expect(acharArtigo(exemplos, "com-quiz", "terceiro")).not.toHaveProperty(
			"quiz",
		);
	});

	// Com elas, a página da trilha sabe se a pessoa já respondeu o quiz todo, e
	// conta as respondidas como a página do quiz (lib/quiz.ts). A certa fica só
	// na página do quiz.
	it("leva à página da trilha o enunciado e as opções de cada pergunta, sem a certa", () => {
		const perguntas = acharTrilha(exemplos, "com-quiz")?.quiz
			?.perguntasSemACerta;

		expect(perguntas).toEqual([
			{
				enunciado: "Por onde começa um projeto de lei de um deputado?",
				opcoes: ["Pelo Senado Federal.", "Pela Câmara dos Deputados."],
			},
			{
				enunciado: "Quem pode propor uma lei?",
				opcoes: [
					"Os cidadãos, entre outros.",
					"Só os deputados.",
					"Só o presidente da República.",
				],
			},
			{
				enunciado: "Para onde vai o projeto depois da Câmara?",
				opcoes: ["Para o Senado Federal.", "Para o arquivo."],
			},
		]);
		expect(perguntas).toEqual(
			acharQuiz(exemplos, "com-quiz")?.perguntas.map(
				({ enunciado, opcoes }) => ({ enunciado, opcoes }),
			),
		);
		expect(acharTrilha(exemplos, "sem-quiz")).not.toHaveProperty("quiz");
	});

	// A troca de página usa o lugar do quiz para saber se a pessoa avança ou volta
	// (lib/troca-de-pagina.ts). As perguntas ficam fora das listas: inteiras na
	// página do quiz e, sem a certa, na da trilha.
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

	// O quiz final vem depois do último artigo. As perguntas dele vão inteiras só
	// à página dele; a da trilha leva o enunciado e as opções, sem a certa, para
	// o botão de continuar saber se falta resposta; o último artigo e a trilha
	// levam a chamada; as listas, os outros artigos e o quiz do meio, nada.
	describe("o quiz final", () => {
		const soDoQuizFinal = "Uma pergunta que só existe no quiz final?";
		const explicacao = "Uma explicação que só existe no quiz final.";
		const comQuizFinal: Trilha = {
			...comQuiz,
			quizFinal: {
				perguntas: [
					{
						artigo: "terceiro",
						enunciado: soDoQuizFinal,
						opcoes: [
							{ texto: "Uma opção errada.", certa: false },
							{ texto: "Uma opção certa.", certa: true },
						],
						explicacao,
						fontes: [constituicao],
					},
					{
						artigo: "primeiro",
						enunciado: "Outra pergunta do quiz final?",
						opcoes: [
							{ texto: "Outra opção certa.", certa: true },
							{ texto: "Outra opção errada.", certa: false },
						],
						explicacao: "Outra explicação.",
						fontes: [constituicao],
					},
				],
			},
		};
		const todas = [comQuizFinal, semQuiz];

		it("leva à página dele as perguntas, com a certa pela posição, o último artigo e nenhum próximo", () => {
			const quizFinal = acharQuizFinal(todas, "com-quiz");

			expect(quizFinal?.trilha).toEqual(listarTrilhas([comQuizFinal])[0]);
			expect(quizFinal?.anterior.slug).toBe("terceiro");
			expect(quizFinal).not.toHaveProperty("proximo");
			expect(quizFinal?.perguntas[0]).toEqual({
				artigo: { slug: "terceiro", titulo: "Artigo terceiro", posicao: 3 },
				enunciado: soDoQuizFinal,
				opcoes: ["Uma opção errada.", "Uma opção certa."],
				certa: 1,
				explicacao,
				fontes: [constituicao],
			});
			expect(quizFinal?.perguntas.map((pergunta) => pergunta.certa)).toEqual([
				1, 0,
			]);
		});

		it("chama para ele na página da trilha e no último artigo, com as perguntas e os artigos delas", () => {
			const chamada = { perguntas: 2, artigos: [1, 3] };

			expect(acharTrilha(todas, "com-quiz")?.quizFinal).toEqual({
				...chamada,
				perguntasSemACerta: [
					{
						enunciado: soDoQuizFinal,
						opcoes: ["Uma opção errada.", "Uma opção certa."],
					},
					{
						enunciado: "Outra pergunta do quiz final?",
						opcoes: ["Outra opção certa.", "Outra opção errada."],
					},
				],
			});
			expect(acharArtigo(todas, "com-quiz", "terceiro")?.quizFinal).toEqual(
				chamada,
			);
			for (const artigo of ["primeiro", "segundo"]) {
				expect(acharArtigo(todas, "com-quiz", artigo)).not.toHaveProperty(
					"quizFinal",
				);
			}
		});

		it("não leva a certa nem a explicação a outra página, nem as perguntas às listas, aos outros artigos e ao quiz do meio", () => {
			const semAsPerguntas = [
				...listarTrilhas(todas),
				acharArtigo(todas, "com-quiz", "primeiro"),
				acharArtigo(todas, "com-quiz", "segundo"),
				acharArtigo(todas, "com-quiz", "terceiro"),
				acharQuiz(todas, "com-quiz"),
			];
			const daTrilha = JSON.stringify(acharTrilha(todas, "com-quiz"));

			for (const pagina of semAsPerguntas) {
				expect(pagina).toBeDefined();
				expect(JSON.stringify(pagina)).not.toContain(soDoQuizFinal);
				expect(JSON.stringify(pagina)).not.toContain(explicacao);
			}
			expect(daTrilha).toContain(soDoQuizFinal);
			expect(daTrilha).not.toContain(explicacao);
			expect(daTrilha).not.toContain('"certa"');
		});

		it("não acha o quiz final de uma trilha sem ele ou que não existe", () => {
			expect(acharQuizFinal(todas, "sem-quiz")).toBeUndefined();
			expect(acharQuizFinal(exemplos, "com-quiz")).toBeUndefined();
			expect(acharQuizFinal(todas, "nao-existe")).toBeUndefined();
			expect(acharQuizFinal(todas, "constructor")).toBeUndefined();
			expect(acharTrilha(exemplos, "com-quiz")).not.toHaveProperty("quizFinal");
		});
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
