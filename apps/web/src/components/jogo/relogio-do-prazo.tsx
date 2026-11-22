import { useEffect, useState } from "react";
import { BOTAO_CONTINUAR } from "@/components/botao-continuar";
import { classes } from "@/lib/classes";
import { semCliqueDuplo } from "@/lib/clique";
import type { Relogio } from "@/lib/jogo";
import { tocar } from "@/lib/jogo/som";
import { movimentoReduzido } from "@/lib/painel-vivo";

/**
 * O prazo em sessões, como o do recurso ao Plenário: as sessões acendem uma a
 * uma e, no fim, o texto diz o que aconteceu. Com o movimento reduzido, todas
 * aparecem de uma vez, e a frase é a mesma: o movimento não carrega informação
 * que não esteja em palavras (DESIGN.md).
 */
const MS_POR_SESSAO = 420;

export function RelogioDoPrazo({
	relogio,
	aoAvancar,
}: {
	relogio: Relogio;
	aoAvancar: () => void;
}) {
	const [corridas, setCorridas] = useState(0);
	const total = relogio.sessoes;

	useEffect(() => {
		if (
			movimentoReduzido() ||
			typeof Element.prototype.animate !== "function"
		) {
			setCorridas(total);
			return;
		}
		tocar("campainha");
		const conta = setInterval(() => {
			setCorridas((quantas) => {
				if (quantas >= total) {
					clearInterval(conta);
					return quantas;
				}
				return quantas + 1;
			});
		}, MS_POR_SESSAO);
		return () => clearInterval(conta);
	}, [total]);

	return (
		<div className="jogo-relogio">
			<p className="jogo-sessoes">
				{Array.from({ length: total }, (_, indice) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: as sessões do prazo ficam fixas, e só a posição não se repete.
						key={indice}
						className="jogo-sessao"
						data-corrida={indice < corridas ? "true" : undefined}
						aria-hidden="true"
					/>
				))}
				<span className="sr-only">
					{total === 1 ? "Uma sessão de prazo" : `${total} sessões de prazo`}
				</span>
			</p>
			<p className="jogo-legenda" tabIndex={-1} data-foco="true">
				{relogio.legenda}
			</p>
			<p className="jogo-fundamento">{relogio.fundamento}</p>
			<div className="jogo-acoes">
				<button
					type="button"
					className={classes(BOTAO_CONTINUAR, "jogo-botao")}
					onClick={semCliqueDuplo(aoAvancar)}
				>
					Continuar
				</button>
			</div>
		</div>
	);
}
