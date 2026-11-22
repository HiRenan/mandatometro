import { useEffect, useId, useState } from "react";
import { BOTAO_CONTINUAR } from "@/components/botao-continuar";
import { classes } from "@/lib/classes";
import { semCliqueDuplo } from "@/lib/clique";
import { formatarData } from "@/lib/formatar";
import type { Painel } from "@/lib/jogo";
import { tocar } from "@/lib/jogo/som";
import { movimentoReduzido } from "@/lib/painel-vivo";
import { Carimbo } from "./carimbos";

/**
 * O painel do plenário. Na votação nominal, os contadores sobem até os votos
 * reais; na simbólica, o painel acende sem número nenhum, como foi no Senado.
 * O placar fica em tinta: o Sim não é verde, e o Não não é vermelho
 * (DESIGN.md).
 */
const PASSOS_DA_CONTAGEM = 24;

const MS_DA_CONTAGEM = 40;

function useContagem(ligado: boolean): number {
	const [progresso, setProgresso] = useState(0);

	useEffect(() => {
		if (!ligado) {
			return;
		}
		tocar("painel");
		if (
			movimentoReduzido() ||
			typeof Element.prototype.animate !== "function"
		) {
			setProgresso(1);
			return;
		}
		let passo = 0;
		const relogio = setInterval(() => {
			passo += 1;
			setProgresso(passo / PASSOS_DA_CONTAGEM);
			if (passo === PASSOS_DA_CONTAGEM) {
				clearInterval(relogio);
			}
		}, MS_DA_CONTAGEM);
		return () => clearInterval(relogio);
	}, [ligado]);

	return progresso;
}

export function PainelDeVotos({
	painel,
	aoAvancar,
}: {
	painel: Painel;
	aoAvancar: () => void;
}) {
	const placar = useId();
	const nominal = painel.modo === "nominal";
	const progresso = useContagem(nominal);

	return (
		<div className="jogo-painel" data-modo={painel.modo}>
			{nominal ? (
				<>
					{/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: o placar não recebe foco e o texto abaixo dá os votos finais desde o início. */}
					<dl className="jogo-votos" aria-hidden="true">
						<div>
							<dt>Sim</dt>
							<dd>{Math.round(painel.sim * progresso)}</dd>
						</div>
						<div>
							<dt>Não</dt>
							<dd>{Math.round(painel.nao * progresso)}</dd>
						</div>
					</dl>
					<span className="sr-only" id={placar}>
						Sim, {painel.sim} votos. Não, {painel.nao} votos.
					</span>
				</>
			) : (
				<>
					<Carimbo selo={painel.selo} />
					<p className="jogo-sem-placar">
						O painel acendeu sem número nenhum: na votação simbólica, quem
						concorda fica como está.
					</p>
				</>
			)}
			<p
				className="jogo-legenda"
				tabIndex={-1}
				data-foco="true"
				aria-describedby={nominal ? placar : undefined}
			>
				{painel.legenda}
				{nominal ? ` Votação de ${formatarData(painel.data)}.` : null}
			</p>
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
