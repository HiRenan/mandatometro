import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	lerArquivosDasTrilhas,
	lerArquivosDoJogo,
} from "../conteudo/conferir.ts";
import { lerTrilhas } from "../conteudo/ler.ts";
import { tetoDoTitulo } from "../conteudo/regua.ts";
import { type Jogo, lerJogos } from "./ler.ts";
import { TRILHA_DO_JOGO } from "./trilha.ts";
import { VOZES } from "./vozes.ts";

// Os roteiros de verdade, lidos da pasta de conteúdo. O teste prende o que cada
// roteiro combinou (docs/jogo-das-comissoes.md): as falas, as decisões de regra
// e as de opinião, e o desenho de cada expressão, cenário e item que uma fala
// pede. O build confere o formato (lib/conteudo/conferir.ts); aqui ficam as
// contas e os arquivos.

const RAIZ_DO_SITE = new URL("../../../", import.meta.url).pathname.replace(
	/^\/([A-Za-z]:)/,
	"$1",
);

/** O que cada roteiro combinou, pelo endereço da pasta dele. */
const COMBINADO = {
	comissoes: {
		titulo: "Jogo das Comissões",
		cenas: 5,
		casas: 5,
		falas: 46,
		regras: 6,
		opinioes: 4,
		/** A tela final oferece rever a trilha só onde ela ensina o jogo. */
		licoes: true,
	},
	"6x1": {
		titulo: "Jogo da 6x1",
		cenas: 5,
		casas: 6,
		falas: 53,
		regras: 10,
		opinioes: 2,
		licoes: false,
	},
} as const;

const trilhas = lerTrilhas(lerArquivosDasTrilhas(RAIZ_DO_SITE));
const artigosDaTrilha = new Set(
	trilhas
		.filter((trilha) => trilha.slug === TRILHA_DO_JOGO)
		.flatMap((trilha) => trilha.artigos.map((artigo) => artigo.slug)),
);
const jogos = lerJogos(lerArquivosDoJogo(RAIZ_DO_SITE), artigosDaTrilha);

function falasDe(jogo: Jogo) {
	return jogo.cenas
		.flatMap((cena) => cena.passos)
		.filter((passo) => passo.tipo === "fala");
}

function decisoesDe(jogo: Jogo) {
	return jogo.cenas
		.flatMap((cena) => cena.passos)
		.filter((passo) => passo.tipo === "decisao");
}

function desenho(pasta: string, arquivo: string): string {
	return `${RAIZ_DO_SITE}public/jogo/${pasta}/${arquivo}.webp`;
}

describe("os roteiros dos jogos", () => {
	it("confere se as gravações acompanham as falas e a direção de voz", () => {
		const gerador = fileURLToPath(
			new URL("../../../vozes/gerar.mjs", import.meta.url),
		);
		execFileSync(process.execPath, [gerador, "--verificar"]);
	});

	it("tem um roteiro por pasta de conteudo/jogo/, e nenhum a mais", () => {
		expect(jogos.map((jogo) => jogo.slug).sort()).toEqual(
			Object.keys(COMBINADO).sort(),
		);
	});

	it("não repete o título entre os jogos, que a lista mostra lado a lado", () => {
		const titulos = jogos.map((jogo) => jogo.titulo);

		expect(new Set(titulos).size).toBe(titulos.length);
	});

	it("vem na ordem que o jogo.md declara, e não na do nome da pasta", () => {
		// "6x1" vem antes de "comissoes" no alfabeto, e a lista de /jogos punha
		// a emenda na frente. A ordem é do roteiro: quem joga o segundo já
		// precisa conhecer o poder conclusivo, que o primeiro ensina.
		expect(jogos.map((jogo) => jogo.slug)).toEqual(["comissoes", "6x1"]);
		expect(jogos.map((jogo) => jogo.ordem)).toEqual([1, 2]);
	});

	it("só anuncia voz para as falas que têm o arquivo gravado, na pasta do jogo", () => {
		// O id da fala se repete entre os jogos (c1-01 está nos dois), e quem
		// separa a narração é a pasta: sem ela, um jogo tocaria a voz do outro.
		const chaves = new Set(
			jogos.flatMap((jogo) =>
				falasDe(jogo).map((fala) => `${jogo.slug}/${fala.id}`),
			),
		);

		for (const chave of VOZES) {
			expect(
				chaves.has(chave),
				`${chave} não é uma fala de nenhum roteiro`,
			).toBe(true);
			expect(
				existsSync(`${RAIZ_DO_SITE}public/jogo/vo/${chave}.mp3`),
				`falta public/jogo/vo/${chave}.mp3`,
			).toBe(true);
		}
	});
});

