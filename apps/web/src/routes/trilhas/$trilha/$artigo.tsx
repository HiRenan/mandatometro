import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Aviso, useAviso } from "@/components/aviso";
import { AzulejoGrande } from "@/components/azulejo";
import { Caminho } from "@/components/caminho";
import { ChamadaDoQuiz } from "@/components/chamada-do-quiz";
import { Fontes } from "@/components/fontes";
import { MarcaDeLido } from "@/components/marca-de-lido";
import { NestaTrilha } from "@/components/nesta-trilha";
import { TextoDoArtigo } from "@/components/texto-do-artigo";
import { azulejoDaPosicao } from "@/lib/azulejos";
import { classes } from "@/lib/classes";
import { type ArtigoNaTrilha, buscarArtigo } from "@/lib/conteudo";
import { classeDaFita, plural } from "@/lib/formatar";
import { metaDaPagina, metaSemPagina } from "@/lib/meta";
import {
	desmarcarLido,
	idDoArtigo,
	lerLidos,
	marcarLido,
	useArtigosLidos,
} from "@/lib/progresso";

export const Route = createFileRoute("/trilhas/$trilha/$artigo")({
	loader: ({ params }) =>
		buscarArtigo({ data: { trilha: params.trilha, artigo: params.artigo } }),
	head: ({ loaderData: pagina, match }) => ({
		meta: pagina
			? metaDaPagina({
					titulo: `${pagina.artigo.titulo} · ${pagina.trilha.titulo}`,
					descricao: pagina.artigo.resumo,
					tipo: "article",
				})
			: metaSemPagina(match),
	}),
	component: PaginaDoArtigo,
});

function PaginaDoArtigo() {
	const pagina = Route.useLoaderData();
	// A chave zera o estado da folha quando a pessoa passa para outro artigo.
	return <Folha key={idDoArtigo(pagina.artigo)} {...pagina} />;
}

