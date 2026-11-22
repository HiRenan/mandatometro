// Os 27 estados, com o nome, a preposição e o lugar no mapa da lista dos
// parlamentares (/parlamentares). O mapa é uma grade de 6 colunas e 8 fileiras,
// um azulejo por estado, na posição aproximada dele no Brasil: o Norte em cima
// à esquerda, o Nordeste em cima à direita e o Sul embaixo. A ordem da lista é
// a das fileiras do desenho, da esquerda para a direita, e o HTML segue essa
// ordem: o Tab anda pelo mapa como o olho.

export type Estado = {
	sigla: string;
	nome: string;
	/** "de Santa Catarina", "da Bahia", "do Acre". */
	comPreposicao: string;
	/** A fileira e a coluna do azulejo no mapa, a partir de 1. */
	fileira: number;
	coluna: number;
};

const estado = (
	sigla: string,
	nome: string,
	preposicao: "de" | "da" | "do",
	fileira: number,
	coluna: number,
): Estado => ({
	sigla,
	nome,
	comPreposicao: `${preposicao} ${nome}`,
	fileira,
	coluna,
});

/** Os estados na ordem do mapa: fileira por fileira, da esquerda para a direita. */
export const ESTADOS: readonly Estado[] = [
	estado("RR", "Roraima", "de", 1, 1),
	estado("AP", "Amapá", "do", 1, 2),
	estado("AM", "Amazonas", "do", 2, 1),
	estado("PA", "Pará", "do", 2, 2),
	estado("MA", "Maranhão", "do", 2, 3),
	estado("PI", "Piauí", "do", 2, 4),
	estado("CE", "Ceará", "do", 2, 5),
	estado("RN", "Rio Grande do Norte", "do", 2, 6),
	estado("AC", "Acre", "do", 3, 1),
	estado("RO", "Rondônia", "de", 3, 2),
	estado("TO", "Tocantins", "do", 3, 3),
	estado("BA", "Bahia", "da", 3, 4),
	estado("PE", "Pernambuco", "de", 3, 5),
	estado("PB", "Paraíba", "da", 3, 6),
	estado("MT", "Mato Grosso", "de", 4, 2),
	estado("GO", "Goiás", "de", 4, 3),
	estado("MG", "Minas Gerais", "de", 4, 4),
	estado("SE", "Sergipe", "de", 4, 5),
	estado("AL", "Alagoas", "de", 4, 6),
	estado("MS", "Mato Grosso do Sul", "de", 5, 2),
	estado("DF", "Distrito Federal", "do", 5, 3),
	estado("SP", "São Paulo", "de", 5, 4),
	estado("RJ", "Rio de Janeiro", "do", 5, 5),
	estado("ES", "Espírito Santo", "do", 5, 6),
	estado("PR", "Paraná", "do", 6, 2),
	estado("SC", "Santa Catarina", "de", 7, 2),
	estado("RS", "Rio Grande do Sul", "do", 8, 2),
];

const POR_SIGLA = new Map(ESTADOS.map((item) => [item.sigla, item]));

/** Os estados em ordem alfabética do nome, para a lista e o campo "Estado". */
export const ESTADOS_PELO_NOME: readonly Estado[] = [...ESTADOS].sort((a, b) =>
	a.nome.localeCompare(b.nome, "pt-BR"),
);

/** O estado de uma sigla, em maiúsculas. Outra sigla não é estado nenhum. */
export function estadoDaSigla(sigla: unknown): Estado | null {
	return typeof sigla === "string" ? (POR_SIGLA.get(sigla) ?? null) : null;
}

/**
 * A sigla do estado no endereço (?uf=SC). Aceita a sigla em minúsculas, que um
 * link escrito à mão pode trazer; outro valor fica sem estado, e a lista abre o
 * mapa, como no endereço sem ?uf.
 */
export function ufDaBusca(valor: unknown): string | undefined {
	return typeof valor === "string"
		? estadoDaSigla(valor.toUpperCase())?.sigla
		: undefined;
}
