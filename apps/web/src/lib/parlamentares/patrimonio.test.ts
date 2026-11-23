import { describe, expect, it } from "vitest";
import {
	correcaoDeExemplo,
	eleicaoDeExemplo,
	patrimonioDeExemplo,
} from "./exemplos-de-teste";
import {
	calculoDaEleicao,
	diferencaDaEleicao,
	fraseDoResultado,
	graficoDoPatrimonio,
	linhasDoPatrimonio,
	linkDaCalculadora,
	periodoDaCorrecao,
	reaisArredondados,
	reaisExatos,
} from "./patrimonio";

/** O espaço que não quebra entre o "R$" e o número. */
const SEM_QUEBRA = "\u00a0";
const reais = (numero: string) => `R$${SEM_QUEBRA}${numero}`;

/** O sinal de menos da tipografia, que não é o hífen. */
const MENOS = String.fromCodePoint(0x2212);

/** A Calculadora do Cidadão, com as datas e os R$ 100,00 da correção. */
const calculadora = (inicio: string, fim: string) =>
	`https://www3.bcb.gov.br/CALCIDADAO/publico/corrigirPorIndice.do?method=corrigirPorIndice&dataInicial=${inicio}&dataFinal=${fim}&valorCorrecao=100,00&selIndice=00433IPCA`;

describe("os reais exatos", () => {
	it("escrevem os centavos com o ponto do milhar e a vírgula dos centavos", () => {
		expect(reaisExatos(0)).toBe(reais("0,00"));
		expect(reaisExatos(5)).toBe(reais("0,05"));
		expect(reaisExatos(19_830_000)).toBe(reais("198.300,00"));
		expect(reaisExatos(241_000_000)).toBe(reais("2.410.000,00"));
		expect(reaisExatos(123_456_789)).toBe(reais("1.234.567,89"));
	});

	it("não perdem centavo no maior inteiro exato do JavaScript", () => {
		expect(reaisExatos(Number.MAX_SAFE_INTEGER)).toBe(
			reais("90.071.992.547.409,91"),
		);
	});
});

describe("os reais arredondados", () => {
	it("abaixo de mil, escrevem os reais inteiros", () => {
		expect(reaisArredondados(0)).toBe(reais("0"));
		expect(reaisArredondados(85_000)).toBe(reais("850"));
		expect(reaisArredondados(99_949)).toBe(reais("999"));
	});

	it("em mil, com uma casa abaixo de 100 mil e sem ela a partir daí", () => {
		expect(reaisArredondados(99_950)).toBe(reais("1 mil"));
		expect(reaisArredondados(450_000)).toBe(reais("4,5 mil"));
		expect(reaisArredondados(4_500_000)).toBe(reais("45 mil"));
		expect(reaisArredondados(4_530_000)).toBe(reais("45,3 mil"));
		expect(reaisArredondados(9_994_900)).toBe(reais("99,9 mil"));
		expect(reaisArredondados(9_995_000)).toBe(reais("100 mil"));
		expect(reaisArredondados(9_999_500)).toBe(reais("100 mil"));
		expect(reaisArredondados(35_212_300)).toBe(reais("352 mil"));
		expect(reaisArredondados(99_949_999)).toBe(reais("999 mil"));
	});

	it("em milhão e bilhão, com uma casa e no singular até 1,9", () => {
		expect(reaisArredondados(99_950_000)).toBe(reais("1 milhão"));
		expect(reaisArredondados(110_000_000)).toBe(reais("1,1 milhão"));
		expect(reaisArredondados(194_000_000)).toBe(reais("1,9 milhão"));
		expect(reaisArredondados(195_000_000)).toBe(reais("2 milhões"));
		expect(reaisArredondados(241_337_400)).toBe(reais("2,4 milhões"));
		expect(reaisArredondados(12_345_678_900)).toBe(reais("123,5 milhões"));
		expect(reaisArredondados(99_995_000_000)).toBe(reais("1 bilhão"));
		expect(reaisArredondados(123_456_789_000)).toBe(reais("1,2 bilhão"));
		expect(reaisArredondados(250_000_000_000)).toBe(reais("2,5 bilhões"));
		expect(reaisArredondados(Number.MAX_SAFE_INTEGER)).toBe(
			reais("90.072 bilhões"),
		);
	});
});

