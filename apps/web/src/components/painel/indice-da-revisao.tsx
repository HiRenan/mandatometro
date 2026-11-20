// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { classes } from "@/lib/classes";
import { classeDaFita } from "@/lib/formatar";

export type LinhaDoIndice = { posicao: number; titulo: string; estado: string };

/**
 * O índice da revisão, como o "Nesta edição" da edição publicada: o número na
 * fita da posição, o título e, embaixo, o estado de cada item. No fim, o que
 * falta para publicar. Ele aparece em dois lugares, e o CSS mostra um de cada
 * vez: dentro da folha, abaixo de 1200 px, e na coluna ao lado, que para na
 * tela durante a rolagem, daí para cima (estilos/painel.css).
 */
export function IndiceDaRevisao({
	linhas,
	paraPublicar,
	onde,
}: {
	linhas: LinhaDoIndice[];
	paraPublicar: string;
	onde: "na-folha" | "ao-lado";
}) {
	const id = `indice-da-revisao-${onde}`;
	return (
		<nav
			aria-labelledby={id}
			className={classes("nesta indice-da-revisao", id)}
		>
			<h2 id={id} className="rotulo">
				Itens da edição
			</h2>
			<ol role="list" className="folhas-da-trilha">
				{linhas.map(({ posicao, titulo, estado }) => (
					<li key={posicao} className={classeDaFita(posicao)}>
						<a href={`#item-${posicao}`}>
							<span aria-hidden="true" className="numeral letra-grande:mb-4">
								{posicao}
							</span>
							<span className="letra-grande:col-span-full">
								<span className="titulo">{titulo}</span>
								<span className="detalhe">{estado}</span>
							</span>
						</a>
					</li>
				))}
			</ol>
			<p className="para-publicar">
				<span className="rotulo">Para publicar</span> {paraPublicar}
			</p>
		</nav>
	);
}
