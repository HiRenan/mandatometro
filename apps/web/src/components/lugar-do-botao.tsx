import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { classes } from "@/lib/classes";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "./botao-continuar";

/**
 * O lugar de um botão "Continuar" que muda de texto, aparece ou some depois que
 * o JavaScript carrega: o da trilha ("Começar pelo primeiro artigo" vira
 * "Continuar de onde parou: …" e some com a trilha terminada) e o do quiz
 * ("Começar", "Continuar" e "Rever as respostas").
 *
 * O servidor não sabe o que a pessoa já leu ou respondeu. Por isso, cada texto
 * que o botão pode ter (`textos`) vem no HTML numa cópia invisível, com o mesmo
 * desenho, e todas ficam empilhadas no lugar do botão (o lugar-do-botao, no
 * index.css): o lugar tem sempre a altura do texto mais alto, com a letra e a
 * largura que a tela tiver, e nada embaixo dele pula. As cópias são só medida:
 * ficam fora do leitor de tela, do teclado e do ponteiro.
 */
export function LugarDoBotao({
	textos,
	className,
	children,
}: {
	/** Todos os textos que o botão pode mostrar neste lugar. */
	textos: readonly string[];
	className?: string;
	/** O botão de verdade, quando há um. */
	children?: ReactNode;
}) {
	return (
		<div className={classes("lugar-do-botao", className)}>
			{textos.map((texto) => (
				<span
					key={texto}
					aria-hidden="true"
					className={classes(BOTAO_CONTINUAR, "invisible")}
				>
					{texto}{" "}
					<ArrowRight
						aria-hidden="true"
						className={SETA_DO_BOTAO}
						strokeWidth={2.5}
					/>
				</span>
			))}
			{children}
		</div>
	);
}
