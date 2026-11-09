/**
 * O X que risca a folha lida. Com `animar`, o traço é desenhado uma vez, no
 * momento em que a pessoa chega ao fim do texto.
 */
export function MarcaX({
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
			className={`marca-x ${className ?? ""}`}
			data-animar={animar || undefined}
		>
			<path pathLength={1} d="M8 10 C22 24 36 38 52 52" />
			<path pathLength={1} d="M50 8 C36 24 22 38 9 51" />
		</svg>
	);
}
