import { type CSSProperties, Fragment } from "react";

/**
 * As palavras de um título, cada uma na sua caixa, para tombarem no lugar uma a
 * uma, como azulejos (estilos/movimento.css). O `de` é a vez da primeira palavra,
 * para a segunda linha do título continuar a fila da primeira.
 *
 * O leitor de tela leria cada caixa como um item à parte. Por isso, quem usa
 * este componente põe o texto corrido no `aria-label` do título e deixa as
 * caixas fora do leitor de tela (`aria-hidden`).
 */
export function Palavras({ texto, de = 0 }: { texto: string; de?: number }) {
	return texto.split(" ").map((palavra, vez) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: as palavras ficam fixas, na ordem do título, e só a posição não se repete (uma palavra pode, como "de").
		<Fragment key={vez}>
			{vez > 0 && " "}
			<span className="palavra" style={{ "--i": de + vez } as CSSProperties}>
				{palavra}
			</span>
		</Fragment>
	));
}
