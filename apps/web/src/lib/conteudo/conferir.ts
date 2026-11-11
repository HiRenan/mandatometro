import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { lerTrilhas } from "./ler";

// O servidor lê o conteúdo das trilhas ao subir (paginas.server.ts). O build
// confere os mesmos arquivos antes, com a mesma leitura: um artigo mal formado
// para o `pnpm build`, o deploy da Vercel e a imagem do Docker, com o arquivo e
// o problema, e o site no ar continua na versão anterior.

/**
 * Lê do disco os arquivos que o `import.meta.glob` de paginas.server.ts junta
 * no build: os `.md` de dentro de cada pasta de `conteudo/trilhas/`, com a
 * mesma chave e na mesma ordem. Como o glob, pula os nomes que começam com ponto.
 */
export function lerArquivosDasTrilhas(raiz: string): Record<string, string> {
	const pasta = join(raiz, "conteudo", "trilhas");
	if (!existsSync(pasta)) {
		return {};
	}
	const caminhos: string[] = [];
	for (const trilha of readdirSync(pasta)) {
		const dentro = join(pasta, trilha);
		if (trilha.startsWith(".") || !statSync(dentro).isDirectory()) {
			continue;
		}
		for (const arquivo of readdirSync(dentro)) {
			if (
				!arquivo.startsWith(".") &&
				arquivo.endsWith(".md") &&
				statSync(join(dentro, arquivo)).isFile()
			) {
				caminhos.push(`${trilha}/${arquivo}`);
			}
		}
	}
	return Object.fromEntries(
		caminhos
			.sort()
			.map((caminho) => [
				`/conteudo/trilhas/${caminho}`,
				readFileSync(join(pasta, caminho), "utf8"),
			]),
	);
}

/**
 * O plugin do Vite que confere o conteúdo no começo do build e para o build com
 * o ErroDeConteudo de lerTrilhas, que lista cada arquivo e o problema. No
 * `pnpm dev` ele não roda: lá, a página e o teste avisam.
 */
export function conferirConteudo() {
	let raiz = process.cwd();
	return {
		name: "mandatometro:conferir-conteudo",
		apply: "build",
		configResolved(config: { root: string }) {
			raiz = config.root;
		},
		buildStart() {
			lerTrilhas(lerArquivosDasTrilhas(raiz));
		},
	} satisfies Plugin;
}
