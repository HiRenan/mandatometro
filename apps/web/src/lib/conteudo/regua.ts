import type { CSSProperties } from "react";
import {
	type EstiloDeTitulo,
	LARGURAS_DAS_LETRAS,
	PARES_MAIS_LARGOS,
} from "./larguras-das-letras";

// A régua dos títulos com teto (o letra-com-teto do index.css): com a letra do
// navegador grande, o título diminui até a palavra mais larga dele caber na tela,
// e o --palavra é a largura dessa palavra, em em. O titulos.test.ts mede com ela
// os títulos do conteúdo; o tetoDoTitulo dá o --palavra de um título que vem de
// fora do código, como o de uma edição, que a API manda.

/**
 * A folga do teto: a palavra mais larga, mais 0,5%, cabe no --palavra. É a folga
 * do nome do site (nome-do-site.ts), para o arredondamento do navegador não partir
 * a palavra.
 */
export const FOLGA = 1.005;

/**
 * A largura de uma palavra, em em, pela soma das letras, mais o que cada par de letras
 * vizinhas passa da soma das duas no navegador (o kerning que afasta, como em "4–").
 * Os títulos vão em maiúsculas na tela (o text-transform do CSS), e a régua mede a
 * palavra como ela aparece.
 */
export function largura(palavra: string, estilo: EstiloDeTitulo): number {
	const letras: Record<string, number> = LARGURAS_DAS_LETRAS[estilo];
	const pares: Record<string, number> = PARES_MAIS_LARGOS[estilo];
	const maisLarga = Math.max(...Object.values(letras));
	let soma = 0;
	let anterior = "";
	for (const letra of palavra.normalize("NFC").toLocaleUpperCase("pt-BR")) {
		soma += (letras[letra] ?? maisLarga) + (pares[anterior + letra] ?? 0);
		anterior = letra;
	}
	return soma;
}

/** As palavras de um título, como a linha quebra: no espaço e depois do hífen. */
export function palavras(titulo: string): string[] {
	return titulo.match(/[^\s‐‑-]+[‐‑-]?/g) ?? [];
}

/**
 * O --palavra de um título que vem de fora do código: a palavra mais larga dele,
 * com a folga, em duas casas, arredondada para cima. Vai num `style`, porque um
 * [--palavra:N] escrito no código não acompanha um texto que muda. Um título sem
 * palavra fica com 1 em, a largura de uma letra larga.
 */
export function tetoDoTitulo(titulo: string, estilo: EstiloDeTitulo): number {
	const larguras = palavras(titulo).map((palavra) => largura(palavra, estilo));
	if (larguras.length === 0) {
		return 1;
	}
	return Math.ceil(Math.max(...larguras) * FOLGA * 100) / 100;
}

/**
 * O `style` de um título que vem de fora do código, com o tetoDoTitulo no
 * --palavra, que o letra-com-teto lê. A conta é a mesma no servidor e no
 * navegador, e o título não muda de tamanho na hidratação.
 */
export function estiloDoTeto(
	titulo: string,
	estilo: EstiloDeTitulo,
): CSSProperties {
	return { "--palavra": String(tetoDoTitulo(titulo, estilo)) } as CSSProperties;
}
