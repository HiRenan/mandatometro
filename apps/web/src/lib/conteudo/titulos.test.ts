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

type Regra = { seletores: string[]; media: string[]; corpo: string };

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

/** O valor de uma propriedade no corpo de uma regra, numa linha só. */
function valorNa(corpo: string, propriedade: string): string | undefined {
	return new RegExp(`(?:^|;)\\s*${propriedade}\\s*:([^;]+)`)
		.exec(corpo)?.[1]
		?.replace(/\s+/g, " ")
		.replace(/\( /g, "(")
		.replace(/ \)/g, ")")
		.trim();
}

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
	const doSite = ["index.css", ...estilos].flatMap(regrasDoCss);
	const doIndex = regrasDoCss("index.css");
	const ehOTitulo = (seletor: string) =>
		seletor.includes(".sanfona") && /(^|\s)h3$/.test(seletor);
	const doTitulo = doSite.filter(({ seletores }) => seletores.some(ehOTitulo));
	const linhaDoTitulo =
		caminhoDaTrilha
			.split("\n")
			.find((l) => l.split(/[\s"'`]+/).includes("letra-com-teto")) ?? "";

	/** O corpo da regra de um seletor no index.css, só nos @media da lista. */
	function regra(seletor: string, media: string[] = []): string {
		const achada = doIndex.find(
			(r) => r.seletores.includes(seletor) && r.media.join() === media.join(),
		);
		if (!achada) {
			throw new Error(
				`o index.css não tem ${seletor}${media.length ? ` em @media ${media.join(" e ")}` : " fora dos @media"}`,
			);
		}
		return achada.corpo;
	}

	/** Como o título aparece, lido do CSS: a caixa das letras e o espaço entre elas, em em. */
	function comoApareceNoCss(letraGrande: boolean) {
		const media = letraGrande ? [LETRA_GRANDE] : [];
		const vale = (r: Regra) =>
			r.media.length === 0 || r.media.join() === media.join();
		const ultimo = (regras: Regra[], propriedade: string) =>
			regras
				.filter(vale)
				.map((r) => valorNa(r.corpo, propriedade))
				.filter((v) => v !== undefined)
				.at(-1);
		const raiz = doIndex.filter((r) => r.seletores.includes(":root"));
		const semVariaveis = (valor: string) =>
			valor.replace(
				/var\((--[\w-]+)\)/g,
				(_, nome: string) => ultimo(raiz, nome) ?? "",
			);
		const caixa = semVariaveis(ultimo(doTitulo, "text-transform") ?? "none");
		const espaco = semVariaveis(ultimo(doTitulo, "letter-spacing") ?? "0");
		return { caixa: CAIXAS[caixa] ?? caixa, espaco: espacoEmEm(espaco) };
	}

	it("fica em maiúsculas espaçadas, como a régua mede, a partir de 22rem", () => {
		expect(comoApareceNoCss(false)).toEqual(COMO_APARECE["titulo-da-sanfona"]);
	});

	it("fica como escrito, sem o espaço, como a régua da letra grande mede, abaixo de 22rem", () => {
		expect(comoApareceNoCss(true)).toEqual(
			COMO_APARECE["titulo-da-sanfona-letra-grande"],
		);
	});

	it("muda a caixa e o espaço só pelas variáveis das etiquetas, sem outra regra nem classe", () => {
		// A caixa e o espaço do título vêm do --caixa-alta e do --espacado: uma regra
		// num @media, uma variável trocada na sanfona ou uma classe do Tailwind no
		// título mudariam o que a régua mede.
		const daCaixa = /(?:^|;)\s*(?:text-transform|letter-spacing)\s*:/;
		const dasVariaveis = /(?:^|;)\s*--(?:caixa-alta|espacado)\s*:/;
		expect(
			doTitulo.filter(
				({ media, corpo }) => media.length && daCaixa.test(corpo),
			),
		).toEqual([]);
		expect(
			doSite.filter(
				({ seletores, corpo }) =>
					seletores.some((s) => s.includes("sanfona")) &&
					dasVariaveis.test(corpo),
			),
		).toEqual([]);
		expect(
			linhaDoTitulo
				.split(/[\s"'`]+/)
				.filter((classe) =>
					/(?:^|:)(?:uppercase|lowercase|capitalize|normal-case|tracking-\S+)$/.test(
						classe,
					),
				),
		).toEqual([]);
	});

	it("tem o teto: a letra de 1rem vem do --letra, sem um font-size que passe por cima dele", () => {
		expect(linhaDoTitulo.split(/[\s"'`]+/)).toContain("letra-com-teto");
		expect(valorNa(regra(".sanfona h3"), "--letra")).toBe("1rem");
		expect(
			doTitulo.filter(({ corpo }) => valorNa(corpo, "font-size") !== undefined),
		).toEqual([]);
	});

	it("tira da largura o que fica na linha do título: o azulejo, os dois vãos e o +", () => {
		const resumo = regra(".sanfona summary");
		const vao = valorNa(resumo, "gap");
		const mais = valorNa(regra(".sanfona summary::after"), "width");
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
		expect(valorNa(regra(".sanfona h3"), "--recuo")).toBe(
			`calc(var(--recuo-de-fora, 0px) + ${azulejo} + 2 * ${vao} + ${mais})`,
		);
		// Com a letra grande, o azulejo sai, e fica um vão só.
		expect(valorNa(regra(".sanfona .grande", [LETRA_GRANDE]), "display")).toBe(
			"none",
		);
		expect(valorNa(regra(".sanfona h3", [LETRA_GRANDE]), "--recuo")).toBe(
			`calc(var(--recuo-de-fora, 0px) + ${vao} + ${mais})`,
		);
	});

	it("na coluna ao lado dos artigos, a partir de 1400 px, tira a página que fica fora dela", () => {
		// A coluna tem 24rem; dentro dela, o caminho começa depois do vão de 1,5rem,
		// do lado dos artigos, e acaba na margem da página.
		const coluna = /minmax\(0, ([\d.]+)rem\)$/.exec(
			valorNa(
				regra(".pagina-da-trilha.com-caminho", [AO_LADO]),
				"grid-template-columns",
			) ?? "",
		)?.[1];
		const caminho = regra(".pagina-da-trilha.com-caminho > .ao-lado", [
			AO_LADO,
		]);
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
