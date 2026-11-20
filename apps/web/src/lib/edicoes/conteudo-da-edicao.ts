import type { ArtigoDaEdicao, FontePublica } from "@/client";

// O que a página de uma edição faz com o texto da API antes de mostrar: os
// parágrafos, as fontes agrupadas e os links conferidos. O texto vai sempre como
// texto, nunca como HTML, e um endereço que não passa fica sem link.

/** Os parágrafos do texto de um item, separados pela linha em branco. */
export function paragrafos(texto: string): string[] {
	return texto
		.split(/\n\s*\n/)
		.map((paragrafo) => paragrafo.trim())
		.filter(Boolean);
}

/** Um endereço das fontes de um item, com cada coleta dele. */
export type GrupoDeFontes = { url: string; coletas: FontePublica[] };

/**
 * As fontes de um item agrupadas pelo endereço, na ordem em que a API manda, como
 * no e-mail (o formatar_edicao do backend): o primeiro endereço é a fonte
 * oficial, os outros são outras referências, e a mesma página coletada de novo
 * fica junto da primeira coleta.
 */
export function fontesPorEndereco(fontes: FontePublica[]): GrupoDeFontes[] {
	const grupos = new Map<string, FontePublica[]>();
	for (const fonte of fontes) {
		const coletas = grupos.get(fonte.url);
		if (coletas) {
			coletas.push(fonte);
		} else {
			grupos.set(fonte.url, [fonte]);
		}
	}
	return Array.from(grupos, ([url, coletas]) => ({ url, coletas }));
}

/** Os sites oficiais das fontes: os mesmos do e-mail e do validador das trilhas. */
const DOMINIOS_OFICIAIS = ["gov.br", "leg.br", "jus.br", "mp.br", "def.br"];

/**
 * O endereço do link de uma fonte, conferido como no e-mail: http ou https, sem
 * usuário nem senha, sem espaço nem caractere de controle, num site oficial. A
 * API já confere antes de publicar; aqui, o que não passa fica sem link, em vez
 * de virar um link para outro lugar.
 */
export function enderecoSeguro(url: string): string | null {
	if (Array.from(url).some((letra) => /\s/.test(letra) || letra < " ")) {
		return null;
	}
	let endereco: URL;
	try {
		endereco = new URL(url);
	} catch {
		return null;
	}
	const site = endereco.hostname;
	const oficial = DOMINIOS_OFICIAIS.some(
		(dominio) => site === dominio || site.endsWith(`.${dominio}`),
	);
	const esquema =
		endereco.protocol === "https:" || endereco.protocol === "http:";
	return esquema && oficial && !endereco.username && !endereco.password
		? endereco.href
		: null;
}

const CAMINHO_DA_TRILHA = /^\/trilhas\/([a-z0-9-]+)\/([a-z0-9-]+)$/;

/**
 * O artigo da trilha que explica um item, para o "Entenda na trilha": só um
 * caminho /trilhas/<trilha>/<artigo> deste site. Outro caminho fica sem link.
 */
export function caminhoDaTrilha(
	artigo: ArtigoDaEdicao | null,
): { trilha: string; artigo: string } | null {
	const partes = artigo && CAMINHO_DA_TRILHA.exec(artigo.caminho);
	return partes ? { trilha: partes[1], artigo: partes[2] } : null;
}
