import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O cabeçalho tem dois links — Trilhas e Jogos — e quatro onde o site tem a
// API, com Parlamentares e Edições, mais a busca e a conta. No computador, uma
// linha: o nome, os links no meio e a busca e a conta à direita; no tablet, os
// links descem para baixo; no celular, o nome e o botão "Menu" (header.tsx).
// Este teste lê o CSS do site, porque o jsdom não desenha. As medidas citadas
// vêm do Edge.

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const cssDaBusca = readFileSync(
	new URL("../estilos/busca.css", import.meta.url),
	"utf8",
);
const cssDoMovimento = readFileSync(
	new URL("../estilos/movimento.css", import.meta.url),
	"utf8",
);

/** O corpo de cada @media ou @container com a condição dada: largura e corpo. */
function blocosDe(texto: string, inicio: string, operador: "<" | ">=") {
	const condicao = new RegExp(
		`${inicio} \\(width ${operador} ([\\d.]+)rem\\) \\{((?:[^{}]*\\{[^}]*\\})*)\\s*\\}`,
		"g",
	);
	return [...texto.matchAll(condicao)].map(([, largura, corpo]) => ({
		largura: Number(largura),
		corpo,
	}));
}

const ate = blocosDe(css, "@media", "<");
const desde = blocosDe(css, "@media", ">=");

/** O bloco do celular, abaixo de 48rem, onde o menu aparece. */
const celular = ate.find(({ corpo }) => corpo.includes(".menu-do-celular {"));

/** O corpo da regra de um seletor fora de @media, no começo da linha. */
function regra(texto: string, seletor: string) {
	const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`\\n\\t${escapado} \\{([^}]*)\\}`).exec(texto)?.[1];
}

const TIRA_O_INICIO = /\.topo-links > li:first-child \{\s*display: none;\s*\}/;

