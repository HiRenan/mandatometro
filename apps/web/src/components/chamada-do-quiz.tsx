import { Link } from "@tanstack/react-router";
import type { ChamadaDoQuiz as Chamada } from "@/lib/conteudo";
import { fraseDaChamada } from "@/lib/quiz";

/**
 * A chamada para o quiz da trilha, no fim do artigo depois do qual ele aparece
 * e na página da trilha. Usa só peças que já existem: o título das fontes
 * oficiais e a ação em texto. O desenho do quiz fica com a #89.
 */
export function ChamadaDoQuiz({
	trilha,
	quiz,
	className = "",
}: {
	/** O slug da trilha. */
	trilha: string;
	quiz: Chamada;
	className?: string;
}) {
	return (
		<section
			aria-labelledby="quiz-da-trilha"
			className={`border-tinta border-t-2 pt-4 ${className}`}
		>
			<h2
				id="quiz-da-trilha"
				className="subtitulo-condensado text-[1.625rem] xl:text-[2rem]"
			>
				Quiz da trilha
			</h2>
			<p className="mt-3 max-w-[52ch] font-serif text-lg leading-snug">
				{fraseDaChamada(quiz.perguntas, quiz.artigos)}
			</p>
			<p className="mt-3">
				<Link
					to="/trilhas/$trilha/quiz"
					params={{ trilha }}
					className="acao-de-texto"
				>
					<span>Responder o quiz</span>
				</Link>
			</p>
		</section>
	);
}
