import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O cabeçalho tem quatro links — Início, Trilhas, Jogos e Conta — e cinco onde
// o site tem a API, com as Edições. No celular eles não cabem na linha do nome:
// o Início sai, e o nome leva ao início (header.tsx). Este teste lê o CSS do
// site, porque o jsdom não desenha.

const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
const cssDaBusca = readFileSync(
	new URL("../estilos/busca.css", import.meta.url),
	"utf8",
);

/** Cada @media com largura máxima: a largura, em rem, e o corpo dela. */
function midiasDe(texto: string) {
	return [
		...texto.matchAll(
			/@media \(width < ([\d.]+)rem\) \{((?:[^{}]*\{[^}]*\})*)\s*\}/g,
		),
	].map(([, largura, corpo]) => ({ largura: Number(largura), corpo }));
}

const midias = midiasDe(css);

const TIRA_O_INICIO = /\.topo-links > li:first-child \{\s*display: none;\s*\}/;

describe("o CSS do cabeçalho", () => {
	it("no celular, tira o Início da lista", () => {
		const midia = midias.find(({ corpo }) => TIRA_O_INICIO.test(corpo));

		expect(midia, "a regra que tira o Início").toBeDefined();
		// Só no celular: dali para cima, os links cabem na linha do nome.
		expect(midia?.largura).toBeGreaterThanOrEqual(30);
		expect(midia?.largura).toBeLessThanOrEqual(40);
	});

	it("no celular estreito, os links se apertam", () => {
		const aperta = /\.topo-links a \{\s*padding: 0 (\d+)px;\s*\}/;
		// O respiro dos links cai duas vezes: no celular (o 48rem) e, mais, no
		// celular estreito. Aqui vale a faixa mais estreita das duas.
		const [midia] = midias
			.filter(({ corpo }) => aperta.test(corpo))
			.sort((uma, outra) => uma.largura - outra.largura);

		expect(midia, "a regra que aperta os links").toBeDefined();
		// Trilhas, Jogos e Edições cabem na linha do nome a 360 px (medido no
		// navegador), com menos respiro que os 10 px do celular (o (width < 48rem)).
		expect(midia?.largura).toBeGreaterThanOrEqual(24);
		expect(midia?.largura).toBeLessThan(30);
		expect(Number(aperta.exec(midia?.corpo ?? "")?.[1])).toBeLessThan(10);
	});

	it("a regra do aperto vale com a API e sem ela", () => {
		// Com a aba do jogo, o celular tem quatro links mesmo sem a API: o aperto
		// não depende mais do data-com-edicoes.
		expect(css).not.toMatch(/\.topo-links\[data-com-edicoes\]/);
	});

	it("com a letra grande, os links quebram a linha em vez de passar da página", () => {
		// Numa janela de computador de 320 px, a barra de rolagem toma 15 px, e,
		// com a letra a 200%, os links não cabem juntos nem na linha de baixo: sem
		// a quebra, o último passava 11 px da página, que rolava de lado (medido no
		// navegador).
		const quebra = /\n\t\.topo-links \{\s*flex-wrap: wrap;\s*\}/;

		expect(css).toMatch(quebra);
		// Em toda largura, e não num @media: o espaço que falta depende da letra e
		// da barra de rolagem, e não só da largura da tela.
		expect(midias.some(({ corpo }) => quebra.test(corpo))).toBe(false);
	});
});

describe("o CSS do cabeçalho com a busca", () => {
	const TIRA_O_LEMA = /\.moldura \.marca-lema \{\s*display: none;\s*\}/;

	/** A largura, em rem, abaixo da qual o lema sai do cabeçalho. */
	function larguraDoLema(): number | undefined {
		return midias.find(({ corpo }) => TIRA_O_LEMA.test(corpo))?.largura;
	}

	it("o lema sai do cabeçalho abaixo de 84rem, e a barra da busca fica com o espaço", () => {
		// O nome com o lema (548 px), a barra (224 px) e os cinco links (453 px)
		// pedem 1225 px de linha: a 1344 px, com a barra de rolagem, sobram 42 px
		// antes da aba do jogo (medido no navegador, com as edições). A 82rem, com
		// a barra de 20rem, os links desciam para a linha de baixo até 1439 px.
		expect(larguraDoLema()).toBe(84);
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

	it("abaixo de 60rem, a barra encolhe para a lupa e o Buscar", () => {
		// O nome, a barra e os links pedem 801 px de linha antes da aba do jogo: a
		// 960 px, com a barra de rolagem, sobram 58 px (medido no navegador, com as
		// edições).
		const encolhe =
			/\.entrada-da-busca-resto,\s*\.entrada-da-busca kbd \{\s*display: none;\s*\}/;
		const midia = midiasDe(cssDaBusca).find(({ corpo }) => encolhe.test(corpo));

		expect(midia?.largura).toBe(60);
	});

	it("a barra entra na linha com o que o conteúdo pede e cresce até 20rem", () => {
		// Numa linha que quebra (o flex-wrap do .topo-dentro), a base decide se os
		// links cabem, antes de a barra encolher: com a base de 20rem, os links
		// desciam para a linha de baixo de 912 a 1023 px. A lupa, o "Buscar no
		// site" e a tecla pedem 221 px, e a base é de 14rem (medido no navegador).
		const barra = /\n\t\.entrada-da-busca \{([^}]*)\}/.exec(cssDaBusca)?.[1];

		expect(barra).toMatch(/\bflex: 1 1 14rem;/);
		expect(barra).toMatch(/\bmax-width: 20rem;/);
	});

	it("sem JavaScript, a entrada não aparece: ela só abre a caixa", () => {
		expect(cssDaBusca).toMatch(
			/@media \(scripting: none\) \{\s*\.entrada-da-busca \{\s*display: none;\s*\}\s*\}/,
		);
	});
});
