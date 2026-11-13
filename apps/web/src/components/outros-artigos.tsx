import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { azulejoDaPosicao } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { classeDaFita } from "@/lib/formatar";
import { AzulejoGrande } from "./azulejo";

/** Um artigo vizinho: o título, o endereço e a posição dele na trilha, a partir de 1. */
type Vizinho = { slug: string; titulo: string; posicao: number };

/**
 * O título de uma faixa. Com a letra grande, ele cresce até "FUNDAMENTAIS?", a
 * palavra mais larga dos títulos dos artigos, encostar nas bordas da faixa (o
 * letra-com-teto do index.css).
 */
function Titulo({ children }: { children: ReactNode }) {
	return (
		<strong className="titulo-de-folha letra-com-teto [--palavra:6.34]">
			{children}
		</strong>
	);
}

/**
 * O anterior e o próximo, no pé do artigo e embaixo do quiz: em cima, o número na
 * fita da posição, o que é a faixa e o azulejo do artigo, que gira quando o
 * ponteiro passa; embaixo, o título, com a largura toda da faixa. Sem próximo
 * artigo, a segunda faixa leva de volta à trilha.
 */
export function OutrosArtigos({
	trilha,
	anterior,
	proximo,
	nome,
	fim,
}: {
	trilha: { slug: string; titulo: string };
	anterior?: Vizinho;
	proximo?: Vizinho;
	/** O nome da navegação, para o leitor de tela. */
	nome: string;
	/** O que a faixa de voltar à trilha diz em cima, como "Fim da trilha". */
	fim: string;
}) {
	return (
		<nav
			aria-label={nome}
			className={classes("outros-artigos", anterior && "dois")}
		>
			{anterior && (
				<Link
					to="/trilhas/$trilha/$artigo"
					params={{ trilha: trilha.slug, artigo: anterior.slug }}
					className={classeDaFita(anterior.posicao)}
				>
					<span className="outros-artigos-cabeca">
						<span aria-hidden="true" className="numeral">
							{anterior.posicao}
						</span>
						<span className="rotulo">Artigo anterior</span>
						<AzulejoGrande pecas={azulejoDaPosicao(anterior.posicao)} />
					</span>{" "}
					<Titulo>{anterior.titulo}</Titulo>
				</Link>
			)}
			{proximo ? (
				<Link
					to="/trilhas/$trilha/$artigo"
					params={{ trilha: trilha.slug, artigo: proximo.slug }}
					className={classeDaFita(proximo.posicao)}
				>
					<span className="outros-artigos-cabeca">
						<span aria-hidden="true" className="numeral">
							{proximo.posicao}
						</span>
						<span className="rotulo">Próximo artigo</span>
						<AzulejoGrande pecas={azulejoDaPosicao(proximo.posicao)} />
					</span>{" "}
					<Titulo>{proximo.titulo}</Titulo>
				</Link>
			) : (
				<Link
					to="/trilhas/$trilha"
					params={{ trilha: trilha.slug }}
					activeOptions={{ exact: true }}
				>
					<span className="outros-artigos-cabeca">
						<span className="rotulo">{fim}</span>
					</span>{" "}
					<Titulo>Voltar para {trilha.titulo}</Titulo>
				</Link>
			)}
		</nav>
	);
}
