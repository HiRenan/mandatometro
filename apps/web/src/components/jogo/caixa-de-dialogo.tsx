import { useEffect, useRef, useState } from "react";
import { BOTAO_CONTINUAR } from "@/components/botao-continuar";
import { classes } from "@/lib/classes";
import { semCliqueDuplo } from "@/lib/clique";
import { tocar } from "@/lib/jogo/som";
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

export function CaixaDeDialogo({
	nome,
	quem,
	texto,
	aoAvancar,
	rotulo = "Continuar",
}: {
	/** O nome na placa. A narração não tem placa. */
	nome?: string;
	/** Quem fala, para o estilo da caixa. */
	quem: string;
	texto: string;
	aoAvancar: () => void;
	rotulo?: string;
}) {
	// A conta começa em zero também com o movimento reduzido: a fala inteira
	// entra no efeito, depois da hidratação, e o HTML do servidor não difere.
	const [letras, setLetras] = useState(0);
	const relogio = useRef<ReturnType<typeof setInterval>>(undefined);

	const completa = letras >= texto.length;

	useEffect(() => {
		const semMovimento =
			movimentoReduzido() || typeof Element.prototype.animate !== "function";
		if (semMovimento) {
			setLetras(texto.length);
			return;
		}
		tocar("texto");
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
	}, [texto]);

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
				onClick={semCliqueDuplo(agir)}
			/>
			<p className="jogo-placa" data-narracao={nome ? undefined : "true"}>
				{nome ?? "Narração"}
			</p>
			{/*
			 * O leitor de tela recebe a fala inteira na hora, e a máquina de
			 * escrever fica no pedaço que ele não lê: quem ouve não perde o fim da
			 * frase, e quem vê acompanha a digitação.
			 */}
			<p className="jogo-fala" tabIndex={-1} data-foco="true">
				<span aria-hidden="true">
					{texto.slice(0, letras)}
					{completa ? null : <span className="jogo-cursor" />}
				</span>
				<span className="sr-only">{texto}</span>
			</p>
			<div className="jogo-acoes">
				<button
					type="button"
					className={classes(BOTAO_CONTINUAR, "jogo-botao")}
					onClick={semCliqueDuplo(agir)}
				>
					{completa ? rotulo : "Mostrar a fala inteira"}
				</button>
			</div>
		</div>
	);
}
