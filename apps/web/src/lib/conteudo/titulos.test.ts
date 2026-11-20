import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	COMO_APARECE,
	type EstiloDeTitulo,
	LARGURAS_DAS_LETRAS,
} from "./larguras-das-letras";
import { trilhas } from "./paginas.server";
import { FOLGA, largura, palavras } from "./regua";

// Com a letra do navegador grande, cada título com teto (o letra-com-teto do
// index.css) diminui até a palavra mais larga dele caber na tela do celular: o
// --palavra é a largura dessa palavra, em em. Uma palavra mais larga que o --palavra
// não cabe nem no teto e se parte no meio. Este teste mede as palavras dos títulos
// do conteúdo e avisa quem escreve: o que fazer está em docs/conteudo-das-trilhas.md.

/** Um arquivo do código do site, a partir de src/. */
const codigo = (arquivo: string) =>
	readFileSync(new URL(`../../${arquivo}`, import.meta.url), "utf8");

const paginaDaTrilha = codigo("routes/trilhas/$trilha/index.tsx");
const listaDasTrilhas = codigo("routes/trilhas/index.tsx");
const paginaDoArtigo = codigo("routes/trilhas/$trilha/$artigo.tsx");
const passoAPasso = codigo("components/infografico-em-linha.tsx");
const caminhoDaTrilha = codigo("components/infografico.tsx");
const outrosArtigos = codigo("components/outros-artigos.tsx");
const paginaDasEdicoes = codigo("components/pagina-das-edicoes.tsx");
const paginaDosJogos = codigo("routes/jogos.tsx");
const css = codigo("index.css");

// A régua (largura, palavras e a FOLGA) mora em regua.ts, que também dá o teto dos
// títulos que vêm da API, como os das edições.

/**
 * O --palavra de um título, lido da primeira linha do código que tem as classes
 * dele (ou a etiqueta, como "<h3", quando duas linhas têm as mesmas classes). Com
 * a variante, como "letra-grande:", lê o número que só vale nela, na mesma linha.
 */
