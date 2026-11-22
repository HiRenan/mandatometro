import { idDaEdicao } from "@/lib/edicoes/pagina";

// O endereço da página de cada parlamentar: o id e o nome, sem acento
// (/parlamentares/81-agata-cedrolume). O id é que acha a pessoa; o nome é para
// quem lê o link. O endereço só com o id, ou com um nome que mudou, leva ao
// certo por um redirecionamento permanente (a rota, em routes/parlamentares/$id.tsx).

/**
 * O id de uma votação no endereço (/votacoes/139): um inteiro positivo, sem zero
 * à esquerda, até o maior que o banco guarda. A regra é a do id da edição.
 */
export const idDaVotacao = idDaEdicao;

/**
 * O nome no endereço: sem acento, em minúsculas, com hífen no lugar do espaço.
 * O apóstrofo some sem deixar hífen ("Dell'Ombre" vira "dellombre").
 */
export function nomeNoEndereco(nome: string): string {
	return nome
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/['\u2019]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

/** O fim do endereço da página de um parlamentar: "81-agata-cedrolume". */
export function enderecoDoParlamentar(parlamentar: {
	id: number;
	nome: string;
}): string {
	const nome = nomeNoEndereco(parlamentar.nome);
	return nome ? `${parlamentar.id}-${nome}` : String(parlamentar.id);
}

/**
 * O id da pessoa no fim do endereço, com ou sem o nome: "81", "81-agata-cedrolume"
 * e "81-nome-antigo" dão 81. O que não começa por um id válido (como "081", "0" ou
 * "abc") não é parlamentar nenhum.
 */
export function idDoParlamentar(valor: unknown): number | null {
	if (typeof valor !== "string") {
		return null;
	}
	const partes = /^([^-]+)(?:-.*)?$/s.exec(valor);
	return partes ? idDaEdicao(partes[1]) : null;
}
