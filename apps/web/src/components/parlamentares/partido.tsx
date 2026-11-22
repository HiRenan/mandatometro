/**
 * O partido ao lado do nome, ou o traço, quando ele não vem nos dados (a pessoa
 * ainda não tem voto registrado, ou o voto não traz o partido). O leitor de tela
 * ouve "sem partido registrado" no lugar do traço.
 */
export function Partido({ sigla }: { sigla: string | null }) {
	return (
		<span className="partido">
			{sigla ?? (
				<>
					<span aria-hidden="true">—</span>
					<span className="sr-only">sem partido registrado</span>
				</>
			)}
		</span>
	);
}
