import { createFileRoute } from "@tanstack/react-router";
import { Quiz } from "@/components/quiz";
import { buscarQuiz } from "@/lib/conteudo";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";
import { fraseDaChamada } from "@/lib/quiz";

// O quiz da trilha, numa página própria (o Renan, na #37: "Página própria"). Uma
// trilha sem quiz.md não tem esta página: o endereço dá a página não encontrada.
export const Route = createFileRoute("/trilhas/$trilha/quiz")({
	loader: ({ params }) => buscarQuiz({ data: { trilha: params.trilha } }),
	head: ({ loaderData: pagina, match }) => ({
		meta: pagina
			? metaDaPagina({
					titulo: `Quiz · ${pagina.trilha.titulo}`,
					descricao: fraseDaChamada(
						pagina.perguntas.length,
						pagina.perguntas.map((pergunta) => pergunta.artigo.posicao),
					),
				})
			: metaSemPagina(match),
	}),
	component: PaginaDoQuiz,
});

function PaginaDoQuiz() {
	const pagina = Route.useLoaderData();
	// A chave zera o quiz quando a pessoa passa para o de outra trilha.
	return <Quiz key={pagina.trilha.slug} {...pagina} />;
}
