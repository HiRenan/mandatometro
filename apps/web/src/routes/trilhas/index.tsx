import { createFileRoute, Link } from "@tanstack/react-router";
import { AzulejoGrande, Painel } from "@/components/azulejo";
import { FolhasDaTrilha } from "@/components/folhas-da-trilha";
import { MarcaDeLido } from "@/components/marca-de-lido";
import { Palavras } from "@/components/palavras";
import { azulejoDaPosicao, sementeDe } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { buscarTrilhas, type TrilhaNaLista } from "@/lib/conteudo";
import { classeDaFita, fraseDoProgresso, plural } from "@/lib/formatar";
import { variaveisDaLista } from "@/lib/lista-das-trilhas";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";
import { contarLidos, idDoArtigo, useArtigosLidos } from "@/lib/progresso";

export const Route = createFileRoute("/trilhas/")({
	loader: () => buscarTrilhas(),
	head: ({ loaderData: trilhas, match }) => ({
		meta: trilhas
			? metaDaPagina({
					titulo: "Trilhas",
					descricao:
						"Artigos curtos que explicam, passo a passo, como funciona a política brasileira, com a fonte oficial de cada explicação.",
				})
			: metaSemPagina(match),
	}),
	component: PaginaDasTrilhas,
});

function PaginaDasTrilhas() {
	const trilhas = Route.useLoaderData();
	const lidos = useArtigosLidos();

	return (
		<>
			<section className="cartaz cartaz-medio">
				<Painel
					semente={sementeDe("trilhas")}
					colunas={4}
					quantas={64}
					className="mural"
					sozinho
				/>
				{/* A palavra tomba no lugar: o leitor de tela lê o título pelo aria-label. */}
				<h1
					aria-label="Trilhas"
					className="titulo-condensado letra-com-teto [--palavra:3.21]"
				>
					<span aria-hidden="true" className="caixa">
						<Palavras texto="Trilhas" />
					</span>
				</h1>
				<div className="cartaz-pe">
					<p className="abertura">
						Artigos curtos que explicam, passo a passo, como funciona a política
						brasileira. Cada explicação traz a fonte oficial.
					</p>
					<p className="para-quem">
						Sem cadastro: os artigos que você lê ficam marcados neste navegador.
					</p>
				</div>
			</section>
			<div className="artigos">
				<ol className="linhas">
					{trilhas.map((trilha, indice) => (
						<ItemDaTrilha
							key={trilha.slug}
							trilha={trilha}
							posicao={indice + 1}
							lidos={lidos}
						/>
					))}
				</ol>
			</div>
		</>
	);
}

/**
 * Uma trilha na lista: uma folha com o azulejo dela, o título, a descrição, o
 * tamanho e o progresso. A cor do azulejo é a fita da posição da trilha na
 * lista. Abaixo do lg, os artigos aparecem em quadradinhos; a partir do lg, embaixo
 * da cabeça, em colunas que terminam juntas, com o link de cada um. As linhas das
 * colunas vêm do número de artigos (variaveisDaLista).
 */
function ItemDaTrilha({
	trilha,
	posicao,
	lidos,
}: {
	trilha: TrilhaNaLista;
	/** A posição da trilha na lista, a partir de 1. */
	posicao: number;
	lidos: ReadonlySet<string>;
}) {
	const total = trilha.artigos.length;
	const quantosLidos = contarLidos(trilha.artigos, lidos);
	const minutos = trilha.artigos.reduce(
		(soma, artigo) => soma + artigo.minutos,
		0,
	);

	return (
		<li
			className={classes("trilha-da-lista revelar", classeDaFita(posicao))}
			style={variaveisDaLista(total)}
		>
			<div className="trilha-cabeca">
				<AzulejoGrande pecas={azulejoDaPosicao(posicao)} className="da-linha" />
				<div className="trilha-cabeca-texto">
					{/* Com a letra grande, o título cresce até "CONSTITUIÇÃO", a palavra mais
					    larga dos títulos das trilhas, encostar nas bordas da folha (o
					    letra-com-teto do index.css). */}
					<h2 className="titulo-de-folha letra-com-teto [--palavra:5.66]">
						<Link to="/trilhas/$trilha" params={{ trilha: trilha.slug }}>
							{trilha.titulo}
						</Link>
					</h2>
					<p>{trilha.descricao}</p>
					<p className="rotulo">
						{plural(total, "artigo", "artigos")} · {minutos} min de leitura
					</p>
					{/* A frase do progresso tem a linha dela, reservada desde o HTML do
					    servidor: nada muda de lugar quando o progresso aparece, depois da
					    hidratação. A partir do lg, ela fica no fim da linha do rótulo,
					    que já está lá. */}
					<div className="trilha-andamento">
						{/* As linhas dos quadrados ficam mais afastadas que as colunas,
						    porque o visto passa da borda de cima (index.css, o
						    .visto-na-miniatura). */}
						<ol aria-hidden="true" className="miniaturas lg:hidden">
							{trilha.artigos.map((artigo, indice) => (
								<li key={artigo.slug} className={classeDaFita(indice + 1)}>
									<span className="numeral">
										{indice + 1}
										{lidos.has(idDoArtigo(artigo)) && (
											<MarcaDeLido className="visto-na-miniatura" />
										)}
									</span>
								</li>
							))}
						</ol>
						<p className="progresso rotulo">
							{fraseDoProgresso(quantosLidos, total)}
						</p>
					</div>
				</div>
			</div>
			<FolhasDaTrilha
				trilha={trilha}
				lidos={lidos}
				aria-label={`Artigos da trilha ${trilha.titulo}`}
				className="hidden lg:grid"
			/>
		</li>
	);
}
