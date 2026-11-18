import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O link de texto (o a.acao-de-texto, como o "Ir para o início"). Ele fica em
// linha e quebra como texto, e o padding de cima e de baixo faz a área de toque.
// Até a #173, ele tinha também 4 px de padding dos lados, devolvidos por uma
// margem negativa: no Chrome, o texto ficava no mesmo lugar. Mas o Firefox
// conta a margem negativa ao medir a largura do item, e não ao decidir a quebra:
// num item da largura do texto, como o de uma fileira em flex
// (.acoes-da-pagina), a última palavra precisava caber junto com o padding do
// fim e descia, com espaço de sobra ("IR PARA O" numa linha e "INÍCIO" na
// outra). O mesmo vale para o que fica dentro do link, como o span do anel de
// foco. Este teste lê o CSS, porque o jsdom não desenha; a medida de verdade é
// no Firefox.
// Deslocar com translate, left com position ou text-indent fica fora do teste.

const estilos = new URL("./", import.meta.url);

/** O CSS do site, arquivo por arquivo, sem os comentários. */
const arquivos = [
	["index.css", new URL("../index.css", import.meta.url)] as const,
	...readdirSync(estilos)
		.filter((nome) => nome.endsWith(".css"))
		.map((nome) => [`estilos/${nome}`, new URL(nome, estilos)] as const),
].map(([nome, url]) => ({
	nome,
	css: readFileSync(url, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
}));

/** Divide nas vírgulas ou nos espaços de fora dos parênteses e dos colchetes. */
function dividir(texto: string, separador: RegExp): string[] {
	const partes = [""];
	let fundo = 0;
	for (const letra of texto) {
		if (letra === "(" || letra === "[") {
			fundo++;
		} else if (letra === ")" || letra === "]") {
			fundo--;
		}
		if (fundo === 0 && separador.test(letra)) {
			partes.push("");
		} else {
			partes[partes.length - 1] += letra;
		}
	}
	return partes.map((parte) => parte.trim()).filter(Boolean);
}

/**
 * Se o seletor pega o link de texto ou uma caixa dentro dele, como o span do
 * anel de foco (`a.acao-de-texto:focus-visible > span`). Ficam de fora o botão
 * e o summary, que são caixas inteiras (o padding deles não muda a quebra da
 * linha em volta), o ::before e o ::after, e o que vem depois do link
 * (`.acao-de-texto + p`).
 */
function pegaOLink(seletor: string): boolean {
	// As peças do seletor, cada uma com o combinador que vem antes dela.
	const partes = dividir(seletor.replace(/\s*([>+~])\s*/g, " $1 "), /\s/);
	const pecas: { combinador: string; peca: string }[] = [];
	let combinador = " ";
	for (const parte of partes) {
		if (/^[>+~]$/.test(parte)) {
			combinador = parte;
		} else {
			pecas.push({ combinador, peca: parte });
			combinador = " ";
		}
	}
	const onde = pecas.findIndex(({ peca }) =>
		/\.acao-de-texto(?![\w-])/.test(peca),
	);
	const link = pecas[onde];
	return (
		link !== undefined &&
		/^(?:a(?![\w-]))?[.:[]/.test(link.peca) &&
		pecas.every(({ peca }) => !peca.includes("::")) &&
		pecas.slice(onde + 1).every(({ combinador }) => /^[ >]$/.test(combinador))
	);
}

/**
 * As regras que valem para o link de texto ou para o que fica dentro dele, com o
 * seletor e as declarações.
 */
const doLink = arquivos.flatMap(({ nome, css }) =>
	[...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
		.map(([, seletor = "", corpo = ""]) => ({
			onde: `${nome}: ${seletor.trim().replace(/\s+/g, " ")}`,
			seletores: dividir(seletor, /,/),
			declaracoes: [...corpo.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)].map(
				([, propriedade = "", valor = ""]) => ({
					propriedade,
					valor: valor.trim(),
				}),
			),
		}))
		.filter(({ seletores }) => seletores.some(pegaOLink)),
);

/** Os valores de um lado da caixa numa declaração de padding ou de margem. */
function lado(
	propriedade: string,
	valor: string,
	qual: "dos lados" | "de cima e de baixo",
): string[] {
	const valores = dividir(valor, /\s/);
	const [base = "", nome = ""] = propriedade.split(/-(.*)/);
	if (base !== "padding" && base !== "margin") {
		return [];
	}
	const dosLados = qual === "dos lados";
	if (nome === "") {
		// O atalho: 1 valor para os quatro lados; 2 para cima e baixo e para os
		// lados; 3 para cima, os lados e baixo; 4 para cima, direita, baixo e
		// esquerda.
		const [a = "", b = a, c = a, d = b] = valores;
		return dosLados ? [b, d] : [a, c];
	}
	const ehDoLado = /^(?:inline(?:-start|-end)?|left|right)$/.test(nome);
	const ehDeCima = /^(?:block(?:-start|-end)?|top|bottom)$/.test(nome);
	return (dosLados ? ehDoLado : ehDeCima) ? valores : [];
}

const ZERO = /^-?0(?:\.0+)?(?:px|r?em|%)?$/;
// Número literal seguido de porcentagem ou unidade de comprimento (absoluta,
// relativa à fonte, ao viewport ou ao contêiner). O grupo guarda o coeficiente.
const MEDIDA =
	/^([+-]?(?:\d*\.)?\d+)(?:e[+-]?\d+)?(?:%|px|cm|mm|q|in|pt|pc|r?(?:em|ex|ch|cap|ic|lh)|(?:[sld]?v|cq)(?:w|h|i|b|min|max))$/i;

function erroDaMargem(valor: string) {
	if (ZERO.test(valor) || valor === "auto") {
		return;
	}
	const coeficiente = MEDIDA.exec(valor)?.[1] ?? "";
	if (/[1-9]/.test(coeficiente)) {
		return coeficiente.startsWith("-") ? "margem negativa" : undefined;
	}
	return "o teste não sabe avaliar este valor. Escreva o número direto com a unidade.";
}

describe("o valor da margem dos lados", () => {
	it.each(["0", "-0.00rem", "4px", "0.25rem", "1em", "10%", ".5ch", "auto"])(
		"aceita %s",
		(valor) => {
			expect(erroDaMargem(valor)).toBeUndefined();
		},
	);

	it.each(["-4px", "-0.25rem"])(
		"identifica %s como margem negativa",
		(valor) => {
			expect(erroDaMargem(valor)).toBe("margem negativa");
		},
	);

	it.each([
		"calc(0px - 4px)",
		"calc(-1 * 4px)",
		"min(0px, -4px)",
		"max(0px, 4px)",
		"clamp(-4px, 1vw, 4px)",
		"var(--recuo)",
		"env(safe-area-inset-left)",
		"outra(4px)",
		"inherit",
		"4",
		"4s",
		"0vw",
	])("pede um número direto para %s", (valor) => {
		expect(erroDaMargem(valor)).toMatch(
			/o teste não sabe avaliar.*[Ee]screva o número direto/,
		);
	});
});

describe("o link de texto no Firefox", () => {
	it("acha as regras do link: a de todos, a do rodapé e a do anel no texto", () => {
		expect(doLink.map(({ onde }) => onde)).toEqual(
			expect.arrayContaining([
				"index.css: a.acao-de-texto",
				"index.css: .rodape-texto .acao-de-texto",
				"index.css: a.acao-de-texto:focus-visible > span",
			]),
		);
	});

	it("não tem padding dos lados, nem o que fica dentro dele", () => {
		for (const { onde, declaracoes } of doLink) {
			for (const { propriedade, valor } of declaracoes) {
				if (!propriedade.startsWith("padding")) {
					continue;
				}
				for (const v of lado(propriedade, valor, "dos lados")) {
					expect(v, `${onde} { ${propriedade}: ${valor} }`).toMatch(ZERO);
				}
			}
		}
	});

	it("não tem margem negativa dos lados, nem o que fica dentro dele", () => {
		for (const { onde, declaracoes } of doLink) {
			for (const { propriedade, valor } of declaracoes) {
				if (!propriedade.startsWith("margin")) {
					continue;
				}
				for (const v of lado(propriedade, valor, "dos lados")) {
					const erro = erroDaMargem(v);
					if (erro) {
						expect.fail(`${onde} { ${propriedade}: ${valor} } (${v}): ${erro}`);
					}
				}
			}
		}
	});

	// A área de toque continua com a altura de antes: 15 px em cima e embaixo
	// da letra, em cada linha quando o link quebra, e 12 px no rodapé, onde o
	// link é texto corrido e o vão entre os parágrafos é de 12 px.
	it.each([
		["a.acao-de-texto", "0.9375rem"],
		[".rodape-texto .acao-de-texto", "0.75rem"],
	])("guarda a área de toque de cima e de baixo em %s", (seletor, altura) => {
		const regra = doLink.find(({ onde }) => onde === `index.css: ${seletor}`);
		const deCima = (regra?.declaracoes ?? [])
			.filter(({ propriedade }) => propriedade.startsWith("padding"))
			.flatMap(({ propriedade, valor }) =>
				lado(propriedade, valor, "de cima e de baixo"),
			);

		expect(regra, seletor).toBeDefined();
		expect(deCima.length, seletor).toBeGreaterThan(0);
		for (const v of deCima) {
			expect(v, seletor).toBe(altura);
		}
	});
});
