import { useSyncExternalStore } from "react";
import type { Respostas } from "./quiz";

/**
 * As respostas do quiz ficam só no navegador, sem conta e sem nada que
 * identifique a pessoa: para cada quiz, as tentativas, e em cada tentativa o
 * texto da opção escolhida, pelo enunciado da pergunta. A página mostra a última
 * tentativa; o "Recomeçar o quiz" abre outra e guarda a anterior.
 *
 *   { "processo-legislativo/quiz": { "tentativas": [{ "respostas": { ... } }] } }
 *
 * Nada disso vai ao servidor. Cada tentativa é um objeto, e uma etapa depois
 * pode marcar nela se foi antes ou depois da trilha, para a medição do piloto,
 * sem mudar o que já está guardado.
 */
const CHAVE = "mandatometro:respostas-do-quiz";

type Tentativa = { respostas: Respostas };

type Guardado = Readonly<Record<string, { tentativas: readonly Tentativa[] }>>;

const NENHUMA: Respostas = {};

// Quando o navegador não deixa gravar no localStorage, o que a página gravou
// vale até a pessoa sair dela, como nos artigos lidos (progresso.ts).
let emMemoria: string | null = null;
let ultimo: { bruto: string | null; guardado: Guardado } = {
	bruto: null,
	guardado: {},
};
const ouvintes = new Set<() => void>();

export function idDoQuiz(trilha: string): string {
	return `${trilha}/quiz`;
}

function lerBruto(): string | null {
	if (emMemoria !== null) {
		return emMemoria;
	}
	try {
		return window.localStorage.getItem(CHAVE);
	} catch {
		return null;
	}
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
	return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

// O Object.fromEntries cria cada chave no próprio objeto, até uma chamada
// "__proto__", que a atribuição comum trataria como o protótipo.
function lerTentativa(tentativa: Record<string, unknown>): Tentativa {
	const respostas = ehObjeto(tentativa.respostas) ? tentativa.respostas : {};
	return {
		respostas: Object.fromEntries(
			Object.entries(respostas).filter(
				(resposta): resposta is [string, string] =>
					typeof resposta[1] === "string",
			),
		),
	};
}

/** O que não for desse formato é ignorado. */
function interpretar(bruto: string | null): Guardado {
	if (bruto === null) {
		return {};
	}
	let valor: unknown;
	try {
		valor = JSON.parse(bruto);
	} catch {
		return {};
	}
	if (!ehObjeto(valor)) {
		return {};
	}
	const quizzes = Object.entries(valor).filter(
		(quiz): quiz is [string, { tentativas: unknown[] }] =>
			ehObjeto(quiz[1]) && Array.isArray(quiz[1].tentativas),
	);
	return Object.fromEntries(
		quizzes.map(([quiz, { tentativas }]) => [
			quiz,
			{ tentativas: tentativas.filter(ehObjeto).map(lerTentativa) },
		]),
	);
}

function lerGuardado(): Guardado {
	const bruto = lerBruto();
	if (bruto !== ultimo.bruto) {
		ultimo = { bruto, guardado: interpretar(bruto) };
	}
	return ultimo.guardado;
}

function tentativasDe(quiz: string): readonly Tentativa[] {
	const guardado = lerGuardado();
	return Object.hasOwn(guardado, quiz) ? guardado[quiz].tentativas : [];
}

/**
 * As respostas da última tentativa deste quiz. Devolve o mesmo objeto enquanto
 * nada muda.
 */
export function lerRespostas(quiz: string): Respostas {
	return tentativasDe(quiz).at(-1)?.respostas ?? NENHUMA;
}

function gravar(quiz: string, tentativas: readonly Tentativa[]): void {
	const bruto = JSON.stringify({ ...lerGuardado(), [quiz]: { tentativas } });
	try {
		window.localStorage.setItem(CHAVE, bruto);
		emMemoria = null;
	} catch {
		emMemoria = bruto;
	}
	for (const avisar of ouvintes) {
		avisar();
	}
}

/** Guarda a opção escolhida na última tentativa. Vale a última resposta. */
export function responder(
	quiz: string,
	enunciado: string,
	opcao: string,
): void {
	const tentativas = tentativasDe(quiz);
	const respostas = lerRespostas(quiz);
	if (Object.hasOwn(respostas, enunciado) && respostas[enunciado] === opcao) {
		return;
	}
	gravar(quiz, [
		...tentativas.slice(0, -1),
		{ respostas: { ...respostas, [enunciado]: opcao } },
	]);
}

/**
 * Abre uma tentativa nova, sem respostas, e guarda a anterior. Se a última
 * ainda não tem resposta, ela mesma serve.
 */
export function recomecarQuiz(quiz: string): void {
	const tentativas = tentativasDe(quiz);
	if (Object.keys(lerRespostas(quiz)).length > 0) {
		gravar(quiz, [...tentativas, { respostas: {} }]);
	}
}

/**
 * Desfaz o recomeço: junta a última tentativa à anterior, sem perder o que foi
 * respondido depois de recomeçar.
 */
export function desfazerRecomeco(quiz: string): void {
	const tentativas = tentativasDe(quiz);
	if (tentativas.length < 2) {
		return;
	}
	const anterior = tentativas[tentativas.length - 2];
	const ultima = tentativas[tentativas.length - 1];
	gravar(quiz, [
		...tentativas.slice(0, -2),
		{ respostas: { ...anterior.respostas, ...ultima.respostas } },
	]);
}

function assinar(avisar: () => void): () => void {
	const aoMudarEmOutraAba = (evento: StorageEvent) => {
		if (evento.key === CHAVE || evento.key === null) {
			avisar();
		}
	};
	ouvintes.add(avisar);
	window.addEventListener("storage", aoMudarEmOutraAba);
	return () => {
		ouvintes.delete(avisar);
		window.removeEventListener("storage", aoMudarEmOutraAba);
	};
}

function semRespostas(): Respostas {
	return NENHUMA;
}

/**
 * As respostas deste quiz neste navegador. No servidor e na hidratação, o quiz
 * vem sem respostas; elas aparecem logo depois, sem erro de hidratação.
 */
export function useRespostasDoQuiz(quiz: string): Respostas {
	return useSyncExternalStore(assinar, () => lerRespostas(quiz), semRespostas);
}
