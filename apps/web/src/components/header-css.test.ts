import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O cabeçalho tem três links — Início, Trilhas e Jogos — e quatro onde o site
// tem a API, com as Edições, mais a busca e a conta. No computador, uma linha: o
// nome, os links no meio e a busca e a conta à direita; no celular, os links
// descem para a linha de baixo (header.tsx). Este teste lê o CSS do site,
// porque o jsdom não desenha. As medidas citadas vêm do Edge, com o build.

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

/** O corpo da regra de um seletor fora de @media, no começo da linha. */
function regra(texto: string, seletor: string) {
	const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`\\n\\t${escapado} \\{([^}]*)\\}`).exec(texto)?.[1];
}

const TIRA_O_INICIO = /\.topo-links > li:first-child \{\s*display: none;\s*\}/;

describe("o CSS do cabeçalho", () => {
	it("no computador, uma linha em três colunas, com as dos lados iguais", () => {
		// Com os lados iguais, os links ficam no meio exato da tela (o Renan, na
		// #261). A 62rem, com as edições, o nome (181 px) e a lupa com o "Entrar"
		// (143 px) cabem dos lados dos links (375 px).
		const grade = desde.find(({ corpo }) =>
			/\.topo-dentro \{\s*display: grid;\s*grid-template-columns: minmax\(0, 1fr\) auto minmax\(0, 1fr\);\s*\}/.test(
				corpo,
			),
		);

		expect(grade?.largura).toBe(62);
	});

	it("cada largura mostra uma das duas listas dos links", () => {
		const grade = desde.find(({ largura }) => largura === 62)?.corpo;

		// Fora do computador, só a lista de baixo; nele, só a do meio.
		expect(regra(css, ".topo-nav-meio")).toMatch(/^\s*display: none;\s*$/);
		expect(grade).toMatch(/\.topo-nav-meio \{\s*display: block;\s*\}/);
		expect(grade).toMatch(/\.topo-nav-baixo \{\s*display: none;\s*\}/);
	});

	it("a lista de baixo toma a linha inteira e é o contêiner da coluna", () => {
		expect(regra(css, ".topo-nav-baixo")).toMatch(
			/^\s*flex: 1 1 100%;\s*container: links-de-baixo \/ inline-size;\s*$/,
		);
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

	it("no celular, tira o Início da lista", () => {
		const midia = ate.find(({ corpo }) => TIRA_O_INICIO.test(corpo));

		expect(midia, "a regra que tira o Início").toBeDefined();
		// Só no celular: dali para cima, os links cabem numa linha com folga.
		expect(midia?.largura).toBeGreaterThanOrEqual(30);
		expect(midia?.largura).toBeLessThanOrEqual(40);
	});

	it("no celular estreito, os links e a conta se apertam", () => {
		const aperta =
			/\.topo-links a,\s*\.entrada-da-conta a \{\s*padding: 0 (\d+)px;\s*\}/;
		// O respiro cai duas vezes: no celular (o 48rem) e, mais, no celular
		// estreito. Aqui vale a faixa mais estreita das duas.
		const [midia] = ate
			.filter(({ corpo }) => aperta.test(corpo))
			.sort((uma, outra) => uma.largura - outra.largura);

		expect(midia, "a regra que aperta os links").toBeDefined();
		expect(midia?.largura).toBeGreaterThanOrEqual(24);
		expect(midia?.largura).toBeLessThan(30);
		expect(Number(aperta.exec(midia?.corpo ?? "")?.[1])).toBeLessThan(10);
	});

	it("a 320 px, o nome fica com 19 px, e a lupa e o Entrar cabem ao lado dele", () => {
		// Com 21 px, o nome, a lupa e o "Entrar" sobravam 2 px na linha de 280 px.
		const midia = ate.find(({ corpo }) =>
			/\.moldura \.nome-do-site \{\s*--letra: 1\.1875rem;\s*\}/.test(corpo),
		);

		expect(midia?.largura).toBe(22.5);
	});

	it("com a letra grande, os links ficam em coluna onde não cabem numa linha", () => {
		const colunas = blocosDe(css, "@container links-de-baixo", "<");
		const comEdicoes = colunas.find(({ corpo }) =>
			/\.topo-links\[data-com-edicoes\] \{\s*flex-direction: column;/.test(
				corpo,
			),
		);
		const semEdicoes = colunas.find(({ corpo }) =>
			/\.topo-links:not\(\[data-com-edicoes\]\) \{\s*flex-direction: column;/.test(
				corpo,
			),
		);

		// Trilhas, Jogos e Edições pedem 13,45rem com a letra a 150%: a 360 px,
		// a lista tem 13,33rem, e o Edições ficava sozinho na linha de baixo. Com
		// a letra a 100%, a lista do celular tem pelo menos 17,5rem.
		expect(comEdicoes?.largura).toBeGreaterThanOrEqual(13.45);
		expect(comEdicoes?.largura).toBeLessThanOrEqual(17.5);
		// Trilhas e Jogos pedem 8,35rem a 200%, e a lista de 320 px tem 8,75rem.
		expect(semEdicoes?.largura).toBeGreaterThanOrEqual(8.35);
		expect(semEdicoes?.largura).toBeLessThanOrEqual(8.75);
		// Na coluna, cada link tem 44 px, em px: o cabeçalho não cresce com a letra.
		for (const coluna of [comEdicoes, semEdicoes]) {
			expect(coluna?.corpo).toMatch(/ a \{\s*min-height: 44px;\s*\}/);
		}
	});

	it("com a letra grande, os links quebram a linha em vez de passar da página", () => {
		// A reserva da coluna: onde a lista ainda não cabe, ela quebra, em vez de
		// passar da página (no computador, a barra de rolagem toma 15 px).
		expect(regra(css, ".topo-links")).toMatch(/\bflex-wrap: wrap;/);
	});

	it("os dois links da conta ficam na mesma célula, e a marca do <html> esconde um", () => {
		expect(regra(css, ".entrada-da-conta > a")).toMatch(/grid-area: 1 \/ 1;/);
		expect(regra(css, ".entrada-da-conta")).toMatch(/display: grid;/);
		expect(css).toMatch(
			/html:not\(\[data-conta-aberta\]\) \.entrada-da-conta > \[data-para="quem-entrou"\],\s*html\[data-conta-aberta\] \.entrada-da-conta > \[data-para="quem-nao-entrou"\] \{\s*visibility: hidden;\s*\}/,
		);
	});

	it("nas cores forçadas, o traço da seção fica na cor do texto", () => {
		// O navegador apaga os fundos, e o traço, que é um fundo, sumia.
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

	it("o lema fica embaixo do nome a partir de 82rem, e o par cabe nos 72 px", () => {
		// O lema (351 px) cabe embaixo do nome na coluna da esquerda a partir de
		// 1312 px; ao lado dele, com os links no meio, só a partir de uns 1710 px.
		expect(larguraDoLema()).toBe(82);
		expect(regra(css, ".marca")).toMatch(/flex-direction: column;/);
		expect(
			desde.find(({ corpo }) =>
				/\.moldura \.marca a \{\s*min-height: 0;\s*\}/.test(corpo),
			)?.largura,
		).toBe(82);
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
