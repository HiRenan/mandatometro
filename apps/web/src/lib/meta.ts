type Pagina = {
	titulo: string;
	descricao: string;
	tipo?: "website" | "article";
};

/**
 * O título da aba, a descrição e as tags do Open Graph, que viram a prévia do
 * link no WhatsApp e nas redes. O nome do site e o idioma vêm da rota raiz.
 */
export function metaDaPagina({ titulo, descricao, tipo = "website" }: Pagina) {
	return [
		{ title: `${titulo} · Mandatômetro` },
		{ name: "description", content: descricao },
		{ property: "og:title", content: titulo },
		{ property: "og:description", content: descricao },
		{ property: "og:type", content: tipo },
	];
}

export const TITULO_NAO_ENCONTRADA = "Página não encontrada · Mandatômetro";
export const TITULO_DE_ERRO = "Erro ao carregar a página · Mandatômetro";

/**
 * O título de uma página que ficou sem os dados: ou ela não existe, ou o pedido ao
 * servidor falhou e a página de erro está no lugar dela.
 */
export function metaSemPagina(match: { status: string }) {
	return [
		{
			title: match.status === "error" ? TITULO_DE_ERRO : TITULO_NAO_ENCONTRADA,
		},
	];
}
