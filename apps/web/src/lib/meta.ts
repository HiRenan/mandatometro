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

export const META_NAO_ENCONTRADA = [
	{ title: "Página não encontrada · Mandatômetro" },
];
