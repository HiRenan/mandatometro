import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { colunasDoMosaico } from "../lib/quiz";

// O fio da opção do quiz (quiz.css). O Renan, na #89: antes da resposta, o fio
// não usa o verde nem o vermelho, que são as cores da resposta certa e da
// errada. Este teste lê o CSS, porque a regra é de cor e o jsdom não desenha.

const css = readFileSync(new URL("./quiz.css", import.meta.url), "utf8");
const indexCss = readFileSync(new URL("../index.css", import.meta.url), "utf8");

/** O corpo da primeira regra de um seletor, no quiz.css ou num trecho de CSS. */
function regra(seletor: string, onde = css): string {
	const comeco = onde.indexOf(`${seletor} {`);
	if (comeco < 0) {
		throw new Error(`o CSS não tem a regra ${seletor}`);
	}
	return onde.slice(comeco, onde.indexOf("}", comeco));
}

/** Todos os blocos com essa cabeça, como os @media de uma largura, com as regras de dentro. */
function blocos(cabeca: string, onde = css): string[] {
	const achados: string[] = [];
	for (
		let comeco = onde.indexOf(`${cabeca} {`);
		comeco >= 0;
		comeco = onde.indexOf(`${cabeca} {`, comeco + 1)
	) {
		let fundo = 0;
		let fim = -1;
		for (let i = onde.indexOf("{", comeco); i < onde.length && fim < 0; i++) {
			if (onde[i] === "{") {
				fundo++;
			} else if (onde[i] === "}" && --fundo === 0) {
				fim = i + 1;
			}
		}
		if (fim < 0) {
			throw new Error(`o bloco ${cabeca} não fecha`);
		}
		achados.push(onde.slice(comeco, fim));
	}
	return achados;
}

/** O primeiro bloco com essa cabeça. */
function bloco(cabeca: string): string {
	const [primeiro] = blocos(cabeca);
	if (primeiro === undefined) {
		throw new Error(`o quiz.css não tem o bloco ${cabeca}`);
	}
	return primeiro;
}

/** O valor de uma declaração no corpo de uma regra, sem o ponto e vírgula. */
function declaracao(corpo: string, propriedade: string): string | undefined {
	return new RegExp(`(?:^|[\\s;{])${propriedade}:\\s*([^;]+);`).exec(
		corpo,
	)?.[1];
}