function tetoNoCodigo(
	codigo: string,
	arquivo: string,
	classes: string[],
	variante = "",
): number {
	const linha = codigo
		.split("\n")
		.find((l) => classes.every((c) => l.split(/[\s"'`]+/).includes(c)));
	const numero =
		linha &&
		new RegExp(`(?:^|[\\s"'\`])${variante}\\[--palavra:([\\d.]+)\\]`).exec(
			linha,
		)?.[1];
	if (!numero) {
		throw new Error(
			`não achei o ${variante}[--palavra:…] do título com ${classes.join(" ")} em ${arquivo}`,
		);
	}
	return Number(numero);
}

/** O --palavra do intertítulo, no bloco do .texto h2 do index.css. */
function tetoDoIntertitulo(): number {
	const numero = /\.texto h2 \{[^}]*--palavra:\s*([\d.]+)/.exec(css)?.[1];
	if (!numero) {
		throw new Error("não achei o --palavra do .texto h2 em src/index.css");
	}
	return Number(numero);
}

type Teto = { lugar: string; estilo: EstiloDeTitulo; palavra: number };

const TETOS = {
	trilha: {
		lugar: "no título da trilha",
		estilo: "titulo-condensado",
		palavra: tetoNoCodigo(paginaDaTrilha, "routes/trilhas/$trilha/index.tsx", [
			"titulo-condensado",
			"letra-com-teto",
		]),
	},
	trilhaNaLista: {
		lugar: "no título da trilha, em /trilhas",
		estilo: "titulo-condensado",
		palavra: tetoNoCodigo(listaDasTrilhas, "routes/trilhas/index.tsx", [
			"titulo-de-folha",
			"letra-com-teto",
		]),
	},
	artigo: {
		lugar: "no título do artigo",
		estilo: "titulo-condensado",
		palavra: tetoNoCodigo(
			paginaDoArtigo,
			"routes/trilhas/$trilha/$artigo.tsx",
			["titulo-condensado", "letra-com-teto"],
		),
	},
	folha: {
		lugar: "no título da folha, na página da trilha",
		estilo: "titulo-condensado",
		palavra: tetoNoCodigo(paginaDaTrilha, "routes/trilhas/$trilha/index.tsx", [
			"titulo-de-folha",
			"letra-com-teto",
		]),
	},
	outroArtigo: {
		lugar: "no anterior e no próximo, no pé do artigo e do quiz",
		estilo: "titulo-condensado",
		palavra: tetoNoCodigo(outrosArtigos, "components/outros-artigos.tsx", [
			"titulo-de-folha",
			"letra-com-teto",
		]),
	},
	intertitulo: {
		lugar: "no intertítulo (##)",
		estilo: "subtitulo-condensado",
		palavra: tetoDoIntertitulo(),
	},
	caminho: {
		lugar: "no título do caminho, na página inicial",
		estilo: "titulo-condensado",
		palavra: tetoNoCodigo(passoAPasso, "components/infografico-em-linha.tsx", [
			"titulo-condensado",
			"letra-com-teto",
		]),
	},
	edicoes: {
		lugar: "no título da lista das edições",
		estilo: "titulo-condensado",
		palavra: tetoNoCodigo(
			paginaDasEdicoes,
			"components/pagina-das-edicoes.tsx",
			["titulo-condensado", "letra-com-teto"],
		),
	},
	semEdicoes: {
		lugar: "no título da lista sem edição",
		estilo: "titulo-condensado",
		palavra: tetoNoCodigo(
			paginaDasEdicoes,
			"components/pagina-das-edicoes.tsx",
			["<h2", "titulo-condensado", "letra-com-teto"],
		),
	},
	jogo: {
		lugar: "no título da página do jogo",
		estilo: "titulo-condensado",
		palavra: tetoNoCodigo(paginaDosJogos, "routes/jogos.tsx", [
			"titulo-condensado",
			"letra-com-teto",
		]),
	},
	passo: {
		lugar: "no título do passo, na página inicial",
		estilo: "titulo-condensado",
		palavra: tetoNoCodigo(passoAPasso, "components/infografico-em-linha.tsx", [
			"<h3",
			"titulo-condensado",
			"letra-com-teto",
		]),
	},
	// O título do passo na sanfona da trilha tem dois números na mesma linha: o
	// de sempre, em maiúsculas espaçadas, e o da letra grande, abaixo de 22rem,
	// onde ele fica como escrito.
	passoNaSanfona: {
		lugar: "no título do passo, na sanfona da trilha",
		estilo: "titulo-da-sanfona",
		palavra: tetoNoCodigo(caminhoDaTrilha, "components/infografico.tsx", [
			"letra-com-teto",
		]),
	},
	passoNaSanfonaComLetraGrande: {
		lugar: "no título do passo, na sanfona da trilha, abaixo de 22rem",
		estilo: "titulo-da-sanfona-letra-grande",
		palavra: tetoNoCodigo(
			caminhoDaTrilha,
			"components/infografico.tsx",
			["letra-com-teto"],
			"letra-grande:",
		),
	},
} satisfies Record<string, Teto>;

const emEm = (n: number) => n.toFixed(2).replace(".", ",");

/** As palavras de um texto que, com a folga, passam de um dos tetos. */
function largasDe(arquivo: string, texto: string, tetos: Teto[]): string[] {
	const largas: string[] = [];
	for (const palavra of palavras(texto)) {
		for (const teto of tetos) {
			const precisa = largura(palavra, teto.estilo) * FOLGA;
			if (precisa > teto.palavra) {
				largas.push(
					`${arquivo}: "${palavra}" precisa de ${emEm(precisa)} em ${teto.lugar}, e o teto é ${emEm(teto.palavra)} em`,
				);
			}
		}
	}
	return largas;
}

describe("a régua das letras", () => {
	it("fica igual ou um pouco acima da largura medida no navegador", () => {
		// Medidas na página, no navegador do Orca (Chromium 150), em 13/11/2026, com
		// a palavra inteira. A soma das letras não conta o kerning que aproxima as
		// letras: ela não pode ficar abaixo da medida, e passa dela em até 2%.
		const medidas: Array<[string, EstiloDeTitulo, number]> = [
			["fundamentais?", "titulo-condensado", 6.243],
			["Constituição", "titulo-condensado", 5.615],
			["fundamentais?", "subtitulo-condensado", 6.7605],
			["constitucionalidade", "subtitulo-condensado", 9.5787],
		];
		// O título do passo da sanfona, medido no Edge 157, sem janela, em 18/11/2026,
		// com a palavra inteira, no próprio título da página da trilha: em maiúsculas,
		// com o espaço entre as letras, e como escrito, sem ele (a letra grande).
		medidas.push(
			["Apresentação", "titulo-da-sanfona", 9.1525],
			["Sanção", "titulo-da-sanfona", 4.7475],
			["Apresentação", "titulo-da-sanfona-letra-grande", 6.901],
			["outra", "titulo-da-sanfona-letra-grande", 2.583],
		);
		for (const [palavra, estilo, medida] of medidas) {
			const soma = largura(palavra, estilo);
			expect(soma, `${palavra}, ${estilo}`).toBeGreaterThanOrEqual(medida);
			expect(soma, `${palavra}, ${estilo}`).toBeLessThanOrEqual(medida * 1.02);
		}
	});

	it("mede a palavra em maiúsculas, como ela aparece na tela", () => {
		expect(largura("constituição", "titulo-condensado")).toBe(
			largura("CONSTITUIÇÃO", "titulo-condensado"),
		);
		expect(largura("apresentação", "titulo-da-sanfona")).toBe(
			largura("APRESENTAÇÃO", "titulo-da-sanfona"),
		);
	});

	it("usa o peso e a largura da fonte com que cada régua foi medida", () => {
		const usos: [EstiloDeTitulo, string][] = [
			["titulo-condensado", ".titulo-condensado"],
			["titulo-condensado", ".titulo-de-folha"],
			["subtitulo-condensado", ".subtitulo-condensado"],
			["subtitulo-condensado", ".texto h2"],
			["titulo-da-sanfona", ".sanfona h3"],
			["titulo-da-sanfona-letra-grande", ".sanfona h3"],
		];
		for (const [estilo, seletor] of usos) {
			const regras = doIndex.filter(
				(r) => !r.media.length && r.seletores.includes(seletor),
			);
			const medida = COMO_APARECE[estilo];
			expect(
				ultimoValor(regras, "font-weight"),
				`index.css ${seletor} precisa do font-weight medido para ${estilo}`,
			).toBe(String(medida.peso));
			// O passo usa a largura normal da fonte (100%).
			const largura = ultimoValor(regras, "font-stretch") ?? "normal";
			expect(
				largura === "normal" ? "100%" : largura,
				`index.css ${seletor} precisa do font-stretch medido para ${estilo}`,
			).toBe(medida.largura);
		}
	});

	it("mede como escrita a palavra do título que a letra grande deixa sem maiúsculas", () => {
		// Abaixo de 22rem, o título do passo da sanfona fica como escrito, e as
		// minúsculas são mais estreitas que as maiúsculas.
		expect(largura("Apresentação", "titulo-da-sanfona-letra-grande")).toBe(
			largura(
				"Apresentação".normalize("NFD"),
				"titulo-da-sanfona-letra-grande",
			),
		);
		expect(
			largura("Apresentação", "titulo-da-sanfona-letra-grande"),
		).toBeLessThan(largura("APRESENTAÇÃO", "titulo-da-sanfona-letra-grande"));
	});

	it("conta o par que o navegador alarga", () => {
		// Medidas como as letras da tabela: o algarismo junto de um traço fica 0,04 em
		// mais largo que a soma das duas letras.
		expect(largura("4–", "titulo-condensado")).toBeCloseTo(0.785, 3);
		expect(largura("1-", "subtitulo-condensado")).toBeCloseTo(0.713, 3);
	});

	it("mede igual a letra com o acento junto ou separado", () => {
		const junto = "Constituição".normalize("NFC");
		const separado = "Constituição".normalize("NFD");
		expect(largura(separado, "titulo-condensado")).toBe(
			largura(junto, "titulo-condensado"),
		);
	});

	it("conta a letra fora da tabela como a mais larga", () => {
		const maisLarga = Math.max(
			...Object.values(LARGURAS_DAS_LETRAS["titulo-condensado"]),
		);
		expect(largura("☃", "titulo-condensado")).toBe(maisLarga);
	});

	it("separa as palavras no espaço e depois do hífen", () => {
		expect(palavras("Procuradoria-Geral da República?")).toEqual([
			"Procuradoria-",
			"Geral",
			"da",
			"República?",
		]);
	});
});

describe("as palavras dos títulos", () => {
	it("cabem no teto da letra grande", () => {
		const largas: string[] = [];
		for (const trilha of trilhas) {
			const pasta = `conteudo/trilhas/${trilha.slug}`;
			largas.push(
				...largasDe(`${pasta}/trilha.md`, trilha.titulo, [
					TETOS.trilha,
					TETOS.trilhaNaLista,
					// "Voltar para" e o nome da trilha, no pé do último artigo.
					TETOS.outroArtigo,
				]),
			);
			for (const artigo of trilha.artigos) {
				const arquivo = `${pasta}/${artigo.slug}.md`;
				largas.push(
					...largasDe(arquivo, artigo.titulo, [
						TETOS.artigo,
						TETOS.folha,
						TETOS.outroArtigo,
					]),
				);
				for (const [, intertitulo] of artigo.corpo.matchAll(/^##\s+(.+)$/gm)) {
					largas.push(...largasDe(arquivo, intertitulo, [TETOS.intertitulo]));
				}
			}
			// O caminho da trilha aparece na página inicial, passo a passo, e na
			// página da trilha, na sanfona.
			if (trilha.infografico) {
				const arquivo = `${pasta}/infografico.md`;
				largas.push(
					...largasDe(arquivo, trilha.infografico.titulo, [TETOS.caminho]),
				);
				for (const passo of trilha.infografico.passos) {
					largas.push(
						...largasDe(arquivo, passo.titulo, [
							TETOS.passo,
							TETOS.passoNaSanfona,
							TETOS.passoNaSanfonaComLetraGrande,
						]),
					);
				}
			}
		}
		expect(
			largas,
			"Troque a palavra por uma mais curta, ou meça o teto de novo: veja docs/conteudo-das-trilhas.md",
		).toEqual([]);
	});

	it("o título da página do jogo cabe no teto", () => {
		// O título vem do conteudo/jogo/comissoes/jogo.md, e o roteiro.test.ts
		// prende o texto: o teto fica escrito no código, com o [--palavra:N] dele.
		expect(
			largasDe("routes/jogos.tsx", "Jogo das Comissões", [TETOS.jogo]),
		).toEqual([]);
	});

	it("os títulos fixos das páginas das edições cabem no teto", () => {
		// Os títulos das edições vêm da API e levam o teto calculado (regua.ts);
		// estes ficam escritos no código, com o [--palavra:N] deles.
		const arquivo = "components/pagina-das-edicoes.tsx";
		expect([
			...largasDe(arquivo, "Edições", [TETOS.edicoes]),
			...largasDe(arquivo, "A primeira edição ainda não saiu", [
				TETOS.semEdicoes,
			]),
		]).toEqual([]);
	});
});

type Regra = {
	arquivo: string;
	seletores: string[];
	media: string[];
	corpo: string;
};

/**
 * As regras de um CSS, sem os comentários e o texto entre aspas, cada uma com as
 * condições dos @media em volta dela.
 */
function regrasDoCss(arquivo: string): Regra[] {
	const texto = codigo(arquivo)
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/"[^"]*"|'[^']*'/g, '""');
	const regras: Regra[] = [];
	const blocos = [{ cabeca: "", corpo: "" }];
	let trecho = "";
	for (const letra of texto) {
		if (letra === "{") {
			blocos.push({ cabeca: trecho.replace(/\s+/g, " ").trim(), corpo: "" });
			trecho = "";
		} else if (letra === "}") {
			const bloco = blocos.pop();
			if (bloco && !bloco.cabeca.startsWith("@")) {
				regras.push({
					arquivo,
					seletores: bloco.cabeca.split(",").map((s) => s.trim()),
					media: blocos
						.filter(({ cabeca }) => cabeca.startsWith("@media "))
						.map(({ cabeca }) => cabeca.slice("@media ".length)),
					corpo: bloco.corpo + trecho,
				});
			}
			trecho = "";
		} else if (letra === ";") {
			const bloco = blocos.at(-1);
			if (bloco) bloco.corpo += `${trecho};`;
			trecho = "";
		} else {
			trecho += letra;
		}
	}
	return regras;
}

/** O último valor de uma propriedade no corpo de uma regra, numa linha só. */
function valorNa(corpo: string, propriedade: string): string | undefined {
	const declaracao = new RegExp(`(?:^|;)\\s*${propriedade}\\s*:([^;]+)`, "g");
	return [...corpo.matchAll(declaracao)]
		.at(-1)?.[1]
		?.replace(/\s+/g, " ")
		.replace(/\( /g, "(")
		.replace(/ \)/g, ")")
		.trim();
}

function ultimoValor(regras: Regra[], propriedade: string): string | undefined {
	return regras
		.map((r) => valorNa(r.corpo, propriedade))
		.filter((valor) => valor !== undefined)
		.at(-1);
}

const doIndex = regrasDoCss("index.css");

/** As partes de um valor separadas por espaço, sem partir o que está entre parênteses. */
function partes(valor: string): string[] {
	const pedacos: string[] = [];
	let pedaco = "";
	let fundo = 0;
	for (const letra of valor) {
		if (letra === "(") fundo++;
		if (letra === ")") fundo--;
		if (letra === " " && fundo === 0) {
			pedacos.push(pedaco);
			pedaco = "";
		} else {
			pedaco += letra;
		}
	}
	return [...pedacos, pedaco];
}

/** O espaço entre as letras, em em, de um letter-spacing já sem as variáveis. */
function espacoEmEm(valor: string): number | string {
	if (valor === "0" || valor === "normal") return 0;
	const conta = /^calc\(([\d.]+)em \* ([\d.]+)\)$/.exec(valor);
	if (conta) return Number(conta[1]) * Number(conta[2]);
	const fixo = /^([\d.]+)em$/.exec(valor);
	return fixo ? Number(fixo[1]) : valor;
}

const CAIXAS: Record<string, string> = {
	uppercase: "alta",
	none: "como-escrito",
};

describe("o título do passo, na sanfona da trilha", () => {
	// Ele é uma etiqueta: em maiúsculas espaçadas e, com a letra grande (abaixo de
	// 22rem), como escrito, sem o espaço entre as letras. O teto mede a palavra
	// dos dois jeitos, com uma régua para cada um (o COMO_APARECE), e este teste
	// prende cada régua ao CSS do título e o recuo à linha do resumo da sanfona.
	const LETRA_GRANDE = "(width < 22rem)";
	const AO_LADO = "(width >= 87.5rem)";
	const estilos = readdirSync(new URL("../../estilos/", import.meta.url))
		.filter((nome) => nome.endsWith(".css"))
		.map((nome) => `estilos/${nome}`);
	const doSite = [
		...regrasDoCss("../../../packages/ui/src/styles/globals.css"),
		...doIndex,
		...estilos.flatMap(regrasDoCss),
	];
	const classesDoTitulo =
		/<h3\b[^>]*\bclassName="([^"]+)"/
			.exec(caminhoDaTrilha)?.[1]
			?.split(/\s+/) ?? [];
	const seletoresDeClasse = classesDoTitulo.map(
		(classe) => `.${classe.replace(/[^\w-]/g, "\\$&")}`,
	);
	const terminaNoTitulo = (seletor: string) =>
		/(?:^|[\s>+~])h3$/i.test(seletor) ||
		seletoresDeClasse.some((classe) => seletor.endsWith(classe));

	/** A regra de um seletor no index.css, só nos @media da lista. */
	function regra(seletor: string, media: string[] = []): Regra {
		const achada = doIndex.find(
			(r) => r.seletores.includes(seletor) && r.media.join() === media.join(),
		);
		if (!achada) {
			throw new Error(
				`o index.css não tem ${seletor}${media.length ? ` em @media ${media.join(" e ")}` : " fora dos @media"}`,
			);
		}
		return achada;
	}
	const doTitulo = regra(".sanfona h3");
	const doTeto = regra(".letra-com-teto");

	/** Como o título aparece, lido do CSS: a caixa das letras e o espaço entre elas, em em. */
	function comoApareceNoCss(letraGrande: boolean) {
		const media = letraGrande ? [LETRA_GRANDE] : [];
		const vale = (r: Regra) =>
			r.media.length === 0 || r.media.join() === media.join();
		const raiz = doIndex.filter(
			(r) => r.seletores.includes(":root") && vale(r),
		);
		const semVariaveis = (valor: string) =>
			valor.replace(
				/var\((--[\w-]+)\)/g,
				(_, nome: string) => ultimoValor(raiz, nome) ?? "",
			);
		const caixa = semVariaveis(
			valorNa(doTitulo.corpo, "text-transform") ?? "none",
		);
		const espaco = semVariaveis(
			valorNa(doTitulo.corpo, "letter-spacing") ?? "0",
		);
		return { caixa: CAIXAS[caixa] ?? caixa, espaco: espacoEmEm(espaco) };
	}

	it("fica em maiúsculas espaçadas, como a régua mede, a partir de 22rem", () => {
		expect(COMO_APARECE["titulo-da-sanfona"]).toMatchObject(
			comoApareceNoCss(false),
		);
	});

	it("fica como escrito, sem o espaço, como a régua da letra grande mede, abaixo de 22rem", () => {
		expect(COMO_APARECE["titulo-da-sanfona-letra-grande"]).toMatchObject(
			comoApareceNoCss(true),
		);
	});

	it("usa na variante letra-grande o mesmo limite de 22rem das etiquetas", () => {
		const etiquetas = doIndex.find(
			(r) =>
				r.media.length &&
				r.seletores.includes(":root") &&
				valorNa(r.corpo, "--caixa-alta") !== undefined,
		);
		const variante =
			/^\s*@custom-variant\s+letra-grande\s*\(\s*@media\s+(\([^()]+\))\s*\)\s*;/m
				.exec(css.replace(/\/\*[\s\S]*?\*\//g, ""))?.[1]
				?.replace(/\s+/g, " ");
		expect(etiquetas?.media, "@media que muda --caixa-alta em :root").toEqual([
			LETRA_GRANDE,
		]);
		expect(
			variante,
			"@custom-variant letra-grande precisa usar o mesmo @media das etiquetas em :root",
		).toBe(etiquetas?.media[0]);
	});

	it("confere a caixa, o tamanho, o espaço, o peso e a largura nos seletores que terminam em h3 ou em classe do título do passo", () => {
		for (const r of doSite) {
			const seletor = r.seletores.find(terminaNoTitulo);
			if (!seletor) continue;
			const onde = [
				r.arquivo,
				...r.media.map((m) => `@media ${m}`),
				seletor,
			].join(" ");
			for (const propriedade of [
				"text-transform",
				"font-size",
				"letter-spacing",
				"font-weight",
				"font-stretch",
			]) {
				// O tamanho vem do teto. As outras quatro propriedades são do próprio h3.
				if (r === (propriedade === "font-size" ? doTeto : doTitulo)) continue;
				expect(
					valorNa(r.corpo, propriedade),
					`${onde} muda a letra do passo com ${propriedade}`,
				).toBeUndefined();
			}
		}
	});

	it("preserva --caixa-alta e --espacado na sanfona e recusa classes de caixa ou de espaçamento no título", () => {
		const dasVariaveis = /(?:^|;)\s*--(?:caixa-alta|espacado)\s*:/;
		expect(
			doSite.filter(
				({ seletores, corpo }) =>
					seletores.some((s) => s.includes("sanfona")) &&
					dasVariaveis.test(corpo),
			),
		).toEqual([]);
		expect(
			classesDoTitulo.filter((classe) =>
				/(?:^|:)(?:uppercase|lowercase|capitalize|normal-case|tracking-\S+)$/.test(
					classe,
				),
			),
		).toEqual([]);
	});

	it("usa o teto da página na letra de 1rem do passo", () => {
		expect(classesDoTitulo).toContain("letra-com-teto");
		expect(valorNa(doTitulo.corpo, "--letra")).toBe("1rem");
		expect(
			valorNa(doTeto.corpo, "font-size"),
			".letra-com-teto precisa do teto da palavra",
		).toContain("var(--palavra)");
	});

	it("tira da largura o que fica na linha do título: o azulejo, os dois vãos e o +", () => {
		const resumo = regra(".sanfona summary").corpo;
		const vao = valorNa(resumo, "gap");
		const mais = valorNa(regra(".sanfona summary::after").corpo, "width");
		const azulejo = valorNa(
			regrasDoCss("estilos/azulejos.css").find(({ seletores }) =>
				seletores.includes(".grande.pequeno"),
			)?.corpo ?? "",
			"width",
		);

		expect([valorNa(resumo, "display"), vao, mais, azulejo]).toEqual([
			"flex",
			"0.9rem",
			"1.25rem",
			"2.5rem",
		]);
		expect(valorNa(doTitulo.corpo, "--recuo")).toBe(
			`calc(var(--recuo-de-fora, 0px) + ${azulejo} + 2 * ${vao} + ${mais})`,
		);
		// Com a letra grande, o azulejo sai, e fica um vão só.
		expect(
			valorNa(regra(".sanfona .grande", [LETRA_GRANDE]).corpo, "display"),
		).toBe("none");
		expect(valorNa(regra(".sanfona h3", [LETRA_GRANDE]).corpo, "--recuo")).toBe(
			`calc(var(--recuo-de-fora, 0px) + ${vao} + ${mais})`,
		);
	});

	it("na coluna ao lado dos artigos, a partir de 1400 px, tira a página que fica fora dela", () => {
		// A coluna tem 24rem; dentro dela, o caminho começa depois do vão de 1,5rem,
		// do lado dos artigos, e acaba na margem da página.
		const coluna = /minmax\(0, ([\d.]+)rem\)$/.exec(
			valorNa(
				regra(".pagina-da-trilha.com-caminho", [AO_LADO]).corpo,
				"grid-template-columns",
			) ?? "",
		)?.[1];
		const caminho = regra(".pagina-da-trilha.com-caminho > .ao-lado", [
			AO_LADO,
		]).corpo;
		const [, direita, , esquerda] = partes(valorNa(caminho, "padding") ?? "");

		expect([coluna, direita, esquerda]).toEqual([
			"24",
			"var(--margem)",
			"1.5rem",
		]);
		expect(valorNa(caminho, "--recuo-de-fora")).toBe(
			`calc(100cqi - var(--margem) - ${Number(coluna) - Number.parseFloat(esquerda ?? "")}rem)`,
		);
	});
});
