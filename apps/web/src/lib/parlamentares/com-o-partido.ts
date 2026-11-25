import type {
	ContagemComOPartido,
	ContagemVotosParlamentar,
	VotoParlamentar,
} from "@/client";
import { comMilhares } from "@/lib/formatar";
import { NOME_DO_VOTO, totalDaContagem } from "./votos";

// "Com o partido", na página do parlamentar (a #329): o texto da seção e da
// marca de cada voto contra a maioria do partido. A API faz as contas (a #328);
// aqui, só se escrevem os números e os fatos, sem adjetivo.

/** Os votos que entram na comparação com o partido, como na API. */
export const VOTOS_COMPARAVEIS = [
	"sim",
	"nao",
	"abstencao",
	"obstrucao",
] as const satisfies readonly VotoParlamentar["valor"][];

export type VotoComparavel = (typeof VOTOS_COMPARAVEIS)[number];

export function comparavel(valor: unknown): valor is VotoComparavel {
	return (VOTOS_COMPARAVEIS as readonly unknown[]).includes(valor);
}

/** O número com o ponto do milhar e a palavra no singular ou no plural. */
function quantos(numero: number, singular: string, maisDeUm: string): string {
	return `${comMilhares(numero)} ${numero === 1 ? singular : maisDeUm}`;
}

/**
 * A frase do alto, sem a sigla (o Renan, em 24/11/2026: "Sem a sigla no
 * total"): quem trocou de partido tem votos dos dois na conta.
 */
export function fraseDoPartido({
	comparaveis,
	com_o_partido,
	contra,
}: ContagemComOPartido): string {
	const frase = `Votou com a maioria do partido em ${comMilhares(com_o_partido)} de ${quantos(comparaveis, "votação", "votações")}`;
	return contra > 0
		? `${frase}, e contra ela em ${comMilhares(contra)}.`
		: `${frase}.`;
}

/** A legenda da barra, que fica fora do leitor de tela com ela. */
export function legendaDaBarra(comparaveis: number): string {
	return `A barra mostra a parte com a maioria no total de ${quantos(comparaveis, "votação comparada", "votações comparadas")}`;
}

/**
 * Sem voto comparado, a frase diz por quê: nenhum voto da pessoa é dos que
 * entram na conta, ou nenhum pôde ser comparado (as regras vêm logo depois).
 */
export function motivoSemComparacao(
	contagem: ContagemVotosParlamentar,
	nome: string,
): string {
	if (VOTOS_COMPARAVEIS.some((valor) => contagem[valor] > 0)) {
		return `Nenhum voto de ${nome} pôde ser comparado com o do partido.`;
	}
	const total = totalDaContagem(contagem);
	return total === 1
		? `O único voto registrado de ${nome} não é Sim, Não, Abstenção nem Obstrução, e só esses entram na conta.`
		: `Nenhum dos ${comMilhares(total)} votos registrados de ${nome} é Sim, Não, Abstenção ou Obstrução, e só esses entram na conta.`;
}

export type ContraOPartido = { partido: string; maioria: VotoComparavel };

/**
 * O voto contra a maioria do partido, com a sigla do dia e o voto da maioria.
 * Só o `false` da API conta, com a sigla em texto, a maioria e um voto que
 * entram na conta e são diferentes: dados que se contradizem ou que vêm fora do
 * formato ficam sem a marca.
 */
export function contraOPartido(
	voto: Pick<
		VotoParlamentar,
		"valor" | "partido" | "maioria_do_partido" | "com_o_partido"
	>,
): ContraOPartido | null {
	const { valor, partido, maioria_do_partido: maioria } = voto;
	if (
		voto.com_o_partido !== false ||
		typeof partido !== "string" ||
		partido === "" ||
		!comparavel(maioria) ||
		!comparavel(valor) ||
		maioria === valor
	) {
		return null;
	}
	return { partido, maioria };
}

/** O texto da marca, igual na tela e no leitor de tela. */
export function textoDaMarca({ partido, maioria }: ContraOPartido): string {
	return `Contra a maioria do ${partido}, que votou ${NOME_DO_VOTO[maioria]}`;
}

/** A linha em cima da lista curta, só quando há mais votos contra do que ela mostra. */
export function maisRecentes(mostrados: number, contra: number): string | null {
	if (mostrados >= contra) {
		return null;
	}
	return mostrados === 1
		? `O mais recente de ${comMilhares(contra)}`
		: `Os ${mostrados} mais recentes de ${comMilhares(contra)}`;
}
