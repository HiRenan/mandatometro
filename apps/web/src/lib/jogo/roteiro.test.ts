import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	lerArquivosDasTrilhas,
	lerArquivosDoJogo,
} from "../conteudo/conferir.ts";
import { lerTrilhas } from "../conteudo/ler.ts";
import { tetoDoTitulo } from "../conteudo/regua.ts";
import { lerJogos } from "./ler.ts";
import { TRILHA_DO_JOGO } from "./trilha.ts";

// O roteiro de verdade, lido da pasta de conteúdo. O teste prende o que o
// roteiro combinou (docs/jogo-das-comissoes.md): as 46 falas, as seis decisões
// de regra e as quatro de opinião, e o desenho de cada expressão, cenário e
// item que uma fala pede. O build confere o formato (lib/conteudo/conferir.ts);
// aqui ficam as contas e os arquivos.

const RAIZ_DO_SITE = new URL("../../../", import.meta.url).pathname.replace(
	/^\/([A-Za-z]:)/,
	"$1",
);

const FALAS_DO_ROTEIRO = 46;
const DECISOES_DE_REGRA = 6;
const DECISOES_DE_OPINIAO = 4;

const trilhas = lerTrilhas(lerArquivosDasTrilhas(RAIZ_DO_SITE));
const artigosDaTrilha = new Set(
	trilhas
		.filter((trilha) => trilha.slug === TRILHA_DO_JOGO)
		.flatMap((trilha) => trilha.artigos.map((artigo) => artigo.slug)),
);
const jogos = lerJogos(lerArquivosDoJogo(RAIZ_DO_SITE), artigosDaTrilha);

const [jogo] = jogos;
const passos = jogo.cenas.flatMap((cena) => cena.passos);
const falas = passos.filter((passo) => passo.tipo === "fala");
const decisoes = passos.filter((passo) => passo.tipo === "decisao");

function desenho(pasta: string, arquivo: string): string {
	return `${RAIZ_DO_SITE}public/jogo/${pasta}/${arquivo}.webp`;
}

describe("o roteiro do Jogo das Comissões", () => {
	it("tem um jogo só, com as cinco cenas na ordem", () => {
		expect(jogos).toHaveLength(1);
		expect(jogo.slug).toBe("comissoes");
		expect(jogo.cenas.map((cena) => cena.cena)).toEqual([1, 2, 3, 4, 5]);
		expect(jogo.casas).toHaveLength(5);
	});

	it("tem as 46 falas do roteiro, numeradas de 1 em diante em cada cena", () => {
		expect(falas).toHaveLength(FALAS_DO_ROTEIRO);
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

	it("pontua só as seis decisões de regra, e as quatro de opinião ficam sem resposta certa", () => {
		const regras = decisoes.filter((decisao) => decisao.natureza === "regra");
		const opinioes = decisoes.filter(
			(decisao) => decisao.natureza === "opiniao",
		);

		expect(regras).toHaveLength(DECISOES_DE_REGRA);
		expect(opinioes).toHaveLength(DECISOES_DE_OPINIAO);
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
		}

		expect(faltando).toEqual([]);
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

	it("tem o título que a página mede no teto da letra", () => {
		// O [--palavra:N] de routes/jogos.tsx foi medido para este título, e o
		// titulos.test.ts confere a conta. Mudou o título: meça de novo.
		expect(jogo.titulo).toBe("Jogo das Comissões");
		expect(tetoDoTitulo(jogo.titulo, "titulo-condensado")).toBe(4.49);
	});

	it("deixa a pendência do art. 105 escrita no roteiro", () => {
		const pendencias = [
			...jogo.pendencias,
			...jogo.cenas.flatMap((cena) => cena.pendencias),
		];

		expect(pendencias.some((pendencia) => pendencia.includes("art. 105"))).toBe(
			true,
		);
	});
});