describe("as linhas do patrimônio", () => {
	const { eleicoes, correcao_ipca } = patrimonioDeExemplo();

	it("seguem a ordem da API, com o ano, o cargo disputado, o estado e o arquivo do TSE", () => {
		const linhas = linhasDoPatrimonio(eleicoes, correcao_ipca);

		expect(linhas.map(({ ano, cargo, lugar }) => [ano, cargo, lugar])).toEqual([
			[2014, "Deputado estadual", "Santa Catarina"],
			[2018, "Deputado federal", "Santa Catarina"],
			[2022, "Deputado federal", "Santa Catarina"],
			[2026, "Senador", "Santa Catarina"],
		]);
		expect(linhas[0].fonte).toEqual({
			endereco:
				"https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2014.zip",
			zip: true,
			coletado: "20 de novembro de 2026",
		});
	});

	it("põem o valor de hoje em destaque, o declarado exato embaixo e a barra pelo maior valor da pessoa", () => {
		const linhas = linhasDoPatrimonio(eleicoes, correcao_ipca);

		expect(linhas.map((linha) => linha.valor)).toEqual([
			{
				tipo: "corrigido",
				destaque: reais("352 mil"),
				declarado: reais("198.300,00"),
				barra: 0.1459,
			},
			{
				tipo: "corrigido",
				destaque: reais("1,1 milhão"),
				declarado: reais("812.400,00"),
				barra: 0.4558,
			},
			{ tipo: "sem-total" },
			{
				tipo: "corrigido",
				destaque: reais("2,4 milhões"),
				declarado: reais("2.410.000,00"),
				barra: 1,
			},
		]);
	});

	it("com uma eleição só, ficam sem barra: não há com o que comparar", () => {
		const [linha] = linhasDoPatrimonio(
			[eleicaoDeExemplo()],
			correcaoDeExemplo(),
		);

		expect(linha.valor).toEqual({
			tipo: "corrigido",
			destaque: reais("1,1 milhão"),
			declarado: reais("812.400,00"),
			barra: null,
		});
	});

	it("o zero declarado fica sem barra, e o valor muito menor que o maior fica com a menor fração", () => {
		const linhas = linhasDoPatrimonio(
			[
				eleicaoDeExemplo({
					ano: 2006,
					total_centavos: 0,
					total_corrigido_centavos: 0,
				}),
				eleicaoDeExemplo({
					ano: 2010,
					total_centavos: 600_000,
					total_corrigido_centavos: 1_200_000,
				}),
				eleicaoDeExemplo({
					ano: 2022,
					total_centavos: 30_000_000_000,
					total_corrigido_centavos: 38_000_000_000,
				}),
			],
			correcaoDeExemplo(),
		);

		expect(linhas.map((linha) => linha.valor)).toEqual([
			{
				tipo: "corrigido",
				destaque: reais("0"),
				declarado: reais("0,00"),
				barra: null,
			},
			{
				tipo: "corrigido",
				destaque: reais("12 mil"),
				declarado: reais("6.000,00"),
				barra: 0.0001,
			},
			{
				tipo: "corrigido",
				destaque: reais("380 milhões"),
				declarado: reais("300.000.000,00"),
				barra: 1,
			},
		]);
	});

	it("a eleição sem a correção mostra o declarado arredondado, sem barra, e as outras continuam com ela", () => {
		const linhas = linhasDoPatrimonio(
			[
				eleicaoDeExemplo({ ano: 2018 }),
				eleicaoDeExemplo({ ano: 2022, total_corrigido_centavos: 55_000_000 }),
				eleicaoDeExemplo({
					ano: 2026,
					total_centavos: 241_000_000,
					total_corrigido_centavos: null,
				}),
			],
			correcaoDeExemplo({ mes_fim: "2026-09" }),
		);

		expect(linhas.map((linha) => linha.valor)).toEqual([
			{
				tipo: "corrigido",
				destaque: reais("1,1 milhão"),
				declarado: reais("812.400,00"),
				barra: 1,
			},
			{
				tipo: "corrigido",
				destaque: reais("550 mil"),
				declarado: reais("812.400,00"),
				barra: 0.5,
			},
			{
				tipo: "sem-correcao",
				destaque: reais("2,4 milhões"),
				declarado: reais("2.410.000,00"),
			},
		]);
	});

	it("sem a série do IPCA, todas ficam com o declarado, sem barra", () => {
		const linhas = linhasDoPatrimonio(eleicoes, null);

		expect(linhas.map((linha) => linha.valor)).toEqual([
			{
				tipo: "sem-correcao",
				destaque: reais("198 mil"),
				declarado: reais("198.300,00"),
			},
			{
				tipo: "sem-correcao",
				destaque: reais("812 mil"),
				declarado: reais("812.400,00"),
			},
			{ tipo: "sem-total" },
			{
				tipo: "sem-correcao",
				destaque: reais("2,4 milhões"),
				declarado: reais("2.410.000,00"),
			},
		]);
	});

	it("a eleição nacional fica com o Brasil no lugar do estado", () => {
		const [linha] = linhasDoPatrimonio(
			[
				eleicaoDeExemplo({
					uf: "BR",
					cargo: { codigo: 1, nome: "Presidente" },
				}),
			],
			correcaoDeExemplo(),
		);

		expect([linha.cargo, linha.lugar]).toEqual(["Presidente", "Brasil"]);
	});

	it("um endereço fora dos sites oficiais fica sem link, e o ZIP só aparece no link para um arquivo ZIP", () => {
		const coletado_em = "2026-11-20T15:00:00+00:00";
		const linhas = linhasDoPatrimonio(
			[
				eleicaoDeExemplo({
					fonte: { url: "https://outro.example.com/bens.zip", coletado_em },
				}),
				eleicaoDeExemplo({
					fonte: { url: "javascript:alert(1)", coletado_em },
				}),
				eleicaoDeExemplo({
					fonte: {
						url: "https://dadosabertos.tse.jus.br/dataset/bens",
						coletado_em,
					},
				}),
			],
			correcaoDeExemplo(),
		);

		expect(linhas.map((linha) => linha.fonte)).toEqual([
			{ endereco: null, zip: false, coletado: "20 de novembro de 2026" },
			{ endereco: null, zip: false, coletado: "20 de novembro de 2026" },
			{
				endereco: "https://dadosabertos.tse.jus.br/dataset/bens",
				zip: false,
				coletado: "20 de novembro de 2026",
			},
		]);
	});
});

