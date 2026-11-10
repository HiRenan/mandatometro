// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import type {
	ArtigoNaLista,
	Infografico as Dados,
	Fonte,
} from "@/lib/conteudo";
import { corDaFita, formatarData, semQuebrarCitacao } from "@/lib/formatar";

/** A data da consulta das fontes de um passo, uma vez só quando é a mesma. */
function quandoForamConsultadas(fontes: Fonte[]): string {
	const datas = [...new Set(fontes.map((fonte) => fonte.consultadoEm))].sort();
	const palavra = fontes.length === 1 ? "consultada" : "consultadas";
	return datas.length === 1
		? `${palavra} em ${formatarData(datas[0])}`
		: `${palavra} entre ${formatarData(datas[0])} e ${formatarData(datas[datas.length - 1])}`;
}

/**
 * O caminho da trilha num infográfico: os passos em pé, ligados por uma linha
 * cheia, com os desvios em linha tracejada até um quadradinho vazado. É texto
 * de verdade, numa lista ordenada; a linha, os quadradinhos e as fitas são
 * desenho e ficam fora do leitor de tela, e o sentido está nas palavras. As
 * fontes de cada passo ficam numa linha embaixo dele, com a data da consulta.
 */
export function Infografico({
	infografico,
	trilha,
	className = "",
}: {
	infografico: Dados;
	trilha: { slug: string; artigos: Pick<ArtigoNaLista, "slug" | "titulo">[] };
	className?: string;
}) {
	return (
		<section aria-labelledby="caminho" className={className}>
			<h2
				id="caminho"
				className="subtitulo-condensado border-tinta border-b-2 pb-2.5 text-[1.625rem]"
			>
				{infografico.titulo}
			</h2>
			<p className="mt-3 font-serif text-[1.0625rem] leading-snug">
				{infografico.resumo}
			</p>
			<p className="mt-2 text-[0.9375rem] leading-snug font-semibold">
				A linha cheia é o caminho completo; a tracejada, o que pode mudar o
				caminho.
			</p>
			<ol role="list" className="mt-6">
				{infografico.passos.map((passo) => {
					const artigos = passo.artigos.flatMap((slug) => {
						const indice = trilha.artigos.findIndex(
							(artigo) => artigo.slug === slug,
						);
						return indice === -1
							? []
							: [{ artigo: trilha.artigos[indice], posicao: indice + 1 }];
					});
					return (
						<li key={passo.titulo} className="passo">
							{/* O título, o texto e os desvios: no último passo, a linha
							    desce até o último desvio. */}
							<div className="passo-corpo">
								<h3 className="subtitulo-condensado text-[1.375rem]">
									{passo.titulo}
								</h3>
								<p className="mt-1.5 font-serif text-[1.0625rem] leading-[1.55]">
									{semQuebrarCitacao(passo.texto)}
								</p>
								{passo.desvios.length > 0 && (
									<ul role="list" className="mt-3 grid gap-3">
										{passo.desvios.map((desvio) => (
											<li
												key={desvio}
												className="desvio font-serif text-base leading-normal"
											>
												<span aria-hidden="true" className="no-do-desvio" />
												{semQuebrarCitacao(desvio)}
											</li>
										))}
									</ul>
								)}
							</div>
							{artigos.length > 0 && (
								<ul role="list" className="mt-3.5 grid gap-2">
									{artigos.map(({ artigo, posicao }) => (
										<li key={artigo.slug} className="flex items-start gap-2.5">
											<span
												aria-hidden="true"
												className="fita-curta mt-px h-6 w-3 shrink-0"
												style={{ background: corDaFita(posicao) }}
											/>
											<Link
												to="/trilhas/$trilha/$artigo"
												params={{ trilha: trilha.slug, artigo: artigo.slug }}
												className="link-do-caminho text-[0.9375rem] leading-snug font-semibold"
											>
												<span className="block">{`Artigo ${posicao}: ${artigo.titulo}`}</span>
											</Link>
										</li>
									))}
								</ul>
							)}
							<div className="mt-3.5 text-[0.9375rem] leading-snug">
								{/* As fontes quebram linha umas embaixo das outras: a entrelinha
								    maior e o espaço em volta do "·" deixam o anel de foco de um
								    link (3 px, afastado 3 px) fora do texto vizinho. */}
								<p className="leading-[1.75] font-semibold">
									<span className="mr-1">
										{passo.fontes.length === 1 ? "Fonte:" : "Fontes:"}
									</span>{" "}
									{passo.fontes.map((fonte, indice) => (
										<Fragment key={fonte.url}>
											{indice > 0 && (
												<>
													{" "}
													<span className="mx-1">·</span>{" "}
												</>
											)}
											<a href={fonte.url} className="link-do-caminho font-bold">
												<span>{fonte.titulo}</span>
											</a>
										</Fragment>
									))}
								</p>
								<p className="text-tinta-suave mt-0.5">
									{quandoForamConsultadas(passo.fontes)}
								</p>
							</div>
						</li>
					);
				})}
			</ol>
		</section>
	);
}
