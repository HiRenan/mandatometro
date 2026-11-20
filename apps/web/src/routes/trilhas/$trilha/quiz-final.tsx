import { createFileRoute } from "@tanstack/react-router";
import { QuizFinal } from "@/components/piloto";
import { ENV } from "@/env";
import { buscarQuizFinal } from "@/lib/conteudo";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";
import { fraseDaChamada } from "@/lib/quiz";

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

// No piloto, o quiz final é também o depois (components/piloto.tsx).
function PaginaDoQuizFinal() {
	return (
		<QuizFinal pagina={Route.useLoaderData()} comApi={Boolean(ENV.API_URL)} />
	);
}
