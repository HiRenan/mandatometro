import { classes } from "@/lib/classes";
import { classeDaRegiao, ESTADOS, REGIOES } from "@/lib/parlamentares";
import {
	ALTURA_DO_TRACADO,
	CAMINHOS,
	CONTORNO,
	FRONTEIRAS_DAS_REGIOES,
	LARGURA_DO_TRACADO,
} from "@/lib/parlamentares/tracado";
import { EscolhaDoEstado } from "./escolha-do-estado";

/**
 * O bloco "Quem representa o seu estado", na página inicial, depois do caminho
 * (o Renan, em 21/11/2026): o título, a frase e o campo "Estado", que leva à
 * lista do estado mesmo sem o JavaScript. Ao lado, a partir do md, o mapa do
 * Brasil, só de desenho, com cada estado na fita da região: o mesmo mapa da
 * lista, sem os links (o Renan, em 22/11/2026, na #289: "Muda junto"). Só
 * aparece onde o site tem a API.
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
			<svg
				aria-hidden="true"
				viewBox={`0 0 ${LARGURA_DO_TRACADO} ${ALTURA_DO_TRACADO}`}
				className="desenho-do-brasil mapa-de-enfeite"
			>
				{REGIOES.map((regiao) => (
					<g
						key={regiao}
						className={classes("regiao-do-mapa", classeDaRegiao(regiao))}
					>
						{ESTADOS.filter((estado) => estado.regiao === regiao).map(
							(estado) => (
								<path key={estado.sigla} d={CAMINHOS[estado.sigla]} />
							),
						)}
					</g>
				))}
				<path d={FRONTEIRAS_DAS_REGIOES} className="fronteiras-das-regioes" />
				<path d={CONTORNO} className="contorno-do-brasil" />
			</svg>
		</section>
	);
}
