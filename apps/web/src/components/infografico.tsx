// biome-ignore-all lint/a11y/noRedundantRoles: o Safari tira o papel de lista das listas sem marcador, e o VoiceOver deixa de dizer quantos itens elas têm.
import { Link, useRouterState } from "@tanstack/react-router";
import { Fragment, useEffect } from "react";
import { azulejoGrande } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import type {
	ArtigoNaLista,
	Infografico as Dados,
	Fonte,
} from "@/lib/conteudo";
import {
	classeDaFita,
	fitaDaPosicao,
	formatarData,
	idDoPasso,
	semQuebrarCitacao,
} from "@/lib/formatar";
import { Azulejo, AzulejoGrande } from "./azulejo";

/** A data da consulta das fontes de um passo, uma vez só quando é a mesma. */
function quandoForamConsultadas(fontes: Fonte[]): string {
	const datas = [...new Set(fontes.map((fonte) => fonte.consultadoEm))].sort();
	const palavra = fontes.length === 1 ? "consultada" : "consultadas";
	return datas.length === 1
		? `${palavra} em ${formatarData(datas[0])}`
		: `${palavra} entre ${formatarData(datas[0])} e ${formatarData(datas[datas.length - 1])}`;
}

type TrilhaDoCaminho = {
	slug: string;
	artigos: Pick<ArtigoNaLista, "slug" | "titulo">[];
};

/**
 * Os artigos da trilha que explicam um passo do caminho, pelo nome do arquivo:
 * cada um com o azulejinho da cor dele e "Artigo N: título", com o número da
 * folha na trilha. O caminho da trilha e o passo a passo da página inicial usam.
 */
export function ArtigosDoPasso({
	slugs,
	trilha,
}: {
	slugs: string[];
	trilha: TrilhaDoCaminho;
}) {
	const artigos = slugs.flatMap((slug) => {
		const indice = trilha.artigos.findIndex((artigo) => artigo.slug === slug);
		return indice === -1
			? []
			: [{ artigo: trilha.artigos[indice], posicao: indice + 1 }];
	});
	if (artigos.length === 0) {
		return null;
	}
	return (
		<ul role="list" className="artigos-do-passo">
			{artigos.map(({ artigo, posicao }) => (
				<li key={artigo.slug}>
					{/* O quarto de círculo na fita do artigo, que dá um quarto de volta a
					    cada posição. */}
					<Azulejo
						peca={{
							motivo: 1,
							volta: (posicao - 1) % 4,
							fundo: "papel-2",
							desenho: fitaDaPosicao(posicao),
						}}
					/>
					<Link
						to="/trilhas/$trilha/$artigo"
						params={{ trilha: trilha.slug, artigo: artigo.slug }}
						className="link-do-caminho"
					>
						<span className="block">{`Artigo ${posicao}: ${artigo.titulo}`}</span>
					</Link>
				</li>
			))}
		</ul>
	);
}

/**
 * O que pode mudar o caminho num passo, uma frase por desvio. Na tela, o desvio
 * leva um fio da cor do passo ao lado; para o leitor de tela, a lista diz o que é.
 */
export function DesviosDoPasso({ desvios }: { desvios: string[] }) {
	if (desvios.length === 0) {
		return null;
	}
	return (
		<ul role="list" aria-label="O que pode mudar o caminho" className="desvios">
			{desvios.map((desvio) => (
				<li key={desvio} className="desvio">
					{semQuebrarCitacao(desvio)}
				</li>
			))}
		</ul>
	);
}

/** As fontes oficiais de um passo, numa linha, com a data da consulta embaixo. */
export function FontesDoPasso({ fontes }: { fontes: Fonte[] }) {
	return (
		<div className="passo-fontes">
			{/* As fontes quebram linha umas embaixo das outras: a entrelinha maior e o
			    espaço em volta do "·" deixam o anel de foco de um link (3 px, afastado
			    3 px) fora do texto vizinho. */}
			<p>
				<span className="mr-1">
					{fontes.length === 1 ? "Fonte:" : "Fontes:"}
				</span>{" "}
				{fontes.map((fonte, indice) => (
					<Fragment key={fonte.url}>
						{indice > 0 && (
							<>
								{" "}
								<span className="mx-1">·</span>{" "}
							</>
						)}
						<a href={fonte.url} className="link-do-caminho">
							<span>{fonte.titulo}</span>
						</a>
					</Fragment>
				))}
			</p>
			<p>{quandoForamConsultadas(fontes)}</p>
		</div>
	);
}

/**
 * O caminho da trilha, ao lado dos artigos: uma sanfona, com um passo aberto de
 * cada vez (o <details> do navegador, que funciona sem JavaScript). É texto de
 * verdade, numa lista ordenada; os azulejos são desenho e ficam fora do leitor
 * de tela, e o sentido está nas palavras. Cada passo tem o texto, os desvios,
 * os artigos que o explicam e as fontes, com a data da consulta.
 *
 * Cada passo tem um endereço (#passo-…), e a página inicial leva até ele: o
 * passo do endereço abre sozinho.
 */
export function Infografico({
	infografico,
	trilha,
	className,
}: {
	infografico: Dados;
	trilha: TrilhaDoCaminho;
	className?: string;
}) {
	const trecho = useRouterState({
		select: (estado) => estado.location.hash,
	});

	// O título do passo fica no resumo da sanfona, sempre à vista. Quando o
	// endereço aponta para ele, o passo abre, e o navegador fecha o que estava aberto.
	useEffect(() => {
		const doTrecho = trecho ? document.getElementById(trecho) : null;
		const passo = doTrecho?.closest("details");
		if (passo && !passo.open) {
			passo.open = true;
		}
	}, [trecho]);

	return (
		<section
			aria-labelledby="caminho"
			className={classes("ao-lado", className)}
		>
			<h2 id="caminho" className="subtitulo-condensado scroll-mt-8">
				{infografico.titulo}
			</h2>
			<p>{infografico.resumo}</p>
			<ol role="list" className="sanfona">
				{infografico.passos.map((passo, indice) => (
					<li key={passo.titulo} className={classeDaFita(indice + 1)}>
						<details name="caminho" open={indice === 0}>
							<summary>
								<AzulejoGrande
									pecas={azulejoGrande(indice, indice % 5)}
									className="pequeno"
								/>
								<h3 id={idDoPasso(passo.titulo)} className="scroll-mt-8">
									{passo.titulo}
								</h3>
							</summary>
							<div className="sanfona-texto">
								<p>{semQuebrarCitacao(passo.texto)}</p>
								<DesviosDoPasso desvios={passo.desvios} />
								<ArtigosDoPasso slugs={passo.artigos} trilha={trilha} />
								<FontesDoPasso fontes={passo.fontes} />
							</div>
						</details>
					</li>
				))}
			</ol>
		</section>
	);
}