const semComentarios = (texto: string) =>
	texto.replace(/\/\*[\s\S]*?\*\//g, "");

describe("o fio da opção do quiz", () => {
	it("antes da resposta, só leva a rosa, a amarela e a azul", () => {
		const fios = [...css.matchAll(/--fio: var\(--fita-([a-z]+)\);/g)].map(
			([, fita]) => fita,
		);

		expect(fios).toEqual(["rosa", "amarela", "azul"]);
	});

	it("é o que o ponteiro e a opção escolhida mostram, e não a cor da letra", () => {
		for (const seletor of [
			".quiz-opcao:hover",
			".quiz-opcao:has(input:checked)",
		]) {
			expect(regra(seletor), seletor).toContain("var(--fio)");
			expect(regra(seletor), seletor).not.toMatch(/var\(--(c|fita-[a-z]+)\)/);
		}
	});

	it("o verde e o vermelho ficam para a resposta certa e a errada", () => {
		expect(regra('.quiz .quiz-opcao[data-estado="certa"]')).toContain(
			"var(--fita-verde)",
		);
		expect(regra('.quiz .quiz-opcao[data-estado="errada"]')).toContain(
			"var(--fita-vermelha)",
		);
	});
});

// O pé do palco (o andamento) fica preso embaixo numa tela alta. Na abertura com
// a linha do piloto, que deixa a abertura mais alta, o pé preso cobria o
// "Começar" no celular pequeno (375 × 667): ali ele fica solto, depois do botão.
// O quiz da trilha e o quiz final do público, sem a linha, continuam iguais.
describe("o pé do palco", () => {
	it("fica preso numa tela alta, menos na abertura com a linha do piloto", () => {
		const alta = bloco("@media (height >= 40rem)");

		expect(alta).toMatch(/\.quiz-pe \{\s*position: sticky;/);
		expect(alta).toMatch(
			/\.quiz\[data-linha\]\[data-fase="abertura"\] \.quiz-pe \{\s*position: static;/,
		);
	});

	// A linha do nome do quiz e da frase do andamento (a #136). Sem o flex, o
	// nome e a frase ficam em linhas separadas; sem o flex-wrap, a frase vira
	// uma coluna estreita ao lado do nome, em vez de descer inteira.
	it("leva o nome do quiz e a frase juntos, e a frase desce inteira onde não cabe", () => {
		const linha = regra(".quiz-pe-linha");

		expect(linha).toContain("display: flex;");
		expect(linha).toContain("flex-wrap: wrap;");
	});
});

// O separador entre o nome do quiz e a frase do andamento (a #162). Abaixo de
// 22rem, a etiqueta sai das maiúsculas, e o nome ficava com quase a mesma letra
// da frase, lado a lado: "Quiz final Você respondeu 1 de 12." se lia como uma
// frase só (a revisão do PR #151). O Renan escolheu, em 18/11/2026, o
// quadradinho da faixa de informações. O jsdom não desenha o ::before: este
// teste lê as regras, e o components/quiz.test.tsx confere o seletor dele em
// cada tela do quiz.
describe("o separador entre o nome do quiz e a frase do andamento", () => {
	const letraGrande = blocos("@media (width < 22rem)");
	const quadradoDaFaixa = ".faixa > span::before";

	/** As regras que desenham na linha do pé, com um ::before ou um ::after. */
	function desenhosDoPe(trecho: string): string[] {
		return [...semComentarios(trecho).matchAll(/([^{}]+)\{/g)]
			.map(([, seletor = ""]) => seletor.trim())
			.filter(
				(seletor) =>
					/::(before|after)/.test(seletor) &&
					/\.quiz-(pe|nome|andamento-texto)\b/.test(seletor),
			);
	}

	/** O corpo da regra do separador, nos blocos da letra grande. */
	function separador(): string {
		const [seletor] = letraGrande.flatMap(desenhosDoPe);
		if (seletor === undefined) {
			throw new Error("a letra grande não tem o separador do pé");
		}
		return regra(seletor, letraGrande.map(semComentarios).join("\n"));
	}

	/** O vão entre o nome e a frase, o lado do quadradinho e a letra da frase. */
	function medidas() {
		const lado = declaracao(separador(), "width") ?? "";
		return {
			lado,
			vao: Number(
				/--vao-do-nome: ([\d.]+)rem;/.exec(regra(".quiz-pe-linha"))?.[1],
			),
			// O lado em rem: o em do quadradinho é a letra da frase.
			ladoEmRem:
				Number.parseFloat(lado) *
				Number(
					/font-size: ([\d.]+)rem;/.exec(
						regra(".quiz-pe .quiz-andamento-texto"),
					)?.[1],
				),
		};
	}

	it("só aparece abaixo de 22rem, antes da frase: acima, o nome em maiúsculas já se separa dela", () => {
		let foraDaLetraGrande = css;
		for (const trecho of letraGrande) {
			foraDaLetraGrande = foraDaLetraGrande.replace(trecho, "");
		}

		expect(desenhosDoPe(foraDaLetraGrande)).toEqual([]);
		const dentro = letraGrande.flatMap(desenhosDoPe);
		expect(dentro).toHaveLength(1);
		expect(dentro[0]).toMatch(/\.quiz-andamento-texto > p\S*::before$/);
	});

	// Com o content: "" só, o Chromium punha o quadradinho na árvore de
	// acessibilidade, como um genérico vazio antes da frase (medido pelo CDP). O
	// texto alternativo vazio, depois da barra, o tira de lá.
	it("é desenho: o quadradinho da faixa de informações, fora da árvore de acessibilidade e sem cor de fita", () => {
		const faixa = regra(quadradoDaFaixa, indexCss);
		const corpo = separador();

		expect(declaracao(faixa, "content")).toBe('"" / ""');
		expect(declaracao(corpo, "content")).toBe('"" / ""');
		for (const propriedade of [
			"display",
			"width",
			"height",
			"vertical-align",
			"background",
		]) {
			expect(declaracao(corpo, propriedade), propriedade).toBe(
				declaracao(faixa, propriedade),
			);
		}
		expect(corpo).not.toMatch(/--fita|var\(--c\)/);
	});

	it.each([
		["faixa", quadradoDaFaixa, indexCss],
		[
			"pé do quiz",
			".quiz-nome + .quiz-andamento-texto > p:not(:empty)::before",
			css,
		],
	])(
		"o quadradinho da peça %s usa a cor do texto nas cores forçadas",
		(_, seletor, folha) => {
			const desenho = blocos(seletor, semComentarios(folha)).join("\n");
			const cores = blocos("@media (forced-colors: active)", desenho);

			expect(cores.map((regra) => declaracao(regra, "background"))).toContain(
				"CanvasText",
			);
		},
	);

	// A linha do pé quebra como antes: o quadradinho não toma lugar nela. A
	// margem da esquerda devolve o lado dele. O navegador guarda as medidas em
	// 1/64 de px, e o mesmo valor com o sinal trocado arredonda igual: a soma dá
	// zero, e a frase não sai do lugar. Com margens feitas de metades do vão, a
	// soma sobrava 1/64 de px, e a frase andava (medido pelo CDP). O left, que
	// não mexe na linha, o leva para trás metade do vão menos o lado: o meio dele
	// fica no meio do vão entre o nome e a frase.
	it("fica no meio do vão entre o nome e a frase, sem tomar lugar na linha", () => {
		const corpo = separador();
		const { lado, vao, ladoEmRem } = medidas();

		expect(regra(".quiz-pe-linha")).toMatch(
			/gap: [\d.]+rem var\(--vao-do-nome\);/,
		);
		expect(
			[...corpo.matchAll(/(?:^|[\s;{])(margin[\w-]*):/g)].map(
				([, nome]) => nome,
			),
		).toEqual(["margin-left"]);
		expect(declaracao(corpo, "margin-left")).toBe(`-${lado}`);
		expect(declaracao(corpo, "position")).toBe("relative");
		expect(declaracao(corpo, "left")).toBe(
			`calc((var(--vao-do-nome) - ${lado}) / -2)`,
		);
		// O quadradinho, na letra da frase, cabe no vão, com papel dos dois lados.
		expect(ladoEmRem).toBeLessThan(vao);
	});

	// Quando a frase desce para a linha de baixo, o separador fica antes da
	// beirada da linha do pé, e ela corta o que passa de lado. O hidden faria da
	// linha uma caixa de rolagem, que o flex encolhe abaixo da palavra mais
	// comprida: a linha do pé mudaria de lugar ao lado dos quadradinhos. O recuo
	// da esquerda, devolvido pela margem, põe a beirada do corte antes do texto,
	// sem mexer nele: a tinta do A de "Antes da trilha" passa da beirada, e o
	// corte rente tirava um pixel dela (medido nas fotos). O overflow-clip-margin
	// não serve: o Chromium não o aplica com o corte só na horizontal. O recuo é
	// menor que a distância do quadradinho até o texto, metade do vão menos o
	// lado, e o quadradinho some inteiro.
	it("quando a frase desce para a linha de baixo, a linha do pé corta o separador", () => {
		const linhas = letraGrande
			.map(semComentarios)
			.filter((trecho) => trecho.includes(".quiz-pe-linha {"))
			.map((trecho) => regra(".quiz-pe-linha", trecho));
		const { vao, ladoEmRem } = medidas();

		expect(linhas).toHaveLength(1);
		const corte = linhas[0] ?? "";
		expect(declaracao(corte, "overflow-x")).toBe("clip");
		expect(corte).not.toMatch(/overflow(-y)?:/);
		const recuo = /^([\d.]+)rem$/.exec(
			declaracao(corte, "padding-left") ?? "",
		)?.[1];
		expect(declaracao(corte, "margin-left")).toBe(`-${recuo}rem`);
		expect(Number(recuo)).toBeGreaterThan(0);
		expect(Number(recuo)).toBeLessThan((vao - ladoEmRem) / 2);
	});
});

// Os quadradinhos do andamento ficam numa fileira enquanto cabem. A 320 px, os
// doze do quiz final quebravam em 11 e 1, e o de baixo ficava sozinho. A conta
// usa as medidas do CSS: se o quadradinho ou o vão mudar, a tela de cada bloco
// muda junto.
describe("os quadradinhos do andamento", () => {
	const lado = Number(
		regra(".quiz-andamento li").match(/width: ([\d.]+)rem;/)?.[1],
	);
	const vao = Number(regra(".quiz-andamento").match(/gap: ([\d.]+)rem;/)?.[1]);
	/** A largura de uma fileira de `n` quadradinhos, em rem. */
	const fileira = (n: number) => n * lado + (n - 1) * vao;
	/** As margens do celular, 20 px de cada lado, em rem, com a letra de `px`. */
	const margens = (px: number) => 40 / px;
	const rem = (valor: number) => `${Math.round(valor * 1000) / 1000}rem`;

	it("onde os doze não cabem numa fileira, vão em duas de seis", () => {
		const estreita = bloco(
			`@media (width < ${rem(fileira(12) + margens(16))})`,
		);

		expect(estreita).toMatch(/grid-template-columns: repeat\(6, /);
	});

	it("com a letra acima de 200%, onde nem seis cabem, as fileiras ficam de três", () => {
		const estreitissima = bloco(
			`@media (width < ${rem(fileira(6) + margens(32))})`,
		);

		expect(estreitissima).toMatch(/grid-template-columns: repeat\(3, /);
	});
});

// O título do palco ("Quiz da trilha", "Quiz final" ou "Antes da trilha"). Fora
// da abertura, ele virava uma etiqueta pequena acima da contagem e do título do
// fim, e etiqueta acima de título não entra no site (a #136). Ele continua no
// HTML, com o nome do palco e a ordem dos títulos para o leitor de tela, mas sai
// da vista: quem vê lê o nome do quiz no pé, com o andamento.
describe("o título do palco fora da abertura", () => {
	it("sai da vista, sem virar etiqueta", () => {
		const fora = regra('.quiz:not([data-fase="abertura"]) .quiz-titulo');

		for (const declaracao of [
			"position: absolute;",
			"width: 1px;",
			"height: 1px;",
			"overflow: hidden;",
			"clip-path: inset(50%);",
			"white-space: nowrap;",
		]) {
			expect(fora).toContain(declaracao);
		}
		expect(fora).not.toMatch(/font-size|text-transform|letter-spacing|color:/);
	});

	// O display: none e o visibility: hidden tirariam o h1 da árvore de
	// acessibilidade, e o palco perderia o nome e o primeiro título. O jsdom não
	// lê o quiz.css: os testes da tela não pegariam.
	it("continua no leitor de tela: nenhuma regra dele tem display: none nem visibility: hidden", () => {
		const doTitulo = [
			...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g),
		].filter(([, seletor = ""]) => seletor.includes(".quiz-titulo"));

		expect(doTitulo.map(([, seletor = ""]) => seletor.trim())).toContain(
			'.quiz:not([data-fase="abertura"]) .quiz-titulo',
		);
		for (const [, seletor = "", corpo = ""] of doTitulo) {
			expect(corpo, seletor.trim()).not.toMatch(
				/display:\s*none|visibility:\s*hidden/,
			);
		}
	});

	it("abaixo de 62rem, na pergunta, o palco guarda o maior entre o respiro dele e o canto do mosaico", () => {
		// Com o min(), a reserva ficava no respiro de cima do palco, e a primeira
		// linha do enunciado entrava num azulejo a 360 px (a revisão do Argos).
		const respiro = /padding: ([\d.]+rem) /.exec(regra(".quiz-palco"))?.[1];
		const reserva = regra(
			'.quiz:is([data-fase="pergunta"], [data-fase="resposta"]) .quiz-palco',
			bloco("@media (width < 62rem)"),
		);
		const [, primeiro, segundo] =
			/padding-top: max\(\s*([^,]+),\s*([^;]+)\);/.exec(reserva) ?? [];

		expect(respiro).toBeDefined();
		expect(primeiro).toBe(respiro);
		expect(segundo).toMatch(/^calc\(var\(--canto\)/);
	});

	it("abaixo de 62rem, o palco guarda o lugar do mosaico, e o título só guarda lugar na abertura", () => {
		// Sem os comentários, que também falam dos seletores.
		const celular = bloco("@media (width < 62rem)").replace(
			/\/\*[\s\S]*?\*\//g,
			"",
		);

		// Na pergunta e na resposta, a altura do mosaico no canto: a contagem para
		// antes dele, e o enunciado começa embaixo.
		expect(celular).toMatch(
			/\.quiz:is\(\[data-fase="pergunta"\], \[data-fase="resposta"\]\) \.quiz-palco \{\s*padding-top: [^;]*var\(--canto\)/,
		);
		expect(celular).toMatch(
			/\.quiz:is\(\[data-fase="pergunta"\], \[data-fase="resposta"\]\) \.quiz-contagem \{\s*max-width: calc\(100% - var\(--canto\)/,
		);
		// No fim, a altura do mosaico inteiro.
		expect(celular).toMatch(
			/\.quiz\[data-fase="fim"\] \.quiz-palco \{\s*padding-top: [^;]*var\(--capa\)/,
		);
		// O título só guarda lugar onde fica à vista: na abertura, embaixo do
		// mosaico inteiro.
		const doTitulo = [
			...celular.matchAll(/([^{}]*\.quiz-titulo[^{}]*)\{/g),
		].map(([, seletor]) => seletor.trim());
		expect(doTitulo).toEqual(['.quiz[data-fase="abertura"] .quiz-titulo']);
		expect(celular).toMatch(
			/\.quiz\[data-fase="abertura"\] \.quiz-titulo \{\s*padding-top: [^;]*var\(--capa\)/,
		);
	});
});

// A partir de 62rem, respondida a pergunta, o mosaico se recolhe no canto de
// cima, e a folha da resposta toma o lugar dele, na coluna da direita, embaixo
// dele. Na #136, a etiqueta saiu de cima da contagem, a folha subiu a linha dela
// (16,8 px) e cobriu a base do mosaico de três fileiras do quiz final (a revisão
// do Argos, em 17/11/2026). A conta é a do navegador, com as medidas do CSS: se
// a migalha, o palco, o mosaico ou a folha mudarem, a folga muda junto.
describe("a folha da resposta e o mosaico do canto, a partir de 62rem", () => {
	const computador = bloco("@media (width >= 62rem)");

	/** Os números que o padrão pega numa regra. */
	function numeros(corpo: string, padrao: RegExp): number[] {
		const achado = padrao.exec(corpo);
		if (!achado) {
			throw new Error(`a regra não tem ${padrao}:\n${corpo}`);
		}
		return achado.slice(1).map(Number);
	}

	/**
	 * Uma medida em px, com a letra de `rem` px: um comprimento (`1rem`, `2px`)
	 * ou uma soma de produtos num calc(), como `calc(1rem + 0.875rem * 1.2)`.
	 */
	function px(medida: string, rem: number): number {
		const conta = /^calc\((.*)\)$/.exec(medida)?.[1] ?? medida;
		const valor = conta.split(" + ").reduce((soma, termo) => {
			const [comprimento = "", ...fatores] = termo.split(" * ");
			const unidade = comprimento.endsWith("rem") ? rem : 1;
			return (
				soma +
				fatores.reduce(
					(produto, fator) => produto * Number(fator),
					Number.parseFloat(comprimento) * unidade,
				)
			);
		}, 0);
		if (!Number.isFinite(valor)) {
			throw new Error(`não sei fazer a conta de ${medida}`);
		}
		return valor;
	}

	// Do alto da seção do quiz (o .quiz) até a folha: o --alto, a linha da
	// migalha (os links têm a altura do toque, no index.css), o respiro de cima
	// do .quiz-palco e a margem de cima da folha. O título, fora da abertura,
	// sai do fluxo.
	const [altoMenor = 0, altoNaTela = 0, altoMaior = 0] = numeros(
		regra(".quiz"),
		/--alto: clamp\(([\d.]+)rem, ([\d.]+)vw, ([\d.]+)rem\);/,
	);
	const [migalha = 0] = numeros(
		regra(".migalhas a", indexCss),
		/min-height: ([\d.]+)rem;/,
	);
	const [respiro = 0] = numeros(regra(".quiz-palco"), /padding: ([\d.]+)rem /);
	const margemDaFolha =
		/margin-top: ([^;]+);/.exec(regra(".quiz-retorno", computador))?.[1] ??
		"0px";

	// O mosaico: a capa, com peças de pixel inteiro (sem os vãos, a largura se
	// divide por 2 px em cada coluna), e uma fileira de peças quadradas para
	// cada três ou quatro perguntas (o colunasDoMosaico e o quiz.tsx). O meio
	// dele fica a 50svh − 3.25rem do alto da seção; na resposta, o translateY
	// desfaz essa conta e põe o alto dele a 1rem do alto da seção, e a escala
	// parte desse canto (o transform-origin). O primeiro teste confere esse
	// lugar com as quatro regras que o fazem.
	const [vao = 0] = numeros(regra(".mosaico"), /gap: (\d+)px;/);
	const [capaNaTela = 0, capaMaior = 0] = numeros(
		regra(".quiz", computador),
		/--capa: min\(([\d.]+)vw, ([\d.]+)rem\);/,
	);
	const [passo = 0] = numeros(
		regra(".mosaico", computador),
		/round\(down, var\(--capa\) - var\(--vaos\), var\(--colunas, 3\) \* (\d+)px\)/,
	);
	const [canto = 0, escala = 0] = numeros(
		regra('.quiz[data-fase="resposta"] .mosaico', computador),
		/\+ ([\d.]+)rem\)\) scale\(([\d.]+)\);/,
	);

	/** Em px, do fundo do mosaico recolhido ao alto da folha da resposta. */
	function folga(perguntas: number, largura: number, letra = 1): number {
		const rem = 16 * letra;
		const vw = largura / 100;

		const alto = Math.min(
			Math.max(altoMenor * rem, altoNaTela * vw),
			altoMaior * rem,
		);
		const altoDaFolha =
			alto + migalha * rem + respiro * rem + px(margemDaFolha, rem);

		const colunas = colunasDoMosaico(perguntas);
		const fileiras = Math.ceil(perguntas / colunas);
		const vaos = (colunas - 1) * vao;
		const capa = Math.min(capaNaTela * vw, capaMaior * rem);
		const pecas =
			Math.floor((capa - vaos) / (colunas * passo)) * colunas * passo;
		const altura = fileiras * (pecas / colunas) + (fileiras - 1) * vao;
		const fundoDoMosaico = canto * rem + escala * altura;

		return altoDaFolha - fundoDoMosaico;
	}

	// O quiz da trilha tem 6 perguntas (duas fileiras de três), e o quiz final,
	// 12 (três fileiras de quatro): o "Rever as respostas" e a segunda etapa do
	// piloto usam a mesma tela da resposta.
	const TRILHA = 6;
	const FINAL = 12;

	// A conta da folga lê da regra da resposta só o 1rem e a escala, e o lugar do
	// mosaico recolhido sai também de três números de outras regras: o top e o
	// translate do mosaico grande, que o translateY da resposta desfaz, e o
	// transform-origin, que faz a escala partir do canto de cima (no celular
	// também). Se um deles muda sozinho, a conta da folga não muda, e a tela,
	// sim (a revisão do PR #151): com o mosaico grande 1rem mais baixo, a folha
	// cobre a base do recolhido no quiz final; com a escala a partir do canto de
	// baixo, ele cai para dentro da folha.
	it("na resposta, o mosaico fica preso à direita e a 1rem do alto da seção, em qualquer tela e com qualquer letra", () => {
		const grande = regra(".mosaico", computador);
		const [meioDaTela = 0, acimaDoMeio = 0] = numeros(
			grande,
			/top: calc\(([\d.]+)svh - ([\d.]+)rem\);/,
		);
		const [subida = 0] = numeros(grande, /translate: 0 (-?[\d.]+)%;/);
		const [desfazTela = 0, desfazRem = 0, desfazSubida = 0, alto = 0] = numeros(
			regra('.quiz[data-fase="resposta"] .mosaico', computador),
			/translateY\(calc\((-?[\d.]+)svh \+ ([\d.]+)rem \+ ([\d.]+)% \+ ([\d.]+)rem\)\)/,
		);
		const [horizontal, origem] = (
			declaracao(regra(".mosaico"), "transform-origin") ?? ""
		).split(/\s+/);
		expect(horizontal).toMatch(/^(100%|right)$/);

		/** De onde a escala parte, em px do alto do mosaico. */
		function pontoFixo(altura: number): number {
			const nomes: Record<string, number> = { top: 0, center: 0.5, bottom: 1 };
			if (origem === undefined) {
				throw new Error("o .mosaico não tem o transform-origin");
			}
			if (origem in nomes) {
				return (nomes[origem] ?? 0) * altura;
			}
			if (origem.endsWith("%")) {
				return (Number.parseFloat(origem) / 100) * altura;
			}
			if (origem === "0" || origem.endsWith("px")) {
				return Number.parseFloat(origem);
			}
			throw new Error(`não sei ler o transform-origin ${origem}`);
		}

		const fora: string[] = [];
		for (const tela of [600, 768, 900, 1080, 1440]) {
			for (const rem of [16, 20, 32]) {
				for (const altura of [120, 260, 480]) {
					const svh = tela / 100;
					// O top, o translate e o translateY da resposta, sem a escala.
					const semEscala =
						meioDaTela * svh -
						acimaDoMeio * rem +
						(subida / 100) * altura +
						desfazTela * svh +
						desfazRem * rem +
						(desfazSubida / 100) * altura +
						alto * rem;
					// Com a escala, o alto anda na direção do ponto fixo.
					const pontoDoAlto = pontoFixo(altura);
					const comEscala = semEscala + pontoDoAlto - escala * pontoDoAlto;
					if (Math.abs(comEscala - canto * rem) > 0.01) {
						fora.push(
							`tela de ${tela} px, letra de ${rem} px, mosaico de ${altura} px: o alto fica a ${comEscala.toFixed(1)} px, e não a ${(canto * rem).toFixed(1)} px`,
						);
					}
				}
			}
		}

		expect(fora).toEqual([]);
	});

	it("com a letra a 100%, a folha fica tão longe do mosaico quanto antes da #136", () => {
		// A folga da develop, com a etiqueta, medida pelo Argos no navegador.
		const antes: [perguntas: number, largura: number, folga: number][] = [
			[FINAL, 992, 35.6],
			[FINAL, 1024, 34.7],
			[FINAL, 1100, 30],
			[FINAL, 1200, 25.8],
			[FINAL, 1280, 21.1],
			[FINAL, 1366, 14.8],
			[FINAL, 1440, 11.7],
			[FINAL, 1536, 11.7],
			[FINAL, 1600, 11.7],
			[FINAL, 1680, 11.7],
			[FINAL, 1920, 11.7],
			[TRILHA, 1366, 25.2],
			[TRILHA, 1920, 22.1],
		];

		// Com 1 px de tolerância.
		const maisPerto = antes
			.map(([perguntas, largura, deAntes]) => ({
				perguntas,
				largura,
				deAntes,
				agora: Math.round(folga(perguntas, largura) * 10) / 10,
			}))
			.filter(({ agora, deAntes }) => agora < deAntes - 1);

		expect(maisPerto).toEqual([]);
	});

	it("em nenhuma largura do computador, com a letra de 100% a 200%, a folha encosta no mosaico", () => {
		// A menor folga de cada quiz e de cada letra, de 62rem (na letra da vez)
		// a 2560 px.
		const encostam: string[] = [];
		for (const perguntas of [TRILHA, FINAL]) {
			for (const letra of [1, 1.25, 1.5, 1.75, 2]) {
				let menor = { largura: 0, folga: Number.POSITIVE_INFINITY };
				for (let largura = Math.ceil(992 * letra); largura <= 2560; largura++) {
					const medida = folga(perguntas, largura, letra);
					if (medida < menor.folga) {
						menor = { largura, folga: medida };
					}
				}
				if (!(menor.folga > 0)) {
					encostam.push(
						`${perguntas} perguntas, letra a ${letra * 100}%: ${menor.folga.toFixed(1)} px a ${menor.largura} px`,
					);
				}
			}
		}

		expect(encostam).toEqual([]);
	});
});
