/**
 * Junta os nomes de classe de um elemento, sem os vazios: `classes("az", cru &&
 * "cru")` dá "az cru" ou "az". Com os nomes separados, a ordenação das classes do
 * Biome não mexe nos espaços de dentro de um texto montado.
 */
export function classes(
	...nomes: Array<string | false | null | undefined>
): string {
	return nomes.filter(Boolean).join(" ");
}
