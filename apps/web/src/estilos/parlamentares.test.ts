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

describe("a página do parlamentar", () => {
	/** Só a seção da página do parlamentar, antes do patrimônio. */
	const inicio = css.indexOf("/* ───── A página do parlamentar ─────");
	const pagina = css.slice(
		inicio,
		css.indexOf("/* ───── A página do parlamentar: o patrimônio", inicio),
	);

	/** Só as regras da ficha do cartaz. */
	const ficha = pagina.slice(
		pagina.indexOf("A ficha no pé do cartaz"),
		pagina.indexOf(".corpo-dos-parlamentares {"),
	);

	it("a ficha fica numa coluna do pé do cartaz também no computador, e as colunas dela saem da largura dela: três a partir de 44rem, duas a partir de 24rem", () => {
		expect(ficha.length).toBeGreaterThan(0);
		expect(regra(ficha, ".cartaz-do-parlamentar .cartaz-pe")).toBe(
			"grid-template-columns: minmax(0, 1fr);",
		);
		expect(regra(ficha, ".ficha-do-parlamentar")).toBe(
			"container: ficha / inline-size;",
		);
		expect(regra(ficha, ".itens-da-ficha")).toContain(
			"grid-template-columns: minmax(0, 1fr);",
		);
		expect(
			regra(
				bloco(ficha, "@container ficha (width >= 24rem)"),
				".itens-da-ficha",
			),
		).toBe("grid-template-columns: repeat(2, minmax(0, 1fr));");
		expect(
			regra(
				bloco(ficha, "@container ficha (width >= 44rem)"),
				".itens-da-ficha",
			),
		).toBe("grid-template-columns: repeat(3, minmax(0, 1fr));");
	});

	it("cada fato da ficha é uma subgrade de três linhas, com o fio de tinta em cima, e as eleições ocupam a largura toda, em células que descem no celular", () => {
		const fato = regra(ficha, ".item-da-ficha");
		expect(fato).toContain("grid-row: span 3;");
		expect(fato).toContain("grid-template-rows: subgrid;");
		expect(fato).toContain("border-top: 1px solid var(--tinta);");
		expect(regra(ficha, ".eleicoes-da-ficha")).toBe("grid-column: 1 / -1;");
		expect(regra(ficha, ".lista-das-eleicoes")).toContain(
			"grid-template-columns: repeat(auto-fill, minmax(min(100%, 10rem), 1fr));",
		);
	});

	it("a ficha não leva cor: os números e as partes do mandato ficam em tinta, e as partes entram com o pé do cartaz, e não sozinhas", () => {
		expect(ficha).not.toMatch(/--fita|#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i);
		expect(regra(ficha, ".numero-da-ficha")).toContain(
			"font-variant-numeric: lining-nums tabular-nums;",
		);
		expect(regra(ficha, ".ficha-do-parlamentar span.faixa")).toBe(
			"color: var(--tinta); animation: none;",
		);
	});

	it("o dia da coleta fica embaixo do link da fonte, que fecha a linha sem pontuação", () => {
		expect(regra(ficha, ".coleta-da-ficha")).toBe("display: block;");
	});

	it("as partes do mandato quebram sem o quadradinho no começo nem no fim da linha: ele vai no recuo antes de cada parte, e o que abre a linha fica sob o corte", () => {
		expect(regra(ficha, ".mandatos-da-ficha .rotulo")).toBe(
			"overflow-x: clip;",
		);
		// As linhas de um mandato se encostam, e o vão entre os mandatos é maior.
		expect(regra(ficha, ".mandatos-da-ficha")).toBe(
			"display: grid; gap: 0.75rem;",
		);
		expect(regra(ficha, ".mandatos-da-ficha .faixa")).toBe(
			"row-gap: 0; margin-left: -1.9em;",
		);
		expect(regra(ficha, ".mandatos-da-ficha .parte-do-mandato")).toBe(
			"padding-left: 1.9em;",
		);
		// O quadradinho da faixa (index.css), no recuo: a margem, o quadradinho e a
		// margem dão 0.8 + 0.3 + 0.8 = 1.9em. Nas cores forçadas, ele fica em
		// CanvasText, como o da faixa.
		expect(regra(ficha, ".mandatos-da-ficha .parte-do-mandato::before")).toBe(
			'content: "" / ""; display: inline-block; width: 0.3em; height: 0.3em; margin: 0 0.8em 0 -1.1em; vertical-align: 0.2em; background: currentColor;',
		);
		expect(
			regra(
				bloco(ficha, "@media (forced-colors: active)"),
				".mandatos-da-ficha .parte-do-mandato::before",
			),
		).toBe("forced-color-adjust: none; background: CanvasText;");
		// O seletor vence o ".faixa > span:not(:last-child)::after" do index.css.
		expect(
			regra(
				ficha,
				".mandatos-da-ficha .parte-do-mandato:not(:last-child)::after",
			),
		).toBe("display: none;");
	});

	it("a moldura da foto guarda o lugar com o azulejo cru, e sem o JavaScript o ::after cobre a foto quebrada", () => {
		expect(inicio).toBeGreaterThan(0);
		expect(regra(pagina, ".moldura-da-foto")).toContain(
			"background: var(--azulejo-cru);",
		);
		const quebrada = regra(pagina, ".moldura-da-foto img::after");
		expect(quebrada).toContain('content: "";');
		expect(quebrada).toContain("inset: 0;");
		expect(quebrada).toContain("background: var(--azulejo-cru);");
	});

	it("a foto que falhou esconde o crédito sem tirar o lugar dele: o nome não sobe", () => {
		expect(regra(pagina, ".foto-que-falhou .credito-da-foto")).toContain(
			"visibility: hidden;",
		);
	});

	it("a foto preenche a moldura e corta embaixo: o rosto fica no alto", () => {
		const foto = regra(pagina, ".moldura-da-foto img");
		expect(foto).toContain("object-fit: cover;");
		expect(foto).toContain("object-position: 50% 0;");
	});

	it("a figura tem margem zero", () => {
		expect(regra(pagina, ".foto-oficial")).toContain("margin: 0;");
	});

	it("no computador, o retrato fica por cima de 2 × 3 azulejos do painel, fora do fluxo do cartaz", () => {
		const largo = bloco(pagina, "@media (width >= 62rem)");
		expect(regra(largo, ".cartaz-do-parlamentar.com-foto")).toContain(
			"--azulejo: calc((30cqi - 6px) / 4);",
		);
		const retrato = regra(largo, ".foto-oficial");
		expect(retrato).toContain("position: absolute;");
		expect(retrato).toContain("width: calc(2 * var(--azulejo) + 6px);");
		expect(retrato).toContain("height: calc(3 * var(--azulejo) + 8px);");
	});

	it("no computador, a área da foto é 3 por 4 e pode encolher para dar lugar ao crédito centralizado", () => {
		const largo = bloco(pagina, "@media (width >= 62rem)");
		const moldura = regra(largo, ".moldura-da-foto");
		expect(moldura).toContain("aspect-ratio: 3 / 4;");
		expect(moldura).toContain("flex: 0 1 auto;");
		const credito = regra(largo, ".credito-da-foto");
		expect(credito).toContain("flex: 1 0 auto;");
		expect(credito).toContain("align-content: center;");
	});

	it("no celular, a caixa da foto é 3 por 4, em px e cqi: ela não cresce com a letra", () => {
		const estreito = bloco(pagina, "@media (width < 62rem)");
		expect(regra(estreito, ".cartaz-do-parlamentar.com-foto")).toContain(
			"--foto: clamp(96px, 30cqi, 160px);",
		);
		expect(regra(estreito, ".com-foto .moldura-da-foto")).toContain(
			"aspect-ratio: 3 / 4;",
		);
	});

	it("como votou: a barra é de tinta sobre o trilho em Papel 2, com 4 px no mínimo, e continua à vista nas cores forçadas", () => {
		expect(regra(pagina, ".trilho-do-tipo")).toContain(
			"background: var(--papel-2);",
		);
		const barra = regra(pagina, ".barra-do-tipo");
		expect(barra).toContain("width: max(4px, calc(var(--parte) * 100%));");
		expect(barra).toContain("background: var(--tinta);");
		// O bloco das cores forçadas que vem depois da barra: a ficha tem o dela antes.
		const forcadas = regra(
			bloco(
				pagina.slice(pagina.indexOf(".barra-do-tipo {")),
				"@media (forced-colors: active)",
			),
			".barra-do-tipo",
		);
		expect(forcadas).toContain("forced-color-adjust: none;");
		expect(forcadas).toContain("background: CanvasText;");
	});

	it("a barra de como votou se risca ao entrar na tela, como a do patrimônio, e para com o movimento reduzido", () => {
		const movimento = readFileSync(
			new URL("./movimento.css", import.meta.url),
			"utf8",
		).replace(/\/\*[\s\S]*?\*\//g, "");
		const risca = /([^{}]+)\{\s*animation: risca linear both;/.exec(
			bloco(movimento, "@supports (animation-timeline: view())"),
		)?.[1];
		expect(risca?.split(",").map((seletor) => seletor.trim())).toEqual([
			".barra-do-patrimonio",
			".barra-do-tipo",
		]);
		expect(
			bloco(movimento, "@media (prefers-reduced-motion: reduce)"),
		).toContain("animation: none !important;");
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

	it("o gráfico é uma grade só, com cada linha em subgrade: a coluna do valor e a régua das barras são as mesmas em todas as eleições", () => {
		expect(regra(patrimonio, ".linhas-do-grafico")).toContain(
			"grid-template-columns: auto minmax(0, 1fr) auto;",
		);
		const linha = regra(patrimonio, ".linha-do-grafico");
		expect(linha).toContain("grid-column: 1 / -1;");
		expect(linha).toContain("grid-template-columns: subgrid;");
	});

	it("com o gráfico estreito (a letra grande ou a tela pequena), o valor sobe para cima da barra", () => {
		expect(regra(patrimonio, ".grafico-do-patrimonio")).toContain(
			"container: grafico-do-patrimonio / inline-size;",
		);
		const estreito = bloco(
			patrimonio,
			"@container grafico-do-patrimonio (width < 20rem)",
		);
		expect(regra(estreito, ".linhas-do-grafico")).toContain(
			"grid-template-columns: auto minmax(0, 1fr);",
		);
		expect(regra(estreito, ".valor-do-grafico")).toContain("grid-row: 1;");
		expect(regra(estreito, ".trilho-do-grafico")).toContain("grid-row: 2;");
	});

	it("a diferença fica em tinta, sem cor de ganho nem de perda", () => {
		const diferenca = regra(patrimonio, ".diferenca-da-eleicao");
		expect(diferenca).toContain("font-weight: 700;");
		expect(diferenca).not.toMatch(/(?:^|; )(?:color|background)/);
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