function Folha({
	trilha,
	artigo,
	posicao,
	anterior,
	proximo,
	quiz,
}: ArtigoNaTrilha) {
	const id = idDoArtigo(artigo);
	const lidos = useArtigosLidos();
	const lido = lidos.has(id);
	const [leuAgora, setLeuAgora] = useState(false);
	const [desmarcou, setDesmarcou] = useState(false);
	const { aviso, avisar } = useAviso();
	const fimDoTexto = useRef<HTMLDivElement>(null);
	// Depois do "Desmarcar", o fim do texto na tela não marca de novo nesta visita.
	const podeMarcar = useRef(true);

	// O artigo conta como lido quando o fim do texto aparece na tela.
	useEffect(() => {
		const alvo = fimDoTexto.current;
		if (!alvo || typeof IntersectionObserver === "undefined") {
			return;
		}
		if (lerLidos().has(id)) {
			return;
		}
		const observador = new IntersectionObserver(
			([entrada]) => {
				if (!entrada?.isIntersecting) {
					return;
				}
				observador.disconnect();
				if (!podeMarcar.current || lerLidos().has(id)) {
					return;
				}
				setLeuAgora(true);
				marcarLido(id);
				avisar("Você leu este artigo.");
			},
			{ rootMargin: "0px 0px -10% 0px" },
		);
		observador.observe(alvo);
		return () => observador.disconnect();
	}, [id, avisar]);

	function desmarcar() {
		podeMarcar.current = false;
		desmarcarLido(id);
		setLeuAgora(false);
		setDesmarcou(true);
		avisar("Você desmarcou o artigo.");
	}

	function desfazer() {
		marcarLido(id);
		avisar("Você leu este artigo.");
	}

	const total = trilha.artigos.length;
	const fontes = `${plural(artigo.fontes.length, "fonte oficial", "fontes oficiais")}, no fim do artigo`;

	return (
		<div className="pagina-do-artigo">
			{/* A barra da leitura: enche com a rolagem do texto, só com CSS. Sem a
			    animação de rolagem no navegador, ela não aparece. */}
			<div aria-hidden="true" className="leitura-barra" />
			<div className="parede">
				{/* Abaixo de 1200 px, uma coluna da largura da tela: com a letra grande,
				    uma palavra comprida não alarga a página. */}
				<div className="artigo-grade">
					<article
						className={classes("folha artigo-folha", classeDaFita(posicao))}
					>
						{/* O azulejo do artigo é o mesmo da folha dele na página da trilha. */}
						<AzulejoGrande
							pecas={azulejoDaPosicao(posicao)}
							className="do-artigo"
						/>
						<Caminho trilha={trilha} />
						<p className="sobretitulo">
							<span aria-hidden="true" className="numeral">
								{posicao}
							</span>
							<span className="rotulo">
								Artigo {posicao}{" "}
								<span className="de-tantos">
									de {plural(total, "artigo", "artigos")}
								</span>
							</span>
						</p>
						{/* Com a letra grande, o título cresce até "FUNDAMENTAIS?", a palavra
						    mais larga dos títulos dos artigos, encostar nas bordas da folha
						    (o letra-com-teto do index.css). */}
						<h1 className="titulo-condensado letra-com-teto [--palavra:6.34]">
							{artigo.titulo}
						</h1>
						<p className="faixa rotulo">
							<span>Leitura de {artigo.minutos} min</span>
							<span>{fontes}</span>
						</p>
						<p className="lide">{artigo.resumo}</p>
						<TextoDoArtigo html={artigo.html} />

						{/* O azulejo do lido já está na folha, cru: quando o fim do texto
						    aparece na tela, ele vira para o verde, e o visto se desenha. A
						    altura do aviso fica reservada, e as fontes não descem. O botão é
						    o mesmo nos dois estados, e o foco fica nele quando "Desmarcar"
						    vira "Desfazer". */}
						<div
							ref={fimDoTexto}
							className="lido"
							data-lido={lido || undefined}
							data-animar={leuAgora || undefined}
						>
							<span aria-hidden="true" className="lido-azulejo">
								<span className="az" />
								<MarcaDeLido animar={leuAgora} />
							</span>
							{(lido || desmarcou) && (
								<div className="lido-palavras">
									<p className="lido-texto">
										{lido
											? "Você leu este artigo."
											: "Você desmarcou o artigo."}
									</p>
									<button
										type="button"
										onClick={lido ? desmarcar : desfazer}
										className="acao-de-texto"
									>
										{lido ? "Desmarcar" : "Desfazer"}
									</button>
								</div>
							)}
						</div>
						<Aviso texto={aviso} />

						<Fontes fontes={artigo.fontes} className="revelar" />

						{/* Só no artigo depois do qual o quiz da trilha aparece. */}
						{quiz && (
							<ChamadaDoQuiz
								trilha={trilha.slug}
								quiz={quiz}
								className="revelar"
							/>
						)}

						{/* O anterior e o próximo, no pé da folha: em cima, o número na fita da
						    posição, o que é e o azulejo do artigo; embaixo, o título, com a
						    largura toda da faixa. Com a letra grande, o título cresce até
						    "FUNDAMENTAIS?" encostar nas bordas da folha (o letra-com-teto). */}
						<nav
							aria-label="Outros artigos da trilha"
							className={classes("outros-artigos", anterior && "dois")}
						>
							{anterior && (
								<Link
									to="/trilhas/$trilha/$artigo"
									params={{ trilha: trilha.slug, artigo: anterior.slug }}
									className={classeDaFita(posicao - 1)}
								>
									<span className="outros-artigos-cabeca">
										<span aria-hidden="true" className="numeral">
											{posicao - 1}
										</span>
										<span className="rotulo">Artigo anterior</span>
										<AzulejoGrande pecas={azulejoDaPosicao(posicao - 1)} />
									</span>{" "}
									<strong className="titulo-de-folha letra-com-teto [--palavra:6.34]">
										{anterior.titulo}
									</strong>
								</Link>
							)}
							{proximo ? (
								<Link
									to="/trilhas/$trilha/$artigo"
									params={{ trilha: trilha.slug, artigo: proximo.slug }}
									className={classeDaFita(posicao + 1)}
								>
									<span className="outros-artigos-cabeca">
										<span aria-hidden="true" className="numeral">
											{posicao + 1}
										</span>
										<span className="rotulo">Próximo artigo</span>
										<AzulejoGrande pecas={azulejoDaPosicao(posicao + 1)} />
									</span>{" "}
									<strong className="titulo-de-folha letra-com-teto [--palavra:6.34]">
										{proximo.titulo}
									</strong>
								</Link>
							) : (
								<Link
									to="/trilhas/$trilha"
									params={{ trilha: trilha.slug }}
									activeOptions={{ exact: true }}
								>
									<span className="outros-artigos-cabeca">
										<span className="rotulo">Último artigo da trilha</span>
									</span>{" "}
									<strong className="titulo-de-folha letra-com-teto [--palavra:6.34]">
										Voltar para {trilha.titulo}
									</strong>
								</Link>
							)}
						</nav>
					</article>

					<div className="ao-lado-do-artigo">
						<NestaTrilha
							trilha={trilha}
							atual={artigo.slug}
							lidos={lidos}
							marcarAgora={leuAgora ? artigo.slug : undefined}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
