import type {
	CorrecaoIpca,
	EleicaoPatrimonio,
	FontePatrimonio,
	VariacaoPatrimonio,
} from "@/client";
import { enderecoSeguro } from "@/lib/edicoes/conteudo-da-edicao";
import {
	comMilhares,
	dataEmBrasilia,
	formatarData,
	formatarMes,
} from "@/lib/formatar";
import { estadoDaSigla } from "./estados";

// Os números do patrimônio declarado ao TSE, prontos para a página do
// parlamentar. As contas vêm da API (o total de cada eleição, o total corrigido
// pelo IPCA, o fator, a alta dos preços e a diferença para a eleição anterior):
// aqui só se escrevem os números e as frases e se mede a barra de cada eleição.
// Tudo à mão, e não com o Intl, para o servidor e o navegador escreverem igual na
// hidratação, como o formatarData. Os números que a API manda como texto
// ("2.9812" e "138.2") viram outro texto sem virar número quebrado.

/** O espaço que não quebra: o "R$" não fica sozinho no fim da linha. */
const SEM_QUEBRA = "\u00a0";

/** O sinal de menos da tipografia, que não se confunde com o hífen. */
const MENOS = "\u2212";

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
	/** O que não se repete entre as eleições da pessoa: o ano, o cargo e o lugar. */
	chave: string;
	ano: number;
	/** O cargo disputado naquela eleição, com o nome do TSE. */
	cargo: string;
	/** O estado por extenso ou, na eleição para presidente, o Brasil. */
	lugar: string;
	/** O resultado da eleição em palavras; sem o resultado nos dados, nada. */
	resultado: string | null;
	valor: ValorDaEleicao;
	/** A diferença para a eleição anterior em reais de hoje; sem ela, nada. */
	diferenca: Diferenca | null;
	/** De que mês a que mês a inflação corrige o valor, só no valor de hoje. */
	periodo: string | null;
	/** A frase do "Como calculamos" e o link da calculadora, só no valor de hoje. */
	calculo: CalculoDaEleicao | null;
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
	return eleicoes.map((eleicao) => {
		const valor = valorDaEleicao(
			eleicao.total_centavos,
			deHoje(eleicao),
			maior,
		);
		// A diferença, o período e o cálculo falam dos reais de hoje: ao lado de
		// um valor sem a correção, eles confundiriam.
		const fim = valor.tipo === "corrigido" ? (correcao?.mes_fim ?? null) : null;
		const lugar =
			eleicao.uf === "BR"
				? "Brasil"
				: (estadoDaSigla(eleicao.uf)?.nome ?? eleicao.uf);
		return {
			chave: `${eleicao.ano}-${eleicao.cargo.nome}-${lugar}`,
			ano: eleicao.ano,
			cargo: eleicao.cargo.nome,
			lugar,
			resultado: fraseDoResultado(eleicao.resultado, eleicao.cargo.codigo),
			valor,
			diferenca: fim === null ? null : diferencaDaEleicao(eleicao.variacao),
			periodo: fim === null ? null : periodoDaCorrecao(eleicao.mes_inicio, fim),
			calculo: fim === null ? null : calculoDaEleicao(eleicao, fim),
			fonte: fonteDaEleicao(eleicao.fonte),
		};
	});
}

/**
 * Uma linha do gráfico do alto do bloco, na ordem da lista: o ano, o valor de
 * hoje arredondado e a parte da barra. A eleição sem o valor de hoje fica com o
 * valor nulo, e o gráfico diz isso em palavras; o zero fica sem barra.
 */
export type LinhaDoGrafico = {
	chave: string;
	ano: number;
	valor: string | null;
	/** A parte do maior valor de hoje (de 0,0001 a 1); no zero, nada. */
	parte: number | null;
};

/**
 * O gráfico "Em reais de hoje", com uma linha por eleição. Com menos de dois
 * valores de hoje, não há o que comparar, e o gráfico não aparece.
 */
