import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { lerJogos, TRILHA_DO_JOGO } from "../jogo/ler.ts";
import { TRILHA_DA_INICIAL, trilhaDaInicial } from "./inicial.ts";
import { ErroDeConteudo, lerTrilhas } from "./ler.ts";

// O servidor lê o conteúdo das trilhas e o roteiro do jogo ao subir
// (paginas.server.ts). O build confere os mesmos arquivos antes, com a mesma
// leitura: um artigo mal formado, a falta da trilha da página inicial ou um
// roteiro quebrado para o `pnpm build`, o deploy da Vercel e a imagem do
// Docker, com o arquivo e o problema, e o site no ar continua na versão
// anterior.

/**
 * Lê do disco os arquivos que um `import.meta.glob` de `conteudo/<assunto>/`
 * junta no build: os `.md` de dentro de cada pasta, com a mesma chave e na
 * mesma ordem. Como o glob, pula os nomes que começam com ponto.
 */
function lerArquivosDe(raiz: string, assunto: string): Record<string, string> {
	const pasta = join(raiz, "conteudo", assunto);
	if (!existsSync(pasta)) {
		return {};
	}
	const caminhos: string[] = [];
	for (const dentroDa of readdirSync(pasta)) {
		const dentro = join(pasta, dentroDa);
		if (dentroDa.startsWith(".") || !statSync(dentro).isDirectory()) {
			continue;
		}
		for (const arquivo of readdirSync(dentro)) {
			if (
				!arquivo.startsWith(".") &&
				arquivo.endsWith(".md") &&
				statSync(join(dentro, arquivo)).isFile()
			) {
				caminhos.push(`${dentroDa}/${arquivo}`);
			}
		}
	}
	return Object.fromEntries(
		caminhos
			.sort()
			.map((caminho) => [
				`/conteudo/${assunto}/${caminho}`,
				readFileSync(join(pasta, caminho), "utf8"),
			]),
	);
}

/** Os arquivos das trilhas, como o glob de paginas.server.ts os junta. */
export function lerArquivosDasTrilhas(raiz: string): Record<string, string> {
	return lerArquivosDe(raiz, "trilhas");
}

/** Os arquivos do roteiro, como o glob de jogo/paginas.server.ts os junta. */
export function lerArquivosDoJogo(raiz: string): Record<string, string> {
	return lerArquivosDe(raiz, "jogo");
}

/**
 * O plugin do Vite que confere o conteúdo no começo do build e para o build com
 * o ErroDeConteudo ou o ErroDeRoteiro, que listam cada arquivo e o problema: os
 * de lerTrilhas, a falta da pasta da trilha da página inicial e os de lerJogos.
 * No `pnpm dev` ele não roda: lá, a página e o teste avisam.
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
			const trilhas = lerTrilhas(lerArquivosDasTrilhas(raiz));
			if (!trilhaDaInicial(trilhas)) {
				throw new ErroDeConteudo([
					`conteudo/trilhas/${TRILHA_DA_INICIAL}: falta a trilha da página inicial, e sem ela a página inicial não abre`,
				]);
			}
			// O roteiro do jogo aponta artigos da trilha do processo legislativo:
			// a conferência vem depois das trilhas, com os nomes que elas têm.
			lerJogos(
				lerArquivosDoJogo(raiz),
				new Set(
					trilhas
						.filter((trilha) => trilha.slug === TRILHA_DO_JOGO)
						.flatMap((trilha) => trilha.artigos.map((artigo) => artigo.slug)),
				),
			);
		},
	} satisfies Plugin;
}
