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

const DESCRICAO_DA_INICIAL =
	"Entenda a política brasileira, um passo de cada vez, em artigos curtos e em linguagem simples, com a fonte oficial em cada explicação.";

/**
 * A página inicial: a aba mostra o nome e o lema do site; a prévia do link, a
 * frase da página.
 */
export function metaDaInicial() {
	return [
		{ title: "Mandatômetro · o diário oficial político, simplificado" },
		{ name: "description", content: DESCRICAO_DA_INICIAL },
		{
			property: "og:title",
			content:
				"Mandatômetro: entenda a política brasileira, um passo de cada vez",
		},
		{ property: "og:description", content: DESCRICAO_DA_INICIAL },
		{ property: "og:type", content: "website" },
	];
}

/**
 * A imagem da prévia do link, a mesma em todas as páginas (public/previa.png,
 * que sai de imagens/gerar.mjs). O WhatsApp e as redes só acham a imagem pelo
 * endereço completo, com o do site na frente (APP_BASE_URL).
 */
export function metaDaImagem(enderecoDoSite: string) {
	return [
		{
			property: "og:image",
			content: new URL("/previa.png", enderecoDoSite).href,
		},
		{ property: "og:image:width", content: "1200" },
		{ property: "og:image:height", content: "630" },
		{ property: "og:image:type", content: "image/png" },
		{
			property: "og:image:alt",
			content:
				"Mandatômetro, o diário oficial político, simplificado. Entenda a política brasileira, um passo de cada vez.",
		},
		{ name: "twitter:card", content: "summary_large_image" },
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
