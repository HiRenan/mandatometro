import { createFileRoute } from "@tanstack/react-router";
import { ParlamentarNaoEncontrado } from "@/components/nao-encontrado";
import { PaginaDaVotacao } from "@/components/pagina-da-votacao";
import { formatarData } from "@/lib/formatar";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";
import {
	buscarVotacao,
	type PaginaDaVotacao as Pagina,
	ufDaBusca,
} from "@/lib/parlamentares";
import {
	type Filtro,
	NOME_DA_CASA,
	partidoDaBusca,
	RESULTADO,
	tituloDaVotacao,
} from "@/lib/parlamentares/votos";

// A página de uma votação (/votacoes/139), com quem votou como. O servidor pede
// a votação à API, com a lista nominal inteira, e tudo já vem no HTML. O filtro
// (?uf=SC&partido=PFT) só muda o que a página mostra: o loader não depende dele,
// e a votação não é pedida de novo quando ele muda. O shouldReload segura também
// o mesmo filtro enviado de novo, que leva ao mesmo endereço: nele, o router
// rodaria o loader outra vez. O "Tentar de novo" da página de erro continua
// pedindo, porque o invalidate passa por cima dele.
export const Route = createFileRoute("/votacoes/$id")({
	validateSearch: (busca: Record<string, unknown>): Filtro => ({
		uf: ufDaBusca(busca.uf),
		partido: partidoDaBusca(busca.partido),
	}),
	loader: ({ params }) => buscarVotacao({ data: { id: params.id } }),
	shouldReload: false,
	head: ({ loaderData: pagina, match }) => ({
		meta: pagina ? metaDaVotacao(pagina) : metaSemPagina(match),
	}),
	notFoundComponent: ParlamentarNaoEncontrado,
	component: Votacao,
});

/** O título da aba e a prévia do link: a proposição, a Casa, o dia e o resultado. */
function metaDaVotacao(pagina: Pagina) {
	if (pagina.tipo === "sem-api") {
		return metaDaPagina({
			titulo: "Parlamentares",
			descricao:
				"Os deputados federais e os senadores de cada estado e como cada um votou nas votações do Congresso.",
		});
	}
	const { votacao } = pagina;
	return metaDaPagina({
		titulo: tituloDaVotacao(votacao),
		descricao: `${NOME_DA_CASA[votacao.casa]}, ${formatarData(votacao.data.slice(0, 10))}: ${RESULTADO[votacao.resultado].toLocaleLowerCase("pt-BR")}. O placar, o placar por partido e quem votou como, com a página oficial da votação.`,
	});
}

function Votacao() {
	return (
		<PaginaDaVotacao
			pagina={Route.useLoaderData()}
			filtro={Route.useSearch()}
		/>
	);
}
