import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { acharQuizFinal, trilhas } from "./conteudo/paginas.server";
import { TRILHA_DO_PILOTO, VERSAO_DO_QUIZ } from "./piloto";

/*
 * A versão do quiz que o piloto manda à API vale só para um conjunto congelado
 * de perguntas (docs/medicao-do-piloto.md): pares de versões diferentes não se
 * comparam. Cada versão guarda aqui a impressão das perguntas como a tela as
 * corrige: o enunciado, as opções na ordem e a posição da certa.
 *
 * Este teste falhou? O quiz-final.md mudou num enunciado, numa opção ou na
 * certa. Ou o arquivo volta ao que era, ou a versão muda: combine uma versão
 * nova com a API, troque a VERSAO_DO_QUIZ (lib/piloto.ts) e acrescente a
 * impressão dela aqui. A explicação e as fontes podem mudar sem versão nova.
 */
const IMPRESSOES: Record<string, string> = {
	// quiz-final.md na revisão 3510ff2, a da base 78304ba.
	"processo-legislativo-final-v1":
		"84a6f3ab08493218f1dae9a43ca7aadeace071ed117ac3c528c37261dbf818e3",
};

function impressao(): string {
	const pagina = acharQuizFinal(trilhas, TRILHA_DO_PILOTO);
	const perguntas = (pagina?.perguntas ?? []).map(
		({ enunciado, opcoes, certa }) => ({ enunciado, opcoes, certa }),
	);
	return createHash("sha256").update(JSON.stringify(perguntas)).digest("hex");
}

describe("a versão do quiz do piloto", () => {
	it("tem as 12 perguntas, de 0 a 12 acertos, e a trilha, os seis artigos dos textos da tela", () => {
		const pagina = acharQuizFinal(trilhas, TRILHA_DO_PILOTO);

		expect(pagina?.perguntas).toHaveLength(12);
		expect(pagina?.trilha.artigos).toHaveLength(6);
	});

	it("é a das perguntas que estão no quiz-final.md", () => {
		expect(IMPRESSOES[VERSAO_DO_QUIZ]).toBe(impressao());
	});
});
