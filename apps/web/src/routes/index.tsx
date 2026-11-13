import { fontes } from "@mandatometro/ui/lib/fontes";
import { createFileRoute } from "@tanstack/react-router";
import { PaginaInicial } from "@/components/pagina-inicial";
import { buscarInicio } from "@/lib/conteudo";
import { metaDaInicial, metaSemPagina, preloadDaFonte } from "@/lib/meta";

export const Route = createFileRoute("/")({
	loader: () => buscarInicio(),
	head: ({ loaderData, match }) => ({
		meta: loaderData ? metaDaInicial() : metaSemPagina(match),
		// A frase em itálico do título usa a fonte do lema. A partir do md, a rota
		// raiz já pede essa fonte, para o cabeçalho; no celular, só esta página usa.
		links: [preloadDaFonte(fontes.italica, "(max-width: 47.99rem)")],
	}),
	component: Inicio,
});

function Inicio() {
	return <PaginaInicial pagina={Route.useLoaderData()} />;
}
