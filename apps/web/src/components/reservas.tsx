import { classes } from "@/lib/classes";

/**
 * As frases que uma linha pode mostrar, uma sobre a outra e invisíveis: a linha
 * já tem o tamanho da maior desde o HTML do servidor, e nada sai do lugar
 * quando a frase aparece ou muda. Quem usa põe a frase da vez no mesmo lugar
 * da grade.
 *
 * Numa frase que é parágrafo, a grade fica num elemento em volta do <p>, e o
 * <p> é a frase da vez: o Chromium tira da árvore de acessibilidade um <p> em
 * grade ou em flex, e quem anda pelos parágrafos pula a frase (a #152). O
 * elemento em volta leva o text-pretty dos parágrafos, para as frases guardadas
 * quebrarem as linhas como a da vez.
 */
export function Reservas({
	frases,
	className,
}: {
	frases: readonly string[];
	/**
	 * O desenho das frases, quando ele não é o do lugar: na abertura da página de
	 * sair, os erros guardados vão em negrito, como o erro à vista.
	 */
	className?: string;
}) {
	return frases.map((frase) => (
		<span
			key={frase}
			aria-hidden="true"
			className={classes("invisible col-start-1 row-start-1", className)}
		>
			{frase}
		</span>
	));
}
