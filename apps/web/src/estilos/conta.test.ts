// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

// O jsdom não mede o cartaz. As regras do CSSOM mostram em que largura
// cada reserva sai da grade e se o link fica invisível quando ocupa espaço.
const folha = document.createElement("style");
folha.textContent = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), "conta.css"),
	"utf8",
);
document.head.append(folha);
const regrasDaConta = Array.from(folha.sheet?.cssRules ?? []);
folha.remove();

function* valores(
	seletor: string,
	propriedade: string,
	regras = regrasDaConta,
	midia?: string,
): Generator<{ midia?: string; valor: string }> {
	for (const regra of regras) {
		if (
			regra instanceof CSSStyleRule &&
			regra.selectorText.split(",").some((parte) => parte.trim() === seletor)
		) {
			const valor = regra.style.getPropertyValue(propriedade);
			if (valor) yield { midia, valor };
		}
		if (regra instanceof CSSGroupingRule) {
			yield* valores(
				seletor,
				propriedade,
				Array.from(regra.cssRules),
				regra instanceof CSSMediaRule ? regra.conditionText : midia,
			);
		}
	}
}

const ESTREITA = "(width < 62rem)";

it("mantém a reserva dos erros na grade do computador e a tira no celular", () => {
	expect([...valores(".conta-mensagem", "display")]).toContainEqual({
		midia: undefined,
		valor: "grid",
	});
	expect(
		[...valores(".conta-erro-guardado", "display")].filter(
			({ valor }) => valor === "none",
		),
	).toEqual([{ midia: ESTREITA, valor: "none" }]);
});

it("deixa o link guardado do login invisível e reservando espaço no computador", () => {
	expect([...valores(".conta-link-guardado", "visibility")]).toEqual([
		{ midia: undefined, valor: "hidden" },
	]);
	expect(
		[...valores(".conta-link-guardado", "display")].filter(
			({ valor }) => valor === "none",
		),
	).toEqual([{ midia: ESTREITA, valor: "none" }]);
});
