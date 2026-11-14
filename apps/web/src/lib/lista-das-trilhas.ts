import type { CSSProperties } from "react";

/**
 * O máximo de colunas das folhas dos artigos, na lista das trilhas: até 2 a partir de
 * 1024 px, até 3 a partir de 1280 px e até 4 a partir de 1600 px (index.css).
 */
export const MAXIMOS_DE_COLUNAS = [2, 3, 4] as const;

/**
 * Quantas linhas a lista de `artigos` folhas tem com até `maximo` colunas. As folhas
 * descem uma coluna e passam para a próxima (1 a 4 | 5 a 8), e as colunas terminam
 * juntas sempre que dá:
 * - o maior número de colunas que divide os artigos (8 em 4 colunas de 2; 6 em 3 de 2);
 * - sem divisor, o maior em que a última coluna fica no máximo uma linha mais curta
 *   (3 artigos em até 2 colunas: 2 e 1; 7 em até 3: 4 e 3).
 */
export function linhasDaLista(artigos: number, maximo: number): number {
	if (artigos <= maximo) {
		return 1;
	}
	for (let colunas = maximo; colunas >= 2; colunas--) {
		if (artigos % colunas === 0) {
			return artigos / colunas;
		}
	}
	for (let colunas = maximo; colunas >= 2; colunas--) {
		const linhas = Math.ceil(artigos / colunas);
		const naUltima = artigos - (Math.ceil(artigos / linhas) - 1) * linhas;
		if (linhas - naUltima <= 1) {
			return linhas;
		}
	}
	// Com uma coluna só, um artigo por linha. Com 2 colunas ou mais, a conta de cima
	// sempre acha as linhas (com 2, a última fica no máximo uma linha mais curta).
	return artigos;
}

/**
 * As linhas da lista em cada largura, nas variáveis que o index.css lê: o
 * `--linhas-2`, o `--linhas-3` e o `--linhas-4`. Elas vêm só do número de artigos, e
 * saem iguais no HTML do servidor e no navegador.
 */
export function variaveisDaLista(artigos: number): CSSProperties {
	return Object.fromEntries(
		MAXIMOS_DE_COLUNAS.map((maximo) => [
			`--linhas-${maximo}`,
			linhasDaLista(artigos, maximo),
		]),
	) as CSSProperties;
}
