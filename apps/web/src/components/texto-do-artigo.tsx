import { Markdown } from "markdown-to-jsx/react";
import { Fragment } from "react";

const opcoes = {
	// O conteúdo vem do repositório, mas HTML solto no Markdown não vira HTML na página.
	disableParsingRawHTML: true,
	forceBlock: true,
	wrapper: Fragment,
};

/** O corpo do artigo, do Markdown para React, sem dangerouslySetInnerHTML. */
export function TextoDoArtigo({ corpo }: { corpo: string }) {
	return (
		<div className="texto">
			<Markdown options={opcoes}>{corpo}</Markdown>
		</div>
	);
}