describe("o resultado de cada eleição", () => {
	it("vira uma frase simples e sem gênero, e o nulo não mostra nada", () => {
		const resultados = [
			"eleito",
			"eleito_por_qp",
			"eleito_por_media",
			"suplente",
			"nao_eleito",
			"sem_resultado",
			"outro",
		] as const;

		expect(
			resultados.map((resultado) => fraseDoResultado(resultado, 6)),
		).toEqual([
			"Ganhou a eleição.",
			"Ganhou a eleição pelo quociente partidário, a conta que reparte as vagas entre os partidos.",
			"Ganhou a eleição pela média, a conta que reparte as vagas que sobram.",
			"Ficou como suplente.",
			"Não ganhou a eleição.",
			"Os dados do TSE não trazem o resultado.",
			"O TSE registrou outra situação para esta candidatura.",
		]);
		expect(fraseDoResultado(null, 6)).toBeNull();
	});

	it.each([9, 10])(
		"o suplente de senador (o cargo %i) fala da chapa, que ganha ou perde junto",
		(cargo) => {
			for (const eleito of [
				"eleito",
				"eleito_por_qp",
				"eleito_por_media",
			] as const) {
				expect(fraseDoResultado(eleito, cargo), eleito).toBe(
					"A chapa ganhou a eleição.",
				);
			}
			expect(fraseDoResultado("nao_eleito", cargo)).toBe(
				"A chapa não ganhou a eleição.",
			);
			expect(fraseDoResultado("sem_resultado", cargo)).toBe(
				"Os dados do TSE não trazem o resultado.",
			);
		},
	);

	it("o senador (o cargo 5) ganha a eleição em nome próprio", () => {
		expect(fraseDoResultado("eleito", 5)).toBe("Ganhou a eleição.");
	});
});

