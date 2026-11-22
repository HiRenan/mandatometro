import { createFileRoute, redirect } from "@tanstack/react-router";
import { ParlamentarNaoEncontrado } from "@/components/nao-encontrado";
import { PaginaDoParlamentar } from "@/components/pagina-do-parlamentar";
import { paginaDaBusca } from "@/lib/edicoes";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";
import {
	buscarParlamentar,
	enderecoDoParlamentar,
	estadoDaSigla,
	type PaginaDoParlamentar as Pagina,
} from "@/lib/parlamentares";
import { NOME_DA_CASA } from "@/lib/parlamentares/votos";

// A página de um parlamentar (/parlamentares/81-agata-cedrolume), com os votos
// em páginas de 20 (?pagina=2). O servidor pede a pessoa e a página de votos à
// API, e tudo já vem no HTML. O endereço só com o id, ou com um nome que não é
// o dela, leva ao endereço certo por um redirecionamento permanente (301), com a
// mesma página de votos: um link antigo continua valendo, e o buscador guarda
// um endereço só.
export const Route = createFileRoute("/parlamentares/$id")({
	validateSearch: (busca: Record<string, unknown>): { pagina?: number } => ({
		pagina: paginaDaBusca(busca.pagina),
	}),
	loaderDeps: ({ search }) => ({ pagina: search.pagina ?? 1 }),
	loader: async ({ params, deps }) => {
		const pagina = await buscarParlamentar({
			data: { id: params.id, pagina: deps.pagina },
		});
		if (pagina.tipo === "parlamentar") {
			const certo = enderecoDoParlamentar(pagina.parlamentar);
			if (params.id !== certo) {
				throw redirect({
					to: "/parlamentares/$id",
					params: { id: certo },
					search: deps.pagina > 1 ? { pagina: deps.pagina } : {},
					statusCode: 301,
				});
			}
		}
		return pagina;
	},
	head: ({ loaderData: pagina, match }) => ({
		meta: pagina ? metaDoParlamentar(pagina) : metaSemPagina(match),
	}),
	notFoundComponent: ParlamentarNaoEncontrado,
	component: Parlamentar,
});

/**
 * O título da aba e a prévia do link: o nome, a Casa, o estado e o partido. A
 * partir da segunda página de votos, o título leva o número dela. Sem a API, a
 * página fica com o título da lista.
 */
function metaDoParlamentar(pagina: Pagina) {
	if (pagina.tipo === "sem-api") {
		return metaDaPagina({
			titulo: "Parlamentares",
			descricao:
				"Os deputados federais e os senadores de cada estado e como cada um votou nas votações do Congresso.",
		});
	}
	const { parlamentar } = pagina;
	const partes = [
		NOME_DA_CASA[parlamentar.casa],
		estadoDaSigla(parlamentar.uf)?.nome,
		parlamentar.partido,
	].filter(Boolean);
	return metaDaPagina({
		titulo:
			pagina.pagina > 1
				? `${parlamentar.nome} (página ${pagina.pagina})`
				: parlamentar.nome,
		descricao: `${partes.join(", ")}. Os mandatos, como votou e cada voto registrado, com a página oficial de cada votação.`,
	});
}

function Parlamentar() {
	return <PaginaDoParlamentar pagina={Route.useLoaderData()} />;
}
