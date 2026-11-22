import { describe, expect, it } from "vitest";
import {
	correcaoDeExemplo,
	eleicaoDeExemplo,
	patrimonioDeExemplo,
} from "./exemplos-de-teste";
import {
	linhasDoPatrimonio,
	reaisArredondados,
	reaisExatos,
} from "./patrimonio";

/** O espaço que não quebra entre o "R$" e o número. */
const SEM_QUEBRA = "\u00a0";
const reais = (numero: string) => `R$${SEM_QUEBRA}${numero}`;

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
