import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A barra da leitura do artigo (o .leitura-barra, em
// routes/trilhas/$trilha/$artigo.tsx): a tira das cinco fitas, no alto da tela,
// que enche com a rolagem do texto. O index.css desenha a peça, e o
// estilos/movimento.css liga a barra onde o navegador tem a animação de rolagem
// e a desliga com o movimento reduzido. Até a #149, a regra do index.css que
// escondia a barra vinha depois da que a ligava, na mesma camada, e vencia: a
// barra nunca apareceu.
//
// Este teste junta o CSS do site na ordem do build e resolve a cascata da barra
// em cada navegador, porque o jsdom não conhece as camadas nem o @supports. A
// medida de verdade é no navegador.

const src = new URL("../", import.meta.url);

/**
 * O CSS do site na ordem do build: o index.css, com cada arquivo de estilos/ no
 * lugar do @import dele, sem os comentários. O globals.css, com as cores, as
 * fontes e o Tailwind, fica de fora: ele não tem regra da barra.
 */
const css = readFileSync(new URL("index.css", src), "utf8")
	.replace(/@import "\.\/(estilos\/[\w-]+\.css)";/g, (_, arquivo: string) =>
		readFileSync(new URL(arquivo, src), "utf8"),
	)
	.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * A ordem das camadas, a que o Tailwind declara no começo do CSS (o
 * `@import "tailwindcss"` do globals.css). Uma camada vence as de antes, e o que
 * fica fora de camada vence todas.
 */
const CAMADAS = ["theme", "base", "components", "utilities"];

/** O que pode vir antes da barra num seletor que a pega: a página do artigo e o que fica em volta dela. */
const EM_VOLTA = new Set([
	"html",
	"body",
	".caixa-do-teto",
	"main",
	"#conteudo",
	"div",
	".pagina-do-artigo",
]);

/** As animações do CSS, para achar o nome dentro do atalho `animation`. */
const ANIMACOES = new Set(
	[...css.matchAll(/@keyframes ([\w-]+)/g)].map(([, nome]) => nome),
);

type Regra = { seletores: string[]; declaracoes: string[]; blocos: string[] };

/** A lista de seletores, separada nas vírgulas de fora dos parênteses. */
function separar(lista: string): string[] {
	const seletores = [""];
	let fundo = 0;
	for (const letra of lista) {
		if (letra === "," && fundo === 0) {
			seletores.push("");
			continue;
		}
		if (letra === "(") fundo++;
		if (letra === ")") fundo--;
		seletores[seletores.length - 1] += letra;
	}
	return seletores.map((seletor) => seletor.trim().replace(/\s+/g, " "));
}

/** As regras de estilo, na ordem do CSS, com os blocos em volta de cada uma (@layer, @supports e @media). */
function lerRegras(texto: string): Regra[] {
	const regras: Regra[] = [];
	const pilha: { cabeca: string; declaracoes: string[] }[] = [];
	let trecho = "";
	let aspas: string | null = null;
	for (const letra of texto) {
		if (aspas) {
			trecho += letra;
			if (letra === aspas) aspas = null;
		} else if (letra === '"' || letra === "'") {
			trecho += letra;
			aspas = letra;
		} else if (letra === "{") {
			pilha.push({
				cabeca: trecho.trim().replace(/\s+/g, " "),
				declaracoes: [],
			});
			trecho = "";
		} else if (letra === ";" || letra === "}") {
			// Fora de bloco, o ";" fecha um @import ou um @custom-variant.
			if (pilha.length > 0 && trecho.trim()) {
				pilha[pilha.length - 1]?.declaracoes.push(trecho.trim());
			}
			trecho = "";
			const bloco = letra === "}" ? pilha.pop() : undefined;
			if (bloco && !bloco.cabeca.startsWith("@")) {
				regras.push({
					seletores: separar(bloco.cabeca),
					declaracoes: bloco.declaracoes,
					blocos: pilha.map(({ cabeca }) => cabeca),
				});
			}
		} else {
			trecho += letra;
		}
	}
	return regras;
}

const REGRAS = lerRegras(css);

/** Se o seletor pega a barra. O que o teste não sabe avaliar falha, para não passar calado. */
function pegaABarra(seletor: string): boolean {
	// O * do movimento reduzido, que tira a animação de tudo.
	if (seletor === "*") return true;
	if (!seletor.includes("leitura-barra")) return false;
	const partes = seletor.split(/ ?> ?| /);
	const ultima = partes.pop();
	if (
		(ultima !== ".leitura-barra" && ultima !== "div.leitura-barra") ||
		!partes.every((parte) => EM_VOLTA.has(parte))
	) {
		throw new Error(`o teste não sabe se o seletor ${seletor} pega a barra`);
	}
	return true;
}

type Navegador = { rolagem: boolean; menosMovimento: boolean };

/** Se o bloco vale no navegador. As camadas valem sempre. */
function vale(bloco: string, navegador: Navegador): boolean {
	if (bloco.startsWith("@layer ")) return true;
	if (bloco.startsWith("@supports ") && bloco.includes("animation-timeline")) {
		return bloco.startsWith("@supports not ")
			? !navegador.rolagem
			: navegador.rolagem;
	}
	if (bloco === "@media (prefers-reduced-motion: reduce)") {
		return navegador.menosMovimento;
	}
	if (bloco === "@media (prefers-reduced-motion: no-preference)") {
		return !navegador.menosMovimento;
	}
	throw new Error(`o teste não sabe se o bloco ${bloco} vale para a barra`);
}

/** A posição da camada na ordem, e a de quem fica fora de camada, depois de todas. */
function camada(blocos: string[]): number {
	const nomes = blocos
		.filter((bloco) => bloco.startsWith("@layer "))
		.map((bloco) => bloco.slice("@layer ".length));
	if (nomes.length === 0) return CAMADAS.length;
	const [nome = ""] = nomes;
	if (nomes.length > 1 || !CAMADAS.includes(nome)) {
		throw new Error(`o teste não conhece a camada ${nomes.join(".")}`);
	}
	return CAMADAS.indexOf(nome);
}

/** A especificidade de um seletor simples: os ids, as classes e as tags. */
function especificidade(seletor: string): number[] {
	return [
		(seletor.match(/#[\w-]+/g) ?? []).length,
		(seletor.match(/\.[\w-]+/g) ?? []).length,
		(seletor.match(/(?:^|[ >])[a-z][\w-]*/g) ?? []).length,
	];
}

/** Maior que zero quando a especificidade `a` vence a `b`. */
function compararEspecificidade(a: number[], b: number[]): number {
	for (const [i, valor] of a.entries()) {
		const outro = b[i] ?? 0;
		if (valor !== outro) return valor - outro;
	}
	return 0;
}

/**
 * A declaração, com o atalho `animation` aberto no nome da animação e na linha
 * do tempo, que o atalho zera: a animation-timeline que vem antes dele se perde.
 */
function abrir(declaracao: string): [string, string, boolean][] {
	const achada = /^([\w-]+)\s*:\s*([\s\S]+?)\s*(!important)?$/.exec(declaracao);
	if (!achada) return [];
	const [, propriedade = "", valor = "", importante] = achada;
	const peso = Boolean(importante);
	if (propriedade !== "animation") return [[propriedade, valor, peso]];
	const nome =
		valor
			.split(" ")
			.find((parte) => parte === "none" || ANIMACOES.has(parte)) ?? "none";
	return [
		["animation-name", nome, peso],
		["animation-timeline", "auto", peso],
	];
}

type Candidata = {
	valor: string;
	importante: boolean;
	camada: number;
	especificidade: number[];
	ordem: number;
};

/** Se a declaração `a` vence a `b` na cascata. */
function vence(a: Candidata, b: Candidata): boolean {
	if (a.importante !== b.importante) return a.importante;
	// Com o !important, a ordem das camadas se inverte, e o que fica fora de camada perde.
	const camadaDeA = a.importante ? -a.camada : a.camada;
	const camadaDeB = b.importante ? -b.camada : b.camada;
	if (camadaDeA !== camadaDeB) return camadaDeA > camadaDeB;
	const especificidades = compararEspecificidade(
		a.especificidade,
		b.especificidade,
	);
	if (especificidades !== 0) return especificidades > 0;
	return a.ordem > b.ordem;
}

/** O valor de cada propriedade da barra no navegador, pela cascata do CSS do site. */
function barraNo(navegador: Navegador): (propriedade: string) => string {
	const vencedoras = new Map<string, Candidata>();
	let ordem = 0;
	for (const { seletores, declaracoes, blocos } of REGRAS) {
		const daBarra = seletores.filter(pegaABarra);
		if (daBarra.length === 0) continue;
		if (!blocos.every((bloco) => vale(bloco, navegador))) continue;
		const [maior = [0, 0, 0]] = daBarra
			.map(especificidade)
			.sort((a, b) => compararEspecificidade(b, a));
		for (const declaracao of declaracoes) {
			ordem++;
			for (const [propriedade, valor, importante] of abrir(declaracao)) {
				const candidata: Candidata = {
					valor,
					importante,
					camada: camada(blocos),
					especificidade: maior,
					ordem,
				};
				const atual = vencedoras.get(propriedade);
				if (!atual || vence(candidata, atual)) {
					vencedoras.set(propriedade, candidata);
				}
			}
		}
	}
	return (propriedade) => vencedoras.get(propriedade)?.valor ?? "(sem regra)";
}

/** O z-index do cabeçalho (a .moldura do index.css). */
const zDoCabecalho = Number(
	/\.moldura \{[^}]*z-index: (\d+);/.exec(css)?.[1] ?? Number.NaN,
);

describe("a barra da leitura do artigo", () => {
	const comRolagem = barraNo({ rolagem: true, menosMovimento: false });

	it("aparece onde o navegador tem a animação de rolagem", () => {
		expect(comRolagem("display")).toBe("block");
	});

	it("enche com a rolagem do texto, e não com o relógio", () => {
		// O atalho animation zera a linha do tempo, e a animation-timeline vem
		// depois dele. Na linha do tempo do relógio, a animação, sem duração,
		// acabaria na hora, e a barra ficaria cheia desde o começo do texto.
		expect(comRolagem("animation-name")).toBe("enche");
		expect(comRolagem("animation-timeline")).toBe("--leitura");
	});

	it("não aparece onde o navegador não tem a animação de rolagem", () => {
		const semRolagem = barraNo({ rolagem: false, menosMovimento: false });

		expect(semRolagem("display")).toBe("none");
	});

	it("sai com o movimento reduzido, com ou sem a animação de rolagem", () => {
		for (const rolagem of [true, false]) {
			const reduzido = barraNo({ rolagem, menosMovimento: true });

			expect(reduzido("display"), `rolagem: ${rolagem}`).toBe("none");
		}
	});

	it("fica presa no alto da tela, sem receber o clique, e embaixo do cabeçalho", () => {
		expect(comRolagem("position")).toBe("fixed");
		expect(comRolagem("pointer-events")).toBe("none");
		// Enquanto o cabeçalho está na tela, ele e o "Pular para o conteúdo", que
		// fica dentro dele, cobrem a barra: a tira do cabeçalho vem por cima.
		expect(zDoCabecalho).toBeGreaterThan(0);
		expect(Number(comRolagem("z-index"))).toBeLessThan(zDoCabecalho);
	});
});
