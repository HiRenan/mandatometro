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
// foco. Este teste lê o CSS porque o jsdom não desenha. A medida é no Firefox.
// Deslocar com translate, left com position ou text-indent fica fora do teste.
// Uma regra que pega o link sem citar a classe, como .rodape-texto a, fica de fora.
// O teste não expande o &. Uma regra aninhada que cita .acao-de-texto falha.
// Escreva a regra por extenso. O mesmo vale para o @scope que começa na classe.

const estilos = new URL("./", import.meta.url);

/** O CSS do site, arquivo por arquivo. */
const arquivos = [
	["index.css", new URL("../index.css", import.meta.url)] as const,
	...readdirSync(estilos)
		.filter((nome) => nome.endsWith(".css"))
		.map((nome) => [`estilos/${nome}`, new URL(nome, estilos)] as const),
];

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

const CLASSE_DO_LINK = /\.acao-de-texto(?![\w-])/;

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
	const onde = pecas.findIndex(({ peca }) => CLASSE_DO_LINK.test(peca));
	const link = pecas[onde];
	return (
		link !== undefined &&
		/^(?:a(?![\w-]))?[.:[]/.test(link.peca) &&
		pecas.every(({ peca }) => !peca.includes("::")) &&
		pecas.slice(onde + 1).every(({ combinador }) => /^[ >]$/.test(combinador))
	);
}

type Regra = {
	onde: string;
	declaracoes: { propriedade: string; valor: string }[];
};

