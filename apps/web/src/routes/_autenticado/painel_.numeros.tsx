import { createFileRoute } from "@tanstack/react-router";
import { PaginaDosNumeros } from "@/components/painel/pagina-dos-numeros";
import { buscarTrilhas } from "@/lib/conteudo";

// Os números do site e do sistema, só para a administradora. A guarda, o head
// do robots e os headers ficam no layout (routes/_autenticado.tsx); o título
// da aba só aparece no navegador, depois da guarda. O "_" de painel_ deixa a
// página ao lado da revisão, e não dentro dela.
export const Route = createFileRoute("/_autenticado/painel_/numeros")({
	head: () => ({ meta: [{ title: "Números do site | Mandatômetro" }] }),
	// O nome e a ordem das trilhas vêm do catálogo do site. Sem ele, cada trilha
	// aparece pelo slug que a API manda, e a página não cai.
	loader: async () => {
		try {
			const trilhas = await buscarTrilhas();
			return trilhas.map(({ slug, titulo }) => ({ slug, titulo }));
		} catch {
			return [];
		}
	},
	component: Numeros,
});

function Numeros() {
	return <PaginaDosNumeros catalogo={Route.useLoaderData()} />;
}
