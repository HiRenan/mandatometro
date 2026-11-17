import { createFileRoute } from "@tanstack/react-router";
import { EdicaoNaoEncontrada } from "@/components/nao-encontrado";
import { PaginaDasEdicoes } from "@/components/pagina-das-edicoes";
import {
	buscarEdicoes,
	type PaginaDaLista,
	paginaDaBusca,
} from "@/lib/edicoes";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";

// A lista das edições publicadas, 20 por página (?pagina=2). O servidor pede a
// página à API, e a lista já vem no HTML, com os links das páginas vizinhas. Uma
// página inválida no endereço abre a primeira; a página depois da última dá a
// página não encontrada, que leva de volta à lista.
export const Route = createFileRoute("/edicoes/")({
	// O roteador lê "?pagina=2" como número; a primeira página e o valor inválido
	// ficam sem número.
	validateSearch: (busca: Record<string, unknown>): { pagina?: number } => ({
		pagina: paginaDaBusca(busca.pagina),
	}),
	loaderDeps: ({ search }) => ({ pagina: search.pagina ?? 1 }),
	loader: ({ deps }) => buscarEdicoes({ data: { pagina: deps.pagina } }),
	head: ({ loaderData: lista, match }) => ({
		meta: lista
			? metaDaPagina({ titulo: tituloDaLista(lista), descricao: DESCRICAO })
			: metaSemPagina(match),
	}),
	notFoundComponent: EdicaoNaoEncontrada,
	component: Edicoes,
});

const DESCRICAO =
	"O que o Congresso votou em cada semana, em linguagem simples, com a fonte oficial de cada item.";

/** O título da aba: a partir da segunda página, com o número dela. */
function tituloDaLista(lista: PaginaDaLista): string {
	return lista.tipo === "lista" && lista.pagina > 1
		? `Edições (página ${lista.pagina})`
		: "Edições";
}

function Edicoes() {
	return <PaginaDasEdicoes lista={Route.useLoaderData()} />;
}
