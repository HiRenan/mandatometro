/**
 * O botão "Continuar" (DESIGN.md): o bloco reto de tinta, a única ação em bloco
 * das páginas, na trilha e na página inicial. A borda de 2 px é transparente e
 * não aparece no papel. Nas cores forçadas do Windows, o navegador apaga o fundo
 * e pinta a borda na cor do texto, e o botão continua com cara de botão. O
 * respiro de 10 por 18 px, mais a borda, dá os 12 por 20 px do bloco.
 *
 * Com a letra grande (a tela com menos de 20 rem: a 360 px, a letra acima de
 * 18 px), a seta vem logo depois da última palavra, e o respiro dos lados fica em
 * 18 px (o Renan, na #76: "Seta no fim, respiro fixo"). Como a margem da página, o
 * respiro não cresce com a letra, e o texto ganha a largura: a 200%, o título do
 * próximo artigo cabe sem partir palavra. As linhas ficam equilibradas, como nos
 * títulos: "Começar / a trilha", e não "Começar a / trilha", com a mesma altura.
 * Com a letra a 100%, nada muda a partir de 320 px. A reserva é o wrap-anywhere:
 * o texto é um item de flex, que o break-word não deixa encolher, e sem ela uma
 * palavra maior que a linha levava o botão para fora da tela.
 */
export const BOTAO_CONTINUAR =
	"bg-tinta text-papel inline-flex items-center gap-3 border-2 border-transparent px-4.5 py-2.5 text-lg font-bold wrap-anywhere no-underline hover:underline max-[20rem]:inline-block max-[20rem]:px-[18px] max-[20rem]:text-balance";

/**
 * A seta do botão "Continuar": com a letra grande, ela segue a última palavra. Entre
 * a palavra e a seta vai um espaço ({" "} antes da seta), e não uma margem: quando a
 * seta desce sozinha para a linha de baixo, o espaço fica no fim da linha de cima, e
 * a seta começa alinhada com o texto. No flex, a partir de 20rem, o espaço no fim do
 * texto não conta, e o vão continua o gap-3 do botão.
 */
export const SETA_DO_BOTAO =
	"size-5 shrink-0 max-[20rem]:inline max-[20rem]:align-[-0.2em]";
