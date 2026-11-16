import { createFileRoute } from "@tanstack/react-router";
import { Quiz } from "@/components/quiz";
import { buscarQuizFinal } from "@/lib/conteudo";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";
import { fraseDaChamada } from "@/lib/quiz";
import { idDoQuizFinal } from "@/lib/respostas-do-quiz";

// O quiz final, depois do último artigo, com perguntas da trilha toda. O nome
// do endereço é reservado: nenhum artigo pode se chamar quiz-final
// (docs/conteudo-das-trilhas.md). Uma trilha sem quiz-final.md não tem esta
// página: o endereço dá a página não encontrada.
export const Route = createFileRoute("/trilhas/$trilha/quiz-final")({
	loader: ({ params }) => buscarQuizFinal({ data: { trilha: params.trilha } }),
	head: ({ loaderData: pagina, match }) => ({
		meta: pagina
			? metaDaPagina({
					titulo: `Quiz final · ${pagina.trilha.titulo}`,
					descricao: fraseDaChamada(
						pagina.perguntas.length,
						pagina.perguntas.map((pergunta) => pergunta.artigo.posicao),
					),
				})
			: metaSemPagina(match),
	}),
	component: PaginaDoQuizFinal,
});

function PaginaDoQuizFinal() {
	const pagina = Route.useLoaderData();
	// A chave zera o quiz quando a pessoa passa para o de outra trilha.
	return (
		<Quiz
			key={pagina.trilha.slug}
			{...pagina}
			titulo="Quiz final"
			quiz={idDoQuizFinal(pagina.trilha.slug)}
		/>
	);
}
