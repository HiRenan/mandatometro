// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	createRootRoute,
	createRouter,
	type RootRouteOptions,
} from "@tanstack/react-router";
import {
	createRequestHandler,
	defaultRenderHandler,
} from "@tanstack/react-router/ssr/server";
import { describe, expect, it, vi } from "vitest";
import { acharArtigo, trilhas } from "@/lib/conteudo/paginas.server";
import { Route as RotaRaiz } from "@/routes/__root";
import { Route as RotaDoArtigo } from "@/routes/trilhas/$trilha/$artigo";

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
//
// A cascata também sai para as duas peças que ligam a barra ao texto: o texto do
// artigo, que é a linha do tempo, e a página do artigo, que deixa a barra ver
// essa linha. A revisão do PR #160 achou três mudanças que deixavam o teste verde
// e quebravam a barra no navegador (a #163).

const src = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * O CSS do site na ordem do build: o index.css, com cada arquivo de estilos/ no
 * lugar do @import dele, sem os comentários. O globals.css, com as cores, as
 * fontes e o Tailwind, fica de fora: ele não tem regra da barra.
 */
const css = readFileSync(join(src, "index.css"), "utf8")
	.replace(/@import "\.\/(estilos\/[\w-]+\.css)";/g, (_, arquivo: string) =>
		readFileSync(join(src, arquivo), "utf8"),
	)
	.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * A ordem das camadas, a que o Tailwind declara no começo do CSS (o
 * `@import "tailwindcss"` do globals.css). Uma camada vence as de antes, e o que
 * fica fora de camada vence todas.
 */
const CAMADAS = ["theme", "base", "components", "utilities"];

vi.mock("@/env", () => ({ ENV: { API_URL: "" } }));

/**
 * O documento de __root.tsx com a rota do artigo e o TextoDoArtigo. A ordem
 * dos pais e dos irmãos vem do HTML que o roteador devolve em memória.
 */
async function documentoDoArtigo() {
	const raiz = createRootRoute({
		shellComponent: (RotaRaiz.options as RootRouteOptions).shellComponent,
	});
	const caminho = "/trilhas/$trilha/$artigo";
	const artigo = RotaDoArtigo.update({
		id: caminho,
		path: caminho,
		getParentRoute: () => raiz,
		loader: ({ params }: { params: { trilha: string; artigo: string } }) =>
			acharArtigo(trilhas, params.trilha, params.artigo),
	} as never);
	const resposta = await createRequestHandler({
		createRouter: () =>
			createRouter({ routeTree: raiz.addChildren([artigo]), isServer: true }),
		request: new Request(
			"http://localhost/trilhas/processo-legislativo/onde-o-projeto-comeca",
		),
	})(defaultRenderHandler);
	expect(resposta.status).toBe(200);
	return new DOMParser().parseFromString(await resposta.text(), "text/html");
}

const documento = await documentoDoArtigo();

type Peca = { nome: string; classe: string; elemento: Element };

function pecaDoArtigo(classe: string, nome: string): Peca {
	const elemento = documento.querySelector(classe);
	if (!elemento) throw new Error(`Falta ${nome} (${classe}) no HTML do artigo`);
	return { nome, classe, elemento };
}

const PAGINA = pecaDoArtigo(".pagina-do-artigo", "a página do artigo");
const BARRA = pecaDoArtigo(".leitura-barra", "a barra");
const TEXTO = pecaDoArtigo(".texto", "o texto do artigo");

/** As animações do CSS, para achar o nome dentro do atalho `animation`. */
const ANIMACOES = new Set(
	[...css.matchAll(/@keyframes ([\w-]+)/g)].map(([, nome]) => nome),
);

/** Os preenchimentos da animação, para achar o dele dentro do atalho `animation`. */
const PREENCHIMENTOS = new Set(["none", "forwards", "backwards", "both"]);

