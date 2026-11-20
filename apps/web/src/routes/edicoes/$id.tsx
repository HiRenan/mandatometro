import { createFileRoute } from "@tanstack/react-router";
import { EdicaoNaoEncontrada } from "@/components/nao-encontrado";
import { PaginaDaEdicao } from "@/components/pagina-da-edicao";
import { buscarEdicao, type EdicaoDaPagina } from "@/lib/edicoes";
import { formatarPeriodo, plural } from "@/lib/formatar";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";

// A página de uma edição publicada (/edicoes/7). O servidor pede a edição à API,
// e ela já vem no HTML, com os itens, as fontes e o índice. O rascunho, a edição
// que não existe e o id que não pode ser de uma edição dão a página não
// encontrada, que leva de volta à lista.
export const Route = createFileRoute("/edicoes/$id")({
	loader: ({ params }) => buscarEdicao({ data: { id: params.id } }),
	head: ({ loaderData: pagina, match }) => ({
		meta: pagina ? metaDaEdicao(pagina) : metaSemPagina(match),
	}),
	notFoundComponent: EdicaoNaoEncontrada,
	component: Edicao,
});

/**
 * O título da aba e a prévia do link: o título da edição e o que ela traz. Sem a
 * API, a página fica com o título das edições, como a lista.
 */
function metaDaEdicao(pagina: EdicaoDaPagina) {
	if (pagina.tipo === "sem-api") {
		return metaDaPagina({
			titulo: "Edições",
			descricao:
				"As votações do Congresso e os destaques do Diário Oficial, em linguagem simples, com a fonte oficial de cada item.",
		});
	}
	const { edicao } = pagina;
	const itens = edicao.itens.length;
	const assunto = edicao.itens.some((item) => item.tipo === "ato")
		? "Os destaques"
		: "O que o Congresso votou";
	return metaDaPagina({
		titulo: edicao.titulo,
		descricao: `${assunto} de ${formatarPeriodo(edicao.inicio, edicao.fim)}, em ${plural(itens, "item", "itens")} em linguagem simples, com a fonte oficial${itens === 1 ? "" : " de cada um"}.`,
		tipo: "article",
	});
}

function Edicao() {
	return <PaginaDaEdicao pagina={Route.useLoaderData()} />;
}
