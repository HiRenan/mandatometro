import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// As regras das páginas dos parlamentares e das votações que dependem do
// desenho: os alvos de toque, os nomes longos que quebram dentro da coluna e a
// troca do mapa pela lista dos estados. Este teste lê o CSS, porque o jsdom não
// desenha; a medida de verdade é no navegador, nas larguras de 320 a 1920 px,
// com a letra a 100% e a 200%.

const css = readFileSync(
	new URL("./parlamentares.css", import.meta.url),
	"utf8",
);

/** O corpo da primeira regra de um seletor, com os espaços juntos. */
function regra(texto: string, seletor: string): string {
	const escapado = seletor.replace(/[.*+?^${}()|[\]\\>]/g, "\\$&");
	const achada = new RegExp(`(?:^|[\\n{}])\\s*${escapado} \\{([^}]*)\\}`).exec(
		texto,
	);
	if (!achada) {
		throw new Error(`o CSS não tem a regra ${seletor}`);
	}
	return achada[1].replace(/\s+/g, " ").trim();
}

/** O que fica dentro de um @media ou @container, até a chave que fecha o bloco. */
function bloco(texto: string, cabeca: string): string {
	const inicio = texto.indexOf(`${cabeca} {`);
	if (inicio < 0) {
		throw new Error(`o CSS não tem o bloco ${cabeca}`);
	}
	let fundura = 0;
	for (
		let posicao = texto.indexOf("{", inicio);
		posicao < texto.length;
		posicao++
	) {
		if (texto[posicao] === "{") {
			fundura++;
		} else if (texto[posicao] === "}" && --fundura === 0) {
			return texto.slice(texto.indexOf("{", inicio) + 1, posicao);
		}
	}
	throw new Error(`o bloco ${cabeca} não fecha`);
}

describe("os alvos de toque", () => {
	it("cada azulejo de estado, link da lista, de nome e de grupo tem pelo menos 44 px de altura", () => {
		for (const seletor of [
			".atalho-do-estado",
			".estado-na-lista",
			".nome-na-lista",
			".nomes-do-grupo a",
		]) {
			expect(regra(css, seletor), seletor).toContain("min-height: 2.75rem;");
		}
		expect(regra(css, ".grupo-de-voto > summary")).toContain(
			"min-height: 3.25rem;",
		);
	});

	it("as citações do patrimônio e de Como votou têm pelo menos 44 px de altura", () => {
		const citacao = regra(css, ".fonte-das-regras a");
		expect(citacao).toContain("display: inline-grid;");
		expect(citacao).toContain("min-height: 2.75rem;");
	});

	it("a licença ao lado do crédito do mapa tem pelo menos 44 px de altura", () => {
		const licenca = regra(css, ".credito-do-mapa a");
		expect(licenca).toContain("display: inline-grid;");
		expect(licenca).toContain("min-height: 2.75rem;");
	});
});

describe("os nomes longos", () => {
	it("quebram dentro da coluna, com o partido ou o número ao lado, sem alargar a página", () => {
		// O 1fr sozinho não encolhe abaixo da palavra mais longa do nome; o
		// minmax(0, 1fr) encolhe, e a quebra fica com o overflow-wrap da página.
		for (const seletor of [".nome-na-lista", ".estado-na-lista"]) {
			expect(regra(css, seletor), seletor).toContain(
				"grid-template-columns: minmax(0, 1fr) auto;",
			);
		}
	});

	it("o número do grupo pode descer quando o nome ocupa a linha", () => {
		expect(regra(css, ".grupo-de-voto > summary")).toContain(
			"flex-wrap: wrap;",
		);
	});
});

it("a caixa do vídeo mostra o anel enquanto o player tem foco", () => {
	const anel = regra(
		css,
		".caixa-do-video:has(> .player-do-video):focus-within",
	);
	expect(anel).toContain("outline: 3px solid var(--ring);");
	expect(anel).toContain("outline-offset: 3px;");
});

