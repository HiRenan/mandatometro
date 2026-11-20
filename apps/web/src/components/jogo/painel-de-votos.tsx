import { useEffect, useState } from "react";
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

function useContagem(ate: number, ligado: boolean): number {
	const [valor, setValor] = useState(0);

	useEffect(() => {
		if (!ligado) {
			return;
		}
		if (
			movimentoReduzido() ||
			typeof Element.prototype.animate !== "function"
		) {
			setValor(ate);
			return;
		}
		tocar("painel");
		let passo = 0;
		const relogio = setInterval(() => {
			passo += 1;
			if (passo >= PASSOS_DA_CONTAGEM) {
				clearInterval(relogio);
				setValor(ate);
				return;
			}
			setValor(Math.round((ate * passo) / PASSOS_DA_CONTAGEM));
		}, MS_DA_CONTAGEM);
		return () => clearInterval(relogio);
	}, [ate, ligado]);

	return valor;
}

export function PainelDeVotos({
	painel,
	aoAvancar,
}: {
	painel: Painel;
	aoAvancar: () => void;
}) {
	const nominal = painel.modo === "nominal";
	const sim = useContagem(nominal ? painel.sim : 0, nominal);
	const nao = useContagem(nominal ? painel.nao : 0, nominal);

	return (
		<div className="jogo-painel" data-modo={painel.modo}>
			{nominal ? (
				<dl className="jogo-votos">
					<div>
						<dt>Sim</dt>
						<dd>{sim}</dd>
					</div>
					<div>
						<dt>Não</dt>
						<dd>{nao}</dd>
					</div>
				</dl>
			) : (
				<>
					<Carimbo selo={painel.selo} />
					<p className="jogo-sem-placar">
						O painel acendeu sem número nenhum: na votação simbólica, quem
						concorda fica como está.
					</p>
				</>
			)}
			<p className="jogo-legenda" tabIndex={-1} data-foco="true">
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
