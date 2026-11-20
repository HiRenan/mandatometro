import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { type CSSProperties, useId } from "react";
import { azulejoGrande } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import type { ChamadaDoQuiz as Chamada } from "@/lib/conteudo";
import { colunasDoMosaico, fraseDaChamada } from "@/lib/quiz";
import { AzulejoGrande } from "./azulejo";
import { BOTAO_CONTINUAR, SETA_DO_BOTAO } from "./botao-continuar";

/**
 * A chamada para o quiz da trilha, no fim do artigo depois do qual ele aparece
 * e na página da trilha, ou para o quiz final, no fim do último artigo e na
 * página da trilha: uma folha com o título, a frase que diz quantas perguntas
 * ele tem e de quais artigos, o botão e um azulejo por pergunta. Os azulejos
 * seguem a ordem das perguntas, e não dizem nada sobre acertos.
 */
export function ChamadaDoQuiz({
	trilha,
	quiz,
	final = false,
	className,
}: {
	/** O slug da trilha. */
	trilha: string;
	quiz: Chamada;
	/** Se é a chamada do quiz final, que vem depois do último artigo. */
	final?: boolean;
	className?: string;
}) {
	// Na página da trilha, as duas chamadas ficam juntas: cada região tem o nome
	// do próprio título.
	const titulo = useId();
	return (
		<section
			aria-labelledby={titulo}
			className={classes("chamada-quiz", className)}
		>
			<div className="chamada-texto">
				{/* Com a letra grande, o título cresce até "TRILHA", a palavra mais
				    larga dos títulos dos quizzes, encostar nas margens (o
				    letra-com-teto do index.css). */}
				<h2
					id={titulo}
					className="titulo-condensado letra-com-teto [--palavra:2.74]"
				>
					{final ? "Quiz final" : "Quiz da trilha"}
				</h2>
				<p>{fraseDaChamada(quiz.perguntas, quiz.artigos)}</p>
				<Link
					to={final ? "/trilhas/$trilha/quiz-final" : "/trilhas/$trilha/quiz"}
					params={{ trilha }}
					className={BOTAO_CONTINUAR}
				>
					{final ? "Responder o quiz final" : "Responder o quiz"}{" "}
					<ArrowRight
						aria-hidden="true"
						className={SETA_DO_BOTAO}
						strokeWidth={2.5}
					/>
				</Link>
			</div>
			<span
				aria-hidden="true"
				className="chamada-azulejos"
				style={
					{ "--colunas": colunasDoMosaico(quiz.perguntas) } as CSSProperties
				}
			>
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
