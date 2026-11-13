import { fontes } from "@mandatometro/ui/lib/fontes";
import { createFileRoute } from "@tanstack/react-router";
import { PaginaInicial } from "@/components/pagina-inicial";
import { buscarInicio } from "@/lib/conteudo";
import { metaDaInicial, metaSemPagina, preloadDaFonte } from "@/lib/meta";

export const Route = createFileRoute("/")({
	loader: () => buscarInicio(),
	head: ({ loaderData, match }) => ({
		meta: loaderData ? metaDaInicial() : metaSemPagina(match),
		// A frase do título usa a letra de máquina do lema. A partir de 864 px, a
		// rota raiz já adianta essa fonte, para o cabeçalho; abaixo disso, só esta
		// página a adianta, porque nas outras ela só aparece no rodapé.
		links: [preloadDaFonte(fontes.maquina, "(max-width: 53.99rem)")],
	}),
	component: Inicio,
});

function Inicio() {
	return <PaginaInicial pagina={Route.useLoaderData()} />;
}
