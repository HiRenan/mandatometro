import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { conferirConteudo, lerArquivosDasTrilhas } from "./conferir";

// A pasta do site (apps/web), onde fica a pasta conteudo/.
const RAIZ_DO_SITE = fileURLToPath(new URL("../../..", import.meta.url));

const TRILHA = `---
titulo: Uma trilha
descricao: A trilha do teste.
ordem: 1
---
`;

const ARTIGO = `---
titulo: Um artigo
resumo: Um artigo do teste.
ordem: 1
fontes:
  - titulo: Constituição Federal, art. 61
    url: https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art61
    consultadoEm: 2026-11-11
---

Um texto curto.
`;

const ARTIGO_SEM_TITULO = `---
resumo: Um artigo sem o título.
ordem: 1
fontes:
  - titulo: Constituição Federal, art. 61
    url: https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art61
    consultadoEm: 2026-11-11
---

Um texto curto.
`;

const pastasTemporarias: string[] = [];

afterEach(() => {
	for (const pasta of pastasTemporarias.splice(0)) {
		rmSync(pasta, { recursive: true, force: true });
	}
});

/** Uma pasta temporária com estes arquivos, cada um pelo caminho, com barras. */
function pastaCom(arquivos: Record<string, string>): string {
	const raiz = mkdtempSync(join(tmpdir(), "mandatometro-conteudo-"));
	pastasTemporarias.push(raiz);
	for (const [caminho, texto] of Object.entries(arquivos)) {
		const destino = join(raiz, ...caminho.split("/"));
		mkdirSync(dirname(destino), { recursive: true });
		writeFileSync(destino, texto);
	}
	return raiz;
}

describe("lerArquivosDasTrilhas", () => {
	it("lê do disco os mesmos arquivos que o site junta no build, na mesma ordem", () => {
		const doSite = import.meta.glob<string>("/conteudo/trilhas/*/*.md", {
			query: "?raw",
			import: "default",
			eager: true,
		});

		const lidos = lerArquivosDasTrilhas(RAIZ_DO_SITE);

		expect(Object.keys(lidos)).toEqual(Object.keys(doSite));
		expect(lidos).toEqual(doSite);
	});

	it("só lê os .md de dentro de cada pasta de trilha, como o site", () => {
		const raiz = pastaCom({
			"conteudo/trilhas/uma-trilha/trilha.md": "a trilha",
			"conteudo/trilhas/uma-trilha/um-artigo.md": "um artigo",
			"conteudo/trilhas/uma-trilha/notas.txt": "não é Markdown",
			"conteudo/trilhas/uma-trilha/.rascunho.md": "começa com ponto",
			"conteudo/trilhas/uma-trilha/imagens/legenda.md": "fundo demais",
			"conteudo/trilhas/solto.md": "fora de uma trilha",
			"conteudo/LEIA.md": "fora das trilhas",
		});

		expect(lerArquivosDasTrilhas(raiz)).toEqual({
			"/conteudo/trilhas/uma-trilha/trilha.md": "a trilha",
			"/conteudo/trilhas/uma-trilha/um-artigo.md": "um artigo",
		});
	});
});

describe("conferirConteudo", () => {
	it("só roda no build, e não no pnpm dev", () => {
		expect(conferirConteudo().apply).toBe("build");
	});

	it("deixa o build seguir com o conteúdo do site", () => {
		const plugin = conferirConteudo();
		plugin.configResolved({ root: RAIZ_DO_SITE });

		expect(() => plugin.buildStart()).not.toThrow();
	});

	it("para o build com o nome do arquivo e o problema", () => {
		const plugin = conferirConteudo();
		plugin.configResolved({
			root: pastaCom({
				"conteudo/trilhas/uma-trilha/trilha.md": TRILHA,
				"conteudo/trilhas/uma-trilha/sem-titulo.md": ARTIGO_SEM_TITULO,
			}),
		});

		expect(() => plugin.buildStart()).toThrow(
			'conteudo/trilhas/uma-trilha/sem-titulo.md: campo "titulo": falta este campo',
		);
	});

	it("para o build quando falta a pasta da trilha da página inicial", () => {
		const plugin = conferirConteudo();
		plugin.configResolved({
			root: pastaCom({
				"conteudo/trilhas/processo-legislativo-x/trilha.md": TRILHA,
				"conteudo/trilhas/processo-legislativo-x/um-artigo.md": ARTIGO,
			}),
		});

		expect(() => plugin.buildStart()).toThrow(
			"conteudo/trilhas/processo-legislativo: falta a trilha da página inicial",
		);
	});
});
