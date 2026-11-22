import { createFileRoute } from "@tanstack/react-router";
import { ParlamentarNaoEncontrado } from "@/components/nao-encontrado";
import { PaginaDosParlamentares } from "@/components/pagina-dos-parlamentares";
import { plural } from "@/lib/formatar";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";
import {
	buscarParlamentares,
	estadoDaSigla,
	type ListaDosParlamentares,
	ufDaBusca,
} from "@/lib/parlamentares";

// Os parlamentares por estado (/parlamentares e /parlamentares?uf=SC). O servidor
// pede a lista à API, e o mapa e os nomes do estado já vêm no HTML. Uma sigla que
// não é estado abre o mapa, como o endereço sem ?uf.
export const Route = createFileRoute("/parlamentares/")({
	validateSearch: (busca: Record<string, unknown>): { uf?: string } => ({
		uf: ufDaBusca(busca.uf),
	}),
	loaderDeps: ({ search }) => ({ uf: search.uf }),
	loader: ({ deps }) => buscarParlamentares({ data: { uf: deps.uf } }),
	head: ({ loaderData: lista, match }) => ({
		meta: lista ? metaDaLista(lista) : metaSemPagina(match),
	}),
	notFoundComponent: ParlamentarNaoEncontrado,
	component: Parlamentares,
});

const DESCRICAO =
	"Os deputados federais e os senadores de cada estado e como cada um votou nas votações do Congresso.";

/** O título da aba e a prévia do link: com um estado, o nome e as contas dele. */
function metaDaLista(lista: ListaDosParlamentares) {
	const escolhido = lista.tipo === "lista" ? lista.escolhido : null;
	const estado = escolhido && estadoDaSigla(escolhido.sigla);
	if (!estado || !escolhido) {
		return metaDaPagina({ titulo: "Parlamentares", descricao: DESCRICAO });
	}
	return metaDaPagina({
		titulo: `Parlamentares ${estado.comPreposicao}`,
		descricao: `${plural(escolhido.camara.length, "deputado federal", "deputados federais")} e ${plural(escolhido.senado.length, "senador", "senadores")} ${estado.comPreposicao} em exercício, com o partido e como cada um votou.`,
	});
}

function Parlamentares() {
	return <PaginaDosParlamentares lista={Route.useLoaderData()} />;
}
