import type {
	CorrecaoIpca,
	EleicaoPatrimonio,
	FontePatrimonio,
} from "@/client";
import { enderecoSeguro } from "@/lib/edicoes/conteudo-da-edicao";
import { dataEmBrasilia, formatarData } from "@/lib/formatar";
import { estadoDaSigla } from "./estados";

// Os números do patrimônio declarado ao TSE, prontos para a página do
// parlamentar. As contas vêm da API (o total de cada eleição e o total corrigido
// pelo IPCA): aqui só se escrevem os números e se mede a barra de cada eleição.
// Tudo à mão, e não com o Intl, para o servidor e o navegador escreverem igual na
// hidratação, como o formatarData.

/** O espaço que não quebra: o "R$" não fica sozinho no fim da linha. */
const SEM_QUEBRA = "\u00a0";

/** O inteiro com o ponto do milhar: 812400 vira "812.400". */
function comMilhares(inteiro: number): string {
	return String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * O valor exato, com os centavos: 81240000 centavos viram "R$ 812.400,00". A
 * conta fica nos inteiros e não perde centavo até o maior inteiro exato do
 * JavaScript.
 */
export function reaisExatos(centavos: number): string {
	const resto = centavos % 100;
	const reais = (centavos - resto) / 100;
	return `R$${SEM_QUEBRA}${comMilhares(reais)},${String(resto).padStart(2, "0")}`;
}

/** As unidades do número grande, com o tamanho de cada uma em centavos. */
const UNIDADES = [
	{ centavos: 100_000, singular: "mil", plural: "mil" },
	{ centavos: 100_000_000, singular: "milhão", plural: "milhões" },
	{ centavos: 100_000_000_000, singular: "bilhão", plural: "bilhões" },
] as const;

type Unidade = (typeof UNIDADES)[number];

/**
 * O valor em décimos da unidade, arredondado: R$ 45.300 são 453 décimos de mil.
 * Do "100 mil" para cima, o mil fica sem a casa decimal ("352 mil", e não "352,1
 * mil"), e o número continua contado em décimos.
 */
function decimosDaUnidade(centavos: number, unidade: Unidade): number {
	const decimos = Math.round(centavos / (unidade.centavos / 10));
	return unidade === UNIDADES[0] && decimos >= 1000
		? Math.round(centavos / unidade.centavos) * 10
		: decimos;
}

/**
 * O valor arredondado do número grande: "R$ 850" abaixo de mil, "R$ 45,3 mil",
 * "R$ 352 mil", "R$ 1,9 milhão", "R$ 2 milhões" e "R$ 1,2 bilhão". Até 1,9, a
 * unidade fica no singular. O valor exato fica na linha do declarado.
 */
export function reaisArredondados(centavos: number): string {
	const reais = Math.round(centavos / 100);
	if (reais < 1000) {
		return `R$${SEM_QUEBRA}${reais}`;
	}
	let posicao = 0;
	let decimos = decimosDaUnidade(centavos, UNIDADES[posicao]);
	// Com 10 mil décimos ou mais ("1.000 mil"), o número sobe de unidade, menos
	// na última: o bilhão aceita "90.072 bilhões".
	while (decimos >= 10_000 && posicao < UNIDADES.length - 1) {
		posicao += 1;
		decimos = decimosDaUnidade(centavos, UNIDADES[posicao]);
	}
	const unidade = UNIDADES[posicao];
	const decimo = decimos % 10;
	const inteiro = comMilhares((decimos - decimo) / 10);
	const numero = decimo === 0 ? inteiro : `${inteiro},${decimo}`;
	const nome = decimos < 20 ? unidade.singular : unidade.plural;
	return `R$${SEM_QUEBRA}${numero} ${nome}`;
}

/**
 * O valor de uma eleição na linha dela:
 * - sem-total: os dados do TSE da eleição não trazem o total;
 * - corrigido: o total em reais de hoje no destaque, o declarado exato embaixo e
 *   a barra, a parte do maior valor de hoje da pessoa (de 0,0001 a 1), ou nada;
 * - sem-correcao: sem a correção pela inflação, o declarado vai arredondado no
 *   destaque e exato embaixo, sem barra.
 */
export type ValorDaEleicao =
	| { tipo: "sem-total" }
	| {
			tipo: "corrigido";
			destaque: string;
			declarado: string;
			barra: number | null;
	  }
	| { tipo: "sem-correcao"; destaque: string; declarado: string };

export type LinhaDoPatrimonio = {
	ano: number;
	/** O cargo disputado naquela eleição, com o nome do TSE. */
	cargo: string;
	/** O estado por extenso ou, na eleição para presidente, o Brasil. */
	lugar: string;
	valor: ValorDaEleicao;
	fonte: {
		/** O arquivo do TSE, só num site oficial: fora dele, a linha fica sem link. */
		endereco: string | null;
		/** O link leva a um arquivo ZIP, e o texto dele avisa. */
		zip: boolean;
		/** O dia da coleta, por extenso. */
		coletado: string;
	};
};

/**
 * As eleições prontas para a página, na ordem da API (da mais antiga para a mais
 * nova). A barra de cada eleição é a parte do maior valor de hoje da pessoa, com
 * quatro casas e pelo menos 0,0001, para um valor acima de zero não sumir. Só há
 * barras com dois valores de hoje ou mais: com um só, não há com o que comparar.
 * O zero e o valor que falta ficam sem barra.
 */
export function linhasDoPatrimonio(
	eleicoes: EleicaoPatrimonio[],
	correcao: CorrecaoIpca | null,
): LinhaDoPatrimonio[] {
	const deHoje = (eleicao: EleicaoPatrimonio) =>
		correcao !== null && eleicao.total_centavos !== null
			? eleicao.total_corrigido_centavos
			: null;
	const valores = eleicoes.flatMap((eleicao) => {
		const valor = deHoje(eleicao);
		return valor === null ? [] : [valor];
	});
	const maior = valores.length >= 2 ? Math.max(...valores) : 0;
	return eleicoes.map((eleicao) => ({
		ano: eleicao.ano,
		cargo: eleicao.cargo.nome,
		lugar:
			eleicao.uf === "BR"
				? "Brasil"
				: (estadoDaSigla(eleicao.uf)?.nome ?? eleicao.uf),
		valor: valorDaEleicao(eleicao.total_centavos, deHoje(eleicao), maior),
		fonte: fonteDaEleicao(eleicao.fonte),
	}));
}

function valorDaEleicao(
	total: number | null,
	corrigido: number | null,
	maior: number,
): ValorDaEleicao {
	if (total === null) {
		return { tipo: "sem-total" };
	}
	if (corrigido === null) {
		return {
			tipo: "sem-correcao",
			destaque: reaisArredondados(total),
			declarado: reaisExatos(total),
		};
	}
	const barra =
		maior > 0 && corrigido > 0
			? Math.max(0.0001, Math.round((corrigido / maior) * 10_000) / 10_000)
			: null;
	return {
		tipo: "corrigido",
		destaque: reaisArredondados(corrigido),
		declarado: reaisExatos(total),
		barra,
	};
}

function fonteDaEleicao(fonte: FontePatrimonio): LinhaDoPatrimonio["fonte"] {
	const endereco = enderecoSeguro(fonte.url);
	return {
		endereco,
		zip:
			endereco !== null &&
			new URL(endereco).pathname.toLowerCase().endsWith(".zip"),
		coletado: formatarData(dataEmBrasilia(fonte.coletado_em)),
	};
}
