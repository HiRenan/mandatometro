/**
 * O texto do artigo. O HTML chega pronto do servidor, convertido do Markdown do
 * repositório sem interpretar HTML solto (lib/conteudo/paginas.server.ts): assim
 * o conversor de Markdown não pesa no navegador.
 */
export function TextoDoArtigo({ html }: { html: string }) {
	return (
		<div
			className="texto"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: o HTML vem do Markdown do repositório, convertido no servidor com o HTML solto desligado.
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