/** As regras que valem para o link de texto ou para o que fica dentro dele. */
function lerRegrasDoLink(nome: string, css: string) {
	const texto = css.replace(/\/\*[\s\S]*?\*\//g, " ");
	const regras: Regra[] = [];
	const aninhadas: string[] = [];
	const abertas: string[] = [];
	// Quando o corpo não tem outra chave, lemos a regra inteira. Caso contrário,
	// guardamos o cabeçalho até aparecer a chave que fecha o bloco de fora.
	for (const [, cabecalho, corpo] of texto.matchAll(
		/([^;{}]+)\{(?:([^{}]*)\})?|\}/g,
	)) {
		if (cabecalho === undefined) {
			abertas.pop();
			continue;
		}
		const seletor = cabecalho.trim().replace(/\s+/g, " ");
		const estiloDeFora = abertas
			.filter((aberta) => !aberta.startsWith("@"))
			.at(-1);
		const inicioDoEscopo = /^@scope\s*\((.*?)\)\s*(?:to\s*\(|$)/i.exec(
			seletor,
		)?.[1];
		if (
			estiloDeFora &&
			(CLASSE_DO_LINK.test(estiloDeFora) || CLASSE_DO_LINK.test(seletor))
		) {
			aninhadas.push(`${nome}: ${estiloDeFora} { ${seletor} { … } }`);
		} else if (inicioDoEscopo && CLASSE_DO_LINK.test(inicioDoEscopo)) {
			aninhadas.push(`${nome}: ${seletor}`);
		}
		if (corpo === undefined) {
			abertas.push(seletor);
		} else if (
			!estiloDeFora &&
			!seletor.startsWith("@") &&
			dividir(seletor, /,/).some(pegaOLink)
		) {
			const declaracoes = [...corpo.matchAll(/([\w-]+)\s*:\s*([^;]+)/g)].map(
				([, propriedade = "", valor = ""]) => ({
					propriedade: propriedade.toLowerCase(),
					valor: valor.trim(),
				}),
			);
			regras.push({ onde: `${nome}: ${seletor}`, declaracoes });
		}
	}
	return { regras, aninhadas };
}

const folhas = arquivos.map(([nome, url]) =>
	lerRegrasDoLink(nome, readFileSync(url, "utf8")),
);
const doLink = folhas.flatMap(({ regras }) => regras);

/** Os valores de um lado da caixa numa declaração de padding ou de margem. */
function lado(
	propriedade: string,
	valor: string,
	qual: "dos lados" | "de cima e de baixo",
): string[] {
	const valores = dividir(valor.replace(/!\s*important\s*$/i, ""), /\s/);
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

const ZERO = /^-?0(?:\.0+)?(?:px|r?em|%)?$/i;
// Número literal seguido de porcentagem ou unidade de comprimento (absoluta,
// relativa à fonte, ao viewport ou ao contêiner). O grupo guarda o coeficiente.
const MEDIDA =
	/^([+-]?(?:\d*\.)?\d+)(?:e[+-]?\d+)?(?:%|px|cm|mm|q|in|pt|pc|r?(?:em|ex|ch|cap|ic|lh)|(?:[sld]?v|cq)(?:w|h|i|b|min|max))$/i;

function erroDaMargem(valor: string) {
	if (ZERO.test(valor) || valor.toLowerCase() === "auto") {
		return;
	}
	const coeficiente = MEDIDA.exec(valor)?.[1] ?? "";
	if (/[1-9]/.test(coeficiente)) {
		return coeficiente.startsWith("-") ? "margem negativa" : undefined;
	}
	return "o teste não sabe avaliar este valor. Escreva o número direto com a unidade.";
}

function conferirLados(regras: Regra[], tipo: "margin" | "padding") {
	for (const { onde, declaracoes } of regras) {
		for (const { propriedade, valor } of declaracoes) {
			if (!propriedade.startsWith(tipo)) {
				continue;
			}
			const declaracao = `${onde} { ${propriedade}: ${valor} }`;
			for (const v of lado(propriedade, valor, "dos lados")) {
				if (tipo === "padding") {
					expect(v, declaracao).toMatch(ZERO);
				} else {
					const erro = erroDaMargem(v);
					if (erro) {
						expect.fail(`${declaracao} (${v}): ${erro}`);
					}
				}
			}
		}
	}
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

describe("a leitura do CSS do link de texto", () => {
	it.each([
		[
			"a.acao-de-texto",
			"MARGIN-LEFT: calc(0px - 4px)",
			"margin",
			"o teste não sabe avaliar",
		],
		[
			"a.acao-de-texto > span",
			"margin-RIGHT: -4px",
			"margin",
			"margem negativa",
		],
		["a.acao-de-texto", "PADDING-LEFT: 4px", "padding", "padding-left: 4px"],
		["a.acao-de-texto", "margin: 0 0 0/**/-4px", "margin", "margem negativa"],
		[
			"a.acao-de-texto",
			"margin-left: -4px !important",
			"margin",
			"margem negativa",
		],
	] as const)("recusa %s { %s }", (seletor, declaracao, tipo, erro) => {
		const { regras } = lerRegrasDoLink(
			"exemplo.css",
			`${seletor} { ${declaracao}; }`,
		);
		expect(() => conferirLados(regras, tipo)).toThrow(erro);
	});

	it.each([
		"Margin-Block: calc(0px - 4px)",
		"margin: 0/**/0",
		"margin-left: AUTO",
		"margin-left: 0PX",
		"margin-left: 4px !important",
	])("aceita %s no link", (declaracao) => {
		const { regras } = lerRegrasDoLink(
			"exemplo.css",
			`a.acao-de-texto { ${declaracao}; }`,
		);
		expect(regras).toHaveLength(1);
		conferirLados(regras, "margin");
	});

	it.each([
		"a.acao-de-texto { & > span { margin-left: -4px; } }",
		"a.acao-de-texto > span { @media (min-width: 1px) { margin-left: -4px; } }",
		"a.acao-de-texto { margin-left: -4px; & > span { color: red; } }",
		"a.acao-de-texto { & > span { color: red; } margin-left: -4px; }",
		"a.acao-de-texto { @supports (display: grid) { color: red; } }",
		"a.acao-de-texto { @container (width > 1px) { color: red; } }",
		"a.acao-de-texto { @layer components { color: red; } }",
		".rodape-texto { a.acao-de-texto { margin-left: -4px; } }",
		"@scope (a.acao-de-texto) { :scope { margin-left: -4px; } }",
	])("pede a regra por extenso em %s", (css) => {
		const { aninhadas } = lerRegrasDoLink("exemplo.css", css);
		expect(aninhadas).toContainEqual(expect.stringContaining(".acao-de-texto"));
	});

	it("aceita uma regra aninhada que só cita outra classe", () => {
		const css = ".outra { & > span { margin-left: -4px; } }";
		expect(lerRegrasDoLink("exemplo.css", css)).toEqual({
			regras: [],
			aninhadas: [],
		});
	});

	it("lê o seletor por extenso dentro de um @media", () => {
		const css =
			"@media (min-width: 1px) { a.acao-de-texto > span { margin-left: -4px; } }";
		const { regras, aninhadas } = lerRegrasDoLink("exemplo.css", css);
		expect(aninhadas).toEqual([]);
		expect(() => conferirLados(regras, "margin")).toThrow("margem negativa");
	});
});

describe("o link de texto no Firefox", () => {
	it("escreve por extenso as regras que citam .acao-de-texto", () => {
		const aninhadas = folhas.flatMap((folha) => folha.aninhadas);
		expect(aninhadas, "Escreva a regra por extenso.").toEqual([]);
	});

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
		conferirLados(doLink, "padding");
	});

	it("não tem margem negativa dos lados, nem o que fica dentro dele", () => {
		conferirLados(doLink, "margin");
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
			expect(v.toLowerCase(), seletor).toBe(altura);
		}
	});
});