describe("a diferença para a eleição anterior", () => {
	it("a mais: arredondada como o destaque, com o percentual e o sinal na tela, e em palavras no leitor de tela", () => {
		expect(
			diferencaDaEleicao({
				ano_anterior: 2014,
				diferenca_centavos: 36_700_000,
				percentual: "138.2",
			}),
		).toEqual({
			texto: `${reais("367 mil")} a mais que em 2014 (+138,2%)`,
			leitor: `${reais("367 mil")} a mais que em 2014, ou 138,2% a mais`,
		});
	});

	it("a menos: o sinal de menos da tipografia na tela, e o leitor de tela ouve a menos", () => {
		expect(
			diferencaDaEleicao({
				ano_anterior: 2018,
				diferenca_centavos: -14_200_000,
				percentual: "-22.4",
			}),
		).toEqual({
			texto: `${reais("142 mil")} a menos que em 2018 (${MENOS}22,4%)`,
			leitor: `${reais("142 mil")} a menos que em 2018, ou 22,4% a menos`,
		});
	});

	it("sem o percentual da API (a eleição anterior de até R$ 50 mil), só a diferença em reais", () => {
		expect(
			diferencaDaEleicao({
				ano_anterior: 2014,
				diferenca_centavos: 3_000_000,
				percentual: null,
			}),
		).toEqual({
			texto: `${reais("30 mil")} a mais que em 2014`,
			leitor: `${reais("30 mil")} a mais que em 2014`,
		});
	});

	it("abaixo de R$ 1, a diferença sai exata, e não R$ 0", () => {
		const texto = (centavos: number) =>
			diferencaDaEleicao({
				ano_anterior: 2014,
				diferenca_centavos: centavos,
				percentual: null,
			})?.texto;

		expect(texto(40)).toBe(`${reais("0,40")} a mais que em 2014`);
		expect(texto(-99)).toBe(`${reais("0,99")} a menos que em 2014`);
		expect(texto(100)).toBe(`${reais("1")} a mais que em 2014`);
	});

	it("o percentual que arredonda para zero diz menos de 0,1%, de um lado ou do outro", () => {
		expect(
			diferencaDaEleicao({
				ano_anterior: 2014,
				diferenca_centavos: 3_000,
				percentual: "0.0",
			}),
		).toEqual({
			texto: `${reais("30")} a mais que em 2014 (menos de 0,1%)`,
			leitor: `${reais("30")} a mais que em 2014, ou menos de 0,1% a mais`,
		});
		expect(
			diferencaDaEleicao({
				ano_anterior: 2014,
				diferenca_centavos: -3_000,
				percentual: "-0.0",
			})?.leitor,
		).toBe(`${reais("30")} a menos que em 2014, ou menos de 0,1% a menos`);
	});

	it("a diferença zero tem a frase dela, e sem a comparação não há frase", () => {
		const frase = "O mesmo valor de 2014, em reais de hoje.";
		expect(
			diferencaDaEleicao({
				ano_anterior: 2014,
				diferenca_centavos: 0,
				percentual: "0.0",
			}),
		).toEqual({ texto: frase, leitor: frase });
		expect(diferencaDaEleicao(null)).toBeNull();
	});
});

describe("o período e o cálculo da correção", () => {
	it("o período diz de que mês a que mês, ou o mês só", () => {
		expect(periodoDaCorrecao("2018-10", "2026-10")).toBe(
			"Corrigido de outubro de 2018 a outubro de 2026",
		);
		expect(periodoDaCorrecao("2026-10", "2026-10")).toBe(
			"Corrigido pela inflação de outubro de 2026",
		);
	});

	it("a frase traz a alta dos preços e quanto R$ 100 daquele ano valem hoje, com as quatro casas do fator", () => {
		expect(
			calculoDaEleicao(
				eleicaoDeExemplo({
					ano: 2018,
					fator_ipca: "1.3812",
					alta_ipca_percentual: "38.1",
				}),
				"2026-10",
			),
		).toEqual({
			ano: 2018,
			frase: `De outubro de 2018 a outubro de 2026, os preços subiram 38,1%: cada ${reais("100")} de 2018 vale ${reais("138,12")} hoje.`,
			calculadora: calculadora("10/2018", "10/2026"),
		});
	});

	it("com o índice em queda, os preços caíram; sem mudança, ficaram iguais", () => {
		const frase = (fator: string, alta: string) =>
			calculoDaEleicao(
				eleicaoDeExemplo({
					ano: 2018,
					fator_ipca: fator,
					alta_ipca_percentual: alta,
				}),
				"2018-12",
			)?.frase;
		const comeco = "De outubro de 2018 a dezembro de 2018, os preços";
		const cada = `cada ${reais("100")} de 2018 vale`;

		expect(frase("0.9950", "-0.5")).toBe(
			`${comeco} caíram 0,5%: ${cada} ${reais("99,50")} hoje.`,
		);
		expect(frase("1.0000", "0.0")).toBe(
			`${comeco} ficaram iguais: ${cada} ${reais("100,00")} hoje.`,
		);
		expect(frase("1.0004", "0.0")).toBe(
			`${comeco} subiram menos de 0,1%: ${cada} ${reais("100,04")} hoje.`,
		);
		expect(frase("12.3456", "1134.6")).toBe(
			`${comeco} subiram 1134,6%: ${cada} ${reais("1.234,56")} hoje.`,
		);
	});

	it("no mesmo mês, a frase fala só dele; sem o fator ou a alta, não há frase", () => {
		expect(
			calculoDaEleicao(
				eleicaoDeExemplo({
					ano: 2026,
					fator_ipca: "1.0014",
					alta_ipca_percentual: "0.1",
				}),
				"2026-10",
			)?.frase,
		).toBe(
			`Em outubro de 2026, os preços subiram 0,1%: cada ${reais("100")} de 2026 vale ${reais("100,14")} hoje.`,
		);
		expect(
			calculoDaEleicao(eleicaoDeExemplo({ fator_ipca: null }), "2026-10"),
		).toBeNull();
		expect(
			calculoDaEleicao(
				eleicaoDeExemplo({ alta_ipca_percentual: null }),
				"2026-10",
			),
		).toBeNull();
	});

	it("o link da Calculadora do Cidadão leva as datas no formato dela", () => {
		expect(linkDaCalculadora("2014-10", "2026-09")).toBe(
			calculadora("10/2014", "09/2026"),
		);
	});
});

