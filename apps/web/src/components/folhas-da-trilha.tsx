// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link } from "@tanstack/react-router";
import { classes } from "@/lib/classes";
import type { TrilhaNaLista } from "@/lib/conteudo";
import { classeDaFita } from "@/lib/formatar";
import { idDoArtigo } from "@/lib/progresso";
import { MarcaDeLido } from "./marca-de-lido";

/**
 * As folhas da trilha em ordem, cada uma com o número na fita da posição e o
 * link para o artigo: a lida leva o visto, e o número dela perde a cor; a
 * aberta leva um fio grosso de tinta do lado.
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
		<ol
			role="list"
			aria-label={rotulo}
			className={classes("folhas-da-trilha", className)}
		>
			{trilha.artigos.map((artigo, indice) => {
				const aqui = artigo.slug === atual;
				const lido = lidos.has(idDoArtigo(artigo));
				return (
					<li
						key={artigo.slug}
						className={classes(classeDaFita(indice + 1), aqui && "aqui")}
					>
						<Link
							to="/trilhas/$trilha/$artigo"
							params={{ trilha: trilha.slug, artigo: artigo.slug }}
							aria-current={aqui ? "page" : undefined}
						>
							{/* Com a letra grande, o número fica no lugar, e o título desce
							    para a linha de baixo, com a largura toda (o Renan, na #76:
							    "Sim, número em cima"). A margem embaixo do número o separa do
							    título. */}
							<span aria-hidden="true" className="numeral letra-grande:mb-4">
								{indice + 1}
								{lido && (
									<MarcaDeLido
										animar={marcarAgora === artigo.slug}
										className="visto-no-numero"
									/>
								)}
							</span>
							<span className="letra-grande:col-span-full">
								<span className="titulo">{artigo.titulo}</span>
								{/* "Você está aqui" tem linha própria: na coluna estreita, junto
								    com o resto, a quebra deixava o "min" sozinho. */}
								<span className="detalhe">
									{aqui && <strong className="block">Você está aqui</strong>}
									{lido && <strong>Lido · </strong>}
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
