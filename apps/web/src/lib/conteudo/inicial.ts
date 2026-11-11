import type { Trilha } from "./ler";

// A trilha da página inicial, pelo nome da pasta: a abertura e o caminho da
// página falam dela. A ordem de /trilhas não muda a página inicial. Sem essa
// pasta, a página inicial não abre, e o build para (conferir.ts).
export const TRILHA_DA_INICIAL = "processo-legislativo";

/** A trilha que a página inicial mostra, quando o conteúdo tem a pasta dela. */
export function trilhaDaInicial(todas: Trilha[]): Trilha | undefined {
	return todas.find((trilha) => trilha.slug === TRILHA_DA_INICIAL);
}
