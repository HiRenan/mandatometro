import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { azulejoGrande } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import type { ChamadaDoQuiz as Chamada } from "@/lib/conteudo";
import { fraseDaChamada } from "@/lib/quiz";
import { AzulejoGrande } from "./azulejo";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "./botao-continuar";

/**
 * A chamada para o quiz da trilha, no fim do artigo depois do qual ele aparece
 * e na página da trilha: uma folha com o título, a frase que diz quantas
 * perguntas ele tem e de quais artigos, o botão e um azulejo por pergunta. Os
 * azulejos seguem a ordem das perguntas, e não dizem nada sobre acertos.
 */
export function ChamadaDoQuiz({
	trilha,
	quiz,
	className,
}: {
	/** O slug da trilha. */
	trilha: string;
	quiz: Chamada;
	className?: string;
}) {
	return (
		<section
			aria-labelledby="quiz-da-trilha"
			className={classes("chamada-quiz", className)}
		>
			<div className="chamada-texto">
				<h2
					id="quiz-da-trilha"
					className="titulo-condensado letra-com-teto [--palavra:2.74]"
				>
					Quiz da trilha
				</h2>
				<p>{fraseDaChamada(quiz.perguntas, quiz.artigos)}</p>
				<Link
					to="/trilhas/$trilha/quiz"
					params={{ trilha }}
					className={BOTAO_CONTINUAR}
				>
					Responder o quiz{" "}
					<ArrowRight
						aria-hidden="true"
						className={SETA_DO_BOTAO}
						strokeWidth={2.5}
					/>
				</Link>
			</div>
			<span aria-hidden="true" className="chamada-azulejos">
				{Array.from({ length: quiz.perguntas }, (_, pergunta) => (
					<AzulejoGrande
						// biome-ignore lint/suspicious/noArrayIndexKey: um azulejo por pergunta, na ordem delas.
						key={pergunta}
						pecas={azulejoGrande(pergunta, pergunta % 6)}
					/>
				))}
			</span>
		</section>
	);
}
