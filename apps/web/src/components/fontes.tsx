import { Fragment } from "react";
import { classes } from "@/lib/classes";
import type { Fonte } from "@/lib/conteudo";
import { dominio, formatarData, pedacosDoDominio } from "@/lib/formatar";

/** As fontes oficiais do artigo, com o link e a data da consulta. */
export function Fontes({
	fontes,
	className,
}: {
	fontes: Fonte[];
	className?: string;
}) {
	return (
		<section aria-labelledby="fontes" className={classes("fontes", className)}>
			<h2 id="fontes" className="subtitulo-condensado">
				Fontes oficiais
			</h2>
			<ListaDeFontes fontes={fontes} />
		</section>
	);
}

/**
 * A lista das fontes, com o link e a data da consulta: a do artigo e a de cada
 * resposta do quiz. O `className` troca a margem de cima.
 */
export function ListaDeFontes({
	fontes,
	className = "mt-4",
}: {
	fontes: Fonte[];
	className?: string;
}) {
	return (
		<ol className={classes("lista-de-fontes", className)}>
			{fontes.map((fonte, indice) => (
				<li key={fonte.url}>
					<span aria-hidden="true" className="numero">
						{indice + 1}
					</span>
					<p>
						<a href={fonte.url}>{fonte.titulo}</a>
						{/* Com a letra grande, o endereço que não cabe na linha quebra
						    antes de um ponto (o Renan, na #76: "Nos pontos"), e um
						    pedaço maior que a linha se parte numa letra. Ele só deixa
						    de caber abaixo de 20rem, e é só ali que vai em pedaços: o
						    endereço partido muda o desenho das letras mesmo sem
						    quebrar (o <wbr> desfaz o ajuste entre o "v" e o ponto de
						    "gov.br", e cada pedaço anda uma fração de pixel). Dali
						    para cima, ele vai inteiro, como antes da #76. */}
						<span className="endereco">
							<span className="max-[20rem]:hidden">{dominio(fonte.url)}</span>
							<span className="hidden max-[20rem]:inline">
								{pedacosDoDominio(fonte.url).map((pedaco, posicao) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: os pedaços ficam fixos, na ordem do endereço, e só a posição não se repete (um pedaço pode, como em ".leg.leg.br").
									<Fragment key={posicao}>
										{posicao > 0 && <wbr />}
										{pedaco}
									</Fragment>
								))}
							</span>
							, consultada em {formatarData(fonte.consultadoEm)}
						</span>
					</p>
				</li>
			))}
		</ol>
	);
}
