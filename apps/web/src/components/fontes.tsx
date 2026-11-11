import type { Fonte } from "@/lib/conteudo";
import { dominio, formatarData } from "@/lib/formatar";

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
					<li key={fonte.url} className="grid grid-cols-[1.75rem_1fr] gap-x-2">
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
							<span className="text-tinta-suave mt-1 block text-[0.9375rem]">
								{dominio(fonte.url)}, consultada em{" "}
								{formatarData(fonte.consultadoEm)}
							</span>
						</p>
					</li>
				))}
			</ol>
		</section>
	);
}
