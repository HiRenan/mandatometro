// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.

import { AzulejoGrande } from "@/components/azulejo";
import { azulejoGrande } from "@/lib/azulejos";
import type { CasaNoCaminho } from "@/lib/jogo/partida";
import { simboloDoPasso } from "@/lib/simbolos";

/**
 * O caminho do projeto nas casas do jogo, com os mesmos azulejos do infográfico
 * "O caminho de um projeto de lei": o símbolo de cada passo (a folha, a mesa, o
 * hemiciclo, as duas Casas e a caneta), cru enquanto a partida não chegou ali e
 * com cor quando chega — as quatro peças viram em fila, como na trilha.
 *
 * O caminho de um projeto de lei tem cinco casas, e o de uma emenda, seis: a
 * linha ganha uma coluna por casa, pelo `--casas`, em vez de cinco fixas.
 *
 * O azulejo é desenho e fica fora do leitor de tela: quem ouve tem o nome da
 * casa e o "Você está aqui", em palavras (DESIGN.md).
 */
export function CaminhoDoProjeto({ casas }: { casas: CasaNoCaminho[] }) {
	return (
		<nav aria-label="O caminho do projeto" className="jogo-caminho">
			<ol
				role="list"
				style={{ "--casas": casas.length } as React.CSSProperties}
			>
				{casas.map((casa, indice) => (
					<li key={casa.nome} data-estado={casa.estado}>
						<AzulejoGrande
							className="jogo-azulejo"
							pecas={azulejoGrande(indice, indice % 5)}
							simbolo={simboloDoPasso(casa.nome)}
							cru={casa.estado === "adiante"}
						/>
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
