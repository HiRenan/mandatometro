/**
 * As frases que uma linha pode mostrar, uma sobre a outra e invisíveis: a linha
 * já tem o tamanho da maior desde o HTML do servidor, e nada sai do lugar
 * quando a frase aparece ou muda. Quem usa põe a frase da vez no mesmo lugar
 * da grade.
 */
export function Reservas({ frases }: { frases: readonly string[] }) {
	return frases.map((frase) => (
		<span
			key={frase}
			aria-hidden="true"
			className="invisible col-start-1 row-start-1"
		>
			{frase}
		</span>
	));
}
