import type { TrilhaNaLista } from "@/lib/conteudo";
import { FolhasDaTrilha } from "./folhas-da-trilha";

/**
 * As folhas da trilha ao lado do artigo, com o título "Nesta trilha": a lida
 * leva o X, e a aberta, o canto dobrado.
 */
export function NestaTrilha({
	trilha,
	atual,
	lidos,
	riscarAgora,
}: {
	trilha: TrilhaNaLista;
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
			<FolhasDaTrilha
				trilha={trilha}
				atual={atual}
				lidos={lidos}
				riscarAgora={riscarAgora}
			/>
		</nav>
	);
}
