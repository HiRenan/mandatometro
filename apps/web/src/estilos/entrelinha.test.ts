import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { trilhas } from "../lib/conteudo/paginas.server";

// A altura de linha dos títulos na letra do cartaz (a Archivo 900 condensada, em
// maiúsculas). Abaixo do que a tinta pede, o acento de uma linha encosta na de
// cima, como o Í de POLÍTICA no início, a 390 px (a #158). São duas alturas, pelo
// papel do título (o DESIGN.md): o cartaz, nos títulos curtos, e a leitura, nos
// que podem ter qualquer texto. Este teste lê o CSS, porque o jsdom não desenha.

/**
 * A tinta da letra, em em, a partir da linha de base: quanto as maiúsculas sobem
 * e descem. Medida por foto no Edge 157, em 18/11/2026, com a letra a 400 px, na
 * largura de 62% e na de 68%, que deram os mesmos números.
 */
const SOBE = { acento: 0.885, parentese: 0.738, maiuscula: 0.701 };
const DESCE = {
	cedilha: 0.211,
	virgula: 0.193,
	parentese: 0.163,
	q: 0.131,
	maiuscula: 0.012,
};

const ACENTO = /[ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑ]/;
const PARENTESE = /[()[\]{}]/;

function sobe(letra: string): number {
	if (ACENTO.test(letra)) {
		return SOBE.acento;
	}
	return PARENTESE.test(letra) ? SOBE.parentese : SOBE.maiuscula;
}

function desce(letra: string): number {
	if (letra === "Ç") {
		return DESCE.cedilha;
	}
	if (letra === "," || letra === ";") {
		return DESCE.virgula;
	}
	if (PARENTESE.test(letra)) {
		return DESCE.parentese;
	}
	return letra === "Q" ? DESCE.q : DESCE.maiuscula;
}

// Uma letra que desce sobre outra que sobe, na linha de baixo: a tinta das duas
// cabe na altura de linha que passa dessa soma.
const CEDILHA_SOBRE_ACENTO = DESCE.cedilha + SOBE.acento;
const CEDILHA_SOBRE_MAIUSCULA = DESCE.cedilha + SOBE.maiuscula;
const Q_SOBRE_MAIUSCULA = DESCE.q + SOBE.maiuscula;
const MAIUSCULA_SOBRE_MAIUSCULA = DESCE.maiuscula + SOBE.maiuscula;

/**
 * O pior par de um título: a letra que mais desce numa palavra somada à que mais
 * sobe numa palavra depois dela. Uma quebra entre as duas pode pôr uma sobre a
 * outra; as letras da mesma palavra ficam na mesma linha, porque o teto do título
 * não deixa a palavra se partir.
 */
function piorPar(titulo: string) {
	let pior = { soma: 0, cima: "", baixo: "" };
	let maisDesce = { soma: 0, palavra: "" };
	for (const palavra of titulo.toLocaleUpperCase("pt-BR").split(/\s+/)) {
		const letras = [...palavra];
		if (letras.length === 0) {
			continue;
		}
		const soma = maisDesce.soma + Math.max(...letras.map(sobe));
		if (maisDesce.palavra && soma > pior.soma) {
			pior = { soma, cima: maisDesce.palavra, baixo: palavra };
		}
		const desceAqui = Math.max(...letras.map(desce));
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

// Cada título com a altura de linha abaixo de 1. O mínimo é o pior par mais 1 px
// no menor tamanho.
const REGRAS: Regra[] = [
	// O cartaz: o início, as páginas de dentro, os passos e os fins. Os títulos
	// fixos foram medidos na grade da #158, e os do conteúdo, o último teste
	// confere: no pior, uma cedilha fica sobre uma maiúscula sem acento.
	{
		arquivo: "index.css",
		seletor: ".titulo-condensado",
		menor: 36,
		pior: CEDILHA_SOBRE_MAIUSCULA,
	},
	// QUIZ DA TRILHA, QUIZ FINAL e ANTES DA TRILHA: sem acento nem cedilha.
	{
		arquivo: "estilos/quiz.css",
		seletor: '.quiz[data-fase="abertura"] .quiz-titulo',
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

const ARQUIVOS = [
	"index.css",
	...readdirSync(new URL("./", import.meta.url))
		.filter((arquivo) => arquivo.endsWith(".css"))
		.map((arquivo) => `estilos/${arquivo}`),
];

/** Cada line-height sem unidade de um CSS, com o seletor da regra em que ele está. */
function alturas(arquivo: string) {
	const css = readFileSync(
		new URL(`../${arquivo}`, import.meta.url),
		"utf8",
	).replace(/\/\*[\s\S]*?\*\//g, "");
	const seletores: string[] = [];
	const achadas: { seletor: string; valor: number }[] = [];
	let comeco = 0;
	for (let i = 0; i < css.length; i++) {
		if (css[i] === "{") {
			seletores.push(css.slice(comeco, i).trim().replace(/\s+/g, " "));
		} else if (css[i] === "}") {
			seletores.pop();
		} else if (css[i] === ";") {
			const valor = /^\s*line-height:\s*([\d.]+)\s*$/.exec(
				css.slice(comeco, i),
			)?.[1];
			if (valor) {
				achadas.push({ seletor: seletores.at(-1) ?? "", valor: Number(valor) });
			}
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

describe("a entrelinha da letra do cartaz", () => {
	it.each(REGRAS)(
		"$seletor deixa 1 px entre a tinta de uma linha e a da outra",
		({ arquivo, seletor, menor, pior }) => {
			const valores = alturas(arquivo)
				.filter((achada) => achada.seletor === seletor)
				.map((achada) => achada.valor);
			expect(valores, `${arquivo} não tem o ${seletor}`).not.toEqual([]);
			for (const valor of valores) {
				expect(valor).toBeGreaterThanOrEqual(pior + 1 / menor);
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
			fora,
			"Ponha a regra na tabela deste teste, com o pior par de letras e o menor tamanho",
		).toEqual([]);
	});

	it("os títulos curtos do conteúdo não põem uma letra que desce sobre um acento", () => {
		const titulos = trilhas.flatMap((trilha) => {
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
		const encostam = titulos.flatMap(({ arquivo, texto, regras }) => {
			const { soma, cima, baixo } = piorPar(texto);
			return regras.some((r) => soma > r.pior)
				? [`${arquivo}: em "${texto}", ${cima} pode ficar sobre ${baixo}`]
				: [];
		});
		expect(
			encostam,
			"Escreva o título de outro jeito: veja docs/conteudo-das-trilhas.md",
		).toEqual([]);
	});
});
