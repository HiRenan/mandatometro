// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.

import type { CasaNoCaminho } from "@/lib/jogo/partida";

/**
 * O caminho do projeto nas cinco casas, na linguagem do infográfico "O caminho
 * de um projeto de lei": o nome de cada casa em palavras e a de agora marcada
 * também em palavras, não uma barra que enche (DESIGN.md).
 */
export function CaminhoDoProjeto({ casas }: { casas: CasaNoCaminho[] }) {
	return (
		<nav aria-label="O caminho do projeto" className="jogo-caminho">
			<ol role="list">
				{casas.map((casa) => (
					<li key={casa.nome} data-estado={casa.estado}>
						<span className="jogo-casa">{casa.nome}</span>
						{casa.estado === "agora" ? (
							<span className="jogo-aqui">Você está aqui</span>
						) : null}
						{casa.estado === "atras" ? (
							<span className="sr-only">Já passou</span>
						) : null}
					</li>
				))}
			</ol>
		</nav>
	);
}
