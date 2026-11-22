// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import type { PlacarPorPartido as Grupo } from "@/client";
import { NOME_DO_VOTO, VALORES, type Valor } from "@/lib/parlamentares/votos";

/** O nome do grupo sem partido, que a API manda por último. */
const SEM_PARTIDO = "Sem partido registrado";

/**
 * O placar de cada partido, na ordem da API, com o grupo sem partido por último.
 * A partir do lg, uma tabela, com uma coluna por voto; antes, uma lista, com os
 * votos de cada partido numa linha. São duas cópias, e o CSS mostra uma de cada
 * vez. As colunas e os votos da lista seguem a ordem do placar, e o Outro
 * registro só aparece quando algum partido tem.
 */
export function PlacarPorPartido({ grupos }: { grupos: Grupo[] }) {
	const valores = VALORES.filter(
		(valor) =>
			valor !== "outro" || grupos.some((grupo) => grupo.placar.outro > 0),
	);
	return (
		<section
			aria-labelledby="placar-por-partido"
			className="placar-por-partido"
		>
			<h2
				id="placar-por-partido"
				className="subtitulo-condensado letra-com-teto [--palavra:3.61]"
			>
				Placar por partido
			</h2>
			<table className="tabela-por-partido">
				<caption className="sr-only">
					Quantos votos de cada tipo cada partido deu nesta votação
				</caption>
				<thead>
					<tr>
						<th scope="col">Partido</th>
						{valores.map((valor) => (
							<th key={valor} scope="col">
								{NOME_DO_VOTO[valor]}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{grupos.map((grupo) => (
						<tr key={grupo.partido ?? SEM_PARTIDO}>
							<th scope="row">{grupo.partido ?? SEM_PARTIDO}</th>
							{valores.map((valor) => (
								<td key={valor}>{grupo.placar[valor]}</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
			<ul role="list" className="lista-por-partido">
				{grupos.map((grupo) => (
					<li key={grupo.partido ?? SEM_PARTIDO}>
						<p className="partido-da-lista">{grupo.partido ?? SEM_PARTIDO}</p>
						<p className="votos-do-partido">
							{votosDoGrupo(grupo, valores).map(([valor, quantos]) => (
								<span key={valor}>
									{NOME_DO_VOTO[valor]} <strong>{quantos}</strong>
								</span>
							))}
						</p>
					</li>
				))}
			</ul>
		</section>
	);
}

/** Os votos do partido na lista do celular: só os que ele deu. */
function votosDoGrupo(grupo: Grupo, valores: Valor[]): [Valor, number][] {
	return valores
		.map((valor): [Valor, number] => [valor, grupo.placar[valor]])
		.filter(([, quantos]) => quantos > 0);
}
