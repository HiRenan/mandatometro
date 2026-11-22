/**
 * A trilha de onde o jogo é a continuação: as cenas apontam artigos dela, e o
 * fim do quiz final dela leva ao jogo.
 *
 * Fica num arquivo só dela, sem nenhum import: o navegador precisa do nome da
 * trilha na página do quiz final, e o leitor do roteiro (ler.ts) leva o zod e o
 * js-yaml, que ficam só no servidor.
 */
export const TRILHA_DO_JOGO = "processo-legislativo";
