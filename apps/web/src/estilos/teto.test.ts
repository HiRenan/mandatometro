import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// O teto da letra grande (o letra-com-teto do index.css) mede a caixa do teto,
// e não a tela: o 100vw conta a barra de rolagem do Windows (15 px), e, numa
// janela de computador estreita, a palavra encostada no teto passava da página
// e se partia (a #139). O vi, o vmin e o vmax também medem a tela, e um vw
// guardado numa variável chega à conta do mesmo jeito (a #147). Este teste lê o
// CSS, porque o jsdom não desenha; a medida de verdade é no navegador, com a
// barra de rolagem à vista.

const estilos = new URL("./", import.meta.url);

/** O CSS do site, arquivo por arquivo, sem os comentários. */
const arquivos = [
	["index.css", new URL("../index.css", import.meta.url)] as const,
	...readdirSync(estilos)
		.filter((nome) => nome.endsWith(".css"))
		.map((nome) => [`estilos/${nome}`, new URL(nome, estilos)] as const),
].map(([nome, url]) => ({
	nome,
	css: readFileSync(url, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""),
}));

/** Os valores de uma propriedade em todo o CSS, cada um numa linha só. */
function valores(propriedade: string) {
	return arquivos.flatMap(({ nome, css }) =>
		[
			...css.matchAll(
				new RegExp(`(?:^|[;{\\s])${propriedade}:([^;{}]+);`, "g"),
			),
		].map(([, valor = ""]) => ({
			onde: `${nome}: ${propriedade}`,
			valor: valor
				.replace(/\s+/g, " ")
				.replace(/\( /g, "(")
				.replace(/ \)/g, ")")
				.trim(),
		})),
	);
}

/**
 * Uma unidade da tela: o vw e os parentes dele, que também contam a barra. O vi
 * é o vw da direção do texto, e o vmin e o vmax viram o vw numa janela mais alta
 * do que larga. Cada um tem o s, o l e o d na frente (o svw, o lvi, o dvmin...).
 */
const DA_TELA = /[\d.](?:s|l|d)?(?:vw|vi|vmin|vmax)\b/i;

/**
 * As variáveis que a conta do teto não segue. O --letra é o outro lado do min:
 * a letra que o título quer ter, que cresce com a tela de propósito. As outras
 * são medidas da página, que ela usa com o mesmo valor no padding, no gap e no
 * grid: a margem, os respiros das folhas, as colunas da folha da trilha e a capa
 * do quiz. O vw delas entra igual na página e na conta, e as duas batem. Uma
 * variável que só a conta usa, como um 100vw guardado numa variável, mede a tela.
 */
const FORA_DA_CONTA = [
	"--letra",
	"--margem",
	"--respiro",
	"--respiro-da-folha",
	"--col-numero",
	"--col-azulejo",
	"--capa",
];

/**
 * Uma conta e, de variável em variável, as definições que ela usa pelo var(),
 * fora as do FORA_DA_CONTA: o onde de cada uma diz o caminho até ela.
 */
function comAsVariaveis(conta: { onde: string; valor: string }) {
	const vistas = new Set(FORA_DA_CONTA);
	const partes = [conta];
	for (let i = 0; i < partes.length; i++) {
		const { onde, valor } = partes[i];
		for (const [, variavel = ""] of valor.matchAll(/var\((--[\w-]+)/g)) {
			if (!vistas.has(variavel)) {
				vistas.add(variavel);
				partes.push(
					...valores(variavel).map((definicao) => ({
						onde: `${onde} → ${definicao.onde}`,
						valor: definicao.valor,
					})),
				);
			}
		}
	}
	return partes;
}

/** O teto de cada título, no font-size, e os recuos que entram nele. */
function contasDoTeto() {
	return {
		tetos: valores("font-size").filter(({ valor }) =>
			valor.includes("var(--palavra)"),
		),
		recuos: [...valores("--recuo"), ...valores("--recuo-de-fora")],
	};
}

describe("a unidade da tela", () => {
	it("é o vw, o vi, o vmin e o vmax, com o s, o l e o d na frente", () => {
		const daTela = ["100vw", "100vi", "30vmin", "30vmax", "0.5vw", ".5vi"];
		const variantes = ["s", "l", "d"].flatMap((letra) =>
			["vw", "vi", "vmin", "vmax"].map((unidade) => `100${letra}${unidade}`),
		);
		const outras = ["100cqi", "100cqw", "100vh", "100dvh", "4.5rem", "30%"];

		for (const valor of [...daTela, ...variantes, "100VW", "100Vi"]) {
			expect(valor).toMatch(DA_TELA);
		}
		for (const valor of [...outras, "var(--vw)", "var(--recuo-vi)"]) {
			expect(valor).not.toMatch(DA_TELA);
		}
	});
});

describe("o teto da letra grande", () => {
	it("tira as margens e o recuo da largura da caixa do teto, e não da tela", () => {
		const tetos = valores("font-size").map(({ valor }) => valor);

		expect(tetos).toContain(
			"min(var(--letra), calc((100cqi - 2 * var(--margem) - var(--recuo, 0px)) / var(--palavra)))",
		);
	});

	it("nenhuma conta do teto mede a tela, que conta a barra de rolagem", () => {
		// Cada tamanho que para na palavra mais larga (o --palavra) e cada recuo
		// que entra nessa conta: com o 100vw, o título tinha 15 px a mais do que
		// a caixa, e a palavra mais larga se partia na beirada.
		const { tetos, recuos } = contasDoTeto();

		// O teto dos títulos do site, o dos que vêm da API e o do resultado do quiz.
		expect(tetos.length).toBeGreaterThanOrEqual(3);
		expect(recuos.length).toBeGreaterThan(10);
		for (const { onde, valor } of tetos) {
			expect(valor, onde).toContain("100cqi");
		}
		for (const { onde, valor } of [...tetos, ...recuos]) {
			expect(valor, onde).not.toMatch(DA_TELA);
		}
	});

	it("nem por uma variável no meio da conta", () => {
		// Um 100vw guardado numa variável, e a variável na conta, mede a tela do
		// mesmo jeito. A conta segue cada var() até o fim, fora o --letra e as
		// medidas da página (o FORA_DA_CONTA).
		const { tetos, recuos } = contasDoTeto();
		const partes = [...tetos, ...recuos].flatMap(comAsVariaveis);

		// Os recuos chegam ao --recuo-de-fora, e a conta segue até as definições dele.
		expect(partes.some(({ onde }) => onde.includes("→"))).toBe(true);
		for (const { onde, valor } of partes) {
			expect(valor, onde).not.toMatch(DA_TELA);
		}
	});
});
