import { createFileRoute } from "@tanstack/react-router";
import { PaginaInicial } from "@/components/pagina-inicial";
import { buscarInicio } from "@/lib/conteudo";
import { metaDaInicial, metaSemPagina } from "@/lib/meta";

export const Route = createFileRoute("/")({
	loader: () => buscarInicio(),
	head: ({ loaderData, match }) => ({
		meta: loaderData ? metaDaInicial() : metaSemPagina(match),
	}),
	component: Inicio,
});

function Inicio() {
	return <PaginaInicial pagina={Route.useLoaderData()} />;
}
