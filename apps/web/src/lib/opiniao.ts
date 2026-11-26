import type { RegistrarOpiniaoData } from "@/client";

export type PedidoDaOpiniao = RegistrarOpiniaoData["body"];
export type ParteDaOpiniao = NonNullable<PedidoDaOpiniao["partes"]>[number];

export const PARTES_DA_OPINIAO = [
	["trilhas", "Trilhas"],
	["parlamentares", "Parlamentares"],
	["jogos", "Jogos"],
	["edicoes", "Edições"],
] as const satisfies readonly (readonly [ParteDaOpiniao, string])[];

export const LIMITE_DO_TEXTO = 2_000;
export const OPINIAO_FORA_DO_AR = "A página de opinião está fora do ar agora.";
export const TEXTO_INVALIDO = "Escreva sua opinião em 1 a 2.000 caracteres.";
export const MUITAS_OPINIOES =
	"Muitas opiniões chegaram agora. Espere um minuto e tente de novo.";
export const OPINIAO_ENVIADA = "Sua opinião chegou. Obrigado por escrever!";
export const ENVIANDO_OPINIAO = "Enviando sua opinião…";
