import { Link } from "@tanstack/react-router";
import type { ArtigoNaLista, Infografico as Dados } from "@/lib/conteudo";
import { corDaFita, dominio, formatarData } from "@/lib/formatar";

/**
 * O caminho da trilha num infográfico: os passos em pé, ligados por uma linha
 * cheia, com os desvios em linha tracejada. É texto de verdade, numa lista
 * ordenada; a linha, os quadradinhos e as fitas são desenho e ficam fora do
 * leitor de tela, e o sentido está nas palavras.
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
				A linha cheia é o caminho de sempre; a tracejada, o que pode mudar o
				caminho.
			</p>
			<ol className="passos mt-6">
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
							<h3 className="subtitulo-condensado text-[1.375rem]">
								{passo.titulo}
							</h3>
							<p className="mt-1.5 font-serif text-[1.0625rem] leading-[1.55]">
								{passo.texto}
							</p>
							{passo.desvios.length > 0 && (
								<ul className="mt-3 grid gap-3">
									{passo.desvios.map((desvio) => (
										<li
											key={desvio}
											className="desvio font-serif text-base leading-normal"
										>
											{desvio}
										</li>
									))}
								</ul>
							)}
							{artigos.length > 0 && (
								<ul className="mt-3.5 grid gap-2">
									{artigos.map(({ artigo, posicao }) => (
										<li key={artigo.slug} className="flex items-start gap-2.5">
											<span
												aria-hidden="true"
												className="fita mt-0.5 h-6 w-3 shrink-0"
												style={{ background: corDaFita(posicao) }}
											/>
											<Link
												to="/trilhas/$trilha/$artigo"
												params={{ trilha: trilha.slug, artigo: artigo.slug }}
												className="text-[0.9375rem] leading-snug font-semibold"
											>
												{`Artigo ${posicao}: ${artigo.titulo}`}
											</Link>
										</li>
									))}
								</ul>
							)}
							<ul
								aria-label={`Fontes do passo ${passo.titulo}`}
								className="mt-3.5 grid gap-2"
							>
								{passo.fontes.map((fonte) => (
									<li key={fonte.url} className="text-[0.9375rem] leading-snug">
										<a href={fonte.url} className="font-bold">
											{fonte.titulo}
										</a>
										<span className="text-tinta-suave mt-0.5 block text-sm">
											{`${dominio(fonte.url)}, consultada em ${formatarData(fonte.consultadoEm)}`}
										</span>
									</li>
								))}
							</ul>
						</li>
					);
				})}
			</ol>
		</section>
	);
}
