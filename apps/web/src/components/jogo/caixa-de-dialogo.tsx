import { useEffect, useRef, useState } from "react";
import { BOTAO_CONTINUAR } from "@/components/botao-continuar";
import { Reservas } from "@/components/reservas";
import { classes } from "@/lib/classes";
import { semCliqueDuplo } from "@/lib/clique";
import { pararVoz, tocar, tocarVoz } from "@/lib/jogo/som";
import { temVoz } from "@/lib/jogo/vozes";
import { movimentoReduzido } from "@/lib/painel-vivo";

/**
 * A caixa de diálogo do jogo: a placa com o nome de quem fala e o texto em
 * efeito de máquina de escrever. O primeiro toque ou acionamento de teclado
 * revela a fala inteira; o seguinte avança. Com `prefers-reduced-motion`, e
 * onde o navegador não anima, a fala já aparece inteira.
 *
 * A fala fica num `<p>` sem grade nem flex, para quem anda de parágrafo em
 * parágrafo não a perder (docs/codigo-do-site.md).
 */
const MS_POR_LETRA = 22;

const MOSTRAR_FALA = "Mostrar a fala inteira";

export function CaixaDeDialogo({
	id,
	nome,
	quem,
	texto,
	falasSeguidas,
	aoAvancar,
	rotulo = "Continuar",
}: {
	/** O id da fala, que é o nome do arquivo da narração (vo/c1-03.mp3). */
	id: string;
	/** O nome na placa. A narração não tem placa. */
	nome?: string;
	/** Quem fala, para o estilo da caixa. */
	quem: string;
	texto: string;
	falasSeguidas: readonly string[];
	aoAvancar: () => void;
	rotulo?: string;
}) {
	// A conta começa em zero também com o movimento reduzido: a fala inteira
	// entra no efeito, depois da hidratação, e o HTML do servidor não difere.
	const [letras, setLetras] = useState(0);
	const relogio = useRef<ReturnType<typeof setInterval>>(undefined);

	const completa = letras >= texto.length;

	// A narração da fala, quando ela foi gravada. Ela para quando a fala sai da
	// tela: duas vozes nunca falam juntas.
	useEffect(() => {
		tocarVoz(id);
		return pararVoz;
	}, [id]);

	useEffect(() => {
		const semMovimento =
			movimentoReduzido() || typeof Element.prototype.animate !== "function";
		if (semMovimento) {
			setLetras(texto.length);
			return;
		}
		// Com a fala narrada, o bipe da máquina de escrever só atrapalharia.
		if (!temVoz(id)) {
			tocar("texto");
		}
		relogio.current = setInterval(() => {
			setLetras((quantas) => {
				if (quantas >= texto.length) {
					clearInterval(relogio.current);
					return quantas;
				}
				return quantas + 1;
			});
		}, MS_POR_LETRA);
		return () => clearInterval(relogio.current);
	}, [texto, id]);

	function agir() {
		if (!completa) {
			clearInterval(relogio.current);
			setLetras(texto.length);
			return;
		}
		aoAvancar();
	}

	return (
		<div className="jogo-caixa" data-quem={quem}>
			{/*
			 * O toque na caixa faz o mesmo que o botão: revela a fala inteira e,
			 * depois, avança. Fica fora do leitor de tela e do Tab, porque o botão
			 * embaixo é a mesma ação, com nome.
			 */}
			<button
				type="button"
				className="jogo-toque"
				aria-hidden="true"
				tabIndex={-1}
				onMouseDown={(evento) => evento.preventDefault()}
				onClick={semCliqueDuplo(agir)}
			/>
			<p
				className="jogo-placa"
				data-narracao={nome ? undefined : "true"}
				aria-hidden="true"
			>
				{nome ?? "Narração"}
			</p>
			{/*
			 * O leitor de tela recebe a fala inteira na hora, e a máquina de
			 * escrever fica no pedaço que ele não lê: quem ouve não perde o fim da
			 * frase, e quem vê acompanha a digitação.
			 */}
			<div className="jogo-linhas-da-fala">
				<Reservas frases={falasSeguidas} />
				<p className="jogo-fala" tabIndex={-1} data-foco="true">
					<span aria-hidden="true">
						{texto.slice(0, letras)}
						{completa ? null : <span className="jogo-cursor" />}
					</span>
					<span className="sr-only">
						{nome ?? "Narração"}. {texto}
					</span>
				</p>
			</div>
			<div className="jogo-acoes">
				<button
					type="button"
					className={classes(BOTAO_CONTINUAR, "jogo-botao")}
					onClick={semCliqueDuplo(agir)}
				>
					<span className="jogo-rotulo-do-botao">
						<Reservas frases={[rotulo, MOSTRAR_FALA]} />
						<span className="col-start-1 row-start-1">
							{completa ? rotulo : MOSTRAR_FALA}
						</span>
					</span>
				</button>
			</div>
		</div>
	);
}
