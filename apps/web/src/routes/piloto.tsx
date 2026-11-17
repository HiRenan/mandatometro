import { createFileRoute } from "@tanstack/react-router";
import { PaginaDoPiloto } from "@/components/piloto";
import { ENV } from "@/env";
import { buscarQuizFinal } from "@/lib/conteudo";
import { metaDaPagina } from "@/lib/meta";
import { TRILHA_DO_PILOTO } from "@/lib/piloto";

// A página do piloto (docs/medicao-do-piloto.md): o antes, com as perguntas do
// quiz final da trilha do piloto, antes de ler a trilha. O endereço é dado a
// quem participa, e nenhum menu leva até ele: a página fica fora dos
// buscadores. Os dados são os da página do quiz final, com a certa de cada
// pergunta, que a tela só usa para contar os acertos.
export const Route = createFileRoute("/piloto")({
	loader: () => buscarQuizFinal({ data: { trilha: TRILHA_DO_PILOTO } }),
	head: () => ({
		meta: [
			...metaDaPagina({
				titulo: "Piloto",
				descricao:
					"A primeira etapa do piloto do Mandatômetro: 12 perguntas sobre como nasce uma lei, antes de ler a trilha.",
			}),
			{ name: "robots", content: "noindex" },
		],
	}),
	headers: () => ({ "X-Robots-Tag": "noindex" }),
	component: Piloto,
});

function Piloto() {
	return (
		<PaginaDoPiloto
			pagina={Route.useLoaderData()}
			comApi={Boolean(ENV.API_URL)}
		/>
	);
}
