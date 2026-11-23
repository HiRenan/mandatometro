import { classeDaFita } from "@/lib/formatar";

// Os 27 estados, com o nome, a preposição e a região do IBGE. A ordem é a do
// mapa da lista dos parlamentares (/parlamentares): as regiões na ordem do IBGE
// e, dentro de cada uma, os estados em ordem alfabética do nome. O HTML segue
// essa ordem: o Tab anda pelo mapa uma região de cada vez.

/** As cinco regiões, na ordem do IBGE. */
export const REGIOES = [
	"Norte",
	"Nordeste",
	"Sudeste",
	"Sul",
	"Centro-Oeste",
] as const;

export type Regiao = (typeof REGIOES)[number];

export type Estado = {
	sigla: string;
	nome: string;
	/** "de Santa Catarina", "da Bahia", "do Acre". */
	comPreposicao: string;
	regiao: Regiao;
};

const estado = (
	sigla: string,
	nome: string,
	preposicao: "de" | "da" | "do",
	regiao: Regiao,
): Estado => ({ sigla, nome, comPreposicao: `${preposicao} ${nome}`, regiao });

/** Os estados na ordem do mapa: região por região, e o nome em ordem alfabética. */
export const ESTADOS: readonly Estado[] = [
	estado("AC", "Acre", "do", "Norte"),
	estado("AP", "Amapá", "do", "Norte"),
	estado("AM", "Amazonas", "do", "Norte"),
	estado("PA", "Pará", "do", "Norte"),
	estado("RO", "Rondônia", "de", "Norte"),
	estado("RR", "Roraima", "de", "Norte"),
	estado("TO", "Tocantins", "do", "Norte"),
	estado("AL", "Alagoas", "de", "Nordeste"),
	estado("BA", "Bahia", "da", "Nordeste"),
	estado("CE", "Ceará", "do", "Nordeste"),
	estado("MA", "Maranhão", "do", "Nordeste"),
	estado("PB", "Paraíba", "da", "Nordeste"),
	estado("PE", "Pernambuco", "de", "Nordeste"),
	estado("PI", "Piauí", "do", "Nordeste"),
	estado("RN", "Rio Grande do Norte", "do", "Nordeste"),
	estado("SE", "Sergipe", "de", "Nordeste"),
	estado("ES", "Espírito Santo", "do", "Sudeste"),
	estado("MG", "Minas Gerais", "de", "Sudeste"),
	estado("RJ", "Rio de Janeiro", "do", "Sudeste"),
	estado("SP", "São Paulo", "de", "Sudeste"),
	estado("PR", "Paraná", "do", "Sul"),
	estado("RS", "Rio Grande do Sul", "do", "Sul"),
	estado("SC", "Santa Catarina", "de", "Sul"),
	estado("DF", "Distrito Federal", "do", "Centro-Oeste"),
	estado("GO", "Goiás", "de", "Centro-Oeste"),
	estado("MT", "Mato Grosso", "de", "Centro-Oeste"),
	estado("MS", "Mato Grosso do Sul", "de", "Centro-Oeste"),
];

/**
 * A fita de uma região, nos mapas: a da posição dela na ordem do IBGE (Norte
 * verde, Nordeste amarela, Sudeste azul, Sul rosa e Centro-Oeste vermelha). O
 * Renan escolheu em 22/11/2026, na #289: "Pela ordem do IBGE".
 */
export function classeDaRegiao(regiao: Regiao): string {
	return classeDaFita(REGIOES.indexOf(regiao) + 1);
}

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