describe("o CSS do cabeçalho", () => {
	it("no computador, uma linha em três colunas, com as dos lados iguais", () => {
		// As colunas laterais iguais põem os links no centro da grade, que
		// coincide com o da área da página sem a barra de rolagem vertical.
		const grade = desde.find(({ corpo }) =>
			/\.topo-dentro \{\s*display: grid;\s*grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\);\s*\}/.test(
				corpo,
			),
		);

		expect(grade?.largura).toBe(62);
	});

	it("cada largura mostra uma das três listas dos links", () => {
		const grade = desde.find(({ largura }) => largura === 62)?.corpo;

		// No computador, só a lista do meio; no tablet, só a de baixo; no
		// celular, só o menu, sem a busca e a conta do lado do nome.
		expect(regra(css, ".topo-nav-meio")).toMatch(/^\s*display: none;\s*$/);
		expect(grade).toMatch(/\.topo-nav-meio \{\s*display: block;\s*\}/);
		expect(grade).toMatch(/\.topo-nav-baixo \{\s*display: none;\s*\}/);
		expect(regra(css, ".menu-do-celular")).toMatch(/^\s*display: none;\s*$/);
		expect(celular?.largura).toBe(48);
		expect(celular?.corpo).toMatch(
			/\.topo-ferramentas,\s*\.topo-nav-baixo \{\s*display: none;\s*\}/,
		);
		expect(celular?.corpo).toMatch(
			/\.menu-do-celular \{\s*display: block;\s*\}/,
		);
	});

	it("a lista de baixo toma a linha inteira, com os links no meio", () => {
		expect(regra(css, ".topo-nav-baixo")).toMatch(/^\s*flex: 1 1 100%;\s*$/);
		expect(regra(css, ".topo-nav-baixo .topo-links")).toMatch(
			/justify-content: center;/,
		);
	});

	it("a busca e a conta entram na linha do nome pelo tamanho mínimo e crescem até a ponta", () => {
		// A base 0 quebra a linha pelo mínimo (a lupa e o "Entrar"): com a base do
		// conteúdo, a barra inteira, a busca descia para a linha de baixo a 360 px.
		expect(regra(css, ".topo-ferramentas")).toMatch(
			/\bflex: 1 1 0;[\s\S]*\bjustify-content: flex-end;/,
		);
	});

	it("no celular, nenhuma regra esconde o primeiro link: o Início saiu, e o Trilhas fica", () => {
		expect(css).not.toMatch(TIRA_O_INICIO);
		expect(css).not.toMatch(/\.topo-links > li:first-child/);
	});

	it("o M é a letra da fonte, com a dobra e o fio das fitas, e a palavra segue inteira a 320 px", () => {
		const midia = ate.find(({ corpo }) =>
			/\.moldura \.nome-do-site \{\s*--letra: 1\.1875rem;\s*\}/.test(corpo),
		);

		expect(midia?.largura).toBe(22.5);
		expect(regra(css, ".marca-palavra")).toContain("white-space: nowrap;");
		// Na #357, o livro deixou de ser a inicial: com ele, lia-se "ANDATÔMETRO".
		// O M tem o tamanho das outras letras, e nenhum desenho fica no lugar dele.
		expect(regra(css, ".marca-inicial")).not.toMatch(
			/font-size|letter-spacing/,
		);
		expect(css).not.toContain(".marca-palavra svg");
		// A dobra desce do vão de cima até a base do M, a 0,834 em do alto da
		// caixa de linha 1, e o fio das fitas fica logo abaixo da base.
		expect(regra(css, ".marca-inicial::before")).toBeUndefined();
		expect(regra(css, ".marca-inicial::after")).toBeUndefined();
		const inicialComArchivo = ".marca-inicial[data-archivo-carregada]";
		const dobra = regra(css, `${inicialComArchivo}::before`) ?? "";
		const fio = regra(css, `${inicialComArchivo}::after`) ?? "";
		const medida = (corpo: string, nome: string) =>
			Number(new RegExp(`\\b${nome}: ([\\d.]+)em;`).exec(corpo)?.[1]);
		expect(medida(dobra, "top") + medida(dobra, "height")).toBeCloseTo(
			0.834,
			2,
		);
		expect(medida(fio, "top")).toBeGreaterThan(0.834);
		expect(fio).toContain("background: var(--tira);");
	});

	it("com a letra grande, os links quebram a linha em vez de passar da página", () => {
		// A reserva da coluna: onde a lista ainda não cabe, ela quebra, em vez de
		// passar da página (no computador, a barra de rolagem toma 15 px).
		expect(regra(css, ".topo-links")).toMatch(/\bflex-wrap: wrap;/);
	});

	it("com a letra grande, as regras das listas e do menu permitem quebra", () => {
		// Na #226, o cabeçalho alargava os quizzes e o artigo. Uma regra mais
		// específica pode impedir a quebra mesmo com o wrap no CSS.
		const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, "");
		const regras = semComentarios.matchAll(
			/([^{};]*\.(?:topo-links|topo-nav-baixo|menu-do-celular[\w-]*)(?![\w-])[^{};]*)\{([^{}]*)\}/g,
		);
		const semQuebra =
			/(?:^|;)\s*(?:flex-wrap|flex-flow|white-space)\s*:[^;]*\bnowrap\b/i;
		const bloqueios = [...regras]
			.filter(([, , corpo]) => semQuebra.test(corpo))
			.map(([, seletor]) => seletor.trim());

		expect(bloqueios).toEqual([]);
	});

	it("os dois links da conta ficam na mesma célula, e a marca do <html> esconde um", () => {
		expect(regra(css, ".entrada-da-conta > a")).toMatch(/grid-area: 1 \/ 1;/);
		expect(regra(css, ".entrada-da-conta")).toMatch(/display: grid;/);
		expect(css).toMatch(
			/html:not\(\[data-conta-aberta\]\) \.entrada-da-conta > \[data-para="quem-entrou"\],\s*html\[data-conta-aberta\] \.entrada-da-conta > \[data-para="quem-nao-entrou"\] \{\s*visibility: hidden;\s*\}/,
		);
	});

	it("o traço de 4 px guarda 2 px de respiro abaixo da linha de texto", () => {
		const link = regra(css, ".topo-links a,\n\t.entrada-da-conta a");
		const traco = regra(
			css,
			".topo-links a::after,\n\t.entrada-da-conta a::after",
		);

		expect(traco).toContain(
			"bottom: min(0.3rem, 50% - 0.5em - var(--espaco-do-traco));",
		);
		expect(traco).toContain("height: 4px;");
		expect(link).toContain("--espaco-do-traco: 6px;");
		expect(link).toContain("padding: var(--espaco-do-traco) 0.9rem;");
		expect(link).toContain("align-items: center;");
		expect(link).toContain("line-height: 1;");
		expect(link).toContain("min-height: max(44px, 2.75rem);");
	});

	it("nas cores forçadas, o traço da seção usa a cor de texto do sistema", () => {
		// O traço é um fundo. CanvasText o mantém visível nas cores forçadas.
		expect(css).toMatch(
			/@media \(forced-colors: active\) \{\s*\.topo-links a::after,\s*\.entrada-da-conta a::after \{\s*background: CanvasText;\s*\}\s*\}/,
		);
	});
});