describe("o mapa dos estados", () => {
	/** Só a seção do mapa e do campo "Estado". */
	const mapa = css.slice(
		css.indexOf('/* ───── A lista: o mapa e o campo "Estado"'),
		css.indexOf("/* ───── A lista: os nomes de cada Casa"),
	);

	it("oito azulejos de 44 px e sete vãos de 4 px pedem 23,75 rem: numa fileira só a partir daí, senão em duas de quatro", () => {
		const azulejos = regra(mapa, ".atalhos-do-mapa");
		expect(azulejos).toContain(
			"grid-template-columns: repeat(4, minmax(0, 1fr));",
		);
		expect(azulejos).toContain("gap: 4px;");
		expect(8 * 44 + 7 * 4).toBe(23.75 * 16);
		expect(
			regra(
				bloco(mapa, "@container mapa (width >= 23.75rem)"),
				".atalhos-do-mapa",
			),
		).toContain("grid-template-columns: repeat(8, minmax(0, 1fr));");
	});

	it("abaixo de 17,75 rem, a lista toma o lugar do mapa, mas só abaixo do lg: no painel da tela larga, o mapa fica sempre", () => {
		const celular = bloco(mapa, "@media (width < 62rem)");
		const estreito = bloco(celular, "@container mapa (width < 17.75rem)");
		expect(regra(estreito, ".mapa")).toBe("display: none;");
		expect(regra(estreito, ".lista-de-estados")).toContain("display: grid;");
		expect(regra(mapa, ".lista-de-estados")).toBe("display: none;");
		// A troca não aparece fora do bloco do celular.
		expect(css.split("@container mapa (width < 17.75rem)")).toHaveLength(2);
	});

	it("o fio dos estados e o das regiões ficam com a mesma largura em qualquer tamanho do desenho", () => {
		expect(regra(mapa, ".desenho-do-brasil path")).toContain(
			"vector-effect: non-scaling-stroke;",
		);
		expect(regra(mapa, ".regiao-do-mapa")).toContain("stroke-width: 1px;");
		expect(regra(mapa, ".contorno-do-brasil")).toContain("stroke-width: 2px;");
	});

	it("a cópia do estado em destaque fica fora do caminho do ponteiro: senão, ela tira o ponteiro do estado, e o destaque pisca", () => {
		expect(regra(mapa, ".estado-em-destaque")).toBe("pointer-events: none;");
		// O fio grosso das regiões e do contorno vem por cima dos estados.
		expect(regra(mapa, ".contorno-do-brasil")).toContain(
			"pointer-events: none;",
		);
	});

	it("o link de cada estado repete a fita e o fio do grupo: o Chrome pinta de preto o link visitado que só herda o fill", () => {
		// O jsdom não pinta o :visited: o teste confere a regra, e o relato da
		// #289 mostra a foto do RS visitado no Edge.
		const link = regra(mapa, ".estado-no-mapa");
		expect(link).toContain("fill: var(--fita);");
		expect(link).toContain("stroke: var(--tinta);");
	});

	it("a linha embaixo do mapa fica sem a entrada da faixa do cartaz, que a esconderia a cada troca", () => {
		const indice = readFileSync(
			new URL("../index.css", import.meta.url),
			"utf8",
		);
		expect(regra(indice, ".cartaz-medio .faixa")).toContain("animation: sobe");
		// Mais específica que a do index.css, que vem depois.
		expect(regra(mapa, ".ficha-do-mapa span.faixa")).toBe("animation: none;");
	});

	it("nas cores forçadas, o desenho fica no Canvas com o fio do texto, e o estado em destaque, no Highlight", () => {
		const forcadas = bloco(mapa, "@media (forced-colors: active)");
		expect(regra(forcadas, ".desenho-do-brasil")).toBe(
			"forced-color-adjust: none;",
		);
		// O enfeite da página inicial, sem links, fica com a regra do grupo.
		expect(forcadas).toMatch(/\.regiao-do-mapa,\s*\.estado-no-mapa \{/);
		expect(regra(forcadas, ".estado-no-mapa")).toBe(
			"fill: Canvas; stroke: CanvasText;",
		);
		expect(regra(forcadas, ".estado-em-destaque .estado")).toBe(
			"fill: Highlight; stroke: CanvasText;",
		);
		expect(regra(forcadas, ".estado-em-destaque .fio-claro")).toBe(
			"stroke: Canvas;",
		);
	});

	it("por fora do anel do foco vai um fio claro de folha, 2 px de cada lado: o azul do anel some contra as fitas escuras", () => {
		const anel = regra(mapa, ".estado-em-destaque .anel");
		const fio = regra(mapa, ".estado-em-destaque .fio-claro");
		const largura = (corpo: string) =>
			Number(/stroke-width: (\d+)px;/.exec(corpo)?.[1]);

		expect(anel).toContain("stroke: var(--ring);");
		expect(fio).toContain("stroke: var(--folha);");
		expect(largura(fio)).toBe(largura(anel) + 4);
	});

	it("o foco nativo usa o mesmo anel azul e fio claro, acima do SVG e fora do caminho do ponteiro", () => {
		expect(regra(mapa, ".focos-nativos")).toBe("pointer-events: none;");
		expect(regra(mapa, ".foco-nativo")).toBe("display: none;");
		for (const camada of ["anel", "fio-claro"]) {
			const seletores = new RegExp(
				`\\.foco-nativo \\.${camada},\\s*\\.estado-em-destaque \\.${camada} \\{`,
			);
			expect(mapa).toMatch(seletores);
			expect(bloco(mapa, "@media (forced-colors: active)")).toMatch(seletores);
		}
		expect(
			regra(
				mapa,
				".desenho-do-brasil:has(.estado-em-destaque.com-foco) .focos-nativos",
			),
		).toBe("display: none;");
	});

	it("sem a cópia do React, o CSS apaga as outras regiões, com o foco do teclado à frente do ponteiro", () => {
		const antesDaCopia = bloco(
			mapa,
			".desenho-do-brasil:not(:has(.estado-em-destaque))",
		).replace(/\s+>\s+/g, " > ");
		expect(antesDaCopia).toContain(
			"&:has(.estado-no-mapa:focus-visible) > .regiao-do-mapa:not(:has(.estado-no-mapa:focus-visible)),",
		);
		expect(
			regra(
				antesDaCopia,
				"&:not(:has(.estado-no-mapa:focus-visible)):has(.estado-no-mapa:hover) > .regiao-do-mapa:not(:has(.estado-no-mapa:hover))",
			),
		).toBe("--fita: var(--papel-3);");
	});

	it("na lista, a sigla sai, e o nome do estado fica com a linha", () => {
		expect(regra(css, ".estado-na-lista .sigla")).toBe("display: none;");
	});
});

describe("os pontos de quebra", () => {
	it("são em rem, para crescer com a letra: com 200%, o celular fica com o desenho do celular", () => {
		const consultas = css.match(/@(?:media|container)[^{]*/g) ?? [];

		expect(consultas.length).toBeGreaterThan(0);
		for (const consulta of consultas) {
			expect(consulta, consulta).not.toMatch(/\d(?:px|em)\b/);
		}
	});
});

describe("o patrimônio declarado", () => {
	/** Só a seção do patrimônio, para os pontos de quebra dela. */
	const inicio = css.indexOf(
		"/* ───── A página do parlamentar: o patrimônio declarado",
	);
	const patrimonio = css.slice(
		inicio,
		css.indexOf("/* ───── A página da votação", inicio),
	);

	it("cada eleição fica em colunas de minmax(0, 1fr): com a letra grande, o texto quebra dentro da coluna e não alarga a página", () => {
		expect(inicio).toBeGreaterThan(0);
		expect(regra(patrimonio, ".eleicao-do-patrimonio")).toContain(
			"grid-template-columns: 4.25rem minmax(0, 1fr);",
		);
		expect(
			regra(
				bloco(patrimonio, "@media (width >= 40rem)"),
				".eleicao-do-patrimonio",
			),
		).toContain("grid-template-columns: 5.5rem minmax(0, 1fr);");
		const largo = regra(
			bloco(patrimonio, "@media (width >= 48rem)"),
			".eleicao-do-patrimonio",
		);
		expect(largo).toContain(
			"grid-template-columns: 5.5rem minmax(0, 1fr) minmax(0, 1fr);",
		);
		expect(largo).toContain(
			'grid-template-areas: "ano cargo valor" "ano detalhes valor";',
		);
		expect(
			regra(
				bloco(patrimonio, "@media (width < 22rem)"),
				".eleicao-do-patrimonio",
			),
		).toContain("grid-template-columns: minmax(0, 1fr);");
	});

	it("o valor exato encolhe na coluna e o declarado tem altura para as linhas que quebra", () => {
		const valorExato = regra(patrimonio, ".valor-exato-da-eleicao");
		expect(valorExato).toContain("display: inline-block;");
		expect(valorExato).toContain("max-inline-size: 100%;");
		for (const regraDeTexto of [
			regra(patrimonio, ".declarado-na-eleicao"),
			valorExato,
		]) {
			expect(regraDeTexto).not.toMatch(
				/(?:^|; )(?:max-)?(?:height|block-size):|overflow(?:-y)?: (?:hidden|clip)/,
			);
		}
	});

	it("a barra é de tinta, com 4 px no mínimo, e continua à vista nas cores forçadas", () => {
		const barra = regra(patrimonio, ".barra-do-patrimonio");
		expect(barra).toContain("width: max(4px, calc(var(--parte) * 100%));");
		expect(barra).toContain("background: var(--tinta);");
		const forcadas = regra(
			bloco(patrimonio, "@media (forced-colors: active)"),
			".barra-do-patrimonio",
		);
		expect(forcadas).toContain("forced-color-adjust: none;");
		expect(forcadas).toContain("background: CanvasText;");
	});

	it("o aviso leva o fio de tinta do desvio, sem cor", () => {
		expect(regra(patrimonio, ".aviso-do-patrimonio")).toContain(
			"border-left: 5px solid var(--tinta);",
		);
	});

	it("numa coluna estreita, o cargo e o estado ficam um embaixo do outro, sem o quadradinho: ele não fica sozinho no fim da linha", () => {
		expect(regra(patrimonio, ".cargo-da-eleicao")).toContain(
			"container: cargo-da-eleicao / inline-size;",
		);
		const estreita = bloco(
			patrimonio,
			"@container cargo-da-eleicao (width < 23.5rem)",
		);
		expect(regra(estreita, ".cargo-da-eleicao .faixa")).toContain(
			"flex-direction: column;",
		);
		// Mais específica que a regra do quadradinho no index.css, que vem depois.
		expect(
			regra(
				estreita,
				".cargo-da-eleicao .faixa > span:not(:last-child)::after",
			),
		).toContain("display: none;");
	});

	it("o arquivo sem link ocupa a altura do link: a linha da eleição não encolhe nem cola o arquivo na data da coleta", () => {
		const indice = readFileSync(
			new URL("../index.css", import.meta.url),
			"utf8",
		);
		const link = regra(indice, "a.acao-de-texto").match(
			/padding-block: [^;]+;/,
		);
		expect(link).not.toBeNull();
		expect(regra(patrimonio, ".arquivo-sem-link")).toContain(link?.[0]);
	});
});
