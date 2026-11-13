import { createFileRoute } from "@tanstack/react-router";
import { Caminho } from "@/components/caminho";
import { Quiz } from "@/components/quiz";
import { buscarQuiz } from "@/lib/conteudo";
import { plural } from "@/lib/formatar";
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

	return (
		<div className="px-margem-celular mx-auto max-w-[1440px] pb-20 md:px-16">
			<Caminho trilha={pagina.trilha} />
			<div className="mt-8 max-w-[56rem]">
				<h1 className="titulo-condensado letra-com-teto [--letra:3rem] [--palavra:4.82] md:text-[4.75rem]">
					Quiz da trilha
				</h1>
				<p className="mt-5 max-w-[40ch] font-serif text-xl leading-snug font-medium lg:text-[1.5625rem] lg:leading-[1.4]">
					Em cada pergunta, escolha uma opção e responda. Você vê se acertou, a
					resposta certa, a explicação e a fonte oficial.
				</p>
				<p className="border-tinta mt-5 flex flex-wrap gap-x-7 gap-y-1 border-y-2 py-3 text-[1.0625rem] font-semibold">
					<span>
						{plural(pagina.perguntas.length, "pergunta", "perguntas")}
					</span>
					<span>Fonte oficial em cada resposta</span>
				</p>
				{/* A chave zera o quiz quando a pessoa passa para o de outra trilha. */}
				<Quiz key={pagina.trilha.slug} {...pagina} />
			</div>
		</div>
	);
}
