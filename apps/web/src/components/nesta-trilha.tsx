import { Link } from "@tanstack/react-router";
import type { Trilha } from "@/lib/conteudo";
import { corDaFita } from "@/lib/formatar";
import { idDoArtigo } from "@/lib/progresso";
import { MarcaX } from "./marca-x";

/**
 * As folhas da trilha em ordem, cada uma com a sua fita: a lida leva o X, e a
 * aberta, o canto dobrado.
 */
export function NestaTrilha({
	trilha,
	atual,
	lidos,
	riscarAgora,
}: {
	trilha: Trilha;
	/** O slug do artigo aberto. */
	atual: string;
	lidos: ReadonlySet<string>;
	/** O artigo que a pessoa acabou de ler: o X dele é desenhado. */
	riscarAgora?: string;
}) {
	return (
		<nav aria-labelledby="nesta-trilha">
			<h2
				id="nesta-trilha"
				className="subtitulo-condensado border-tinta border-b-2 pb-2.5 text-[1.625rem]"
			>
				Nesta trilha
			</h2>
			<ol>
				{trilha.artigos.map((artigo, indice) => {
					const aqui = artigo.slug === atual;
					const lido = lidos.has(idDoArtigo(artigo));
					return (
						<li
							key={artigo.slug}
							className={`border-tinta relative border-b-2 border-dashed ${aqui ? "canto-dobrado" : ""}`}
						>
							<span
								aria-hidden="true"
								className="fita absolute -top-0.5 left-0 h-14 w-3"
								style={{ background: corDaFita(indice + 1) }}
							/>
							<Link
								to="/trilhas/$trilha/$artigo"
								params={{ trilha: trilha.slug, artigo: artigo.slug }}
								aria-current={aqui ? "page" : undefined}
								className="grid grid-cols-[3rem_1fr] gap-x-3 py-4 pr-8 pl-[1.625rem] no-underline hover:[&_.titulo]:underline"
							>
								<span
									aria-hidden="true"
									className="numeral justify-self-center text-[4rem]"
								>
									<span className="relative inline-block">
										{indice + 1}
										{lido && (
											<MarcaX
												animar={riscarAgora === artigo.slug}
												className="sobre-o-numero"
											/>
										)}
									</span>
								</span>
								<span>
									<span className="titulo block text-[1.0625rem] leading-tight font-bold">
										{artigo.titulo}
									</span>
									{/* "Você está aqui" tem linha própria: na coluna estreita, junto
									    com o resto, a quebra deixava o "min" sozinho. */}
									<span className="mt-1.5 block text-sm">
										{aqui && (
											<strong className="block font-extrabold">
												Você está aqui
											</strong>
										)}
										{lido && (
											<strong className="font-extrabold">Lido · </strong>
										)}
										{artigo.minutos} min
									</span>
								</span>
							</Link>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
