import { createFileRoute } from "@tanstack/react-router";
import { useRef } from "react";
import { Jogo } from "@/components/jogo/jogo";
import { ENV } from "@/env";
import { buscarJogo } from "@/lib/jogo";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";

// A página de um jogo (/jogos/comissoes). O Jogo das Comissões
// (docs/jogo-das-comissoes.md) conta a tramitação real do PL 104/2015, que
// virou a Lei 15.100/2025, em cinco cenas. O jogo fica fora da trilha, e o fim
// do quiz final leva direto até aqui, para a medição do piloto continuar como
// está. O endereço que não é de um jogo dá a página não encontrada.
export const Route = createFileRoute("/jogos/$jogo")({
	loader: ({ params }) => buscarJogo({ data: { jogo: params.jogo } }),
	head: ({ loaderData, match }) => ({
		meta: loaderData
			? metaDaPagina({
					titulo: loaderData.titulo,
					descricao: loaderData.resumo,
				})
			: metaSemPagina(match),
	}),
	component: PaginaDoJogo,
});

function PaginaDoJogo() {
	const jogo = Route.useLoaderData();
	const tituloRef = useRef<HTMLHeadingElement>(null);
	return (
		<article className="jogo">
			<h1
				className="titulo-condensado letra-com-teto [--palavra:4.49]"
				ref={tituloRef}
			>
				{jogo.titulo}
			</h1>
			<Jogo
				key={jogo.slug}
				jogo={jogo}
				comApi={Boolean(ENV.API_URL)}
				tituloRef={tituloRef}
			/>
		</article>
	);
}
