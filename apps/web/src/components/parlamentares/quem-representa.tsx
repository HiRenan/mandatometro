import { classes } from "@/lib/classes";
import { classeDaFita } from "@/lib/formatar";
import { ESTADOS } from "@/lib/parlamentares";
import { EscolhaDoEstado } from "./escolha-do-estado";

/**
 * O bloco "Quem representa o seu estado", na página inicial, depois do caminho
 * (o Renan, em 21/11/2026): o título, a frase e o campo "Estado", que leva à
 * lista do estado mesmo sem o JavaScript. Ao lado, a partir do md, o Brasil em
 * 27 azulejos, só de desenho, nas cinco fitas: o mesmo mapa da lista, sem os
 * números. Só aparece onde o site tem a API.
 */
export function QuemRepresenta({ className }: { className?: string }) {
	return (
		<section
			aria-labelledby="quem-representa"
			className={classes("quem-representa", className)}
		>
			<div className="quem-representa-texto">
				<h2
					id="quem-representa"
					className="titulo-condensado letra-com-teto [--palavra:4.91]"
				>
					Quem representa o seu estado
				</h2>
				<p className="quem-representa-abertura">
					Veja os deputados federais e os senadores de cada estado e como cada
					um votou.
				</p>
				<EscolhaDoEstado />
			</div>
			<div aria-hidden="true" className="mapa-de-enfeite">
				{ESTADOS.map((estado, posicao) => (
					<span
						key={estado.sigla}
						className={classeDaFita(posicao + 1)}
						style={{ gridRow: estado.fileira, gridColumn: estado.coluna }}
					/>
				))}
			</div>
		</section>
	);
}
