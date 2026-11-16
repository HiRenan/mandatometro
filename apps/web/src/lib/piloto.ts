import { useSyncExternalStore } from "react";
import type { PedidoTentativaPiloto } from "@/client";
import { apagarLidos } from "./progresso";
import {
	apagarQuiz,
	apagarTodasAsRespostas,
	idDoQuizFinal,
	recomecarQuiz,
} from "./respostas-do-quiz";

/*
 * O piloto (docs/medicao-do-piloto.md): umas 50 pessoas respondem as perguntas
 * do quiz final antes de ler a trilha, na página /piloto, e de novo no fim
 * dela, no próprio quiz final. Cada etapa concluída manda à API só o total de
 * acertos, com um código sorteado neste navegador, o mesmo nas duas etapas.
 *
 * Aqui fica o que o navegador guarda do piloto: o código, a versão do quiz e a
 * situação de cada etapa, com os acertos da etapa concluída até a API receber.
 * Nada identifica a pessoa, e o código não aparece na tela, na URL nem no
 * console. Recebido o depois, o código e os acertos saem daqui, e fica só a
 * marca de que o navegador participou; com o piloto encerrado (410), também.
 * O envio fica em lib/envio-do-piloto.ts, e a tela, em components/piloto.tsx.
 */

/**
 * A versão congelada das doze perguntas do quiz final (quiz-final.md). Mudou
 * um enunciado, uma opção ou a certa, a versão muda junto, combinada com a API:
 * o teste das perguntas (piloto-versao.test.ts) falha até lá.
 */
export const VERSAO_DO_QUIZ = "processo-legislativo-final-v1";

/** A trilha do piloto: a única com o quiz final da versão acima. */
export const TRILHA_DO_PILOTO = "processo-legislativo";

/** As respostas do antes ficam à parte das do quiz final, que é o depois. */
export const QUIZ_DO_ANTES = `${TRILHA_DO_PILOTO}/antes-do-piloto`;

const CHAVE = "mandatometro:piloto";

export type NomeDaEtapa = PedidoTentativaPiloto["etapa"];

/**
 * Uma etapa: respondendo; pendente, concluída e esperando a API receber os
 * acertos; recebida; ou perdida, quando a API recusou o pedido (413 ou 422) e o
 * site não tenta de novo.
 */
export type Etapa =
	| { situacao: "respondendo" }
	| { situacao: "pendente"; acertos: number }
	| { situacao: "recebida" }
	| { situacao: "perdida" };

/**
 * O piloto neste navegador: fora dele; participando, com o código e as duas
 * etapas; concluído, depois do depois; ou encerrado, quando a API respondeu
 * que o piloto não recebe mais respostas.
 */
export type Piloto =
	| { fase: "fora" }
	| {
			fase: "participando";
			participacao: string;
			antes: Etapa;
			depois: Etapa;
	  }
	| { fase: "concluido" }
	| { fase: "encerrado" };

/** O que a API respondeu a um pedido, quando muda o que o navegador guarda. */
export type Desfecho = "recebida" | "encerrado" | "recusado";

const FORA: Piloto = { fase: "fora" };
const RESPONDENDO: Etapa = { situacao: "respondendo" };
const UUID_V4 =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Quando o navegador não deixa gravar no localStorage, o piloto vale até a
// pessoa sair da página, como as respostas (respostas-do-quiz.ts). Sem ele,
// nada de medição inventada: o código se perde, e o quiz continua.
let emMemoria: string | null = null;
let ultimo: { bruto: string | null; piloto: Piloto } = {
	bruto: null,
	piloto: FORA,
};
const ouvintes = new Set<() => void>();

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

function lerEtapa(valor: unknown): Etapa | undefined {
	if (!ehObjeto(valor)) {
		return undefined;
	}
	switch (valor.situacao) {
		case "respondendo":
		case "recebida":
		case "perdida":
			return { situacao: valor.situacao };
		case "pendente":
			return Number.isInteger(valor.acertos) &&
				(valor.acertos as number) >= 0 &&
				(valor.acertos as number) <= 12
				? { situacao: "pendente", acertos: valor.acertos as number }
				: undefined;
		default:
			return undefined;
	}
}

/** O que não for desse formato, ou de outra versão, conta como fora do piloto. */
function interpretar(bruto: string | null): Piloto {
	if (bruto === null) {
		return FORA;
	}
	let valor: unknown;
	try {
		valor = JSON.parse(bruto);
	} catch {
		return FORA;
	}
	if (!ehObjeto(valor) || valor.versao !== VERSAO_DO_QUIZ) {
		return FORA;
	}
	if (valor.fase === "concluido" || valor.fase === "encerrado") {
		return { fase: valor.fase };
	}
	const antes = lerEtapa(valor.antes);
	const depois = lerEtapa(valor.depois);
	if (
		valor.fase !== "participando" ||
		typeof valor.participacao !== "string" ||
		!UUID_V4.test(valor.participacao) ||
		!antes ||
		!depois
	) {
		return FORA;
	}
	return {
		fase: "participando",
		participacao: valor.participacao,
		antes,
		depois,
	};
}

/** O piloto neste navegador. Devolve o mesmo objeto enquanto nada muda. */
export function lerPiloto(): Piloto {
	const bruto = lerBruto();
	if (bruto !== ultimo.bruto) {
		ultimo = { bruto, piloto: interpretar(bruto) };
	}
	return ultimo.piloto;
}

