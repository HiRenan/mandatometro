import { globSync, readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { trilhas } from "../lib/conteudo/paginas.server";
import { FRASE_DO_RECOMECO, frasesDoAndamento } from "../lib/quiz";

// A altura de linha dos títulos na letra do cartaz (a Archivo 900 condensada, em
// maiúsculas). Abaixo do que a tinta pede, o acento de uma linha encosta na de
// cima, como o Í de POLÍTICA no início, a 390 px (a #158). São duas alturas, pelo
// papel do título (o DESIGN.md): o cartaz, nos títulos curtos, e a leitura, nos
// que podem ter qualquer texto. O jsdom não desenha a tinta.
// O enunciado do quiz fica de fora. Usa minúsculas e altura de 1,02 no quiz.css.
// A prévia do link é uma imagem gerada à parte. O apps/web/imagens/previa.html usa 0,86.

/**
 * A tinta da letra, em em, a partir da linha de base: quanto as maiúsculas sobem
 * e descem. Fotos a 400 px no Edge 157 e no Firefox 155, a 62% e 68% de
 * largura (#158 e #179). Uma descida negativa termina acima da linha de base.
 */
const MAIUSCULA = {
	letras: "ABCDEFGHIJKLMNOPRSTUVWXYZ",
	sobe: 0.701,
	desce: 0.012,
};
const ACENTO = { letras: "ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑ", sobe: 0.885, desce: 0.012 };
const CEDILHA = { letras: "Ç", sobe: 0.701, desce: 0.211 };
const Q = { letras: "Q", sobe: 0.701, desce: 0.131 };
const TINTAS = [
	MAIUSCULA,
	ACENTO,
	CEDILHA,
	Q,
	{ letras: ",;", sobe: 0.701, desce: 0.193 },
	{ letras: "()[]{}", sobe: 0.738, desce: 0.163 },
	{ letras: "/", sobe: 0.7363, desce: 0.0488 },
	{ letras: "§", sobe: 0.7013, desce: 0.185 },
	{ letras: ".", sobe: 0.1825, desce: 0 },
	{ letras: "-", sobe: 0.3463, desce: -0.2037 },
	{ letras: "0123456789", sobe: 0.7, desce: 0.0125 },
];

// Uma letra que desce sobre outra que sobe, na linha de baixo: a tinta das duas
// cabe na altura de linha que passa dessa soma.
const CEDILHA_SOBRE_ACENTO = CEDILHA.desce + ACENTO.sobe;
const CEDILHA_SOBRE_MAIUSCULA = CEDILHA.desce + MAIUSCULA.sobe;
const Q_SOBRE_MAIUSCULA = Q.desce + MAIUSCULA.sobe;
const MAIUSCULA_SOBRE_MAIUSCULA = MAIUSCULA.desce + MAIUSCULA.sobe;

/**
 * O pior par de um título: a letra que mais desce numa palavra somada à que mais
 * sobe numa palavra depois dela. Uma quebra entre as duas pode pôr uma sobre a
 * outra; as letras da mesma palavra ficam na mesma linha, porque o teto do título
 * não deixa a palavra se partir.
 */
function piorPar(titulo: string, arquivo = "") {
	let pior = { soma: 0, cima: "", baixo: "" };
	let maisDesce = { soma: Number.NEGATIVE_INFINITY, palavra: "" };
	const maiusculas = titulo.normalize("NFC").toLocaleUpperCase("pt-BR");
	for (const palavra of maiusculas.split(/\s+|(?<=[/-])/u).filter(Boolean)) {
		const tintas = [...palavra].map((letra) => {
			const tinta = TINTAS.find(({ letras }) => letras.includes(letra));
			if (!tinta) {
				const motivo = `em "${titulo}", o sinal "${letra}" está sem medida. Meça a tinta dele e ponha a medida na tabela.`;
				throw new Error([arquivo, motivo].filter(Boolean).join(": "));
			}
			return tinta;
		});
		const soma = maisDesce.soma + Math.max(...tintas.map((t) => t.sobe));
		if (maisDesce.palavra && soma > pior.soma) {
			pior = { soma, cima: maisDesce.palavra, baixo: palavra };
		}
		const desceAqui = Math.max(...tintas.map((t) => t.desce));
		if (desceAqui > maisDesce.soma) {
			maisDesce = { soma: desceAqui, palavra };
		}
	}
	return pior;
}

type Regra = {
	arquivo: string;
	seletor: string;
	/** O menor tamanho da letra, em px, na grade da #158 (320 a 1920 px, letra a 100% e a 200%). */
	menor: number;
	/** O pior par de letras que o texto da regra põe uma sobre a outra, em em. */
	pior: number;
};

const ABERTURA_DO_QUIZ = '.quiz[data-fase="abertura"] .quiz-titulo';

// Cada título com a altura de linha abaixo de 1. O mínimo é o pior par mais 1 px
// no menor tamanho.
const REGRAS: Regra[] = [
	// O cartaz: o início, as páginas de dentro, os passos e os fins. Os títulos
	// do conteúdo e os fixos do site passam pela mesma conta do pior par.
	{
		arquivo: "index.css",
		seletor: ".titulo-condensado",
		menor: 36,
		pior: CEDILHA_SOBRE_MAIUSCULA,
	},
	// QUIZ DA TRILHA, QUIZ FINAL e ANTES DA TRILHA: sem acento nem cedilha.
	{
		arquivo: "estilos/quiz.css",
		seletor: ABERTURA_DO_QUIZ,
		menor: 64,
		pior: Q_SOBRE_MAIUSCULA,
	},
	// VOCÊ ACERTOU. e VOCÊ ERROU.: o acento fica na primeira palavra.
	{
		arquivo: "estilos/quiz.css",
		seletor: ".quiz-veredito",
		menor: 64,
		pior: MAIUSCULA_SOBRE_MAIUSCULA,
	},
	// O título do caminho, no início e ao lado dos artigos (o último teste confere).
	{
		arquivo: "index.css",
		seletor: ".caminho-cabeca h2",
		menor: 44,
		pior: Q_SOBRE_MAIUSCULA,
	},
	{
		arquivo: "index.css",
		seletor: ".ao-lado > h2",
		menor: 30,
		pior: Q_SOBRE_MAIUSCULA,
	},
	// A leitura: as perguntas dos artigos, as folhas, os intertítulos e o que vem
	// da API, com qualquer texto.
	{
		arquivo: "index.css",
		seletor: ".artigo-folha h1",
		menor: 42,
		pior: CEDILHA_SOBRE_ACENTO,
	},
	{
		arquivo: "index.css",
		seletor: ".titulo-de-folha",
		menor: 24,
		pior: CEDILHA_SOBRE_ACENTO,
	},
	{
		arquivo: "index.css",
		seletor: ".subtitulo-condensado",
		menor: 30,
		pior: CEDILHA_SOBRE_ACENTO,
	},
	{
		arquivo: "index.css",
		seletor: ".texto h2",
		menor: 28,
		pior: CEDILHA_SOBRE_ACENTO,
	},
];

/** Os números, a letra da opção do quiz e a marca: uma linha só. */
const SEM_SEGUNDA_LINHA = [
	".numeral",
	".aba-n",
	".quiz-letra",
	".votacao .contagem dd",
	".rodape .nome-do-site",
];

const raiz = new URL("../", import.meta.url);
const ler = (arquivo: string) => readFileSync(new URL(arquivo, raiz), "utf8");
const ARQUIVOS = globSync(["index.css", "estilos/*.css"], { cwd: raiz }).map(
	(arquivo) => arquivo.replaceAll("\\", "/"),
);

/** A altura relativa à letra, na propriedade inteira ou depois da barra de font. */
function alturaDaDeclaracao(declaracao: string) {
	const direta =
		/^\s*line-height\s*:\s*(\d*\.?\d+)(?:em)?\s*(?:!\s*important\s*)?$/i;
	if (!/^\s*font\s*:/i.test(declaracao)) return direta.exec(declaracao)?.[1];
	// Só a barra fora de calc(), var() e nomes de fonte entre aspas dá a altura.
	let nivel = 0;
	for (const sinal of declaracao.matchAll(
		/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[()/]/g,
	)) {
		if (sinal[0] === "(") nivel++;
		if (sinal[0] === ")") nivel--;
		if (sinal[0] === "/" && nivel === 0) {
			const altura = declaracao.slice(sinal.index + 1);
			return /^\s*(\d*\.?\d+)(?:em)?(?=\s|!|$)/i.exec(altura)?.[1];
		}
	}
}

function alturas(arquivo: string) {
	const css = ler(arquivo).replace(/\/\*[\s\S]*?\*\//g, "");
	const seletores: string[] = [];
	const achadas: { seletor: string; valor: number }[] = [];
	let comeco = 0;
	for (let i = 0; i < css.length; i++) {
		if (css[i] === "{") {
			seletores.push(css.slice(comeco, i).trim().replace(/\s+/g, " "));
		} else if (css[i] === ";" || css[i] === "}") {
			const valor = alturaDaDeclaracao(css.slice(comeco, i));
			if (valor !== undefined) {
				achadas.push({ seletor: seletores.at(-1) ?? "", valor: Number(valor) });
			}
			if (css[i] === "}") seletores.pop();
		} else {
			continue;
		}
		comeco = i + 1;
	}
	return achadas;
}

function regra(seletor: string): Regra {
	const achada = REGRAS.find((r) => r.seletor === seletor);
	if (!achada) {
		throw new Error(`a tabela não tem ${seletor}`);
	}
	return achada;
}

type Titulo = {
	arquivo: string;
	texto: string;
	regras: Regra[];
	parMedido?: boolean;
};

function percorrer(no: ts.Node, visitar: (no: ts.Node) => void) {
	visitar(no);
	ts.forEachChild(no, (filho) => percorrer(filho, visitar));
}

function atributo(no: ts.JsxOpeningLikeElement, nome: string) {
	return no.attributes.properties
		.filter(ts.isJsxAttribute)
		.find((a) => a.name.getText() === nome)?.initializer;
}

function classesDo(no: ts.JsxOpeningLikeElement) {
	const classes: string[] = [];
	const valor = atributo(no, "className");
	if (valor)
		percorrer(valor, (parte) => {
			if (ts.isStringLiteralLike(parte))
				classes.push(...parte.text.split(/\s+/));
		});
	return classes;
}

const frasesDoFim = [
	...new Set(
		trilhas.flatMap((t) =>
			[t.quiz, t.quizFinal].flatMap((quiz) =>
				quiz ? frasesDoAndamento(quiz.perguntas.length) : [],
			),
		),
	),
];

/** Lê os textos à vista. Reservas repete as frases em cópias invisíveis. */
function cartazesDoTsx(arquivo: string) {
	const fonte = ts.createSourceFile(
		arquivo,
		ler(arquivo),
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const nomes = new Map<string, string[]>([
		["FRASE_DO_RECOMECO", [FRASE_DO_RECOMECO]],
	]);
	// O cartaz da conta recebe o título por prop: os textos dele ficam nos
	// objetos de textos do formulario-conta.tsx, que entra na leitura.
	const daConta = arquivo === "components/cartaz-da-conta.tsx";
	const fontes = daConta
		? [
				fonte,
				ts.createSourceFile(
					"components/formulario-conta.tsx",
					ler("components/formulario-conta.tsx"),
					ts.ScriptTarget.Latest,
					true,
					ts.ScriptKind.TSX,
				),
			]
		: [fonte];
	for (const lida of fontes)
		percorrer(lida, (no) => {
			if (
				!(ts.isVariableDeclaration(no) || ts.isBindingElement(no)) ||
				!no.initializer
			)
				return;
			const valor = no.initializer;
			if (ts.isStringLiteralLike(valor))
				nomes.set(no.name.getText(), [valor.text]);
			// Os títulos das telas da conta vêm de objetos de textos.
			if (ts.isObjectLiteralExpression(valor)) {
				const opcoes = valor.properties.flatMap((p) =>
					ts.isPropertyAssignment(p) && ts.isStringLiteralLike(p.initializer)
						? [p.initializer.text]
						: [],
				);
				if (opcoes.length === valor.properties.length)
					nomes.set(no.name.getText(), opcoes);
			}
		});
	// O título do cartaz da conta é o de uma das sete telas ou o da conclusão.
	if (daConta)
		nomes.set("titulo", [
			...(nomes.get("titulos") ?? []),
			...(nomes.get("titulosDaConclusao") ?? []),
		]);

	function textos(no: ts.Node | undefined): string[] {
		if (!no) return [""];
		if (ts.isJsxText(no) || ts.isStringLiteralLike(no)) return [no.text];
		if (ts.isJsxExpression(no)) return textos(no.expression);
		if (ts.isConditionalExpression(no))
			return [...textos(no.whenTrue), ...textos(no.whenFalse)];
		if (
			ts.isBinaryExpression(no) &&
			no.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken
		)
			return ["", ...textos(no.right)];
		if (ts.isJsxSelfClosingElement(no)) {
			if (no.tagName.getText() === "Palavras")
				return textos(atributo(no, "texto"));
			if (no.tagName.getText() === "Reservas") return [""];
		}
		if (ts.isJsxElement(no) || ts.isJsxFragment(no)) {
			// O lema do cartaz inicial usa a letra de máquina de escrever.
			if (
				arquivo === "components/pagina-inicial.tsx" &&
				ts.isJsxElement(no) &&
				no.openingElement.tagName.getText() === "em"
			)
				return [""];
			return no.children.reduce<string[]>(
				(antes, filho) => {
					const partes = textos(filho);
					return antes.flatMap((inicio) => partes.map((fim) => inicio + fim));
				},
				[""],
			);
		}
		if (
			ts.isCallExpression(no) &&
			no.expression.getText() === "fraseDoAndamento"
		)
			return frasesDoFim;
		// O título do jogo também vem do Markdown, mas é um só: o roteiro.test.ts
		// prende o texto, e aqui ele é medido como os escritos no código.
		if (no.getText() === "jogo.titulo") return ["Jogo das Comissões"];
		// Os títulos de trilha e de passo são lidos do Markdown. Os das edições e
		// dos artigos aparecem na folha de leitura, que aceita qualquer texto.
		if (
			[
				"trilha.titulo",
				"caminho.titulo",
				"infografico.titulo",
				"doPasso.titulo",
			].includes(no.getText())
		)
			return [""];
		const nome = ts.isElementAccessExpression(no)
			? no.expression.getText()
			: no.getText();
		const achados = nomes.get(nome);
		if (achados) return achados;
		throw new Error(
			`${arquivo}: inclua no teste o texto do título que vem de ${nome}.`,
		);
	}

	const titulos: Titulo[] = [];
	const utilitarios: string[] = [];
	percorrer(fonte, (no) => {
		if (!(ts.isJsxElement(no) || ts.isJsxSelfClosingElement(no))) return;
		const tag = ts.isJsxElement(no) ? no.openingElement : no;
		const elemento = tag.tagName.getText();
		const classes = classesDo(tag);
		const pai = ts.isJsxElement(no.parent)
			? classesDo(no.parent.openingElement)
			: [];
		let seletor: string | undefined;
		if (elemento === "Quiz" || classes.includes("quiz-titulo"))
			seletor = ABERTURA_DO_QUIZ;
		else if (classes.includes("quiz-veredito")) seletor = ".quiz-veredito";
		else if (elemento === "h2" && pai.includes("caminho-cabeca"))
			seletor = ".caminho-cabeca h2";
		else if (elemento === "h2" && pai.includes("ao-lado"))
			seletor = ".ao-lado > h2";
		else if (
			classes.includes("titulo-condensado") &&
			!pai.includes("artigo-folha")
		)
			seletor = ".titulo-condensado";
		const baixas = classes.filter((classe) => {
			const altura = /(?:^|:)!?leading-\[(\d*\.?\d+)\]!?$/.exec(classe)?.[1];
			return altura !== undefined && Number(altura) < 1;
		});
		if (!seletor && !baixas.length) return;

		const opcoes = seletor
			? textos(elemento === "Quiz" ? atributo(tag, "titulo") : no)
					.map((s) => s.replace(/\s+/g, " ").trim())
					.filter(Boolean)
			: [];
		for (const classe of baixas) {
			const rotulo = opcoes.join(" / ") || no.getText();
			utilitarios.push(`${arquivo}: ${rotulo} (${classe})`);
		}
		if (!seletor) return;
		for (const texto of new Set(opcoes)) {
			// A #158 mediu pelo menos 1,5 px entre as linhas deste cartaz.
			const parMedido =
				arquivo === "components/pagina-das-edicoes.tsx" &&
				pai.includes("sem-edicoes") &&
				texto === "A primeira edição ainda não saiu";
			titulos.push({ arquivo, texto, regras: [regra(seletor)], parMedido });
		}
	});
	return { titulos, utilitarios };
}

const telas = globSync("**/*.tsx", {
	cwd: raiz,
	exclude: ["**/*.test.tsx"],
}).map((arquivo) => cartazesDoTsx(arquivo.replaceAll("\\", "/")));

describe("a entrelinha da letra do cartaz", () => {
	it.each(["Projeto/ É lei", "Projeto§ É lei"])(
		'avisa quando o sinal de "%s" pode encostar no acento',
		(titulo) => {
			expect(piorPar(titulo).soma).toBeGreaterThan(CEDILHA_SOBRE_MAIUSCULA);
		},
	);

	it("pede a medida de um sinal desconhecido mesmo num título de uma palavra", () => {
		expect(() => piorPar("Direito☃")).toThrow(/Direito☃.*☃.*tinta.*tabela/);
	});

	it("lê a altura depois da barra de font e ignora as barras do tamanho e do nome da fonte", () => {
		expect(
			[
				"line-height: 0.9em",
				"line-height: 0.9 !important",
				"font: 900 2rem/0.9",
				"font: 900 calc(2rem / 2) / 0.9em Archivo",
				"font: 900 calc(2rem / 0.9 ) Archivo",
				'font: 2rem "Archivo / 0.9"',
			].map(alturaDaDeclaracao),
		).toEqual(["0.9", "0.9", "0.9", "0.9", undefined, undefined]);
	});

	it.each(REGRAS)(
		"$seletor deixa 1 px entre a tinta de uma linha e a da outra",
		({ arquivo, seletor, menor, pior }) => {
			const valores = alturas(arquivo)
				.filter((achada) => achada.seletor === seletor)
				.map((achada) => achada.valor);
			expect(valores, `${arquivo} não tem o ${seletor}`).not.toEqual([]);
			for (const valor of valores) {
				expect(
					valor,
					`${arquivo}: ${seletor} com altura ${valor} precisa deixar 1 px entre as linhas`,
				).toBeGreaterThanOrEqual(pior + 1 / menor);
			}
		},
	);

	it("só os títulos da tabela e o que não quebra ficam abaixo de 1", () => {
		const fora = ARQUIVOS.flatMap((arquivo) =>
			alturas(arquivo)
				.filter(
					({ seletor, valor }) =>
						valor < 1 &&
						!SEM_SEGUNDA_LINHA.includes(seletor) &&
						!REGRAS.some((r) => r.arquivo === arquivo && r.seletor === seletor),
				)
				.map(({ seletor, valor }) => `${arquivo}: ${seletor} (${valor})`),
		);
		expect(
			[...fora, ...telas.flatMap((tela) => tela.utilitarios)],
			"Ponha a regra na tabela deste teste, com o pior par de letras e o menor tamanho",
		).toEqual([]);
	});

	it("os títulos curtos do conteúdo e dos componentes respeitam a tinta do cartaz", () => {
		const titulos: Titulo[] = trilhas.flatMap((trilha) => {
			const pasta = `conteudo/trilhas/${trilha.slug}`;
			const caminho = trilha.infografico;
			return [
				{
					arquivo: `${pasta}/trilha.md`,
					texto: trilha.titulo,
					regras: [regra(".titulo-condensado")],
				},
				...(caminho
					? [
							{
								arquivo: `${pasta}/infografico.md`,
								texto: caminho.titulo,
								regras: [regra(".caminho-cabeca h2"), regra(".ao-lado > h2")],
							},
							...caminho.passos.map((passo) => ({
								arquivo: `${pasta}/infografico.md`,
								texto: passo.titulo,
								regras: [regra(".titulo-condensado")],
							})),
						]
					: []),
			];
		});
		const fixos = telas.flatMap((tela) => tela.titulos);
		expect(
			fixos.some((t) => t.arquivo === "components/nao-encontrado.tsx"),
		).toBe(true);
		const encostam = [...titulos, ...fixos].flatMap(
			({ arquivo, texto, regras, parMedido }) => {
				const { soma, cima, baixo } = piorPar(texto, arquivo);
				if (parMedido && cima === "EDIÇÃO" && baixo === "NÃO") return [];
				return regras.some((r) => soma > r.pior)
					? [`${arquivo}: em "${texto}", ${cima} pode ficar sobre ${baixo}`]
					: [];
			},
		);
		expect(
			encostam,
			"Escreva o título de outro jeito: veja docs/conteudo-das-trilhas.md",
		).toEqual([]);
	});
});