export function graficoDoPatrimonio(
	linhas: LinhaDoPatrimonio[],
): LinhaDoGrafico[] | null {
	const deHoje = linhas.filter(({ valor }) => valor.tipo === "corrigido");
	if (deHoje.length < 2) {
		return null;
	}
	return linhas.map(({ chave, ano, valor }) =>
		valor.tipo === "corrigido"
			? { chave, ano, valor: valor.destaque, parte: valor.barra }
			: { chave, ano, valor: null, parte: null },
	);
}

/** O resultado de uma eleição, como a API manda. */
export type Resultado = NonNullable<EleicaoPatrimonio["resultado"]>;

/**
 * O 1º e o 2º suplente de senador (os cargos 9 e 10 do TSE). Quando a chapa
 * ganha, o TSE marca o suplente como eleito, e o cargo dele já diz que é
 * suplente: a frase fala da chapa, para não parecer que ele ganhou a vaga.
 */
const SUPLENTES_DE_SENADOR: readonly number[] = [9, 10];

/** O resultado em palavras simples e sem gênero: a frase vale para qualquer pessoa. */
const FRASE_DO_RESULTADO: Record<Resultado, string> = {
	eleito: "Ganhou a eleição.",
	eleito_por_qp:
		"Ganhou a eleição pelo quociente partidário, a conta que reparte as vagas entre os partidos.",
	eleito_por_media:
		"Ganhou a eleição pela média, a conta que reparte as vagas que sobram.",
	suplente: "Ficou como suplente.",
	nao_eleito: "Não ganhou a eleição.",
	sem_resultado: "Os dados do TSE não trazem o resultado.",
	outro: "O TSE registrou outra situação para esta candidatura.",
};

/** O resultado da eleição em palavras. Sem o resultado nos dados, nada. */
export function fraseDoResultado(
	resultado: Resultado | null,
	cargo: number,
): string | null {
	if (resultado === null) {
		return null;
	}
	if (SUPLENTES_DE_SENADOR.includes(cargo)) {
		if (resultado === "nao_eleito") {
			return "A chapa não ganhou a eleição.";
		}
		if (resultado.startsWith("eleito")) {
			return "A chapa ganhou a eleição.";
		}
	}
	return FRASE_DO_RESULTADO[resultado];
}

/** O texto da API que vale zero, com ou sem o sinal: "0.0" e "-0.0". */
function valeZero(numero: string): boolean {
	return /^-?0+\.0+$/.test(numero);
}

/** O percentual da API sem o sinal e com a vírgula: "-22.4" vira "22,4". */
function semSinal(percentual: string): string {
	return percentual.replace(/^-/, "").replace(".", ",");
}

/**
 * A diferença para a eleição anterior: a frase na tela, com o percentual entre
 * parênteses e o sinal, e a frase do leitor de tela, com "a mais" ou "a menos"
 * em palavras também no percentual.
 */
export type Diferenca = { texto: string; leitor: string };

/**
 * A diferença em reais de hoje, como no esboço do Renan (22/11/2026): "R$ 367
 * mil a mais que em 2014 (+138,2%)". Ela vem arredondada como o destaque e exata
 * abaixo de R$ 1, para não virar "R$ 0". O percentual só aparece quando a API
 * manda: com a eleição anterior de R$ 50 mil ou menos, ele é nulo. O lado (a mais
 * ou a menos) sai da diferença, e o número, do percentual.
 */
export function diferencaDaEleicao(
	variacao: VariacaoPatrimonio | null,
): Diferenca | null {
	if (variacao === null) {
		return null;
	}
	const { ano_anterior: ano, diferenca_centavos: centavos } = variacao;
	if (centavos === 0) {
		const texto = `O mesmo valor de ${ano}, em reais de hoje.`;
		return { texto, leitor: texto };
	}
	const tamanho = Math.abs(centavos);
	const valor =
		tamanho < 100 ? reaisExatos(tamanho) : reaisArredondados(tamanho);
	const lado = centavos > 0 ? "a mais" : "a menos";
	const frase = `${valor} ${lado} que em ${ano}`;
	const { percentual } = variacao;
	if (percentual === null) {
		return { texto: frase, leitor: frase };
	}
	const sinal = centavos > 0 ? "+" : MENOS;
	if (valeZero(percentual)) {
		return {
			texto: `${frase} (entre 0 e ${sinal}0,1%)`,
			leitor: `${frase}, ou menos de 0,1% ${lado}`,
		};
	}
	const numero = semSinal(percentual);
	return {
		texto: `${frase} (${sinal}${numero}%)`,
		leitor: `${frase}, ou ${numero}% ${lado}`,
	};
}

