/**
 * O botão "Continuar" (DESIGN.md): o bloco reto de tinta, a única ação em bloco
 * das páginas, na trilha e na página inicial. A borda de 2 px é transparente e
 * não aparece no papel. Nas cores forçadas do Windows, o navegador apaga o fundo
 * e pinta a borda na cor do texto, e o botão continua com cara de botão. O
 * respiro de 10 por 18 px, mais a borda, dá os 12 por 20 px do bloco.
 */
export const BOTAO_CONTINUAR =
	"bg-tinta text-papel inline-flex items-center gap-3 border-2 border-transparent px-4.5 py-2.5 text-lg font-bold no-underline hover:underline";
