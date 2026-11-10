// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import type { ArtigoNaLista, CaminhoNaInicial } from "@/lib/conteudo";
import { idDoPasso } from "@/lib/formatar";
import { ArtigosDoPasso } from "./infografico";

/**
 * O caminho de um projeto de lei na página inicial: as paradas ligadas pela
 * linha cheia, cada uma com os artigos que a explicam. A parada sem artigo leva
 * ao passo dela no infográfico da trilha, com o texto e as fontes: nenhuma
 * parada fica sem destino. Abaixo do lg, a linha
 * fica em pé, como no infográfico da trilha; a partir do lg, deitada, de lado
 * a lado (index.css). Só o caminho completo: o texto de cada passo, os desvios
 * e as fontes ficam na trilha, e a frase embaixo da linha avisa e leva até lá.
 * O caminho não mostra o progresso, que fica na abertura da página.
 */
export function InfograficoEmLinha({
	caminho,
	trilha,
	className = "",
}: {
	caminho: CaminhoNaInicial;
	trilha: { slug: string; artigos: Pick<ArtigoNaLista, "slug" | "titulo">[] };
	className?: string;
}) {
	return (
		<section aria-labelledby="caminho" className={className}>
			{/* A partir do xl, o título e o resumo ficam nas colunas da abertura da
			    página: o título à esquerda, o texto à direita. */}
			<div className="xl:grid xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] xl:items-end xl:gap-x-16">
				<h2
					id="caminho"
					className="subtitulo-condensado text-[2rem] md:text-[2.75rem]"
				>
					{caminho.titulo}
				</h2>
				<p className="mt-3 max-w-[52ch] font-serif text-lg leading-snug lg:text-xl xl:mt-0">
					{caminho.resumo}
				</p>
			</div>
			<ol role="list" className="caminho-em-linha mt-8 lg:mt-10">
				{caminho.passos.map((passo) => (
					<li key={passo.titulo} className="parada">
						<h3 className="subtitulo-condensado text-[1.375rem]">
							{passo.titulo}
						</h3>
						{passo.artigos.length > 0 ? (
							<ArtigosDoPasso
								slugs={passo.artigos}
								trilha={trilha}
								className="mt-3"
							/>
						) : (
							<p className="mt-3">
								<Link
									to="/trilhas/$trilha"
									params={{ trilha: trilha.slug }}
									hash={idDoPasso(passo.titulo)}
									className="link-do-caminho text-[0.9375rem] leading-snug font-semibold"
								>
									<span>
										Ler este passo na trilha
										<span className="sr-only">: {passo.titulo}</span>
									</span>
								</Link>
							</p>
						)}
					</li>
				))}
			</ol>
			<p className="mt-10 max-w-[64ch] text-[1.0625rem] leading-snug">
				A linha mostra o caminho completo. Os desvios, como a comissão que
				decide sem o plenário, estão na trilha, com as fontes oficiais.
			</p>
			<p className="mt-4">
				<Link
					to="/trilhas/$trilha"
					params={{ trilha: trilha.slug }}
					hash="caminho"
					className="acao-de-texto font-bold"
				>
					Ver o caminho na trilha
				</Link>
			</p>
		</section>
	);
}