function avisarTodos(): void {
	for (const avisar of ouvintes) {
		avisar();
	}
}

function gravar(piloto: Piloto): void {
	const bruto = JSON.stringify({ versao: VERSAO_DO_QUIZ, ...piloto });
	try {
		window.localStorage.setItem(CHAVE, bruto);
		emMemoria = null;
	} catch {
		emMemoria = bruto;
	}
	avisarTodos();
}

/**
 * Um UUIDv4. O randomUUID só existe em página segura (HTTPS ou localhost);
 * fora dela, o código sai do getRandomValues, com os bits da versão 4.
 */
function sortearCodigo(): string {
	const { crypto } = globalThis;
	if (typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
	return [
		hex.slice(0, 4),
		hex.slice(4, 6),
		hex.slice(6, 8),
		hex.slice(8, 10),
		hex.slice(10),
	]
		.map((parte) => parte.join(""))
		.join("-");
}

/**
 * Começa o piloto: sorteia o código e apaga as respostas do antes e do quiz
 * final, para as duas etapas começarem do zero. Se o navegador já participa,
 * como num segundo "Começar" em outra aba, ou já participou, nada muda.
 */
export function comecarPiloto(): void {
	if (lerPiloto().fase !== "fora") {
		return;
	}
	apagarQuiz(QUIZ_DO_ANTES);
	recomecarQuiz(idDoQuizFinal(TRILHA_DO_PILOTO));
	gravar({
		fase: "participando",
		participacao: sortearCodigo(),
		antes: RESPONDENDO,
		depois: RESPONDENDO,
	});
}

/** Se a etapa já foi concluída, mandada ou não. */
export function etapaFeita(etapa: Etapa): boolean {
	return etapa.situacao !== "respondendo";
}

/**
 * Guarda a etapa concluída, com os acertos, até a API receber. Vale a primeira
 * conclusão: depois dela, responder de novo não muda os acertos. O depois só
 * conclui depois do antes. Ao concluir o antes, o quiz final abre uma tentativa
 * nova, e o depois começa do zero. Devolve se guardou.
 */
export function concluirEtapa(etapa: NomeDaEtapa, acertos: number): boolean {
	const piloto = lerPiloto();
	if (
		piloto.fase !== "participando" ||
		etapaFeita(piloto[etapa]) ||
		(etapa === "depois" && !etapaFeita(piloto.antes))
	) {
		return false;
	}
	if (etapa === "antes") {
		recomecarQuiz(idDoQuizFinal(TRILHA_DO_PILOTO));
	}
	gravar({ ...piloto, [etapa]: { situacao: "pendente", acertos } });
	return true;
}

/**
 * O próximo pedido para a API: o antes antes do depois. É sempre o mesmo corpo
 * enquanto a etapa espera, nos reenvios também.
 */
export function proximoPedido(
	piloto: Piloto = lerPiloto(),
): PedidoTentativaPiloto | undefined {
	if (piloto.fase !== "participando") {
		return undefined;
	}
	for (const etapa of ["antes", "depois"] as const) {
		const situacao = piloto[etapa];
		if (situacao.situacao === "pendente") {
			return {
				participacao: piloto.participacao,
				versao_quiz: VERSAO_DO_QUIZ,
				etapa,
				acertos: situacao.acertos,
			};
		}
	}
	return undefined;
}

/**
 * Guarda o que a API respondeu ao pedido, se ele ainda é o que está guardado:
 * outra aba pode ter recebido a resposta antes, ou outra pessoa pode ter
 * começado do zero no meio do caminho. Recebido ou perdido o depois, o código
 * sai do navegador; com o piloto encerrado, também. Devolve se guardou.
 */
export function registrarResposta(
	pedido: PedidoTentativaPiloto,
	desfecho: Desfecho,
): boolean {
	const piloto = lerPiloto();
	if (
		piloto.fase !== "participando" ||
		piloto.participacao !== pedido.participacao
	) {
		return false;
	}
	const etapa = piloto[pedido.etapa];
	if (etapa.situacao !== "pendente" || etapa.acertos !== pedido.acertos) {
		return false;
	}
	if (desfecho === "encerrado") {
		gravar({ fase: "encerrado" });
	} else if (pedido.etapa === "depois") {
		gravar({ fase: "concluido" });
	} else {
		gravar({
			...piloto,
			antes: { situacao: desfecho === "recebida" ? "recebida" : "perdida" },
		});
	}
	return true;
}

/**
 * Apaga tudo o que o site guardou neste navegador: os artigos lidos, as
 * respostas e as tentativas dos quizzes, o código e os pedidos do piloto,
 * também o que só estava na memória. É o "Começar como outra pessoa", num
 * computador usado por mais gente, e não se desfaz.
 */
export function comecarComoOutraPessoa(): void {
	apagarLidos();
	apagarTodasAsRespostas();
	try {
		window.localStorage.removeItem(CHAVE);
	} catch {
		// Com o armazenamento bloqueado, o piloto está só na memória.
	}
	emMemoria = null;
	avisarTodos();
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

function semPiloto(): Piloto {
	return FORA;
}

/**
 * O piloto neste navegador. No servidor e na hidratação, fora dele; o que
 * estiver guardado aparece logo depois, sem erro de hidratação.
 */
export function usePiloto(): Piloto {
	return useSyncExternalStore(assinar, lerPiloto, semPiloto);
}
