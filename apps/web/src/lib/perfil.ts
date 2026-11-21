import { FOLGA, largura } from "./conteudo/regua";
import { fraseDoProgresso } from "./formatar";
import { contarLidos, primeiroNaoLido } from "./progresso";

/**
 * O que o perfil da conta (/perfil, em routes/perfil.tsx) diz da leitura: a
 * saudação com o primeiro nome, o progresso em palavras e onde continuar.
 */

type ArtigoComId = { trilha: string; slug: string };

/** O primeiro nome, para a saudação: a primeira palavra do nome completo. */
export function primeiroNome(nome: string): string {
	return nome.trim().split(/\s+/)[0] ?? "";
}

/**
 * As linhas da saudação, na letra do título: "Olá!" enquanto a conta não
 * responde e, com o nome, "Olá," numa linha e o primeiro nome na outra.
 */
export function linhasDaSaudacao(primeiro: string): string[] {
	return primeiro ? ["Olá,", `${primeiro}.`] : ["Olá!"];
}

/**
 * O --palavra de linhas que não quebram: a mais larga, com a folga do teto, em
 * duas casas, arredondada para cima, como o tetoDoTitulo. A régua mede a linha
 * inteira, e não as partes dela: um nome com hífen, como "Ana-Maria", fica numa
 * linha só, e a letra diminui até ele caber. A saudação usa o titulo-de-folha,
 * que tem a largura do titulo-condensado e só muda a entrelinha.
 */
function tetoDasLinhas(linhas: readonly string[]): number {
	const maior = Math.max(
		...linhas.map((linha) => largura(linha, "titulo-condensado")),
	);
	return Math.ceil(maior * FOLGA * 100) / 100;
}

/** O --palavra da saudação: um nome comprido diminui a letra até caber. */
export function tetoDaSaudacao(primeiro: string): number {
	return tetoDasLinhas(linhasDaSaudacao(primeiro));
}

/**
 * O --palavra da caixa da saudação, que guarda as duas linhas desde o HTML do
 * servidor: o da linha do "Olá", a mais estreita que a saudação pode ter. Com
 * ele, a caixa tem a altura da letra maior, e nenhum nome passa dela.
 */
export const TETO_DA_CAIXA = Math.min(
	tetoDasLinhas(["Olá!"]),
	tetoDasLinhas(["Olá,"]),
);

/** A leitura da conta em palavras, sem nota nem porcentagem. */
export function fraseDaLeitura(lidos: number, total: number): string {
	if (lidos === 0) {
		return "Você ainda não leu nenhum artigo.";
	}
	return lidos === total
		? `Você leu os ${total} artigos.`
		: `Você leu ${lidos} de ${total} artigos.`;
}

/** O progresso de uma trilha no perfil, que também fala da trilha não começada. */
export function fraseDaTrilha(lidos: number, total: number): string {
	return (
		fraseDoProgresso(lidos, total) || "Você ainda não começou esta trilha."
	);
}

/**
 * Onde a pessoa continua a leitura: na primeira trilha começada e não
 * terminada, na ordem da lista, o primeiro artigo que falta nela. Sem trilha
 * pela metade, o primeiro artigo não lido da lista. Com tudo lido, não há onde
 * continuar. O navegador não sabe quando cada artigo foi lido: a ordem das
 * trilhas faz as vezes da leitura mais recente.
 */
export function ondeContinuar<T extends ArtigoComId>(
	trilhas: readonly { artigos: readonly T[] }[],
	lidos: ReadonlySet<string>,
): T | undefined {
	const pelaMetade = trilhas.find((trilha) => {
		const quantos = contarLidos(trilha.artigos, lidos);
		return quantos > 0 && quantos < trilha.artigos.length;
	});
	if (pelaMetade) {
		return primeiroNaoLido(pelaMetade.artigos, lidos);
	}
	for (const trilha of trilhas) {
		const artigo = primeiroNaoLido(trilha.artigos, lidos);
		if (artigo) {
			return artigo;
		}
	}
	return undefined;
}