/** Os eixos da linha do tempo, para achar o dela dentro do atalho `view-timeline`. */
const EIXOS = new Set(["block", "inline", "x", "y"]);

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
			if (
				bloco &&
				!bloco.cabeca.startsWith("@") &&
				!pilha.at(-1)?.cabeca.startsWith("@keyframes ")
			) {
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

/** Se o seletor pega a peça. O que o teste não sabe avaliar falha, para não passar calado. */
function pega(peca: Peca, seletor: string): boolean {
	// Um pseudo-elemento, como o ::before ou uma foto da troca de página, tem estilo próprio.
	if (/::[\w-]+(?:\([^()]*\))?$/.test(seletor)) return false;
	try {
		const corresponde = peca.elemento.matches(seletor);
		// Tags, classes, ids e * têm especificidade conhecida. O matches recebe o
		// seletor inteiro, com o espaço, o >, o + e o ~ entre as partes.
		if (/^[\w.#*>+~ -]+$/.test(seletor)) return corresponde;
		// Uma condição na peça (como .texto:hover) pode valer em outro estado.
		const ultima = seletor.split(/[ >+~]+/).at(-1) ?? "";
		if (!corresponde && !ultima.split(/(?=[.#:[])/).includes(peca.classe)) {
			return false;
		}
	} catch {
		// O jsdom também recusa seletores que não conhece.
	}
	throw new Error(`o teste não sabe se o seletor ${seletor} pega ${peca.nome}`);
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
	throw new Error(`o teste não sabe se o bloco ${bloco} vale no navegador`);
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
		(seletor.match(/(?:^|[ >+~])[a-z][\w-]*/gi) ?? []).length,
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
 * A declaração, com os atalhos abertos nas propriedades que o teste lê. O atalho
 * volta ao começo o que ele não diz, como no navegador: o `animation` zera a
 * linha do tempo e o trecho dela, e o `view-timeline`, a janela dela (o inset).
 * O que vem antes do atalho se perde.
 */
function abrir(declaracao: string): [string, string, boolean][] {
	const achada = /^([\w-]+)\s*:\s*([\s\S]+?)\s*(!important)?$/.exec(declaracao);
	if (!achada) return [];
	const [, propriedade = "", valor = "", importante] = achada;
	const peso = Boolean(importante);
	const partes = valor.split(" ");
	if (propriedade === "animation") {
		const nome =
			partes.find((parte) => parte === "none" || ANIMACOES.has(parte)) ??
			"none";
		const preenchimento =
			partes.find((parte) => PREENCHIMENTOS.has(parte)) ?? "none";
		return [
			["animation-name", nome, peso],
			["animation-fill-mode", preenchimento, peso],
			["animation-timeline", "auto", peso],
			["animation-range", "normal", peso],
		];
	}
	if (propriedade === "view-timeline") {
		const [nome = "none", ...resto] = partes;
		const eixo = resto.find((parte) => EIXOS.has(parte)) ?? "block";
		const janela = resto.filter((parte) => !EIXOS.has(parte)).join(" ");
		return [
			["view-timeline-name", nome, peso],
			["view-timeline-axis", eixo, peso],
			["view-timeline-inset", janela || "auto", peso],
		];
	}
	return [[propriedade, valor, peso]];
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

/** O valor de cada propriedade da peça no navegador, pela cascata do CSS do site. */
function estilo(
	peca: Peca,
	navegador: Navegador,
): (propriedade: string) => string {
	const vencedoras = new Map<string, Candidata>();
	let ordem = 0;
	for (const { seletores, declaracoes, blocos } of REGRAS) {
		const daPeca = seletores.filter((seletor) => pega(peca, seletor));
		if (daPeca.length === 0) continue;
		if (!blocos.every((bloco) => vale(bloco, navegador))) continue;
		const [maior = [0, 0, 0]] = daPeca
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

/** O valor de cada propriedade da barra no navegador. */
const barraNo = (navegador: Navegador) => estilo(BARRA, navegador);

/** O z-index do cabeçalho (a .moldura do index.css). */
const zDoCabecalho = Number(
	/\.moldura \{[^}]*z-index: (\d+);/.exec(css)?.[1] ?? Number.NaN,
);

/**
 * A margem do visto: o artigo conta como lido, e o "Você leu este artigo."
 * aparece, quando o lido, logo depois do texto, passa da linha que o rootMargin
 * do IntersectionObserver põe acima do pé da tela.
 */
const margemDoVisto = /rootMargin: "([^"]*)"/.exec(
	readFileSync(join(src, "routes/trilhas/$trilha/$artigo.tsx"), "utf8"),
)?.[1];

describe("a barra da leitura do artigo", () => {
	const comRolagem = barraNo({ rolagem: true, menosMovimento: false });
	const pagina = estilo(PAGINA, { rolagem: true, menosMovimento: false });
	const texto = estilo(TEXTO, { rolagem: true, menosMovimento: false });

	it("o texto descende da página e é filho direto da folha", () => {
		expect(pega(TEXTO, ".pagina-do-artigo .texto")).toBe(true);
		expect(pega(TEXTO, ".pagina-do-artigo > .texto")).toBe(false);
		expect(pega(TEXTO, ".artigo-folha > .texto")).toBe(true);
	});

	it("o lide vem logo antes do texto e o título é um irmão mais distante", () => {
		expect(pega(TEXTO, ".lide + .texto")).toBe(true);
		expect(pega(TEXTO, "h1+.texto")).toBe(false);
		expect(pega(TEXTO, "h1~.texto")).toBe(true);
	});

	it("conta as tags depois de + e ~ na especificidade, mesmo sem espaços", () => {
		expect(especificidade("h1~p+DIV.texto")).toEqual([0, 1, 3]);
	});

	it("avisa quando a regra tem uma condição que a cascata do teste não avalia", () => {
		const seletor = ".lide + .texto:hover";
		expect(() => pega(TEXTO, seletor)).toThrow(
			`o teste não sabe se o seletor ${seletor} pega o texto do artigo`,
		);
	});

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

	it("acompanha a linha do tempo do texto do artigo", () => {
		// O texto é a linha do tempo, na rolagem da página. Sem ela, a barra nunca
		// enche.
		expect(texto("view-timeline-name")).toBe("--leitura");
		expect(texto("view-timeline-axis")).toBe("block");
		// A barra fica fora do texto e só vê a linha do tempo dele pelo
		// timeline-scope da página do artigo, que tem os dois dentro. Sem ele, a
		// barra fica cheia desde o alto da página.
		expect(pagina("timeline-scope").split(/,\s*/)).toContain("--leitura");
	});

	it("fica cheia depois do fim do texto, e não esvazia", () => {
		// O preenchimento both deixa a barra vazia antes do texto e cheia depois
		// dele. Sem ele, ela esvazia quando o texto acaba.
		expect(comRolagem("animation-fill-mode")).toBe("both");
	});

	it("começa na linha de 60% da tela e fica cheia na linha do visto, a 90%", () => {
		// O visto aparece quando o lido, 2rem abaixo do texto, passa da linha a 10%
		// do pé da tela.
		expect(margemDoVisto).toBe("0px 0px -10% 0px");
		// A janela da linha do tempo vai da linha a 60% da altura da tela à do
		// visto, a 90%, e o texto é mais alto que ela. No trecho contain, a barra
		// começa quando o alto do texto passa da linha de cima e fica cheia quando
		// o fim dele passa da de baixo, um pouco antes de o lido passar e o visto
		// aparecer.
		expect(texto("view-timeline-inset")).toBe("60% 10%");
		expect(comRolagem("animation-range")).toBe("contain");
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
