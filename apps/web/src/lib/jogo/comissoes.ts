/**
 * O endereço do Jogo das Comissões, em /jogos/comissoes: o nome da pasta do
 * roteiro dele, em conteudo/jogo/.
 *
 * Fica num arquivo só dele, sem nenhum import, como a trilha (trilha.ts): o
 * navegador precisa do endereço no fim do quiz final, que leva ao jogo, e o
 * leitor do roteiro (ler.ts) leva o zod e o js-yaml, que ficam só no servidor.
 */
export const JOGO_DAS_COMISSOES = "comissoes";
