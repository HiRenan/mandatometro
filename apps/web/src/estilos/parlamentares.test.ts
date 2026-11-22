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
	it("cada link de estado, de nome e de grupo tem pelo menos 44 px de altura", () => {
		for (const seletor of [
			".estado-no-mapa",
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
	it("seis azulejos de 44 px e cinco vãos de 4 px pedem 17,75 rem; abaixo disso, a lista toma o lugar do mapa", () => {
		const mapa = regra(css, ".mapa");
		expect(mapa).toContain("grid-template-columns: repeat(6, minmax(0, 1fr));");
		expect(mapa).toContain("gap: 4px;");
		expect(6 * 44 + 5 * 4).toBe(17.75 * 16);

		const estreito = bloco(css, "@container mapa (width < 17.75rem)");
		expect(regra(estreito, ".mapa")).toBe("display: none;");
		expect(regra(estreito, ".lista-de-estados")).toContain("display: grid;");
		expect(regra(css, ".lista-de-estados")).toBe("display: none;");
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