/**
 * De que mês a que mês a inflação corrige o valor: "Corrigido de outubro de 2018
 * a outubro de 2026" ou, no mesmo mês, "Corrigido pela inflação de outubro de
 * 2026".
 */
export function periodoDaCorrecao(inicio: string, fim: string): string {
	return inicio === fim
		? `Corrigido pela inflação de ${formatarMes(fim)}`
		: `Corrigido de ${formatarMes(inicio)} a ${formatarMes(fim)}`;
}

/** A frase de uma eleição no "Como calculamos" e o link da Calculadora do Cidadão. */
export type CalculoDaEleicao = {
	ano: number;
	frase: string;
	calculadora: string;
};

/**
 * Como a inflação corrige uma eleição, com o fator e a alta da API: "De outubro
 * de 2018 a outubro de 2026, os preços subiram 38,1%: cada R$ 100 de 2018 vale
 * R$ 138,12 hoje.". O exemplo é de R$ 100 porque a Calculadora do Cidadão corrige
 * R$ 100,00: o valor da frase é o que ela mostra, com as quatro casas do fator. O
 * sentido (subiram, caíram ou ficaram iguais) sai do fator, e o tamanho, da alta.
 * Sem o fator ou a alta, nada.
 */
export function calculoDaEleicao(
	eleicao: EleicaoPatrimonio,
	fim: string,
): CalculoDaEleicao | null {
	const { ano, mes_inicio: inicio, fator_ipca: fator } = eleicao;
	const alta = eleicao.alta_ipca_percentual;
	if (fator === null || alta === null) {
		return null;
	}
	// R$ 100 são 10.000 centavos, e 10.000 vezes um fator de quatro casas é o
	// fator sem o ponto: "1.3812" vira 13.812 centavos, R$ 138,12.
	const [inteiro, casas] = fator.split(".");
	const centavos = Number(inteiro) * 10_000 + Number(casas);
	let precos = "os preços ficaram iguais";
	if (centavos !== 10_000) {
		const sentido = centavos > 10_000 ? "subiram" : "caíram";
		precos = `os preços ${sentido} ${valeZero(alta) ? "menos de 0,1" : semSinal(alta)}%`;
	}
	const quando =
		inicio === fim
			? `Em ${formatarMes(fim)}`
			: `De ${formatarMes(inicio)} a ${formatarMes(fim)}`;
	return {
		ano,
		frase: `${quando}, ${precos}: cada R$${SEM_QUEBRA}100 de ${ano} vale ${reaisExatos(centavos)} hoje.`,
		calculadora: linkDaCalculadora(inicio, fim),
	};
}

/** A Calculadora do Cidadão do Banco Central, na correção por um índice. */
const CALCULADORA =
	"https://www3.bcb.gov.br/CALCIDADAO/publico/corrigirPorIndice.do?method=corrigirPorIndice";

/** O mês no formato da calculadora: "2018-10" vira "10/2018". */
function mesDaCalculadora(mes: string): string {
	const [ano, numero] = mes.split("-");
	return `${numero}/${ano}`;
}

/**
 * O link da Calculadora do Cidadão com as datas da eleição: R$ 100,00 corrigidos
 * pelo IPCA (a série 433) do mês da eleição ao último mês da correção, como na
 * frase do "Como calculamos".
 */
export function linkDaCalculadora(inicio: string, fim: string): string {
	return `${CALCULADORA}&dataInicial=${mesDaCalculadora(inicio)}&dataFinal=${mesDaCalculadora(fim)}&valorCorrecao=100,00&selIndice=00433IPCA`;
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
