import { createFileRoute } from "@tanstack/react-router";
import { Jogo } from "@/components/jogo/jogo";
import { ENV } from "@/env";
import { buscarJogo } from "@/lib/jogo";
import { metaDaPagina } from "@/lib/meta";

// O Jogo das Comissões (docs/jogo-das-comissoes.md): a tramitação real do PL
// 104/2015, que virou a Lei 15.100/2025, em cinco cenas. O jogo fica fora da
// trilha, e o fim do quiz final leva até aqui, para a medição do piloto
// continuar como está.
export const Route = createFileRoute("/jogos")({
	loader: () => buscarJogo(),
	head: ({ loaderData }) => ({
		meta: metaDaPagina({
			titulo: loaderData?.titulo ?? "Jogos",
			descricao:
				loaderData?.resumo ??
				"Acompanhe o caminho real de um projeto de lei e decida o próximo passo.",
		}),
	}),
	component: PaginaDosJogos,
});

function PaginaDosJogos() {
	const jogo = Route.useLoaderData();
	return (
		<article className="jogo">
			<h1 className="titulo-condensado letra-com-teto [--palavra:4.49]">
				{jogo.titulo}
			</h1>
			<Jogo jogo={jogo} comApi={Boolean(ENV.API_URL)} />
		</article>
	);
}
