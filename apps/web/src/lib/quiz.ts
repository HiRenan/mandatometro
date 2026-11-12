import { plural } from "./formatar";

/**
 * A correção e as frases do quiz, em funções puras. A tela fica em
 * components/quiz.tsx, e o que o navegador guarda, em respostas-do-quiz.ts.
 */

/** Uma pergunta como a página recebe: as opções na ordem do arquivo e a certa. */
export type PerguntaDoQuiz = {
	enunciado: string;
	opcoes: readonly string[];
	/** A posição da opção certa em `opcoes`. */
	certa: number;
};

/** O texto da opção que a pessoa escolheu, pelo enunciado da pergunta. */
export type Respostas = Readonly<Record<string, string>>;

export function acertou(pergunta: PerguntaDoQuiz, opcao: number): boolean {
	return opcao === pergunta.certa;
}

/**
 * A posição da opção respondida. O navegador guarda o texto da opção: se o texto
 * mudar no arquivo, a resposta antiga fica sem opção, em vez de apontar outra.
 */
export function opcaoRespondida(
	pergunta: PerguntaDoQuiz,
	respostas: Respostas,
): number | undefined {
	const texto = Object.hasOwn(respostas, pergunta.enunciado)
		? respostas[pergunta.enunciado]
		: undefined;
	const posicao = texto === undefined ? -1 : pergunta.opcoes.indexOf(texto);
	return posicao >= 0 ? posicao : undefined;
}

export function contarRespondidas(
	perguntas: readonly PerguntaDoQuiz[],
	respostas: Respostas,
): number {
	return perguntas.filter(
		(pergunta) => opcaoRespondida(pergunta, respostas) !== undefined,
	).length;
}

/** O andamento, sem contar acertos: o quiz não dá nota. */
export function fraseDoAndamento(respondidas: number, total: number): string {
	if (respondidas === 0) {
		return "";
	}
	return respondidas === total
		? "Você terminou o quiz."
		: `Você respondeu ${respondidas} de ${total}.`;
}

/** O que o leitor de tela ouve quando a pessoa responde. */
export function avisoDaResposta(
	numero: number,
	pergunta: PerguntaDoQuiz,
	opcao: number,
): string {
	return acertou(pergunta, opcao)
		? `Pergunta ${numero}: você acertou.`
		: `Pergunta ${numero}: você errou. A resposta certa é: ${pergunta.opcoes[pergunta.certa]}`;
}

/** "o artigo 1", "os artigos 2 e 3", "os artigos 1, 2 e 4", "os artigos 1 a 3". */
function quaisArtigos(posicoes: readonly number[]): string {
	const artigos = [...new Set(posicoes)].sort((a, b) => a - b);
	if (artigos.length === 1) {
		return `o artigo ${artigos[0]}`;
	}
	const primeiro = artigos[0];
	const ultimo = artigos[artigos.length - 1];
	if (artigos.length > 2 && ultimo - primeiro === artigos.length - 1) {
		return `os artigos ${primeiro} a ${ultimo}`;
	}
	return `os artigos ${artigos.slice(0, -1).join(", ")} e ${ultimo}`;
}

/**
 * A frase da chamada para o quiz, no artigo depois do qual ele aparece e na
 * página da trilha, com as posições dos artigos das perguntas.
 */
export function fraseDaChamada(
	perguntas: number,
	artigos: readonly number[],
): string {
	const deCadaUma = perguntas > 1 ? " de cada uma" : "";
	return `${plural(perguntas, "pergunta", "perguntas")} sobre ${quaisArtigos(artigos)}, com a resposta certa, a explicação e a fonte oficial${deCadaUma}.`;
}
