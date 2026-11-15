// O visto: um traço só, a perna curta e a longa, como o do professor no caderno.
const VISTO = "M9 31 C13.5 35.5 18 40.5 22.5 46.5 C30 33.5 39.5 21.5 52 10";

/**
 * O visto da folha lida. Com `animar`, o traço é desenhado uma vez, no momento
 * em que a pessoa chega ao fim do texto. O traço de papel, por baixo, separa o
 * visto do que fica atrás dele.
 */
export function MarcaDeLido({
	animar = false,
	className,
}: {
	animar?: boolean;
	className?: string;
}) {
	return (
		<svg
			viewBox="0 0 60 60"
			aria-hidden="true"
			focusable="false"
			className={`marca-de-lido ${className ?? ""}`}
			data-animar={animar || undefined}
		>
			<path className="marca-de-lido-papel" pathLength={1} d={VISTO} />
			<path className="marca-de-lido-traco" pathLength={1} d={VISTO} />
		</svg>
	);
}
