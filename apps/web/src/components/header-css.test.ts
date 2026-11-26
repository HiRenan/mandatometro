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
