import { Link } from "@tanstack/react-router";

/** Onde a pessoa está: Trilhas / a trilha / o artigo. */
export function Caminho({
	trilha,
	naTrilha = false,
}: {
	trilha: { slug: string; titulo: string };
	/** Na página da própria trilha, o nome dela é o lugar atual, sem link. */
	naTrilha?: boolean;
}) {
	return (
		<nav aria-label="Caminho" className="pt-[18px] text-base font-semibold">
			<ol className="flex flex-wrap gap-x-2">
				<li>
					<Link to="/trilhas">Trilhas</Link>
				</li>
				<li aria-hidden="true">/</li>
				<li>
					{naTrilha ? (
						<span aria-current="page">{trilha.titulo}</span>
					) : (
						<Link to="/trilhas/$trilha" params={{ trilha: trilha.slug }}>
							{trilha.titulo}
						</Link>
					)}
				</li>
			</ol>
		</nav>
	);
}
