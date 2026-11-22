// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import { classeDaFita } from "@/lib/formatar";
import {
	type ContagemDoEstado,
	ESTADOS,
	ESTADOS_PELO_NOME,
	type Estado,
} from "@/lib/parlamentares";

/**
 * O Brasil em 27 azulejos, no painel do cartaz da lista: cada estado é um link
 * para a lista dele (?uf=SC), com a sigla e o número de deputados. O estado
 * aberto fica em tinta. Cada azulejo leva a fita da posição numa tira em cima,
 * e o texto fica sempre no papel ou na tinta.
 *
 * Quando a sigla não cabe no azulejo de 44 px (a 320 px, ou com a letra a 200%
 * no celular), o container query troca o mapa pela lista dos estados em ordem
 * alfabética. As duas vêm no HTML, e o CSS mostra uma de cada vez: o
 * display: none tira a outra do leitor de tela e do Tab.
 */
export function MapaDosEstados({ estados }: { estados: ContagemDoEstado[] }) {
	const deputados = new Map(
		estados.map((estado) => [estado.sigla, estado.deputados]),
	);
	const quantos = (estado: Estado) => deputados.get(estado.sigla) ?? 0;
	return (
		<nav aria-label="Estados" className="mapa-dos-estados">
			<ol role="list" className="mapa">
				{ESTADOS.map((estado, posicao) => (
					<li
						key={estado.sigla}
						className={classeDaFita(posicao + 1)}
						style={{ gridRow: estado.fileira, gridColumn: estado.coluna }}
					>
						<LinkDoEstado
							estado={estado}
							deputados={quantos(estado)}
							className="estado-no-mapa"
						/>
					</li>
				))}
			</ol>
			<ul role="list" className="lista-de-estados">
				{ESTADOS_PELO_NOME.map((estado) => (
					<li key={estado.sigla}>
						<LinkDoEstado
							estado={estado}
							deputados={quantos(estado)}
							className="estado-na-lista"
						/>
					</li>
				))}
			</ul>
		</nav>
	);
}

/**
 * O link de um estado: a sigla, o nome e o número de deputados. No mapa, o nome
 * fica só para o leitor de tela; na lista, aparece. O nome do link traz o que a
 * tela mostra ("SC", "16"), para quem comanda pela voz.
 */
function LinkDoEstado({
	estado,
	deputados,
	className,
}: {
	estado: Estado;
	deputados: number;
	className: string;
}) {
	return (
		<Link
			to="/parlamentares"
			search={{ uf: estado.sigla }}
			activeOptions={{ exact: true }}
			className={className}
		>
			<span className="sigla">{estado.sigla}</span>{" "}
			<span className="nome">{estado.nome}</span>
			<span className="sr-only">,</span>{" "}
			<span className="numero">
				{deputados}{" "}
				<span className="sr-only">
					{deputados === 1 ? "deputado" : "deputados"}
				</span>
			</span>
		</Link>
	);
}
