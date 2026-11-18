import { globSync, readFileSync } from "node:fs";
import ts from "typescript";
import { expect, it } from "vitest";

const raiz = new URL("../", import.meta.url);
const ler = (arquivo: string) => readFileSync(new URL(arquivo, raiz), "utf8");

const excecoes = [
	// O tabIndex mantém o veredito como parágrafo no Edge, nas oito medidas da #174.
	{
		arquivo: "components/quiz.tsx",
		classe: "quiz-veredito",
		atributo: "tabIndex={-1}",
	},
	// O número é desenho. O aria-hidden já o excluía da árvore medida na #152.
	{
		arquivo: "components/nao-encontrado.tsx",
		classe: "numero-404",
		atributo: 'aria-hidden="true"',
	},
];

const utilitario = /^(?:inline-)?(?:grid|flex)$/;
const display =
	/(?:^|;)\s*display\s*:\s*(?:inline-)?(?:grid|flex)\s*(?:!important\s*)?(?:;|$)/;

function classesEmGradeOuFlex() {
	const classes = new Set<string>();
	for (const arquivo of globSync(["index.css", "estilos/*.css"], {
		cwd: raiz,
	})) {
		const regras = ler(arquivo)
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.matchAll(/([^{}]+)\{([^{}]*)\}/g);
		for (const [, seletores = "", corpo = ""] of regras) {
			if (!display.test(corpo)) continue;
			for (const seletor of seletores.split(",")) {
				const classe = /^(?:p)?\.([\w-]+)$/.exec(seletor.trim())?.[1];
				if (classe) classes.add(classe);
			}
		}
	}
	return classes;
}

function classesLiterais(atributos: ts.JsxAttribute[]) {
	const valor = atributos.find(
		(a) => a.name.getText() === "className",
	)?.initializer;
	const literal = valor && ts.isJsxExpression(valor) ? valor.expression : valor;
	return literal && ts.isStringLiteralLike(literal)
		? literal.text.split(/\s+/)
		: [];
}

// Lê as classes literais do p. Uma classe montada em código ou uma regra que
// chega ao p por outro seletor fica fora desta leitura. O teste também não vê
// quando todo o conteúdo do p fica num único filho em flex. Na faixa, medimos
// esse caso pela árvore do Edge e conferimos o papel explícito no componente.
it("mantém os parágrafos do site fora de flex e de grade", () => {
	const doCss = classesEmGradeOuFlex();
	const problemas: string[] = [];
	expect(doCss.has("faixa")).toBe(true);
	const telas = globSync("**/*.tsx", {
		cwd: raiz,
		exclude: ["**/*.test.tsx"],
	}).map((arquivo) => arquivo.replaceAll("\\", "/"));
	expect(telas).toContain("components/quiz.tsx");
	for (const arquivo of telas) {
		const fonte = ts.createSourceFile(
			arquivo,
			ler(arquivo),
			ts.ScriptTarget.Latest,
			true,
			ts.ScriptKind.TSX,
		);
		function visitar(no: ts.Node) {
			ts.forEachChild(no, visitar);
			if (
				!(ts.isJsxOpeningElement(no) || ts.isJsxSelfClosingElement(no)) ||
				no.tagName.getText() !== "p"
			)
				return;
			const atributos = no.attributes.properties.filter(ts.isJsxAttribute);
			for (const classe of classesLiterais(atributos)) {
				const ultima = classe.split(":").at(-1)?.replace(/^!|!$/g, "") ?? "";
				if (!doCss.has(classe) && !utilitario.test(ultima)) continue;
				const excecao = excecoes.find(
					(e) => e.arquivo === arquivo && e.classe === classe,
				);
				if (excecao && atributos.some((a) => a.getText() === excecao.atributo))
					continue;
				const { line } = fonte.getLineAndCharacterOfPosition(no.getStart());
				problemas.push(`${arquivo}:${line + 1} ${classe}`);
			}
		}
		visitar(fonte);
	}
	expect(problemas).toEqual([]);
});
