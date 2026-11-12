// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import type { TrilhaNaLista } from "@/lib/conteudo";
import { corDaFita } from "@/lib/formatar";
import { idDoArtigo } from "@/lib/progresso";
import { MarcaDeLido } from "./marca-de-lido";

/**
 * As folhas da trilha em ordem, cada uma com a sua fita e o link para o artigo:
 * a lida leva o visto, e a aberta, o canto dobrado. As fitas penduram da linha
 * de cima da lista.
 */
export function FolhasDaTrilha({
	trilha,
	lidos,
	atual,
	marcarAgora,
	className,
	"aria-label": rotulo,
}: {
	trilha: Pick<TrilhaNaLista, "slug" | "artigos">;
	lidos: ReadonlySet<string>;
	/** O slug do artigo aberto, quando a lista fica dentro de um artigo. */
	atual?: string;
	/** O artigo que a pessoa acabou de ler: o visto dele é desenhado. */
	marcarAgora?: string;
	className?: string;
	"aria-label"?: string;
}) {
	return (
		<ol role="list" aria-label={rotulo} className={className}>
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
							className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 py-4 pr-8 pl-[1.625rem] no-underline hover:[&_.titulo]:underline"
						>
							{/* Com a letra grande, o número fica no lugar, e o título desce
							    para a linha de baixo, com a largura toda. A margem embaixo do
							    número o separa do título. */}
							<span
								aria-hidden="true"
								className="numeral letra-grande:mb-4 justify-self-center text-[4rem]"
							>
								<span className="relative inline-block">
									{indice + 1}
									{lido && (
										<MarcaDeLido
											animar={marcarAgora === artigo.slug}
											className="visto-no-numero"
										/>
									)}
								</span>
							</span>
							<span className="letra-grande:col-span-full">
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
									{lido && <strong className="font-extrabold">Lido · </strong>}
									{artigo.minutos} min
								</span>
							</span>
						</Link>
					</li>
				);
			})}
		</ol>
	);
}
