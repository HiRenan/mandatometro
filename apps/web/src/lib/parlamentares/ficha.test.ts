import { describe, expect, it } from "vitest";
import { eleicaoDeExemplo, patrimonioDeExemplo } from "./exemplos-de-teste";
import {
	eleicoesDaFicha,
	fonteDaBiografia,
	naoPublica,
	partesDoMandato,
	textoDasProfissoes,
	ultimoPatrimonio,
} from "./ficha";
import { resultadoCurto } from "./patrimonio";

// A ficha do cartaz do parlamentar (o Renan, em 23/11/2026: "A · Ficha em
// quadro"): as regras que só formatam o que a API manda. As profissões e os
// valores são inventados, como os dos outros testes.

/** O espaço que não quebra entre o "R$" e o número. */
const reais = (numero: string) => `R$ ${numero}`;

describe("a ficha do parlamentar", () => {
	it("junta as profissões como se fala: duas com o e, três com a vírgula e o e", () => {
		expect(textoDasProfissoes(["Professora"])).toBe("Professora");
		expect(textoDasProfissoes(["Professora", "Advogada"])).toBe(
			"Professora e Advogada",
		);
		expect(textoDasProfissoes(["Professora", "Advogada", "Agricultora"])).toBe(
			"Professora, Advogada e Agricultora",
		);
	});

	it("diz em palavras o que a Casa não publica, com o artigo de cada uma", () => {
		expect(naoPublica("camara", "a profissão")).toBe(
			"A Câmara dos Deputados não publica a profissão.",
		);
		expect(naoPublica("senado", "a escolaridade")).toBe(
			"O Senado Federal não publica a escolaridade.",
		);
	});

	it("o resultado curto de cada eleição, sem gênero; no suplente de senador, o da chapa", () => {
		const deputado = 6;
		expect(
			(
				[
					"eleito",
					"eleito_por_qp",
					"eleito_por_media",
					"suplente",
					"nao_eleito",
					"sem_resultado",
					"outro",
					null,
				] as const
			).map((resultado) => resultadoCurto(resultado, deputado)),
		).toEqual([
			"Ganhou",
			"Ganhou pelo quociente partidário",
			"Ganhou pela média",
			"Ficou como suplente",
			"Não ganhou",
			"Sem o resultado no TSE",
			"Outra situação no TSE",
			null,
		]);
		for (const suplenteDeSenador of [9, 10]) {
			expect(resultadoCurto("eleito", suplenteDeSenador)).toBe(
				"A chapa ganhou",
			);
			expect(resultadoCurto("eleito_por_media", suplenteDeSenador)).toBe(
				"A chapa ganhou",
			);
			expect(resultadoCurto("nao_eleito", suplenteDeSenador)).toBe(
				"A chapa não ganhou",
			);
			expect(resultadoCurto("suplente", suplenteDeSenador)).toBe(
				"Ficou como suplente",
			);
		}
	});

	it("as eleições vêm na ordem da API, com o cargo e o resultado curto, e o lugar só quando não é o estado da pessoa", () => {
		const { eleicoes } = patrimonioDeExemplo();
		expect(eleicoesDaFicha(eleicoes, "SC")).toEqual([
			{
				chave: "2014-Deputado estadual-Santa Catarina",
				ano: 2014,
				cargo: "Deputado estadual",
				lugar: null,
				resultado: "Ganhou pelo quociente partidário",
			},
			{
				chave: "2018-Deputado federal-Santa Catarina",
				ano: 2018,
				cargo: "Deputado federal",
				lugar: null,
				resultado: "Ganhou pela média",
			},
			{
				chave: "2022-Deputado federal-Santa Catarina",
				ano: 2022,
				cargo: "Deputado federal",
				lugar: null,
				resultado: "Ficou como suplente",
			},
			{
				chave: "2026-Senador-Santa Catarina",
				ano: 2026,
				cargo: "Senador",
				lugar: null,
				resultado: "Ganhou",
			},
		]);

		expect(
			eleicoesDaFicha(
				[
					eleicaoDeExemplo({
						ano: 2010,
						uf: "BR",
						cargo: { codigo: 1, nome: "Presidente" },
						resultado: "nao_eleito",
					}),
					eleicaoDeExemplo({ ano: 2014, uf: "PR" }),
				],
				"SC",
			).map(({ lugar, resultado }) => [lugar, resultado]),
		).toEqual([
			["Brasil", "Não ganhou"],
			["Paraná", null],
		]);
	});

	it("o último patrimônio é o total declarado da eleição mais nova que tem total, arredondado, com o arquivo do TSE", () => {
		// Em 2026, R$ 2.410.000,00 declarados; o valor de hoje não entra.
		expect(ultimoPatrimonio(patrimonioDeExemplo().eleicoes)).toEqual({
			ano: 2026,
			valor: reais("2,4 milhões"),
			fonte: {
				endereco:
					"https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato/bem_candidato_2026.zip",
				zip: true,
				coletado: "20 de novembro de 2026",
			},
		});

		// Sem total na mais nova, vale a anterior que tem.
		expect(
			ultimoPatrimonio([
				eleicaoDeExemplo({ ano: 2018 }),
				eleicaoDeExemplo({
					ano: 2022,
					total_centavos: null,
					total_corrigido_centavos: null,
				}),
			]),
		).toMatchObject({ ano: 2018, valor: reais("812 mil") });
	});

	it("sem eleição com total, não há último patrimônio", () => {
		expect(ultimoPatrimonio([])).toBeNull();
		expect(
			ultimoPatrimonio([
				eleicaoDeExemplo({
					total_centavos: null,
					total_corrigido_centavos: null,
				}),
			]),
		).toBeNull();
	});

	it("cada mandato: a legislatura, o estado só quando é outro, a condição em minúsculas e o exercício", () => {
		expect(
			partesDoMandato(
				{ legislatura: 57, uf: "SC", condicao: "Titular", em_exercicio: true },
				"SC",
			),
		).toEqual(["57ª legislatura", "titular", "em exercício"]);
		expect(
			partesDoMandato(
				{ legislatura: 56, uf: "SC", condicao: null, em_exercicio: false },
				"SC",
			),
		).toEqual(["56ª legislatura"]);
		expect(
			partesDoMandato(
				{
					legislatura: 55,
					uf: "PR",
					condicao: "Suplente",
					em_exercicio: false,
				},
				"SC",
			),
		).toEqual(["55ª legislatura", "Paraná", "suplente"]);
	});

	it("a fonte da biografia: a Casa, o link só num site oficial e o dia da coleta em Brasília", () => {
		const fonte = {
			url: "https://www.camara.leg.br/deputados/90000123",
			// 22h30 do dia 20 em Brasília.
			coletado_em: "2026-11-21T01:30:00+00:00",
		};
		expect(fonteDaBiografia(fonte, "camara")).toEqual({
			casa: "Câmara dos Deputados",
			endereco: "https://www.camara.leg.br/deputados/90000123",
			coletada: "20 de novembro de 2026",
		});
		expect(
			fonteDaBiografia(
				{ ...fonte, url: "https://www.exemplo.test/senadora" },
				"senado",
			),
		).toEqual({
			casa: "Senado Federal",
			endereco: null,
			coletada: "20 de novembro de 2026",
		});
	});
});
