import { createFileRoute } from "@tanstack/react-router";
import { PaginaInicial } from "@/components/pagina-inicial";
import { buscarInicio } from "@/lib/conteudo";

export const Route = createFileRoute("/")({
	loader: () => buscarInicio(),
	component: Inicio,
});

function Inicio() {
	return <PaginaInicial pagina={Route.useLoaderData()} />;
}