describe("o CSS do menu do celular", () => {
	/** Uma medida em rem do corpo de uma regra. */
	function emRem(corpo: string | undefined, propriedade: string) {
		return Number(
			new RegExp(`(?:^|[;\\s])${propriedade}: ([\\d.]+)rem;`).exec(
				corpo ?? "",
			)?.[1],
		);
	}

	it("no celular, o nome e o botão dividem uma linha, com o nome por cima do menu", () => {
		expect(celular?.corpo).toMatch(
			/\.topo-dentro \{\s*display: grid;\s*grid-template-columns: minmax\(0, 1fr\);\s*\}/,
		);
		expect(celular?.corpo).toMatch(
			/\.topo-dentro > \.marca,\s*\.menu-do-celular \{\s*grid-area: 1 \/ 1;\s*align-self: start;\s*\}/,
		);
		// O menu toma a linha toda, para o painel abrir de margem a margem, e é
		// transparente: o toque no nome chega ao link, que fica por cima.
		expect(celular?.corpo).toMatch(
			/\.topo-dentro > \.marca \{\s*position: relative;\s*z-index: 1;\s*justify-self: start;\s*\}/,
		);
		expect(regra(css, ".menu-do-celular-botao")).toMatch(
			/\bmargin-left: auto;/,
		);
	});

	it("fechado, o cabeçalho tem o --topo, e o botão fica no lugar quando o menu abre", () => {
		// A margem do nome e do botão enche o --topo, menos a tira de 6 px, os
		// 8 px de respiro em cima e embaixo (header.tsx) e a linha de 2,75rem.
		expect(css).toMatch(/--topo: 4\.5rem;/);
		expect(celular?.corpo).toMatch(
			/\.topo-dentro > \.marca,\s*\.menu-do-celular-botao \{\s*margin-block: calc\(\(var\(--topo\) - 6px - 16px - 2\.75rem\) \/ 2\);\s*\}/,
		);
		expect(emRem(regra(css, ".marca a"), "min-height")).toBe(2.75);
		expect(emRem(regra(css, ".menu-do-celular-botao"), "min-height")).toBe(
			2.75,
		);
	});

	it("o botão tem largura fixa, e o teto do nome desconta ele e o vão, com a Archivo e com a fonte de reserva", () => {
		// Com a largura do botão fixa, o nome tem o mesmo tamanho nas duas fontes,
		// e o cabeçalho não pula quando a Archivo chega.
		const largura = emRem(regra(css, ".menu-do-celular-botao"), "width");

		expect(largura).toBe(6.25);
		expect(celular?.corpo).toMatch(
			/\.moldura \.nome-do-site \{\s*--recuo: calc\(6\.25rem \+ 12px\);\s*\}/,
		);
		// O teto do nome conta as letras mais largas da fonte de reserva.
		expect(regra(css, ".marca .nome-do-site")).toMatch(/--palavra: 9\.1;/);
	});

	it("com a letra grande, o botão desce para a linha de baixo, e o nome volta ao teto da página", () => {
		const [quebra] = blocosDe(css, "@container", "<").filter(({ corpo }) =>
			corpo.includes(".menu-do-celular {"),
		);

		// Com a letra a 100%, a página de 320 px tem 20rem, e o botão fica na
		// linha do nome em todo celular; a 200%, a de 480 px tem 15rem, e ele desce.
		expect(quebra?.largura).toBeLessThanOrEqual(20);
		expect(quebra?.largura).toBeGreaterThan(15);
		expect(quebra?.corpo).toMatch(
			/\.menu-do-celular \{\s*grid-area: 2 \/ 1;\s*\}/,
		);
		expect(quebra?.corpo).toMatch(
			/\.topo-dentro > \.marca,\s*\.menu-do-celular-botao \{\s*margin-block: 0;\s*\}/,
		);
		expect(quebra?.corpo).toMatch(
			/\.moldura \.nome-do-site \{\s*--recuo: 0px;\s*\}/,
		);
	});

	it("o botão é a palavra e as três linhas, sem o triângulo do <details>, e aberto troca as linhas pelo X", () => {
		expect(regra(css, ".menu-do-celular-botao")).toMatch(/\blist-style: none;/);
		expect(
			regra(css, ".menu-do-celular-botao::-webkit-details-marker"),
		).toMatch(/display: none;/);
		expect(
			regra(css, ".menu-do-celular > details[open] > .menu-do-celular-botao"),
		).toMatch(/background: var\(--papel\);\s*color: var\(--tinta\);/);
		expect(css).toMatch(
			/\.menu-do-celular-fechar,\s*\.menu-do-celular > details\[open\] \.menu-do-celular-abrir \{\s*display: none;\s*\}/,
		);
		expect(
			regra(css, ".menu-do-celular > details[open] .menu-do-celular-fechar"),
		).toMatch(/display: block;/);
	});

	it("a letra dos destinos tem o teto da largura do painel, também com a fonte de reserva", () => {
		const link = regra(css, ".menu-do-celular-lista a");
		const teto =
			/font-size: min\(1\.5rem, calc\(\(100cqi - ([\d.]+)rem - (\d+)px\) \/ 9\.2\)\);/.exec(
				regra(css, ".menu-do-celular-texto") ?? "",
			);

		expect(regra(css, ".menu-do-celular-painel")).toMatch(
			/container: menu-do-celular \/ inline-size;/,
		);
		// PARLAMENTARES pede 9,2 em na fonte de reserva. O teto desconta o
		// azulejinho, a seta e os dois vãos da linha.
		expect(Number(teto?.[1])).toBe(
			emRem(regra(css, ".menu-do-celular-lista a::before"), "width") +
				emRem(regra(css, ".menu-do-celular-seta"), "width"),
		);
		expect(Number(teto?.[2])).toBe(
			2 * Number(/\bgap: (\d+)px;/.exec(link ?? "")?.[1]),
		);
		// Cada destino tem 3,5rem de altura, acima dos 44 px do toque.
		expect(emRem(link, "min-height")).toBe(3.5);
	});

	it("com a letra grande, o azulejinho e a seta saem, e a palavra ganha a linha", () => {
		const [estreito] = blocosDe(css, "@container menu-do-celular", "<");

		// Com a letra a 100%, o painel tem pelo menos 17,5rem (320 px menos as
		// margens de 20 px); a 200%, menos de 13,75rem em todo celular.
		expect(estreito?.largura).toBeLessThanOrEqual(17.5);
		expect(estreito?.largura).toBeGreaterThan(13.75);
		expect(estreito?.corpo).toMatch(
			/\.menu-do-celular-lista a::before,\s*\.menu-do-celular-seta \{\s*display: none;\s*\}/,
		);
		expect(estreito?.corpo).toMatch(
			/\.menu-do-celular-texto \{\s*font-size: min\(1\.5rem, calc\(100cqi \/ 9\.2\)\);\s*\}/,
		);
	});

	it("a seção aberta fica sublinhada com o traço de 4 px", () => {
		expect(
			regra(
				css,
				".menu-do-celular-lista a[data-na-secao] .menu-do-celular-texto",
			),
		).toMatch(
			/text-decoration-line: underline;\s*text-decoration-thickness: 4px;/,
		);
	});

	it("a busca entra na linha da conta pela base 0, e a conta fica na margem direita", () => {
		// Com a base de 15rem, a conta descia para a linha de baixo a 360 px.
		expect(regra(css, ".menu-do-celular-util")).toMatch(/flex-wrap: wrap;/);
		expect(regra(css, ".menu-do-celular-util .lugar-da-busca")).toMatch(
			/^\s*flex: 1 1 0;\s*max-width: 15rem;\s*$/,
		);
		expect(regra(css, ".menu-do-celular-util .entrada-da-conta")).toMatch(
			/margin-left: auto;/,
		);
	});

	it("no celular, o respiro e a margem da conta ficam em px, e a letra grande não empurra a página de lado", () => {
		// Em rem, com a letra a 200%, a palavra passava 9 px da página.
		const corpo = celular?.corpo ?? "";
		const margem = /\.entrada-da-conta \{\s*margin-right: -(\d+)px;\s*\}/.exec(
			corpo,
		)?.[1];
		const respiro =
			/\.entrada-da-conta a \{\s*padding-inline: (\d+)px;\s*\}/.exec(
				corpo,
			)?.[1];

		expect(margem).toBeDefined();
		expect(margem).toBe(respiro);
		expect(corpo).toMatch(
			new RegExp(
				`\\.entrada-da-conta a::after \\{\\s*right: ${respiro}px;\\s*left: ${respiro}px;\\s*\\}`,
			),
		);
	});

	it("ao abrir, os destinos descem um a um, e o movimento reduzido tira a animação", () => {
		expect(cssDoMovimento).toMatch(
			/@keyframes desce \{\s*from \{\s*opacity: 0;\s*transform: translateY\(-0\.5rem\);\s*\}\s*\}/,
		);
		expect(
			regra(
				css,
				":where(.menu-do-celular > details[open]) .menu-do-celular-lista > li",
			),
		).toMatch(
			/animation: desce [^;]*;\s*animation-delay: calc\(var\(--i, 0\) \* 45ms\);/,
		);
		expect(
			regra(
				css,
				":where(.menu-do-celular > details[open]) .menu-do-celular-util",
			),
		).toMatch(/animation: desce /);
		// O pedido de menos movimento tira as animações do site inteiro.
		expect(cssDoMovimento).toMatch(
			/@media \(prefers-reduced-motion: reduce\) \{\s*\*,\s*\*::before,\s*\*::after \{[^}]*animation: none !important;/,
		);
	});

	it("nas cores forçadas, o azulejinho sai, e o traço da seção usa a cor de texto do sistema", () => {
		expect(css).toMatch(
			/@media \(forced-colors: active\) \{\s*\.menu-do-celular-lista a::before \{\s*display: none;\s*\}\s*\.menu-do-celular-lista a\[data-na-secao\] \.menu-do-celular-texto \{\s*text-decoration-color: CanvasText;\s*\}\s*\}/,
		);
	});
});

describe("o CSS do cabeçalho com o lema e a busca", () => {
	const TIRA_O_LEMA = /\.moldura \.marca-lema \{\s*display: none;\s*\}/;

	/** A largura, em rem, abaixo da qual o lema sai do cabeçalho. */
	function larguraDoLema(): number | undefined {
		return ate.find(({ corpo }) => TIRA_O_LEMA.test(corpo))?.largura;
	}

	it("o lema fica embaixo do nome a partir de 84rem, e o par cabe nos 72 px", () => {
		expect(larguraDoLema()).toBe(84);
		expect(regra(css, ".marca")).toMatch(/flex-direction: column;/);
		expect(
			desde.find(({ corpo }) =>
				/\.moldura \.marca a \{\s*min-height: 0;\s*\}/.test(corpo),
			)?.largura,
		).toBe(84);
	});

	it("o pré-carregamento da letra de máquina acompanha o lema", () => {
		const raiz = readFileSync(
			new URL("../routes/__root.tsx", import.meta.url),
			"utf8",
		);
		const inicial = readFileSync(
			new URL("../routes/index.tsx", import.meta.url),
			"utf8",
		);
		const largura = larguraDoLema() ?? 0;

		// Onde o lema aparece, a rota raiz adianta a fonte; abaixo disso, só a
		// página inicial, para a frase do título.
		expect(raiz).toContain(
			`preloadDaFonte(fontes.maquina, "(min-width: ${largura}rem)")`,
		);
		expect(inicial).toContain(
			`preloadDaFonte(fontes.maquina, "(max-width: ${(largura - 0.01).toFixed(2)}rem)")`,
		);
	});

	it("o lugar da barra cresce até 20rem, encolhe até a lupa e é o contêiner da entrada", () => {
		const lugar = regra(cssDaBusca, ".lugar-da-busca");

		expect(lugar).toMatch(/\bcontainer: lugar-da-busca \/ inline-size;/);
		expect(lugar).toMatch(/\bflex: 0 1 20rem;/);
		expect(lugar).toMatch(/\bmin-width: 2\.75rem;/);
	});

	it("a entrada mostra o que cabe: a lupa, Buscar, Buscar no site ou a barra com a tecla", () => {
		const consultas = blocosDe(cssDaBusca, "@container lugar-da-busca", "<");
		const soBuscar = consultas.find(({ corpo }) =>
			/\.entrada-da-busca-resto \{[^}]*clip-path: inset\(50%\);/.test(corpo),
		);
		const soALupa = consultas.find(({ corpo }) =>
			/\.entrada-da-busca-texto \{[^}]*clip-path: inset\(50%\);/.test(corpo),
		);
		const comTecla = blocosDe(
			cssDaBusca,
			"@container lugar-da-busca",
			">=",
		).find(({ corpo }) =>
			/\.entrada-da-busca kbd \{\s*display: block;\s*\}/.test(corpo),
		);

		// Os limites de "A largura da entrada", no DESIGN.md, cabem nos 20rem
		// do lugar da barra.
		expect(soALupa?.largura).toBe(6.5);
		expect(soALupa?.corpo).toMatch(/width: 2\.75rem;/);
		expect(soBuscar?.largura).toBe(9.5);
		expect(comTecla?.largura).toBe(14.25);
		for (const consulta of [soALupa, soBuscar, comTecla]) {
			expect(consulta?.largura).toBeLessThan(20);
		}
	});

	it("a tecla só aparece com mouse ou trackpad", () => {
		expect(regra(cssDaBusca, ".entrada-da-busca kbd")).toMatch(
			/^\s*display: none;/,
		);
		expect(cssDaBusca).toMatch(
			/@media \(hover: hover\) and \(pointer: fine\) \{\s*@container lugar-da-busca \(width >= [\d.]+rem\) \{\s*\.entrada-da-busca kbd \{\s*display: block;\s*\}\s*\}\s*\}/,
		);
	});

	it("o que sai da tela fica para o leitor: o nome do botão é sempre Buscar no site", () => {
		// Com o display: none, o leitor de tela ouviria só "Buscar" ou nada.
		expect(cssDaBusca).not.toMatch(
			/\.entrada-da-busca-(?:resto|texto)[^{]*\{[^}]*display: none/,
		);
	});

	it("sem JavaScript, a entrada não aparece: ela só abre a caixa", () => {
		expect(cssDaBusca).toMatch(
			/@media \(scripting: none\) \{\s*\.lugar-da-busca \{\s*display: none;\s*\}\s*\}/,
		);
	});
});
