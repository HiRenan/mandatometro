// O que vem no endereço das páginas das edições: a página da lista (?pagina=2) e
// o id da edição (/edicoes/7). O roteador e as funções do servidor conferem com
// estas mesmas regras, e o que não passa não chega à API.

/** Quantas edições cabem numa página da lista. */
export const POR_PAGINA = 20;

/** O maior id que o banco guarda (o integer do PostgreSQL). */
const MAIOR_ID = 2_147_483_647;

/**
 * A página da lista no endereço: um inteiro de 2 em diante, em número ou em
 * texto. A primeira página e o valor inválido ficam sem número, e a lista abre
 * na primeira, como no endereço sem ?pagina.
 */
export function paginaDaBusca(valor: unknown): number | undefined {
	const numero =
		typeof valor === "number"
			? valor
			: typeof valor === "string" && /^\d+$/.test(valor)
				? Number(valor)
				: Number.NaN;
	return Number.isSafeInteger(numero) && numero > 1 ? numero : undefined;
}

/**
 * O id da edição no endereço: um inteiro positivo, sem zero à esquerda nem
 * espaço, até o maior que o banco guarda. Outro valor não é edição nenhuma.
 */
export function idDaEdicao(valor: unknown): number | null {
	const texto = typeof valor === "number" ? String(valor) : valor;
	if (typeof texto !== "string" || !/^[1-9]\d{0,9}$/.test(texto)) {
		return null;
	}
	const id = Number(texto);
	return id <= MAIOR_ID ? id : null;
}