describe("as frases novas nas linhas e o gráfico", () => {
	const { eleicoes, correcao_ipca } = patrimonioDeExemplo();

	it("cada linha leva o resultado, a diferença, o período e o cálculo da eleição", () => {
		const linhas = linhasDoPatrimonio(eleicoes, correcao_ipca);

		expect(linhas.map(({ resultado }) => resultado)).toEqual([
			"Ganhou a eleição pelo quociente partidário, a conta que reparte as vagas entre os partidos.",
			"Ganhou a eleição pela média, a conta que reparte as vagas que sobram.",
			"Ficou como suplente.",
			"Ganhou a eleição.",
		]);
		expect(linhas.map(({ diferenca }) => diferenca?.texto ?? null)).toEqual([
			null,
			`${reais("748 mil")} a mais que em 2014 (+212,4%)`,
			null,
			`${reais("1,3 milhão")} a mais que em 2018 (+119,4%)`,
		]);
		expect(linhas.map(({ periodo }) => periodo)).toEqual([
			"Corrigido de outubro de 2014 a outubro de 2026",
			"Corrigido de outubro de 2018 a outubro de 2026",
			null,
			"Corrigido pela inflação de outubro de 2026",
		]);
		expect(linhas.map(({ calculo }) => calculo?.frase ?? null)).toEqual([
			`De outubro de 2014 a outubro de 2026, os preços subiram 77,6%: cada ${reais("100")} de 2014 vale ${reais("177,57")} hoje.`,
			`De outubro de 2018 a outubro de 2026, os preços subiram 35,4%: cada ${reais("100")} de 2018 vale ${reais("135,40")} hoje.`,
			null,
			`Em outubro de 2026, os preços subiram 0,1%: cada ${reais("100")} de 2026 vale ${reais("100,14")} hoje.`,
		]);
	});

	it("sem a correção, o valor não é de hoje: a linha fica sem a diferença, o período e o cálculo, e o resultado continua", () => {
		const linhas = linhasDoPatrimonio(eleicoes, null);

		for (const { diferenca, periodo, calculo } of linhas) {
			expect([diferenca, periodo, calculo]).toEqual([null, null, null]);
		}
		expect(linhas.map(({ resultado }) => resultado)).toHaveLength(4);
		expect(linhas[3].resultado).toBe("Ganhou a eleição.");
	});

	it("o gráfico tem uma linha por eleição, com a parte da régua, e diz quando falta o valor de hoje", () => {
		expect(
			graficoDoPatrimonio(linhasDoPatrimonio(eleicoes, correcao_ipca)),
		).toEqual([
			{
				chave: "2014-Deputado estadual-Santa Catarina",
				ano: 2014,
				valor: reais("352 mil"),
				parte: 0.1459,
			},
			{
				chave: "2018-Deputado federal-Santa Catarina",
				ano: 2018,
				valor: reais("1,1 milhão"),
				parte: 0.4558,
			},
			{
				chave: "2022-Deputado federal-Santa Catarina",
				ano: 2022,
				valor: null,
				parte: null,
			},
			{
				chave: "2026-Senador-Santa Catarina",
				ano: 2026,
				valor: reais("2,4 milhões"),
				parte: 1,
			},
		]);
	});

	it("com menos de dois valores de hoje, não há gráfico", () => {
		expect(
			graficoDoPatrimonio(
				linhasDoPatrimonio([eleicaoDeExemplo()], correcaoDeExemplo()),
			),
		).toBeNull();
		expect(graficoDoPatrimonio(linhasDoPatrimonio(eleicoes, null))).toBeNull();
	});
});
