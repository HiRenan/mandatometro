import type { TrilhaNaLista } from "@/lib/conteudo";
import { FolhasDaTrilha } from "./folhas-da-trilha";

/**
 * As folhas da trilha ao lado do artigo, com o título "Nesta trilha": a lida
 * leva o visto, e a aberta, o fio de tinta do lado.
 */
export function NestaTrilha({
	trilha,
	atual,
	lidos,
	marcarAgora,
}: {
	trilha: TrilhaNaLista;
	/** O slug do artigo aberto. */
	atual: string;
	lidos: ReadonlySet<string>;
	/** O artigo que a pessoa acabou de ler: o visto dele é desenhado. */
	marcarAgora?: string;
}) {
	return (
		<nav aria-labelledby="nesta-trilha" className="nesta">
			<h2 id="nesta-trilha" className="rotulo">
				Nesta trilha
			</h2>
			<FolhasDaTrilha
				trilha={trilha}
				atual={atual}
				lidos={lidos}
				marcarAgora={marcarAgora}
			/>
		</nav>
	);
}
