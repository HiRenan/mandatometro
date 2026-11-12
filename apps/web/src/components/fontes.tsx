import { Fragment } from "react";
import type { Fonte } from "@/lib/conteudo";
import { dominio, formatarData, pedacosDoDominio } from "@/lib/formatar";

/** As fontes oficiais do artigo, com o link e a data da consulta. */
export function Fontes({ fontes }: { fontes: Fonte[] }) {
	return (
		<section aria-labelledby="fontes" className="border-tinta border-t-2 pt-4">
			<h2
				id="fontes"
				className="subtitulo-condensado text-[1.625rem] xl:text-[2rem]"
			>
				Fontes oficiais
			</h2>
			<ol className="mt-4 grid gap-4">
				{fontes.map((fonte, indice) => (
					<li
						key={fonte.url}
						className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2"
					>
						<span
							aria-hidden="true"
							className="text-lg leading-snug font-extrabold tabular-nums"
						>
							{indice + 1}
						</span>
						<p className="text-[1.0625rem] leading-snug">
							<a href={fonte.url} className="font-bold">
								{fonte.titulo}
							</a>
							{/* Com a letra grande, o endereço que não cabe na linha quebra
							    antes de um ponto (o Renan, na #76: "Nos pontos"), e um
							    pedaço maior que a linha se parte numa letra. Ele só deixa
							    de caber abaixo de 20rem, e é só ali que vai em pedaços: o
							    endereço partido muda o desenho das letras mesmo sem
							    quebrar (o <wbr> desfaz o ajuste entre o "v" e o ponto de
							    "gov.br", e cada pedaço anda uma fração de pixel). Dali
							    para cima, ele vai inteiro, como antes da #76. */}
							<span className="text-tinta-suave mt-1 block text-[0.9375rem] wrap-anywhere">
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
		</section>
	);
}
