import { describe, expect, it } from "vitest";
import {
	acertou,
	avisoDaResposta,
	contarRespondidas,
	FRASE_DO_RECOMECO,
	fraseDaChamada,
	fraseDoAndamento,
	frasesDoAndamento,
	opcaoRespondida,
} from "./quiz";

const ondeComeca = {
	enunciado:
		"Uma senadora apresenta um projeto de lei. Por qual Casa do Congresso ele começa?",
	opcoes: [
		"Pelo Senado Federal, que vira a Casa iniciadora.",
		"Pela Câmara dos Deputados, porque todo projeto de lei começa lá.",
		"Pela Casa que a senadora escolher.",
	],
	certa: 0,
};

const recurso = {
	enunciado:
		"Uma comissão aprovou um projeto no lugar do Plenário. O que pode levar esse projeto a ser votado também pelo Plenário da Casa?",
	opcoes: [
		"Um pedido do presidente da República.",
		"Um recurso assinado por um décimo dos membros da Casa.",
	],
	certa: 1,
};

describe("a correção do quiz", () => {
	it("acerta só com a opção certa", () => {
		expect(acertou(ondeComeca, 0)).toBe(true);
		expect(acertou(ondeComeca, 1)).toBe(false);
		expect(acertou(recurso, 1)).toBe(true);
	});

	it("acha a opção respondida pelo texto guardado", () => {
		expect(
			opcaoRespondida(ondeComeca, {
				[ondeComeca.enunciado]: "Pela Casa que a senadora escolher.",
			}),
		).toBe(2);
	});

	it("fica sem resposta quando a pergunta não foi respondida", () => {
		expect(opcaoRespondida(ondeComeca, {})).toBeUndefined();
	});

	it("esquece a resposta quando o texto da opção mudou no arquivo, em vez de apontar outra", () => {
		expect(
			opcaoRespondida(ondeComeca, {
				[ondeComeca.enunciado]: "Pela Casa que o senador escolher.",
			}),
		).toBeUndefined();
	});

	it("não confunde o enunciado com o que todo objeto do JavaScript tem", () => {
		expect(
			opcaoRespondida({ ...ondeComeca, enunciado: "constructor" }, {}),
		).toBeUndefined();
	});

	it("conta só as perguntas do quiz respondidas com uma opção que existe", () => {
		expect(
			contarRespondidas([ondeComeca, recurso], {
				[ondeComeca.enunciado]: ondeComeca.opcoes[1],
				[recurso.enunciado]: "Uma opção que saiu do arquivo.",
				"Uma pergunta que saiu do quiz?": "Uma opção dela.",
			}),
		).toBe(1);
	});
});

describe("as frases do quiz", () => {
	it.each([
		[0, 6, ""],
		[2, 6, "Você respondeu 2 de 6."],
		[6, 6, "Você terminou o quiz."],
	])(
		"com %i de %i respondidas, o andamento diz %j, sem contar acertos",
		(respondidas, total, frase) => {
			expect(fraseDoAndamento(respondidas, total)).toBe(frase);
		},
	);

	it("lista todas as frases que a linha do andamento pode mostrar, para ela guardar a altura da mais alta", () => {
		expect(frasesDoAndamento(3)).toEqual([
			"Você respondeu 1 de 3.",
			"Você respondeu 2 de 3.",
			"Você terminou o quiz.",
			"Você recomeçou o quiz.",
		]);
		expect(frasesDoAndamento(1)).toEqual([
			"Você terminou o quiz.",
			FRASE_DO_RECOMECO,
		]);
	});

	it("diz ao leitor de tela quando a pessoa acertou", () => {
		expect(avisoDaResposta(1, ondeComeca, 0)).toBe("Pergunta 1: você acertou.");
	});

	it("diz ao leitor de tela quando a pessoa errou, com a resposta certa", () => {
		expect(avisoDaResposta(6, recurso, 0)).toBe(
			"Pergunta 6: você errou. A resposta certa é: Um recurso assinado por um décimo dos membros da Casa.",
		);
	});

	it.each([
		[
			6,
			[1, 2, 3],
			"6 perguntas sobre os artigos 1 a 3, com a resposta certa, a explicação e a fonte oficial de cada uma.",
		],
		[
			4,
			[3, 2, 2, 3],
			"4 perguntas sobre os artigos 2 e 3, com a resposta certa, a explicação e a fonte oficial de cada uma.",
		],
		[
			3,
			[1, 2, 4],
			"3 perguntas sobre os artigos 1, 2 e 4, com a resposta certa, a explicação e a fonte oficial de cada uma.",
		],
		[
			1,
			[1],
			"1 pergunta sobre o artigo 1, com a resposta certa, a explicação e a fonte oficial.",
		],
	])(
		"a chamada de %i perguntas dos artigos %j diz %j",
		(perguntas, artigos, frase) => {
			expect(fraseDaChamada(perguntas, artigos)).toBe(frase);
		},
	);
});