describe.each(jogos.map((jogo) => [jogo.slug, jogo] as const))(
	"o roteiro de %s",
	(slug, jogo) => {
		const combinado = COMBINADO[slug as keyof typeof COMBINADO];
		const falas = falasDe(jogo);
		const decisoes = decisoesDe(jogo);

		it("tem as cenas na ordem e as casas do caminho", () => {
			expect(jogo.titulo).toBe(combinado.titulo);
			expect(jogo.cenas.map((cena) => cena.cena)).toEqual(
				Array.from({ length: combinado.cenas }, (_, i) => i + 1),
			);
			expect(jogo.casas).toHaveLength(combinado.casas);
		});

		it("tem as falas do roteiro, numeradas de 1 em diante em cada cena", () => {
			expect(falas).toHaveLength(combinado.falas);
			for (const cena of jogo.cenas) {
				const ids = cena.passos
					.filter((passo) => passo.tipo === "fala")
					.map((fala) => fala.id);
				const esperados = ids.map(
					(_, indice) => `c${cena.cena}-${String(indice + 1).padStart(2, "0")}`,
				);
				expect(ids).toEqual(esperados);
			}
		});

		it("pontua só as decisões de regra, e as de opinião ficam sem resposta certa", () => {
			const regras = decisoes.filter((decisao) => decisao.natureza === "regra");
			const opinioes = decisoes.filter(
				(decisao) => decisao.natureza === "opiniao",
			);

			expect(regras).toHaveLength(combinado.regras);
			expect(opinioes).toHaveLength(combinado.opinioes);
			for (const regra of regras) {
				expect(
					regra.opcoes.filter((opcao) => opcao.resultado === "certa"),
				).toHaveLength(1);
				expect(regra.fundamento).not.toBe("");
				expect(regra.resumo).not.toBe("");
			}
			for (const opiniao of opinioes) {
				expect(opiniao.desfecho.length).toBeGreaterThanOrEqual(1);
				expect(opiniao.opcoes.every((opcao) => !("resultado" in opcao))).toBe(
					true,
				);
			}
		});

		it("tem o desenho de cada expressão, cenário e item que o roteiro pede", () => {
			const faltando: string[] = [];
			const conferir = (caminho: string) => {
				if (!existsSync(caminho)) {
					faltando.push(caminho.replace(RAIZ_DO_SITE, ""));
				}
			};

			conferir(desenho("bg", jogo.cenario));
			for (const cena of jogo.cenas) {
				conferir(desenho("bg", cena.cenario));
			}
			for (const fala of falas) {
				if (fala.quem !== "narracao" && fala.expressao !== undefined) {
					conferir(desenho("personagens", `${fala.quem}-${fala.expressao}`));
				}
				if (fala.item !== undefined) {
					conferir(desenho("itens", fala.item));
				}
				// A fala que troca o cenário no meio da cena pede o desenho dela.
				if (fala.cenario !== undefined) {
					conferir(desenho("bg", fala.cenario));
				}
			}

			expect(faltando).toEqual([]);
		});

		it("apresenta no jogo.md todo personagem que fala nas cenas", () => {
			const apresentados = new Set(Object.keys(jogo.personagens));
			const falantes = new Set(
				falas.map((fala) => fala.quem).filter((quem) => quem !== "narracao"),
			);

			for (const quem of falantes) {
				expect(
					apresentados.has(quem),
					`${quem} fala e não está no jogo.md`,
				).toBe(true);
			}
		});

		it("leva uma fonte oficial em cada revelação e no epílogo", () => {
			const oficial = /^https:\/\/[^/]*(gov|leg|jus|mp|def)\.br\//;
			const todas = [
				...jogo.cenas.flatMap((cena) => cena.revelacao.fontes),
				...jogo.epilogo.fontes,
			];

			for (const cena of jogo.cenas) {
				expect(cena.revelacao.fontes.length).toBeGreaterThanOrEqual(1);
			}
			expect(todas.every((fonte) => oficial.test(fonte.url))).toBe(true);
		});

		it("aponta um artigo da trilha do processo legislativo em cada cena", () => {
			expect(artigosDaTrilha.size).toBeGreaterThan(0);
			for (const cena of jogo.cenas) {
				expect(artigosDaTrilha.has(cena.artigo)).toBe(true);
			}
		});

		it("declara as lições da trilha só onde ela ensina o que o jogo mostra", () => {
			expect(jogo.licoes ?? false).toBe(combinado.licoes);
		});

		it("cabe no teto da letra que a página do jogo mede", () => {
			// Os [--palavra:N] de routes/jogos/$jogo.tsx e de routes/jogos/index.tsx
			// valem para todos os jogos: o título novo precisa caber no teto que já
			// está lá, ou o teto é medido de novo (titulos.test.ts).
			expect(
				tetoDoTitulo(jogo.titulo, "titulo-condensado"),
			).toBeLessThanOrEqual(4.49);
		});

		it("marca a emoção de cada fala, para a narração gravada", () => {
			const semEmocao = falas.filter((fala) => !fala.emocao);

			expect(semEmocao.map((fala) => fala.id)).toEqual([]);
			// A direção de voz não se confunde com o retrato: a narração não tem
			// expressão, e mesmo assim tem emoção.
			const narracao = falas.filter((fala) => fala.quem === "narracao");
			expect(narracao.length).toBeGreaterThan(0);
			expect(narracao.every((fala) => Boolean(fala.emocao))).toBe(true);
		});
	},
);

describe("o roteiro do Jogo das Comissões", () => {
	const jogo = jogos.find((um) => um.slug === "comissoes");

	it("deixa a pendência do art. 105 escrita no roteiro", () => {
		const pendencias = [
			...(jogo?.pendencias ?? []),
			...(jogo?.cenas.flatMap((cena) => cena.pendencias) ?? []),
		];

		expect(pendencias.some((pendencia) => pendencia.includes("art. 105"))).toBe(
			true,
		);
	});
});
