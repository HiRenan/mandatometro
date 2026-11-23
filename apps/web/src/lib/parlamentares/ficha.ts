import type { EleicaoPatrimonio, MandatoPublico } from "@/client";
import { enderecoSeguro } from "@/lib/edicoes/conteudo-da-edicao";
import { dataEmBrasilia, formatarData } from "@/lib/formatar";
import { estadoDaSigla } from "./estados";
import type { BiografiaParlamentar } from "./parlamentares.server";
import {
	fonteDaEleicao,
	type LinhaDoPatrimonio,
	reaisArredondados,
	resultadoCurto,
} from "./patrimonio";
import { NOME_DA_CASA } from "./votos";

// A ficha do cartaz do parlamentar (o Renan, em 23/11/2026: "A · Ficha em
// quadro"): o partido, a profissão e a escolaridade que a Casa publica, os
// mandatos, os votos registrados, o último patrimônio declarado e as eleições
// desde 2006. As contas são da API: aqui, só se escolhe e se escreve o que ela
// manda.

type Casa = keyof typeof NOME_DA_CASA;

/** As profissões como se fala: "Professora, Advogada e Agricultora". */
export function textoDasProfissoes(profissoes: readonly string[]): string {
	if (profissoes.length < 2) {
		return profissoes.join("");
	}
	return `${profissoes.slice(0, -1).join(", ")} e ${profissoes.at(-1)}`;
}

/** O artigo de cada Casa, para a frase do que ela não publica. */
const DA_CASA: Record<Casa, string> = {
	camara: "A Câmara dos Deputados",
	senado: "O Senado Federal",
};

/**
 * O que a Casa não publica, em palavras: a linha da ficha diz isso, em vez de
 * ficar vazia. Só vale quando a biografia foi coletada.
 */
export function naoPublica(
	casa: Casa,
	oque: "a profissão" | "a escolaridade",
): string {
	return `${DA_CASA[casa]} não publica ${oque}.`;
}

/** Uma eleição na faixa da ficha: o ano, o cargo, o lugar e o resultado curto. */
export type EleicaoDaFicha = {
	chave: string;
	ano: number;
	cargo: string;
	/** O estado ou o Brasil, só quando não é o estado da pessoa; senão, nada. */
	lugar: string | null;
	resultado: string | null;
};

/**
 * As eleições da ficha, na ordem da API (da mais antiga para a mais nova). O
 * lugar só aparece quando a eleição foi em outro estado ou no Brasil inteiro: o
 * estado da pessoa já está na faixa do cartaz.
 */
export function eleicoesDaFicha(
	eleicoes: readonly EleicaoPatrimonio[],
	uf: string | null,
): EleicaoDaFicha[] {
	return eleicoes.map((eleicao) => {
		const nome =
			eleicao.uf === "BR"
				? "Brasil"
				: (estadoDaSigla(eleicao.uf)?.nome ?? eleicao.uf);
		return {
			chave: `${eleicao.ano}-${eleicao.cargo.nome}-${nome}`,
			ano: eleicao.ano,
			cargo: eleicao.cargo.nome,
			lugar: eleicao.uf === uf ? null : nome,
			resultado: resultadoCurto(eleicao.resultado, eleicao.cargo.codigo),
		};
	});
}

/** O último patrimônio declarado: o ano, o total arredondado e o arquivo do TSE. */
export type UltimoPatrimonio = {
	ano: number;
	valor: string;
	fonte: LinhaDoPatrimonio["fonte"];
};

/**
 * O total declarado na eleição mais nova que tem total, arredondado como o
 * destaque do patrimônio. É o valor declarado, e não o de hoje (o Renan, em
 * 23/11/2026). Sem eleição com total, nada.
 */
export function ultimoPatrimonio(
	eleicoes: readonly EleicaoPatrimonio[],
): UltimoPatrimonio | null {
	const comTotal = eleicoes.filter(
		(eleicao) => eleicao.total_centavos !== null,
	);
	const ultima = comTotal.at(-1);
	if (!ultima || ultima.total_centavos === null) {
		return null;
	}
	return {
		ano: ultima.ano,
		valor: reaisArredondados(ultima.total_centavos),
		fonte: fonteDaEleicao(ultima.fonte),
	};
}

/**
 * As partes de um mandato, para a faixa: "57ª legislatura", o estado só quando
 * não é o da pessoa, a condição em minúsculas e "em exercício". A página não
 * calcula anos.
 */
export function partesDoMandato(
	mandato: MandatoPublico,
	uf: string | null,
): string[] {
	return [
		`${mandato.legislatura}ª legislatura`,
		...(mandato.uf === uf
			? []
			: [estadoDaSigla(mandato.uf)?.nome ?? mandato.uf]),
		...(mandato.condicao ? [mandato.condicao.toLocaleLowerCase("pt-BR")] : []),
		...(mandato.em_exercicio ? ["em exercício"] : []),
	];
}

/** A fonte da profissão e da escolaridade: a Casa, o link oficial e o dia. */
export type FonteDaBiografia = {
	casa: string;
	/** A página oficial, só num site oficial: fora dele, a Casa fica sem link. */
	endereco: string | null;
	/** O dia da coleta, em Brasília, por extenso. */
	coletada: string;
};

export function fonteDaBiografia(
	fonte: BiografiaParlamentar["fonte"],
	casa: Casa,
): FonteDaBiografia {
	return {
		casa: NOME_DA_CASA[casa],
		endereco: enderecoSeguro(fonte.url),
		coletada: formatarData(dataEmBrasilia(fonte.coletado_em)),
	};
}
