import type { ReactNode } from "react";

export function FaixaDeInformacoes({ children }: { children: ReactNode }) {
	return (
		// biome-ignore lint/a11y/noRedundantRoles: com a frase inteira no filho em flex, o Edge só expõe o parágrafo com o papel explícito (#174).
		<p role="paragraph" className="rotulo">
			<span className="faixa">{children}</span>
		</p>
	);
}
