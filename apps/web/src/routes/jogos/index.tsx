import { createFileRoute, Link } from "@tanstack/react-router";
import { AzulejoGrande, Painel } from "@/components/azulejo";
import { Palavras } from "@/components/palavras";
import { azulejoDaPosicao, sementeDe } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { classeDaFita, plural } from "@/lib/formatar";
import { buscarJogos, type JogoNaLista } from "@/lib/jogo";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";
import { simboloDoJogo } from "@/lib/simbolos";

// A lista dos jogos (/jogos): o cartaz das páginas de dentro, como o de
// /trilhas, e uma folha por jogo, que leva ao jogo. Hoje só o Jogo das
// Comissões está aqui (a #288).
export const Route = createFileRoute("/jogos/")({
	loader: () => buscarJogos(),
	head: ({ loaderData: jogos, match }) => ({
		meta: jogos
			? metaDaPagina({
					titulo: "Jogos",
					descricao:
						"Jogos que põem você no lugar de quem decide no Congresso, com o que aconteceu de verdade e a fonte oficial de cada passo.",
				})
			: metaSemPagina(match),
	}),
	component: PaginaDosJogos,
});

function PaginaDosJogos() {
	const jogos = Route.useLoaderData();

	return (
		<>
			<section className="cartaz cartaz-medio">
				<Painel
					semente={sementeDe("jogos")}
					colunas={4}
					quantas={64}
					className="mural"
					sozinho
				/>
				{/* A palavra tomba no lugar: o leitor de tela lê o título pelo aria-label. */}
				<h1
					aria-label="Jogos"
					className="titulo-condensado letra-com-teto [--palavra:2.59]"
				>
					<span aria-hidden="true" className="caixa">
						<Palavras texto="Jogos" />
					</span>
				</h1>
				<div className="cartaz-pe">
					<p className="abertura">
						Você no lugar de quem decide no Congresso: escolha o próximo passo e
						veja o que aconteceu de verdade, com a fonte oficial.
					</p>
					<p className="para-quem">
						Sem cadastro e sem nota: no fim, o jogo mostra o caminho que você
						fez.
					</p>
				</div>
			</section>
			<div className="artigos">
				<ol className="linhas">
					{jogos.map((jogo, indice) => (
						<FolhaDoJogo key={jogo.slug} jogo={jogo} posicao={indice + 1} />
					))}
				</ol>
			</div>
		</>
	);
}

/**
 * Um jogo na lista: a folha da lista, com o número da posição, o título, o
 * resumo e a linha de cenas e decisões. O azulejo leva o símbolo do jogo, como o
 * da trilha, e a cor vem da posição. A folha inteira leva ao jogo: o link é o
 * título, e a área dele cobre a folha.
 */
function FolhaDoJogo({
	jogo,
	posicao,
}: {
	jogo: JogoNaLista;
	/** A posição do jogo na lista, a partir de 1. */
	posicao: number;
}) {
	return (
		<li className={classes("linha revelar", classeDaFita(posicao))}>
			<p aria-hidden="true" className="numeral">
				{posicao}
			</p>
			<div className="linha-texto">
				{/* Com a letra grande, o título cresce até "COMISSÕES", a palavra mais
				    larga dos títulos dos jogos, encostar nas bordas da folha (o
				    letra-com-teto do index.css). */}
				<h2 className="titulo-de-folha letra-com-teto [--palavra:4.49]">
					<Link to="/jogos/$jogo" params={{ jogo: jogo.slug }}>
						{jogo.titulo}
					</Link>
				</h2>
				<p>{jogo.resumo}</p>
				<p className="rotulo">
					{plural(jogo.cenas, "cena", "cenas")} ·{" "}
					{plural(jogo.decisoes, "decisão", "decisões")}
				</p>
			</div>
			<AzulejoGrande
				pecas={azulejoDaPosicao(posicao)}
				simbolo={simboloDoJogo(jogo.slug)}
				className="da-linha"
			/>
		</li>
	);
}
